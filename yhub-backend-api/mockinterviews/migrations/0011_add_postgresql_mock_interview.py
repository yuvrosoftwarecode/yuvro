from django.db import migrations
from django.conf import settings


def add_postgresql_interview(apps, schema_editor):
    user_model_str = getattr(settings, "AUTH_USER_MODEL", "authentication.User")
    app_label, model_name = user_model_str.split(".")
    User = apps.get_model(app_label, model_name)
    MockInterview = apps.get_model("mockinterviews", "MockInterview")

    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        return

    MockInterview.objects.update_or_create(
        title="PostgreSQL Development",
        defaults={
            "description": "Adaptive AI-powered dynamic PostgreSQL technical interview. Assesses relational schema design, advanced SQL querying (CTEs, Window Functions), indexing mechanisms (B-Tree, GiST, GIN, BRIN), MVCC internals, VACUUM and AUTOVACUUM, transaction isolation levels, query planning (EXPLAIN ANALYZE), JSONB operations, and high-performance database tuning in real-time.",
            "instructions": "Hands-free interactive AI interview. Answer aloud through your microphone or text. The Vitarka Dynamic Engine adapts questions dynamically based on your candidate responses.",
            "max_duration": 30,
            "interview_mode": "automatic",
            "products": ["ylabs", "ycode", "ycampus"],
            "required_skills": [
                "PostgreSQL",
                "Relational Database Management (RDBMS)",
                "Advanced SQL & Window Functions (CTEs)",
                "MVCC & Concurrency Control (VACUUM)",
                "PostgreSQL Indexing (B-Tree, GIN, GiST, BRIN)",
                "Transactions, ACID & Locking Mechanisms",
            ],
            "optional_skills": [
                "Query Planning & Performance Tuning (EXPLAIN ANALYZE)",
                "JSONB Data Types & Indexing",
                "Stored Procedures & PL/pgSQL",
                "Streaming Replication & High Availability (WAL)",
                "Connection Pooling (PgBouncer)",
                "Partitioning & Sharding (Citus)",
            ],
            "publish_status": "active",
            "created_by": user,
        },
    )


def remove_postgresql_interview(apps, schema_editor):
    MockInterview = apps.get_model("mockinterviews", "MockInterview")
    MockInterview.objects.filter(title="PostgreSQL Development").delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("mockinterviews", "0010_add_mysql_mock_interview"),
    ]

    operations = [
        migrations.RunPython(add_postgresql_interview, remove_postgresql_interview),
    ]
