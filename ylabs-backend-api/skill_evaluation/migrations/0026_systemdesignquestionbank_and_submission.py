# Generated on 2026-11-02

import django.contrib.postgres.fields
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recruiter", "0005_remove_githubappinstallation_recruiter_and_more"),
        ("skill_evaluation", "0025_labquestionbank_github_app_installation_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="evaluationsection",
            name="type",
            field=models.CharField(
                choices=[
                    ("LAB", "Lab"),
                    ("KNOWLEDGE_ASSESSMENT", "Knowledge Assessment"),
                    ("VITARKA_AI_INTERVIEW", "Vitarka AI Interview"),
                    ("SYSTEM_DESIGN", "System Design"),
                ],
                default="KNOWLEDGE_ASSESSMENT",
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="candidatetimelineevent",
            name="title",
            field=models.CharField(
                choices=[
                    ("Evaluation invitation sent", "Evaluation invitation sent"),
                    ("Candidate started evaluation", "Candidate started evaluation"),
                    ("Engineering Labs submitted", "Engineering Labs submitted"),
                    ("Knowledge Assessment submitted", "Knowledge Assessment submitted"),
                    ("Vitarka discussion completed", "Vitarka discussion completed"),
                    ("System Design submitted", "System Design submitted"),
                    ("Evaluation finished", "Evaluation finished"),
                    ("Auto submitted", "Auto submitted"),
                    ("Recruiter viewed profile", "Recruiter viewed profile"),
                    ("Shortlisted", "Shortlisted"),
                    ("Placed on hold", "Placed on hold"),
                    ("Rejected", "Rejected"),
                    ("Interview scheduled", "Interview scheduled"),
                    ("Offer sent", "Offer sent"),
                ],
                default="Evaluation invitation sent",
                max_length=255,
            ),
        ),
        migrations.CreateModel(
            name="SystemDesignQuestionBank",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "programming_languages",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("C", "C"),
                                ("C++", "C++"),
                                ("PYTHON", "Python"),
                                ("JAVA", "Java"),
                                ("SQL", "SQL"),
                                ("BASH", "Bash"),
                                ("JAVASCRIPT", "JavaScript"),
                                ("TYPESCRIPT", "TypeScript"),
                            ],
                            max_length=16,
                        ),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                (
                    "databases",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("SQLITE", "SQLite"),
                                ("POSTGRESQL", "PostgreSQL"),
                                ("MYSQL", "MySQL"),
                                ("MONGODB", "MongoDB"),
                                ("REDIS", "Redis"),
                                ("ELASTICSEARCH", "Elasticsearch"),
                            ],
                            max_length=20,
                        ),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                (
                    "backend_frameworks",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("DJANGO", "Django"),
                                ("FASTAPI", "FastAPI"),
                                ("FLASK", "Flask"),
                                ("SPRING_BOOT", "Spring Boot"),
                                ("NODEJS", "NodeJS"),
                                ("EXPRESS", "Express"),
                                ("NESTJS", "NestJS"),
                            ],
                            max_length=20,
                        ),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                (
                    "frontend_frameworks",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("REACT", "React"),
                                ("NEXTJS", "NextJS"),
                                ("VUE", "Vue"),
                                ("ANGULAR", "Angular"),
                                ("SVELTE", "Svelte"),
                            ],
                            max_length=20,
                        ),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                (
                    "qa_tools",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("PYTEST", "Pytest"),
                                ("JUNIT", "JUnit"),
                                ("PLAYWRIGHT", "Playwright"),
                                ("SELENIUM", "Selenium"),
                                ("POSTMAN", "Postman"),
                                ("JEST", "Jest"),
                                ("CYPRESS", "Cypress"),
                            ],
                            max_length=20,
                        ),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                (
                    "dev_tools",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(
                            choices=[
                                ("GIT", "Git"),
                                ("DOCKER", "Docker"),
                                ("KUBERNETES", "Kubernetes"),
                                ("CI_CD", "CI/CD"),
                                ("LINUX", "Linux"),
                                ("AWS", "AWS"),
                                ("GCP", "GCP"),
                                ("AZURE", "Azure"),
                            ],
                            max_length=20,
                        ),
                        blank=True,
                        default=list,
                        size=None,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "difficulty",
                    models.CharField(
                        choices=[
                            ("EASY", "Easy"),
                            ("MEDIUM", "Medium"),
                            ("HARD", "Hard"),
                        ],
                        default="EASY",
                        max_length=10,
                    ),
                ),
                (
                    "domain",
                    models.CharField(
                        choices=[
                            ("FINANCE", "Finance"),
                            ("EDTECH", "EdTech"),
                            ("RETAIL", "Retail"),
                            ("HEALTHCARE", "Healthcare"),
                            ("INSURANCE", "Insurance"),
                            ("PAYMENT", "Payment"),
                            ("SUPPLY_CHAIN", "Supply Chain"),
                            ("OTHER", "Other"),
                        ],
                        default="OTHER",
                        max_length=20,
                    ),
                ),
                (
                    "experience",
                    models.CharField(
                        choices=[
                            ("INTERN", "Intern"),
                            ("FRESHER", "Fresher"),
                            ("JUNIOR", "Junior Developer"),
                            ("MID_LEVEL", "Mid-Level Developer"),
                            ("SENIOR", "Senior Developer"),
                            ("LEAD", "Lead Developer"),
                            ("STAFF_ENGINEER", "Staff Engineer"),
                            ("PRINCIPAL_ENGINEER", "Principal Engineer"),
                            ("ARCHITECT", "Software Architect"),
                            ("MANAGER", "Engineering Manager"),
                            ("DIRECTOR_ENGINEERING", "Director of Engineering"),
                            ("VP_ENGINEERING", "VP of Engineering"),
                            ("CTO", "Chief Technology Officer"),
                        ],
                        default="FRESHER",
                        max_length=20,
                    ),
                ),
                ("duration_minutes", models.PositiveIntegerField(default=30)),
                ("marks", models.PositiveIntegerField(default=10)),
                ("scenario_type", models.CharField(blank=True, default="Distributed System", max_length=100)),
                ("system_slug", models.CharField(blank=True, default="systemdesign-url-shortener", max_length=100)),
                (
                    "starter_design",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Initial starter canvas: nodes, edges, seq, schema, apis, notes",
                    ),
                ),
                (
                    "solution_design",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Golden reference architecture for AI grading",
                    ),
                ),
                (
                    "tasks",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Task criteria list [{id, title, description, marks}]",
                    ),
                ),
                (
                    "constraints",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Design constraints and scale requirements",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        blank=True,
                        help_text="Company owning this system design question",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="system_design_questions",
                        to="recruiter.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        help_text="User who created this record",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="created_%(class)s_set",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="UserSystemDesignEvaluationSubmission",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("question_id", models.CharField(blank=True, max_length=255, null=True)),
                ("status", models.CharField(default="SUBMITTED", max_length=20)),
                (
                    "design",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Single JSON containing all tabs: nodes, edges, seq, schema, apis, and notes",
                    ),
                ),
                (
                    "solution_output",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Evaluation result: totalScore, percentage, tasks feedback, metrics, summary",
                    ),
                ),
                ("score", models.PositiveIntegerField(default=0)),
                (
                    "started_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Timestamp when candidate opened/started this system design section",
                        null=True,
                    ),
                ),
                (
                    "submitted_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Timestamp when candidate submitted this system design section",
                        null=True,
                    ),
                ),
                (
                    "evaluation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="system_design_submissions",
                        to="skill_evaluation.evaluation",
                    ),
                ),
                (
                    "section",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="system_design_submissions",
                        to="skill_evaluation.evaluationsection",
                    ),
                ),
                (
                    "system_design_question",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="submissions",
                        to="skill_evaluation.systemdesignquestionbank",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="evaluation_system_design_submissions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "evaluation", "section")},
            },
        ),
    ]
