from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0002_alter_user_role"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="profile_image",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/"),
        ),
        migrations.AlterField(
            model_name="profile",
            name="cover_image",
            field=models.ImageField(blank=True, null=True, upload_to="covers/"),
        ),
    ]
