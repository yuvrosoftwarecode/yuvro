import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import List

from assessment.ai_interview.config import settings

logger = logging.getLogger(__name__)


class BaseLLMClient(ABC):
    """Every LLM provider must implement `generate`."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        """Return the model's text completion."""
        ...


class OpenAIClient(BaseLLMClient):
    """Async OpenAI chat-completion client."""

    def __init__(self) -> None:
        from openai import AsyncOpenAI

        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set in environment / .env")

        self._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        self._model = settings.OPENAI_MODEL

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        logger.debug("OpenAI request: model=%s, max_tokens=%d", self._model, max_tokens)

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        text = response.choices[0].message.content or ""
        logger.debug(
            "OpenAI response: tokens=%s",
            getattr(response.usage, "total_tokens", "N/A"),
        )
        return text


class AnthropicClient(BaseLLMClient):
    """Async Anthropic messages client."""

    def __init__(self) -> None:
        from anthropic import AsyncAnthropic

        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY is not set in environment / .env")

        self._client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._model = settings.ANTHROPIC_MODEL

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        logger.debug("Anthropic request: model=%s, max_tokens=%d", self._model, max_tokens)

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text if response.content else ""
        logger.debug(
            "Anthropic response: input_tokens=%s, output_tokens=%s",
            getattr(response.usage, "input_tokens", "N/A"),
            getattr(response.usage, "output_tokens", "N/A"),
        )
        return text


class GeminiClient(BaseLLMClient):
    """Async Google Gemini client using google-generativeai."""

    def __init__(self) -> None:
        try:
            import google.generativeai as genai
        except ImportError:
            raise RuntimeError(
                "google-generativeai is not installed. Run: pip install google-generativeai"
            )

        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in environment / .env")

        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model_name = settings.GEMINI_MODEL
        self._genai = genai

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        import google.generativeai as genai

        logger.debug("Gemini request: model=%s, max_tokens=%d", self._model_name, max_tokens)

        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        try:
            model = genai.GenerativeModel(self._model_name)
            response = await model.generate_content_async(
                full_prompt,
                generation_config=generation_config,
            )
            text = response.text or ""
        except Exception as e:
            if "404" in str(e) or "not found" in str(e).lower():
                logger.warning(
                    "Gemini model %s failed (%s). Falling back to gemini-2.5-flash.",
                    self._model_name,
                    e,
                )
                model = genai.GenerativeModel("gemini-2.5-flash")
                response = await model.generate_content_async(
                    full_prompt,
                    generation_config=generation_config,
                )
                text = response.text or ""
            else:
                raise

        logger.debug("Gemini response: length=%d chars", len(text))
        return text


_PROVIDERS = {
    "openai": OpenAIClient,
    "anthropic": AnthropicClient,
    "gemini": GeminiClient,
}


@lru_cache(maxsize=1)
def get_llm_client() -> BaseLLMClient:
    """Return the configured LLM client (singleton)."""
    provider = settings.LLM_PROVIDER
    cls = _PROVIDERS.get(provider)
    if cls is None:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider}'. Choose from: {list(_PROVIDERS)}"
        )
    logger.info("Initializing LLM client: provider=%s", provider)
    return cls()
