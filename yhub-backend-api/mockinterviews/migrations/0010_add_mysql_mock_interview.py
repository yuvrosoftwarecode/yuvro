from django.db import migrations
from django.conf import settings


def add_mysql_interview(apps, schema_editor):
    user_model_str = getattr(settings, "AUTH_USER_MODEL", "authentication.User")
    app_label, model_name = user_model_str.split(".")
    User = apps.get_model(app_label, model_name)
    MockInterview = apps.get_model("mockinterviews", "MockInterview")

    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        return

    MockInterview.objects.update_or_create(
        title="MySQL Development",
        defaults={
            "description": "Adaptive AI-powered dynamic MySQL technical interview. Assesses relational schema design, SQL querying, indexing internals (B-Tree, Clustered vs Secondary), InnoDB storage engine, transactions, ACID isolation levels, query execution planning (EXPLAIN), and database performance tuning in real-time.",
            "instructions": "Hands-free interactive AI interview. Answer aloud through your microphone or text. The Vitarka Dynamic Engine adapts questions dynamically based on your candidate responses.",
            "max_duration": 30,
            "interview_mode": "automatic",
            "products": ["ylabs", "ycode", "ycampus"],
            "required_skills": [
                "MySQL",
                "Relational Database Management (RDBMS)",
                "SQL Query Optimization & Indexing",
                "Database Normalization & Schema Design",
                "Transactions & ACID Isolation Levels (InnoDB)",
                "Joins, Subqueries & Aggregations",
            ],
            "optional_skills": [
                "Query Execution Plans (EXPLAIN)",
                "Stored Procedures & Triggers",
                "Replication & High Availability",
                "Sharding & Partitioning",
                "Database Security & Backup/Recovery",
                "Redis Caching Integration",
            ],
            "publish_status": "active",
            "created_by": user,
        },
    )


def remove_mysql_interview(apps, schema_editor):
    MockInterview = apps.get_model("mockinterviews", "MockInterview")
    MockInterview.objects.filter(title="MySQL Development").delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("mockinterviews", "0009_add_reactjs_mock_interview"),
    ]

    operations = [
        migrations.RunPython(add_mysql_interview, remove_mysql_interview),
    ]
