import asyncio
import logging
from django.shortcuts import get_object_or_404
from django.db import transaction
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

logger = logging.getLogger(__name__)

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

class ChatSessionViewSet(viewsets.ModelViewSet):
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

        try:
                                                                               
            is_trigger = message_content == "The interview is starting now. Please introduce yourself and ask the first question."
            
            user_message = None
            if not is_trigger:
                                                     
                user_message = await sync_to_async(ChatMessage.objects.create)(
                    chat_session=chat_session,
                    message_type="user",
                    content=message_content,
                )
            else:
                logger.info(f"Trigger message detected for session {chat_session.id}, skipping storage.")

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
                )
            else:    
                ai_service = AIServiceFactory.create_service(
                    ai_agent.provider, ai_agent.model_name
                )
                
                full_user_name = await sync_to_async(lambda: f"{session_user.first_name} {session_user.last_name}".strip() or session_user.username)()

                response_data = await ai_service.generate_response(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    page_content=page_content,
                    user_name=full_user_name,
                )

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

                response_serializer = ChatResponseSerializer(
                    {
                        "chat_session_id": chat_session.id,
                        "message_id": assistant_message.id,
                        "response": response_data["response"],
                        "tokens_used": response_data.get("tokens_used"),
                        "response_time_ms": response_data.get("response_time_ms"),
                        "metadata": response_data.get("metadata", {}),
                    }
                )

                return Response(response_serializer.data, status=status.HTTP_200_OK)

        except AIServiceError as e:
            return Response(
                {"error": f"AI service error: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
            
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
    ):
        """Handle streaming response from AI service via SSE."""
        import json
        import time
        
        start_time = time.time()
        
        async def stream_generator():
            full_response_text = ""
            tokens_used = 0
            
            ai_service = AIServiceFactory.create_service(
                ai_agent.provider, ai_agent.model_name
            )
            
            try:
                                                                                                                       
                yield " " * 1024 + "\n"
                
                messages = await self._prepare_messages(chat_session, user_config)

                target_user = user or (await sync_to_async(lambda: chat_session.user)() if chat_session else None)
                user_name = await sync_to_async(lambda: f"{target_user.first_name} {target_user.last_name}".strip() if target_user else "User")()

                response_data = await ai_service.generate_response(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    page_content=page_content,
                    user_name=user_name,
                    stream=True,
                )
                
                if "stream" in response_data:
                    stream = response_data["stream"]
                    async for chunk in stream:
                        text = None
                                                        
                        if hasattr(chunk, 'text'):
                            try:
                                text = chunk.text
                            except ValueError:                     
                                pass
                                                           
                        elif hasattr(chunk, 'type'):
                            if chunk.type == 'content_block_delta':
                                text = chunk.delta.text
                        
                        if text:
                            full_response_text += text
                            data = json.dumps({"chunk": text})
                            yield f"data: {data}\n\n"
                                                                                                          
                    if hasattr(stream, "get_final_metadata"):
                        meta = stream.get_final_metadata()
                        if hasattr(meta, 'usage'):
                            tokens_used = meta.usage.input_tokens + meta.usage.output_tokens
                    elif hasattr(stream, "usage_metadata") and stream.usage_metadata:
                        tokens_used = stream.usage_metadata.total_token_count
                else:
                                                                                                
                    full_response_text = response_data["response"]
                    data = json.dumps({"chunk": full_response_text})
                    yield f"data: {data}\n\n"
                    tokens_used = response_data.get("tokens_used", 0)
                    
            except Exception as e:
                                                  
                error_data = json.dumps({"error": str(e)})
                yield f"data: {error_data}\n\n"
            finally:
                                                                                                        
                final_user = user or (await sync_to_async(lambda: chat_session.user)() if chat_session else None)
                
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
                        final_user, ai_agent, tokens_used
                    )
                    
                    chat_session.updated_at = timezone.now()
                    await sync_to_async(chat_session.save)()
                    
                    done_data = json.dumps({
                        "done": True, 
                        "message_id": str(assistant_message.id),
                        "chat_session_id": str(chat_session.id)
                    })
                    yield f"data: {done_data}\n\n"
                elif full_response_text and final_user:
                                                                                
                    await sync_to_async(self._update_usage_stats)(
                        final_user, ai_agent, tokens_used
                    )
                    yield f"data: {json.dumps({'done': True})}\n\n"

        response = StreamingHttpResponse(
            stream_generator(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"                             
        response["X-Content-Type-Options"] = "nosniff"
        return response

    async def _prepare_messages(self, chat_session, user_config=None):
        """Prepare messages for AI service."""
        messages = []

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

    def _update_usage_stats(self, user, ai_agent, tokens_used):
        """Update usage statistics for the user and AI agent."""
        today = timezone.now().date()
        usage, created = AIAgentUsage.objects.get_or_create(
            user=user,
            ai_agent=ai_agent,
            date=today,
            defaults={"total_messages": 0, "total_tokens": 0, "total_cost": 0.0000},
        )

        usage.total_messages += 1
        usage.total_tokens += tokens_used
                                                                
        usage.save()

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

class ChatViewSet(viewsets.ViewSet):
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
            page_content = validated_data.get("page_content")
            
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

                messages = []
                if user_config and user_config.system_prompt:
                    messages.append({"role": "system", "content": user_config.system_prompt})

                messages.append({"role": "user", "content": message_content})

                is_streaming = validated_data.get("stream", False)

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
                    )
                
                response_data = await ai_service.generate_response(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    page_content=page_content,
                    user_name=full_user_name,
                )

                return Response(
                    {
                        "response": response_data["response"],
                        "tokens_used": response_data.get("tokens_used"),
                        "response_time_ms": response_data.get("response_time_ms"),
                        "metadata": response_data.get("metadata", {}),
                    },
                    status=status.HTTP_200_OK,
                )

            except AIServiceError as e:
                return Response(
                    {"error": f"AI service error: {str(e)}"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except Exception as e:
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
                    from mockinterviews.dynamic_engine.models import InterviewSession as DynSession
                    from mockinterviews.dynamic_engine.evaluator import InterviewEvaluator
                    from mockinterviews.dynamic_engine.config import get_settings
                    try:
                        dyn_session = DynSession.model_validate(mock_submission.session_state)
                        evaluator = InterviewEvaluator(rubric_version=get_settings().rubric_version)
                        evaluation = evaluator.evaluate(dyn_session)
                        mock_submission.marks = evaluation.overall_score * 10
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error evaluating interview: {e}")
                        
                mock_submission.save(update_fields=['status', 'completed_at', 'marks'])


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
