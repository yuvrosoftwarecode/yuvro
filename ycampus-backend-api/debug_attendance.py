
import os
import django
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yc-backend-api.settings')

def debug_query():
    try:
        django.setup()
        from core.models import AttendanceSession, AttendanceRecord
        from course.models import SectionSubjectFaculty
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        print("Model imports successful.")
        
        # 1. Check if table exists
        try:
            count = AttendanceSession.objects.count()
            print(f"AttendanceSession count: {count}")
        except Exception as e:
            print(f"Error querying AttendanceSession: {e}")
            return

        # 2. Test get_queryset logic
        user = User.objects.filter(role='faculty').first()
        if user:
            print(f"Testing for faculty user: {user.email}")
            qs = AttendanceSession.objects.all().filter(section_subject_faculty__faculty__user=user)
            try:
                list(qs)
                print("Faculty filter successful.")
            except Exception as e:
                print(f"Error in faculty filter: {e}")
        else:
            print("No faculty user found for testing filter.")

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_query()
