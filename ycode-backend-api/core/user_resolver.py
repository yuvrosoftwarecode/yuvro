import requests
import logging
from django.core.cache import cache
from django.conf import settings
from core.models import User

logger = logging.getLogger(__name__)

def resolve_user(user_id):
    if not user_id:
        return None

    import uuid
    user_id_str = str(user_id)
    try:
        uuid.UUID(user_id_str)
    except ValueError:
        user_id_str = str(uuid.uuid5(uuid.NAMESPACE_DNS, user_id_str))

    cache_key = f"user_details_{user_id_str}"
    
    # Try fetching from cache
    cached = cache.get(cache_key)
    if cached:
        return User.from_dict(cached)

    # Query YHub internal endpoint
    url = f"http://yhub-backend:8000/api/auth/users/internal/{user_id_str}/"
    headers = {
        "X-Internal-Token": getattr(settings, "INTERNAL_SERVICE_TOKEN", "super-secret-internal-token"),
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            # Cache resolved user data for 5 minutes
            cache.set(cache_key, data, timeout=300)
            return User.from_dict(data)
        else:
            logger.warning(f"Failed to resolve user {user_id_str} from YHub: HTTP {response.status_code}")
    except Exception as e:
        logger.error(f"Error connecting to YHub to resolve user {user_id_str}: {str(e)}")

    # Fallback to prevent crashes
    fallback_data = {
        "user_id": user_id_str,
        "email": "student@yuvro.com",
        "username": "student",
        "first_name": "Student",
        "last_name": "",
        "role": "student",
        "is_active": True
    }
    return User.from_dict(fallback_data)
