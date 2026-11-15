"""Sarvam AI text-to-speech for the TEST mock interview: speaks Alex's line with a Sarvam voice.

POST /api/test-mock-interview/tts/   {"text": "..."}   (login required)
-> audio/mpeg, streamed from Sarvam's HTTP stream endpoint as it is generated, so playback can start
   before the whole line is ready. Errors return JSON (the browser then uses its built-in voice).

The real mock interview does not call this endpoint.
"""
from __future__ import annotations

import logging
import re
import time

import requests
from django.http import StreamingHttpResponse
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from mockinterviews.test_stt import settings as stt

logger = logging.getLogger("mockinterviews.test_stt")

MAX_TEXT_CHARS = 6000


def _chunks(text: str, limit: int) -> list[str]:
    """Split at sentence ends so each Sarvam request stays under its character limit."""
    if len(text) <= limit:
        return [text]
    parts, current = [], ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        while len(sentence) > limit:  # a single very long sentence
            parts.append(sentence[:limit])
            sentence = sentence[limit:]
        if current and len(current) + 1 + len(sentence) > limit:
            parts.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        parts.append(current)
    return parts


def _sarvam_request(text: str):
    return requests.post(
        stt.SARVAM_TTS_URL,
        headers={"api-subscription-key": stt.SARVAM_API_KEY, "Content-Type": "application/json"},
        json={
            "text": text,
            "language_code": stt.SARVAM_TTS_LANGUAGE,
            "speaker": stt.SARVAM_TTS_SPEAKER,
            "model": stt.SARVAM_TTS_MODEL,
            "pace": stt.SARVAM_TTS_PACE,
            "speech_sample_rate": stt.SARVAM_TTS_SAMPLE_RATE,
            "output_audio_codec": "mp3",
        },
        stream=True,
        timeout=stt.SARVAM_TTS_TIMEOUT_SECONDS,
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def test_mock_interview_tts(request):
    text = " ".join(str(request.data.get("text") or "").split())[:MAX_TEXT_CHARS]
    if not text:
        return Response({"error": "No text"}, status=status.HTTP_400_BAD_REQUEST)
    if not stt.SARVAM_API_KEY:
        return Response({"error": "SARVAM_API_KEY is not set"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    parts = _chunks(text, stt.SARVAM_TTS_MAX_CHARS)
    started = time.monotonic()
    try:
        first = _sarvam_request(parts[0])
    except requests.RequestException as exc:
        logger.warning("[test-tts user=%s] Sarvam TTS request failed: %s", request.user.pk, exc)
        return Response({"error": f"Sarvam TTS unreachable: {exc}"[:300]}, status=status.HTTP_502_BAD_GATEWAY)
    if first.status_code != 200:
        detail = first.text[:300]
        first.close()
        logger.warning("[test-tts user=%s] Sarvam TTS error %s: %s", request.user.pk, first.status_code, detail)
        return Response({"error": f"Sarvam TTS error {first.status_code}: {detail}"}, status=status.HTTP_502_BAD_GATEWAY)

    def stream():
        sent = 0
        try:
            responses = [first]
            for index in range(len(parts)):
                resp = responses[0] if index == 0 else _sarvam_request(parts[index])
                try:
                    if resp.status_code != 200:
                        logger.warning("[test-tts] part %d failed: %s", index, resp.status_code)
                        break
                    for chunk in resp.iter_content(chunk_size=4096):
                        if chunk:
                            if sent == 0:
                                logger.info("[test-tts user=%s] first audio after %.0f ms (%d chars, voice=%s)",
                                            request.user.pk, (time.monotonic() - started) * 1000, len(text),
                                            stt.SARVAM_TTS_SPEAKER)
                            sent += len(chunk)
                            yield chunk
                finally:
                    resp.close()
        except requests.RequestException as exc:
            logger.warning("[test-tts] stream interrupted: %s", exc)
        logger.info("[test-tts] done: %d bytes in %.0f ms", sent, (time.monotonic() - started) * 1000)

    response = StreamingHttpResponse(stream(), content_type="audio/mpeg")
    response["Cache-Control"] = "no-store"
    response["X-Accel-Buffering"] = "no"  # nginx: don't buffer, so audio reaches the browser as it streams
    return response
