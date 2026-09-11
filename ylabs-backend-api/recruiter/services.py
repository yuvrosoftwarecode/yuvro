import requests
import logging
from django.conf import settings
import os

logger = logging.getLogger(__name__)

def get_yhub_url():
    return getattr(settings, 'YHUB_INTERNAL_URL', os.environ.get('YHUB_INTERNAL_URL', 'http://yhub-backend:8000'))

def register_user_in_yhub(email, username, password, first_name, last_name, roles=None):

    if roles is None:
        roles = {"ylabs": "recruiter"}

    url = f"{get_yhub_url()}/api/auth/register/?product=ylabs"
    payload = {
        "email": email,
        "username": username,
        "password": password,
        "password_confirm": password,
        "first_name": first_name,
        "last_name": last_name,
        "roles": roles,
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code in (200, 201):
            return response.json()
            
        # Try to extract a meaningful error message

        try:
            error_data = response.json()
            error_msg = str(error_data)
        except Exception:
            error_msg = response.text
            
        logger.error(f"YHub registration failed with status {response.status_code}: {error_msg}")
        
        if response.status_code == 400:
            raise ValueError(f"YHub registration failed: {error_msg}")
        else:
            raise Exception(f"YHub returned unexpected status {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error calling YHub: {str(e)}")
        raise Exception("Unable to reach YHub for user registration.")

def delete_user_in_yhub(email):

    url = f"{get_yhub_url()}/api/auth/internal/delete-user/"
    try:
        response = requests.delete(url, json={"email": email}, timeout=5)
        if response.status_code not in (200, 204):
            logger.error(f"Failed to rollback user in YHub! Status {response.status_code}: {response.text}")
        else:
            logger.info(f"Successfully rolled back (deleted) user {email} in YHub.")
    except Exception as e:
        logger.error(f"Error rolling back user in YHub for email {email}: {str(e)}")
