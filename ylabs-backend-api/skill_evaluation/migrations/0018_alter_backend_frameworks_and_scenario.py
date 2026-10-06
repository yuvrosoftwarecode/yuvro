import django.contrib.postgres.fields
from django.db import migrations, models


def fix_truncated_frameworks(apps, schema_editor):
    for model_name in ["LabQuestionBank", "KnowledgeQuestionBank", "VitarkaAIInterviewQuestionBank"]:
        try:
            Model = apps.get_model("skill_evaluation", model_name)
            for obj in Model.objects.all():
                if obj.backend_frameworks and "DJANGO_REST_FRAMEWOR" in obj.backend_frameworks:
                    obj.backend_frameworks = [
                        "DJANGO_REST_FRAMEWORK" if f == "DJANGO_REST_FRAMEWOR" else f
                        for f in obj.backend_frameworks
                    ]
                    obj.save(update_fields=["backend_frameworks"])
        except Exception:
            pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("skill_evaluation", "0017_labquestionbanktask_parent_task"),
    ]

    operations = [
        migrations.AlterField(
            model_name="labquestionbank",
            name="backend_frameworks",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("DJANGO", "Django"),
                        ("DJANGO_REST_FRAMEWORK", "Django REST Framework"),
                        ("FASTAPI", "FastAPI"),
                        ("FLASK", "Flask"),
                        ("SPRING_BOOT", "Spring Boot"),
                        ("NODEJS", "NodeJS"),
                        ("EXPRESS", "Express"),
                        ("NESTJS", "NestJS"),
                    ],
                    max_length=50,
                ),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.AlterField(
            model_name="labquestionbank",
            name="scenario",
            field=models.CharField(
                choices=[
                    ("DEBUGGING", "Debugging"),
                    ("BUG_FIXING", "Bug Fixing"),
                    ("FEATURE_DEVELOPMENT", "Feature Development"),
                    ("API_OPTIMIZATION", "API Optimization"),
                    ("PERFORMANCE_OPTIMIZATION", "Performance Optimization"),
                    ("SECURITY", "Security"),
                    ("ARCHITECTURE", "Architecture"),
                    ("PERFORMANCE", "Performance"),
                    ("TESTING", "Testing"),
                    ("PRODUCTION_INCIDENT", "Production Incident"),
                ],
                default="FEATURE_DEVELOPMENT",
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name="knowledgequestionbank",
            name="backend_frameworks",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("DJANGO", "Django"),
                        ("DJANGO_REST_FRAMEWORK", "Django REST Framework"),
                        ("FASTAPI", "FastAPI"),
                        ("FLASK", "Flask"),
                        ("SPRING_BOOT", "Spring Boot"),
                        ("NODEJS", "NodeJS"),
                        ("EXPRESS", "Express"),
                        ("NESTJS", "NestJS"),
                    ],
                    max_length=50,
                ),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.AlterField(
            model_name="vitarkaaiinterviewquestionbank",
            name="backend_frameworks",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("DJANGO", "Django"),
                        ("DJANGO_REST_FRAMEWORK", "Django REST Framework"),
                        ("FASTAPI", "FastAPI"),
                        ("FLASK", "Flask"),
                        ("SPRING_BOOT", "Spring Boot"),
                        ("NODEJS", "NodeJS"),
                        ("EXPRESS", "Express"),
                        ("NESTJS", "NestJS"),
                    ],
                    max_length=50,
                ),
                blank=True,
                default=list,
                size=None,
            ),
        ),
        migrations.RunPython(fix_truncated_frameworks, noop),
    ]
