from django.conf import settings
from django.db import models

from core.models import (
    BaseTimestampedAdminModel,
    BaseTimestampedModel,
    DeveloperSkill,
    Difficulty,
    ExperienceLevel,
    QuestionDomain,
)

User = settings.AUTH_USER_MODEL


class EvaluationSectionType(models.TextChoices):
    LAB = "LAB", "Lab"
    KNOWLEDGE_ASSESSMENT = "KNOWLEDGE_ASSESSMENT", "Knowledge Assessment"
    VITARKA_AI_INTERVIEW = "VITARKA_AI_INTERVIEW", "Vitarka AI Interview"


class LabScenario(models.TextChoices):
    DEBUGGING = "DEBUGGING", "Debugging"
    FEATURE_DEVELOPMENT = "FEATURE_DEVELOPMENT", "Feature Development"
    API_OPTIMIZATION = "API_OPTIMIZATION", "API Optimization"
    SECURITY = "SECURITY", "Security"
    ARCHITECTURE = "ARCHITECTURE", "Architecture"
    PERFORMANCE = "PERFORMANCE", "Performance"
    TESTING = "TESTING", "Testing"
    PRODUCTION_INCIDENT = "PRODUCTION_INCIDENT", "Production Incident"


class DiscussionMode(models.TextChoices):
    AUTOMATIC = "AUTOMATIC", "Automatic"
    CUSTOM = "CUSTOM", "Custom"
    HYBRID = "HYBRID", "Hybrid"


class Evaluation(BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    domain = models.CharField(
        max_length=20, choices=QuestionDomain.choices, default=QuestionDomain.OTHER
    )
    candidate_invited_emails = models.JSONField(default=list, blank=True)
    experience_level = models.CharField(
        max_length=12, choices=ExperienceLevel.choices, default=ExperienceLevel.FRESHER
    )
    maximum_attempts = models.PositiveIntegerField(default=1)
    expiry_datetime = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class EvaluationSection(BaseTimestampedAdminModel):
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.CASCADE, related_name="sections"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_index = models.PositiveIntegerField(default=0)
    type = models.CharField(
        max_length=30,
        choices=EvaluationSectionType.choices,
        default=EvaluationSectionType.KNOWLEDGE_ASSESSMENT,
    )
    questions = models.JSONField(
        default=list,
        blank=True,
        help_text="Ordered list of QuestionBank UUIDs assigned to this section",
    )

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return f"{self.evaluation.title} — {self.title}"


class UserEvaluationSubmission(BaseTimestampedModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="evaluation_submissions"
    )
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.CASCADE, related_name="submissions"
    )
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    duration = models.PositiveIntegerField(default=0)
    discussion_mode = models.CharField(
        max_length=12,
        choices=DiscussionMode.choices,
        default=DiscussionMode.AUTOMATIC,
    )

    class Meta:
        unique_together = ("user", "evaluation")

    def __str__(self):
        return f"{self.user} — {self.evaluation.title}"


class QuestionBank(DeveloperSkill, BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=10, choices=Difficulty.choices, default=Difficulty.EASY
    )
    domain = models.CharField(
        max_length=20, choices=QuestionDomain.choices, default=QuestionDomain.OTHER
    )
    experience = models.CharField(
        max_length=12, choices=ExperienceLevel.choices, default=ExperienceLevel.FRESHER
    )
    duration_minutes = models.PositiveIntegerField(default=30)
    marks = models.PositiveIntegerField(default=10)

    class Meta:
        abstract = True


class LabQuestionBank(QuestionBank):
    scenario = models.CharField(
        max_length=25,
        choices=LabScenario.choices,
        default=LabScenario.FEATURE_DEVELOPMENT,
    )
    git_repo_starter_url = models.URLField(blank=True)

    def __str__(self):
        return self.title


class LabQuestionBankTask(BaseTimestampedAdminModel):
    lab_question_bank = models.ForeignKey(
        LabQuestionBank, on_delete=models.CASCADE, related_name="tasks"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=10, choices=Difficulty.choices, default=Difficulty.EASY
    )
    scoring_rules = models.JSONField(default=dict, blank=True)
    expected_output = models.JSONField(default=dict, blank=True)
    solution = models.JSONField(default=dict, blank=True)
    marks = models.PositiveIntegerField(default=5)
    duration_minutes = models.PositiveIntegerField(default=30)
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return self.title


class VitarkaAIInterviewQuestionBank(QuestionBank):
    def __str__(self):
        return self.title
