"""
Migration: Add UserGitHubIntegration model.
"""
import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("lab", "0002_rename_labticket_labsprintticket_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserGitHubIntegration",
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
                ("github_username", models.CharField(max_length=255)),
                (
                    "github_repo",
                    models.CharField(
                        help_text="e.g. my-labs-repo",
                        max_length=255,
                    ),
                ),
                (
                    "pat_encrypted",
                    models.TextField(
                        help_text="Fernet-encrypted Personal Access Token"
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="github_integration",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "abstract": False,
            },
        ),
    ]
