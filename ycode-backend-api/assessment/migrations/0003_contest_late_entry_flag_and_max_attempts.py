from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessment', '0002_initial'),
    ]

    operations = [
        # Add is_late_entry to ContestRegistration
        migrations.AddField(
            model_name='contestregistration',
            name='is_late_entry',
            field=models.BooleanField(
                default=False,
                help_text='Whether the user registered after the registration window closed'
            ),
        ),
        # Override max_attempts on Contest to always be 1 and non-editable
        migrations.AlterField(
            model_name='contest',
            name='max_attempts',
            field=models.PositiveIntegerField(
                default=1,
                editable=False,
                help_text='Contests allow exactly one attempt per user.'
            ),
        ),
    ]
