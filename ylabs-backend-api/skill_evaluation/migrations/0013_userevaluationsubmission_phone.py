from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("skill_evaluation", "0012_evaluation_settings_followupconfig_ai_call_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="userevaluationsubmission",
            name="phone",
            field=models.CharField(
                blank=True,
                help_text="Candidate phone number collected during registration",
                max_length=20,
            ),
        ),
    ]
