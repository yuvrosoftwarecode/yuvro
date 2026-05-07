from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('gamification', '0002_badges'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Mission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=100, unique=True)),
                ('title', models.CharField(max_length=200)),
                ('description', models.CharField(max_length=300)),
                ('mission_type', models.CharField(
                    choices=[
                        ('solve_problems', 'Solve Problems'),
                        ('complete_lessons', 'Complete Lessons'),
                        ('pass_quizzes', 'Pass Quizzes'),
                        ('earn_xp', 'Earn XP'),
                        ('maintain_streak', 'Maintain Streak'),
                    ],
                    max_length=30,
                )),
                ('target', models.IntegerField()),
                ('xp_reward', models.IntegerField(default=25)),
                ('icon', models.CharField(default='target', max_length=50)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={'ordering': ['mission_type', 'key']},
        ),
        migrations.CreateModel(
            name='UserMission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('progress', models.IntegerField(default=0)),
                ('is_completed', models.BooleanField(default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('xp_awarded', models.BooleanField(default=False)),
                ('mission', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='user_missions',
                    to='gamification.mission',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='daily_missions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-date', 'mission__mission_type']},
        ),
        migrations.AlterUniqueTogether(
            name='usermission',
            unique_together={('user', 'mission', 'date')},
        ),
    ]
