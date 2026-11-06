import uuid
from decimal import Decimal
from django.db import models, transaction
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

    products = models.JSONField(
        default=list, blank=True, help_text="Associated products e.g. ['ycode', 'ylabs', 'ycampus']"
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


class CandidateMockInterviewQuota(BaseTimestampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="mock_interview_quota"
    )
    free_interviews = models.IntegerField(
        default=3, help_text="Initial free mock interviews granted"
    )
    purchased_interviews = models.IntegerField(
        default=0, help_text="Total mock interviews purchased"
    )
    used_interviews = models.IntegerField(
        default=0, help_text="Total mock interviews consumed"
    )

    class Meta:
        verbose_name = "Candidate Mock Interview Quota"
        verbose_name_plural = "Candidate Mock Interview Quotas"

    @property
    def total_granted(self) -> int:
        return self.free_interviews + self.purchased_interviews

    @property
    def available_interviews(self) -> int:
        return max(0, (self.free_interviews + self.purchased_interviews) - self.used_interviews)

    @classmethod
    def get_or_create_quota(cls, user):
        with transaction.atomic():
            quota, created = cls.objects.select_for_update().get_or_create(
                user=user,
                defaults={
                    "free_interviews": 3,
                    "purchased_interviews": 0,
                    "used_interviews": 0,
                },
            )
            if created:
                MockInterviewCreditLedger.objects.create(
                    user=user,
                    quota=quota,
                    entry_type=MockInterviewCreditLedger.TYPE_INITIAL_GRANT,
                    delta=3,
                    balance_after=3,
                    description="Initial welcome grant: 3 free mock interviews",
                )
            return quota

    def __str__(self):
        return f"{self.user.username} - Available: {self.available_interviews} (Free: {self.free_interviews}, Purchased: {self.purchased_interviews}, Used: {self.used_interviews})"


class MockInterviewPack(BaseTimestampedModel):
    id = models.CharField(
        max_length=50, primary_key=True, help_text="Pack identifier e.g. mock_pack_1, mock_pack_5, mock_pack_10"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    interviews_count = models.IntegerField(help_text="Number of mock interviews granted")
    price_inr = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"), help_text="Price in INR"
    )
    price_paise = models.PositiveIntegerField(
        default=0, help_text="Price in integer paise for payment gateways (e.g. 9900 for ₹99)"
    )
    badge = models.CharField(max_length=50, blank=True, help_text="UI badge like 'Popular' or 'Best Value'")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "price_inr"]

    def __str__(self):
        return f"{self.name} ({self.interviews_count} interviews - ₹{self.price_inr})"


class MockInterviewCreditLedger(BaseTimestampedModel):
    TYPE_INITIAL_GRANT = "initial_grant"
    TYPE_PURCHASE = "purchase"
    TYPE_CONSUME = "consume"
    TYPE_REFUND = "refund"
    TYPE_ADMIN_ADJUSTMENT = "admin_adjustment"

    TYPE_CHOICES = [
        (TYPE_INITIAL_GRANT, "Initial Grant"),
        (TYPE_PURCHASE, "Purchase"),
        (TYPE_CONSUME, "Consume"),
        (TYPE_REFUND, "Refund"),
        (TYPE_ADMIN_ADJUSTMENT, "Admin Adjustment"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mock_interview_ledger_entries")
    quota = models.ForeignKey(CandidateMockInterviewQuota, on_delete=models.CASCADE, related_name="ledger_entries")
    entry_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    delta = models.IntegerField(help_text="Change in available interviews (+3, -1, +5, etc.)")
    balance_after = models.IntegerField(help_text="Available balance after this transaction")
    submission = models.ForeignKey(
        'MockInterviewSubmission', on_delete=models.SET_NULL, null=True, blank=True, related_name="credit_entries"
    )
    payment = models.ForeignKey(
        'payment.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name="mock_interview_ledger_entries"
    )
    description = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} | {self.entry_type} | delta: {self.delta} | balance: {self.balance_after}"


DEFAULT_MOCK_PACKS = [
    {
        "id": "mock_pack_1",
        "name": "1 Mock Interview",
        "description": "1 AI-led Mock Interview session with real-time adaptive questioning, dynamic evaluation, and comprehensive analytics report.",
        "interviews_count": 1,
        "price_inr": Decimal("99.00"),
        "price_paise": 9900,
        "badge": "",
        "sort_order": 1,
    },
    {
        "id": "mock_pack_5",
        "name": "5 Mock Interviews",
        "description": "5 AI-led Mock Interview sessions with real-time adaptive questioning, dynamic evaluation, and comprehensive analytics reports.",
        "interviews_count": 5,
        "price_inr": Decimal("399.00"),
        "price_paise": 39900,
        "badge": "Popular",
        "sort_order": 2,
    },
    {
        "id": "mock_pack_10",
        "name": "10 Mock Interviews",
        "description": "10 AI-led Mock Interview sessions with real-time adaptive questioning, dynamic evaluation, and comprehensive analytics reports.",
        "interviews_count": 10,
        "price_inr": Decimal("700.00"),
        "price_paise": 70000,
        "badge": "Best Value",
        "sort_order": 3,
    },
]
