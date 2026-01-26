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
)
from .services import AIServiceFactory, AIServiceError


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

        # Add system prompt if configured
        if user_config and user_config.system_prompt:
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
