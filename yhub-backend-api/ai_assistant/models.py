import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class AIAgent(models.Model):


    PROVIDER_CHOICES = [
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
        ("gemini", "Google Gemini"),
        ("deepseek", "DeepSeek"),
        ("cohere", "Cohere"),
        ("huggingface", "Hugging Face"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    model_name = models.CharField(max_length=100)  
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
    )  
    context = models.JSONField(default=dict, blank=True)  
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Chat {self.id} - {self.user.username} with {self.ai_agent.name}"

    def save(self, *args, **kwargs):
        if not self.title and not self.pk:
            self.title = f"Chat with {self.ai_agent.name}"
        super().save(*args, **kwargs)


class ChatMessage(models.Model):


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
    )  
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
    
    state_data = models.JSONField(
        default=dict, 
        blank=True, 
        help_text='{"current_main_index": int, "current_node_id": UUID, "planned_questions": [UUIDs]}'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Interview: {self.role_title} - {self.user.username}"


class InterviewReport(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interview_session = models.OneToOneField(
        InterviewSession, on_delete=models.CASCADE, related_name="report"
    )
    overall_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    feedback_summary = models.TextField(blank=True, null=True)
    
    performance_metrics = models.JSONField(default=dict)
    
    skill_analysis = models.JSONField(default=dict)
    
    question_analysis = models.JSONField(default=list)
    
    key_takeaways = models.JSONField(default=dict)
    
    meta_stats = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report for {self.interview_session}"
