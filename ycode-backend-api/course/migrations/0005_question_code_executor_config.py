from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0004_remove_usergamificationprofile_user_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="code_executor_config",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Execution limits: {'time_limit': 10, 'memory_limit': 256}",
            ),
        ),
    ]
