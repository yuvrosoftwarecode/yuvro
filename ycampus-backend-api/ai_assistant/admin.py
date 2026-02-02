from django.contrib import admin
from .models import (
    AIAgent,
    ChatSession,
    ChatMessage,
    AIAgentUsage,
    AIAgentConfiguration,
)


class ChatMessageInline(admin.TabularInline):
    """
    Inline admin for ChatMessage model within ChatSession admin.
    """

    model = ChatMessage
    extra = 0
    fields = [
        "message_type",
        "content",
        "tokens_used",
        "response_time_ms",
        "created_at",
    ]
    readonly_fields = ["created_at"]
    ordering = ["created_at"]


@admin.register(AIAgent)
class AIAgentAdmin(admin.ModelAdmin):
    """
    Admin interface for AIAgent model.
    """

    list_display = [
        "name",
        "provider",
        "model_name",
        "is_active",
        "max_tokens",
        "temperature",
        "created_at",
    ]
    list_filter = ["provider", "is_active", "created_at"]
    search_fields = ["name", "model_name", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "name",
        "provider",
        "model_name",
        "description",
        "is_active",
        "max_tokens",
        "temperature",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["provider", "name"]


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    """
    Admin interface for ChatSession model.
    """

    list_display = [
        "title",
        "user",
        "ai_agent",
        "page",
        "is_active",
        "created_at",
        "updated_at",
    ]
    list_filter = ["ai_agent__provider", "ai_agent", "is_active", "created_at", "page"]
    search_fields = ["title", "user__username", "user__email", "ai_agent__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "title",
        "user",
        "ai_agent",
        "page",
        "context",
        "is_active",
        "id",
        "created_at",
        "updated_at",
    ]
    inlines = [ChatMessageInline]
    ordering = ["-updated_at"]

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("user", "ai_agent")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """
    Admin interface for ChatMessage model.
    """

    list_display = [
        "chat_session",
        "message_type",
        "content_preview",
        "tokens_used",
        "response_time_ms",
        "created_at",
    ]
    list_filter = ["message_type", "chat_session__ai_agent__provider", "created_at"]
    search_fields = ["content", "chat_session__title", "chat_session__user__username"]
    readonly_fields = ["id", "created_at"]
    fields = [
        "chat_session",
        "message_type",
        "content",
        "metadata",
        "tokens_used",
        "response_time_ms",
        "id",
        "created_at",
    ]
    ordering = ["-created_at"]

    def content_preview(self, obj):
        """Show a preview of the message content."""
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content

    content_preview.short_description = "Content Preview"

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return (
            super()
            .get_queryset(request)
            .select_related("chat_session__user", "chat_session__ai_agent")
        )


@admin.register(AIAgentUsage)
class AIAgentUsageAdmin(admin.ModelAdmin):
    """
    Admin interface for AIAgentUsage model.
    """

    list_display = [
        "user",
        "ai_agent",
        "date",
        "total_messages",
        "total_tokens",
        "total_cost",
    ]
    list_filter = ["ai_agent__provider", "ai_agent", "date"]
    search_fields = ["user__username", "user__email", "ai_agent__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "user",
        "ai_agent",
        "date",
        "total_messages",
        "total_tokens",
        "total_cost",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["-date", "user"]
    date_hierarchy = "date"

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("user", "ai_agent")


@admin.register(AIAgentConfiguration)
class AIAgentConfigurationAdmin(admin.ModelAdmin):
    """
    Admin interface for AIAgentConfiguration model.
    """

    list_display = [
        "user",
        "ai_agent",
        "custom_temperature",
        "custom_max_tokens",
        "is_favorite",
        "created_at",
    ]
    list_filter = ["ai_agent__provider", "ai_agent", "is_favorite", "created_at"]
    search_fields = ["user__username", "user__email", "ai_agent__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "user",
        "ai_agent",
        "custom_temperature",
        "custom_max_tokens",
        "system_prompt",
        "is_favorite",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["user", "ai_agent"]

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related("user", "ai_agent")
