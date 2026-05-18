from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gamification', '0004_daily_activity_type_counts'),
    ]

    operations = [
        migrations.AddField(
            model_name='usergamificationprofile',
            name='streak_freezes_remaining',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='usergamificationprofile',
            name='last_freeze_replenish',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='usergamificationprofile',
            name='days_missed',
            field=models.IntegerField(default=0),
        ),
    ]
