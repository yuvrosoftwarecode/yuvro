"""WebSocket endpoint for the TEST mock interview: browser audio -> Sarvam AI (or OpenAI) realtime transcription.

URL: /ws/test-mock-interview/stt/?token=<JWT access>&interview_session_id=<id>
Only the logged-in owner of that interview session can connect.

Client -> server
    binary frames            PCM16 mono audio at the rate given in "ready" (Sarvam 16 kHz, OpenAI 24 kHz)
    {"type": "commit"}       learner paused (segment boundary): transcribe the audio since the last commit
    {"type": "clear"}        drop uncommitted audio (e.g. Alex started speaking)
    {"type": "context", "role", "question", "keywords": [...], "turn_id"}
    {"type": "ping"}

Protocol 2 (opt-in with ?proto=2, used by the TEST interview's network resilience layer; the real
interview keeps protocol 1 above unchanged):
    binary frames            8-byte header (uint32 LE segment id, uint32 LE chunk seq) + PCM16
    {"type": "commit", "segment": id}             duplicate commits of a segment are ignored
    {"type": "replay", "segments": n, "chunks": m}   client re-sent unfinished audio (new session)
    {"type": "ping", "t": client_ms}  ->  {"type": "pong", "t": client_ms, "last_chunk": seq}
    server adds {"type": "ack", "chunk": seq} (cumulative, about every 300 ms of audio and on commit)
    and "segment" on committed / commit_skipped / partial / final.

Server -> client (every transcript message carries `pending` = segments still being transcribed)
    {"type": "ready", "provider", "model", "sample_rate", "session_id"}
    {"type": "committed", "seq", "pending"}         a segment was sent to OpenAI for transcription
    {"type": "commit_skipped", "pending"}           too little audio: cleared instead of committed
    {"type": "partial", "seq", "item_id", "text", "pending"}
    {"type": "final",   "seq", "item_id", "text", "failed", "pending"}   released in speaking order
    {"type": "error",   "code", "message"}
    {"type": "pong"}
"""
from __future__ import annotations

import asyncio
import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from mockinterviews.test_stt import settings as stt
from mockinterviews.test_stt.openai_realtime import make_transcriber
from mockinterviews.test_stt.transcript_manager import TranscriptManager

logger = logging.getLogger("mockinterviews.test_stt")



@database_sync_to_async
def _owned_interview(user, session_id: str) -> str | None:
    """Returns the mock interview id if `session_id` (InterviewSession or submission id) belongs to user."""
    from ai_assistant.models import InterviewSession
    from mockinterviews.models import MockInterviewSubmission

    try:
        interview_session = InterviewSession.objects.filter(id=session_id, user=user).first()
    except Exception:  # noqa: BLE001 - not a UUID
        interview_session = None
    if interview_session:
        sub = MockInterviewSubmission.objects.filter(user=user, chat_session=interview_session.chat_session).first()
        return str(sub.mock_interview_id) if sub else "?"
    try:
        sub = MockInterviewSubmission.objects.filter(id=session_id, user=user).first()
    except Exception:  # noqa: BLE001
        sub = None
    return str(sub.mock_interview_id) if sub else None


class TestMockInterviewSttConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            # Accept first so the browser gets the real reason (a refused handshake only shows as 1006).
            logger.warning("Test STT rejected: not logged in / token invalid")
            await self._refuse(4401, "not_authenticated", "Not logged in or the login token expired. Please log in again.")
            return
        query = parse_qs((self.scope.get("query_string") or b"").decode())
        self.session_id = (query.get("interview_session_id") or [""])[0]
        self.user_id = getattr(user, "pk", "?")
        self.interview_id = await _owned_interview(user, self.session_id) if self.session_id else None
        if not self.interview_id:
            logger.warning("Test STT rejected: user=%s session=%s not owned/unknown", self.user_id, self.session_id)
            await self._refuse(4403, "session_not_owned",
                               f"Interview session '{self.session_id or '(none)'}' was not found for this user.")
            return
        await self.accept()

        self.proto = 2 if (query.get("proto") or ["1"])[0] == "2" else 1
        self.last_chunk = 0          # protocol 2: highest chunk seq received on this connection
        self.acked_chunk = 0
        self.duplicate_chunks = 0
        self.segment_by_seq: dict[int, int] = {}
        self.seq_by_segment: dict[int, int] = {}
        self.manager = TranscriptManager()
        self.stt_client = make_transcriber(prompt=self.manager.build_prompt())
        if self.proto == 2 and hasattr(self.stt_client, "fast_failover"):
            self.stt_client.fast_failover = True  # notice a dead Sarvam connection within seconds
        self.reader: asyncio.Task | None = None
        try:
            await self.stt_client.start()
            if self.proto == 2 and hasattr(self.stt_client, "_ensure_connected"):
                # Protocol 2: say "ready" only once the provider is reachable, so the browser keeps its
                # audio (and keeps reconnecting with backoff) while e.g. Sarvam can't be reached.
                await self.stt_client._ensure_connected()
        except Exception as exc:  # noqa: BLE001 - missing key / provider unreachable
            self._log("warning", "%s start failed: %s", self.stt_client.name, exc)
            code = "no_api_key" if "not set" in str(exc) else "stt_connect_failed"
            await self._send_json({"type": "error", "code": code, "message": str(exc)[:300]})
            await self.close(code=4500 if code == "no_api_key" else 4502)
            self.stt_client = None
            return

        self.reader = asyncio.create_task(self._read_events())
        await self._send_json({"type": "ready", "provider": self.stt_client.name, "model": self.stt_client.model,
                               "sample_rate": self.stt_client.sample_rate, "session_id": self.session_id,
                               "proto": self.proto})
        self._log("info", "session opened (provider=%s model=%s rate=%s proto=%s)",
                  self.stt_client.name, self.stt_client.model, self.stt_client.sample_rate, self.proto)

    async def _refuse(self, code: int, error_code: str, message: str):
        await self.accept()
        await self._send_json({"type": "error", "code": error_code, "message": message})
        await self.close(code=code)

    def _log(self, level: str, msg: str, *args):
        turn = getattr(getattr(self, "manager", None), "turn_id", "")
        getattr(logger, level)(
            "[test-stt user=%s interview=%s session=%s turn=%s] " + msg,
            getattr(self, "user_id", "?"), getattr(self, "interview_id", "?"), getattr(self, "session_id", "?"), turn,
            *args,
        )

    async def disconnect(self, code):
        reader = getattr(self, "reader", None)
        if reader:
            reader.cancel()
        client = getattr(self, "stt_client", None)
        if client:
            await client.close()
        manager = getattr(self, "manager", None)
        if manager is not None:
            self._log("info", "session closed (code=%s, segments still pending=%s, last chunk=%s, duplicates=%s)",
                      code, manager.pending, getattr(self, "last_chunk", 0), getattr(self, "duplicate_chunks", 0))

    async def receive(self, text_data=None, bytes_data=None):
        client = getattr(self, "stt_client", None)
        if not client:
            return
        try:
            if bytes_data:
                if self.proto == 2:
                    await self._receive_chunk_v2(client, bytes_data)
                    return
                if len(bytes_data) <= stt.MAX_CLIENT_CHUNK_BYTES and len(bytes_data) % 2 == 0:
                    await client.append_audio(bytes_data)
                return
            if not text_data:
                return
            try:
                message = json.loads(text_data)
            except ValueError:
                return
            kind = message.get("type")
            if kind == "commit" and self.proto == 2:
                await self._commit_v2(client, message)
            elif kind == "replay":
                self._log("info", "client replayed %s unfinished segment(s), %s chunk(s) after reconnect",
                          message.get("segments"), message.get("chunks"))
            elif kind == "commit":
                audio_ms = client.uncommitted_bytes * 1000 // (2 * client.sample_rate)
                committed, item_id = await client.commit()
                if committed:
                    seq = self.manager.on_commit_sent()
                    self._log("info", "commit seq=%s audio=%sms item=%s", seq, audio_ms, item_id or "(pending)")
                    await self._send_json({"type": "committed", "seq": seq, "pending": self.manager.pending})
                    if item_id:  # Sarvam knows the utterance id at commit time
                        _, released = self.manager.on_committed(item_id)
                        await self._send_all(released)
                else:
                    self._log("info", "commit skipped: only %sms of audio", audio_ms)
                    await self._send_json({"type": "commit_skipped", "pending": self.manager.pending})
            elif kind == "clear":
                await client.clear()
            elif kind == "context":
                if self.manager.set_context(role=message.get("role"), question=message.get("question"),
                                            keywords=message.get("keywords"), turn_id=message.get("turn_id")):
                    await client.update_context(self.manager.build_prompt(), self.manager.keywords)
                    self._log("info", "context updated (%d keywords)", len(self.manager.keywords))
            elif kind == "ping":
                if self.proto == 2:
                    await self._send_json({"type": "pong", "t": message.get("t"), "last_chunk": self.last_chunk})
                else:
                    await self._send_json({"type": "pong"})
        except Exception as exc:  # noqa: BLE001 - provider connection problem
            self._log("warning", "sending to %s failed: %s", client.name, exc)
            await self._send_json({"type": "error", "code": "stt_send_failed", "message": str(exc)[:300]})
            await self.close(code=4502)

    # ── protocol 2 (TEST interview network resilience) ─────────────────────
    async def _receive_chunk_v2(self, client, data: bytes):
        if len(data) < 10 or (len(data) - 8) % 2 or len(data) - 8 > stt.MAX_CLIENT_CHUNK_BYTES:
            return
        segment = int.from_bytes(data[0:4], "little")
        chunk = int.from_bytes(data[4:8], "little")
        if chunk <= self.last_chunk:
            # Same audio twice on one connection (e.g. a replay racing a live send): never transcribe it twice.
            self.duplicate_chunks += 1
            self._log("info", "duplicate chunk %s (segment %s) ignored; last chunk %s", chunk, segment, self.last_chunk)
            return
        self.last_chunk = chunk
        await client.append_audio(data[8:])
        if self.last_chunk - self.acked_chunk >= 3:
            await self._ack()

    async def _ack(self):
        if self.last_chunk != self.acked_chunk:
            self.acked_chunk = self.last_chunk
            await self._send_json({"type": "ack", "chunk": self.last_chunk})

    async def _commit_v2(self, client, message: dict):
        segment = message.get("segment")
        segment = int(segment) if isinstance(segment, (int, float)) else -1
        await self._ack()
        if segment in self.seq_by_segment:
            self._log("info", "duplicate commit for segment %s ignored (seq %s)", segment, self.seq_by_segment[segment])
            await self._send_json({"type": "committed", "seq": self.seq_by_segment[segment], "segment": segment,
                                   "duplicate": True, "pending": self.manager.pending})
            return
        audio_ms = client.uncommitted_bytes * 1000 // (2 * client.sample_rate)
        committed, item_id = await client.commit()
        if not committed:
            self._log("info", "commit skipped for segment %s: only %sms of audio", segment, audio_ms)
            await self._send_json({"type": "commit_skipped", "segment": segment, "pending": self.manager.pending})
            return
        seq = self.manager.on_commit_sent()
        self.segment_by_seq[seq] = segment
        self.seq_by_segment[segment] = seq
        self._log("info", "commit segment=%s seq=%s audio=%sms last_chunk=%s item=%s",
                  segment, seq, audio_ms, self.last_chunk, item_id or "(pending)")
        await self._send_json({"type": "committed", "seq": seq, "segment": segment, "pending": self.manager.pending})
        if item_id:
            _, released = self.manager.on_committed(item_id)
            await self._send_all(released)

    async def _read_events(self):
        async for event in self.stt_client.events():
            kind, item_id = event.get("kind"), event.get("item_id", "")
            out: list[dict] = []
            if kind == "committed":
                seq, out = self.manager.on_committed(item_id)
                self._log("info", "committed seq=%s item_id=%s", seq, item_id)
            elif kind == "delta":
                out = self.manager.on_delta(item_id, event.get("text", ""))
            elif kind == "partial":
                out = self.manager.on_partial(item_id, event.get("text", ""))
            elif kind == "completed":
                self._log("info", "completed item_id=%s chars=%s", item_id, len(event.get("text") or ""))
                out = self.manager.on_completed(item_id, event.get("text", ""))
            elif kind == "failed" and self.proto == 2 and self.stt_client.name == "sarvam":
                # Sarvam only reports "failed" when its session closed: the audio was not transcribed but
                # is still in the browser. Don't mark it failed; close so the browser reconnects and replays.
                self._log("warning", "provider session lost with item_id=%s pending; browser will replay", item_id)
                self._provider_lost = True
                continue
            elif kind == "failed":
                self._log("warning", "transcription failed item_id=%s", item_id)
                out = self.manager.on_failed(item_id)
            elif kind == "error":
                self._log("warning", "%s error: %s %s", self.stt_client.name, event.get("code"), event.get("message"))
                if event.get("commit_rejected"):
                    out = self.manager.on_commit_rejected()
                out = out + [{"type": "error", "code": event.get("code") or "stt_error", "message": event.get("message", "")}]
                if self.proto == 2 and (getattr(self, "_provider_lost", False) or str(event.get("code", "")).startswith("sarvam_closed")):
                    await self._send_all(out)
                    await self.close(code=4502)
                    return
            elif kind == "closed":
                await self._send_json({"type": "error", "code": "stt_closed", "message": event.get("message", "")})
                await self.close(code=4502)
                return
            await self._send_all(out)

    async def _send_all(self, messages: list[dict]):
        for message in messages:
            if getattr(self, "proto", 1) == 2 and "seq" in message and "segment" not in message:
                message = {**message, "segment": self.segment_by_seq.get(message["seq"])}
            if message.get("type") == "final":
                self._log("info", "final seq=%s item_id=%s chars=%s failed=%s pending=%s", message["seq"],
                          message["item_id"], len(message["text"]), message["failed"], message["pending"])
            await self._send_json(message)

    async def _send_json(self, payload: dict):
        await self.send(text_data=json.dumps(payload))
