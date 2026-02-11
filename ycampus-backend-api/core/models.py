import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_%(class)s_set",
        help_text="User who created this record",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class BaseTimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

class College(models.Model):
    """
    Model representing a college/institution.
    """

    COLLEGE_TYPES = [
        ("government", "Government"),
        ("autonomous", "Autonomous"),
        ("deemed", "Deemed"),
        ("private", "Private"),
    ]

    UNIVERSITY_CHOICES = [
        ("jntu", "JNTU"),
        ("anna", "Anna"),
        ("vtu", "VTU"),
        ("ou", "OU"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    short_form = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    college_type = models.CharField(
        max_length=20, choices=COLLEGE_TYPES, default="private"
    )
    affiliated_university = models.CharField(
        max_length=20, choices=UNIVERSITY_CHOICES, default="jntu"
    )
    is_aicte_approved = models.BooleanField(default=False)
    is_ugc_approved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    """
    Model representing a department within a college.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="departments", null=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [["college", "name"]]

    def __str__(self):
        if self.college:
            return f"{self.name} ({self.college.name})"
        return self.name


class Batch(models.Model):
    """
    Model representing a student batch (e.g., 2021-2025) within a department.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="batches", null=True
    )
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-name"]
        unique_together = [["department", "name"]]

    def __str__(self):
        if self.department:
            return f"{self.name} ({self.department.name})"
        return self.name


class Semester(models.Model):
    """
    Model representing a semester within a batch.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name="semesters", null=True, blank=True
    )
    number = models.PositiveIntegerField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["number"]
        unique_together = [["batch", "number"]]

    def __str__(self):
        return f"Semester {self.number} - {self.batch.name}"

    def save(self, *args, **kwargs):
        if self.is_current:
            # Set all other semesters in this batch to not current
            Semester.objects.filter(batch=self.batch).exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)


class Section(models.Model):
    """
    Model representing a section within a semester.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name="sections"
    )
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [["semester", "name"]]

    def __str__(self):
        return f"Section {self.name} - {self.semester.batch.name} (S{self.semester.number})"
