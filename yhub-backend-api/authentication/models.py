import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from django.db.models.functions import Lower

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

MARKETPLACE_ROLE_CHOICES = [
    ("recruiter_account_manager", "Recruiter Account Manager"),
    ("recruiter_freelancer", "Recruiter Freelancer"),
    ("recruiter_company", "Recruiter Company"),
    ("recruiter_company_employee", "Recruiter Company Employee"),
    ("recruiter_company_manager", "Recruiter Company Manager"),
]


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    is_otp_login = models.BooleanField(default=False)
    is_guest_user = models.BooleanField(default=False)
    
    profile_image = models.TextField(blank=True, null=True)
    cover_image = models.TextField(blank=True, null=True)
    resume_file = models.TextField(blank=True, null=True)
    
    roles = models.JSONField(default=dict, blank=True)
    education = models.JSONField(default=list, blank=True)
    employment = models.JSONField(default=list, blank=True)
    projects = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    headline = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    location = models.CharField(max_length=150, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    about = models.TextField(blank=True, null=True)
    email_public = models.BooleanField(default=False)
    phone_public = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("username"),
                name="unique_lower_username",
            ),
        ]

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

    def is_admin(self):
        return any(role == "admin" for role in self.roles.values())

    def is_instructor(self):
        return any(role == "instructor" for role in self.roles.values())

    def is_recruiter(self):
        return any(
            role in [
                "recruiter",
                "recruiter_account_manager",
                "recruiter_freelancer",
                "recruiter_company",
                "recruiter_company_employee",
                "recruiter_company_manager",
            ]
            for role in self.roles.values()
        )

    def is_recruiter_account_manager(self):
        return any(role == "recruiter_account_manager" for role in self.roles.values())

    def is_recruiter_freelancer(self):
        return any(role == "recruiter_freelancer" for role in self.roles.values())

    def is_recruiter_company(self):
        return any(role == "recruiter_company" for role in self.roles.values())

    def is_recruiter_company_employee(self):
        return any(role == "recruiter_company_employee" for role in self.roles.values())

    def is_recruiter_company_manager(self):
        return any(role == "recruiter_company_manager" for role in self.roles.values())

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

        marketplace_role = self.roles.get("marketplace")
        marketplace_valid_keys = [r[0] for r in MARKETPLACE_ROLE_CHOICES]
        if marketplace_role and marketplace_role not in marketplace_valid_keys:
            raise ValidationError({"roles": f"Invalid marketplace role. Allowed: {', '.join(marketplace_valid_keys)}"})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta(AbstractUser.Meta):
        constraints = [
            models.UniqueConstraint(
                Lower("username"),
                name="unique_lower_username",
            ),
            models.UniqueConstraint(
                Lower("email"),
                name="unique_lower_email",
            ),
        ]


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

class LinkedInConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="linkedin_connection")
    linkedin_sub = models.CharField(max_length=150, help_text="LinkedIn Member ID / URN sub")
    linkedin_name = models.CharField(max_length=255, blank=True)
    linkedin_handle = models.CharField(max_length=255, blank=True, null=True, help_text="LinkedIn vanity handle/slug")
    linkedin_email = models.EmailField(blank=True, null=True)
    access_token = models.CharField(max_length=3000, help_text="Encrypted or base64 LinkedIn Access Token")
    scopes = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} -> LinkedIn ({self.linkedin_name or self.linkedin_sub})"

class RegistrationOTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    resource_id = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=100, default='contest')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=['email', 'resource_id', 'resource_type']),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)

    def is_valid(self):
        return timezone.now() <= self.expires_at


class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_sessions")
    session_key = models.CharField(max_length=255, db_index=True)
    ip_address = models.CharField(max_length=64, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    browser = models.CharField(max_length=64, default="Browser")
    os = models.CharField(max_length=64, default="Desktop")
    device_type = models.CharField(max_length=32, default="Desktop")
    location = models.CharField(max_length=128, default="India")
    last_activity = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-last_activity"]
        unique_together = ("user", "session_key")

    def __str__(self):
        return f"{self.user.email} - {self.browser} on {self.os}"
