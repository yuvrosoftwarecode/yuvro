from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("assessment", "0003_contest_late_entry_flag_and_max_attempts"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="certificate",
            name="certificate_url",
        ),
        migrations.RemoveField(
            model_name="certificate",
            name="certificate_id",
        ),
    ]
