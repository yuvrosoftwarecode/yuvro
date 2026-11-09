from django.db import migrations
from django.conf import settings


def add_nodejs_interview(apps, schema_editor):
    user_model_str = getattr(settings, "AUTH_USER_MODEL", "authentication.User")
    app_label, model_name = user_model_str.split(".")
    User = apps.get_model(app_label, model_name)
    MockInterview = apps.get_model("mockinterviews", "MockInterview")

    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        return

    MockInterview.objects.update_or_create(
        title="Node.js Development (Automatic)",
        defaults={
            "description": "Adaptive AI-powered dynamic Node.js technical interview. Evaluates asynchronous programming, event loop mechanics, Express/Nest frameworks, REST APIs, and backend scalability in real-time.",
            "instructions": "Hands-free interactive AI interview. Answer aloud through your microphone or text. The Vitarka Dynamic Engine adapts questions dynamically based on your candidate responses.",
            "max_duration": 30,
            "interview_mode": "automatic",
            "products": ["ylabs", "ycode", "ycampus"],
            "required_skills": [
                "Node.js",
                "JavaScript",
                "Event Loop & Asynchronous Architecture",
                "Express.js",
                "RESTful APIs",
                "Backend Engineering"
            ],
            "optional_skills": [
                "NestJS",
                "Fastify",
                "MongoDB",
                "PostgreSQL",
                "Redis",
                "Streams & Buffers",
                "Docker",
                "Authentication (JWT/OAuth)",
                "Jest & Supertest"
            ],
            "publish_status": "active",
            "created_by": user,
        }
    )


def remove_nodejs_interview(apps, schema_editor):
    MockInterview = apps.get_model("mockinterviews", "MockInterview")
    MockInterview.objects.filter(title="Node.js Development (Automatic)").delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("mockinterviews", "0005_mockinterview_products"),
    ]

    operations = [
        migrations.RunPython(add_nodejs_interview, remove_nodejs_interview),
    ]