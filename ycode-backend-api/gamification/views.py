from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import UserGamificationProfile, DailyUserActivity
from .service import GamificationService
from .serializers import UserGamificationProfileSerializer


class GamificationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def profile(self, request):
        """Return the current user's gamification profile."""
        profile = GamificationService.get_or_create_profile(request.user)
        serializer = UserGamificationProfileSerializer(profile)
        xp = profile.total_xp
        level = profile.current_level
        xp_in_current_level = xp - ((level - 1) * 200)
        xp_for_next_level = level * 200
        xp_progress_pct = round((xp_in_current_level / 200) * 100) if level > 0 else 0
        data = serializer.data
        data['xp_for_next_level'] = xp_for_next_level
        data['xp_progress_pct'] = xp_progress_pct
        return Response(data)

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        """Return top 10 users by XP."""
        top_profiles = (
            UserGamificationProfile.objects
            .select_related('user', 'user__profile')
            .order_by('-total_xp')[:10]
        )
        data = []
        for i, profile in enumerate(top_profiles):
            avatar_url = None
            try:
                if hasattr(profile.user, 'profile'):
                    avatar_url = profile.user.profile.profile_image
            except Exception:
                pass
            data.append({
                "rank": i + 1,
                "user": profile.user.username,
                "xp": profile.total_xp,
                "level": profile.current_level,
                "avatar": avatar_url,
                "is_current_user": profile.user == request.user,
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
