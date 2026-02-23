
import os
import django
import sys
from django.core.management import call_command

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yc-backend-api.settings')

def run_check():
    try:
        django.setup()
        print("Django setup successful.")
        call_command('check')
        print("Django check successful.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_check()
