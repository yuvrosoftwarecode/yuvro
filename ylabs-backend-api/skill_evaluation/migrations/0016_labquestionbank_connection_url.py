# Generated manually for connection_url field on LabQuestionBank

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("skill_evaluation", "0015_followupcandidate_deadline_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="labquestionbank",
            name="connection_url",
            field=models.CharField(
                blank=True,
                help_text="Pre-configured connection URL for external databases (e.g. Aiven MySQL/Postgres)",
                max_length=500,
                null=True,
            ),
        ),
    ]
