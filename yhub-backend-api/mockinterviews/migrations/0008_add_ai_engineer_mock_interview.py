from django.db import migrations
from django.conf import settings


def add_ai_engineer_interview(apps, schema_editor):
    user_model_str = getattr(settings, "AUTH_USER_MODEL", "authentication.User")
    app_label, model_name = user_model_str.split(".")
    User = apps.get_model(app_label, model_name)
    MockInterview = apps.get_model("mockinterviews", "MockInterview")

    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        return

    MockInterview.objects.update_or_create(
        title="AI Engineer",
        defaults={
            "description": "Comprehensive adaptive technical interview assessing artificial intelligence fundamentals, machine learning architectures, deep learning, LLMs, prompt engineering, RAG pipelines, and vector databases.",
            "instructions": "Hands-free interactive AI interview. Answer aloud through your microphone or text. The Vitarka Dynamic Engine adapts questions dynamically based on your candidate responses.",
            "max_duration": 30,
            "interview_mode": "automatic",
            "products": ["ylabs", "ycode", "ycampus"],
            "required_skills": [
                "Machine Learning",
                "Deep Learning",
                "Large Language Models (LLMs)",
                "Retrieval-Augmented Generation (RAG)",
                "Prompt Engineering",
                "Vector Databases",
                "Python",
                "PyTorch / TensorFlow",
            ],
            "optional_skills": [
                "LangChain & LlamaIndex",
                "Fine-Tuning (LoRA / QLoRA)",
                "Hugging Face",
                "Model Evaluation & Guardrails",
                "MLOps & Model Deployment",
                "Embeddings & Semantic Search",
            ],
            "publish_status": "active",
            "created_by": user,
        },
    )


def remove_ai_engineer_interview(apps, schema_editor):
    MockInterview = apps.get_model("mockinterviews", "MockInterview")
    MockInterview.objects.filter(title="AI Engineer").delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("mockinterviews", "0007_candidate_mock_interview_quota"),
    ]

    operations = [
        migrations.RunPython(add_ai_engineer_interview, remove_ai_engineer_interview),
    ]
