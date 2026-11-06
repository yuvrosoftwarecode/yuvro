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

    user_name = None
    if isinstance(kwargs, dict):
        page_content = kwargs.pop("page_content", None)
        user_name = kwargs.pop("user_name", "Student")

    if page_content and page_content != "mock_interview":
        # Truncate aggressively to 2000 chars to minimize prompt size and latency
        snippet = page_content if len(page_content) <= 2000 else page_content[:2000]
        
        greeting_instruction = f"Address the student as '{user_name}'." if user_name != "Student" else "Address the user as 'Student'."

        strict_prompt = (
            f"You are a helpful AI Tutor focused on the content provided below (labeled SOURCE). {greeting_instruction}\n"
            "Your goal is to help the student understand this specific topic and GUIDE them to the solution.\n"
            "1. You MAY use your general knowledge to explain concepts related to this topic.\n"
            "2. MISSION: While you should generally be Socratic and guide the student with hints, you MUST provide a full, correct code solution if the student explicitly asks for it or is stuck.\n"
            "3. If providing code, ALWAYS wrap it in markdown code blocks: ```language [code] ```. This is critical as it enables the 'Insert' button in the UI.\n"
            "4. If identifying errors, explain WHY they are wrong and provide the corrected lines in a code block.\n"
            "5. If the user asks about a completely DIFFERENT topic, politely refuse.\n"
            "6. Keep your responses SHORT and CONCISE. Use markdown for better readability.\n\n"
            "SOURCE:\n" + snippet
        )

        # Prepend system message
        messages.insert(0, {"role": "system", "content": strict_prompt})

    return messages


class AIServiceError(Exception):

    pass


class BaseAIService(ABC):
 
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

        pass


class OpenAIService(BaseAIService):


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
        start_time = time.time()
        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )  

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


    def __init__(self, api_key: str, model_name: str = "claude-3-sonnet-20240229"):
        super().__init__(api_key, model_name)
        try:
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=api_key)
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
        start_time = time.time()

        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            anthropic_messages = []
            system_message = None

            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    anthropic_messages.append(
                        {"role": msg["role"], "content": msg["content"]}
                    )

            create_params = {
                "model": self.model_name,
                "max_tokens": max_tokens,
                "messages": anthropic_messages,
                **kwargs,
            }
            if temperature is not None:
                create_params["temperature"] = temperature
            if system_message:
                create_params["system"] = system_message

            try:
                if stream:
                    response = await self.client.messages.create(
                        stream=True,
                        **create_params,
                    )
                    return {
                        "stream": response,
                        "metadata": {"model": self.model_name},
                    }

                response = await self.client.messages.create(
                    **create_params,
                )
            except TypeError as te:
                if "unexpected keyword argument 'temperature'" in str(te) and "temperature" in create_params:
                    logger.warning("Anthropic client does not accept 'temperature', retrying without it.")
                    create_params.pop("temperature", None)
                    if stream:
                        response = await self.client.messages.create(
                            stream=True,
                            **create_params,
                        )
                        return {
                            "stream": response,
                            "metadata": {"model": self.model_name},
                        }
                    response = await self.client.messages.create(
                        **create_params,
                    )
                else:
                    raise

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
            err_str = str(e).lower()
            if ("404" in err_str or "not_found" in err_str or "not found" in err_str) and not kwargs.get("_is_fallback"):
                fallback_models = [
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-haiku-20240307",
                ]
                for fallback_model in fallback_models:
                    if fallback_model == self.model_name:
                        continue
                    logger.warning(
                        f"Anthropic model {self.model_name} failed with 404. Attempting fallback to {fallback_model}."
                    )
                    try:
                        fallback_params = dict(create_params)
                        fallback_params["model"] = fallback_model
                        fallback_params.pop("temperature", None)
                        if stream:
                            response = await self.client.messages.create(
                                stream=True,
                                **fallback_params,
                            )
                            return {
                                "stream": response,
                                "metadata": {"model": fallback_model},
                            }
                        response = await self.client.messages.create(
                            **fallback_params,
                        )
                        end_time = time.time()
                        response_time_ms = int((end_time - start_time) * 1000)
                        return {
                            "response": response.content[0].text,
                            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                            "response_time_ms": response_time_ms,
                            "metadata": {
                                "model": fallback_model,
                                "stop_reason": response.stop_reason,
                                "input_tokens": response.usage.input_tokens,
                                "output_tokens": response.usage.output_tokens,
                            },
                        }
                    except Exception as fb_err:
                        logger.warning(f"Fallback to {fallback_model} failed: {fb_err}")
                        continue

            logger.error(f"Anthropic API error: {str(e)}")
            raise AIServiceError(f"Anthropic API error: {str(e)}")


class GeminiService(BaseAIService):


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
        start_time = time.time()

        messages = _apply_page_content_grounding(messages, kwargs)

        try:
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
                response = await self.model.generate_content_async(
                    conversation_text, generation_config=generation_config, stream=stream
                )
                  
                if stream:
                    return {
                        "stream": response,
                        "metadata": {"model": self.model_name},
                    }
                    
            except Exception as e:
                if "404" in str(e) or "not found" in str(e).lower():
                    logger.warning(f"Gemini model {self.model_name} failed. Attempting fallback to gemini-2.5-flash.")
                    try:
                        import google.generativeai as genai
                        fallback_model = genai.GenerativeModel("gemini-2.5-flash")
                        response = await fallback_model.generate_content_async(
                            conversation_text, generation_config=generation_config, stream=stream
                        )
                        
                        if stream:
                            return {
                                "stream": response,
                                "metadata": {"model": self.model_name},
                            }
                            
                    except Exception as fallback_error:
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
        **kwargs,
    ) -> Dict[str, Any]:
        start_time = time.time()

        messages = _apply_page_content_grounding(messages, kwargs)

        try:
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


class DeepSeekService(BaseAIService):
    """DeepSeek chat completion service using OpenAI-compatible API."""

    def __init__(self, api_key: str, model_name: str = "deepseek-chat", base_url: str = None):
        super().__init__(api_key, model_name)
        try:
            from openai import AsyncOpenAI

            self.base_url = base_url or config("DEEPSEEK_BASE_URL", default="https://api.deepseek.com")
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url=self.base_url,
                timeout=20.0,
                max_retries=1,
            )
        except ImportError:
            raise AIServiceError(
                "OpenAI library not installed. Run: pip install openai"
            )

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.6,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> Dict[str, Any]:
        start_time = time.time()
        messages = _apply_page_content_grounding(messages, kwargs)

        try:
            extra = kwargs.pop("extra_body", {})
            if "thinking" not in extra:
                extra["thinking"] = {"type": "disabled"}

            try:
                if stream:
                    response = await self.client.chat.completions.create(
                        model=self.model_name,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        extra_body=extra,
                        stream=True,
                        **kwargs,
                    )
                    return {
                        "stream": response,
                        "metadata": {"model": self.model_name},
                    }

                response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    extra_body=extra,
                    **kwargs,
                )
            except Exception as model_err:
                # If model_name is deepseek-flash and provider expects deepseek-chat (or vice versa), auto-retry
                err_str = str(model_err).lower()
                if ("model" in err_str or "not found" in err_str) and self.model_name != "deepseek-chat":
                    logger.warning(
                        f"DeepSeek call with model '{self.model_name}' failed: {model_err}. "
                        "Retrying with 'deepseek-chat'..."
                    )
                    if stream:
                        response = await self.client.chat.completions.create(
                            model="deepseek-chat",
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            extra_body=extra,
                            stream=True,
                            **kwargs,
                        )
                        return {
                            "stream": response,
                            "metadata": {"model": "deepseek-chat"},
                        }

                    response = await self.client.chat.completions.create(
                        model="deepseek-chat",
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        extra_body=extra,
                        **kwargs,
                    )
                else:
                    raise model_err

            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)

            return {
                "response": response.choices[0].message.content,
                "tokens_used": response.usage.total_tokens if response.usage else None,
                "response_time_ms": response_time_ms,
                "metadata": {
                    "model": response.model,
                    "finish_reason": response.choices[0].finish_reason,
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else None,
                    "completion_tokens": response.usage.completion_tokens if response.usage else None,
                },
            }
        except Exception as e:
            logger.error(f"DeepSeek API error: {str(e)}")
            raise AIServiceError(f"DeepSeek API error: {str(e)}")


class AIServiceFactory:

    _services = {
        "deepseek": DeepSeekService,
        "gemini": GeminiService,
        "anthropic": AnthropicService,
        "openai": OpenAIService,
    }

    @classmethod
    def create_service(cls, provider: str, model_name: str) -> BaseAIService:

        if provider not in cls._services:
            raise AIServiceError(f"Unsupported AI provider: {provider}")

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
        return list(cls._services.keys())


class InterviewReportGenerator:


    def __init__(self):
        # 1. Primary: Use existing agent whose name is 'DeepSeek Flash'
        try:
            from ai_assistant.models import AIAgent
            agent = AIAgent.objects.filter(name="DeepSeek Flash").first()
            if agent:
                self.service = AIServiceFactory.create_service(agent.provider, agent.model_name)
                logger.info(f"InterviewReportGenerator using existing agent: {agent.name} ({agent.provider}/{agent.model_name})")
                return
        except Exception as e:
            logger.warning(f"Could not initialize with 'DeepSeek Flash' agent: {e}")

        # 2. Fallback to direct DeepSeek service if agent not found in DB
        try:
            self.service = AIServiceFactory.create_service("deepseek", "deepseek-flash")
            logger.info("InterviewReportGenerator using DeepSeekService via AIServiceFactory")
            return
        except Exception:
            pass

        # 3. Fallback: Check other active AIAgent records in DB
        try:
            from ai_assistant.models import AIAgent
            active_agent = AIAgent.objects.filter(is_active=True).first()
            if active_agent:
                self.service = AIServiceFactory.create_service(active_agent.provider, active_agent.model_name)
                return
        except Exception:
            pass

        # 4. Final fallback to Gemini / Anthropic if DeepSeek is unavailable
        gemini_key = config("GEMINI_API_KEY", default=None)
        if gemini_key:
            self.service = GeminiService(gemini_key, model_name="gemini-2.5-flash")
            return

        self.api_key = config("ANTHROPIC_API_KEY", default=None)
        if self.api_key:
            model_name = config("ANTHROPIC_REPORT_MODEL", default="claude-sonnet-4-5-20250929")
            self.service = AnthropicService(self.api_key, model_name=model_name)
        else:
            raise AIServiceError("No valid AI API key found (DEEPSEEK_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY required).")

    async def generate_report(self, conversation_text: str, resume_content: str = None) -> Dict[str, Any]:


        prompt = f"""
        You are an expert technical interviewer and career coach. 
        Analyze the following mock interview transcript and generate an objective, detailed performance report based strictly on the candidate's answers and technical performance in this interview session.
        Do not personalize based on external background or resume. Evaluate only the demonstrated responses in the transcript.
        
        RETURN ONLY RAW JSON. DO NOT USE MARKDOWN BLOCK.

        TRANSCRIPT:
        {conversation_text}

        OUTPUT FORMAT (JSON):
        {{
            "overall_score": <float 0-100>,
            "feedback_summary": "<string: executive summary of performance>",
            "performance_metrics": {{
                "Communication": <int 0-100>,
                "Technical Proficiency": <int 0-100>,
                "Problem Solving": <int 0-100>,
                "Adaptability": <int 0-100>
            }},
            "skill_analysis": {{
                "Skill Name 1": {{ "score": <int 0-10>, "feedback": "<string>" }},
                "Skill Name 2": {{ "score": <int 0-10>, "feedback": "<string>" }}
            }},
            "question_analysis": [
                {{
                    "question": "<string: Identify the main question asked>",
                    "type": "<string: behavioral|technical|coding>",
                    "user_answer": "<string: summary of candidate answer>",
                    "ai_score": <int 0-100>,
                    "what_went_well": ["<string>", ...],
                    "what_could_be_better": ["<string>", ...],
                    "missing_terminologies": ["<string>", ...],
                    "recommended_response": "<string: an ideal golden sample response>"
                }}
            ],
            "key_takeaways": {{
                "strengths": ["<string>", ...],
                "improvements": ["<string>", ...]
            }}
        }}
        """

        try:
            response = await self.service.generate_response(
                [{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=4000
            )

            response_text = response.get("response", "") if isinstance(response, dict) else str(response)

            from mockinterviews.ai_interview.json_parser import parse_json_response
            try:
                parsed = parse_json_response(response_text)
                if isinstance(parsed, dict):
                    return parsed
            except Exception as pe:
                logger.warning(f"parse_json_response could not parse report directly: {pe}")

            # Fallback direct extraction with regex cleanups
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                candidate = response_text[start_idx:end_idx]
                candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
                return json.loads(candidate, strict=False)

            raise AIServiceError("Failed to extract valid report JSON structure from model response")

        except Exception as e:
            logger.error(f"Report generation error: {str(e)}")
            raise e
