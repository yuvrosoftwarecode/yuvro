# Generated manually for task selection feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("skill_evaluation", "0015_followupcandidate_deadline_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="labquestionbank",
            name="allow_task_selection",
            field=models.BooleanField(
                default=True,
                help_text="Whether recruiters can select individual tasks from this lab question",
            ),
        ),
    ]
