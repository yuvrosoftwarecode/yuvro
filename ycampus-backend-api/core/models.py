import uuid
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

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

class University(models.Model):
    """
    Model representing a university.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    short_form = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Universities"

    def __str__(self):
        return self.name


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

    PRODUCT_CHOICES = [
        ("campus", "Yuvro Campus"),
        ("assessments", "Yuvro Assessments"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    short_form = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    college_type = models.CharField(
        max_length=20, choices=COLLEGE_TYPES, default="private"
    )
    university = models.ForeignKey(
        University, on_delete=models.SET_NULL, null=True, blank=True, related_name="colleges"
    )
    product_type = models.CharField(
        max_length=20, choices=PRODUCT_CHOICES, default="campus"
    )
    is_aicte_approved = models.BooleanField(default=False)
    is_ugc_approved = models.BooleanField(default=False)
    sidebar_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON mapping of student sidebar tab keys to visibility booleans"
    )

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
    short_form = models.CharField(max_length=50, blank=True, null=True)
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
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="college_batches", null=True, blank=True
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="batches", null=True, blank=True
    )
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-name"]
        unique_together = [["department", "name"], ["college", "name", "department"]]

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


class StudentProfile(BaseTimestampedModel):
    ADMISSION_TYPE_CHOICES = [
        ("regular", "Regular"),
        ("lateral_entry", "Lateral Entry"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="student_profile"
    )
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="students"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        related_name="students",
        null=True,
        blank=True,
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.SET_NULL,
        related_name="students",
        null=True,
        blank=True,
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.SET_NULL,
        related_name="students",
        null=True,
        blank=True,
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        related_name="students",
        null=True,
        blank=True,
    )
    roll_number = models.CharField(max_length=50, unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    admission_type = models.CharField(
        max_length=20,
        choices=ADMISSION_TYPE_CHOICES,
        default="regular"
    )
    is_detained = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.roll_number}"


class FacultyProfile(BaseTimestampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="faculty_profile"
    )
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="faculty"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        related_name="faculty",
        null=True,
        blank=True,
    )
    linked_departments = models.ManyToManyField(
        Department, related_name="linked_faculty", blank=True
    )
    designation = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.designation}"


class HODProfile(BaseTimestampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="hod_profile"
    )
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name="hods")
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="hods", null=True, blank=True
    )
    linked_departments = models.ManyToManyField(
        Department, related_name="linked_hods", blank=True
    )

    def __str__(self):
        return f"{self.user.username} - HOD {self.department.name}"


class PrincipalProfile(BaseTimestampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="principal_profile"
    )
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="principals"
    )
    linked_departments = models.ManyToManyField(
        Department, related_name="linked_principals", blank=True
    )

    def __str__(self):
        return f"{self.user.username} - Principal {self.college.name}"


class CollegeAdminProfile(BaseTimestampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="college_admin_profile"
    )
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="college_admins"
    )


class AttendanceSession(BaseTimestampedModel):
    """
    Model representing a single attendance collection session/class.
    """
    section_subject_faculty = models.ForeignKey(
        "course.SectionSubjectFaculty", 
        on_delete=models.CASCADE, 
        related_name="attendance_sessions"
    )
    date = models.DateField(default=timezone.now)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        unique_together = ("section_subject_faculty", "date")

    def __str__(self):
        return f"{self.section_subject_faculty} - {self.date}"


class AttendanceRecord(BaseTimestampedModel):
    """
    Model representing an individual student's attendance for a session.
    """
    session = models.ForeignKey(
        AttendanceSession, 
        on_delete=models.CASCADE, 
        related_name="records"
    )
    student = models.ForeignKey(
        "core.StudentProfile", 
        on_delete=models.CASCADE, 
        related_name="attendance_records"
    )
    is_present = models.BooleanField(default=False)

    class Meta:
        unique_together = ("session", "student")

    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.student} - {status} ({self.session.date})"
        return f"{self.user.username} - Admin {self.college.name}"


class PlacementOfficerProfile(BaseTimestampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="placement_officer_profile"
    )
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="placement_officers"
    )

    def __str__(self):
        return f"{self.user.username} - Placement Officer {self.college.name}"

def task_attachment_path(instance, filename):
    return f"ycampus/task/{instance.id}/attachments/{filename}"

class Task(models.Model):
    """
    Model representing a task assigned by a faculty to one or more sections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        FacultyProfile, on_delete=models.CASCADE, related_name="assigned_tasks"
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="tasks", null=True, blank=True
    )
    subject = models.ForeignKey(
        "course.Subject", on_delete=models.CASCADE, related_name="tasks"
    )
    unit = models.ForeignKey(
        "course.Unit", on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    sub_unit = models.ForeignKey(
        "course.SubUnit", on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    sections = models.ManyToManyField(
        Section, related_name="tasks"
    )
    task_type = models.CharField(
        max_length=20, 
        choices=[("descriptive", "Descriptive"), ("coding", "Coding")], 
        default="descriptive"
    )
    question_source = models.CharField(
        max_length=20, 
        choices=[("manual", "Manual Entry"), ("bank", "Question Bank")], 
        default="manual"
    )
    questions = models.ManyToManyField(
        "course.Question", related_name="tasks", blank=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    attachment = models.FileField(upload_to=task_attachment_path, max_length=1024, blank=True, null=True)
    is_sent = models.BooleanField(default=False)
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.faculty.user.username}"

def task_submission_path(instance, filename):
    return f"ycampus/task/{instance.task_id}/submissions/{instance.student_id}/{filename}"

class TaskSubmission(BaseTimestampedModel):
    """
    Model representing a student's submission for a task.
    """
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="submissions"
    )
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="task_submissions"
    )
    answer = models.TextField(blank=True, null=True)
    answers_data = models.JSONField(
        default=dict, blank=True, help_text="Stores answers for multiple questions"
    )
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    file = models.FileField(upload_to=task_submission_path, max_length=1024, null=True, blank=True)

    # Review Process Fields
    status = models.CharField(
        max_length=20, 
        choices=[('pending', 'Pending Review'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], 
        default='pending'
    )
    grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    rejection_reason = models.CharField(max_length=100, null=True, blank=True)
    rejection_comment = models.TextField(null=True, blank=True)
    attempt_number = models.IntegerField(default=1)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'FacultyProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_submissions"
    )

    class Meta:
        unique_together = ("task", "student")
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student.user.username} - {self.task.title} (Attempt {self.attempt_number})"

    def save(self, *args, **kwargs):
        if self.is_submitted and self.submitted_at is None:
            self.submitted_at = timezone.now()
        super().save(*args, **kwargs)


def task_submission_history_path(instance, filename):
    return f"ycampus/task/{instance.submission.task_id}/submissions/{instance.submission.student_id}/history/{filename}"

class TaskSubmissionHistory(BaseTimestampedModel):
    """
    Model representing historical attempts for a task submission.
    """
    submission = models.ForeignKey(
        TaskSubmission, on_delete=models.CASCADE, related_name="history"
    )
    attempt_number = models.IntegerField()
    answer = models.TextField(blank=True, null=True)
    answers_data = models.JSONField(default=dict, blank=True)
    file = models.FileField(upload_to=task_submission_history_path, max_length=1024, null=True, blank=True)
    
    status = models.CharField(max_length=20, default='pending')
    grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    rejection_reason = models.CharField(max_length=100, null=True, blank=True)
    rejection_comment = models.TextField(null=True, blank=True)
    
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'FacultyProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_history"
    )

    class Meta:
        ordering = ["-attempt_number"]

    def __str__(self):
        return f"History for {self.submission} - Attempt {self.attempt_number}"

class TaskComment(BaseTimestampedModel):
    """
    Model representing comments/feedback on a task submission.
    """
    submission = models.ForeignKey(
        TaskSubmission, on_delete=models.CASCADE, related_name="comments"
    )
    faculty = models.ForeignKey(
        FacultyProfile, on_delete=models.CASCADE, related_name="task_comments", null=True, blank=True
    )
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="task_comments", null=True, blank=True
    )
    comment = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.faculty.user.username} on {self.submission}"

class Note(models.Model):
    """
    Note model representing user-created notes for personal study.
    Stored in core app to better group user-generated content.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_unit = models.ForeignKey(
        "course.SubUnit",
        on_delete=models.CASCADE,
        related_name="notes",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        # Handle cases where sub_unit might be None if unlinked
        subunit_name = self.sub_unit.name if self.sub_unit else "Unlinked"
        return f"{self.user.username} - {subunit_name} - {self.content[:30]}..."

class Announcement(BaseTimestampedModel):
    """
    Model representing college or department level announcements.
    """
    PRIORITY_CHOICES = [
        ("normal", "Normal"),
        ("important", "Important"),
        ("urgent", "Urgent"),
    ]

    LEVEL_CHOICES = [
        ("college", "College"),
        ("department", "Department"),
        ("batch", "Batch"),
    ]

    title = models.CharField(max_length=255)
    content = models.TextField()
    attachment = models.FileField(upload_to='announcements/attachments/', null=True, blank=True)
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name="announcements"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="announcements",
        null=True,
        blank=True,
        help_text="If null, this is a college-level announcement"
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="announcements",
        null=True,
        blank=True,
        help_text="If set, this is a batch-level announcement"
    )
    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default="college"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="announcements",
        null=True,
        blank=True
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="normal"
    )
    is_active = models.BooleanField(default=True)
    publish_date = models.DateTimeField(null=True, blank=True)
    expiry_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.college.name}"
