
import os
import django
import sys

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yc-backend-api.settings')
django.setup()

from django.db import connection

def check_tables():
    tables = connection.introspection.table_names()
    expected = ['core_attendancesession', 'core_attendancerecord']
    for table in expected:
        if table in tables:
            print(f"Table '{table}' exists.")
        else:
            print(f"Table '{table}' does NOT exist.")

if __name__ == "__main__":
    try:
        check_tables()
    except Exception as e:
        print(f"Error checking tables: {e}")
