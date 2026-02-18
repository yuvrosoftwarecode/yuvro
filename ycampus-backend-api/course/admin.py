from django.contrib import admin
from core.models import College, Batch, Department, Semester, Section
from .models import (
    Subject,
    Unit,
    SubUnit,
    Video,
    Note,
    Question,
    StudentCodePractice,
    UserSubjectProgress,
    CollegeSubject,
    SemesterSubject,
)


class UnitInline(admin.TabularInline):
    model = Unit
    extra = 0
    fields = ["name", "order_index"]
    ordering = ["order_index"]


class SubUnitInline(admin.TabularInline):
    model = SubUnit
    extra = 0
    fields = ["name", "content", "order_index"]
    ordering = ["order_index"]


class CollegeSubjectInline(admin.TabularInline):
    model = CollegeSubject
    extra = 1


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["yuvro_id", "subject_name", "short_code", "created_at", "updated_at"]
    list_filter = ["created_at", "updated_at"]
    search_fields = ["yuvro_id", "subject_name", "short_code"]
    readonly_fields = ["id", "yuvro_id", "created_at", "updated_at"]
    fields = [
        "subject_name",
        "short_code",
        "yuvro_id",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]
    inlines = [UnitInline, CollegeSubjectInline]


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ["name", "subject", "order_index", "created_at"]
    list_filter = ["subject", "created_at"]
    search_fields = ["name", "subject__name"]
    readonly_fields = ["id", "created_at"]
    fields = ["name", "subject", "order_index", "id", "created_at"]
    ordering = ["subject", "order_index"]
    inlines = [SubUnitInline]


@admin.register(SubUnit)
class SubUnitAdmin(admin.ModelAdmin):
    list_display = ["name", "unit", "order_index", "created_at"]
    list_filter = ["unit__subject", "unit", "created_at"]
    search_fields = ["name", "unit__name", "unit__subject__name"]
    readonly_fields = ["id", "created_at"]
    fields = ["name", "unit", "content", "order_index", "id", "created_at"]
    ordering = ["unit", "order_index"]


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ["title", "sub_unit", "created_at", "updated_at"]
    list_filter = ["sub_unit__unit__subject", "sub_unit__unit", "created_at"]
    search_fields = ["title", "sub_unit__name", "sub_unit__unit__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "title",
        "sub_unit",
        "video_link",
        "ai_context",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["sub_unit", "created_at"]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "type",
        "title",
        "level",
        "difficulty",
        "marks",
        "created_by",
        "created_at",
    ]
    list_filter = ["type", "level", "difficulty", "categories", "created_at"]
    search_fields = ["title", "content"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": [
                    "type",
                    "title",
                    "content",
                    "level",
                    "difficulty",
                    "marks",
                    "categories",
                ]
            },
        ),
        ("Associations", {"fields": ["subject", "unit", "sub_unit"]}),
        ("MCQ Fields", {"fields": ["mcq_options"], "classes": ("collapse",)}),
        (
            "Coding Fields",
            {
                "fields": ["test_cases_basic", "test_cases_advanced"],
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ["id", "created_by", "created_at", "updated_at"],
                "classes": ("collapse",),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# ------------------ NOTE ADMIN ------------------
@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ["content_preview", "user", "sub_unit", "created_at", "updated_at"]
    list_filter = ["sub_unit__unit__subject", "sub_unit__unit", "user", "created_at"]
    search_fields = [
        "content",
        "user__username",
        "user__email",
        "sub_unit__name",
        "sub_unit__unit__name",
    ]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = ["content", "user", "sub_unit", "id", "created_at", "updated_at"]
    ordering = ["sub_unit", "user", "created_at"]

    def content_preview(self, obj):
        return obj.content[:30] + "..." if len(obj.content) > 30 else obj.content

    content_preview.short_description = "Content"


@admin.register(CollegeSubject)
class CollegeSubjectAdmin(admin.ModelAdmin):
    list_display = ("college", "subject", "created_at")
    list_filter = ("college", "subject", "created_at")
    search_fields = ["subject__subject_name", "college__name"]
    readonly_fields = ["id", "created_at"]
    fields = ["college", "subject", "id", "created_at"]
    ordering = ["-created_at"]


@admin.register(StudentCodePractice)
class StudentCodePracticeAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "question_title",
        "status",
        "marks_obtained",
        "created_at",
    ]
    list_filter = ["status", "created_at", "question__type", "question__difficulty"]
    search_fields = ["user__username", "user__email", "question__title"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ["user", "question", "subject", "unit", "status"]},
        ),
        (
            "Answer Data",
            {
                "fields": ["answer_latest", "answer_history", "answer_attempt_count"],
                "classes": ("collapse",),
            },
        ),
        (
            "Execution Results",
            {
                "fields": ["execution_output", "evaluation_results", "marks_obtained"],
                "classes": ("collapse",),
            },
        ),
        ("Plagiarism Data", {"fields": ["plagiarism_data"], "classes": ("collapse",)}),
        (
            "Metadata",
            {"fields": ["id", "created_at", "updated_at"], "classes": ("collapse",)},
        ),
    )

    def question_title(self, obj):
        return (
            obj.question.title[:50] + "..."
            if len(obj.question.title) > 50
            else obj.question.title
        )

    question_title.short_description = "Question"
    question_title.admin_order_field = "question__title"


@admin.register(UserSubjectProgress)
class UserSubjectProgressAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "subject_name",
        "unit_name",
        "subunit_name",
        "progress_percent",
        "is_completed",
        "is_current_subunit",
        "last_accessed",
    ]
    list_filter = [
        "is_completed",
        "is_current_subunit",
        "is_videos_watched",
        "is_quiz_completed",
        "is_coding_completed",
        "subject",
        "unit",
        "created_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "subject__name",
        "unit__name",
        "sub_unit__name",
    ]
    ordering = ["-last_accessed", "-updated_at"]
    readonly_fields = [
        "id",
        "progress_percent",
        "created_at",
        "updated_at",
        "last_accessed",
    ]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ["user", "subject", "unit", "sub_unit", "is_current_subunit"]},
        ),
        (
            "Progress Status",
            {"fields": ["progress_percent", "is_completed", "completed_at"]},
        ),
        (
            "Component Progress",
            {
                "fields": [
                    "is_videos_watched",
                    "is_quiz_completed",
                    "quiz_score",
                    "is_coding_completed",
                    "coding_score",
                ],
                "classes": ("collapse",),
            },
        ),
        (
            "Answers Data",
            {"fields": ["quiz_answers", "coding_answers"], "classes": ("collapse",)},
        ),
        (
            "Metadata",
            {
                "fields": ["id", "created_at", "updated_at", "last_accessed"],
                "classes": ("collapse",),
            },
        ),
    )

    def subject_name(self, obj):
        return obj.subject.subject_name if obj.subject else "N/A"

    subject_name.short_description = "Subject"
    subject_name.admin_order_field = "subject__name"

    def unit_name(self, obj):
        return obj.unit.name if obj.unit else "N/A"

    unit_name.short_description = "Unit"
    unit_name.admin_order_field = "unit__name"

    def subunit_name(self, obj):
        return obj.sub_unit.name if obj.sub_unit else "N/A"

    subunit_name.short_description = "SubUnit"
    subunit_name.admin_order_field = "sub_unit__name"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("user", "subject", "unit", "sub_unit")
        )

    actions = ["recalculate_progress", "mark_as_current", "mark_as_completed"]

    def recalculate_progress(self, request, queryset):
        """Recalculate progress for selected records"""
        updated_count = 0
        for progress in queryset:
            progress.calculate_progress()
            progress.save()
            updated_count += 1

        self.message_user(
            request, f"Successfully recalculated progress for {updated_count} records."
        )

    recalculate_progress.short_description = "Recalculate progress for selected items"

    def mark_as_current(self, request, queryset):
        """Mark selected subunits as current for their users"""
        # First, unmark all current subunits for the affected users
        user_ids = queryset.values_list("user_id", flat=True).distinct()
        UserSubjectProgress.objects.filter(
            user_id__in=user_ids, is_current_subunit=True
        ).update(is_current_subunit=False)

        # Then mark the selected ones as current
        updated_count = queryset.update(is_current_subunit=True)

        self.message_user(
            request, f"Successfully marked {updated_count} subunits as current."
        )

    mark_as_current.short_description = "Mark as current subunit"

    def mark_as_completed(self, request, queryset):
        """Mark selected progress records as completed"""
        from django.utils import timezone

        updated_count = queryset.update(
            is_completed=True, progress_percent=100.0, completed_at=timezone.now()
        )

        self.message_user(
            request, f"Successfully marked {updated_count} records as completed."
        )

    mark_as_completed.short_description = "Mark as completed"
