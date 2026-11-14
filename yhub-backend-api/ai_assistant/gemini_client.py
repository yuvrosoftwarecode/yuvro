"""Gemini Developer API helpers using the google-genai SDK.

Google AI Studio now issues AQ.* keys. The legacy google.generativeai package
often sends those as Authorization: Bearer tokens, which
generativelanguage.googleapis.com rejects with ACCESS_TOKEN_TYPE_UNSUPPORTED.
google-genai sends the credential as x-goog-api-key instead.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def normalize_gemini_api_key(api_key: Optional[str]) -> str:
    return (api_key or "").strip().strip('"').strip("'")


def normalize_gemini_model(model_name: Optional[str]) -> str:
    name = (model_name or DEFAULT_GEMINI_MODEL).strip()
    if name.startswith("models/"):
        name = name[len("models/") :]
    return name or DEFAULT_GEMINI_MODEL


def create_gemini_client(api_key: str):
    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError(
            "google-genai is not installed. Run: pip install google-genai"
        ) from exc

    key = normalize_gemini_api_key(api_key)
    if not key:
        raise RuntimeError("GEMINI_API_KEY is empty")

    return genai.Client(api_key=key, vertexai=False)


def gemini_usage_counts(response: Any) -> dict:
    usage = getattr(response, "usage_metadata", None)
    if not usage:
        return {}
    return {
        "total": getattr(usage, "total_token_count", None),
        "prompt": getattr(usage, "prompt_token_count", None),
        "completion": getattr(usage, "candidates_token_count", None),
    }


def _build_config(
    *,
    temperature: float,
    max_tokens: int,
    system_instruction: Optional[str] = None,
    response_mime_type: Optional[str] = None,
):
    from google.genai import types

    kwargs: dict[str, Any] = {
        "temperature": temperature,
        "max_output_tokens": max_tokens,
    }
    if system_instruction:
        kwargs["system_instruction"] = system_instruction
    if response_mime_type:
        kwargs["response_mime_type"] = response_mime_type
    return types.GenerateContentConfig(**kwargs)


async def gemini_generate_content(
    client,
    model_name: str,
    contents: str,
    *,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    stream: bool = False,
    system_instruction: Optional[str] = None,
    response_mime_type: Optional[str] = None,
):
    model = normalize_gemini_model(model_name)
    config = _build_config(
        temperature=temperature,
        max_tokens=max_tokens,
        system_instruction=system_instruction,
        response_mime_type=response_mime_type,
    )

    async def _call(model_id: str):
        if stream:
            return await client.aio.models.generate_content_stream(
                model=model_id,
                contents=contents,
                config=config,
            )
        return await client.aio.models.generate_content(
            model=model_id,
            contents=contents,
            config=config,
        )

    try:
        return await _call(model)
    except Exception as exc:
        message = str(exc).lower()
        if model != DEFAULT_GEMINI_MODEL and ("404" in str(exc) or "not found" in message):
            logger.warning(
                "Gemini model %s failed (%s). Falling back to %s.",
                model,
                exc,
                DEFAULT_GEMINI_MODEL,
            )
            return await _call(DEFAULT_GEMINI_MODEL)
        raise
