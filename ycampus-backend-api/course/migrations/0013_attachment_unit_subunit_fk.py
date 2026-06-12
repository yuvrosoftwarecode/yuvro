from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0012_increase_attachment_file_type_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="attachment",
            name="unit",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attachments",
                to="course.unit",
            ),
        ),
        migrations.AddField(
            model_name="attachment",
            name="sub_unit",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attachments",
                to="course.subunit",
            ),
        ),
    ]
