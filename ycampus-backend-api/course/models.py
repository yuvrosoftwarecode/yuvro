import uuid
from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import BaseTimestampedModel, College, Batch, Department, Semester, Section

User = get_user_model()


class Subject(models.Model):
    """
    Subject model representing a complete learning subject.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    yuvro_id = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    short_code = models.CharField(max_length=20, blank=True, null=True, unique=True)
    subject_name = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        if self.short_code:
            return f"{self.short_code}: {self.subject_name}"
        return self.subject_name

    def save(self, *args, **kwargs):
        if not self.yuvro_id:
            last_subject = Subject.objects.all().order_by("-created_at").first()
            if not last_subject:
                self.yuvro_id = "YUVROSUB001"
            else:
                try:
                    # Extract the numeric part of the last yuvro_id
                    last_id_num = int(last_subject.yuvro_id.replace("YUVROSUB", ""))
                    new_id_num = last_id_num + 1
                    self.yuvro_id = f"YUVROSUB{new_id_num:03d}"
                except (ValueError, TypeError):
                    # Fallback if parsing fails
                    self.yuvro_id = f"YUVROSUB{Subject.objects.count() + 1:03d}"

        super().save(*args, **kwargs)


class Unit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="units")
    name = models.CharField(max_length=255)
    order_index = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order_index"]
        unique_together = [
            ["subject", "name"]
        ]  # Prevent duplicate unit names within a subject

    def save(self, *args, **kwargs):
        if self.order_index is None:
            last = (
                Unit.objects.filter(subject=self.subject)
                .order_by("-order_index")
                .first()
            )
            self.order_index = (last.order_index + 1) if last else 0

        else:
            conflict = Unit.objects.filter(
                subject=self.subject, order_index=self.order_index
            ).exclude(id=self.id)

            if conflict.exists():
                Unit.objects.filter(
                    subject=self.subject, order_index__gte=self.order_index
                ).exclude(id=self.id).update(order_index=models.F("order_index") + 1)

        super().save(*args, **kwargs)


class SubUnit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="subunits")
    name = models.CharField(max_length=255)
    content = models.TextField(blank=True, null=True)
    order_index = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order_index"]
        unique_together = [
            ["unit", "name"]
        ]  # Prevent duplicate subunit names within a unit

    def save(self, *args, **kwargs):
        if self.order_index is None:
            last = (
                SubUnit.objects.filter(unit=self.unit)
                .order_by("-order_index")
                .first()
            )
            self.order_index = (last.order_index + 1) if last else 0

        else:
            conflict = SubUnit.objects.filter(
                unit=self.unit, order_index=self.order_index
            ).exclude(id=self.id)

            if conflict.exists():
                SubUnit.objects.filter(
                    unit=self.unit, order_index__gte=self.order_index
                ).exclude(id=self.id).update(order_index=models.F("order_index") + 1)

        super().save(*args, **kwargs)


class Video(models.Model):
    """
    Video model representing video content associated with a subunit.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_unit = models.ForeignKey(
        SubUnit,
        on_delete=models.CASCADE,
        related_name="videos",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    video_link = models.URLField()
    ai_context = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sub_unit.name} - {self.title}"


class Note(models.Model):
    """
    Note model representing user-created notes for personal study.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_unit = models.ForeignKey(
        SubUnit,
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
        return f"{self.user.username} - {self.sub_unit.name} - {self.content[:30]}..."


class CollegeSubject(models.Model):
    """
    Mapping table to store which subjects are assigned to which colleges.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college = models.ForeignKey(
        "core.College", on_delete=models.CASCADE, related_name="college_subjects"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="subject_colleges"
    )
    subject_code = models.CharField(max_length=50, blank=True, null=True, help_text="College-specific subject code")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("college", "subject")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.college.name} - {self.subject.subject_name}"


class SemesterSubject(models.Model):
    """
    Mapping table to assign subjects to a specific semester in a batch.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(
        "core.Semester", on_delete=models.CASCADE, related_name="semester_subjects"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="semester_subjects"
    )
    is_elective = models.BooleanField(default=False)
    is_lab = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("semester", "subject")
        ordering = ["is_elective", "subject__subject_name"]

    def __str__(self):
        return f"{self.semester} - {self.subject.subject_name}"


class UserSubjectProgress(BaseTimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subject_progress",
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="user_progress"
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name="user_progress",
        null=True,
        blank=True,
    )
    sub_unit = models.ForeignKey(
        SubUnit, on_delete=models.CASCADE, related_name="user_progress"
    )

    is_videos_watched = models.BooleanField(
        default=False, help_text="Whether all videos in this subunit have been watched"
    )
    quiz_answers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Quiz answers: {'question_id': {'user_answer': ['A', 'B'], 'correct_answer': ['A', 'C'], 'is_correct': false, 'timestamp': '2024-12-14T10:00:00Z'}}",
    )
    quiz_score = models.FloatField(
        default=0.0, help_text="Quiz score as percentage (0-100)"
    )
    is_quiz_completed = models.BooleanField(
        default=False,
    )

    coding_answers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Coding answers: {'question_id': {'user_code': 'def solution()...', 'language': 'python', 'test_results': {...}, 'is_correct': true, 'timestamp': '2024-12-14T10:00:00Z'}}",
    )
    coding_score = models.FloatField(
        default=0.0, help_text="Coding score as percentage (0-100)"
    )

    is_coding_completed = models.BooleanField(
        default=False,
    )

    progress_percent = models.FloatField(
        default=0.0,
        help_text="Overall progress percentage considering videos + quiz + coding (0-100)",
    )
    is_completed = models.BooleanField(
        default=False, help_text="Whether this subunit is fully completed"
    )

    # Continue learning tracking
    is_current_subunit = models.BooleanField(
        default=False,
        help_text="Whether this is the current subunit the user is working on",
    )
    last_accessed = models.DateTimeField(
        auto_now=True, help_text="Last time user accessed this subunit"
    )

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "sub_unit")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.username} - {self.sub_unit.name} ({self.progress_percent:.1f}%)"

    def calculate_progress(self):
        # Use .all() to leverage prefetch_related if available
        questions = self.sub_unit.questions.all()

        has_quiz = any(q.type in ["mcq_single", "mcq_multiple"] for q in questions)
        has_coding = any(q.type == "coding" for q in questions)

        w_video = 20.0
        w_quiz = 30.0 if has_quiz else 0.0
        w_coding = 50.0 if has_coding else 0.0

        total_weight = w_video + w_quiz + w_coding

        if total_weight == 0:
            return 100.0 if self.is_videos_watched else 0.0

        current_score = 0.0

        if self.is_videos_watched:
            current_score += w_video

        if has_quiz and self.is_quiz_completed:
            current_score += w_quiz * (self.quiz_score / 100.0)

        if has_coding:
            current_score += w_coding * (self.coding_score / 100.0)

        self.progress_percent = round((current_score / total_weight) * 100.0, 2)

        self.is_completed = self.progress_percent >= 99.0

        return self.progress_percent


class Question(models.Model):
    """
    Unified Question Bank model for storing questions at different levels (subject, unit, subunit)
    Supports MCQ, Coding, and Descriptive question types with multiple categories
    """

    QUESTION_TYPES = [
        ("mcq_single", "MCQ - Single Answer"),
        ("mcq_multiple", "MCQ - Multiple Answers"),
        ("coding", "Coding Problem"),
        ("descriptive", "Descriptive Question"),
    ]

    DIFFICULTY_LEVELS = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    QUESTION_LEVELS = [
        ("subject", "Subject Level"),
        ("unit", "Unit Level"),
        ("subunit", "SubUnit Level"),
    ]

    QUESTION_CATEGORIES = [
        ("learn", "Learn"),
        ("practice", "Practice Questions"),
        ("skill_test", "Skill Test"),
        ("contest", "Contest"),
        ("mock_interview", "Mock Interview"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Question basic info
    type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    title = models.CharField(max_length=500)
    content = models.TextField()

    # Level and associations
    level = models.CharField(max_length=20, choices=QUESTION_LEVELS)
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questions",
    )
    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE, null=True, blank=True, related_name="questions"
    )
    sub_unit = models.ForeignKey(
        SubUnit,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questions",
    )

    # Question properties
    difficulty = models.CharField(
        max_length=10, choices=DIFFICULTY_LEVELS, default="easy"
    )
    marks = models.PositiveIntegerField(default=1)
    categories = models.JSONField(
        default=list,
        help_text="List of categories this question belongs to (learn, practice, skill_test, contest)",
    )

    # MCQ specific fields
    mcq_options = models.JSONField(
        null=True,
        blank=True,
        help_text="Options for MCQ questions with answer info. Format: [{'text': 'Option 1', 'is_correct': True}, {'text': 'Option 2', 'is_correct': False}]",
    )

    # Coding specific fields
    test_cases_basic = models.JSONField(
        null=True, blank=True, help_text="Basic test cases visible to students"
    )
    test_cases_advanced = models.JSONField(
        default=list, blank=True, help_text="Advanced test cases for evaluation"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_questions"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["type", "level"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["subject", "unit", "sub_unit"]),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        # Validate level associations
        if self.level == "subject" and not self.subject:
            raise ValidationError("Subject is required for subject-level questions")
        if self.level == "unit" and not self.unit:
            raise ValidationError("Unit is required for unit-level questions")
        if self.level == "subunit" and not self.sub_unit:
            raise ValidationError("SubUnit is required for subunit-level questions")

        # Validate categories
        if self.categories:
            valid_categories = [choice[0] for choice in self.QUESTION_CATEGORIES]
            for category in self.categories:
                if category not in valid_categories:
                    raise ValidationError(f"Invalid category: {category}")

        # Validate MCQ fields
        if self.type in ["mcq_single", "mcq_multiple"]:
            if (
                not self.mcq_options
                or not isinstance(self.mcq_options, list)
                or len(self.mcq_options) < 2
            ):
                raise ValidationError("MCQ questions must have at least 2 options")

            # Validate option structure and ensure at least one correct answer
            correct_count = 0
            for i, option in enumerate(self.mcq_options):
                if not isinstance(option, dict):
                    raise ValidationError(
                        f"Option {i+1} must be a dictionary with 'text' and 'is_correct' keys"
                    )
                if "text" not in option or "is_correct" not in option:
                    raise ValidationError(
                        f"Option {i+1} must have 'text' and 'is_correct' keys"
                    )
                if not isinstance(option["text"], str) or not option["text"].strip():
                    raise ValidationError(
                        f"Option {i+1} text must be a non-empty string"
                    )
                if not isinstance(option["is_correct"], bool):
                    raise ValidationError(
                        f"Option {i+1} 'is_correct' must be a boolean"
                    )
                if option["is_correct"]:
                    correct_count += 1

            if correct_count == 0:
                raise ValidationError(
                    "MCQ questions must have at least one correct answer"
                )

            # Validate single vs multiple answer constraints
            if self.type == "mcq_single" and correct_count > 1:
                raise ValidationError(
                    "Single-answer MCQ questions can only have one correct answer"
                )
            elif self.type == "mcq_multiple" and correct_count < 2:
                raise ValidationError(
                    "Multiple-answer MCQ questions must have at least 2 correct answers"
                )

        # Validate coding fields
        if self.type == "coding":
            if (
                not self.test_cases_basic
                or not isinstance(self.test_cases_basic, list)
                or len(self.test_cases_basic) == 0
            ):
                raise ValidationError(
                    "Coding questions must have at least 1 basic test case"
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.type.upper()}: {self.title[:50]}..."


class StudentCodePractice(BaseTimestampedModel):
    """
    Model for tracking student code practice submissions for learn and practice contexts
    """

    STATUS_STARTED = "started"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_SUBMITTED = "submitted"
    STATUS_EVALUATED = "evaluated"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_STARTED, "Started"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_EVALUATED, "Evaluated"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    QUESTION_TYPES = [
        ("mcq_single", "MCQ - Single Answer"),
        ("mcq_multiple", "MCQ - Multiple Answers"),
        ("coding", "Coding Problem"),
        ("descriptive", "Descriptive Question"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="student_code_practices"
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="student_code_practices",
        help_text="The coding question being solved",
    )

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="student_code_practices",
        null=True,
        blank=True,
        help_text="Subject this submission belongs to",
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name="student_code_practices",
        null=True,
        blank=True,
        help_text="Unit this submission belongs to",
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_STARTED
    )

    answer_latest = models.JSONField(
        default=dict,
        blank=True,
        help_text="Latest answer content including code, language, and test cases",
    )
    answer_history = models.JSONField(
        default=list,
        blank=True,
        help_text="Complete submission history: [{'timestamp': '2024-12-14T10:05:00Z', 'answer_data': {...}, 'is_auto_save': false, 'execution_results': {...}}]",
    )
    
    answer_attempt_count = models.IntegerField(default=0, help_text="Number of times answer was modified")
    ai_help_count = models.IntegerField(default=0, help_text="Number of times AI help was used")
    
    execution_output = models.TextField(blank=True, help_text="Code execution output")

    plagiarism_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Plagiarism check results: {'is_plagiarized': true, 'similarity_score': 0.95, 'matched_with': 'submission_id'}",
    )

    evaluation_results = models.JSONField(
        default=dict, blank=True, help_text="Detailed test case results"
    )
    marks_obtained = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["user", "question"]

    def __str__(self):
        language = (
            self.answer_latest.get("language", "Unknown")
            if self.answer_latest
            else "Unknown"
        )
        success_rate = 0.0
        if self.evaluation_results:
            total_tests = self.evaluation_results.get("total_tests", 0)
            total_passed = self.evaluation_results.get("total_passed", 0)
            if total_tests > 0:
                success_rate = (total_passed / total_tests) * 100
        return f"{self.user.username} - {self.question.title[:30]} - {language} ({success_rate:.1f}%)"


class SectionSubjectFaculty(BaseTimestampedModel):
    """
    Mapping table to assign a faculty member to a specific subject for a specific section.
    """
    semester_subject = models.ForeignKey(
        SemesterSubject, on_delete=models.CASCADE, related_name="section_faculties"
    )
    section = models.ForeignKey(
        "core.Section", on_delete=models.CASCADE, related_name="subject_faculties"
    )
    faculty = models.ForeignKey(
        "core.FacultyProfile", on_delete=models.CASCADE, related_name="section_subjects"
    )

    class Meta:
        unique_together = ("semester_subject", "section", "faculty")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.section.name} - {self.semester_subject.subject.subject_name} - {self.faculty.user.username}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        # Link the faculty to the department of the batch, if it's different
        if is_new and self.semester_subject.semester.batch and self.semester_subject.semester.batch.department:
            dept = self.semester_subject.semester.batch.department
            if self.faculty.department != dept and not self.faculty.linked_departments.filter(id=dept.id).exists():
                self.faculty.linked_departments.add(dept)


