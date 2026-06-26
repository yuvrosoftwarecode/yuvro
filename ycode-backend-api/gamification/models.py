from django.db import models
from django.conf import settings
from django.utils import timezone


class UserGamificationProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gamification_profile",
        db_constraint=False
    )
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    total_xp = models.IntegerField(default=0)
    current_level = models.IntegerField(default=1)
    # Activity counters for badge evaluation
    total_problems_solved = models.IntegerField(default=0)
    total_quizzes_passed = models.IntegerField(default=0)
    total_lessons_completed = models.IntegerField(default=0)
    total_courses_completed = models.IntegerField(default=0)
    # Streak freeze: users get 1 free freeze per week (replenishes Monday)
    streak_freezes_remaining = models.IntegerField(default=1)
    last_freeze_replenish = models.DateField(null=True, blank=True)
    # Re-engagement tracking
    days_missed = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "course_usergamificationprofile"

    def __str__(self):
        return f"{self.user.username} - Lvl {self.current_level} (Streak: {self.current_streak})"


class DailyUserActivity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_activities",
        db_constraint=False
    )
    date = models.DateField(default=timezone.now)
    activity_count = models.IntegerField(default=0)
    # Per-type counters for XP cap enforcement
    video_count = models.IntegerField(default=0)
    quiz_count = models.IntegerField(default=0)
    coding_count = models.IntegerField(default=0)

    class Meta:
        db_table = "course_dailyuseractivity"
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date} ({self.activity_count})"


class Badge(models.Model):
    CATEGORY_STREAK = 'streak'
    CATEGORY_XP = 'xp'
    CATEGORY_CODING = 'coding'
    CATEGORY_LEARNING = 'learning'
    CATEGORY_QUIZ = 'quiz'

    CATEGORY_CHOICES = [
        (CATEGORY_STREAK, 'Streak'),
        (CATEGORY_XP, 'XP'),
        (CATEGORY_CODING, 'Coding'),
        (CATEGORY_LEARNING, 'Learning'),
        (CATEGORY_QUIZ, 'Quiz'),
    ]

    key = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    icon = models.CharField(max_length=50, default='trophy')  # lucide icon name
    xp_reward = models.IntegerField(default=0)

    class Meta:
        ordering = ['category', 'key']

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="badges",
        db_constraint=False
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="user_badges")
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']

    def __str__(self):
        return f"{self.user.username} — {self.badge.name}"


class Mission(models.Model):
    """Template for a daily mission type."""
    TYPE_SOLVE_PROBLEMS = 'solve_problems'
    TYPE_COMPLETE_LESSONS = 'complete_lessons'
    TYPE_PASS_QUIZZES = 'pass_quizzes'
    TYPE_EARN_XP = 'earn_xp'
    TYPE_MAINTAIN_STREAK = 'maintain_streak'

    TYPE_CHOICES = [
        (TYPE_SOLVE_PROBLEMS, 'Solve Problems'),
        (TYPE_COMPLETE_LESSONS, 'Complete Lessons'),
        (TYPE_PASS_QUIZZES, 'Pass Quizzes'),
        (TYPE_EARN_XP, 'Earn XP'),
        (TYPE_MAINTAIN_STREAK, 'Maintain Streak'),
    ]

    key = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=300)
    mission_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    target = models.IntegerField()          # e.g. 2 problems, 20 XP
    xp_reward = models.IntegerField(default=25)
    icon = models.CharField(max_length=50, default='target')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['mission_type', 'key']

    def __str__(self):
        return self.title


class UserMission(models.Model):
    """A mission assigned to a user for a specific day."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_missions',
        db_constraint=False
    )
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='user_missions')
    date = models.DateField(default=timezone.now)
    progress = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    xp_awarded = models.BooleanField(default=False)

    class Meta:
        unique_together = ['user', 'mission', 'date']
        ordering = ['-date', 'mission__mission_type']

    def __str__(self):
        return f"{self.user.username} — {self.mission.title} ({self.date})"
