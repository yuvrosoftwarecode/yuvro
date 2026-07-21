import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

YCODE_ROLE_CHOICES = [
    ("student", "Student"),
    ("instructor", "Instructor"),
    ("recruiter", "Recruiter"),
    ("admin", "Administrator"),
    ("guest", "Guest"),
]

YLABS_ROLE_CHOICES = [
    ("student", "Student"),
    ("admin", "Administrator"),
    ("recruiter", "Recruiter"),
]


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    is_otp_login = models.BooleanField(default=False)
    
    profile_image = models.URLField(blank=True, null=True)
    cover_image = models.URLField(blank=True, null=True)
    
    roles = models.JSONField(default=dict, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

    def is_admin(self):
        return any(role == "admin" for role in self.roles.values())

    def is_instructor(self):
        return any(role == "instructor" for role in self.roles.values())

    def is_recruiter(self):
        return any(role == "recruiter" for role in self.roles.values())

    def is_student(self):
        return any(role == "student" for role in self.roles.values())

    def is_guest(self):
        return any(role == "guest" for role in self.roles.values())

    def clean(self):
        super().clean()
        if not isinstance(self.roles, dict):
            raise ValidationError({"roles": "Roles must be a JSON dictionary."})
        
        ycode_role = self.roles.get("ycode")
        ycode_valid_keys = [r[0] for r in YCODE_ROLE_CHOICES]
        if ycode_role and ycode_role not in ycode_valid_keys:
            raise ValidationError({"roles": f"Invalid ycode role. Allowed: {', '.join(ycode_valid_keys)}"})
            
        ylabs_role = self.roles.get("ylabs")
        ylabs_valid_keys = [r[0] for r in YLABS_ROLE_CHOICES]
        if ylabs_role and ylabs_role not in ylabs_valid_keys:
            raise ValidationError({"roles": f"Invalid ylabs role. Allowed: {', '.join(ylabs_valid_keys)}"})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class GithubConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="github_connection")
    github_user_id = models.CharField(max_length=100)
    github_username = models.CharField(max_length=255)
    access_token = models.CharField(max_length=2000, help_text="Encrypted GitHub Access Token")
    scopes = models.CharField(max_length=255, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} -> {self.github_username}"
