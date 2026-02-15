
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"  # Inside the container it's 8000
LOGIN_URL = f"{BASE_URL}/api/token/"
CREATE_STUDENT_URL = f"{BASE_URL}/api/core/student/"

def test_student_creation():
    # 1. Login as College Admin
    login_data = {
        "email": "college_admin1@yuvro.com",
        "password": "password"
    }
    response = requests.post(LOGIN_URL, json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return

    tokens = response.json()
    access_token = tokens["access"]
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # 2. Get some required IDs (Department, Batch, etc.)
    # We'll just try to create with some likely IDs or check existing ones first
    # For now, let's just try to create and see the validation error or success
    
    student_data = {
        "user": {
            "email": "test_student_api_4@yuvro.com",
            "username": "test_student_api_4",
            "first_name": "Test",
            "last_name": "Student"
        },
        "roll_number": "API_TEST_004",
        "phone_number": "9876543211",
        "admission_type": "lateral_entry",
        "department": None,
        "batch": None,
        "semester": None,
        "section": None
    }

    print("Attempting to create student via API...")
    response = requests.post(CREATE_STUDENT_URL, headers=headers, json=student_data)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    test_student_creation()
