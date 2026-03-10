import asyncio
import logging
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import StreamingHttpResponse
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
from assessment.models import MockInterviewSubmission
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

        # Filter to only show providers that are supported and have API keys
        available_providers = []
        for provider_code, provider_name in providers:
            if provider_code in supported_providers:
                try:
                    # Try to create service to check if API key is available
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
            return ChatSessionSerializer  # Include messages
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
            return self._process_chat_message(chat_session, serializer.validated_data)
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

    def _process_chat_message(self, chat_session, validated_data):
        """Process a chat message and generate AI response."""
        message_content = validated_data["message"]
        temperature = validated_data.get("temperature")
        max_tokens = validated_data.get("max_tokens")
        page_content = validated_data.get("page_content")

        try:
            with transaction.atomic():
                # Check if this is the initial trigger message for mock interview
                is_trigger = message_content == "The interview is starting now. Please introduce yourself and ask the first question."
                
                user_message = None
                if not is_trigger:
                    # Create user message
                    user_message = ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="user",
                        content=message_content,
                    )
                else:
                    logger.info(f"Trigger message detected for session {chat_session.id}, skipping storage.")

                # Get AI agent configuration
                ai_agent = chat_session.ai_agent
                user_config = AIAgentConfiguration.objects.filter(
                    user=chat_session.user, ai_agent=ai_agent
                ).first()

                # Use custom settings if available
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

                # Prepare messages for AI service
                messages = self._prepare_messages(chat_session, user_config)

                # Generate AI response
                ai_service = AIServiceFactory.create_service(
                    ai_agent.provider, ai_agent.model_name
                )

                # Run async function in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                # Check if stream is requested by user
                is_streaming = validated_data.get("stream", False)
                
                if is_streaming:
                    return self._handle_streaming_response(
                        chat_session=chat_session,
                        ai_agent=ai_agent,
                        user_config=user_config,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        page_content=page_content,
                    )
                else:    
                    try:
                        response_data = loop.run_until_complete(
                            ai_service.generate_response(
                                messages=messages,
                                temperature=temperature,
                                max_tokens=max_tokens,
                                page_content=page_content,
                                user_name=chat_session.user.profile.full_name if hasattr(chat_session.user, 'profile') and chat_session.user.profile.full_name else (chat_session.user.first_name or chat_session.user.username),
                            )
                        )
                    finally:
                        loop.close()

                    # Create assistant message
                    assistant_message = ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=response_data["response"],
                        tokens_used=response_data.get("tokens_used"),
                        response_time_ms=response_data.get("response_time_ms"),
                        metadata=response_data.get("metadata", {}),
                    )

                    # Update usage statistics
                    self._update_usage_stats(
                        chat_session.user, ai_agent, response_data.get("tokens_used", 0)
                    )

                    # Update chat session timestamp
                    chat_session.updated_at = timezone.now()
                    chat_session.save()

                    # Return response
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
            
    def _handle_streaming_response(
        self,
        chat_session,
        ai_agent,
        user_config,
        messages,
        temperature,
        max_tokens,
        page_content,
    ):
        """Handle streaming response from AI service via SSE."""
        import json
        import time
        from asgiref.sync import async_to_sync
        
        start_time = time.time()
        
        def stream_generator():
            full_response_text = ""
            tokens_used = 0
            
            # Use ai_service to get the stream
            ai_service = AIServiceFactory.create_service(
                ai_agent.provider, ai_agent.model_name
            )
            
            # Since generate_response is an async function, we need to run it in a sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                response_data = loop.run_until_complete(
                    ai_service.generate_response(
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        page_content=page_content,
                        user_name=chat_session.user.profile.full_name if hasattr(chat_session.user, 'profile') and chat_session.user.profile.full_name else (chat_session.user.first_name or chat_session.user.username),
                        stream=True,
                    )
                )
                
                # Check if the service actually returned a stream
                if "stream" in response_data:
                    stream = response_data["stream"]
                    for chunk in stream:
                        print(f"DEBUG CHUNK: {chunk}", flush=True)
                        try:
                            if chunk.text:
                                full_response_text += chunk.text
                                # SSE format: data: {json_string}\n\n
                                data = json.dumps({"chunk": chunk.text})
                                logger.debug(f"Streaming chunk size: {len(chunk.text)}")
                                yield f"data: {data}\n\n"
                        except ValueError as ve:
                            # Gemini raises ValueError if the chunk was blocked or has no text
                            print(f"DEBUG VALUE ERROR: {ve}", flush=True)
                            pass
                    
                    # Update usage if available from stream
                    if hasattr(stream, "usage_metadata") and stream.usage_metadata:
                        tokens_used = stream.usage_metadata.total_token_count
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
                loop.close()
                
                # We need to save the final message to the DB after the stream completes
                # But we're in a generator, so we just run DB ops synchronously here
                if full_response_text:
                    end_time = time.time()
                    response_time_ms = int((end_time - start_time) * 1000)
                    
                    assistant_message = ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=full_response_text,
                        tokens_used=tokens_used,
                        response_time_ms=response_time_ms,
                        metadata=response_data.get("metadata", {}),
                    )
                    
                    self._update_usage_stats(
                        chat_session.user, ai_agent, tokens_used
                    )
                    
                    chat_session.updated_at = timezone.now()
                    chat_session.save()
                    
                    # Send a final 'done' event with the full message metadata
                    done_data = json.dumps({
                        "done": True, 
                        "message_id": str(assistant_message.id),
                        "chat_session_id": str(chat_session.id)
                    })
                    yield f"data: {done_data}\n\n"

        response = StreamingHttpResponse(
            stream_generator(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # Disable nginx buffering
        return response

    def _prepare_messages(self, chat_session, user_config=None):
        """Prepare messages for AI service."""
        messages = []

        # Check if this is a mock interview session and inject specialized persona
        if chat_session.page == "mock_interview":
            # Determine if this is the very first AI message
            is_start = not chat_session.messages.filter(message_type="assistant").exists()
            
            context = chat_session.context or {}
            role = context.get("role", "Software Engineer")
            level = context.get("level", "Intermediate")
            interviewer_name = context.get("interviewer_name", "AI Interviewer")
            candidate_info = context.get("candidate_info", "No specific background provided.")
            ai_context_list = context.get("ai_context", [])
            ai_context_str = "\n".join([f"- {item}" for item in ai_context_list]) if isinstance(ai_context_list, list) else str(ai_context_list)
            
            instructions = context.get("instructions", "")
            required_skills = ", ".join(context.get("required_skills", []))

            # Time Tracking Logic
            time_left_msg = ""
            try:
                interview_session = chat_session.interview_session
                total_duration_mins = interview_session.duration_minutes
                elapsed_time = timezone.now() - interview_session.created_at
                remaining_mins = total_duration_mins - (elapsed_time.total_seconds() / 60)
                
                if remaining_mins <= 2 and remaining_mins > 0:
                    time_left_msg = f"NOTE: There are only {int(remaining_mins)} minutes left. You MUST start wrapping up the interview now."
                elif remaining_mins <= 0:
                    time_left_msg = "NOTE: Time is UP. You MUST politely conclude the interview immediately."
            except:
                pass
            
            # Strict Prompt Construction
            interview_prompt = f"""You are {interviewer_name}, an expert technical interviewer conducting a mock interview for the "{role}" position.

PERSONA & STYLE:
- Professional, observant, and conversational human interviewer. 
- **Brevity is Mandatory**: Every response/question from you MUST be exactly 1 line long. Short and sweet.

CORE RULES:
1. **Active Listening**: You MUST directly acknowledge the specific content of the candidate's last answer. If they say they lacks experience in X, do NOT immediately ask a complex scenario about X.
2. **Scenario-Based & Contextual**: Questions must be practical scenarios or related to the candidate's background. Avoid "Define X" or "What is Y".
3. **Resume-Driven Flow**: Prioritize questions about technologies, projects, and experiences listed in the candidate's resume/background, but only if they align with the candidate's current statements.
4. **Adaptive Chaining**: Base your next 1-line question on the depth or gaps in the candidate's LAST answer. If they are beginner, stick to foundations. If advanced, push limits.
5. **No Definitional Bloat**: Never explain technical concepts. Acknowledge briefly and move to the next 1-line challenge.
6. **Coding**: To trigger the code editor, you MUST start with **"Please write code to..."** or **"Write a function that..."**.

INTERVIEW CONTEXT:
- **Role**: {role}
- **Level**: {level}
- **Required Skills**: {required_skills}
- **AI Focus Context**: 
{ai_context_str}
- **Instructions**: {instructions}
- **Candidate Background/Resume**: {candidate_info}

{time_left_msg}
"""
            if is_start:
                # Override everything for the very first message
                interview_prompt = f"""You are {interviewer_name}, starting a mock interview for {role}.
                
                TASK: Greet the candidate warmly and ask them to introduce themselves and highlight relevant experience.
                STRICT RULE: Your response MUST be exactly 1 line long.
                
                Example: "Hi, I'm {interviewer_name}, your interviewer for the {role} role today; could you please introduce yourself and tell me about your background?"
                """
            
            messages.append({"role": "system", "content": interview_prompt})

        # Add user-configured system prompt
        elif user_config and user_config.system_prompt:
            messages.append({"role": "system", "content": user_config.system_prompt})

        # Add conversation history
        chat_messages = chat_session.messages.order_by("created_at")
        for msg in chat_messages:
            role = "system" if msg.message_type == "system" else "user" if msg.message_type == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})

        if chat_session.page == "mock_interview" and not is_start:
            # Find the last user message
            last_user_msg = None
            for msg in reversed(messages):
                if msg["role"] == "user":
                    last_user_msg = msg["content"]
                    break
            
            if last_user_msg:
                adaptive_instruction = (
                    f"The candidate's last answer was: \"{last_user_msg}\".\n"
                    "INSTRUCTION: \n"
                    "1. First, briefly acknowledge or validate their specific answer (e.g., 'Got it', 'I see you have a backend background', etc.).\n"
                    "2. Then, ask your next 1-LINE question. \n"
                    "3. If they mentioned a specific technology or lack of experience, pivot your question to align with their statement while staying relevant to the Data Scientist role.\n"
                    "STRICT: The entire response must be exactly 1 line."
                )
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
        # TODO: Calculate cost based on provider pricing
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

        # Get date range from query params
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")

        if from_date:
            queryset = queryset.filter(date__gte=from_date)
        if to_date:
            queryset = queryset.filter(date__lte=to_date)

        # Calculate totals
        total_messages = sum(usage.total_messages for usage in queryset)
        total_tokens = sum(usage.total_tokens for usage in queryset)
        total_cost = sum(usage.total_cost for usage in queryset)

        # Group by AI agent
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
        serializer = ChatRequestSerializer(data=request.data)

        if serializer.is_valid():
            validated_data = serializer.validated_data
            ai_agent_id = validated_data.get("ai_agent_id")
            if not ai_agent_id:
                return Response(
                    {"ai_agent_id": ["This field is required for quick chat."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            message_content = validated_data["message"]
            page_content = validated_data.get("page_content")

            try:
                ai_agent = get_object_or_404(AIAgent, id=ai_agent_id, is_active=True)

                # Get user configuration if exists
                user_config = AIAgentConfiguration.objects.filter(
                    user=request.user, ai_agent=ai_agent
                ).first()

                # Prepare messages
                messages = []
                if user_config and user_config.system_prompt:
                    messages.append(
                        {"role": "system", "content": user_config.system_prompt}
                    )

                messages.append({"role": "user", "content": message_content})

                # Generate response
                ai_service = AIServiceFactory.create_service(
                    ai_agent.provider, ai_agent.model_name
                )

                temperature = validated_data.get("temperature", ai_agent.temperature)
                max_tokens = validated_data.get("max_tokens", ai_agent.max_tokens)

                # Run async function in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    response_data = loop.run_until_complete(
                        ai_service.generate_response(
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            page_content=page_content,
                            user_name=request.user.profile.full_name if hasattr(request.user, 'profile') and request.user.profile.full_name else (request.user.first_name or request.user.username),
                        )
                    )
                finally:
                    loop.close()

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
        # 1. Extract Resume Text & Context
        resume_file = self.request.data.get('resume') # From FormData
        interviewer_name = self.request.data.get('interviewer_name', 'Alex')
        role_title = self.request.data.get('role_title', 'General Profile')
        role_level = self.request.data.get('role_level', 'Intermediate')
        difficulty = self.request.data.get('difficulty', 'Medium')
        duration_minutes = self.request.data.get('duration_minutes', 30)

        context_text = ""
        if resume_file:
            try:
                # Basic PDF text extraction
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

        # 2. Create a ChatSession
        # We need an AI Agent. For now, we pick the first active Gemini agent or create a default one.
        ai_agent = AIAgent.objects.filter(provider="gemini", is_active=True).first()
        if not ai_agent:
            # Fallback for dev env for now
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

        # 3. Save InterviewSession with the linked ChatSession
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

        # Update status
        interview_session.status = "completed"
        interview_session.completed_at = timezone.now()
        
        # Calculate actual duration
        if interview_session.created_at:
            duration = interview_session.completed_at - interview_session.created_at
            interview_session.actual_duration = duration
            
        interview_session.save()

        # SYNC: Update MockInterviewSubmission if it exists
        try:
            submission = MockInterviewSubmission.objects.filter(
                chat_session=interview_session.chat_session
            ).first()
            if submission:
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.completed_at = timezone.now()
                # Store actual duration if needed
                # submission.selected_duration = ... 
                submission.save()
        except Exception as e:
             print(f"Error syncing MockInterviewSubmission: {e}")

        # Generate Report
        try:
            report_generator = InterviewReportGenerator()
            
            # Read resume content if file exists
            resume_text = None

            # Prepare conversation text synchronously
            trigger_text = "The interview is starting now. Please introduce yourself and ask the first question."
            messages = interview_session.chat_session.messages.order_by("created_at")
            conversation_text = ""
            for msg in messages:
                if msg.content.strip() == trigger_text:
                    continue
                role = "Interviewer" if msg.message_type != "user" else "Candidate"
                conversation_text += f"{role}: {msg.content}\n\n"

            # Use extracted resume text from context if available
            resume_text = interview_session.chat_session.context.get("candidate_info", "No resume provided.")

            # Run async generation in sync context
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

            # Create Report object
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
                status=status.HTTP_200_OK, # Soft fail, we still ended the interview
            )
