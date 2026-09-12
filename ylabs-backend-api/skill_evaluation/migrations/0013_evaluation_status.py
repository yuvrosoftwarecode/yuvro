# Generated manually for EvaluationStatus enum support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("skill_evaluation", "0012_evaluation_settings_followupconfig_ai_call_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="evaluation",
            name="status",
            field=models.CharField(
                choices=[("DRAFT", "Draft"), ("PUBLISHED", "Published")],
                default="DRAFT",
                max_length=20,
            ),
        ),
    ]
