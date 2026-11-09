from django.db import migrations
from django.conf import settings


def add_reactjs_interview(apps, schema_editor):
    user_model_str = getattr(settings, "AUTH_USER_MODEL", "authentication.User")
    app_label, model_name = user_model_str.split(".")
    User = apps.get_model(app_label, model_name)
    MockInterview = apps.get_model("mockinterviews", "MockInterview")

    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        return

    MockInterview.objects.update_or_create(
        title="React.js Development",
        defaults={
            "description": "Adaptive AI-powered dynamic React.js technical interview. Evaluates core React concepts, JSX, component lifecycle, hooks, state management, Virtual DOM, rendering optimization, and modern frontend architecture in real-time.",
            "instructions": "Hands-free interactive AI interview. Answer aloud through your microphone or text. The Vitarka Dynamic Engine adapts questions dynamically based on your candidate responses.",
            "max_duration": 30,
            "interview_mode": "automatic",
            "products": ["ylabs", "ycode", "ycampus"],
            "required_skills": [
                "React.js",
                "JavaScript (ES6+)",
                "React Hooks",
                "State Management & Context API",
                "Component Lifecycle & Virtual DOM",
                "Frontend Architecture & Performance Optimization",
            ],
            "optional_skills": [
                "Next.js & SSR/SSG",
                "TypeScript",
                "Redux Toolkit / Zustand",
                "React Query / TanStack Query",
                "Tailwind CSS",
                "Jest & React Testing Library",
            ],
            "publish_status": "active",
            "created_by": user,
        },
    )


def remove_reactjs_interview(apps, schema_editor):
    MockInterview = apps.get_model("mockinterviews", "MockInterview")
    MockInterview.objects.filter(title="React.js Development").delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("mockinterviews", "0008_add_ai_engineer_mock_interview"),
    ]

    operations = [
        migrations.RunPython(add_reactjs_interview, remove_reactjs_interview),
    ]
