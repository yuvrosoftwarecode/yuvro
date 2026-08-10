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
        max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.FRESHER
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
    proctoring_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Proctoring rules for this section (e.g. webcam, screen_share, tab_switch_limit)",
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
    general_events = models.JSONField(
        default=list,
        blank=True,
        help_text="General submission events: session start/end, navigation, browser info, etc.",
    )
    proctoring_events = models.JSONField(
        default=list,
        blank=True,
        help_text="Proctoring events: camera/mic status, face detection, violations, etc.",
    )
    browser_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    proctoring_passed = models.BooleanField(default=True)
    anomalies_detected = models.JSONField(default=list, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

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
        max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.FRESHER
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
    startup_command = models.TextField(
        blank=True, 
        help_text="Command to run when the lab starts (e.g., 'cd project && npm run dev')"
    )

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

class UserLabQuestionBankSubmission(BaseTimestampedModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="evaluation_lab_submissions"
    )
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.CASCADE, related_name="lab_submissions"
    )
    lab_question = models.ForeignKey(
        LabQuestionBank, on_delete=models.CASCADE, related_name="submissions"
    )
    status = models.CharField(max_length=20, default="BACKLOG")
    solution = models.TextField(blank=True) # Stores the git diff patch
    solution_output = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    score = models.PositiveIntegerField(default=0)
    minutes_solved = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "evaluation", "lab_question")

    def __str__(self):
        return f"{self.user} -> {self.task.title} ({self.evaluation.title})"


class FollowUpConfig(BaseTimestampedAdminModel):
    evaluation = models.OneToOneField(Evaluation, on_delete=models.CASCADE, related_name="followup_config")
    start_date = models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=100, default="UTC")
    smart_followups = models.BooleanField(default=True)
    reminder1 = models.CharField(max_length=100, blank=True)
    reminder1_custom_time = models.DateTimeField(null=True, blank=True)
    reminder2 = models.CharField(max_length=100, blank=True)
    reminder2_custom_time = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"FollowUpConfig for {self.evaluation.title}"


class FollowUpCandidate(BaseTimestampedAdminModel):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="followup_candidates")
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    
    reminder1_sent = models.BooleanField(default=False)
    reminder2_sent = models.BooleanField(default=False)
    
    followups_enabled = models.BooleanField(default=True)
    emails_sent_count = models.PositiveIntegerField(default=0)
    has_submitted = models.BooleanField(default=False)
    activity = models.CharField(max_length=100, default="No Action")
    timeline = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ("evaluation", "email")

    def __str__(self):
        return f"{self.name} - {self.evaluation.title}"
        return f"{self.user} -> {self.lab_question.title} ({self.evaluation.title})"

class UserKnowledgeAssessmentSubmission(BaseTimestampedModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="knowledge_assessment_submissions"
    )
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.CASCADE, related_name="knowledge_submissions"
    )
    section = models.ForeignKey(
        EvaluationSection, on_delete=models.CASCADE, related_name="knowledge_submissions"
    )
    
    # JSON schema for answers:
    # [
    #   {
    #     "question_text": "...",
    #     "candidate_answer": "...",
    #     "correct_answer": "...",
    #     "explanation": "...",
    #     "is_correct": true,
    #     "time_taken_seconds": 36,
    #     "difficulty": "EASY"
    #   }, ...
    # ]
    answers = models.JSONField(default=list, blank=True)
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "evaluation", "section")

    def __str__(self):
        return f"{self.user} -> {self.section.title} ({self.evaluation.title})"
