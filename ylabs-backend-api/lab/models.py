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

    def score_submission(self):
        import re
        ticket = self.lab_sprint_ticket
        scoring_rules = ticket.scoring_rules or {}
        expected_solution = ticket.solution or {}
        
        logic_score_weight = scoring_rules.get("logic_score", 100) / 100.0
        # More weights could be used here (e.g. clean_code, visual_accuracy)
        
        expected_query = expected_solution.get("query.sql", "").strip()
        user_query = self.solution.strip()
        
        def normalize_str(s):
            # remove single-line comments for sql
            s = re.sub(r'--.*', '', s)
            # normalize spaces
            s = re.sub(r'\s+', ' ', s).strip().lower()
            # remove spaces around parentheses, commas, and semicolons to be more lenient
            s = re.sub(r'\s*\(\s*', '(', s)
            s = re.sub(r'\s*\)\s*', ')', s)
            s = re.sub(r'\s*,\s*', ',', s)
            s = re.sub(r'\s*;\s*', ';', s)
            return s

        norm_expected = normalize_str(expected_query)
        norm_user = normalize_str(user_query)
        
        # Check if the expected logic is contained within the user's query
        # This allows users to add things like DROP TABLE before their CREATE TABLE
        query_matches = (norm_expected in norm_user)
        
        # Result pattern matching
        expected_output = expected_solution.get("expected_output", "")
        output_matches = True
        
        # Check for common execution errors
        if "Error:" in self.solution_output or "Parse error" in self.solution_output or re.search(r"exit code [^0]", self.solution_output) or "Traceback" in self.solution_output:
            output_matches = False

        if expected_output and output_matches:
            try:
                if not re.search(expected_output, self.solution_output, re.IGNORECASE) and expected_output not in self.solution_output:
                    output_matches = False
            except re.error:
                if expected_output not in self.solution_output:
                    output_matches = False

        # If both query_matches and output_matches are evaluated
        # We can determine the earned percentage
        earned_percentage = 0.0
        if query_matches and output_matches:
            earned_percentage = 1.0
        elif query_matches or (expected_output and output_matches):
            earned_percentage = 0.5
            
        final_score_pct = logic_score_weight * earned_percentage
        
        total_points = int(ticket.yuvro_points * final_score_pct)
        self.yuvro_points = total_points
        
        if total_points >= ticket.yuvro_points and ticket.yuvro_points > 0:
            self.ticket_status = TicketProgressStatus.DONE
        elif total_points > 0:
            self.ticket_status = TicketProgressStatus.IN_REVIEW
            
        return total_points


# ---------------------------------------------------------------------------
# GitHub Integration
# ---------------------------------------------------------------------------

class UserGitHubIntegration(BaseTimestampedModel):
    """Stores a student's GitHub connection (PAT encrypted with Django SECRET_KEY)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="github_integration",
    )
    github_username = models.CharField(max_length=255)
    github_repo = models.CharField(max_length=255, help_text="e.g. my-labs-repo")
    # PAT stored as base64-encoded Fernet-encrypted bytes
    pat_encrypted = models.TextField(help_text="Fernet-encrypted Personal Access Token")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} → github.com/{self.github_username}/{self.github_repo}"

    # --- Encryption helpers (uses Django SECRET_KEY) ---

    @staticmethod
    def _fernet():
        import base64, hashlib
        from cryptography.fernet import Fernet
        raw = settings.SECRET_KEY.encode()
        key = base64.urlsafe_b64encode(hashlib.sha256(raw).digest())
        return Fernet(key)

    def set_pat(self, pat: str) -> None:
        """Encrypt and store the PAT."""
        f = self._fernet()
        self.pat_encrypted = f.encrypt(pat.encode()).decode()

    def get_pat(self) -> str:
        """Decrypt and return the PAT."""
        f = self._fernet()
        return f.decrypt(self.pat_encrypted.encode()).decode()
