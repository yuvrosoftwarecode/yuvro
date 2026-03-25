from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course', '0003_question_hints_questionsolution'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentcodepractice',
            name='used_hint',
            field=models.BooleanField(default=False, help_text='Whether the student used a hint for this problem'),
        ),
        migrations.AddField(
            model_name='studentcodepractice',
            name='viewed_solution',
            field=models.BooleanField(default=False, help_text='Whether the student viewed the solution for this problem'),
        ),
    ]
