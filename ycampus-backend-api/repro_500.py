
import os
import sys
import django
from rest_framework.test import APIRequestFactory

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yc-backend-api.settings')

try:
    django.setup()
except Exception as e:
    # Fallback if module name with dashes is an issue, try importing directly from folder if manageable
    print(f"Setup failed: {e}")
    # Try assuming we are inside the folder?
    sys.exit(1)

from assessment.models import CertificationExam
from assessment.serializers import CertificationExamSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

def run_test():
    try:
        # Mock request context
        factory = APIRequestFactory()
        request = factory.get('/')
        
        # Get admin user
        user = User.objects.filter(role='admin').first()
        if not user:
            print("No admin user found. Using first user.")
            user = User.objects.first()
        
        request.user = user

        # Get or create an exam
        exam = CertificationExam.objects.first()
        if not exam:
            print("No certification exam found.")
            # return
        else:
            print(f"Testing existing exam: {exam.id} - {exam.title}")
            serializer = CertificationExamSerializer(exam, context={'request': request})
            print("Serialized Data:", serializer.data)
            print("Serialization successful for existing exam.")

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_test()
