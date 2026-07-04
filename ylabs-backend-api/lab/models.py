import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class BaseTimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class BaseTimestampedAdminModel(BaseTimestampedModel):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_%(class)s_set",
        help_text="User who created this record",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class ProgrammingLanguage(models.TextChoices):
    C = "C", "C"
    CPP = "C++", "C++"
    PYTHON = "PYTHON", "Python"
    JAVA = "JAVA", "Java"
    SQL = "SQL", "SQL"
    BASH = "BASH", "Bash"
    JAVASCRIPT = "JAVASCRIPT", "JavaScript"
    TYPESCRIPT = "TYPESCRIPT", "TypeScript"


class Difficulty(models.TextChoices):
    EASY = "EASY", "Easy"
    MEDIUM = "MEDIUM", "Medium"
    HARD = "HARD", "Hard"


class LabType(models.TextChoices):
    DATABASE = "DATABASE", "Database"
    BACKEND = "BACKEND", "Backend"
    FRONTEND = "FRONTEND", "Frontend"
    FULL_STACK = "FULL_STACK", "Full Stack"
    QUALITY_ASSURANCE = "QUALITY_ASSURANCE", "Quality Assurance"
    DEVOPS = "DEVOPS", "DevOps"
    AI = "AI", "AI"


class TicketProgressStatus(models.TextChoices):
    BACKLOG = "backlog", "Backlog"
    IN_PROGRESS = "in_progress", "In Progress"
    IN_REVIEW = "in_review", "In Review"
    DONE = "done", "Done"


class Lab(BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=40, choices=LabType.choices, default=LabType.BACKEND)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    prerequisites = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    git_repo_starter_url = models.URLField(blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.EASY)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class LabSprint(BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_index = models.PositiveIntegerField(default=0)
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="sprints")

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return f"{self.lab.title} - {self.title}"


class LabSprintTicket(BaseTimestampedAdminModel):
    sprint = models.ForeignKey(LabSprint, on_delete=models.CASCADE, related_name="tasks")
    ticket_slug = models.CharField(max_length=32)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.EASY)
    learning_objectives = models.JSONField(default=list, blank=True)
    tasks = models.JSONField(default=list, blank=True)
    common_mistakes = models.JSONField(default=list, blank=True)
    hints = models.JSONField(default=list, blank=True)
    scoring_rules = models.JSONField(default=dict, blank=True)
    solution = models.JSONField(default=dict, blank=True)
    yuvro_points = models.PositiveIntegerField(default=5)
    minutes_max = models.PositiveIntegerField(default=30)
    accepted_programming_languages = models.JSONField(default=list, blank=True)
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return self.title


class UserLabEnrollment(BaseTimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_enrollments")
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="enrollments")

    class Meta:
        unique_together = ("user", "lab")

    def __str__(self):
        return f"{self.user.email} -> {self.lab.title}"


class UserLabSprintTicketSubmission(BaseTimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_ticket_submissions")
    lab_sprint_ticket = models.ForeignKey(LabSprintTicket, on_delete=models.CASCADE, related_name="submissions")
    ticket_status = models.CharField(max_length=20, choices=TicketProgressStatus.choices, default=TicketProgressStatus.BACKLOG)
    solution = models.TextField(blank=True)
    solution_output = models.TextField(blank=True, help_text="Output from the last validation run (stdout/stderr, test results)")
    feedback = models.TextField(blank=True, help_text="Manual feedback from an instructor or system hints")
    yuvro_points = models.PositiveIntegerField(default=0)
    minutes_solved = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "lab_sprint_ticket")

    def __str__(self):
        return f"{self.user.email} -> {self.lab_sprint_ticket.title}"
