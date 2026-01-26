from django.db.models.signals import post_save
from django.dispatch import receiver
from course.models import Course
from .models import CertificationExam

# Auto-creation logic removed as per new requirements (Manual Creation only)
