from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0008_subject_category"),
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
