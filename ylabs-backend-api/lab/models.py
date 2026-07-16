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


class PaymentTier(models.TextChoices):
    FREE = "free", "Free"
    FREEMIUM = "freemium", "Freemium"
    PREMIUM = "premium", "Premium"


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
    payment_tier = models.CharField(max_length=20, choices=PaymentTier.choices, default=PaymentTier.FREE)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

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
        
        tier_changed_to_freemium = False
        if not is_new:
            try:
                old_lab = Lab.objects.get(pk=self.pk)
                if old_lab.payment_tier != self.payment_tier and self.payment_tier == PaymentTier.FREEMIUM:
                    tier_changed_to_freemium = True
            except Lab.DoesNotExist:
                pass

        super().save(*args, **kwargs)
        
        if not is_new:
            if self.payment_tier in [PaymentTier.FREE, PaymentTier.PREMIUM]:
                locked = (self.payment_tier == PaymentTier.PREMIUM)
                for sprint in self.sprints.all():
                    if sprint.is_locked != locked:
                        sprint.is_locked = locked
                        sprint.save(update_fields=['is_locked'])
            elif tier_changed_to_freemium:
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
    github_repo_name = models.CharField(max_length=255, blank=True)
    github_repo_url = models.URLField(blank=True)
    default_branch = models.CharField(max_length=100, blank=True)

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

    def score_submission(self):
        import requests
        ticket = self.lab_sprint_ticket
        scoring_rules = ticket.scoring_rules or {}
        expected_solution = ticket.solution or {}
        
        expected_query = expected_solution.get("query.sql", "").strip()
        user_query = self.solution.strip()
        expected_output = expected_solution.get("expected_output", "")
        
        payload = {
            "user_query": user_query,
            "expected_query": expected_query,
            "user_output": self.solution_output,
            "expected_output": expected_output,
            "scoring_rules": scoring_rules
        }
        
        try:
            # Code executer is available at yuvro-code-executer:8009 in docker
            # or localhost:8009 depending on the environment. We'll use the docker compose service name.
            import os
            executer_host = os.environ.get("CODE_EXECUTER_URL", "http://yuvro-code-executer:8009")
            response = requests.post(f"{executer_host}/workspace/evaluate_sql", json=payload, timeout=5)
            if response.status_code == 200:
                eval_data = response.json()
                final_score_pct = eval_data.get("final_score_pct", 0.0)
            else:
                final_score_pct = 0.0
        except requests.RequestException:
            final_score_pct = 0.0
            
        total_points = int(ticket.yuvro_points * final_score_pct)
        self.yuvro_points = total_points
        
        if total_points >= ticket.yuvro_points and ticket.yuvro_points > 0:
            self.ticket_status = TicketProgressStatus.DONE
        elif total_points > 0:
            self.ticket_status = TicketProgressStatus.IN_REVIEW
            
        return total_points

