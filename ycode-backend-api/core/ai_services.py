import os
import time
import logging
import google.generativeai as genai
from django.conf import settings
from decouple import config

logger = logging.getLogger(__name__)

class AIServiceError(Exception):
    """Custom exception for AI service errors."""
    pass

class GeminiService:
    """Service for Google Gemini API integration."""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model_name = model_name
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)

    async def generate_response(
        self,
        messages: list,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> dict:
        start_time = time.time()
        try:
            conversation_text = ""
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    conversation_text += f"System: {content}\n"
                elif role == "user":
                    conversation_text += f"User: {content}\n"
                elif role == "assistant":
                    conversation_text += f"Assistant: {content}\n"

            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }

            response = await self.model.generate_content_async(
                conversation_text, generation_config=generation_config
            )
            
            text = response.text
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return {
                "response": text,
                "content": text,
                "tokens_used": response.usage_metadata.total_token_count if hasattr(response, "usage_metadata") else None,
                "response_time_ms": response_time_ms,
                "metadata": {
                    "model": self.model_name,
                }
            }
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise AIServiceError(f"Gemini API error: {str(e)}")

class AIServiceFactory:
    """Factory class to create AI service instances based on provider."""
    
    @classmethod
    def create_service(cls, provider: str, model_name: str):
        if provider.lower() != "gemini":
            raise AIServiceError(f"Unsupported AI provider in YCode: {provider}")
            
        api_key = config("GEMINI_API_KEY", default=None) or getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise AIServiceError("GEMINI_API_KEY not found in environment.")
            
        return GeminiService(api_key, model_name)
