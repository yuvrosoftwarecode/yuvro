"""Settings for the TEST mock interview speech-to-text service.

Provider: Sarvam AI (default) or OpenAI. Put keys in the backend env file
(.env.local-secrets locally, the prod secrets file in production):

    SARVAM_API_KEY=...                      # Sarvam AI (default provider)
    OPENAI_TRANSCRIBE_API_KEY=sk-...        # only if TEST_STT_PROVIDER=openai

OPENAI_API_KEY is deliberately not used as the main key: it is the LLM fallback of the real interview.
"""
from decouple import config

TEST_STT_PROVIDER: str = config("TEST_STT_PROVIDER", default="sarvam").strip().lower()

# ── Sarvam AI realtime streaming (wss://api.sarvam.ai/speech-to-text-realtime/ws) ──
SARVAM_API_KEY: str = config("SARVAM_API_KEY", default="")
SARVAM_REALTIME_URL: str = config("SARVAM_REALTIME_URL", default="wss://api.sarvam.ai/speech-to-text-realtime/ws")
SARVAM_STT_MODEL: str = config("SARVAM_STT_MODEL", default="saaras:v4")         # latest; keyterms need v4
SARVAM_STT_LANGUAGE: str = config("SARVAM_STT_LANGUAGE", default="en-IN")       # or "auto"
SARVAM_STT_MODE: str = config("SARVAM_STT_MODE", default="transcribe")          # transcribe | verbatim | codemix ...
SARVAM_STT_STREAM_TYPE: str = config("SARVAM_STT_STREAM_TYPE", default="balanced")  # fast | balanced
SARVAM_SAMPLE_RATE = 16000                                                        # Sarvam: 16000 or 8000 only
SARVAM_PING_SECONDS = 20                                                          # keepalive (idle sessions close)

# ── OpenAI realtime transcription (optional) ──
OPENAI_TRANSCRIBE_API_KEY: str = config("OPENAI_TRANSCRIBE_API_KEY", default="") or config("OPENAI_API_KEY", default="")
OPENAI_TRANSCRIBE_MODEL: str = config("OPENAI_TRANSCRIBE_MODEL", default="gpt-live-transcribe")
OPENAI_REALTIME_URL: str = config("OPENAI_REALTIME_URL", default="wss://api.openai.com/v1/realtime?intent=transcription")
OPENAI_TRANSCRIBE_DELAY: str = config("OPENAI_TRANSCRIBE_DELAY", default="low")
OPENAI_TRANSCRIBE_LANGUAGES: list[str] = [
    code.strip() for code in config("OPENAI_TRANSCRIBE_LANGUAGES", default="en").split(",") if code.strip()
]
OPENAI_SAMPLE_RATE = 24000

AUDIO_SAMPLE_RATE = SARVAM_SAMPLE_RATE if TEST_STT_PROVIDER == "sarvam" else OPENAI_SAMPLE_RATE
MIN_COMMIT_BYTES = AUDIO_SAMPLE_RATE * 2 // 10     # 100 ms of PCM16; shorter buffers are cleared (OpenAI)
MAX_CLIENT_CHUNK_BYTES = AUDIO_SAMPLE_RATE * 2 * 2  # 2 s per message; anything larger is dropped
CONNECT_TIMEOUT_SECONDS = 10
OPENAI_CONNECT_TIMEOUT_SECONDS = CONNECT_TIMEOUT_SECONDS


# ── Sarvam AI text-to-speech for the TEST mock interview (Alex's voice) ──
SARVAM_TTS_URL: str = config("SARVAM_TTS_URL", default="https://api.sarvam.ai/text-to-speech/stream")
SARVAM_TTS_MODEL: str = config("SARVAM_TTS_MODEL", default="bulbul:v4-flash")       # latest Bulbul
SARVAM_TTS_SPEAKER: str = config("SARVAM_TTS_SPEAKER", default="rohan_en_recovery")  # v4-flash voice ID
SARVAM_TTS_LANGUAGE: str = config("SARVAM_TTS_LANGUAGE", default="en-IN")
SARVAM_TTS_PACE: float = config("SARVAM_TTS_PACE", default=1.0, cast=float)          # 0.5 - 2.0
SARVAM_TTS_SAMPLE_RATE: int = config("SARVAM_TTS_SAMPLE_RATE", default=24000, cast=int)
SARVAM_TTS_MAX_CHARS = 3000          # one Sarvam stream request (limit 3500); longer text is split
SARVAM_TTS_TIMEOUT_SECONDS = 15
