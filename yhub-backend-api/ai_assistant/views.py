import asyncio
import json
import logging
import queue
import threading
from django.shortcuts import get_object_or_404
from django.db import transaction, close_old_connections
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import StreamingHttpResponse
from asgiref.sync import sync_to_async, async_to_sync
from authentication.permissions import IsAuthenticatedUser
from authentication.permissions import IsOwnerOrReadOnly
from .models import (
    AIAgent,
    ChatSession,
    ChatMessage,
    AIAgentUsage,
    AIAgentConfiguration,
    InterviewSession,
    InterviewReport,
)

from .serializers import (
    AIAgentSerializer,
    ChatSessionSerializer,
    ChatSessionBasicSerializer,
    ChatMessageSerializer,
    AIAgentUsageSerializer,
    AIAgentConfigurationSerializer,
    ChatRequestSerializer,
    ChatResponseSerializer,
    InterviewSessionSerializer,
    InterviewReportSerializer,
)
from .services import AIServiceFactory, AIServiceError, InterviewReportGenerator, GeminiService
from ai_credits.metering import CreditMeteringManager
from ai_credits.exceptions import InsufficientCreditsError

logger = logging.getLogger(__name__)


def sync_stream_adapter(async_generator_func, *args, **kwargs):
    """
    Consumes an async generator on a dedicated background thread with its own event loop
    and yields chunks synchronously for Django WSGI StreamingHttpResponse.
    """
    q = queue.Queue(maxsize=100)
    SENTINEL = object()
    stop_event = threading.Event()

    def runner():
        close_old_connections()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            async def run():
                gen = async_generator_func(*args, **kwargs)
                try:
                    async for chunk in gen:
                        if stop_event.is_set():
                            break
                        q.put(chunk)
                except Exception as exc:
                    logger.exception(f"Error in async stream runner: {exc}")
                    q.put(exc)
                finally:
                    try:
                        await gen.aclose()
                    except Exception:
                        pass
                    q.put(SENTINEL)

            loop.run_until_complete(run())
        except Exception as exc:
            logger.exception(f"Fatal error in stream event loop: {exc}")
            q.put(exc)
            q.put(SENTINEL)
        finally:
            try:
                loop.close()
            except Exception:
                pass
            try:
                from django.db import connections
                connections.close_all()
            except Exception:
                pass

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()

    try:
        while True:
            item = q.get()
            if item is SENTINEL:
                break
            if isinstance(item, Exception):
                import json
                yield f"data: {json.dumps({'error': str(item)})}\n\n"
                break
            yield item
    finally:
        stop_event.set()
        thread.join(timeout=2.0)


class AIAgentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AIAgent model - read-only for users.
    """

    queryset = AIAgent.objects.filter(is_active=True)
    serializer_class = AIAgentSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        """Filter agents by provider if specified."""
        queryset = AIAgent.objects.filter(is_active=True)
        provider = self.request.query_params.get("provider", None)
        if provider:
            queryset = queryset.filter(provider=provider)
        return queryset

    @action(detail=False, methods=["get"])
    def providers(self, request):
        """Get list of available providers."""
        providers = AIAgent.PROVIDER_CHOICES
        supported_providers = AIServiceFactory.get_supported_providers()

        available_providers = []
        for provider_code, provider_name in providers:
            if provider_code in supported_providers:
                try:
                                                                                                
                    AIServiceFactory.create_service(provider_code, "test-model")
                    available_providers.append(
                        {
                            "code": provider_code,
                            "name": provider_name,
                            "available": True,
                        }
                    )
                except AIServiceError:
                    available_providers.append(
                        {
                            "code": provider_code,
                            "name": provider_name,
                            "available": False,
                        }
                    )

        return Response(available_providers)

class ChatServiceMixin:
    """Shared utilities for streaming responses, message preparation, and usage tracking."""

    @staticmethod
    def _update_usage_stats(user, ai_agent, tokens_used):
        """Update usage statistics for the user and AI agent."""
        if not user or not ai_agent:
            return
        today = timezone.now().date()
        usage, _ = AIAgentUsage.objects.get_or_create(
            user=user,
            ai_agent=ai_agent,
            date=today,
            defaults={"total_messages": 0, "total_tokens": 0, "total_cost": 0.0000},
        )
        usage.total_messages += 1
        usage.total_tokens += (tokens_used or 0)
        usage.save()

    async def _prepare_messages(self, chat_session, user_config=None):
        """Prepare messages for AI service."""
        messages = []
        if not chat_session:
            return messages

        if chat_session.page == "mock_interview":
            is_start = not await sync_to_async(lambda: chat_session.messages.filter(message_type="assistant").exists())()

            context = chat_session.context or {}
            role = context.get("role", "Software Engineer")
            level = context.get("level", "Intermediate")
            interviewer_name = context.get("interviewer_name", "AI Interviewer")
            candidate_info = context.get("candidate_info", "No specific background provided.")
            ai_context_list = context.get("ai_context", [])
            ai_context_str = "\n".join([f"- {item}" for item in ai_context_list]) if isinstance(ai_context_list, list) else str(ai_context_list)

            instructions = context.get("instructions", "")
            required_skills = ", ".join(context.get("required_skills", []))

            time_left_msg = ""
            try:
                interview_session = await sync_to_async(lambda: chat_session.interview_session)()
                total_duration_mins = interview_session.duration_minutes
                elapsed_time = timezone.now() - interview_session.created_at
                remaining_mins = total_duration_mins - (elapsed_time.total_seconds() / 60)

                if remaining_mins <= 2 and remaining_mins > 0:
                    time_left_msg = f"NOTE: There are only {int(remaining_mins)} minutes left. You MUST start wrapping up the interview now."
                elif remaining_mins <= 0:
                    time_left_msg = "NOTE: Time is UP. You MUST politely conclude the interview immediately."
            except:
                pass

            interview_prompt = f"""Expert Technical Interviewer for "{role}" ({level}).
Rules:
1. RESPONSE LENGTH: Exactly 1 line.
2. ACKNOWLEDGE & PIVOT: Briefly validate the candidate's last answer, then ask the next technical/scenario question.
3. CONTEXT: Skills: {required_skills}. Coding trigger: "Please write code to..." or "Write a function that...".
4. ADAPTIVE: Base depth on candidate background: {candidate_info[:200]}
{time_left_msg}"""
            if is_start:
                interview_prompt = f"""You are {interviewer_name}, starting a mock interview for {role}.

                TASK: Greet the candidate warmly and ask them to introduce themselves and highlight relevant experience.
                STRICT RULE: Your response MUST be exactly 1 line long.

                Example: "Hi, I'm {interviewer_name}, your interviewer for the {role} role today; could you please introduce yourself and tell me about your background?"
                """

            messages.append({"role": "system", "content": interview_prompt})

        elif user_config and user_config.system_prompt:
            messages.append({"role": "system", "content": user_config.system_prompt})

        chat_messages_qs = chat_session.messages.order_by("-created_at")[:5]
        chat_messages_list = await sync_to_async(list)(chat_messages_qs)

        chat_messages_list = sorted(chat_messages_list, key=lambda x: x.created_at)

        for msg in chat_messages_list:
            role = "system" if msg.message_type == "system" else "user" if msg.message_type == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})

        if chat_session.page == "mock_interview" and not await sync_to_async(lambda: chat_session.messages.filter(message_type="assistant").exists())():
            last_user_msg = None
            for msg in reversed(messages):
                if msg["role"] == "user":
                    last_user_msg = msg["content"]
                    break

            if last_user_msg:
                adaptive_instruction = f"Candidate said: \"{last_user_msg[:100]}\". Briefly acknowledge and ask your next 1-LINE question. STAY ON TOPIC."
                messages.append({"role": "system", "content": adaptive_instruction})

        return messages

    async def _handle_streaming_response(
        self,
        chat_session,
        ai_agent,
        user_config,
        messages,
        temperature,
        max_tokens,
        page_content,
        user=None,
        reservation=None,
    ):
        """Handle streaming response from AI service via SSE."""
        import json
        import time

        start_time = time.time()

        async def stream_generator():
            full_response_text = ""
            tokens_used = 0
            response_data = {}
            active_agent = ai_agent
            is_settled = False
            fallback_metadata = {}

            ai_service = AIServiceFactory.create_service(
                active_agent.provider, active_agent.model_name
            )

            try:
                # UX Illusion: Send a small buffer breaker to pop any proxy buffers (nginx, cloudflare)
                yield " " * 1024 + "\n"

                prepared_messages = messages
                if not prepared_messages and chat_session:
                    prepared_messages = await self._prepare_messages(chat_session, user_config)

                target_user = user or (await sync_to_async(lambda: chat_session.user)() if chat_session else None)
                user_name = await sync_to_async(lambda: f"{target_user.first_name} {target_user.last_name}".strip() if target_user else "User")()

                try:
                    response_data = await ai_service.generate_response(
                        messages=prepared_messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        page_content=page_content,
                        user_name=user_name,
                        stream=True,
                    )
                except Exception as primary_err:
                    if active_agent and active_agent.provider != "gemini":
                        logger.warning(
                            f"Primary AI agent ({active_agent.provider}/{active_agent.model_name}) failed: {primary_err}. Attempting fallback to Gemini."
                        )
                        fallback_metadata = {
                            "fallback_from": f"{active_agent.provider}/{active_agent.model_name}"
                        }
                        gemini_agent = await sync_to_async(
                            lambda: AIAgent.objects.filter(provider="gemini", is_active=True).first()
                        )()
                        if gemini_agent:
                            active_agent = gemini_agent
                            ai_service = AIServiceFactory.create_service(
                                gemini_agent.provider, gemini_agent.model_name
                            )
                            response_data = await ai_service.generate_response(
                                messages=prepared_messages,
                                temperature=temperature,
                                max_tokens=max_tokens,
                                page_content=page_content,
                                user_name=user_name,
                                stream=True,
                            )
                        else:
                            raise primary_err
                    else:
                        raise primary_err

                if "stream" in response_data:
                    stream = response_data["stream"]
                    async for chunk in stream:
                        text = None
                        # Gemini
                        if hasattr(chunk, 'text'):
                            try:
                                text = chunk.text
                            except ValueError:  # Blocked or safety
                                pass
                        # Anthropic
                        elif hasattr(chunk, 'type'):
                            if chunk.type == 'content_block_delta':
                                text = chunk.delta.text

                        if text:
                            full_response_text += text
                            data = json.dumps({"chunk": text})
                            yield f"data: {data}\n\n"

                    # Final usage update after loop
                    if hasattr(stream, "get_final_metadata"):
                        meta = stream.get_final_metadata()
                        if hasattr(meta, 'usage'):
                            tokens_used = meta.usage.input_tokens + meta.usage.output_tokens
                    elif hasattr(stream, "usage_metadata") and stream.usage_metadata:
                        tokens_used = stream.usage_metadata.total_token_count
                    response_data["tokens_used"] = tokens_used
                else:
                    # Fallback if streaming is not supported by the provider
                    full_response_text = response_data["response"]
                    data = json.dumps({"chunk": full_response_text})
                    yield f"data: {data}\n\n"
                    tokens_used = response_data.get("tokens_used", 0)

            except Exception as e:
                # Send error chunk
                error_data = json.dumps({"error": str(e)})
                yield f"data: {error_data}\n\n"
            finally:
                final_user = user or (await sync_to_async(lambda: chat_session.user)() if chat_session else None)
                credits_used = None

                # Settle credit reservation if output was produced and reservation exists
                if full_response_text and reservation and not is_settled:
                    try:
                        usage_dict = CreditMeteringManager.extract_token_usage(
                            provider=active_agent.provider if active_agent else "unknown",
                            model_name=active_agent.model_name if active_agent else "unknown",
                            response_data=response_data,
                            full_response_text=full_response_text,
                            messages=prepared_messages,
                        )
                        usage_rec = await sync_to_async(CreditMeteringManager.settle_for_chat)(
                            reservation=reservation,
                            provider=active_agent.provider if active_agent else "unknown",
                            model_name=active_agent.model_name if active_agent else "unknown",
                            usage_dict=usage_dict,
                            call_type="chat" if chat_session else "quick_chat",
                            status="completed",
                            metadata=fallback_metadata,
                        )
                        is_settled = True
                        if usage_rec:
                            credits_used = usage_rec.credits_charged
                    except Exception as settle_err:
                        logger.error(f"Failed to settle credit reservation {reservation.id}: {settle_err}", exc_info=True)

                # Release held credits if stream ended prematurely, hit error, or had no output
                if reservation and not is_settled:
                    try:
                        await sync_to_async(CreditMeteringManager.release_for_chat)(
                            reservation=reservation,
                            reason="stream_incomplete_or_error",
                        )
                    except Exception as rel_err:
                        logger.error(f"Failed to release reservation {reservation.id}: {rel_err}", exc_info=True)

                if full_response_text and chat_session:
                    end_time = time.time()
                    response_time_ms = int((end_time - start_time) * 1000)

                    assistant_message = await sync_to_async(ChatMessage.objects.create)(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=full_response_text,
                        tokens_used=tokens_used,
                        response_time_ms=response_time_ms,
                        metadata=response_data.get("metadata", {}),
                    )

                    await sync_to_async(self._update_usage_stats)(
                        final_user, active_agent, tokens_used
                    )

                    chat_session.updated_at = timezone.now()
                    await sync_to_async(chat_session.save)()

                    done_payload = {
                        "done": True,
                        "message_id": str(assistant_message.id),
                        "chat_session_id": str(chat_session.id),
                    }
                    if credits_used is not None:
                        done_payload["credits_used"] = credits_used
                    yield f"data: {json.dumps(done_payload)}\n\n"
                elif full_response_text and final_user:
                    await sync_to_async(self._update_usage_stats)(
                        final_user, active_agent, tokens_used
                    )
                    done_payload = {"done": True}
                    if credits_used is not None:
                        done_payload["credits_used"] = credits_used
                    yield f"data: {json.dumps(done_payload)}\n\n"

        response = StreamingHttpResponse(
            sync_stream_adapter(stream_generator), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class ChatSessionViewSet(ChatServiceMixin, viewsets.ModelViewSet):
    """
    ViewSet for ChatSession model.
    """

    permission_classes = [IsAuthenticatedUser, IsOwnerOrReadOnly]

    def get_queryset(self):
        """Return chat sessions for the current user."""
        return ChatSession.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "retrieve":
            return ChatSessionSerializer
        return ChatSessionBasicSerializer

    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def send_message(self, request, pk=None):
        """Send a message in this chat session."""
        chat_session = self.get_object()
        serializer = ChatRequestSerializer(data=request.data)

        if serializer.is_valid():
            return async_to_sync(self._process_chat_message)(chat_session, serializer.validated_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path=r"messages/(?P<message_id>[^/.]+)/feedback")
    def feedback(self, request, pk=None, message_id=None):
        """Submit feedback for a specific message in this chat session."""
        chat_session = self.get_object()
        try:
            message = chat_session.messages.get(id=message_id)
        except ChatMessage.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

        feedback_value = request.data.get("feedback")
        feedback_text = request.data.get("feedback_text")

        if feedback_value is not None:
            message.feedback = feedback_value
        if feedback_text is not None:
            message.feedback_text = feedback_text

        message.save()
        return Response({"status": "feedback recorded"}, status=status.HTTP_200_OK)

    async def _process_chat_message(self, chat_session, validated_data):
        """Process a chat message and generate AI response."""
        message_content = validated_data["message"]
        temperature = validated_data.get("temperature")
        max_tokens = validated_data.get("max_tokens")
        page_content = validated_data.get("page_content")
        reservation = None

        try:
            is_trigger = message_content == "The interview is starting now. Please introduce yourself and ask the first question."

            ai_agent = await sync_to_async(lambda: chat_session.ai_agent)()
            session_user = await sync_to_async(lambda: chat_session.user)()

            user_config = await sync_to_async(
                lambda: AIAgentConfiguration.objects.filter(
                    user=session_user, ai_agent=ai_agent
                ).first()
            )()

            if temperature is None:
                temperature = (
                    user_config.custom_temperature
                    if user_config and user_config.custom_temperature
                    else ai_agent.temperature
                )
            if max_tokens is None:
                max_tokens = (
                    user_config.custom_max_tokens
                    if user_config and user_config.custom_max_tokens
                    else ai_agent.max_tokens
                )

            messages = await self._prepare_messages(chat_session, user_config)

            if is_trigger:
                messages.append({"role": "user", "content": message_content})

            is_streaming = validated_data.get("stream", False)

            # Pre-dispatch credit reservation
            if CreditMeteringManager.is_enabled():
                try:
                    reservation = await sync_to_async(CreditMeteringManager.reserve_for_chat)(
                        user=session_user,
                        session_id=str(chat_session.id),
                        message_id=None,
                        max_tokens=max_tokens,
                        call_type="chat",
                    )
                except InsufficientCreditsError as e:
                    err_msg = str(e)
                    err_avail = e.available
                    err_req = e.required
                    if is_streaming:
                        async def sse_insufficient():
                            err_data = json.dumps({
                                "error": err_msg,
                                "error_code": "insufficient_credits",
                                "available": err_avail,
                                "required": err_req,
                            })
                            yield f"data: {err_data}\n\n"
                        return StreamingHttpResponse(
                            sync_stream_adapter(sse_insufficient),
                            content_type="text/event-stream",
                        )
                    return Response(
                        {
                            "error": "insufficient_credits",
                            "message": err_msg,
                            "available": err_avail,
                            "required": err_req,
                        },
                        status=status.HTTP_402_PAYMENT_REQUIRED,
                    )

            user_message = None
            if not is_trigger:
                user_message = await sync_to_async(ChatMessage.objects.create)(
                    chat_session=chat_session,
                    message_type="user",
                    content=message_content,
                )
                if reservation:
                    reservation.message_id = str(user_message.id)
                    await sync_to_async(reservation.save)(update_fields=["message_id"])
            else:
                logger.info(f"Trigger message detected for session {chat_session.id}, skipping storage.")

            if is_streaming:
                return await self._handle_streaming_response(
                    chat_session=chat_session,
                    ai_agent=ai_agent,
                    user_config=user_config,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    page_content=page_content,
                    user=session_user,
                    reservation=reservation,
                )
            else:
                ai_service = AIServiceFactory.create_service(
                    ai_agent.provider, ai_agent.model_name
                )

                full_user_name = await sync_to_async(lambda: f"{session_user.first_name} {session_user.last_name}".strip() or session_user.username)()

                try:
                    response_data = await ai_service.generate_response(
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        page_content=page_content,
                        user_name=full_user_name,
                    )
                except Exception as ai_err:
                    if reservation:
                        await sync_to_async(CreditMeteringManager.release_for_chat)(
                            reservation=reservation,
                            reason="ai_service_error",
                        )
                        reservation = None
                    raise ai_err

                credits_used = None
                if reservation:
                    usage_dict = CreditMeteringManager.extract_token_usage(
                        provider=ai_agent.provider,
                        model_name=ai_agent.model_name,
                        response_data=response_data,
                        full_response_text=response_data.get("response", ""),
                        messages=messages,
                    )
                    usage_rec = await sync_to_async(CreditMeteringManager.settle_for_chat)(
                        reservation=reservation,
                        provider=ai_agent.provider,
                        model_name=ai_agent.model_name,
                        usage_dict=usage_dict,
                        call_type="chat",
                        status="completed",
                    )
                    reservation = None
                    if usage_rec:
                        credits_used = usage_rec.credits_charged

                assistant_message = await sync_to_async(ChatMessage.objects.create)(
                    chat_session=chat_session,
                    message_type="assistant",
                    content=response_data["response"],
                    tokens_used=response_data.get("tokens_used"),
                    response_time_ms=response_data.get("response_time_ms"),
                    metadata=response_data.get("metadata", {}),
                )

                await sync_to_async(self._update_usage_stats)(
                    chat_session.user, ai_agent, response_data.get("tokens_used", 0)
                )

                chat_session.updated_at = timezone.now()
                await sync_to_async(chat_session.save)()

                resp_payload = {
                    "chat_session_id": chat_session.id,
                    "message_id": assistant_message.id,
                    "response": response_data["response"],
                    "tokens_used": response_data.get("tokens_used"),
                    "response_time_ms": response_data.get("response_time_ms"),
                    "metadata": response_data.get("metadata", {}),
                }
                if credits_used is not None:
                    resp_payload["credits_used"] = credits_used

                response_serializer = ChatResponseSerializer(resp_payload)
                return Response(response_serializer.data, status=status.HTTP_200_OK)

        except AIServiceError as e:
            if reservation:
                try:
                    await sync_to_async(CreditMeteringManager.release_for_chat)(
                        reservation=reservation,
                        reason="ai_service_error",
                    )
                except Exception:
                    pass
            return Response(
                {"error": f"AI service error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            if reservation:
                try:
                    await sync_to_async(CreditMeteringManager.release_for_chat)(
                        reservation=reservation,
                        reason="unexpected_error",
                    )
                except Exception:
                    pass
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class ChatMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for ChatMessage model - read-only.
    """

    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        """Return messages for chat sessions owned by the current user."""
        return ChatMessage.objects.filter(chat_session__user=self.request.user)

class AIAgentUsageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AIAgentUsage model - read-only.
    """

    serializer_class = AIAgentUsageSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        """Return usage stats for the current user."""
        return AIAgentUsage.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get usage summary for the current user."""
        queryset = self.get_queryset()

        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")

        if from_date:
            queryset = queryset.filter(date__gte=from_date)
        if to_date:
            queryset = queryset.filter(date__lte=to_date)

        total_messages = sum(usage.total_messages for usage in queryset)
        total_tokens = sum(usage.total_tokens for usage in queryset)
        total_cost = sum(usage.total_cost for usage in queryset)

        agent_stats = {}
        for usage in queryset:
            agent_name = usage.ai_agent.name
            if agent_name not in agent_stats:
                agent_stats[agent_name] = {"messages": 0, "tokens": 0, "cost": 0.0}
            agent_stats[agent_name]["messages"] += usage.total_messages
            agent_stats[agent_name]["tokens"] += usage.total_tokens
            agent_stats[agent_name]["cost"] += float(usage.total_cost)

        return Response(
            {
                "total_messages": total_messages,
                "total_tokens": total_tokens,
                "total_cost": float(total_cost),
                "agent_breakdown": agent_stats,
            }
        )

class AIAgentViewSet(viewsets.ReadOnlyModelViewSet):
   
    serializer_class = AIAgentSerializer
    permission_classes = [IsAuthenticatedUser]
    queryset = AIAgent.objects.filter(is_active=True)

    @action(detail=False, methods=["post"])
    def warmup(self, request):
        try:
            return async_to_sync(self._async_warmup)(request)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    async def _async_warmup(self, request):
        providers = await sync_to_async(lambda: list(AIAgent.objects.filter(is_active=True).values_list('provider', 'model_name')))()
        
        async def warm_provider(p, m):
            try:
                svc = AIServiceFactory.create_service(p, m)
                await svc.generate_response([{"role": "user", "content": "hi"}], max_tokens=1)
            except: pass

        import asyncio
        async def fire_and_forget():
            await asyncio.gather(*(warm_provider(p, m) for p, m in providers))
        
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(fire_and_forget())
        except RuntimeError:
                                                                                   
            asyncio.create_task(fire_and_forget())
            
        return Response({"status": "active warmup initiated"}, status=status.HTTP_200_OK)

class AIAgentConfigurationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for AIAgentConfiguration model.
    """

    serializer_class = AIAgentConfigurationSerializer
    permission_classes = [IsAuthenticatedUser, IsOwnerOrReadOnly]

    def get_queryset(self):
        """Return configurations for the current user."""
        return AIAgentConfiguration.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)

class ChatViewSet(ChatServiceMixin, viewsets.ViewSet):
    """
    ViewSet for chat operations that don't require a session.
    """

    permission_classes = [IsAuthenticatedUser]

    @action(detail=False, methods=["post"])
    def quick_chat(self, request):
        """Send a quick message without creating a persistent session."""
        return async_to_sync(self._async_quick_chat)(request)

    async def _async_quick_chat(self, request):
        serializer = ChatRequestSerializer(data=request.data)

        if serializer.is_valid():
            validated_data = serializer.validated_data
            ai_agent_id = validated_data.get("ai_agent_id")
            message_content = validated_data["message"]
            temperature = validated_data.get("temperature")
            max_tokens = validated_data.get("max_tokens")
            page_content = validated_data.get("page_content")
            reservation = None

            def get_user_name(u):
                return f"{u.first_name} {u.last_name}".strip() or u.username

            full_user_name = await sync_to_async(get_user_name)(request.user)

            try:
                if not ai_agent_id:
                    is_deep = any(kw in message_content.lower() for kw in ["explain", "why", "deep", "how does"]) or len(message_content) > 500

                    if is_deep:
                        ai_agent = await sync_to_async(lambda: AIAgent.objects.filter(provider="anthropic", is_active=True).first())()

                    if not is_deep or not ai_agent:
                        ai_agent = await sync_to_async(lambda: AIAgent.objects.filter(provider="gemini", is_active=True).first())()

                    if not ai_agent:
                        ai_agent = await sync_to_async(AIAgent.objects.first)()

                    if not ai_agent:
                        return Response({"error": "No active AI agent available"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                else:
                    ai_agent = await sync_to_async(get_object_or_404)(AIAgent, id=ai_agent_id, is_active=True)

                user_config = await sync_to_async(
                    lambda: AIAgentConfiguration.objects.filter(user=request.user, ai_agent=ai_agent).first()
                )()

                if temperature is None:
                    temperature = (
                        user_config.custom_temperature
                        if user_config and user_config.custom_temperature
                        else ai_agent.temperature
                    )
                if max_tokens is None:
                    max_tokens = (
                        user_config.custom_max_tokens
                        if user_config and user_config.custom_max_tokens
                        else ai_agent.max_tokens
                    )

                messages = []
                if user_config and user_config.system_prompt:
                    messages.append({"role": "system", "content": user_config.system_prompt})

                messages.append({"role": "user", "content": message_content})

                is_streaming = validated_data.get("stream", False)

                if CreditMeteringManager.is_enabled():
                    try:
                        reservation = await sync_to_async(CreditMeteringManager.reserve_for_chat)(
                            user=request.user,
                            session_id=None,
                            message_id=None,
                            max_tokens=max_tokens,
                            call_type="quick_chat",
                        )
                    except InsufficientCreditsError as e:
                        err_msg = str(e)
                        err_avail = e.available
                        err_req = e.required
                        if is_streaming:
                            async def sse_insufficient():
                                err_data = json.dumps({
                                    "error": err_msg,
                                    "error_code": "insufficient_credits",
                                    "available": err_avail,
                                    "required": err_req,
                                })
                                yield f"data: {err_data}\n\n"
                            return StreamingHttpResponse(
                                sync_stream_adapter(sse_insufficient),
                                content_type="text/event-stream",
                            )
                        return Response(
                            {
                                "error": "insufficient_credits",
                                "message": err_msg,
                                "available": err_avail,
                                "required": err_req,
                            },
                            status=status.HTTP_402_PAYMENT_REQUIRED,
                        )

                if is_streaming:
                    return await self._handle_streaming_response(
                        chat_session=None,
                        ai_agent=ai_agent,
                        user_config=user_config,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        page_content=page_content,
                        user=request.user,
                        reservation=reservation,
                    )

                ai_service = AIServiceFactory.create_service(
                    ai_agent.provider, ai_agent.model_name
                )

                try:
                    response_data = await ai_service.generate_response(
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        page_content=page_content,
                        user_name=full_user_name,
                    )
                except Exception as ai_err:
                    if reservation:
                        await sync_to_async(CreditMeteringManager.release_for_chat)(
                            reservation=reservation,
                            reason="ai_service_error",
                        )
                        reservation = None
                    raise ai_err

                credits_used = None
                if reservation:
                    usage_dict = CreditMeteringManager.extract_token_usage(
                        provider=ai_agent.provider,
                        model_name=ai_agent.model_name,
                        response_data=response_data,
                        full_response_text=response_data.get("response", ""),
                        messages=messages,
                    )
                    usage_rec = await sync_to_async(CreditMeteringManager.settle_for_chat)(
                        reservation=reservation,
                        provider=ai_agent.provider,
                        model_name=ai_agent.model_name,
                        usage_dict=usage_dict,
                        call_type="quick_chat",
                        status="completed",
                    )
                    reservation = None
                    if usage_rec:
                        credits_used = usage_rec.credits_charged

                resp_payload = {
                    "response": response_data["response"],
                    "tokens_used": response_data.get("tokens_used"),
                    "response_time_ms": response_data.get("response_time_ms"),
                    "metadata": response_data.get("metadata", {}),
                }
                if credits_used is not None:
                    resp_payload["credits_used"] = credits_used

                return Response(resp_payload, status=status.HTTP_200_OK)

            except AIServiceError as e:
                if reservation:
                    try:
                        await sync_to_async(CreditMeteringManager.release_for_chat)(
                            reservation=reservation,
                            reason="ai_service_error",
                        )
                    except Exception:
                        pass
                return Response(
                    {"error": f"AI service error: {str(e)}"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except Exception as e:
                if reservation:
                    try:
                        await sync_to_async(CreditMeteringManager.release_for_chat)(
                            reservation=reservation,
                            reason="unexpected_error",
                        )
                    except Exception:
                        pass
                return Response(
                    {"error": f"Unexpected error: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InterviewSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Interview Sessions.
    """

    permission_classes = [IsAuthenticatedUser]
    serializer_class = InterviewSessionSerializer

    def get_queryset(self):
        """
        Users see their own interviews.
        Admins can see all interviews.
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return InterviewSession.objects.all().select_related("report", "chat_session")
        return InterviewSession.objects.filter(user=self.request.user).select_related("report", "chat_session")

    def perform_create(self, serializer):
        """
        When creating an interview session, we also need to create a ChatSession
        and link it.
        """
                                                  
        resume_file = self.request.data.get('resume')                 
        interviewer_name = self.request.data.get('interviewer_name', 'Alex')
        role_title = self.request.data.get('role_title', 'General Profile')
        role_level = self.request.data.get('role_level', 'Intermediate')
        difficulty = self.request.data.get('difficulty', 'Medium')
        duration_minutes = self.request.data.get('duration_minutes', 30)

        context_text = ""
        if resume_file:
            try:
                                                           
                from pypdf import PdfReader
                reader = PdfReader(resume_file)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        context_text += text + "\n"
            except Exception as e:
                print(f"Error reading resume: {e}")
                context_text = "Resume provided but could not be read."
        
        if not context_text.strip():
             context_text = "No resume provided. Ask questions based on the role title."

        ai_agent = AIAgent.objects.filter(provider="anthropic", is_active=True).first()
        if not ai_agent:
                                                                        
            ai_agent = AIAgent.objects.filter(provider="gemini", is_active=True).first()
            if not ai_agent:
                                                      
                ai_agent = AIAgent.objects.first()
                if not ai_agent:
                    raise serializers.ValidationError("No active AI Agent found for interview. Please configure at least one agent.")

        chat_session = ChatSession.objects.create(
            user=self.request.user,
            ai_agent=ai_agent,
            title=f"Mock Interview - {role_title}",
            page="mock_interview",
            context={
                "role": role_title,
                "level": role_level,
                "difficulty": difficulty,
                "interviewer_name": interviewer_name,
                "duration_minutes": duration_minutes,
                "candidate_info": context_text
            }
        )

        serializer.save(user=self.request.user, chat_session=chat_session)

    @action(detail=True, methods=["post"])
    def end_interview(self, request, pk=None):
        """
        End the interview, mark as completed, and trigger report generation.
        """
        interview_session = self.get_object()

        if interview_session.status == "completed":
            return Response(
                {"detail": "Interview already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        interview_session.status = "completed"
        interview_session.completed_at = timezone.now()
        
        if interview_session.created_at:
            duration = interview_session.completed_at - interview_session.created_at
            interview_session.actual_duration = duration
            
        interview_session.save()

        # Update linked MockInterviewSubmission if it exists
        if interview_session.chat_session:
            from django.apps import apps
            MockInterviewSubmission = apps.get_model('mockinterviews', 'MockInterviewSubmission')
            mock_submission = MockInterviewSubmission.objects.filter(chat_session=interview_session.chat_session).first()

            if mock_submission and mock_submission.status != MockInterviewSubmission.STATUS_COMPLETED:
                mock_submission.status = MockInterviewSubmission.STATUS_COMPLETED
                mock_submission.completed_at = timezone.now()
                
                # Evaluate session via Dynamic Engine
                if mock_submission.session_state:
                    from mockinterviews.dynamic_engine.models import InterviewSession as DynSession, InterviewStatus as DynStatus, sanitize_null_bytes
                    from mockinterviews.dynamic_engine.evaluator import InterviewEvaluator
                    from mockinterviews.dynamic_engine.reporting import InterviewReportService
                    from mockinterviews.dynamic_engine.llm import OpenAIInterviewLLM
                    from mockinterviews.dynamic_engine.config import get_settings
                    try:
                        settings = get_settings()
                        dyn_session = DynSession.model_validate(mock_submission.session_state)
                        dyn_session.status = DynStatus.COMPLETED
                        reporter = InterviewReportService(
                            evaluator=InterviewEvaluator(rubric_version=settings.rubric_version),
                            llm_client=OpenAIInterviewLLM.from_settings(settings),
                        )
                        bundle = reporter.create_report_bundle(dyn_session)
                        dyn_session_dict = dyn_session.model_dump(mode='json')
                        bundle_dict = bundle.model_dump(mode='json')
                        vitarka_dict = bundle.vitarka_report.model_dump(mode='json')
                        dyn_session_dict['report_bundle'] = bundle_dict
                        dyn_session_dict['report'] = vitarka_dict
                        mock_submission.session_state = sanitize_null_bytes(dyn_session_dict)
                        mock_submission.marks = bundle.overall_report.overall_score * 10
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error evaluating interview: {e}")
                        
                mock_submission.save(update_fields=['status', 'completed_at', 'marks', 'session_state'])


        try:
            report_generator = InterviewReportGenerator()
            
            resume_text = None

            trigger_text = "The interview is starting now. Please introduce yourself and ask the first question."
            messages = interview_session.chat_session.messages.order_by("created_at")
            conversation_text = ""
            for msg in messages:
                if msg.content.strip() == trigger_text:
                    continue
                role = "Interviewer" if msg.message_type != "user" else "Candidate"
                conversation_text += f"{role}: {msg.content}\n\n"

            resume_text = interview_session.chat_session.context.get("candidate_info", "No resume provided.")

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                report_data = loop.run_until_complete(
                    report_generator.generate_report(
                        conversation_text, resume_content=resume_text
                    )
                )
            finally:
                loop.close()

            InterviewReport.objects.create(
                interview_session=interview_session,
                overall_score=report_data.get("overall_score", 0),
                feedback_summary=report_data.get("feedback_summary", ""),
                performance_metrics=report_data.get("performance_metrics", {}),
                skill_analysis=report_data.get("skill_analysis", {}),
                question_analysis=report_data.get("question_analysis", []),
                key_takeaways=report_data.get("key_takeaways", {}),
                meta_stats=report_data.get("meta_stats", {})
            )

            return Response(
                {"detail": "Interview ended and report generated successfully."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import sys
            print(f"CRITICAL ERROR generating report: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return Response(
                {"detail": "Interview ended but report generation failed.", "error": str(e)},
                status=status.HTTP_200_OK,                                           
            )
