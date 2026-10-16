import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
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

class Difficulty(models.TextChoices):
    EASY = "EASY", "Easy"
    MEDIUM = "MEDIUM", "Medium"
    HARD = "HARD", "Hard"


class LabType(models.TextChoices):
    DATABASE = "DATABASE", "Database Lab"
    BACKEND = "BACKEND", "Backend"
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
    ERP = "ERP", "ERP"
    OTHER = "OTHER", "Other"

class ExperienceLevel(models.TextChoices):
    INTERN = "INTERN", "Intern"
    FRESHER = "FRESHER", "Fresher"

    JUNIOR = "JUNIOR", "Junior Developer"
    MID_LEVEL = "MID_LEVEL", "Mid-Level Developer"
    SENIOR = "SENIOR", "Senior Developer"

    LEAD = "LEAD", "Lead Developer"

    STAFF_ENGINEER = "STAFF_ENGINEER", "Staff Engineer"
    PRINCIPAL_ENGINEER = "PRINCIPAL_ENGINEER", "Principal Engineer"
    ARCHITECT = "ARCHITECT", "Software Architect"

    ENGINEERING_MANAGER = "MANAGER", "Engineering Manager"
    DIRECTOR_ENGINEERING = "DIRECTOR_ENGINEERING", "Director of Engineering"
    VP_ENGINEERING = "VP_ENGINEERING", "VP of Engineering"
    CTO = "CTO", "Chief Technology Officer"


class ProgrammingEditorType(models.TextChoices):
    CODE_EDITOR = "CODE_EDITOR", "Code Editor"
    SQL_EDITOR = "SQL_EDITOR", "SQL Editor"
    

class ProgrammingLanguage(models.TextChoices):
    C = "C", "C"
    CPP = "C++", "C++"
    PYTHON = "PYTHON", "Python"
    JAVA = "JAVA", "Java"
    SQL = "SQL", "SQL"
    BASH = "BASH", "Bash"
    JAVASCRIPT = "JAVASCRIPT", "JavaScript"
    TYPESCRIPT = "TYPESCRIPT", "TypeScript"


class Database(models.TextChoices):
    SQLITE = "SQLITE", "SQLite"
    POSTGRESQL = "POSTGRESQL", "PostgreSQL"
    MYSQL = "MYSQL", "MySQL"
    MONGODB = "MONGODB", "MongoDB"
    REDIS = "REDIS", "Redis"
    ELASTICSEARCH = "ELASTICSEARCH", "Elasticsearch"


class BackendFramework(models.TextChoices):
    DJANGO = "DJANGO", "Django"
    DJANGO_REST_FRAMEWORK = "DJANGO_REST_FRAMEWORK", "Django REST Framework"
    FASTAPI = "FASTAPI", "FastAPI"
    FLASK = "FLASK", "Flask"
    SPRING_BOOT = "SPRING_BOOT", "Spring Boot"
    NODEJS = "NODEJS", "NodeJS"
    EXPRESS = "EXPRESS", "Express"
    NESTJS = "NESTJS", "NestJS"


class FrontendFramework(models.TextChoices):
    REACT = "REACT", "React"
    NEXTJS = "NEXTJS", "NextJS"
    VUE = "VUE", "Vue"
    ANGULAR = "ANGULAR", "Angular"
    SVELTE = "SVELTE", "Svelte"


class QATool(models.TextChoices):
    PYTEST = "PYTEST", "Pytest"
    JUNIT = "JUNIT", "JUnit"
    PLAYWRIGHT = "PLAYWRIGHT", "Playwright"
    SELENIUM = "SELENIUM", "Selenium"
    POSTMAN = "POSTMAN", "Postman"
    JEST = "JEST", "Jest"
    CYPRESS = "CYPRESS", "Cypress"


class DevOpsTool(models.TextChoices):
    GIT = "GIT", "Git"
    DOCKER = "DOCKER", "Docker"
    KUBERNETES = "KUBERNETES", "Kubernetes"
    CI_CD = "CI_CD", "CI/CD"
    LINUX = "LINUX", "Linux"
    AWS = "AWS", "AWS"
    GCP = "GCP", "GCP"
    AZURE = "AZURE", "Azure"

class DeveloperSkill(models.Model):
    programming_languages = ArrayField(
        models.CharField(max_length=16, choices=ProgrammingLanguage.choices),
        blank=True,
        default=list,
    )
    databases = ArrayField(
        models.CharField(max_length=20, choices=Database.choices),
        blank=True,
        default=list,
    )
    backend_frameworks = ArrayField(
        models.CharField(max_length=50, choices=BackendFramework.choices),
        blank=True,
        default=list,
    )
    frontend_frameworks = ArrayField(
        models.CharField(max_length=20, choices=FrontendFramework.choices),
        blank=True,
        default=list,
    )
    qa_tools = ArrayField(
        models.CharField(max_length=20, choices=QATool.choices),
        blank=True,
        default=list,
    )
    dev_tools = ArrayField(
        models.CharField(max_length=20, choices=DevOpsTool.choices),
        blank=True,
        default=list,
    )

    class Meta:
        abstract = True
