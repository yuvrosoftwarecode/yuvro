import datetime
from django.utils import timezone
from .models import UserGamificationProfile, DailyUserActivity


class GamificationService:
    XP_VIDEO = 10
    XP_QUIZ = 20
    XP_CODING = 50
    XP_COURSE_COMPLETION = 500

    @staticmethod
    def get_or_create_profile(user):
        profile, _ = UserGamificationProfile.objects.get_or_create(user=user)
        return profile

    @classmethod
    def update_streak(cls, user):
        profile = cls.get_or_create_profile(user)
        today = timezone.now().date()
        last_date = profile.last_activity_date

        if last_date == today:
            return

        if last_date == today - datetime.timedelta(days=1):
            profile.current_streak += 1
        else:
            profile.current_streak = 1

        if profile.current_streak > profile.longest_streak:
            profile.longest_streak = profile.current_streak

        profile.last_activity_date = today
        profile.save()

    @classmethod
    def award_xp(cls, user, amount):
        profile = cls.get_or_create_profile(user)
        profile.total_xp += amount
        new_level = 1 + (profile.total_xp // 200)
        if new_level > profile.current_level:
            profile.current_level = new_level
        profile.save()

    @classmethod
    def record_activity(cls, user, activity_type):
        cls.update_streak(user)

        today = timezone.now().date()
        daily_activity, _ = DailyUserActivity.objects.get_or_create(user=user, date=today)
        daily_activity.activity_count += 1
        daily_activity.save()

        xp_map = {
            'video': cls.XP_VIDEO,
            'quiz': cls.XP_QUIZ,
            'coding': cls.XP_CODING,
            'course_complete': cls.XP_COURSE_COMPLETION,
        }
        xp = xp_map.get(activity_type, 0)
        if xp > 0:
            cls.award_xp(user, xp)
