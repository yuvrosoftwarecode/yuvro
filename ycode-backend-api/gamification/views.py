from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import UserGamificationProfile, DailyUserActivity, UserBadge, UserMission
from .service import GamificationService, MissionService
from .serializers import (
    UserGamificationProfileSerializer, UserBadgeSerializer, BadgeSerializer,
    UserMissionSerializer,
)


class GamificationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def profile(self, request):
        """Return the current user's gamification profile with XP progress."""
        from .service import get_level_progress
        profile = GamificationService.get_or_create_profile(request.user)
        serializer = UserGamificationProfileSerializer(profile)
        level, xp_into_level, xp_for_next, progress_pct, tier_name = get_level_progress(profile.total_xp)
        data = serializer.data
        data['current_level'] = level
        data['xp_into_level'] = xp_into_level
        data['xp_for_next_level'] = xp_for_next
        data['xp_progress_pct'] = progress_pct
        data['tier_name'] = tier_name
        data['streak_freezes'] = profile.streak_freezes_remaining
        data['days_missed'] = profile.days_missed
        return Response(data)

    @action(detail=False, methods=["get"])
    def badges(self, request):
        """Return all badges the current user has earned."""
        user_badges = (
            UserBadge.objects
            .filter(user=request.user)
            .select_related('badge')
            .order_by('-earned_at')
        )
        serializer = UserBadgeSerializer(user_badges, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def all_badges(self, request):
        """Return all available badges with earned status and progress for the current user."""
        from .models import Badge

        profile = GamificationService.get_or_create_profile(request.user)

        all_badges = Badge.objects.all()
        earned_keys = set(
            UserBadge.objects.filter(user=request.user).values_list('badge__key', flat=True)
        )
        earned_at_map = {
            ub.badge.key: ub.earned_at
            for ub in UserBadge.objects.filter(user=request.user).select_related('badge')
        }

        # Badge progress: maps badge key → (current_value, target_value)
        badge_progress = {
            'streak_1':   (profile.current_streak, 1),
            'streak_7':   (profile.current_streak, 7),
            'streak_30':  (profile.current_streak, 30),
            'xp_100':     (profile.total_xp, 100),
            'xp_500':     (profile.total_xp, 500),
            'xp_2000':    (profile.total_xp, 2000),
            'code_1':     (profile.total_problems_solved, 1),
            'code_10':    (profile.total_problems_solved, 10),
            'code_50':    (profile.total_problems_solved, 50),
            'lesson_1':   (profile.total_lessons_completed, 1),
            'lesson_10':  (profile.total_lessons_completed, 10),
            'course_1':   (profile.total_courses_completed, 1),
            'quiz_1':     (profile.total_quizzes_passed, 1),
            'quiz_10':    (profile.total_quizzes_passed, 10),
        }

        data = []
        for badge in all_badges:
            current, target = badge_progress.get(badge.key, (0, 1))
            data.append({
                "key": badge.key,
                "name": badge.name,
                "description": badge.description,
                "category": badge.category,
                "icon": badge.icon,
                "xp_reward": badge.xp_reward,
                "earned": badge.key in earned_keys,
                "earned_at": earned_at_map.get(badge.key),
                "progress": min(current, target),
                "target": target,
            })
        return Response(data)

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        """
        Return top 10 users by XP.
        Query params:
        - scope: 'global' (default) or 'college' (filters to user's college)
        """
        from .service import calculate_level
        scope = request.query_params.get('scope', 'global')

        queryset = UserGamificationProfile.objects.select_related(
            'user', 'user__profile', 'user__profile__college'
        ).order_by('-total_xp')

        if scope == 'college':
            try:
                user_college = request.user.profile.college
                if user_college:
                    queryset = queryset.filter(user__profile__college=user_college)
                # If user has no college, fall through to global
            except Exception:
                pass  # No profile or no college — show global

        top_profiles = queryset[:10]
        data = []
        for i, profile in enumerate(top_profiles):
            avatar_url = None
            try:
                if hasattr(profile.user, 'profile'):
                    pass # avatar_url might be fetched from yhub service in the future
            except Exception:
                pass
            data.append({
                "rank": i + 1,
                "user": profile.user.username,
                "xp": profile.total_xp,
                "level": calculate_level(profile.total_xp),
                "avatar": avatar_url,
                "is_current_user": profile.user == request.user,
                "scope": scope,
            })
        return Response(data)

    @action(detail=False, methods=["get"])
    def calendar_activity(self, request):
        """Return active dates for a given month. Query params: year, month."""
        user = request.user
        today = timezone.now().date()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        activities = DailyUserActivity.objects.filter(
            user=user,
            date__year=year,
            date__month=month,
            activity_count__gt=0,
        ).values_list('date', flat=True)
        return Response({
            "active_dates": [d.isoformat() for d in activities],
            "year": year,
            "month": month,
        })

    @action(detail=False, methods=["get"])
    def daily_missions(self, request):
        """Return today's active missions for the current user, assigning them if needed."""
        active_missions, total_completed = MissionService.get_or_assign_daily_missions(request.user)
        serializer = UserMissionSerializer(active_missions, many=True)
        return Response({
            "missions": serializer.data,
            "completed_count": total_completed,
            "total_count": total_completed + len(active_missions),
        })

    @action(detail=True, methods=["post"], url_path="complete")
    def complete_mission(self, request, pk=None):
        """
        Manually mark a mission as complete (for missions that can't be auto-tracked).
        Only allowed for the owning user and only for today's missions.
        """
        today = timezone.now().date()
        try:
            um = UserMission.objects.select_related('mission').get(
                pk=pk, user=request.user, date=today
            )
        except UserMission.DoesNotExist:
            return Response({"detail": "Mission not found."}, status=status.HTTP_404_NOT_FOUND)

        if um.is_completed:
            return Response({"detail": "Already completed."}, status=status.HTTP_400_BAD_REQUEST)

        um.progress = um.mission.target
        um.is_completed = True
        um.completed_at = timezone.now()
        um.save(update_fields=['progress', 'is_completed', 'completed_at'])

        if not um.xp_awarded and um.mission.xp_reward > 0:
            GamificationService.award_xp(request.user, um.mission.xp_reward)
            um.xp_awarded = True
            um.save(update_fields=['xp_awarded'])

        serializer = UserMissionSerializer(um)
        return Response(serializer.data)
