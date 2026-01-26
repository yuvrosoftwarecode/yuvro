from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0002_jobprofile_candidatesearchlog_jobskill"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="certification",
            name="profile",
        ),
        migrations.RemoveField(
            model_name="education",
            name="profile",
        ),
        migrations.RemoveField(
            model_name="experience",
            name="profile",
        ),
        migrations.RemoveField(
            model_name="jobprofile",
            name="profile",
        ),
        migrations.AlterUniqueTogether(
            name="jobskill",
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name="jobskill",
            name="job_profile",
        ),
        migrations.RemoveField(
            model_name="project",
            name="profile",
        ),
        migrations.RemoveField(
            model_name="skill",
            name="profile",
        ),
        migrations.RemoveField(
            model_name="sociallinks",
            name="profile",
        ),
        migrations.DeleteModel(
            name="CandidateSearchLog",
        ),
        migrations.DeleteModel(
            name="Certification",
        ),
        migrations.DeleteModel(
            name="Education",
        ),
        migrations.DeleteModel(
            name="Experience",
        ),
        migrations.DeleteModel(
            name="JobProfile",
        ),
        migrations.DeleteModel(
            name="JobSkill",
        ),
        migrations.DeleteModel(
            name="Project",
        ),
        migrations.DeleteModel(
            name="Skill",
        ),
        migrations.DeleteModel(
            name="SocialLinks",
        ),
    ]
