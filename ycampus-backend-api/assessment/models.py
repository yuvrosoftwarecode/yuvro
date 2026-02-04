import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import BaseModel, BaseTimestampedModel
from course.models import Question

User = get_user_model()


class BaseAssessmentModel(BaseModel):
    DIFFICULTY_EASY = "easy"
    DIFFICULTY_MEDIUM = "medium"
    DIFFICULTY_HARD = "hard"
    DIFFICULTY_CHOICES = [
        (DIFFICULTY_EASY, "Easy"),
        (DIFFICULTY_MEDIUM, "Medium"),
        (DIFFICULTY_HARD, "Hard"),
    ]

    PUBLISH_STATUS_DRAFT = "draft"
    PUBLISH_STATUS_ACTIVE = "active"
    PUBLISH_STATUS_INACTIVE = "inactive"
    PUBLISH_STATUS_ARCHIVED = "archived"
    PUBLISH_STATUS_CHOICES = [
        (PUBLISH_STATUS_DRAFT, "Draft"),
        (PUBLISH_STATUS_ACTIVE, "Active"),
        (PUBLISH_STATUS_INACTIVE, "Inactive"),
        (PUBLISH_STATUS_ARCHIVED, "Archived"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=10, choices=DIFFICULTY_CHOICES, default=DIFFICULTY_MEDIUM
    )

    duration = models.IntegerField(default=60, help_text="Duration in minutes")
    total_marks = models.IntegerField(default=100)
    passing_marks = models.IntegerField(default=60)
    enable_proctoring = models.BooleanField(default=False)
    total_attempts = models.PositiveIntegerField(
        default=0, help_text="Total number of attempts made"
    )
    max_attempts = models.PositiveIntegerField(
        default=3, help_text="Maximum number of attempts allowed per user"
    )

    questions_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Questions configuration by category: {'mcq_single': ['uuid1', 'uuid2'], 'mcq_multiple': ['uuid3'], 'coding': ['uuid4'], 'descriptive': ['uuid5']}",
    )

    questions_random_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Random question configuration: {'mcq_single': 5, 'mcq_multiple': 3, 'coding': 2, 'descriptive': 1}",
    )

    publish_status = models.CharField(
        max_length=20, choices=PUBLISH_STATUS_CHOICES, default=PUBLISH_STATUS_DRAFT
    )

    class Meta:
        abstract = True


class SkillTest(BaseAssessmentModel):
    course = models.ForeignKey(
        "course.Course",
        on_delete=models.CASCADE,
        related_name="skill_test_assessments",
        help_text="Course this skill test belongs to",
        null=True,
        blank=True,
    )
    topic = models.ForeignKey(
        "course.Topic",
        on_delete=models.CASCADE,
        related_name="skill_test_assessments",
        null=True,
        blank=True,
        help_text="Specific topic within the course (optional)",
    )

    def __str__(self):
        return f"{self.title} - {self.course.name if self.course else 'No Course'} ({self.topic.name if self.topic else 'All Topics'})"


class Contest(BaseAssessmentModel):
    TYPE_COMPANY = "company"
    TYPE_COLLEGE = "college"
    TYPE_CHOICES = [
        (TYPE_COMPANY, "Company"),
        (TYPE_COLLEGE, "College"),
    ]

    STATUS_UPCOMING = "upcoming"
    STATUS_ONGOING = "ongoing"
    STATUS_PAST = "past"
    STATUS_CHOICES = [
        (STATUS_UPCOMING, "Upcoming"),
        (STATUS_ONGOING, "Ongoing"),
        (STATUS_PAST, "Past"),
    ]

    organizer = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_COMPANY)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_UPCOMING
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    prize = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ["-start_datetime"]

    def __str__(self):
        return f"{self.title} ({self.organizer})"

    def update_status(self):
        now = timezone.now()
        if self.start_datetime <= now <= self.end_datetime:
            self.status = self.STATUS_ONGOING
        elif now < self.start_datetime:
            self.status = self.STATUS_UPCOMING
        else:
            self.status = self.STATUS_PAST
        return self.status


class MockInterview(BaseModel):
    PUBLISH_STATUS_DRAFT = "draft"
    PUBLISH_STATUS_ACTIVE = "active"
    PUBLISH_STATUS_INACTIVE = "inactive"
    PUBLISH_STATUS_ARCHIVED = "archived"
    PUBLISH_STATUS_CHOICES = [
        (PUBLISH_STATUS_DRAFT, "Draft"),
        (PUBLISH_STATUS_ACTIVE, "Active"),
        (PUBLISH_STATUS_INACTIVE, "Inactive"),
        (PUBLISH_STATUS_ARCHIVED, "Archived"),
    ]

    AI_GEN_FULL = "full_ai"
    AI_GEN_MIXED = "mixed"
    AI_GEN_PREDEFINED = "predefined"
    AI_GEN_CHOICES = [
        (AI_GEN_FULL, "Full AI Generated"),
        (AI_GEN_MIXED, "Mixed (AI + Predefined)"),
        (AI_GEN_PREDEFINED, "Predefined Questions Only"),
    ]

    VOICE_JUNNU = "junnu"
    VOICE_MUNNU = "munnu"
    VOICE_CHOICES = [
        (VOICE_JUNNU, "Junnu (Male IN)"),
        (VOICE_MUNNU, "Munnu (Female US)"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)

    max_duration = models.IntegerField(
        default=30, help_text="Maximum duration in minutes"
    )

    # Skills Configuration
    required_skills = models.JSONField(
        default=list, blank=True, help_text="List of required skills"
    )
    optional_skills = models.JSONField(
        default=list, blank=True, help_text="List of optional skills"
    )

    # AI Configuration
    ai_generation_mode = models.CharField(
        max_length=20, choices=AI_GEN_CHOICES, default=AI_GEN_FULL
    )
    ai_verbal_question_count = models.IntegerField(
        default=5, help_text="Number of verbal questions AI should ask"
    )
    ai_coding_question_count = models.IntegerField(
        default=1, help_text="Number of coding questions AI should ask"
    )
    ai_percentage = models.IntegerField(
        default=100, help_text="Percentage of AI generated questions (0-100)"
    )

    # Voice Configuration
    voice_type = models.CharField(
        max_length=20, choices=VOICE_CHOICES, default=VOICE_JUNNU
    )  # Deprecated
    interviewer_name = models.CharField(
        max_length=100, default="Junnu", help_text="Name of the AI interviewer"
    )
    interviewer_voice_id = models.CharField(
        max_length=255, blank=True, default="", help_text="Specific voice ID for TTS"
    )

    voice_speed = models.FloatField(
        default=1.0, help_text="Voice playback speed (0.5 to 2.0)"
    )
    audio_settings = models.JSONField(
        default=dict, blank=True, help_text="Additional audio settings"
    )

    # Standard Configuration (retained from BaseAssessmentModel)
    questions_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Questions configuration by category: {'mcq_single': ['uuid1'], ...}",
    )

    questions_random_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Random question configuration: {'mcq_single': 5, ...}",
    )

    publish_status = models.CharField(
        max_length=20, choices=PUBLISH_STATUS_CHOICES, default=PUBLISH_STATUS_DRAFT
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_ai_generation_mode_display()})"


class JobTest(BaseAssessmentModel):
    TYPE_CODING = "coding"
    TYPE_SYSTEM_DESIGN = "system_design"
    TYPE_APTITUDE = "aptitude"
    TYPE_BEHAVIORAL = "behavioral"
    TYPE_DOMAIN_SPECIFIC = "domain_specific"
    TYPE_CHOICES = [
        (TYPE_CODING, "Coding"),
        (TYPE_SYSTEM_DESIGN, "System Design"),
        (TYPE_APTITUDE, "Aptitude"),
        (TYPE_BEHAVIORAL, "Behavioral"),
        (TYPE_DOMAIN_SPECIFIC, "Domain Specific"),
    ]

    company_name = models.CharField(max_length=255)
    position_title = models.CharField(max_length=255)
    start_datetime = models.DateTimeField(null=True, blank=True)
    end_datetime = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.company_name} ({self.position_title})"


class BaseUserSubmission(BaseTimestampedModel):
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

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="%(class)s_submissions"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_STARTED
    )
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    general_events = models.JSONField(
        default=list,
        blank=True,
        help_text="General submission events: session start/end, navigation, browser info, etc.",
    )

    proctoring_events = models.JSONField(
        default=list,
        blank=True,
        help_text="Proctoring events: camera/mic status, face detection, violations, etc.",
    )

    browser_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    marks = models.FloatField(null=True, blank=True)

    class Meta:
        abstract = True


class SkillTestSubmission(BaseUserSubmission):
    skill_test = models.ForeignKey(
        SkillTest, on_delete=models.CASCADE, related_name="skill_test_submissions"
    )

    class Meta:
        ordering = ["-created_at"]
        # Removed unique_together to allow multiple attempts (up to 3) per user per test

    def __str__(self):
        return f"{self.user.username} - {self.skill_test.title}"


class ContestSubmission(BaseUserSubmission):
    contest = models.ForeignKey(
        Contest, on_delete=models.CASCADE, related_name="contest_submissions"
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["user", "contest"]

    def __str__(self):
        return f"{self.user.username} - {self.contest.title}"


class MockInterviewSubmission(BaseUserSubmission):
    EXP_LEVEL_INTERN = "intern"
    EXP_LEVEL_BEGINNER = "beginner"
    EXP_LEVEL_INTERMEDIATE = "1_3_years"
    EXP_LEVEL_EXPERIENCED = "3_plus_years"

    EXP_LEVEL_CHOICES = [
        (EXP_LEVEL_INTERN, "Intern"),
        (EXP_LEVEL_BEGINNER, "Beginner (0-1 years)"),
        (EXP_LEVEL_INTERMEDIATE, "Intermediate (1-3 years)"),
        (EXP_LEVEL_EXPERIENCED, "Experienced (3+ years)"),
    ]

    mock_interview = models.ForeignKey(
        MockInterview,
        on_delete=models.CASCADE,
        related_name="mock_interview_submissions",
    )
    experience_level = models.CharField(
        max_length=20,
        choices=EXP_LEVEL_CHOICES,
        default=EXP_LEVEL_BEGINNER,
        help_text="Candidate's self-declared experience level for this interview",
    )
    selected_duration = models.IntegerField(
        default=0, help_text="Duration selected by the user in minutes"
    )

    resume = models.FileField(upload_to="resumes/", null=True, blank=True)
    chat_session = models.OneToOneField(
        "ai_assistant.ChatSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mock_interview_submission",
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["user", "mock_interview"]

    def __str__(self):
        return f"{self.user.username} - {self.mock_interview.title} ({self.get_experience_level_display()})"


class JobTestSubmission(BaseUserSubmission):
    job_test = models.ForeignKey(
        JobTest, on_delete=models.CASCADE, related_name="job_test_submissions"
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["user", "job_test"]

    def __str__(self):
        return f"{self.user.username} - {self.job_test.title}"


class BaseQuestionActivity(BaseTimestampedModel):
    QUESTION_ACTIVITY_TYPES = [
        ("question_viewed", "Question Viewed"),
        ("answer_started", "Answer Started"),
        ("answer_changed", "Answer Changed"),
        ("answer_submitted", "Answer Submitted"),
        ("question_skipped", "Question Skipped"),
        ("question_flagged", "Question Flagged"),
        ("question_unflagged", "Question Unflagged"),
        ("time_warning", "Time Warning Shown"),
        ("hint_requested", "Hint Requested"),
        ("solution_viewed", "Solution Viewed"),
    ]

    NAVIGATION_ACTIVITY_TYPES = [
        ("tab_switched", "Tab Switched"),
        ("window_blur", "Window Lost Focus"),
        ("window_focus", "Window Gained Focus"),
        ("fullscreen_exit", "Fullscreen Exited"),
        ("fullscreen_enter", "Fullscreen Entered"),
        ("browser_minimize", "Browser Minimized"),
        ("browser_restore", "Browser Restored"),
        ("page_reload", "Page Reloaded"),
        ("navigation_attempt", "Navigation Attempt"),
        ("back_button_pressed", "Back Button Pressed"),
    ]

    PROCTORING_ACTIVITY_TYPES = [
        ("copy_detected", "Copy Action Detected"),
        ("paste_detected", "Paste Action Detected"),
        ("right_click_detected", "Right Click Detected"),
        ("keyboard_shortcut", "Keyboard Shortcut Used"),
        ("camera_enabled", "Camera Enabled"),
        ("camera_disabled", "Camera Disabled"),
        ("microphone_enabled", "Microphone Enabled"),
        ("microphone_disabled", "Microphone Disabled"),
        ("screen_share_started", "Screen Share Started"),
        ("screen_share_ended", "Screen Share Ended"),
        ("face_not_detected", "Face Not Detected"),
        ("multiple_faces_detected", "Multiple Faces Detected"),
        ("face_recognition_failed", "Face Recognition Failed"),
        ("suspicious_movement", "Suspicious Movement"),
        ("audio_anomaly", "Audio Anomaly Detected"),
        ("network_disconnection", "Network Disconnected"),
        ("network_reconnection", "Network Reconnected"),
        ("violation_warning", "Violation Warning Issued"),
        ("violation_critical", "Critical Violation"),
        ("manual_flag", "Manually Flagged by Proctor"),
        ("suspicious_activity", "Suspicious Activity"),
        ("device_change", "Device Change Detected"),
        ("external_monitor", "External Monitor Detected"),
    ]

    ALERT_PRIORITY_LEVELS = [
        ("info", "Informational"),
        ("low", "Low Priority"),
        ("medium", "Medium Priority"),
        ("high", "High Priority"),
        ("critical", "Critical Priority"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="%(class)s_question_activities"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="%(class)s_question_activities"
    )

    question_activities = models.JSONField(
        default=list,
        blank=True,
        help_text="Question-specific activities: [{'timestamp': '2024-12-14T10:00:00Z', 'activity_type': 'question_viewed', 'meta_data': {...}}]",
    )

    navigation_activities = models.JSONField(
        default=list,
        blank=True,
        help_text="Navigation and focus activities: [{'timestamp': '2024-12-14T10:01:00Z', 'activity_type': 'tab_switched', 'meta_data': {...}}]",
    )

    proctoring_activities = models.JSONField(
        default=list,
        blank=True,
        help_text="Proctoring events: [{'timestamp': '2024-12-14T10:02:00Z', 'activity_type': 'face_not_detected', 'meta_data': {...}}]",
    )

    camera_snapshots = models.JSONField(
        default=list,
        blank=True,
        help_text="Camera snapshot image paths with timestamps: [{'timestamp': '2024-12-14T10:00:00Z', 'image_path': '/media/snapshots/user123_q456_20241214100000.jpg', 'meta_data': {...}}]",
    )

    alert_priority = models.CharField(
        max_length=10,
        choices=ALERT_PRIORITY_LEVELS,
        default="info",
        help_text="Priority level for alerts and violations",
    )

    answer_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Current answer content based on question type (MCQ selections, code, descriptive text)",
    )

    answer_history = models.JSONField(
        default=list,
        blank=True,
        help_text="Answer change history: [{'timestamp': '2024-12-14T10:05:00Z', 'answer_data': {...}, 'is_auto_save': true}]",
    )

    is_final_answer = models.BooleanField(
        default=False, help_text="Whether the current answer is final/submitted"
    )
    answer_attempt_count = models.IntegerField(
        default=0, help_text="Number of times answer was modified"
    )

    plagiarism_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Plagiarism check results: {'is_plagiarized': true, 'similarity_score': 0.95, 'matched_with': 'submission_id'}",
    )

    marks_obtained = models.FloatField(null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    auto_graded = models.BooleanField(default=False)
    graded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="graded_%(class)s_question_activities",
    )
    graded_at = models.DateTimeField(null=True, blank=True)
    grading_feedback = models.TextField(blank=True)

    session_id = models.CharField(
        max_length=100, blank=True, help_text="Browser session identifier"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    total_question_time = models.IntegerField(
        default=0, help_text="Total time spent on this question in seconds"
    )
    violation_count = models.IntegerField(
        default=0, help_text="Total number of violations for this question"
    )
    last_activity_timestamp = models.DateTimeField(null=True, blank=True)

    has_violations = models.BooleanField(default=False)
    violations_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_%(class)s_question_activities",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        abstract = True
        ordering = ["-updated_at"]


class SkillTestQuestionActivity(BaseQuestionActivity):
    skill_test_submission = models.ForeignKey(
        SkillTestSubmission,
        on_delete=models.CASCADE,
        related_name="skill_test_question_activities",
    )

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ["skill_test_submission", "question"]

    def __str__(self):
        return f"{self.user.username} - {self.question.title[:30]} - {'Final' if self.is_final_answer else 'Draft'}"


class ContestQuestionActivity(BaseQuestionActivity):
    contest_submission = models.ForeignKey(
        ContestSubmission,
        on_delete=models.CASCADE,
        related_name="contest_question_activities",
    )

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ["contest_submission", "question"]

    def __str__(self):
        return f"{self.user.username} - {self.question.title[:30]} - {'Final' if self.is_final_answer else 'Draft'}"


class MockInterviewQuestionActivity(BaseQuestionActivity):
    mock_interview_submission = models.ForeignKey(
        MockInterviewSubmission,
        on_delete=models.CASCADE,
        related_name="mock_interview_question_activities",
    )

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ["mock_interview_submission", "question"]

    def __str__(self):
        return f"{self.user.username} - {self.question.title[:30]} - {'Final' if self.is_final_answer else 'Draft'}"


class JobTestQuestionActivity(BaseQuestionActivity):
    job_test_submission = models.ForeignKey(
        JobTestSubmission,
        on_delete=models.CASCADE,
        related_name="job_test_question_activities",
    )

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ["job_test_submission", "question"]

    def __str__(self):
        return f"{self.user.username} - {self.question.title[:30]} - {'Final' if self.is_final_answer else 'Draft'}"


class CertificationExam(BaseAssessmentModel):
    course = models.ForeignKey(
        "course.Course",
        on_delete=models.CASCADE,
        related_name="certification_exams",
        help_text="Course this certification exam belongs to",
    )
    
    start_datetime = models.DateTimeField(null=True, blank=True, help_text="When the exam becomes available")
    end_datetime = models.DateTimeField(null=True, blank=True, help_text="When the exam expires")
    
    certificate_template = models.CharField(max_length=255, blank=True, help_text="Path to certificate template image/pdf")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Certification: {self.course.name}"


class CertificationSubmission(BaseUserSubmission):
    certification_exam = models.ForeignKey(
        CertificationExam,
        on_delete=models.CASCADE,
        related_name="certification_submissions",
    )
    
    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.certification_exam.course.name}"


class CertificationQuestionActivity(BaseQuestionActivity):
    certification_submission = models.ForeignKey(
        CertificationSubmission,
        on_delete=models.CASCADE,
        related_name="certification_question_activities",
    )

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ["certification_submission", "question"]

    def __str__(self):
        return f"{self.user.username} - {self.question.title[:30]}"


class Certificate(BaseTimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey("course.Course", on_delete=models.CASCADE, related_name="certificates")
    certification_exam = models.ForeignKey(CertificationExam, on_delete=models.SET_NULL, null=True, related_name="issued_certificates")
    submission = models.OneToOneField(CertificationSubmission, on_delete=models.SET_NULL, null=True, related_name="certificate")
    
    issued_at = models.DateTimeField(auto_now_add=True)
    certificate_url = models.URLField(blank=True, help_text="URL to downloaded certificate")
    certificate_id = models.CharField(max_length=50, unique=True, help_text="Unique certificate identifier")
    
    class Meta:
        ordering = ["-issued_at"]
        
    def __str__(self):
        return f"Certificate: {self.user.username} - {self.course.name}"

    def save(self, *args, **kwargs):
        if not self.certificate_id:
            # Generate a simple unique ID: YUVRO-YYYY-RANDOM
            import random
            import string
            year = timezone.now().year
            rand_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            self.certificate_id = f"YUVRO-{year}-{rand_str}"
        super().save(*args, **kwargs)
