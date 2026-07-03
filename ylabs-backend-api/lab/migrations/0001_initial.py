from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Lab",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255)),
                ("type", models.CharField(choices=[("DATABASE", "Database"), ("BACKEND", "Backend"), ("FRONTEND", "Frontend"), ("FULL_STACK", "Full Stack"), ("QUALITY_ASSURANCE", "Quality Assurance"), ("DEVOPS", "DevOps"), ("AI", "AI")], default="BACKEND", max_length=40)),
                ("description", models.TextField(blank=True)),
                ("icon", models.CharField(blank=True, max_length=100)),
                ("prerequisites", models.TextField(blank=True)),
                ("skills", models.JSONField(blank=True, default=list)),
                ("git_repo_starter_url", models.URLField(blank=True)),
                ("difficulty", models.CharField(choices=[("EASY", "Easy"), ("MEDIUM", "Medium"), ("HARD", "Hard")], default="EASY", max_length=10)),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(help_text="User who created this record", on_delete=django.db.models.deletion.CASCADE, related_name="created_%(class)s_set", to="authentication.user")),
            ],
            options={
                "ordering": ["-created_at"],
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="LabSprint",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("order_index", models.PositiveIntegerField(default=0)),
                ("created_by", models.ForeignKey(help_text="User who created this record", on_delete=django.db.models.deletion.CASCADE, related_name="created_%(class)s_set", to="authentication.user")),
                ("lab", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sprints", to="lab.lab")),
            ],
            options={
                "ordering": ["order_index"],
            },
        ),
        migrations.CreateModel(
            name="LabTicket",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ticket_slug", models.CharField(max_length=32)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("difficulty", models.CharField(choices=[("EASY", "Easy"), ("MEDIUM", "Medium"), ("HARD", "Hard")], default="EASY", max_length=10)),
                ("learning_objectives", models.JSONField(blank=True, default=list)),
                ("tasks", models.JSONField(blank=True, default=list)),
                ("common_mistakes", models.JSONField(blank=True, default=list)),
                ("hints", models.JSONField(blank=True, default=list)),
                ("scoring_rules", models.JSONField(blank=True, default=dict)),
                ("solution", models.JSONField(blank=True, default=dict)),
                ("yuvro_points", models.PositiveIntegerField(default=5)),
                ("minutes_max", models.PositiveIntegerField(default=30)),
                ("accepted_programming_languages", models.JSONField(blank=True, default=list)),
                ("order_index", models.PositiveIntegerField(default=0)),
                ("created_by", models.ForeignKey(help_text="User who created this record", on_delete=django.db.models.deletion.CASCADE, related_name="created_%(class)s_set", to="authentication.user")),
                ("sprint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tasks", to="lab.labsprint")),
            ],
            options={
                "ordering": ["order_index"],
            },
        ),
        migrations.CreateModel(
            name="UserLabEnrollment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("lab", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="enrollments", to="lab.lab")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lab_enrollments", to="authentication.user")),
            ],
            options={
                "unique_together": {("user", "lab")},
            },
        ),
        migrations.CreateModel(
            name="UserLabTicketSubmission",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ticket_status", models.CharField(choices=[("backlog", "Backlog"), ("in_progress", "In Progress"), ("in_review", "In Review"), ("done", "Done")], default="backlog", max_length=20)),
                ("solution", models.TextField(blank=True)),
                ("solution_output", models.TextField(blank=True, help_text="Output from the last validation run (stdout/stderr, test results)")),
                ("feedback", models.TextField(blank=True, help_text="Manual feedback from an instructor or system hints")),
                ("yuvro_points", models.PositiveIntegerField(default=0)),
                ("minutes_solved", models.PositiveIntegerField(default=0)),
                ("lab_ticket", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="submissions", to="lab.labticket")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lab_ticket_submissions", to="authentication.user")),
            ],
            options={
                "unique_together": {("user", "lab_ticket")},
            },
        ),
    ]
