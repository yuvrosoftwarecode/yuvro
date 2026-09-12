from django.contrib import admin
from django.apps import apps
from .models import (
    Evaluation,
    EvaluationSection,
    LabQuestionBank,
    LabQuestionBankTask,
    UserEvaluationSubmission,
    VitarkaAIInterviewQuestionBank,
    CandidateNote,
    CandidateTimelineEvent,
    UserLabQuestionBankSubmission,
    UserKnowledgeAssessmentSubmission,
    FollowUpConfig,
    FollowUpCandidate,
)

@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = [f.name for f in Evaluation._meta.fields]
    list_filter = ("domain", "experience_level", "status", "is_public", "is_published")
    search_fields = ("title", "description")
    ordering = ("-created_at",)

@admin.register(EvaluationSection)
class EvaluationSectionAdmin(admin.ModelAdmin):
    list_display = [f.name for f in EvaluationSection._meta.fields]
    list_filter = ("type", "evaluation")
    search_fields = ("title", "evaluation__title")
    ordering = ("evaluation", "order_index")

@admin.register(UserEvaluationSubmission)
class UserEvaluationSubmissionAdmin(admin.ModelAdmin):
    list_display = [f.name for f in UserEvaluationSubmission._meta.fields]
    list_filter = ("discussion_mode", "evaluation")
    search_fields = ("user__email", "evaluation__title")
    ordering = ("-created_at",)

@admin.register(LabQuestionBank)
class LabQuestionBankAdmin(admin.ModelAdmin):
    list_display = [f.name for f in LabQuestionBank._meta.fields]
    list_filter = ("domain", "experience", "difficulty", "scenario")
    search_fields = ("title", "description")
    ordering = ("-created_at",)

@admin.register(LabQuestionBankTask)
class LabQuestionBankTaskAdmin(admin.ModelAdmin):
    list_display = [f.name for f in LabQuestionBankTask._meta.fields]
    list_filter = ("difficulty", "lab_question_bank")
    search_fields = ("title", "description")
    ordering = ("lab_question_bank", "order_index")

@admin.register(VitarkaAIInterviewQuestionBank)
class VitarkaAIInterviewQuestionBankAdmin(admin.ModelAdmin):
    list_display = [f.name for f in VitarkaAIInterviewQuestionBank._meta.fields]
    list_filter = ("domain", "experience", "difficulty")
    search_fields = ("title", "description")
    ordering = ("-created_at",)

@admin.register(CandidateNote)
class CandidateNoteAdmin(admin.ModelAdmin):
    list_display = [f.name for f in CandidateNote._meta.fields]
    list_filter = ("priority", "is_internal", "evaluation")
    search_fields = ("candidate_email", "evaluation__title", "author__email", "text")
    ordering = ("-created_at",)

@admin.register(CandidateTimelineEvent)
class CandidateTimelineEventAdmin(admin.ModelAdmin):
    list_display = [f.name for f in CandidateTimelineEvent._meta.fields]
    list_filter = ("status", "evaluation")
    search_fields = ("title", "candidate_email", "evaluation__title")
    ordering = ("-occurred_at",)

@admin.register(UserLabQuestionBankSubmission)
class UserLabQuestionBankSubmissionAdmin(admin.ModelAdmin):
    list_display = [f.name for f in UserLabQuestionBankSubmission._meta.fields]

@admin.register(UserKnowledgeAssessmentSubmission)
class UserKnowledgeAssessmentSubmissionAdmin(admin.ModelAdmin):
    list_display = [f.name for f in UserKnowledgeAssessmentSubmission._meta.fields]

@admin.register(FollowUpConfig)
class FollowUpConfigAdmin(admin.ModelAdmin):
    list_display = [f.name for f in FollowUpConfig._meta.fields]

@admin.register(FollowUpCandidate)
class FollowUpCandidateAdmin(admin.ModelAdmin):
    list_display = [f.name for f in FollowUpCandidate._meta.fields]
