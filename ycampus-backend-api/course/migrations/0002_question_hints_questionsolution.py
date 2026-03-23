import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="hints",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="List of hints for the question. Format: [{'level': 1, 'text': 'hint text'}]",
            ),
        ),
        migrations.CreateModel(
            name="QuestionSolution",
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
                ("title", models.CharField(blank=True, default="", max_length=255)),
                (
                    "language",
                    models.CharField(
                        choices=[
                            ("python", "Python"),
                            ("java", "Java"),
                            ("cpp", "C++"),
                            ("c", "C"),
                            ("javascript", "JavaScript"),
                            ("sql", "SQL"),
                            ("other", "Other"),
                        ],
                        default="python",
                        max_length=20,
                    ),
                ),
                ("code", models.TextField(blank=True, default="")),
                (
                    "complexity_analysis",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Time and space complexity analysis of the solution",
                    ),
                ),
                (
                    "is_primary",
                    models.BooleanField(
                        default=False,
                        help_text="Whether this is the primary/recommended solution",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="solutions",
                        to="course.question",
                    ),
                ),
            ],
            options={
                "ordering": ["-is_primary", "created_at"],
            },
        ),
    ]
