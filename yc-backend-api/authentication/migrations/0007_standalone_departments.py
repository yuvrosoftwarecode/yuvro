# Custom data + schema migration for standalone departments
# This migration:
# 1. Deduplicates Department records (keeps one per unique name)
# 2. Remaps all Profile.department FKs and Contest.allowed_departments M2M
# 3. Removes the college FK, adds verification_status, makes name unique
# 4. Adds department_other to Profile

from django.db import migrations, models
import uuid


def deduplicate_departments(apps, schema_editor):
    """
    Before removing the college FK, merge duplicate department names.
    e.g. CSE under JNTU, CSE under IIT, CSE under PES → keep one CSE.
    Remap all Profile.department and Contest.allowed_departments references.
    """
    Department = apps.get_model('authentication', 'Department')
    Profile = apps.get_model('authentication', 'Profile')
    Contest = apps.get_model('assessment', 'Contest')

    # Group departments by lowercase name
    from collections import defaultdict
    name_groups = defaultdict(list)
    for dept in Department.objects.all():
        key = dept.name.strip().lower()
        name_groups[key].append(dept)

    for name_key, depts in name_groups.items():
        if len(depts) <= 1:
            continue

        # Keep the first one (oldest by created_at), delete the rest
        depts.sort(key=lambda d: d.created_at)
        keeper = depts[0]
        duplicates = depts[1:]

        dup_ids = [d.id for d in duplicates]

        # Remap Profile.department FKs
        Profile.objects.filter(department_id__in=dup_ids).update(department_id=keeper.id)

        # Remap Contest.allowed_departments M2M
        for contest in Contest.objects.all():
            contest_dept_ids = set(contest.allowed_departments.values_list('id', flat=True))
            overlap = contest_dept_ids.intersection(set(dup_ids))
            if overlap:
                # Remove duplicates and add keeper
                for dup_id in overlap:
                    contest.allowed_departments.remove(dup_id)
                contest.allowed_departments.add(keeper.id)

        # Delete the duplicate records
        Department.objects.filter(id__in=dup_ids).delete()

    # Normalize names: use the original casing of the keeper
    # (no change needed, just ensuring trimmed)
    for dept in Department.objects.all():
        trimmed = dept.name.strip()
        if trimmed != dept.name:
            dept.name = trimmed
            dept.save(update_fields=['name'])


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0006_profile_college_other_and_more"),
        ("assessment", "0021_contest_allowed_colleges_contest_allowed_departments_and_more"),
    ]

    operations = [
        # Step 1: Deduplicate department data while old schema is intact
        migrations.RunPython(
            deduplicate_departments,
            reverse_code=migrations.RunPython.noop,
        ),

        # Step 2: Remove the unique_together constraint
        migrations.AlterUniqueTogether(
            name='department',
            unique_together=set(),
        ),

        # Step 3: Remove the college FK
        migrations.RemoveField(
            model_name='department',
            name='college',
        ),

        # Step 4: Add verification_status to Department
        migrations.AddField(
            model_name='department',
            name='verification_status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
                default='approved',
                max_length=20,
            ),
        ),

        # Step 5: Make name unique
        migrations.AlterField(
            model_name='department',
            name='name',
            field=models.CharField(max_length=255, unique=True),
        ),

        # Step 6: Add department_other to Profile
        migrations.AddField(
            model_name='profile',
            name='department_other',
            field=models.CharField(
                blank=True,
                help_text="Free-text department name when student's department is not in verified list",
                max_length=255,
                null=True,
            ),
        ),
    ]
