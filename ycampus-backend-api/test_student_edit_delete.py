import requests
import json

BASE_URL = "http://localhost:8000/api/core"

def test_edit_delete():
    # 1. Create a student for testing
    print("Creating student for testing...")
    payload = {
        "user": {
            "first_name": "Edit",
            "last_name": "Test",
            "email": "edit_test@example.com",
            "username": "edit_test"
        },
        "roll_number": "EDIT_DELETE_TEST_001",
        "phone_number": "1234567890",
        "college": "d006f712-3b07-4023-b3c7-950995bf53e7" # from previous test
    }
    
    resp = requests.post(f"{BASE_URL}/student/", json=payload)
    if resp.status_code != 201:
        print(f"Failed to create student: {resp.status_code}")
        print(resp.text)
        return
    
    student = resp.json()
    student_id = student['id']
    user_id = student['user']
    print(f"Student created: {student_id}, User: {user_id}")
    
    # 2. Update the student (partial update)
    print("\nTesting partial update (detain)...")
    update_payload = {
        "is_detained": True,
        "phone_number": "9999999999"
    }
    resp = requests.patch(f"{BASE_URL}/student/{student_id}/", json=update_payload)
    if resp.status_code == 200:
        updated = resp.json()
        print(f"Update Success! is_detained: {updated['is_detained']}, phone: {updated['phone_number']}")
    else:
        print(f"Update Failed: {resp.status_code}")
        print(resp.text)
        
    # 3. Update user details via student endpoint
    print("\nTesting user detail update via student endpoint...")
    user_update_payload = {
        "user": {
            "first_name": "Modified"
        }
    }
    resp = requests.patch(f"{BASE_URL}/student/{student_id}/", json=user_update_payload)
    if resp.status_code == 200:
        updated = resp.json()
        print(f"User Name Update Success! first_name: {updated['user_details']['first_name']}")
    else:
        print(f"User Update Failed: {resp.status_code}")
        print(resp.text)

    # 4. Delete the student
    print(f"\nDeleting student {student_id}...")
    resp = requests.delete(f"{BASE_URL}/student/{student_id}/")
    if resp.status_code == 204:
        print("Student deleted successfully")
    else:
        print(f"Delete Failed: {resp.status_code}")
        print(resp.text)
        
    # 5. Verify user is also deleted
    print(f"\nVerifying user {user_id} is deleted...")
    # There might not be a direct user endpoint exposed to public or same way, 
    # but we can try to fetch the student again - should be 404
    resp = requests.get(f"{BASE_URL}/student/{student_id}/")
    if resp.status_code == 404:
        print("Verified: Student profile gone")
    else:
        print(f"Wait, student still exists? {resp.status_code}")

if __name__ == "__main__":
    test_edit_delete()
