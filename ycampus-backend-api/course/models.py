import uuid
from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import BaseTimestampedModel

User = get_user_model()


class Course(models.Model):
    """
    Course model representing a complete learning course.
    """

    CATEGORY_CHOICES = [
        ("fundamentals", "Fundamentals"),
        ("programming_languages", "Programming Languages"),
        ("databases", "Databases"),
        ("ai_tools", "AI Tools"),
        ("web_development", "Web Development"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    short_code = models.CharField(max_length=20, blank=True, null=True, unique=True)
    name = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    instructors = models.ManyToManyField(
        User, through="CourseInstructor", related_name="courses_taught"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "-created_at"]

    def __str__(self):
        if self.short_code:
            return f"{self.short_code}: {self.name}"
        return self.name


class Topic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="topics")
    name = models.CharField(max_length=255)
    order_index = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order_index"]
        unique_together = [
            ["course", "name"]
        ]  # Prevent duplicate topic names within a course

    def save(self, *args, **kwargs):
        if self.order_index is None:
            last = (
                Topic.objects.filter(course=self.course)
                .order_by("-order_index")
                .first()
            )
            self.order_index = (last.order_index + 1) if last else 0

        else:
            conflict = Topic.objects.filter(
                course=self.course, order_index=self.order_index
            ).exclude(id=self.id)

            if conflict.exists():
                Topic.objects.filter(
                    course=self.course, order_index__gte=self.order_index
                ).exclude(id=self.id).update(order_index=models.F("order_index") + 1)

        super().save(*args, **kwargs)


class Subtopic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="subtopics")
    name = models.CharField(max_length=255)
    content = models.TextField(blank=True, null=True)
    order_index = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order_index"]
        unique_together = [
            ["topic", "name"]
        ]  # Prevent duplicate subtopic names within a topic

    def save(self, *args, **kwargs):
        if self.order_index is None:
            last = (
                Subtopic.objects.filter(topic=self.topic)
                .order_by("-order_index")
                .first()
            )
            self.order_index = (last.order_index + 1) if last else 0

        else:
            conflict = Subtopic.objects.filter(
                topic=self.topic, order_index=self.order_index
            ).exclude(id=self.id)

            if conflict.exists():
                Subtopic.objects.filter(
                    topic=self.topic, order_index__gte=self.order_index
                ).exclude(id=self.id).update(order_index=models.F("order_index") + 1)

        super().save(*args, **kwargs)


class Video(models.Model):
    """
    Video model representing video content associated with a subtopic.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_topic = models.ForeignKey(
        Subtopic, on_delete=models.CASCADE, related_name="videos"
    )
    title = models.CharField(max_length=255)
    video_link = models.URLField()
    ai_context = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sub_topic.name} - {self.title}"


class Note(models.Model):
    """
    Note model representing user-created notes for personal study.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_topic = models.ForeignKey(
        Subtopic, on_delete=models.CASCADE, related_name="notes"
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
        return f"{self.user.username} - {self.sub_topic.name} - {self.content[:30]}..."


class CourseInstructor(models.Model):
    """
    Mapping table for assigning multiple instructors to a course.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="course_instructors"
    )

    instructor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="instructor_courses",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("course", "instructor")  # Prevent duplicates
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.instructor.email} → {self.course.name}"

    def clean(self):
        from django.core.exceptions import ValidationError

        # Only users with instructor/admin roles can be linked
        if self.instructor.role not in ["instructor", "admin"]:
            raise ValidationError(
                "Only instructors or admins can be assigned to a course."
            )

    def save(self, *args, **kwargs):
        self.full_clean()  # Validate before saving
        super().save(*args, **kwargs)


class UserCourseProgress(BaseTimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_progress",
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="user_progress"
    )
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name="user_progress",
        null=True,
        blank=True,
    )
    subtopic = models.ForeignKey(
        Subtopic, on_delete=models.CASCADE, related_name="user_progress"
    )

    is_videos_watched = models.BooleanField(
        default=False, help_text="Whether all videos in this subtopic have been watched"
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
        default=False, help_text="Whether this subtopic is fully completed"
    )

    # Continue learning tracking
    is_current_subtopic = models.BooleanField(
        default=False,
        help_text="Whether this is the current subtopic the user is working on",
    )
    last_accessed = models.DateTimeField(
        auto_now=True, help_text="Last time user accessed this subtopic"
    )

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "subtopic")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.username} - {self.subtopic.name} ({self.progress_percent:.1f}%)"

    def calculate_progress(self):
        # Use .all() to leverage prefetch_related if available
        questions = self.subtopic.questions.all()

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
    Unified Question Bank model for storing questions at different levels (course, topic, subtopic)
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
        ("course", "Course Level"),
        ("topic", "Topic Level"),
        ("subtopic", "Subtopic Level"),
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
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questions",
    )
    topic = models.ForeignKey(
        Topic, on_delete=models.CASCADE, null=True, blank=True, related_name="questions"
    )
    subtopic = models.ForeignKey(
        Subtopic,
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
            models.Index(fields=["course", "topic", "subtopic"]),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        # Validate level associations
        if self.level == "course" and not self.course:
            raise ValidationError("Course is required for course-level questions")
        if self.level == "topic" and not self.topic:
            raise ValidationError("Topic is required for topic-level questions")
        if self.level == "subtopic" and not self.subtopic:
            raise ValidationError("Subtopic is required for subtopic-level questions")

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

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="student_code_practices",
        null=True,
        blank=True,
        help_text="Course this submission belongs to",
    )
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name="student_code_practices",
        null=True,
        blank=True,
        help_text="Topic this submission belongs to",
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
