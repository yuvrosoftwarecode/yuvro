from __future__ import annotations

import os
from functools import lru_cache

from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = Field(default="Vitarka Dynamic Interview Engine")
    app_env: str = Field(default="development")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    openai_api_key: str | None = None
    openai_model: str = Field(default="gpt-4o-mini")
    llm_enabled: bool = Field(default=True)
    llm_timeout_seconds: float = Field(default=20.0)


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000"]
    return [item.strip() for item in value.split(",") if item.strip()]


def _bool_env(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "Vitarka Dynamic Interview Engine"),
        app_env=os.getenv("APP_ENV", "development"),
        cors_origins=_split_csv(os.getenv("CORS_ORIGINS")),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        llm_enabled=_bool_env(os.getenv("LLM_ENABLED"), default=True),
        llm_timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "20")),
    )
