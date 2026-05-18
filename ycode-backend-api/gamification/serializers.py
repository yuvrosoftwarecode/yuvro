from rest_framework import serializers
from .models import UserGamificationProfile, Badge, UserBadge, Mission, UserMission


class UserGamificationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGamificationProfile
        fields = [
            "current_streak", "longest_streak", "total_xp", "current_level",
            "last_activity_date", "total_problems_solved", "total_quizzes_passed",
            "total_lessons_completed", "total_courses_completed",
            # Streak freeze fields (added in migration 0005)
            "streak_freezes_remaining", "last_freeze_replenish", "days_missed",
        ]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["key", "name", "description", "category", "icon", "xp_reward"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["badge", "earned_at"]


class MissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = ["key", "title", "description", "mission_type", "target", "xp_reward", "icon"]


class UserMissionSerializer(serializers.ModelSerializer):
    mission = MissionSerializer(read_only=True)
    progress_pct = serializers.SerializerMethodField()

    class Meta:
        model = UserMission
        fields = ["id", "mission", "date", "progress", "progress_pct", "is_completed", "completed_at"]

    def get_progress_pct(self, obj):
        if obj.mission.target == 0:
            return 100
        return min(round((obj.progress / obj.mission.target) * 100), 100)
