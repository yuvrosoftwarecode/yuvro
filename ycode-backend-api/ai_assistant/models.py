import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class AIAgent(models.Model):
    """
    Model representing different AI agents/providers.
    """

    PROVIDER_CHOICES = [
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
        ("gemini", "Google Gemini"),
        ("cohere", "Cohere"),
        ("huggingface", "Hugging Face"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    model_name = models.CharField(max_length=100)  # e.g., gpt-4, claude-3, gemini-pro
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    max_tokens = models.PositiveIntegerField(default=4096)
    temperature = models.FloatField(
        default=0.7, validators=[MinValueValidator(0.0), MaxValueValidator(2.0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["provider", "name"]
        unique_together = ["provider", "model_name"]

    def __str__(self):
        return f"{self.provider} - {self.name}"


class ChatSession(models.Model):
    """
    Model representing a chat session between a user and an AI agent.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="chat_sessions"
    )
    ai_agent = models.ForeignKey(
        AIAgent, on_delete=models.CASCADE, related_name="chat_sessions"
    )
    title = models.CharField(max_length=255, blank=True, null=True)
    page = models.CharField(
        max_length=255, blank=True, null=True
    )  # Page where chat was initiated
    context = models.JSONField(default=dict, blank=True)  # Additional context data
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Chat {self.id} - {self.user.username} with {self.ai_agent.name}"

    def save(self, *args, **kwargs):
        # Auto-generate title from first message if not provided
        if not self.title and not self.pk:
            self.title = f"Chat with {self.ai_agent.name}"
        super().save(*args, **kwargs)


class ChatMessage(models.Model):
    """
    Model representing individual messages in a chat session.
    """

    MESSAGE_TYPE_CHOICES = [
        ("user", "User Message"),
        ("assistant", "Assistant Response"),
        ("system", "System Message"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name="messages"
    )
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(
        default=dict, blank=True
    )  # Store additional data like tokens used, etc.
    tokens_used = models.PositiveIntegerField(null=True, blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    feedback = models.IntegerField(null=True, blank=True)
    feedback_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.message_type} - {self.content[:50]}..."


class AIAgentUsage(models.Model):
    """
    Model to track usage statistics for AI agents.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ai_usage")
    ai_agent = models.ForeignKey(
        AIAgent, on_delete=models.CASCADE, related_name="usage_stats"
    )
    date = models.DateField(auto_now_add=True)
    total_messages = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["user", "ai_agent", "date"]

    def __str__(self):
        return f"{self.user.username} - {self.ai_agent.name} - {self.date}"


class AIAgentConfiguration(models.Model):
    """
    Model to store user-specific configurations for AI agents.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="ai_configurations"
    )
    ai_agent = models.ForeignKey(
        AIAgent, on_delete=models.CASCADE, related_name="user_configurations"
    )
    custom_temperature = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
    )
    custom_max_tokens = models.PositiveIntegerField(null=True, blank=True)
    system_prompt = models.TextField(blank=True, null=True)
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "ai_agent"]

    def __str__(self):
        return f"{self.user.username} config for {self.ai_agent.name}"


class InterviewSession(models.Model):
    """
    Model representing a mock interview session.
    Wraps a ChatSession but adds interview-specific context.
    """

    STATUS_CHOICES = [
        ("started", "Started"),
        ("completed", "Completed"),
        ("abandoned", "Abandoned"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="interview_sessions"
    )
    chat_session = models.OneToOneField(
        ChatSession, on_delete=models.CASCADE, related_name="interview_session"
    )
    role_title = models.CharField(max_length=255)
    role_level = models.CharField(max_length=50, blank=True, null=True)
    difficulty = models.CharField(max_length=50, blank=True, null=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    actual_duration = models.DurationField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="started")
    resume_file = models.FileField(upload_to="resumes/", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Interview: {self.role_title} - {self.user.username}"


class InterviewReport(models.Model):
    """
    Model representing the detailed analysis/report of a completed interview.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interview_session = models.OneToOneField(
        InterviewSession, on_delete=models.CASCADE, related_name="report"
    )
    overall_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    feedback_summary = models.TextField(blank=True, null=True)
    
    # JSON Fields for structured data
    # Structure: { "Communication": 80, "Technical": 70, ... }
    performance_metrics = models.JSONField(default=dict)
    
    # Structure: { "Skill Name": { "score": 8, "feedback": "..." }, ... }
    skill_analysis = models.JSONField(default=dict)
    
    # Structure: [ { "question": "...", "user_answer": "...", "ai_score": 75, "feedback": "...", "ideal_answer": "..." }, ... ]
    question_analysis = models.JSONField(default=list)
    
    # Structure: { "strengths": ["...", ...], "improvements": ["...", ...] }
    key_takeaways = models.JSONField(default=dict)
    
    # Meta stats if needed (time taken, words spoken etc)
    meta_stats = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report for {self.interview_session}"
