# Generated on 2026-11-10

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recruiter", "0005_remove_githubappinstallation_recruiter_and_more"),
        ("skill_evaluation", "0026_systemdesignquestionbank_and_submission"),
    ]

    operations = [
        migrations.AddField(
            model_name="labquestionbank",
            name="company",
            field=models.ForeignKey(
                blank=True,
                help_text="Company owning this lab question",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="lab_questions",
                to="recruiter.company",
            ),
        ),
    ]
