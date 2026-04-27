from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gamification', '0003_missions'),
    ]

    operations = [
        migrations.AddField(
            model_name='dailyuseractivity',
            name='video_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='dailyuseractivity',
            name='quiz_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='dailyuseractivity',
            name='coding_count',
            field=models.IntegerField(default=0),
        ),
    ]
