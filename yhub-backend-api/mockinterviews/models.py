import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_%(class)s_set",
        help_text="User who created this record",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class BaseTimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class MockInterview(BaseModel):
    PUBLISH_STATUS_DRAFT = "draft"
    PUBLISH_STATUS_ACTIVE = "active"
    PUBLISH_STATUS_INACTIVE = "inactive"
    PUBLISH_STATUS_ARCHIVED = "archived"
    PUBLISH_STATUS_CHOICES = [
        (PUBLISH_STATUS_DRAFT, "Draft"),
        (PUBLISH_STATUS_ACTIVE, "Active"),
        (PUBLISH_STATUS_INACTIVE, "Inactive"),
        (PUBLISH_STATUS_ARCHIVED, "Archived"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)

    max_duration = models.IntegerField(
        default=30, help_text="Maximum duration in minutes"
    )
    
    interview_mode = models.CharField(
        max_length=20,
        choices=[("automatic", "Automatic"), ("custom", "Custom"), ("hybrid", "Hybrid")],
        default="automatic",
        help_text="The dynamic interview mode"
    )

    required_skills = models.JSONField(
        default=list, blank=True, help_text="List of required skills"
    )
    optional_skills = models.JSONField(
        default=list, blank=True, help_text="List of optional skills"
    )

    publish_status = models.CharField(
        max_length=20, choices=PUBLISH_STATUS_CHOICES, default=PUBLISH_STATUS_DRAFT
    )


    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title}"


class PredefinedInterviewQuestion(BaseModel):
    mock_interview = models.ForeignKey(
        'MockInterview', on_delete=models.CASCADE, related_name="predefined_questions"
    )
    text = models.TextField()
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name="follow_ups"
    )
    level = models.IntegerField(default=1, help_text="1: Main, 2: Follow-up, 3: Deep Follow-up")

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"L{self.level}: {self.text[:50]}"


class BaseUserSubmission(BaseTimestampedModel):
    STATUS_STARTED = "started"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_SUBMITTED = "submitted"
    STATUS_EVALUATED = "evaluated"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_STARTED, "Started"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_EVALUATED, "Evaluated"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="%(class)s_submissions"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_STARTED
    )
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

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
    marks = models.FloatField(null=True, blank=True)

    proctoring_passed = models.BooleanField(default=True)
    anomalies_detected = models.JSONField(default=list, blank=True)

    class Meta:
        abstract = True


class MockInterviewSubmission(BaseUserSubmission):
    EXP_LEVEL_INTERN = "intern"
    EXP_LEVEL_BEGINNER = "beginner"
    EXP_LEVEL_INTERMEDIATE = "1_3_years"
    EXP_LEVEL_EXPERIENCED = "3_plus_years"

    EXP_LEVEL_CHOICES = [
        (EXP_LEVEL_INTERN, "Intern"),
        (EXP_LEVEL_BEGINNER, "Beginner (0-1 years)"),
        (EXP_LEVEL_INTERMEDIATE, "Intermediate (1-3 years)"),
        (EXP_LEVEL_EXPERIENCED, "Experienced (3+ years)"),
    ]

    mock_interview = models.ForeignKey(
        MockInterview,
        on_delete=models.CASCADE,
        related_name="mock_interview_submissions",
        null=True,
        blank=True,
    )
    experience_level = models.CharField(
        max_length=20,
        choices=EXP_LEVEL_CHOICES,
        default=EXP_LEVEL_BEGINNER,
        null=True,
        blank=True,
        help_text="Candidate's self-declared experience level for this interview",
    )
    selected_duration = models.IntegerField(
        null=True,
        blank=True,
        default=0,
        help_text="Duration selected by the user in minutes"
    )

    resume = models.FileField(upload_to="resumes/", null=True, blank=True)
    old_chat_session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID of the chat session in YHub",
    )
    interview_type = models.CharField(
        max_length=20,
        choices=[("predefined", "Predefined"), ("full_ai", "Full AI")],
        default="full_ai"
    )
    state_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="In-progress state data for AI-powered mock interview",
    )
    session_state = models.JSONField(
        default=dict,
        blank=True,
        help_text="Detailed session state snapshot from Dynamic Interview Engine",
    )
    chat_session = models.ForeignKey(
        'ai_assistant.ChatSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mock_interview_submissions"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        title = self.mock_interview.title if self.mock_interview else "JD/Resume AI Mock Interview"
        return f"{self.user.username} - {title} ({self.get_experience_level_display()})"


class UserInterviewProgress(BaseTimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="interview_progress")
    mock_interview = models.ForeignKey('MockInterview', on_delete=models.CASCADE)
    completed_count = models.IntegerField(default=0, help_text="Number of predefined interviews completed in current cycle (0-5)")
    asked_questions = models.JSONField(default=list, help_text="IDs of main questions asked in this cycle")

    class Meta:
        unique_together = ('user', 'mock_interview')

    def __str__(self):
        return f"{self.user.username} - {self.mock_interview.title} - {self.completed_count}"
