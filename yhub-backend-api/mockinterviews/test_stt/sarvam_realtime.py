"""Authenticated server-side connection to Sarvam AI realtime speech-to-text (saaras:v4).

Endpoint: wss://api.sarvam.ai/speech-to-text-realtime/ws, header Api-Subscription-Key.
endpointing=manual: our client decides where a speech segment starts and ends (its voice detection):
    first audio of a segment -> {"event": "speech_start"}
    audio                    -> {"event": "audio_input", "audio": <base64 PCM16 16 kHz mono>}
    commit (pause)           -> {"event": "speech_end"}      (Sarvam finalizes that utterance)
Sarvam numbers utterances per session (utterance_idx, zero-based) on transcript.partial (cumulative
text so far) and transcript.final, so each transcript is matched to its segment by that index.

The connection is opened lazily on the first audio (so keyterms from the interview context are
included) and re-opened after Sarvam closes an idle session.
"""
from __future__ import annotations

import asyncio
import time
import base64
import json
import logging
import re
from typing import Any
from urllib.parse import urlencode

import websockets

from mockinterviews.test_stt import settings as stt

logger = logging.getLogger("mockinterviews.test_stt")

MAX_KEYTERMS = 50
MAX_KEYTERM_CHARS = 64


def sarvam_keyterms(keywords: list[str]) -> list[str]:
    """Sarvam: one term per array item; commas/semicolons inside a term are rejected (close 4000).
    "Hooks (useState, useEffect)" -> ["Hooks", "useState", "useEffect"]."""
    out: list[str] = []
    seen: set[str] = set()
    for raw in keywords or []:
        for part in re.split(r"[,;/|()\[\]{}]+", str(raw)):
            term = " ".join(part.split()).strip(" .:-")[:MAX_KEYTERM_CHARS].strip()
            if len(term) >= 2 and term.lower() not in seen:
                seen.add(term.lower())
                out.append(term)
            if len(out) >= MAX_KEYTERMS:
                return out
    return out


FAST_FAILOVER_FINAL_SECONDS = 15  # backstop only: a dead connection is normally caught by the 2 s ping first


class SarvamRealtimeTranscriber:
    name = "sarvam"
    sample_rate = stt.SARVAM_SAMPLE_RATE
    model = stt.SARVAM_STT_MODEL

    def __init__(self, prompt: str = "", keywords: list[str] | None = None) -> None:
        self._prompt = prompt
        self._keywords = list(keywords or [])
        self._ws: Any = None
        self._gen = 0                       # connection generation (utterance_idx restarts per session)
        self._utt = 0                       # next utterance_idx in the current session
        self._open_item: str | None = None  # segment being spoken (speech_start sent)
        self._waiting: set[str] = set()     # items with speech_end sent, final not received yet
        self._ignored: set[str] = set()     # cleared segments: drop their transcripts
        self._queue: asyncio.Queue = asyncio.Queue()
        self._lock = asyncio.Lock()
        self._reader: asyncio.Task | None = None
        self._pinger: asyncio.Task | None = None
        self._closed = False
        self.uncommitted_bytes = 0
        # TEST interview network resilience (set by the consumer for protocol 2 only): notice a dead
        # Sarvam connection within seconds (WebSocket ping 2 s / timeout 2 s, and a transcript that
        # doesn't come within FAST_FAILOVER_FINAL_SECONDS). Off = exactly the previous behaviour.
        self.fast_failover = False
        self._last_msg_at = 0.0
        self._last_commit_at = 0.0
        self._watchdog: asyncio.Task | None = None

    async def start(self) -> None:
        if not stt.SARVAM_API_KEY:
            raise RuntimeError("SARVAM_API_KEY is not set")

    # ── connection ─────────────────────────────────────────────────────────
    def _url(self) -> str:
        params: dict[str, str] = {
            "model": stt.SARVAM_STT_MODEL,
            "language_code": stt.SARVAM_STT_LANGUAGE,
            "mode": stt.SARVAM_STT_MODE,
            "stream_type": stt.SARVAM_STT_STREAM_TYPE,
            "endpointing": "manual",
            "encoding": "linear16",
            "sample_rate": str(stt.SARVAM_SAMPLE_RATE),
        }
        if self._prompt:
            params["prompt"] = self._prompt
        if self._keywords and stt.SARVAM_STT_MODEL.startswith("saaras:v4"):
            terms = sarvam_keyterms(self._keywords)
            if terms:
                params["keyterms"] = json.dumps(terms)
        return f"{stt.SARVAM_REALTIME_URL}?{urlencode(params)}"

    async def _ensure_connected(self) -> None:
        if self._ws is not None:
            return
        async with self._lock:
            if self._ws is not None or self._closed:
                return
            headers = {"Api-Subscription-Key": stt.SARVAM_API_KEY}
            if self.fast_failover:
                connect = websockets.connect(self._url(), additional_headers=headers, max_size=None,
                                             ping_interval=2, ping_timeout=2)
            else:
                connect = websockets.connect(self._url(), additional_headers=headers, max_size=None)
            self._ws = await asyncio.wait_for(connect, timeout=stt.CONNECT_TIMEOUT_SECONDS)
            self._gen += 1
            self._utt = 0
            self._reader = asyncio.create_task(self._read(self._ws, self._gen))
            if self._pinger is None:
                self._pinger = asyncio.create_task(self._ping())
            self._last_msg_at = time.monotonic()
            if self.fast_failover and self._watchdog is None:
                self._watchdog = asyncio.create_task(self._watch())
            logger.info("Sarvam realtime connected (model=%s, language=%s, %d keyterms)",
                        stt.SARVAM_STT_MODEL, stt.SARVAM_STT_LANGUAGE, len(self._keywords))

    async def _send(self, payload: dict) -> None:
        await self._ensure_connected()
        await self._ws.send(json.dumps(payload))

    async def _ping(self) -> None:
        while not self._closed:
            await asyncio.sleep(stt.SARVAM_PING_SECONDS)
            if self._ws is not None:
                try:
                    await self._ws.send(json.dumps({"event": "ping"}))
                except Exception:  # noqa: BLE001 - reader handles the close
                    pass

    async def _watch(self) -> None:
        """fast_failover: a segment waiting for its transcript with no word from Sarvam = dead connection."""
        while not self._closed:
            await asyncio.sleep(1)
            ws = self._ws
            if ws is None or not self._waiting:
                continue
            quiet = time.monotonic() - max(self._last_msg_at, self._last_commit_at)
            if quiet > FAST_FAILOVER_FINAL_SECONDS:
                logger.warning("Sarvam silent for %.1fs with %d segment(s) waiting: dropping the connection",
                               quiet, len(self._waiting))
                try:
                    ws.transport.abort()  # the reader ends and releases the waiting segments
                except Exception:  # noqa: BLE001
                    asyncio.create_task(ws.close())

    async def _read(self, ws: Any, gen: int) -> None:
        reason = ""
        try:
            async for raw in ws:
                self._last_msg_at = time.monotonic()
                try:
                    msg = json.loads(raw)
                except (TypeError, ValueError):
                    continue
                self._handle(msg, gen)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            reason = str(exc)
        code = getattr(ws, "close_code", None)
        reason = reason or str(getattr(ws, "close_reason", "") or "")
        if self._ws is ws:
            self._ws = None
        if self._closed:
            return
        # Segments that will never get a transcript from this session are released as failed.
        lost = sorted(self._waiting | ({self._open_item} if self._open_item else set()))
        self._waiting.clear()
        self._open_item = None
        for item in lost:
            if item not in self._ignored:
                self._queue.put_nowait({"kind": "failed", "item_id": item})
        if lost or code not in (1000, 1008, None):
            logger.warning("Sarvam session closed (code=%s, reason=%s, lost segments=%d)", code, reason[:200], len(lost))
            self._queue.put_nowait({"kind": "error", "code": f"sarvam_closed_{code}",
                                    "message": f"Sarvam closed the session ({code}) {reason[:150]}".strip()})
        else:
            logger.info("Sarvam session closed while idle (code=%s); will reconnect on next speech", code)

    def _handle(self, msg: dict, gen: int) -> None:
        event = msg.get("event", "")
        if event in ("transcript.partial", "transcript.final"):
            item = f"{gen}:{msg.get('utterance_idx')}"
            if item in self._ignored:
                if event == "transcript.final":
                    self._ignored.discard(item)
                return
            if event == "transcript.partial":
                self._queue.put_nowait({"kind": "partial", "item_id": item, "text": msg.get("text", "")})
            else:
                self._waiting.discard(item)
                self._queue.put_nowait({"kind": "completed", "item_id": item, "text": msg.get("text", "")})
        elif event == "error":
            logger.warning("Sarvam error: %s", str(msg)[:300])
            self._queue.put_nowait({"kind": "error", "code": msg.get("code") or "sarvam_error",
                                    "message": msg.get("message", ""), "fatal": bool(msg.get("is_fatal"))})
        elif event == "session.begin":
            logger.info("Sarvam session.begin request_id=%s", msg.get("request_id"))
        elif event == "session.end":
            logger.info("Sarvam session.end billed audio=%ss", msg.get("audio_duration_s"))

    # ── provider interface used by the consumer ─────────────────────────────
    async def update_context(self, prompt: str, keywords: list[str]) -> None:
        self._prompt = prompt
        self._keywords = list(keywords)
        if self._ws is not None:
            # Applied at the next utterance boundary; keyterms only apply to new sessions.
            await self._ws.send(json.dumps({"event": "config.update", "prompt": prompt}))

    async def append_audio(self, pcm16: bytes) -> None:
        if self._open_item is None:
            await self._send({"event": "speech_start"})
            self._open_item = f"{self._gen}:{self._utt}"
            self._utt += 1
        self.uncommitted_bytes += len(pcm16)
        await self._send({"event": "audio_input", "audio": base64.b64encode(pcm16).decode("ascii")})

    async def commit(self) -> tuple[bool, str | None]:
        """Segment boundary: Sarvam finalizes this utterance. Returns (committed, item_id)."""
        item = self._open_item
        if item is None:
            return False, None
        self._open_item = None
        self.uncommitted_bytes = 0
        self._waiting.add(item)
        self._last_commit_at = time.monotonic()
        await self._send({"event": "speech_end"})
        return True, item

    async def clear(self) -> None:
        """Drop the segment being spoken (e.g. Alex started talking): its transcript is ignored."""
        item = self._open_item
        self.uncommitted_bytes = 0
        if item is None or self._ws is None:
            self._open_item = None
            return
        self._open_item = None
        self._ignored.add(item)
        await self._ws.send(json.dumps({"event": "speech_end"}))

    async def events(self):
        while True:
            yield await self._queue.get()

    async def close(self) -> None:
        self._closed = True
        for task in (self._reader, self._pinger, self._watchdog):
            if task:
                task.cancel()
        if self._ws is not None:
            try:
                await self._ws.send(json.dumps({"event": "end"}))
                await self._ws.close()
            except Exception:  # noqa: BLE001
                pass
            self._ws = None
