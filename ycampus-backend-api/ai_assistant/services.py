import time
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from django.conf import settings
from decouple import config

logger = logging.getLogger(__name__)


def _apply_page_content_grounding(
    messages: List[Dict[str, str]], kwargs: Dict[str, Any]
) -> List[Dict[str, str]]:
    """If `page_content` is provided in kwargs, prepend a strict system prompt
    that instructs the model to only use the provided SOURCE. This modifies
    messages in-place (and removes page_content from kwargs).
    """
    page_content = None
    if isinstance(kwargs, dict):
        page_content = kwargs.pop("page_content", None)

    if page_content:
        # Truncate to a reasonable size to avoid token blowup
        snippet = page_content if len(page_content) <= 4000 else page_content[:4000]
        strict_prompt = (
            "You are a helpful AI Tutor focused on the content provided below (labeled SOURCE). \n"
            "Your goal is to help the student understand this specific topic and GUIDE them to the solution.\n"
            "1. You MAY use your general knowledge to explain concepts related to this topic.\n"
            "2. MISSION: While you should generally be Socratic and guide the student with hints, you MUST provide a full, correct code solution if the student explicitly asks for it or is stuck.\n"
            "3. If providing code, ALWAYS wrap it in markdown code blocks: ```language [code] ```. This is critical as it enables the 'Insert' button in the UI.\n"
            "4. If identifying errors, explain WHY they are wrong and provide the corrected lines in a code block.\n"
            "5. If the user asks about a completely DIFFERENT topic, politely refuse.\n"
            "6. Keep your tone encouraging, educational, and concise. Use markdown for better readability.\n\n"
            "SOURCE:\n" + snippet
        )

        # Prepend system message
        messages.insert(0, {"role": "system", "content": strict_prompt})

    return messages


class AIServiceError(Exception):
    """Custom exception for AI service errors."""

    pass


class BaseAIService(ABC):
    """
    Abstract base class for AI service providers.
    """

    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Generate a response from the AI model.

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters

        Returns:
            Dictionary containing response, tokens_used, and other metadata
        """
        pass


class OpenAIService(BaseAIService):
    """
    Service for OpenAI API integration.
    """

    def __init__(self, api_key: str, model_name: str = "gpt-3.5-turbo"):
        super().__init__(api_key, model_name)
        try:
            import openai

            self.client = openai.OpenAI(api_key=api_key)
        except ImportError:
            raise AIServiceError(
                "OpenAI library not installed. Run: pip install openai"
            )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate response using OpenAI API."""
        start_time = time.time()
        # Apply grounding from page_content if provided
        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )  # type: ignore

            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)

            return {
                "response": response.choices[0].message.content,
                "tokens_used": response.usage.total_tokens if response.usage else None,
                "response_time_ms": response_time_ms,
                "metadata": {
                    "model": response.model,
                    "finish_reason": response.choices[0].finish_reason,
                    "prompt_tokens": response.usage.prompt_tokens
                    if response.usage
                    else None,
                    "completion_tokens": response.usage.completion_tokens
                    if response.usage
                    else None,
                },
            }
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise AIServiceError(f"OpenAI API error: {str(e)}")


class AnthropicService(BaseAIService):
    """
    Service for Anthropic Claude API integration.
    """

    def __init__(self, api_key: str, model_name: str = "claude-3-sonnet-20240229"):
        super().__init__(api_key, model_name)
        try:
            import anthropic

            self.client = anthropic.Anthropic(api_key=api_key)
        except ImportError:
            raise AIServiceError(
                "Anthropic library not installed. Run: pip install anthropic"
            )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate response using Anthropic API."""
        start_time = time.time()

        # Apply grounding from page_content if provided
        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            # Convert messages format for Anthropic
            anthropic_messages = []
            system_message = None

            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    anthropic_messages.append(
                        {"role": msg["role"], "content": msg["content"]}
                    )

            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_message,
                messages=anthropic_messages,
                **kwargs,
            )

            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)

            return {
                "response": response.content[0].text,
                "tokens_used": response.usage.input_tokens
                + response.usage.output_tokens,
                "response_time_ms": response_time_ms,
                "metadata": {
                    "model": response.model,
                    "stop_reason": response.stop_reason,
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            }
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}")
            raise AIServiceError(f"Anthropic API error: {str(e)}")


class GeminiService(BaseAIService):
    """
    Service for Google Gemini API integration.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        super().__init__(api_key, model_name)
        try:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model_name)
        except ImportError:
            raise AIServiceError(
                "Google Generative AI library not installed. Run: pip install google-generativeai"
            )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate response using Gemini API."""
        start_time = time.time()

        # Apply grounding from page_content if provided
        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            # Convert messages to Gemini format
            conversation_text = ""
            for msg in messages:
                if msg["role"] == "system":
                    conversation_text += f"System: {msg['content']}\n"
                elif msg["role"] == "user":
                    conversation_text += f"User: {msg['content']}\n"
                elif msg["role"] == "assistant":
                    conversation_text += f"Assistant: {msg['content']}\n"

            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }

            try:
                response = self.model.generate_content(
                    conversation_text, generation_config=generation_config, stream=stream
                )
                  
                if stream:
                    # Return an iterable for streaming
                    return {
                        "stream": response,
                        "metadata": {"model": self.model_name},
                    }
                    
            except Exception as e:
                # Fallback for deprecated models (e.g. gemini-pro)
                if "404" in str(e) or "not found" in str(e).lower():
                    logger.warning(f"Gemini model {self.model_name} failed. Attempting fallback to gemini-2.5-flash.")
                    try:
                        import google.generativeai as genai
                        fallback_model = genai.GenerativeModel("gemini-2.5-flash")
                        response = fallback_model.generate_content(
                            conversation_text, generation_config=generation_config, stream=stream
                        )
                        
                        if stream:
                            return {
                                "stream": response,
                                "metadata": {"model": self.model_name},
                            }
                            
                    except Exception as fallback_error:
                         # If fallback also fails, raise original error or the new one
                         logger.error(f"Fallback failed: {fallback_error}")
                         raise e
                else:
                    raise e

            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)

            return {
                "response": response.text,
                "tokens_used": response.usage_metadata.total_token_count
                if hasattr(response, "usage_metadata")
                else None,
                "response_time_ms": response_time_ms,
                "metadata": {
                    "model": self.model_name,
                    "finish_reason": response.candidates[0].finish_reason.name
                    if response.candidates
                    else None,
                    "prompt_tokens": response.usage_metadata.prompt_token_count
                    if hasattr(response, "usage_metadata")
                    else None,
                    "completion_tokens": response.usage_metadata.candidates_token_count
                    if hasattr(response, "usage_metadata")
                    else None,
                },
            }
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise AIServiceError(f"Gemini API error: {str(e)}")


class CohereService(BaseAIService):
    """
    Service for Cohere API integration.
    """

    def __init__(self, api_key: str, model_name: str = "command"):
        super().__init__(api_key, model_name)
        try:
            import cohere

            self.client = cohere.Client(api_key)
        except ImportError:
            raise AIServiceError(
                "Cohere library not installed. Run: pip install cohere"
            )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate response using Cohere API."""
        start_time = time.time()

        # Apply grounding from page_content if provided
        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            # Convert messages to Cohere chat format
            chat_history = []
            message = ""

            for msg in messages:
                if msg["role"] == "user":
                    message = msg["content"]
                elif msg["role"] == "assistant":
                    chat_history.append({"user_name": "User", "text": message})
                    chat_history.append(
                        {"user_name": "Chatbot", "text": msg["content"]}
                    )

            response = self.client.chat(
                model=self.model_name,
                message=message,
                chat_history=chat_history,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )

            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)

            return {
                "response": response.text,
                "tokens_used": response.meta.tokens.input_tokens
                + response.meta.tokens.output_tokens
                if hasattr(response, "meta")
                else None,
                "response_time_ms": response_time_ms,
                "metadata": {
                    "model": self.model_name,
                    "generation_id": response.generation_id
                    if hasattr(response, "generation_id")
                    else None,
                },
            }
        except Exception as e:
            logger.error(f"Cohere API error: {str(e)}")
            raise AIServiceError(f"Cohere API error: {str(e)}")


class AIServiceFactory:
    """
    Factory class to create AI service instances based on provider.
    """

    _services = {
        # For now we only expose Gemini to the rest of the application.
        # The other providers are kept in the file for future re-enablement.
        # To re-enable a provider, add it back to this mapping.
        "gemini": GeminiService,
    }

    @classmethod
    def create_service(cls, provider: str, model_name: str) -> BaseAIService:
        """
        Create an AI service instance for the given provider.

        Args:
            provider: The AI provider name
            model_name: The model name to use

        Returns:
            AI service instance

        Raises:
            AIServiceError: If provider is not supported or API key is missing
        """
        if provider not in cls._services:
            raise AIServiceError(f"Unsupported AI provider: {provider}")

        # Get API key from environment
        api_key_var = f"{provider.upper()}_API_KEY"
        api_key = config(api_key_var, default=None)

        if not api_key:
            raise AIServiceError(
                f"API key not found for {provider}. Set {api_key_var} in environment."
            )

        service_class = cls._services[provider]
        return service_class(api_key, model_name)

    @classmethod
    def get_supported_providers(cls) -> List[str]:
        """Get list of supported AI providers."""
        return list(cls._services.keys())
