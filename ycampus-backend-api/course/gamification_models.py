from django.db import models
from django.conf import settings
from django.utils import timezone
import datetime

class UserGamificationProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gamification_profile"
    )
    
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    total_xp = models.IntegerField(default=0)
    current_level = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - Lvl {self.current_level} (Streak: {self.current_streak})"


class DailyUserActivity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_activities"
    )
    date = models.DateField(default=timezone.now)
    activity_count = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']
        
    def __str__(self):
        return f"{self.user.username} - {self.date} ({self.activity_count})"
