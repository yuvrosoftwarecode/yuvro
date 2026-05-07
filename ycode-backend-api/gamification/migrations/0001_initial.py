from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    """
    Initial migration for the gamification app.
    Uses db_table = 'course_usergamificationprofile' and 'course_dailyuseractivity'
    so existing data is preserved — no table rename needed.
    """

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserGamificationProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("current_streak", models.IntegerField(default=0)),
                ("longest_streak", models.IntegerField(default=0)),
                ("last_activity_date", models.DateField(blank=True, null=True)),
                ("total_xp", models.IntegerField(default=0)),
                ("current_level", models.IntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="gamification_profile",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "course_usergamificationprofile"},
        ),
        migrations.CreateModel(
            name="DailyUserActivity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(default=django.utils.timezone.now)),
                ("activity_count", models.IntegerField(default=0)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="daily_activities",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "course_dailyuseractivity",
                "ordering": ["-date"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="dailyuseractivity",
            unique_together={("user", "date")},
        ),
    ]
