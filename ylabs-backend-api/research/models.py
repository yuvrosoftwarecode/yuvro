import uuid
from django.conf import settings
from django.db import models


class ResearchTopic(models.Model):
    name = models.CharField(max_length=64, unique=True, db_index=True)
    display_name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    search_query = models.CharField(max_length=255, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.display_name or self.name


class ResearchPaper(models.Model):
    SOURCE_CHOICES = [
        ("Hugging Face", "Hugging Face"),
        ("arXiv", "arXiv"),
        ("OpenAlex", "OpenAlex"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512, db_index=True)
    authors = models.JSONField(default=list)
    abstract = models.TextField()
    published_date = models.DateField(db_index=True)
    source = models.CharField(max_length=32, choices=SOURCE_CHOICES, default="Hugging Face")
    external_id = models.CharField(max_length=128, unique=True, db_index=True)
    paper_url = models.URLField(max_length=512)
    pdf_url = models.URLField(max_length=512, blank=True, null=True)
    github_url = models.URLField(max_length=512, blank=True, null=True)
    upvotes_count = models.IntegerField(default=0, db_index=True)
    alphaxiv_url = models.URLField(max_length=512, blank=True, null=True)
    reddit_search_url = models.URLField(max_length=512, blank=True, null=True)
    hf_discussion_url = models.URLField(max_length=512, blank=True, null=True)
    citations_count = models.IntegerField(default=0, db_index=True)
    primary_topic = models.ForeignKey(
        ResearchTopic,
        on_delete=models.CASCADE,
        related_name="papers",
    )
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-upvotes_count", "-published_date", "-citations_count"]
        indexes = [
            models.Index(fields=["source", "-published_date"]),
            models.Index(fields=["primary_topic", "-published_date"]),
        ]

    def __str__(self):
        return self.title


class PaperSummary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paper = models.OneToOneField(
        ResearchPaper,
        on_delete=models.CASCADE,
        related_name="summary",
    )
    about = models.TextField()
    problem = models.TextField()
    approach = models.TextField()
    results = models.TextField()
    why = models.TextField()
    limits = models.TextField()
    developer_context = models.TextField(blank=True)
    model_used = models.CharField(max_length=64, default="gpt-4o-mini")
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="generated_paper_summaries",
    )
    token_cost = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Summary for {self.paper.title[:50]}"


class UserFollowedTopic(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followed_research_topics",
    )
    topic = models.ForeignKey(
        ResearchTopic,
        on_delete=models.CASCADE,
        related_name="user_followers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "topic")

    def __str__(self):
        return f"{self.user} follows {self.topic.name}"


class UserPaperAccess(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="paper_accesses",
    )
    paper = models.ForeignKey(
        ResearchPaper,
        on_delete=models.CASCADE,
        related_name="user_accesses",
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "paper")

    def __str__(self):
        return f"{self.user} unlocked {self.paper.title[:40]}"


