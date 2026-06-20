import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yc-backend-api.settings')
django.setup()

from assessment.models import CertificationSubmission, JobTestSubmission, SkillTestSubmission, ContestSubmission
from assessment.face_verification_proxy import run_async_face_verification
import time

for model in [CertificationSubmission, JobTestSubmission, SkillTestSubmission, ContestSubmission]:
    for sub in model.objects.filter(status='completed'):
        print(f"Running verification for {model.__name__} {sub.id}")
        run_async_face_verification(model, sub.id)
        time.sleep(1)
        
print("Done triggering background verifications.")
