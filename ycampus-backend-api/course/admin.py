from django.contrib import admin
from .models import (
    Course,
    Topic,
    Subtopic,
    Video,
    Note,
    CourseInstructor,
    Question,
    StudentCodePractice,
    UserCourseProgress,
)


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0
    fields = ["name", "order_index"]
    ordering = ["order_index"]


class SubtopicInline(admin.TabularInline):
    model = Subtopic
    extra = 0
    fields = ["name", "content", "order_index"]
    ordering = ["order_index"]


class CourseInstructorInline(admin.TabularInline):
    model = CourseInstructor
    extra = 1
    fields = ["instructor", "created_at", "updated_at"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["name", "short_code", "category", "created_at", "updated_at"]
    list_filter = ["category", "created_at", "updated_at"]
    search_fields = ["name", "short_code"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "name",
        "short_code",
        "category",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["category", "-created_at"]
    inlines = [TopicInline, CourseInstructorInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["name", "course", "order_index", "created_at"]
    list_filter = ["course", "created_at"]
    search_fields = ["name", "course__name"]
    readonly_fields = ["id", "created_at"]
    fields = ["name", "course", "order_index", "id", "created_at"]
    ordering = ["course", "order_index"]
    inlines = [SubtopicInline]


@admin.register(Subtopic)
class SubtopicAdmin(admin.ModelAdmin):
    list_display = ["name", "topic", "order_index", "created_at"]
    list_filter = ["topic__course", "topic", "created_at"]
    search_fields = ["name", "topic__name", "topic__course__name"]
    readonly_fields = ["id", "created_at"]
    fields = ["name", "topic", "content", "order_index", "id", "created_at"]
    ordering = ["topic", "order_index"]


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ["title", "sub_topic", "created_at", "updated_at"]
    list_filter = ["sub_topic__topic__course", "sub_topic__topic", "created_at"]
    search_fields = ["title", "sub_topic__name", "sub_topic__topic__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "title",
        "sub_topic",
        "video_link",
        "ai_context",
        "id",
        "created_at",
        "updated_at",
    ]
    ordering = ["sub_topic", "created_at"]


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
        ("Associations", {"fields": ["course", "topic", "subtopic"]}),
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
    list_display = ["content_preview", "user", "sub_topic", "created_at", "updated_at"]
    list_filter = ["sub_topic__topic__course", "sub_topic__topic", "user", "created_at"]
    search_fields = [
        "content",
        "user__username",
        "user__email",
        "sub_topic__name",
        "sub_topic__topic__name",
    ]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = ["content", "user", "sub_topic", "id", "created_at", "updated_at"]
    ordering = ["sub_topic", "user", "created_at"]

    def content_preview(self, obj):
        return obj.content[:30] + "..." if len(obj.content) > 30 else obj.content

    content_preview.short_description = "Content"


@admin.register(CourseInstructor)
class CourseInstructorAdmin(admin.ModelAdmin):
    list_display = ["course", "instructor", "created_at", "updated_at"]
    list_filter = ["course", "instructor", "created_at"]
    search_fields = ["course__name", "instructor__email", "instructor__username"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = ["course", "instructor", "id", "created_at", "updated_at"]
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
            {"fields": ["user", "question", "course", "topic", "status"]},
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


@admin.register(UserCourseProgress)
class UserCourseProgressAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "course_name",
        "topic_name",
        "subtopic_name",
        "progress_percent",
        "is_completed",
        "is_current_subtopic",
        "last_accessed",
    ]
    list_filter = [
        "is_completed",
        "is_current_subtopic",
        "is_videos_watched",
        "is_quiz_completed",
        "is_coding_completed",
        "course",
        "topic",
        "created_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "course__name",
        "topic__name",
        "subtopic__name",
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
            {"fields": ["user", "course", "topic", "subtopic", "is_current_subtopic"]},
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

    def course_name(self, obj):
        return obj.course.name if obj.course else "N/A"

    course_name.short_description = "Course"
    course_name.admin_order_field = "course__name"

    def topic_name(self, obj):
        return obj.topic.name if obj.topic else "N/A"

    topic_name.short_description = "Topic"
    topic_name.admin_order_field = "topic__name"

    def subtopic_name(self, obj):
        return obj.subtopic.name if obj.subtopic else "N/A"

    subtopic_name.short_description = "Subtopic"
    subtopic_name.admin_order_field = "subtopic__name"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("user", "course", "topic", "subtopic")
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
        """Mark selected subtopics as current for their users"""
        # First, unmark all current subtopics for the affected users
        user_ids = queryset.values_list("user_id", flat=True).distinct()
        UserCourseProgress.objects.filter(
            user_id__in=user_ids, is_current_subtopic=True
        ).update(is_current_subtopic=False)

        # Then mark the selected ones as current
        updated_count = queryset.update(is_current_subtopic=True)

        self.message_user(
            request, f"Successfully marked {updated_count} subtopics as current."
        )

    mark_as_current.short_description = "Mark as current subtopic"

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
