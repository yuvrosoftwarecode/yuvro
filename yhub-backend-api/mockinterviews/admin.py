from django.contrib import admin
from .models import (
    MockInterview,
    PredefinedInterviewQuestion,
    MockInterviewSubmission,
    UserInterviewProgress,
)

class PredefinedInterviewQuestionInline(admin.TabularInline):
    model = PredefinedInterviewQuestion
    extra = 1
    fields = ["text", "level", "parent"]

@admin.register(MockInterview)
class MockInterviewAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "publish_status",
        "max_duration",
        "created_by",
        "created_at",
    ]
    list_filter = ["publish_status", "created_at"]
    search_fields = ["title", "description"]
    inlines = [PredefinedInterviewQuestionInline]

@admin.register(PredefinedInterviewQuestion)
class PredefinedInterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ["__str__", "mock_interview", "level", "parent"]
    list_filter = ["level", "mock_interview"]
    search_fields = ["text", "mock_interview__title"]

@admin.register(MockInterviewSubmission)
class MockInterviewSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "__str__",
        "user",
        "status",
        "experience_level",
        "interview_type",
        "marks",
        "started_at",
    ]
    list_filter = ["status", "interview_type", "experience_level", "started_at"]
    search_fields = ["user__email", "user__username", "mock_interview__title"]
    readonly_fields = ["started_at", "submitted_at", "completed_at", "old_chat_session_id", "chat_session"]

@admin.register(UserInterviewProgress)
class UserInterviewProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "mock_interview", "completed_count", "updated_at"]
    list_filter = ["mock_interview", "updated_at"]
    search_fields = ["user__email", "user__username", "mock_interview__title"]
