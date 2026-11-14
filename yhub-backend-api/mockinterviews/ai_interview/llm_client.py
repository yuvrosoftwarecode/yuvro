import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import List

from mockinterviews.ai_interview.config import settings

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

        create_kwargs = {
            "model": self._model,
            "max_tokens": max_tokens,
            "system": system_prompt or "You are a helpful assistant.",
            "messages": [{"role": "user", "content": prompt}],
        }
        if temperature is not None:
            create_kwargs["temperature"] = temperature

        try:
            response = await self._client.messages.create(**create_kwargs)
        except TypeError as te:
            if "unexpected keyword argument 'temperature'" in str(te):
                create_kwargs.pop("temperature", None)
                response = await self._client.messages.create(**create_kwargs)
            else:
                raise

        text = response.content[0].text if response.content else ""
        logger.debug(
            "Anthropic response: input_tokens=%s, output_tokens=%s",
            getattr(response.usage, "input_tokens", "N/A"),
            getattr(response.usage, "output_tokens", "N/A"),
        )
        return text


class GeminiClient(BaseLLMClient):
    """Async Google Gemini client using google-genai."""

    def __init__(self, model_name: str | None = None) -> None:
        from ai_assistant.gemini_client import create_gemini_client, normalize_gemini_model

        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in environment / .env")

        self._model_name = normalize_gemini_model(model_name or settings.GEMINI_MODEL)
        self._client = create_gemini_client(settings.GEMINI_API_KEY)

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        from ai_assistant.gemini_client import gemini_generate_content

        logger.debug("Gemini request: model=%s, max_tokens=%d", self._model_name, max_tokens)

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = await gemini_generate_content(
            self._client,
            self._model_name,
            full_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        text = response.text or ""
        logger.debug("Gemini response: length=%d chars", len(text))
        return text


class DeepSeekClient(BaseLLMClient):
    """Async DeepSeek chat-completion client using OpenAI-compatible API."""

    def __init__(self, model_name: str | None = None) -> None:
        import os
        from openai import AsyncOpenAI

        api_key = settings.DEEPSEEK_API_KEY or os.environ.get("DEEPSEEK_API_KEY", "")
        if not api_key:
            raise RuntimeError("DEEPSEEK_API_KEY is not set in environment / .env")

        base_url = settings.DEEPSEEK_BASE_URL or "https://api.deepseek.com"
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=20.0,
            max_retries=1,
        )
        self._model = model_name or settings.DEEPSEEK_MODEL or "deepseek-flash"

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 300,
        temperature: float = 0.6,
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        logger.info("DeepSeek request: model=%s, max_tokens=%d, temp=%.2f", self._model, max_tokens, temperature)

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            err_str = str(e).lower()
            if ("model" in err_str or "not found" in err_str) and self._model != "deepseek-chat":
                logger.warning("DeepSeekClient: model '%s' failed (%s), retrying with 'deepseek-chat'...", self._model, e)
                response = await self._client.chat.completions.create(
                    model="deepseek-chat",
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    extra_body={"thinking": {"type": "disabled"}},
                )
            else:
                raise

        msg = response.choices[0].message
        text = msg.content or getattr(msg, "reasoning_content", "") or ""
        total_tokens = getattr(response.usage, "total_tokens", "N/A")
        logger.info("DeepSeek response: tokens=%s, chars=%d", total_tokens, len(text))
        return text


_PROVIDERS = {
    "openai": OpenAIClient,
    "anthropic": AnthropicClient,
    "gemini": GeminiClient,
    "deepseek": DeepSeekClient,
}


class ResilientLLMClient(BaseLLMClient):
    """Wrapper that tries primary client and falls back through other available providers on failure."""

    def __init__(self, primary_client: BaseLLMClient, primary_name: str) -> None:
        self.primary_client = primary_client
        self.primary_name = primary_name

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        temperature: float = 0.3,
    ) -> str:
        try:
            return await self.primary_client.generate(prompt, system_prompt, max_tokens, temperature)
        except Exception as e:
            logger.warning("Primary LLM provider '%s' failed: %s. Attempting fallbacks...", self.primary_name, e)

        # Fallback sequence: deepseek -> openai -> gemini
        fallback_order = ["deepseek", "openai", "gemini"]
        for provider in fallback_order:
            if provider == self.primary_name:
                continue
            try:
                cls = _PROVIDERS.get(provider)
                if not cls:
                    continue
                client = cls()
                logger.info("Executing resilient fallback to LLM provider '%s'...", provider)
                return await client.generate(prompt, system_prompt, max_tokens, temperature)
            except Exception as fe:
                logger.warning("Fallback provider '%s' failed: %s", provider, fe)

        raise RuntimeError("All available LLM providers failed to generate response.")


def _fetch_active_agent():
    try:
        from ai_assistant.models import AIAgent
        # Use existing agent whose name is DeepSeek Flash
        agent = AIAgent.objects.filter(name="DeepSeek Flash").first()
        if agent:
            return agent
        return AIAgent.objects.filter(is_active=True).first()
    except Exception:
        return None


def _get_active_agent():
    try:
        import asyncio
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(_fetch_active_agent).result()
    return _fetch_active_agent()


def get_llm_client() -> BaseLLMClient:
    """Return the configured LLM client dynamically based on the active AIAgent in the DB, with fallback to settings."""
    provider = None
    model_name = None
    try:
        active_agent = _get_active_agent()
        if active_agent:
            if active_agent.provider == "deepseek":
                provider = "deepseek"
            elif active_agent.provider == "gemini":
                provider = "gemini"
            elif active_agent.provider == "openai":
                provider = "openai"
            elif active_agent.provider == "anthropic":
                provider = "anthropic"
            if active_agent.model_name:
                model_name = active_agent.model_name
    except Exception as e:
        logger.warning("Could not query active AIAgent: %s", e)

    if not provider:
        provider = settings.LLM_PROVIDER
        if provider == "deepseek" and not settings.DEEPSEEK_API_KEY:
            if settings.GEMINI_API_KEY:
                provider = "gemini"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
        elif provider == "openai" and not settings.OPENAI_API_KEY:
            if settings.DEEPSEEK_API_KEY:
                provider = "deepseek"
            elif settings.GEMINI_API_KEY:
                provider = "gemini"
            elif settings.ANTHROPIC_API_KEY:
                provider = "anthropic"
        elif provider == "anthropic" and not settings.ANTHROPIC_API_KEY:
            if settings.DEEPSEEK_API_KEY:
                provider = "deepseek"
            elif settings.GEMINI_API_KEY:
                provider = "gemini"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
        elif provider == "gemini" and not settings.GEMINI_API_KEY:
            if settings.DEEPSEEK_API_KEY:
                provider = "deepseek"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
            elif settings.ANTHROPIC_API_KEY:
                provider = "anthropic"

    cls = _PROVIDERS.get(provider)
    if cls is None:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider}'. Choose from: {list(_PROVIDERS)}"
        )
    logger.info("Initializing LLM client: provider=%s, model=%s", provider, model_name or "default")
    primary_inst = cls(model_name=model_name) if (provider in ("deepseek", "gemini") and model_name) else cls()
    return ResilientLLMClient(primary_inst, provider)
