from django.contrib import admin

from .models import (
    Evaluation,
    EvaluationSection,
    LabQuestionBank,
    LabQuestionBankTask,
    UserEvaluationSubmission,
    VitarkaAIInterviewQuestionBank,
)


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ("title", "domain", "experience_level", "is_public", "is_published", "maximum_attempts", "expiry_datetime", "created_at")
    list_filter = ("domain", "experience_level", "is_public", "is_published")
    search_fields = ("title", "description")
    ordering = ("-created_at",)


@admin.register(EvaluationSection)
class EvaluationSectionAdmin(admin.ModelAdmin):
    list_display = ("title", "evaluation", "type", "order_index", "created_at")
    list_filter = ("type", "evaluation")
    search_fields = ("title", "evaluation__title")
    ordering = ("evaluation", "order_index")


@admin.register(UserEvaluationSubmission)
class UserEvaluationSubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "evaluation", "discussion_mode", "duration", "created_at")
    list_filter = ("discussion_mode", "evaluation")
    search_fields = ("user__email", "evaluation__title")
    ordering = ("-created_at",)


@admin.register(LabQuestionBank)
class LabQuestionBankAdmin(admin.ModelAdmin):
    list_display = ("title", "domain", "experience", "difficulty", "scenario", "marks", "duration_minutes")
    list_filter = ("domain", "experience", "difficulty", "scenario")
    search_fields = ("title", "description")
    ordering = ("-created_at",)


@admin.register(LabQuestionBankTask)
class LabQuestionBankTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "lab_question_bank", "difficulty", "marks", "duration_minutes", "order_index")
    list_filter = ("difficulty", "lab_question_bank")
    search_fields = ("title", "description")
    ordering = ("lab_question_bank", "order_index")


@admin.register(VitarkaAIInterviewQuestionBank)
class VitarkaAIInterviewQuestionBankAdmin(admin.ModelAdmin):
    list_display = ("title", "domain", "experience", "difficulty", "marks", "duration_minutes")
    list_filter = ("domain", "experience", "difficulty")
    search_fields = ("title", "description")
    ordering = ("-created_at",)
