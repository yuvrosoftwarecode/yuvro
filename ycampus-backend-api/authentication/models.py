import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("student", "Student"),
        ("college_admin", "College Admin"),
        ("principal", "Principal"),
        ("hod", "HOD"),
        ("faculty", "Faculty"),
        ("recruiter", "Recruiter"),
        ("placement_officer", "Placement Officer"),
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

    def is_college_admin(self):
        return self.role == "college_admin"

    def is_principal(self):
        return self.role == "principal"

    def is_hod(self):
        return self.role == "hod"


    def is_faculty(self):
        return self.role == "faculty"

    def is_recruiter(self):
        return self.role == "recruiter"

    def is_student(self):
        return self.role == "student"

    def is_placement_officer(self):
        return self.role == "placement_officer"

    def can_manage_content(self):
        return self.role in ["admin", "college_admin", "principal", "hod", "faculty", "placement_officer"]

    def can_manage_users(self):
        return self.role in ["admin", "college_admin", "principal", "hod", "placement_officer"]

    @property
    def college(self):
        """Unified access to the associated college based on user role."""
        if self.role == "student" and hasattr(self, "student_profile"):
            return self.student_profile.college
        elif self.role == "college_admin" and hasattr(self, "college_admin_profile"):
            return self.college_admin_profile.college
        elif self.role == "principal" and hasattr(self, "principal_profile"):
            return self.principal_profile.college
        elif self.role == "hod" and hasattr(self, "hod_profile"):
            return self.hod_profile.college
        elif self.role == "faculty" and hasattr(self, "faculty_profile"):
            return self.faculty_profile.college
        elif self.role == "placement_officer" and hasattr(self, "placement_officer_profile"):
            return self.placement_officer_profile.college
        return None

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
