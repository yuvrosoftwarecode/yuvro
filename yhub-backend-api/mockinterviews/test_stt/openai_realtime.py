"""Authenticated server-side connection to OpenAI realtime transcription (gpt-live-transcribe).

Optional provider (TEST_STT_PROVIDER=openai). Same interface as SarvamRealtimeTranscriber.
gpt-live-transcribe has no server-side voice detection (turn_detection null): the client decides
when the learner paused and we commit that audio; OpenAI then transcribes the committed chunk.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Any

import websockets

from mockinterviews.test_stt import settings as stt

logger = logging.getLogger("mockinterviews.test_stt")

TRANSCRIPTION_PREFIX = "conversation.item.input_audio_transcription."


class OpenAIRealtimeTranscriber:
    name = "openai"
    sample_rate = stt.OPENAI_SAMPLE_RATE
    model = stt.OPENAI_TRANSCRIBE_MODEL

    def __init__(self, prompt: str = "", keywords: list[str] | None = None) -> None:
        self._ws: Any = None
        self._prompt = prompt
        self._keywords = list(keywords or [])
        self._queue: asyncio.Queue = asyncio.Queue()
        self._reader: asyncio.Task | None = None
        self.uncommitted_bytes = 0

    async def start(self) -> None:
        if not stt.OPENAI_TRANSCRIBE_API_KEY:
            raise RuntimeError("OPENAI_TRANSCRIBE_API_KEY is not set")
        headers = {"Authorization": f"Bearer {stt.OPENAI_TRANSCRIBE_API_KEY}"}
        connect = websockets.connect(stt.OPENAI_REALTIME_URL, additional_headers=headers, max_size=None)
        self._ws = await asyncio.wait_for(connect, timeout=stt.CONNECT_TIMEOUT_SECONDS)
        await self._send(self._session_update())
        self._reader = asyncio.create_task(self._read())
        logger.info("OpenAI realtime transcription connected (model=%s)", stt.OPENAI_TRANSCRIBE_MODEL)

    def _session_update(self) -> dict:
        transcription: dict[str, Any] = {"model": stt.OPENAI_TRANSCRIBE_MODEL, "delay": stt.OPENAI_TRANSCRIBE_DELAY}
        if stt.OPENAI_TRANSCRIBE_LANGUAGES:
            transcription["languages"] = stt.OPENAI_TRANSCRIBE_LANGUAGES
        if self._prompt:
            transcription["prompt"] = self._prompt
        if self._keywords:
            transcription["keywords"] = self._keywords
        return {"type": "session.update", "session": {"type": "transcription", "audio": {"input": {
            "format": {"type": "audio/pcm", "rate": stt.OPENAI_SAMPLE_RATE},
            "transcription": transcription,
            "turn_detection": None,
        }}}}

    async def _send(self, event: dict) -> None:
        if self._ws is None:
            raise RuntimeError("OpenAI realtime connection is not open")
        await self._ws.send(json.dumps(event))

    async def _read(self) -> None:
        try:
            async for raw in self._ws:
                try:
                    ev = json.loads(raw)
                except (TypeError, ValueError):
                    continue
                kind, item = ev.get("type", ""), ev.get("item_id", "")
                if kind == "input_audio_buffer.committed":
                    self._queue.put_nowait({"kind": "committed", "item_id": item})
                elif kind == TRANSCRIPTION_PREFIX + "delta":
                    self._queue.put_nowait({"kind": "delta", "item_id": item, "text": ev.get("delta", "")})
                elif kind == TRANSCRIPTION_PREFIX + "completed":
                    self._queue.put_nowait({"kind": "completed", "item_id": item, "text": ev.get("transcript", "")})
                elif kind == TRANSCRIPTION_PREFIX + "failed":
                    self._queue.put_nowait({"kind": "failed", "item_id": item})
                elif kind == "error":
                    err = ev.get("error") or {}
                    text = f"{err.get('code') or ''} {err.get('message') or ''}".lower()
                    self._queue.put_nowait({"kind": "error", "code": err.get("code") or "openai_error",
                                            "message": err.get("message", ""),
                                            "commit_rejected": "commit" in text or "buffer" in text})
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("OpenAI connection closed: %s", exc)
        self._queue.put_nowait({"kind": "closed", "message": "OpenAI transcription session ended."})

    async def update_context(self, prompt: str, keywords: list[str]) -> None:
        """OpenAI: send another session.update to change the transcription configuration mid-session."""
        self._prompt = prompt
        self._keywords = list(keywords)
        await self._send(self._session_update())

    async def append_audio(self, pcm16: bytes) -> None:
        self.uncommitted_bytes += len(pcm16)
        await self._send({"type": "input_audio_buffer.append", "audio": base64.b64encode(pcm16).decode("ascii")})

    async def commit(self) -> tuple[bool, str | None]:
        """Returns (committed, item_id). OpenAI reports the item_id later (committed event)."""
        if self.uncommitted_bytes < stt.MIN_COMMIT_BYTES:
            await self.clear()
            return False, None
        self.uncommitted_bytes = 0
        await self._send({"type": "input_audio_buffer.commit"})
        return True, None

    async def clear(self) -> None:
        self.uncommitted_bytes = 0
        await self._send({"type": "input_audio_buffer.clear"})

    async def events(self):
        while True:
            yield await self._queue.get()

    async def close(self) -> None:
        if self._reader:
            self._reader.cancel()
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:  # noqa: BLE001
                pass
            self._ws = None


def make_transcriber(prompt: str = "", keywords: list[str] | None = None):
    if stt.TEST_STT_PROVIDER == "openai":
        return OpenAIRealtimeTranscriber(prompt, keywords)
    from mockinterviews.test_stt.sarvam_realtime import SarvamRealtimeTranscriber
    return SarvamRealtimeTranscriber(prompt, keywords)
