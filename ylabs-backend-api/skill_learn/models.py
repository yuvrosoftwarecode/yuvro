from django.conf import settings
from django.db import models

from core.models import (
    BaseTimestampedAdminModel,
    BaseTimestampedModel,
    Difficulty,
    LabType,
)

User = settings.AUTH_USER_MODEL


class ProgrammingEditorType(models.TextChoices):
    CODE_EDITOR = "CODE_EDITOR", "Code Editor"
    SQL = "SQL", "SQL"
    TERMINAL = "TERMINAL", "Terminal"
    MARKDOWN = "MARKDOWN", "Markdown"


class TicketProgressStatus(models.TextChoices):
    BACKLOG = "backlog", "Backlog"
    IN_PROGRESS = "in_progress", "In Progress"
    IN_REVIEW = "in_review", "In Review"
    DONE = "done", "Done"


class Lab(BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=40, choices=LabType.choices, default=LabType.BACKEND_PYTHON)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    prerequisites = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    git_repo_starter_url = models.URLField(blank=True)
    programming_languages = models.JSONField(default=list, blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.EASY)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class LabSprint(BaseTimestampedAdminModel):
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="sprints")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return f"{self.lab.title} — {self.title}"


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
    editor_type = models.CharField(
        max_length=16, choices=ProgrammingEditorType.choices, default=ProgrammingEditorType.CODE_EDITOR
    )
    accepted_programming_languages = models.JSONField(default=list, blank=True)
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return self.title


class UserLabEnrollment(BaseTimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lab_enrollments")
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="enrollments")
    github_repo_name = models.CharField(max_length=255, blank=True)
    github_repo_url = models.URLField(blank=True)
    default_branch = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ("user", "lab")

    def __str__(self):
        return f"{self.user} → {self.lab.title}"


class UserLabSprintTicketSubmission(BaseTimestampedModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="lab_ticket_submissions"
    )
    lab_sprint_ticket = models.ForeignKey(
        LabSprintTicket, on_delete=models.CASCADE, related_name="submissions"
    )
    ticket_status = models.CharField(
        max_length=20,
        choices=TicketProgressStatus.choices,
        default=TicketProgressStatus.BACKLOG,
    )
    solution = models.TextField(blank=True)
    solution_output = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    yuvro_points = models.PositiveIntegerField(default=0)
    minutes_solved = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "lab_sprint_ticket")

    def __str__(self):
        return f"{self.user} → {self.lab_sprint_ticket.title}"


class UserGitHubIntegration(BaseTimestampedModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="github_integration",
    )
    github_username = models.CharField(max_length=255)
    github_repo = models.CharField(max_length=255)
    pat_encrypted = models.TextField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user} → github.com/{self.github_username}/{self.github_repo}"

    @staticmethod
    def _fernet():
        import base64
        import hashlib

        from cryptography.fernet import Fernet
        from django.conf import settings

        raw = settings.SECRET_KEY.encode()
        key = base64.urlsafe_b64encode(hashlib.sha256(raw).digest())
        return Fernet(key)

    def set_pat(self, pat: str) -> None:
        self.pat_encrypted = self._fernet().encrypt(pat.encode()).decode()

    def get_pat(self) -> str:
        return self._fernet().decrypt(self.pat_encrypted.encode()).decode()
