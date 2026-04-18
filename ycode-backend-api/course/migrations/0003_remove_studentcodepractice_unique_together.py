from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('course', '0002_alter_studentcodepractice_unique_together'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='studentcodepractice',
            unique_together=set(),
        ),
    ]
