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
    JobTestQuestionActivity,
    CertificationExam,
    CertificationSubmission,
    CertificationQuestionActivity,
    Certificate,
    PredefinedInterviewQuestion,
    UserInterviewProgress
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


@admin.register(PredefinedInterviewQuestion)
class PredefinedInterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ["text", "mock_interview", "level", "parent"]
    list_filter = ["level", "mock_interview"]
    search_fields = ["text"]

class PredefinedInterviewQuestionInline(admin.TabularInline):
    model = PredefinedInterviewQuestion
    extra = 5
    fields = ["text", "level", "parent"]

@admin.register(UserInterviewProgress)
class UserInterviewProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "mock_interview", "completed_count"]
    list_filter = ["mock_interview"]
    search_fields = ["user__username", "user__email", "mock_interview__title"]

@admin.register(MockInterview)
class MockInterviewAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "publish_status",
        "max_duration",
        "created_at",
    ]
    list_filter = ["publish_status", "created_at"]
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
            "Metadata",
            {
                "fields": ("id", "created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    inlines = [PredefinedInterviewQuestionInline]

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
        "face_check_count_display",
        "face_enroll_photo_display",
        "started_at",
        "submitted_at",
    ]
    list_filter = [
        "status",
        "experience_level",
        "started_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "mock_interview__title",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "started_at",
        "jd_text_display",
        "resume_text_display",
        "face_enrollment_display",
        "face_checks_display",
        "interview_analytics_display",
    ]
    fieldsets = (
        (
            "Submission Info",
            {"fields": ("user", "mock_interview", "experience_level", "status", "interview_type")},
        ),
        ("Timing", {"fields": ("started_at", "submitted_at", "completed_at")}),
        ("Results", {"fields": ("marks",)}),
        (
            "JD & Resume (AI / Custom Interviews)",
            {
                "fields": ("jd_text_display", "resume_text_display"),
                "classes": ("collapse",),
            },
        ),
        (
            "Interview Analytics",
            {
                "fields": ("interview_analytics_display",),
                "classes": ("collapse",),
            },
        ),
        (
            "Face Verification",
            {
                "fields": ("face_enrollment_display", "face_checks_display"),
                "classes": ("collapse",),
            },
        ),
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

    # ── helper to get state_data safely ──────────────────────────────────────

    def _state(self, obj):
        return obj.state_data or {}

    # ── list_display helpers ──────────────────────────────────────────────────

    @admin.display(description="Face Checks")
    def face_check_count_display(self, obj):
        checks = self._state(obj).get("face_checks", [])
        return len(checks)

    @admin.display(description="Enroll Photo")
    def face_enroll_photo_display(self, obj):
        enrollment = self._state(obj).get("face_enrollment") or {}
        key = enrollment.get("photo_key")
        if not key:
            return "—"
        try:
            from core.storage import build_public_url
            url = build_public_url(key)
            if url:
                return format_html(
                    '<a href="{}" target="_blank" rel="noopener">📷 View</a>', url
                )
        except Exception:
            pass
        return format_html('<code>{}</code>', key)

    # ── readonly field displays ───────────────────────────────────────────────

    @admin.display(description="Job Description")
    def jd_text_display(self, obj):
        state = self._state(obj)
        jd = state.get("jd_text") or ""
        if not jd:
            return "—"
        return format_html(
            '<pre style="white-space:pre-wrap;max-height:300px;overflow-y:auto;'
            'font-size:0.85em;background:#f8f8f8;padding:8px;border-radius:4px;">{}</pre>',
            jd,
        )

    @admin.display(description="Resume Text")
    def resume_text_display(self, obj):
        state = self._state(obj)
        rt = state.get("resume_text") or ""
        if not rt:
            return "—"
        return format_html(
            '<pre style="white-space:pre-wrap;max-height:300px;overflow-y:auto;'
            'font-size:0.85em;background:#f8f8f8;padding:8px;border-radius:4px;">{}</pre>',
            rt,
        )

    @admin.display(description="Face Enrollment")
    def face_enrollment_display(self, obj):
        enrollment = self._state(obj).get("face_enrollment") or {}
        if not enrollment:
            return "Not enrolled"
        rows = []
        enrolled = enrollment.get("enrolled", False)
        rows.append(f"<b>Enrolled:</b> {'✅ Yes' if enrolled else '❌ No'}")
        rows.append(f"<b>Face ID:</b> {enrollment.get('face_id', '—')}")
        key = enrollment.get("photo_key")
        if key:
            try:
                from core.storage import build_public_url
                url = build_public_url(key)
                if url:
                    rows.append(
                        f'<b>Enrollment Photo:</b> <a href="{url}" target="_blank" rel="noopener">📷 View Photo</a>'
                    )
                else:
                    rows.append(f"<b>Enrollment Photo Key:</b> <code>{key}</code>")
            except Exception:
                rows.append(f"<b>Enrollment Photo Key:</b> <code>{key}</code>")
        else:
            rows.append("<b>Enrollment Photo:</b> Not uploaded to storage")
        return format_html("<br>".join(rows))

    @admin.display(description="Face Verification Checks")
    def face_checks_display(self, obj):
        checks = self._state(obj).get("face_checks", [])
        if not checks:
            return "No checks recorded"
        rows = [
            f"<b>Total checks:</b> {len(checks)}<br>"
            "<table style='border-collapse:collapse;font-size:0.85em;width:100%'>"
            "<thead><tr style='background:#eee'>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>Timestamp</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>Status</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>Score</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>Photo</th>"
            "</tr></thead><tbody>"
        ]
        for check in checks[-20:]:   # show last 20 checks
            ts = check.get("timestamp", "—")
            st = check.get("status", check.get("verified", "—"))
            sc = check.get("score", check.get("similarity", "—"))
            key = check.get("photo_key")
            photo_cell = "—"
            if key:
                try:
                    from core.storage import build_public_url
                    url = build_public_url(key)
                    if url:
                        photo_cell = f'<a href="{url}" target="_blank" rel="noopener">📷</a>'
                except Exception:
                    photo_cell = f"<code>{key[:30]}…</code>"
            rows.append(
                f"<tr>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{ts}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{st}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{sc}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{photo_cell}</td>"
                f"</tr>"
            )
        rows.append("</tbody></table>")
        return format_html("".join(rows))

    @admin.display(description="Interview Analytics")
    def interview_analytics_display(self, obj):
        state = self._state(obj)
        answers = state.get("answers", {})
        interview = state.get("interview", [])
        if not answers and not interview:
            return "No interview data recorded yet."

        # Build Q&A table
        rows = [
            f"<b>Questions Asked:</b> {len(interview)} | "
            f"<b>Answers Given:</b> {len(answers)}<br><br>"
            "<table style='border-collapse:collapse;font-size:0.85em;width:100%'>"
            "<thead><tr style='background:#eee'>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>#</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd;max-width:300px'>Question</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd;max-width:300px'>Answer</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>Score</th>"
            "<th style='padding:4px 8px;border:1px solid #ddd'>Evaluation</th>"
            "</tr></thead><tbody>"
        ]
        for i, q in enumerate(interview, 1):
            qid = str(q.get("id", ""))
            q_text = (q.get("question") or "")[:200]
            ans_data = answers.get(qid) or {}
            ans_text = (ans_data.get("answer") or "")[:200]
            score = ans_data.get("score", "—")
            evaluation = (ans_data.get("evaluation") or "")[:150]
            rows.append(
                f"<tr>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{i}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd;max-width:300px'>{q_text}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd;max-width:300px'>{ans_text}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{score}</td>"
                f"<td style='padding:4px 8px;border:1px solid #ddd'>{evaluation}</td>"
                f"</tr>"
            )
        rows.append("</tbody></table>")

        # Overall score from state
        overall = state.get("analysis", {}).get("overall_score") or obj.marks or "—"
        rows.insert(0, f"<b>Overall Score:</b> {overall}<br>")

        return format_html("".join(rows))


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
    list_display = ["id", "user", "course", "issued_at"]
    search_fields = ["id", "user__username", "course__name"]
