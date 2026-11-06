from django.contrib import admin
from .models import (
    MockInterview,
    PredefinedInterviewQuestion,
    MockInterviewSubmission,
    UserInterviewProgress,
    CandidateMockInterviewQuota,
    MockInterviewPack,
    MockInterviewCreditLedger,
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


@admin.register(CandidateMockInterviewQuota)
class CandidateMockInterviewQuotaAdmin(admin.ModelAdmin):
    list_display = ["user", "free_interviews", "purchased_interviews", "used_interviews", "available_interviews", "updated_at"]
    search_fields = ["user__email", "user__username"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(MockInterviewPack)
class MockInterviewPackAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "interviews_count", "price_inr", "price_paise", "badge", "is_active", "sort_order"]
    list_filter = ["is_active"]
    search_fields = ["id", "name"]


@admin.register(MockInterviewCreditLedger)
class MockInterviewCreditLedgerAdmin(admin.ModelAdmin):
    list_display = ["user", "entry_type", "delta", "balance_after", "description", "created_at"]
    list_filter = ["entry_type", "created_at"]
    search_fields = ["user__email", "user__username", "description"]
    readonly_fields = ["created_at", "updated_at"]

