import asyncio
import logging
import os
import time
from typing import Any, Dict, List, Optional

try:
    from decouple import config
except ImportError:
    def config(key, default=""):
        return os.environ.get(key, default)

logger = logging.getLogger(__name__)


class ScoringLLMClient:
    """
    Resilient multi-model client for Lab AI Scoring.
    Defaults to DeepSeek (deepseek-chat), with automatic fallback to Gemini Flash,
    OpenAI, or Anthropic based on available credentials.
    """

    def __init__(
        self,
        provider: str = "deepseek",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.provider = (provider or "deepseek").lower().strip()
        self.model_name = model_name
        self.api_key = api_key

    def _get_api_key(self, provider: str) -> Optional[str]:
        if self.api_key and self.provider == provider:
            return self.api_key
        key_var = f"{provider.upper()}_API_KEY"
        return config(key_var, default="")

    def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """Synchronous generation with automatic fallback."""
        return asyncio.run(
            self.agenerate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        )

    async def agenerate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """
        Asynchronously generates an LLM response.
        Attempts primary provider (DeepSeek by default) and falls back if needed.
        """
        providers_to_try = [self.provider]
        for fallback in ["deepseek", "gemini", "openai", "anthropic"]:
            if fallback not in providers_to_try:
                providers_to_try.append(fallback)

        last_error = None
        for prov in providers_to_try:
            key = self._get_api_key(prov)
            if not key:
                logger.debug(f"Skipping {prov} - no API key configured.")
                continue

            try:
                start_time = time.time()
                if prov == "deepseek":
                    result = await self._call_deepseek(key, prompt, system_prompt, temperature, max_tokens)
                elif prov == "gemini":
                    result = await self._call_gemini(key, prompt, system_prompt, temperature, max_tokens)
                elif prov == "openai":
                    result = await self._call_openai(key, prompt, system_prompt, temperature, max_tokens)
                elif prov == "anthropic":
                    result = await self._call_anthropic(key, prompt, system_prompt, temperature, max_tokens)
                else:
                    continue

                duration_ms = int((time.time() - start_time) * 1000)
                result["latency_ms"] = duration_ms
                result["provider"] = prov
                return result

            except Exception as e:
                logger.warning(f"ScoringLLMClient: Provider {prov} failed: {e}. Trying fallback...")
                last_error = e

        raise RuntimeError(f"All LLM scoring providers failed. Last error: {last_error}")

    async def _call_deepseek(
        self,
        api_key: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Calls DeepSeek via OpenAI-compatible endpoint."""
        import openai

        base_url = config("DEEPSEEK_BASE_URL", default="https://api.deepseek.com")
        model = self.model_name if self.provider == "deepseek" and self.model_name else "deepseek-chat"

        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
        except Exception as e:
            logger.warning(f"DeepSeek call with response_format json_object failed ({e}). Retrying standard call...")
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        content = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if hasattr(response, "usage") and response.usage else None
        return {"content": content, "model": model, "tokens": tokens}

    async def _call_gemini(
        self,
        api_key: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Calls Google Gemini (e.g. gemini-2.5-flash)."""
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model_name = self.model_name if self.provider == "gemini" and self.model_name else "gemini-2.5-flash"
        gemini_model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt if system_prompt else None,
        )

        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "response_mime_type": "application/json",
        }

        response = await gemini_model.generate_content_async(
            prompt,
            generation_config=generation_config,
        )

        tokens = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            tokens = response.usage_metadata.total_token_count

        return {"content": response.text, "model": model_name, "tokens": tokens}

    async def _call_openai(
        self,
        api_key: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Calls OpenAI (e.g. gpt-4o-mini)."""
        import openai

        client = openai.OpenAI(api_key=api_key)
        model = self.model_name if self.provider == "openai" and self.model_name else "gpt-4o-mini"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else None
        return {"content": content, "model": model, "tokens": tokens}

    async def _call_anthropic(
        self,
        api_key: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Calls Anthropic Claude."""
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)
        model = self.model_name if self.provider == "anthropic" and self.model_name else "claude-3-5-haiku-20241022"

        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt or "You are an expert system design grader.",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )

        content = response.content[0].text if response.content else ""
        tokens = (response.usage.input_tokens + response.usage.output_tokens) if response.usage else None
        return {"content": content, "model": model, "tokens": tokens}
