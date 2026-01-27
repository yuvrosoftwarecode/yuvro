import asyncio
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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

    def _process_chat_message(self, chat_session, validated_data):
        """Process a chat message and generate AI response."""
        message_content = validated_data["message"]
        temperature = validated_data.get("temperature")
        max_tokens = validated_data.get("max_tokens")
        page_content = validated_data.get("page_content")

        try:
            with transaction.atomic():
                # Create user message
                user_message = ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="user",
                    content=message_content,
                )

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
                try:
                    response_data = loop.run_until_complete(
                        ai_service.generate_response(
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            page_content=page_content,
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

    def _prepare_messages(self, chat_session, user_config=None):
        """Prepare messages for AI service."""
        messages = []

        # Check if this is a mock interview session and inject specialized persona
        if chat_session.page == "mock_interview":
            context = chat_session.context
            role = context.get("role", "Software Engineer")
            level = context.get("level", "Intermediate")
            difficulty = context.get("difficulty", "Medium")
            interviewer_name = context.get("interviewer_name", "AI Interviewer")
            candidate_info = context.get("candidate_info", "No specific background provided.")
            
            # Richer Prompt Construction
            interview_prompt = f"""You are {interviewer_name}, an expert technical interviewer.

CRITICAL RULES:
1. **Initial Greeting**: STRICTLY start with: "Hi, I'm {interviewer_name}. I'll be conducting your interview for the {role} position today. To get us started, could you please give me a quick introduction?"
   - Do NOT add any other pleasantries.
2. **NO Definitions**: NEVER ask "What is...", "Define...", or "Explain the concept of...".
   - ❌ "What is a deadlock?"
   - ❌ "Explain useEffect."
3. **Scenario First**: EVERY question must be a practical situation, debugging challenge, or system design trade-off.
   - ✅ "Two threads are stuck waiting for each other. How do you debug this?"
   - ✅ "Your component renders too often. how do you optimize it?"
4. **Brevity**: Max 1-2 sentences. Be direct and conversational.
5. **Adaptive Chaining (Step-by-Step Strategy)**:
   - **Step 1**: Analyze the candidate's last answer. Identify ONE specific concept, technology, or trade-off they mentioned.
   - **Step 2**: Formulate a follow-up question that challenges THAT specific concept.
   - **Rule**: Do NOT change the topic unless the candidate completely failed or the topic is fully exhausted.
   - Example If they say "I use Redis for caching", ask: "What happens if your Redis instance fills up? How do you handle eviction?"
6. **Coding Questions**: When you want the candidate to write code, you MUST start the sentence with **"Please write code to..."** or **"Write a function that..."**.
   - This triggers the code editor for the candidate.


INTERVIEW CONTEXT:
- Role: {role}
- Difficulty: {difficulty}
- Candidate: {candidate_info}

Start with the Initial Greeting.
"""
            messages.append({"role": "system", "content": interview_prompt})

        # Add user-configured system prompt (if not in interview mode, or as secondary instruction)
        elif user_config and user_config.system_prompt:
            messages.append({"role": "system", "content": user_config.system_prompt})

        # Add conversation history
        chat_messages = chat_session.messages.order_by("created_at")
        for msg in chat_messages:
            if msg.message_type == "system":
                role = "system"
            elif msg.message_type == "user":
                role = "user"
            else:
                role = "assistant"
            messages.append({"role": role, "content": msg.content})

        if chat_session.page == "mock_interview":
            # Find the last user message to enforce adaptive analysis
            last_user_msg = None
            for msg in reversed(messages):
                if msg["role"] == "user":
                    last_user_msg = msg["content"]
                    break
            
            if last_user_msg:
                adaptive_instruction = (
                    f"The candidate's last answer was: \"{last_user_msg}\".\n"
                    "TASK: Analyze this answer for technical accuracy and depth. "
                    "Did they miss any edge cases? Did they mention a specific technology? "
                    "Formulate your next question specifically to follow up on this answer."
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
        interview_session.save()

        # Generate Report
        try:
            report_generator = InterviewReportGenerator()
            
            # Read resume content if file exists
            resume_text = None
            if interview_session.resume_file:
                try:
                    # Basic text extraction from PDF could go here.
                    # For now, we will skip complex PDF parsing and just pass "Resume provided"
                    # or implement a simple PDF reader if libraries available.
                    # We'll stick to a placeholder to avoid dependency issues for this slice.
                    resume_text = "The candidate has provided a resume file." 
                except Exception:
                    pass

            # Prepare conversation text synchronously
            messages = interview_session.chat_session.messages.order_by("created_at")
            conversation_text = ""
            for msg in messages:
                role = "Interviewer" if msg.message_type != "user" else "Candidate"
                conversation_text += f"{role}: {msg.content}\n\n"

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
            # logger.error(f"Error generating report: {str(e)}") # logger not imported at top level in snippet view
            print(f"Error generating report: {str(e)}")
            return Response(
                {"detail": "Interview ended but report generation failed.", "error": str(e)},
                status=status.HTTP_200_OK, # Soft fail, we still ended the interview
            )
