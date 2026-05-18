from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gamification', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add activity counters to UserGamificationProfile
        migrations.AddField(
            model_name='usergamificationprofile',
            name='total_problems_solved',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usergamificationprofile',
            name='total_quizzes_passed',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usergamificationprofile',
            name='total_lessons_completed',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usergamificationprofile',
            name='total_courses_completed',
            field=models.IntegerField(default=0),
        ),
        # Badge model
        migrations.CreateModel(
            name='Badge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=50, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('category', models.CharField(
                    choices=[
                        ('streak', 'Streak'), ('xp', 'XP'), ('coding', 'Coding'),
                        ('learning', 'Learning'), ('quiz', 'Quiz'),
                    ],
                    max_length=20,
                )),
                ('icon', models.CharField(default='trophy', max_length=50)),
                ('xp_reward', models.IntegerField(default=0)),
            ],
            options={'ordering': ['category', 'key']},
        ),
        # UserBadge model
        migrations.CreateModel(
            name='UserBadge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('earned_at', models.DateTimeField(auto_now_add=True)),
                ('badge', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='user_badges',
                    to='gamification.badge',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='badges',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-earned_at']},
        ),
        migrations.AlterUniqueTogether(
            name='userbadge',
            unique_together={('user', 'badge')},
        ),
    ]
