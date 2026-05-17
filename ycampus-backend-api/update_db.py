import os
import django
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ycampus.settings')
django.setup()

from course.models import Subject
updated = Subject.objects.filter(product_type="assessment").update(product_type="assessments")
print(f"Updated {updated} subjects in database.")
