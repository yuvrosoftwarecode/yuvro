import uuid
from django.db import models
from django.contrib.auth import get_user_model
from core.models import BaseModel, BaseTimestampedModel

User = get_user_model()


class Company(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    benefits = models.TextField(blank=True, null=True)
    domain = models.CharField(max_length=255, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    size = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name


class Job(BaseModel):
    EMPLOYMENT_TYPE_CHOICES = [
        ("full-time", "Full Time"),
        ("part-time", "Part Time"),
        ("contract", "Contract"),
        ("internship", "Internship"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("paused", "Paused"),
        ("closed", "Closed"),
        ("rejected", "Rejected"),
    ]

    CURRENCY_CHOICES = [
        ("INR", "Indian Rupee"),
        ("USD", "US Dollar"),
        ("EUR", "Euro"),
        ("GBP", "British Pound"),
    ]

    EDUCATION_LEVEL_CHOICES = [
        ("high_school", "High School"),
        ("diploma", "Diploma"),
        ("bachelor", "Bachelor's Degree"),
        ("master", "Master's Degree"),
        ("phd", "PhD"),
        ("any", "Any"),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=255)
    description = models.TextField()

    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES)
    experience_min_years = models.PositiveIntegerField(default=0)
    experience_max_years = models.PositiveIntegerField(blank=True, null=True)

    locations = models.JSONField(default=list, blank=True)
    is_remote = models.BooleanField(default=False)

    min_salary = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    max_salary = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")

    skills = models.JSONField(default=list, blank=True)
    notice_period = models.PositiveIntegerField(
        blank=True, null=True, help_text="Notice period in days"
    )
    education_level = models.CharField(
        max_length=20, choices=EDUCATION_LEVEL_CHOICES, default="any"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    posted_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    screening_questions_config = models.JSONField(default=dict, blank=True)
    screening_questions_random_config = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.title} at {self.company.name}"

    class Meta:
        ordering = ["-created_at"]


class JobApplication(BaseTimestampedModel):
    APPLICATION_STATUS_CHOICES = [
        ("screening_test_completed", "Screening Test Completed"),
        ("under_review", "Under Review"),
        ("shortlisted", "Shortlisted"),
        ("interview_scheduled", "Interview Scheduled"),
        ("interviewed", "Interviewed"),
        ("selected", "Selected"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="job_applications"
    )

    is_bookmarked = models.BooleanField(default=False)
    is_applied = models.BooleanField(default=False)

    cover_letter = models.TextField(blank=True, null=True)
    resume_file = models.FileField(upload_to="resumes/", blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)

    status = models.CharField(
        max_length=31, choices=APPLICATION_STATUS_CHOICES, blank=True, null=True
    )
    applied_at = models.DateTimeField(blank=True, null=True)

    screening_responses = models.JSONField(default=dict, blank=True)

    recruiter_notes = models.TextField(blank=True, null=True)
    feedback = models.TextField(blank=True, null=True)

    interview_scheduled_at = models.DateTimeField(blank=True, null=True)
    interview_feedback = models.TextField(blank=True, null=True)

    expected_salary = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    expected_currency = models.CharField(
        max_length=3, choices=Job.CURRENCY_CHOICES, default="USD"
    )

    available_from = models.DateField(blank=True, null=True)
    notice_period_days = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ["-applied_at"]
        unique_together = ["job", "applicant"]

    def __str__(self):
        return f"{self.applicant.username} applied for {self.job.title} at {self.job.company.name}"


class SocialLinks(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.OneToOneField(
        "authentication.Profile", on_delete=models.CASCADE, related_name="links"
    )

    github = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    portfolio = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Links for {self.profile.user.email}"


class Skill(models.Model):
    level_choices = [
        ("Beginner", "Beginner"),
        ("Intermediate", "Intermediate"),
        ("Advanced", "Advanced"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        "authentication.Profile", on_delete=models.CASCADE, related_name="skills"
    )

    name = models.CharField(max_length=100)
    level = models.CharField(max_length=100, choices=level_choices)
    percentage = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} - {self.profile.user.email}"


class Experience(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        "authentication.Profile", on_delete=models.CASCADE, related_name="experiences"
    )

    company = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    duration = models.CharField(max_length=100)

    description_list = models.JSONField(default=list)
    technologies = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.role} at {self.company}"


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        "authentication.Profile", on_delete=models.CASCADE, related_name="projects"
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    role = models.CharField(max_length=255)

    tech_stack = models.JSONField(default=list)
    github_link = models.URLField(blank=True, null=True)
    live_link = models.URLField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Education(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        "authentication.Profile", on_delete=models.CASCADE, related_name="education"
    )

    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    field = models.CharField(max_length=255)
    duration = models.CharField(max_length=100)
    cgpa = models.CharField(max_length=10, blank=True, null=True)

    start_year = models.IntegerField(blank=True, null=True)
    end_year = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return f"{self.degree} - {self.institution}"


class Certification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        "authentication.Profile",
        on_delete=models.CASCADE,
        related_name="certifications",
    )

    name = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255)
    completion_date = models.CharField(max_length=100)
    certificate_file = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.profile.user.email}"


class JobProfile(models.Model):
    """Extended profile for job-related information"""

    NOTICE_PERIOD_CHOICES = [
        ("immediate", "Immediate"),
        ("15_days", "15 Days"),
        ("30_days", "30 Days"),
        ("60_days", "60 Days"),
        ("90_days", "90 Days"),
    ]

    EMPLOYMENT_TYPE_CHOICES = [
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("internship", "Internship"),
        ("remote", "Remote"),
    ]

    EDUCATION_LEVEL_CHOICES = [
        ("high_school", "High School"),
        ("diploma", "Diploma"),
        ("bachelor", "Bachelor's Degree"),
        ("master", "Master's Degree"),
        ("phd", "PhD"),
    ]

    COMPANY_TYPE_CHOICES = [
        ("startup", "Startup"),
        ("mid_size", "Mid-size Company"),
        ("enterprise", "Enterprise"),
        ("government", "Government"),
        ("non_profit", "Non-profit"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.OneToOneField(
        "authentication.Profile", on_delete=models.CASCADE, related_name="job_profile"
    )

    current_ctc = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    expected_ctc = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    currency = models.CharField(max_length=3, default="INR")

    total_experience_years = models.PositiveIntegerField(default=0)
    total_experience_months = models.PositiveIntegerField(default=0)

    notice_period = models.CharField(
        max_length=20, choices=NOTICE_PERIOD_CHOICES, default="30_days"
    )
    available_from = models.DateField(null=True, blank=True)

    preferred_employment_types = models.JSONField(default=list, blank=True)
    preferred_locations = models.JSONField(default=list, blank=True)
    open_to_remote = models.BooleanField(default=False)

    highest_education = models.CharField(
        max_length=20, choices=EDUCATION_LEVEL_CHOICES, blank=True, null=True
    )
    domain = models.CharField(max_length=100, blank=True, null=True)
    preferred_company_types = models.JSONField(default=list, blank=True)

    is_actively_looking = models.BooleanField(default=True)
    last_active = models.DateTimeField(auto_now=True)

    resume_file = models.URLField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_profile"

    def __str__(self):
        return f"Job Profile - {self.profile.user.email}"

    @property
    def total_experience_in_years(self):
        return self.total_experience_years + (self.total_experience_months / 12)

    @property
    def skills_list(self):
        return [skill.name for skill in self.profile.skills.all()]

    @property
    def experience_companies(self):
        return [exp.company for exp in self.profile.experiences.all()]


class JobSkill(models.Model):
    PROFICIENCY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
        ("expert", "Expert"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_profile = models.ForeignKey(
        JobProfile, on_delete=models.CASCADE, related_name="job_skills"
    )
    skill_name = models.CharField(max_length=100)
    proficiency = models.CharField(max_length=20, choices=PROFICIENCY_CHOICES)
    years_of_experience = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "candidate_job_skill"
        unique_together = ("job_profile", "skill_name")

    def __str__(self):
        return f"{self.skill_name} - {self.proficiency}"


class CandidateSearchLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recruiter = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="candidate_search_logs"
    )
    search_filters = models.JSONField(default=dict)
    results_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "candidate_search_log"

    def __str__(self):
        return f"Search by {self.recruiter.email} - {self.results_count} results"
