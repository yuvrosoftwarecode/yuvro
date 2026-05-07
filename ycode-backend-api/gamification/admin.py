from django.contrib import admin
from .models import UserGamificationProfile, DailyUserActivity, Badge, UserBadge, Mission, UserMission


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ['key', 'title', 'mission_type', 'target', 'xp_reward', 'is_active']
    list_filter = ['mission_type', 'is_active']
    search_fields = ['key', 'title']


@admin.register(UserMission)
class UserMissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'mission', 'date', 'progress', 'is_completed', 'xp_awarded']
    list_filter = ['date', 'is_completed']
    search_fields = ['user__username', 'mission__title']
    raw_id_fields = ['user', 'mission']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['key', 'name', 'category', 'xp_reward']
    list_filter = ['category']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    raw_id_fields = ['user', 'badge']


@admin.register(UserGamificationProfile)
class UserGamificationProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'current_level', 'total_xp', 'current_streak']
    search_fields = ['user__username']


@admin.register(DailyUserActivity)
class DailyUserActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'activity_count']
    list_filter = ['date']
