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
    SYSTEM_DESIGN = "SYSTEM_DESIGN", "System Design"


class TicketProgressStatus(models.TextChoices):
    BACKLOG = "backlog", "Backlog"
    IN_PROGRESS = "in_progress", "In Progress"
    IN_REVIEW = "in_review", "In Review"
    DONE = "done", "Done"


class PaymentTier(models.TextChoices):
    FREE = "free", "Free"
    FREEMIUM = "freemium", "Freemium"
    PREMIUM = "premium", "Premium"


class LabStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    DRAFT = "draft", "Draft"
    UPCOMING = "upcoming", "Upcoming"


class Lab(BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=40, choices=LabType.choices, default=LabType.BACKEND)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    prerequisites = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    git_repo_starter_url = models.URLField(blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.EASY)
    status = models.CharField(max_length=20, choices=LabStatus.choices, default=LabStatus.ACTIVE)
    payment_tier = models.CharField(max_length=20, choices=PaymentTier.choices, default=PaymentTier.FREE)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    @property
    def is_active(self):
        return self.status == LabStatus.ACTIVE

    @is_active.setter
    def is_active(self, value):
        self.status = LabStatus.ACTIVE if value else LabStatus.INACTIVE

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        if self.payment_tier == PaymentTier.FREE:
            self.payment_amount = 0
        elif self.payment_tier in [PaymentTier.FREEMIUM, PaymentTier.PREMIUM] and self.payment_amount <= 0:
            raise ValidationError({'payment_amount': f'Payment amount is required and must be greater than 0 for {self.payment_tier}.'})

    def save(self, *args, **kwargs):
        self.clean()
        is_new = self.pk is None

        super().save(*args, **kwargs)
        
        if not is_new:
            if self.payment_tier in [PaymentTier.FREE, PaymentTier.PREMIUM]:
                locked = (self.payment_tier == PaymentTier.PREMIUM)
                for sprint in self.sprints.all():
                    if sprint.is_locked != locked:
                        sprint.is_locked = locked
                        sprint.save(update_fields=['is_locked'])
            elif self.payment_tier == PaymentTier.FREEMIUM:
                sprints = list(self.sprints.all().order_by('order_index'))
                for i, sprint in enumerate(sprints):
                    locked = (i > 0)
                    if sprint.is_locked != locked:
                        sprint.is_locked = locked
                        sprint.save(update_fields=['is_locked'])

    def __str__(self):
        return self.title


class LabSprint(BaseTimestampedAdminModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_index = models.PositiveIntegerField(default=0)
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="sprints")
    is_locked = models.BooleanField(default=False)

    class Meta:
        ordering = ["order_index"]

    def save(self, *args, **kwargs):
        if self.lab_id:
            if self.pk is None:
                super().save(*args, **kwargs)
                is_new = True
            else:
                is_new = False
            
            sprints = list(self.lab.sprints.all().order_by('order_index'))
            try:
                i = sprints.index(self)
            except ValueError:
                i = len(sprints)
                
            if self.lab.payment_tier == PaymentTier.PREMIUM:
                self.is_locked = True
            elif self.lab.payment_tier == PaymentTier.FREE:
                self.is_locked = False
            elif is_new:
                self.is_locked = (i > 0)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lab.title} - {self.title}"


class LabSprintTicket(BaseTimestampedAdminModel):
    sprint = models.ForeignKey(LabSprint, on_delete=models.CASCADE, related_name="tasks")
    ticket_slug = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.EASY)
    learning_objectives = models.JSONField(default=list, blank=True)
    tasks = models.JSONField(default=list, blank=True)
    common_mistakes = models.JSONField(default=list, blank=True)
    hints = models.JSONField(default=list, blank=True)
    scoring_rules = models.JSONField(default=dict, blank=True)
    solution = models.JSONField(default=dict, blank=True)
    system_design = models.JSONField(
        default=dict,
        blank=True,
        help_text="Single JSON containing all tabs: nodes, edges, seq, schema, apis, and notes"
    )
    test_command = models.TextField(
        blank=True,
        default="",
        help_text="Command to run scoring tests (e.g., 'python yuvro_scoring_rules/main_test.py')"
    )
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
    github_repo_name = models.CharField(max_length=255, blank=True)
    github_repo_url = models.URLField(blank=True)
    default_branch = models.CharField(max_length=100, blank=True)
    is_unlocked = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "lab")

    def __str__(self):
        return f"{self.user.email} -> {self.lab.title}"


class UserLabSprintTicketSubmission(BaseTimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_ticket_submissions")
    lab_sprint_ticket = models.ForeignKey(LabSprintTicket, on_delete=models.CASCADE, related_name="submissions")
    ticket_status = models.CharField(max_length=20, choices=TicketProgressStatus.choices, default=TicketProgressStatus.BACKLOG)
    solution = models.TextField(blank=True)
    system_design = models.JSONField(
        default=dict,
        blank=True,
        help_text="User's system design work containing nodes, edges, seq, schema, apis, and notes"
    )
    solution_output = models.TextField(blank=True, help_text="Output from the last validation run (stdout/stderr, test results)")
    feedback = models.TextField(blank=True, help_text="Manual feedback from an instructor or system hints")
    yuvro_points = models.PositiveIntegerField(default=0)
    minutes_solved = models.PositiveIntegerField(default=0)
    hint_penalty_applied = models.BooleanField(default=False)
    solution_revealed = models.BooleanField(default=False)
    revealed_hints = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ("user", "lab_sprint_ticket")

    def __str__(self):
        return f"{self.user.email} -> {self.lab_sprint_ticket.title}"


class UserLabActivity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_activities")
    date = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "date")

    def __str__(self):
        return f"{self.user.email} -> {self.date}"


class SystemDesign(BaseTimestampedModel):
    """
    Stores a system design across all tabs in a single JSON structure:
    nodes, edges, seq, schema, apis, and notes.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="system_designs")
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    lab = models.ForeignKey(Lab, on_delete=models.SET_NULL, null=True, blank=True, related_name="system_designs")
    ticket = models.ForeignKey(LabSprintTicket, on_delete=models.SET_NULL, null=True, blank=True, related_name="system_designs")
    design = models.JSONField(
        default=dict,
        help_text="Single JSON containing all tabs: nodes, edges, seq, schema, apis, and notes"
    )
    is_template = models.BooleanField(default=False, help_text="Whether this design is an official starter or reference template")
    is_submitted = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title or 'System Design'} ({self.user.email})"

