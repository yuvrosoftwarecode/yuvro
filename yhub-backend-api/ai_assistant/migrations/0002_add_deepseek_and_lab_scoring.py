# Generated for YHub AI Lab Scoring Layer

import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai_assistant", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aiagent",
            name="provider",
            field=models.CharField(
                choices=[
                    ("openai", "OpenAI"),
                    ("anthropic", "Anthropic"),
                    ("gemini", "Google Gemini"),
                    ("cohere", "Cohere"),
                    ("huggingface", "Hugging Face"),
                    ("deepseek", "DeepSeek"),
                ],
                max_length=50,
            ),
        ),
        migrations.CreateModel(
            name="LabScoringEvaluation",
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
                ("lab_id", models.CharField(blank=True, max_length=255, null=True)),
                ("ticket_id", models.CharField(blank=True, max_length=255, null=True)),
                ("lab_type", models.CharField(default="system_design", max_length=50)),
                ("provider", models.CharField(default="deepseek", max_length=50)),
                ("model_name", models.CharField(default="deepseek-chat", max_length=100)),
                (
                    "overall_score",
                    models.FloatField(
                        default=0.0,
                        validators=[
                            django.core.validators.MinValueValidator(0.0),
                            django.core.validators.MaxValueValidator(100.0),
                        ],
                    ),
                ),
                ("passed", models.BooleanField(default=False)),
                ("lab_context", models.JSONField(blank=True, default=dict)),
                ("user_submission", models.JSONField(blank=True, default=dict)),
                ("evaluation_result", models.JSONField(blank=True, default=dict)),
                ("tokens_used", models.PositiveIntegerField(blank=True, null=True)),
                ("response_time_ms", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="lab_evaluations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
