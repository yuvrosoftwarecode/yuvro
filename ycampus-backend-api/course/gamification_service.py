from django.utils import timezone
from .gamification_models import UserGamificationProfile, DailyUserActivity
import datetime

class GamificationService:
    # XP Values
    XP_VIDEO = 10
    XP_QUIZ = 20
    XP_CODING = 50
    XP_COURSE_COMPLETION = 500
    
    # Leveling: Level N requires 100 * N XP (Simple progression)
    # Or strict table:
    # Lvl 1: 0-100
    # Lvl 2: 101-300 (needs 200)
    # Lvl 3: 301-600 (needs 300)
    
    @staticmethod
    def get_or_create_profile(user):
        profile, created = UserGamificationProfile.objects.get_or_create(user=user)
        return profile
    
    @classmethod
    def update_streak(cls, user):
        """
        Call this whenever a user performs a learning activity.
        Logic:
        - If last activity was today: Do nothing.
        - If last activity was yesterday: Increment streak.
        - If last activity was before yesterday: Reset streak to 1.
        """
        profile = cls.get_or_create_profile(user)
        today = timezone.now().date()
        last_date = profile.last_activity_date
        
        if last_date == today:
            return  # Already counted for today
        
        if last_date == today - datetime.timedelta(days=1):
            # Consecutive day
            profile.current_streak += 1
        else:
            # Streak broken or first time
            profile.current_streak = 1
            
        # Update longest streak
        if profile.current_streak > profile.longest_streak:
            profile.longest_streak = profile.current_streak
            
        profile.last_activity_date = today
        profile.save()
        
    @classmethod
    def award_xp(cls, user, amount):
        """
        Add XP to user and check for level up.
        """
        profile = cls.get_or_create_profile(user)
        profile.total_xp += amount
        
        # Calculate new level
        # Formula: Level = Floor(Sqrt(XP / 100)) + 1 ? 
        # Or simple linear: 100xp per level?
        # Let's do a progressive curve: Level = 1 + (TotalXP // 200) for now.
        new_level = 1 + (profile.total_xp // 200)
        
        if new_level > profile.current_level:
            profile.current_level = new_level
            # Potential todo: Create a notification for level up
            
        profile.save()
        
    @classmethod
    def record_activity(cls, user, activity_type):
        """
        Central point to record activity: updates streak AND awards XP.
        """
        # 1. Update Streak
        cls.update_streak(user)
        
        # 2. Log Daily Activity
        today = timezone.now().date()
        daily_activity, created = DailyUserActivity.objects.get_or_create(
            user=user, 
            date=today
        )
        daily_activity.activity_count += 1
        daily_activity.save()
        
        # 3. Award XP
        xp = 0
        if activity_type == 'video':
            xp = cls.XP_VIDEO
        elif activity_type == 'quiz':
            xp = cls.XP_QUIZ
        elif activity_type == 'coding':
            xp = cls.XP_CODING
        elif activity_type == 'course_complete':
            xp = cls.XP_COURSE_COMPLETION
            
        if xp > 0:
            cls.award_xp(user, xp)
