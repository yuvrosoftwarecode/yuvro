import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("lab", "0010_alter_lab_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="labsprintticket",
            name="system_design",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Single JSON containing all tabs: nodes, edges, seq, schema, apis, and notes",
            ),
        ),
        migrations.AddField(
            model_name="userlabsprintticketsubmission",
            name="system_design",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="User's system design work containing nodes, edges, seq, schema, apis, and notes",
            ),
        ),
        migrations.CreateModel(
            name="SystemDesign",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(blank=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "design",
                    models.JSONField(
                        default=dict,
                        help_text="Single JSON containing all tabs: nodes, edges, seq, schema, apis, and notes",
                    ),
                ),
                ("is_template", models.BooleanField(default=False, help_text="Whether this design is an official starter or reference template")),
                ("is_submitted", models.BooleanField(default=False)),
                (
                    "lab",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="system_designs",
                        to="lab.lab",
                    ),
                ),
                (
                    "ticket",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="system_designs",
                        to="lab.labsprintticket",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="system_designs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
