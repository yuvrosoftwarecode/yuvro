import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("student", "Student"),
        ("instructor", "Instructor"),
        ("recruiter", "Recruiter"),
        ("admin", "Administrator"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

    def is_admin(self):
        return self.role == "admin"

    def is_instructor(self):
        return self.role == "instructor"

    def is_recruiter(self):
        return self.role == "recruiter"

    def is_student(self):
        return self.role == "student"

    def can_manage_content(self):
        return self.role in ["admin", "instructor"]

    def can_manage_users(self):
        return self.role == "admin"

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = "admin"
        super().save(*args, **kwargs)


class Profile(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    profile_image = models.URLField(blank=True, null=True)
    cover_image = models.URLField(blank=True, null=True)

    full_name = models.CharField(max_length=200, blank=True, null=True)
    title = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)

    google_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    about = models.TextField(blank=True, null=True)
    gender = models.CharField(
        max_length=20, choices=GENDER_CHOICES, blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s Profile"
