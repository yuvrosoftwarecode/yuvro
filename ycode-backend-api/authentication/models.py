import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("student", "Student"),
        ("instructor", "Instructor"),
        ("recruiter", "Recruiter"),
        ("admin", "Administrator"),
        ("guest", "Guest"),
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

    def is_guest(self):
        return self.role == "guest"

    def can_manage_content(self):
        return self.role in ["admin", "instructor"]

    def can_manage_users(self):
        return self.role == "admin"

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = "admin"
        super().save(*args, **kwargs)


class College(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="approved"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Profile(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    full_name = models.CharField(max_length=200, blank=True, null=True)
    title = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)

    college = models.ForeignKey(College, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    college_other = models.CharField(max_length=255, blank=True, null=True, help_text="Free-text college name when student's college is not in verified list")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    department_other = models.CharField(max_length=255, blank=True, null=True, help_text="Free-text department name when student's department is not in verified list")
    student_id = models.CharField(max_length=100, blank=True, null=True)
    id_card_image = models.URLField(blank=True, null=True)

    google_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    about = models.TextField(blank=True, null=True)
    gender = models.CharField(
        max_length=20, choices=GENDER_CHOICES, blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    resume_config = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Resume builder configuration: template, typography, colors, section order, etc."
    )

    def __str__(self):
        return f"{self.user.email}'s Profile"
