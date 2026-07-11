import uuid

from django.conf import settings
from django.db import models


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


class TechStack(models.TextChoices):
    JAVA = "JAVA", "Java"
    SQL = "SQL", "SQL"
    PYTHON = "PYTHON", "Python"
    REACTJS = "REACTJS", "ReactJS"
    NODEJS = "NODEJS", "NodeJS"
    DEVOPS = "DEVOPS", "DevOps"
    QUALITY_ASSURANCE = "QUALITY_ASSURANCE", "Quality Assurance"
    JAVASCRIPT = "JAVASCRIPT", "JavaScript"


class Difficulty(models.TextChoices):
    EASY = "EASY", "Easy"
    MEDIUM = "MEDIUM", "Medium"
    HARD = "HARD", "Hard"


class LabType(models.TextChoices):
    DATABASE = "DATABASE", "Database Lab"
    BACKEND_JAVA = "BACKEND_JAVA", "Backend Java"
    BACKEND_PYTHON = "BACKEND_PYTHON", "Backend Python"
    FRONTEND = "FRONTEND", "Frontend"
    QUALITY_ASSURANCE = "QUALITY_ASSURANCE", "QA"
    DEVOPS = "DEVOPS", "DevOps"


class QuestionDomain(models.TextChoices):
    FINANCE = "FINANCE", "Finance"
    EDTECH = "EDTECH", "EdTech"
    RETAIL = "RETAIL", "Retail"
    HEALTHCARE = "HEALTHCARE", "Healthcare"
    INSURANCE = "INSURANCE", "Insurance"
    PAYMENT = "PAYMENT", "Payment"
    SUPPLY_CHAIN = "SUPPLY_CHAIN", "Supply Chain"
    OTHER = "OTHER", "Other"


class ExperienceLevel(models.TextChoices):
    FRESHER = "FRESHER", "Fresher"
    JUNIOR = "JUNIOR", "Junior Software Developer"
    SENIOR = "SENIOR", "Senior Software Developer"
    ARCHITECT = "ARCHITECT", "Architect"
