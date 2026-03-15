from rest_framework import serializers
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import (
    AIAgent,
    ChatSession,
    ChatMessage,
    AIAgentUsage,
    AIAgentConfiguration,
    InterviewSession,
    InterviewReport,
)


class AIAgentSerializer(serializers.ModelSerializer):
    """
    Serializer for AIAgent model.
    """

    class Meta:
        model = AIAgent
        fields = [
            "id",
            "name",
            "provider",
            "model_name",
            "description",
            "is_active",
            "max_tokens",
            "temperature",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_temperature(self, value):
        """Validate temperature is within acceptable range."""
        if not 0.0 <= value <= 2.0:
            raise serializers.ValidationError("Temperature must be between 0.0 and 2.0")
        return value

    def validate_max_tokens(self, value):
        """Validate max_tokens is reasonable."""
        if value < 1 or value > 100000:
            raise serializers.ValidationError(
                "Max tokens must be between 1 and 100,000"
            )
        return value


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for ChatMessage model.
    """

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "chat_session",
            "message_type",
            "content",
            "metadata",
            "tokens_used",
            "response_time_ms",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ChatSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for ChatSession model with nested messages.
    """

    messages = ChatMessageSerializer(many=True, read_only=True)
    ai_agent_name = serializers.CharField(source="ai_agent.name", read_only=True)
    ai_agent_provider = serializers.CharField(
        source="ai_agent.provider", read_only=True
    )

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "user",
            "ai_agent",
            "ai_agent_name",
            "ai_agent_provider",
            "title",
            "page",
            "context",
            "is_active",
            "created_at",
            "updated_at",
            "messages",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
            "ai_agent_name",
            "ai_agent_provider",
        ]


class ChatSessionBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for ChatSession model without nested messages.
    """

    ai_agent_name = serializers.CharField(source="ai_agent.name", read_only=True)
    ai_agent_provider = serializers.CharField(
        source="ai_agent.provider", read_only=True
    )
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "user",
            "ai_agent",
            "ai_agent_name",
            "ai_agent_provider",
            "title",
            "page",
            "context",
            "is_active",
            "created_at",
            "updated_at",
            "message_count",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
            "ai_agent_name",
            "ai_agent_provider",
        ]

    def get_message_count(self, obj):
        """Get the number of messages in this chat session."""
        return obj.messages.count()


class AIAgentUsageSerializer(serializers.ModelSerializer):
    """
    Serializer for AIAgentUsage model.
    """

    ai_agent_name = serializers.CharField(source="ai_agent.name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AIAgentUsage
        fields = [
            "id",
            "user",
            "user_username",
            "ai_agent",
            "ai_agent_name",
            "date",
            "total_messages",
            "total_tokens",
            "total_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "ai_agent_name",
            "user_username",
        ]


class AIAgentConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for AIAgentConfiguration model.
    """

    ai_agent_name = serializers.CharField(source="ai_agent.name", read_only=True)

    class Meta:
        model = AIAgentConfiguration
        fields = [
            "id",
            "user",
            "ai_agent",
            "ai_agent_name",
            "custom_temperature",
            "custom_max_tokens",
            "system_prompt",
            "is_favorite",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "ai_agent_name"]

    def validate_custom_temperature(self, value):
        """Validate custom temperature if provided."""
        if value is not None and not 0.0 <= value <= 2.0:
            raise serializers.ValidationError("Temperature must be between 0.0 and 2.0")
        return value


class ChatRequestSerializer(serializers.Serializer):
    """
    Serializer for chat request data.
    """

    message = serializers.CharField(max_length=10000)
    ai_agent_id = serializers.UUIDField(required=False)
    chat_session_id = serializers.UUIDField(required=False, allow_null=True)
    page = serializers.CharField(max_length=255, required=False, allow_blank=True)
    context = serializers.JSONField(required=False, default=dict)
    temperature = serializers.FloatField(
        required=False, validators=[MinValueValidator(0.0), MaxValueValidator(2.0)]
    )
    max_tokens = serializers.IntegerField(
        required=False, validators=[MinValueValidator(1), MaxValueValidator(100000)]
    )
    page_content = serializers.CharField(
        max_length=20000, required=False, allow_blank=True
    )
    stream = serializers.BooleanField(required=False, default=False)

    def validate_message(self, value):
        """Validate message is not empty."""
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty")
        return value.strip()


class ChatResponseSerializer(serializers.Serializer):
    """
    Serializer for chat response data.
    """

    chat_session_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    response = serializers.CharField()
    tokens_used = serializers.IntegerField(required=False)
    response_time_ms = serializers.IntegerField(required=False)
    metadata = serializers.JSONField(required=False, default=dict)


class InterviewReportSerializer(serializers.ModelSerializer):
    """
    Serializer for InterviewReport model.
    """

    class Meta:
        model = InterviewReport
        fields = [
            "id",
            "interview_session",
            "overall_score",
            "feedback_summary",
            "performance_metrics",
            "skill_analysis",
            "question_analysis",
            "key_takeaways",
            "meta_stats",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InterviewSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for InterviewSession model.
    """

    report = InterviewReportSerializer(read_only=True)
    chat_session_id = serializers.UUIDField(source="chat_session.id", read_only=True)
    transcript = ChatMessageSerializer(source="chat_session.messages", many=True, read_only=True)
    user_details = serializers.SerializerMethodField()

    def get_user_details(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email
        }

    actual_duration_display = serializers.SerializerMethodField()

    def get_actual_duration_display(self, obj):
        if not obj.actual_duration:
            return None
        total_seconds = int(obj.actual_duration.total_seconds())
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes}m {seconds}s"

    class Meta:
        model = InterviewSession
        fields = [
            "id",
            "user",
            "user_details",
            "chat_session",
            "chat_session_id",
            "role_title",
            "role_level",
            "difficulty",
            "duration_minutes",
            "status",
            "resume_file",
            "report",
            "transcript",
            "actual_duration",
            "actual_duration_display",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "chat_session",
            "report",
            "user",
        ]
