# Generated for replacing is_active with status enum

from django.db import migrations, models


def populate_status(apps, schema_editor):
    Lab = apps.get_model("lab", "Lab")
    for lab in Lab.objects.all():
        if hasattr(lab, "is_active"):
            lab.status = "active" if lab.is_active else "inactive"
            lab.save(update_fields=["status"])


class Migration(migrations.Migration):

    dependencies = [
        ("lab", "0007_userlabactivity"),
    ]

    operations = [
        migrations.AddField(
            model_name="lab",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("inactive", "Inactive"),
                    ("draft", "Draft"),
                    ("upcoming", "Upcoming"),
                ],
                default="active",
                max_length=20,
            ),
        ),
        migrations.RunPython(populate_status, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="lab",
            name="is_active",
        ),
    ]
