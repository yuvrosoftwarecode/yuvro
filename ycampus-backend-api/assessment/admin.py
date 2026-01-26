from django.contrib import admin
from django.utils.html import format_html
from .models import (
    SkillTest,
    Contest,
    MockInterview,
    JobTest,
    SkillTestSubmission,
    ContestSubmission,
    MockInterviewSubmission,
    JobTestSubmission,
    SkillTestQuestionActivity,
    ContestQuestionActivity,
    MockInterviewQuestionActivity,
    JobTestQuestionActivity,
    CertificationExam,
    CertificationSubmission,
    CertificationQuestionActivity,
    Certificate
)


@admin.register(SkillTest)
class SkillTestAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "course",
        "topic",
        "difficulty",
        "publish_status",
        "total_marks",
        "created_at",
    ]
    list_filter = ["difficulty", "publish_status", "course", "created_at"]
    search_fields = ["title", "description", "course__name", "topic__name"]
    readonly_fields = ["id", "created_at", "updated_at", "total_attempts"]
    fieldsets = (
        ("Basic Information", {"fields": ("title", "description", "instructions")}),
        ("Course Integration", {"fields": ("course", "topic")}),
        (
            "Assessment Configuration",
            {
                "fields": (
                    "difficulty",
                    "duration",
                    "total_marks",
                    "passing_marks",
                    "questions_config",
                )
            },
        ),
        (
            "Publishing & Proctoring",
            {"fields": ("publish_status", "enable_proctoring")},
        ),
        (
            "Metadata",
            {
                "fields": (
                    "id",
                    "created_by",
                    "created_at",
                    "updated_at",
                    "total_attempts",
                ),
                "classes": ("collapse",),
            },
        ),
    )
    filter_horizontal = []

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("course", "topic", "created_by")
        )


@admin.register(Contest)
class ContestAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "organizer",
        "type",
        "status",
        "start_datetime",
        "end_datetime",
        "difficulty",
    ]
    list_filter = ["type", "status", "difficulty", "start_datetime"]
    search_fields = ["title", "organizer", "description"]
    readonly_fields = ["id", "created_at", "updated_at", "total_attempts"]
    date_hierarchy = "start_datetime"
    fieldsets = (
        (
            "Basic Information",
            {"fields": ("title", "description", "instructions", "organizer")},
        ),
        (
            "Contest Configuration",
            {
                "fields": (
                    "type",
                    "status",
                    "difficulty",
                    "duration",
                    "total_marks",
                    "passing_marks",
                )
            },
        ),
        ("Schedule & Prize", {"fields": ("start_datetime", "end_datetime", "prize")}),
        (
            "Questions & Publishing",
            {
                "fields": (
                    "questions_config",
                    "questions_random_config",
                    "publish_status",
                    "enable_proctoring",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "id",
                    "created_by",
                    "created_at",
                    "updated_at",
                    "total_attempts",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("created_by")

    actions = ["update_contest_status"]

    def update_contest_status(self, request, queryset):
        updated = 0
        for contest in queryset:
            contest.update_status()
            contest.save()
            updated += 1
        self.message_user(request, f"Updated status for {updated} contests.")

    update_contest_status.short_description = "Update contest status"


@admin.register(MockInterview)
class MockInterviewAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "ai_generation_mode",
        "voice_type",
        "publish_status",
        "max_duration",
        "created_at",
    ]
    list_filter = ["ai_generation_mode", "voice_type", "publish_status", "created_at"]
    search_fields = ["title", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        ("Basic Information", {"fields": ("title", "description", "instructions")}),
        (
            "Configuration",
            {
                "fields": (
                    "publish_status",
                    "max_duration",
                    "required_skills",
                    "optional_skills",
                )
            },
        ),
        (
            "AI Configuration",
            {
                "fields": (
                    "ai_generation_mode",
                    "ai_verbal_question_count",
                    "ai_coding_question_count",
                ),
                "description": "Configure how the AI interviewer behaves and generates questions.",
            },
        ),
        (
            "Voice Settings",
            {
                "fields": ("voice_type", "voice_speed", "audio_settings"),
                "description": "Configure the voice and audio properties of the interviewer.",
            },
        ),
        (
            "Questions & Publishing",
            {"fields": ("questions_config", "questions_random_config")},
        ),
        (
            "Metadata",
            {
                "fields": ("id", "created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("created_by")


@admin.register(JobTest)
class JobTestAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "company_name",
        "position_title",
        "difficulty",
        "publish_status",
    ]
    list_filter = ["difficulty", "publish_status", "company_name", "created_at"]
    search_fields = ["title", "company_name", "position_title", "description"]
    readonly_fields = ["id", "created_at", "updated_at", "total_attempts"]
    fieldsets = (
        ("Basic Information", {"fields": ("title", "description", "instructions")}),
        ("Job Details", {"fields": ("company_name", "position_title")}),
        (
            "Test Configuration",
            {
                "fields": (
                    "difficulty",
                    "duration",
                    "total_marks",
                    "passing_marks",
                    "questions_config",
                    "questions_random_config",
                )
            },
        ),
        (
            "Schedule & Publishing",
            {
                "fields": (
                    "start_datetime",
                    "end_datetime",
                    "publish_status",
                    "enable_proctoring",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "id",
                    "created_by",
                    "created_at",
                    "updated_at",
                    "total_attempts",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("created_by")


@admin.register(SkillTestSubmission)
class SkillTestSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "skill_test",
        "status",
        "marks",
        "started_at",
        "submitted_at",
    ]
    list_filter = ["status", "skill_test__course", "started_at", "submitted_at"]
    search_fields = ["user__username", "user__email", "skill_test__title"]
    readonly_fields = ["id", "created_at", "updated_at", "started_at"]
    fieldsets = (
        ("Submission Info", {"fields": ("user", "skill_test", "status")}),
        ("Timing", {"fields": ("started_at", "submitted_at", "completed_at")}),
        ("Results", {"fields": ("marks",)}),
        (
            "Proctoring Data",
            {
                "fields": (
                    "proctoring_events",
                    "browser_info",
                    "ip_address",
                    "user_agent",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "skill_test")


@admin.register(ContestSubmission)
class ContestSubmissionAdmin(admin.ModelAdmin):
    list_display = ["user", "contest", "status", "marks", "started_at", "submitted_at"]
    list_filter = ["status", "contest__type", "started_at"]
    search_fields = ["user__username", "user__email", "contest__title"]
    readonly_fields = ["id", "created_at", "updated_at", "started_at"]
    fieldsets = (
        ("Submission Info", {"fields": ("user", "contest", "status")}),
        ("Timing", {"fields": ("started_at", "submitted_at", "completed_at")}),
        ("Results", {"fields": ("marks",)}),
        (
            "Proctoring Data",
            {
                "fields": (
                    "proctoring_events",
                    "browser_info",
                    "ip_address",
                    "user_agent",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "contest")


@admin.register(MockInterviewSubmission)
class MockInterviewSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "mock_interview",
        "status",
        "experience_level",
        "marks",
        "started_at",
        "submitted_at",
    ]
    list_filter = [
        "status",
        "experience_level",
        "mock_interview__ai_generation_mode",
        "started_at",
    ]
    search_fields = ["user__username", "user__email", "mock_interview__title"]
    readonly_fields = ["id", "created_at", "updated_at", "started_at"]
    fieldsets = (
        (
            "Submission Info",
            {"fields": ("user", "mock_interview", "experience_level", "status")},
        ),
        ("Timing", {"fields": ("started_at", "submitted_at", "completed_at")}),
        ("Results", {"fields": ("marks",)}),
        (
            "Proctoring Data",
            {
                "fields": (
                    "proctoring_events",
                    "browser_info",
                    "ip_address",
                    "user_agent",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "mock_interview")


@admin.register(JobTestSubmission)
class JobTestSubmissionAdmin(admin.ModelAdmin):
    list_display = ["user", "job_test", "status", "marks", "started_at", "submitted_at"]
    list_filter = ["status", "job_test__company_name", "started_at"]
    search_fields = [
        "user__username",
        "user__email",
        "job_test__title",
        "job_test__company_name",
    ]
    readonly_fields = ["id", "created_at", "updated_at", "started_at"]
    fieldsets = (
        ("Submission Info", {"fields": ("user", "job_test", "status")}),
        ("Timing", {"fields": ("started_at", "submitted_at", "completed_at")}),
        ("Results", {"fields": ("marks",)}),
        (
            "Proctoring Data",
            {
                "fields": (
                    "proctoring_events",
                    "browser_info",
                    "ip_address",
                    "user_agent",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "job_test")


class BaseQuestionActivityAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "question",
        "has_violations",
        "violation_count",
        "updated_at",
    ]
    list_filter = [
        "has_violations",
        "violations_resolved",
        "alert_priority",
        "created_at",
    ]
    search_fields = ["user__username", "user__email", "question__title", "session_id"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "question_activities",
        "navigation_activities",
        "proctoring_activities",
        "camera_snapshots",
        "answer_history",
        "answer_data",
    ]

    fieldsets = (
        ("Context", {"fields": ("user", "question", "session_id", "ip_address")}),
        ("Status", {"fields": ("is_final_answer", "is_correct", "marks_obtained")}),
        (
            "Activity Logs",
            {
                "fields": ("question_activities", "navigation_activities"),
                "classes": ("collapse",),
            },
        ),
        (
            "Proctoring Logs",
            {
                "fields": (
                    "proctoring_activities",
                    "camera_snapshots",
                    "has_violations",
                    "violation_count",
                    "alert_priority",
                ),
            },
        ),
        (
            "Violations & Resolution",
            {
                "fields": (
                    "violations_resolved",
                    "resolved_by",
                    "resolved_at",
                    "resolution_notes",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Answer Data",
            {
                "fields": ("answer_data", "answer_history", "answer_attempt_count"),
                "classes": ("collapse",),
            },
        ),
        (
            "Grading",
            {
                "fields": ("auto_graded", "graded_by", "graded_at", "grading_feedback"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "question")


@admin.register(SkillTestQuestionActivity)
class SkillTestQuestionActivityAdmin(BaseQuestionActivityAdmin):
    list_display = BaseQuestionActivityAdmin.list_display + ["skill_test_submission"]


@admin.register(ContestQuestionActivity)
class ContestQuestionActivityAdmin(BaseQuestionActivityAdmin):
    list_display = BaseQuestionActivityAdmin.list_display + ["contest_submission"]


@admin.register(MockInterviewQuestionActivity)
class MockInterviewQuestionActivityAdmin(BaseQuestionActivityAdmin):
    list_display = BaseQuestionActivityAdmin.list_display + [
        "mock_interview_submission"
    ]


@admin.register(JobTestQuestionActivity)
class JobTestQuestionActivityAdmin(BaseQuestionActivityAdmin):
    list_display = BaseQuestionActivityAdmin.list_display + ["job_test_submission"]


@admin.register(CertificationExam)
class CertificationExamAdmin(admin.ModelAdmin):
    list_display = ["title", "course", "publish_status", "created_by", "created_at"]
    list_filter = ["publish_status", "created_at"]
    search_fields = ["title", "description", "course__name"]
    readonly_fields = ["id", "created_at", "updated_at", "total_attempts"]
    fieldsets = (
        ("Basic Info", {"fields": ("title", "description", "instructions")}),
        ("Course", {"fields": ("course", "certificate_template")}),
        (
            "Configuration",
            {
                "fields": (
                    "difficulty",
                    "duration",
                    "total_marks",
                    "passing_marks",
                    "questions_config",
                    "questions_random_config",
                )
            },
        ),
        ("Publishing", {"fields": ("publish_status", "enable_proctoring")}),
        ("Meta", {"fields": ("created_by", "created_at", "updated_at", "total_attempts")}),
    )

@admin.register(CertificationSubmission)
class CertificationSubmissionAdmin(admin.ModelAdmin):
    list_display = ["user", "certification_exam", "status", "marks", "completed_at"]
    list_filter = ["status", "certification_exam__title"]
    
@admin.register(CertificationQuestionActivity)
class CertificationQuestionActivityAdmin(BaseQuestionActivityAdmin):
    list_display = BaseQuestionActivityAdmin.list_display + ["certification_submission"]

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ["certificate_id", "user", "course", "issued_at"]
    search_fields = ["certificate_id", "user__username", "course__name"]
