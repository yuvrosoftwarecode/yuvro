from django.db import models
from django.conf import settings
from core.models import BaseModel

class PlannerCompany(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    logo = models.URLField(blank=True, null=True) # or ImageField if uploads are needed later

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Planner Companies"

class PlannerRole(BaseModel):
    DIFFICULTY_CHOICES = [
        ("Easy", "Easy"),
        ("Medium", "Medium"),
        ("Hard", "Hard"),
    ]

    company = models.ForeignKey(PlannerCompany, on_delete=models.CASCADE, related_name="roles")
    title = models.CharField(max_length=255)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default="Medium")
    required_skills = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.title} at {self.company.name}"

class PlannerTopic(BaseModel):
    CATEGORY_CHOICES = [
        ("Technical", "Technical"),
        ("Behavioral", "Behavioral"),
        ("Core Subjects", "Core Subjects"),
    ]
    
    DIFFICULTY_CHOICES = [
        ("Easy", "Easy"),
        ("Medium", "Medium"),
        ("Hard", "Hard"),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="Technical")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default="Medium")
    question_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name

class RoadmapTemplate(BaseModel):
    title = models.CharField(max_length=255)
    duration_days = models.PositiveIntegerField(default=30)
    company = models.ForeignKey(PlannerCompany, on_delete=models.SET_NULL, null=True, blank=True, related_name="roadmaps")
    role = models.ForeignKey(PlannerRole, on_delete=models.SET_NULL, null=True, blank=True, related_name="roadmaps")

    def __str__(self):
        return self.title

class RoadmapTask(BaseModel):
    TASK_TYPE_CHOICES = [
        ("Topic", "Topic Mastery"),
        ("Test", "Practice Test"),
        ("Mock", "Mock Interview"),
    ]

    roadmap = models.ForeignKey(RoadmapTemplate, on_delete=models.CASCADE, related_name="tasks")
    day = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    task_type = models.CharField(max_length=10, choices=TASK_TYPE_CHOICES, default="Topic")
    reference_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID of Topic, Test, or Mock")

    def __str__(self):
        return f"Day {self.day}: {self.title}"
    
    class Meta:
        ordering = ["day", "created_at"]

class PrepTimeline(BaseModel):
    days = models.PositiveIntegerField(unique=True)

    def __str__(self):
        return f"{self.days} Days"

class StudyTime(BaseModel):
    hours = models.PositiveIntegerField(unique=True)

    def __str__(self):
        return f"{self.hours} Hours"

class StudentPlan(BaseModel):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Completed", "Completed"),
        ("Paused", "Paused"),
    ]

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="planner_plans")
    company = models.ForeignKey(PlannerCompany, on_delete=models.CASCADE)
    role = models.ForeignKey(PlannerRole, on_delete=models.CASCADE)
    duration_days = models.PositiveIntegerField()
    daily_hours = models.PositiveIntegerField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="Active")
    progress_percentage = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.role.title} prep for {self.company.name} ({self.student.username})"

class StudentPlanTask(BaseModel):
    TASK_TYPE_CHOICES = [
        ("Topic", "Topic Mastery"),
        ("Test", "Practice Test"),
        ("Mock", "Mock Interview"),
    ]

    plan = models.ForeignKey(StudentPlan, on_delete=models.CASCADE, related_name="tasks")
    day_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    task_type = models.CharField(max_length=10, choices=TASK_TYPE_CHOICES, default="Topic")
    reference_id = models.CharField(max_length=255, blank=True, null=True)
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"Day {self.day_number}: {self.title}"

    class Meta:
        ordering = ["day_number", "created_at"]

