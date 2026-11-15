# Generated manually for CandidateMockInterviewQuota free_interviews default 1

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mockinterviews", "0008_interviewevaluation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="candidatemockinterviewquota",
            name="free_interviews",
            field=models.IntegerField(default=1, help_text="Initial free mock interviews granted"),
        ),
    ]
