from rest_framework import serializers
from .models import UserGamificationProfile


class UserGamificationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGamificationProfile
        fields = ["current_streak", "longest_streak", "total_xp", "current_level", "last_activity_date"]
