import logging
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)

class StatelessUser:
    def __init__(self, token_payload):
        self.id = token_payload.get("user_id") or token_payload.get("id")
        self.email = token_payload.get("email")
        self.username = token_payload.get("username", self.email)
        self.first_name = token_payload.get("first_name", "")
        self.last_name = token_payload.get("last_name", "")
        self.role = token_payload.get("role", "student")
        self.is_active = True
        
        # Profile details
        profile = token_payload.get("profile") or {}
        self.college_id = profile.get("college_id")
        self.college_name = profile.get("college_name")
        self.department_id = profile.get("department_id")
        self.department_name = profile.get("department_name")
        self.full_name = profile.get("full_name") or f"{self.first_name} {self.last_name}".strip() or self.username
        self.profile_image = profile.get("profile_image")

    @property
    def is_authenticated(self):
        return True

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

    def is_admin(self):
        return self.role == "admin"

    def is_instructor(self):
        return self.role == "instructor"

    def is_recruiter(self):
        return self.role == "recruiter"

    def is_student(self):
        return self.role == "student"

    def is_guest(self):
        return self.role == "guest"

    def can_manage_content(self):
        return self.role in ["admin", "instructor"]

    def can_manage_users(self):
        return self.role == "admin"

    def __eq__(self, other):
        if other is None:
            return False
        other_id = other.id if hasattr(other, "id") else other
        return str(self.id) == str(other_id)

    def __hash__(self):
        return hash(str(self.id))

    def __str__(self):
        return self.email or str(self.id)

class StatelessJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        from core.models import User
        return User.from_dict(validated_token)
