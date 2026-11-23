from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import ReferralCode, Referral
from .services import ReferralService
from .serializers import (
    ReferralCodeSerializer,
    ReferralHistoryItemSerializer,
    StudentReferralStatsSerializer,
    AdminReferralSummarySerializer,
    AdminReferrerItemSerializer,
    AdminReferrerDetailSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            return True
        if hasattr(user, "is_admin") and callable(user.is_admin):
            return user.is_admin()
        roles = getattr(user, "roles", {})
        if isinstance(roles, dict):
            return any(r == "admin" for r in roles.values())
        return False


class MyReferralCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ref_obj = ReferralService.get_or_create_code(request.user)
        serializer = ReferralCodeSerializer(ref_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ValidateReferralCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get("code", "")
        is_valid, ref_obj, msg = ReferralService.validate_code(code)
        if not is_valid or not ref_obj:
            return Response(
                {"valid": False, "message": msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        referrer = ref_obj.user
        referrer_name = (
            f"{referrer.first_name or ''} {referrer.last_name or ''}".strip()
            or referrer.username
            or "A friend"
        )
        return Response(
            {"valid": True, "message": msg, "referrer_name": referrer_name, "code": ref_obj.code},
            status=status.HTTP_200_OK,
        )


class MyReferralStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats_data = ReferralService.get_student_stats(request.user)
        serializer = StudentReferralStatsSerializer(stats_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyReferralHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReferralHistoryItemSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return ReferralService.get_student_history(self.request.user)


class AdminReferralSummaryView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        data = ReferralService.get_admin_summary()
        serializer = AdminReferralSummarySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminReferrersListView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        search = request.query_params.get("search", "")
        status_filter = request.query_params.get("status", "")
        try:
            page = int(request.query_params.get("page", 1))
        except ValueError:
            page = 1
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            page_size = 10

        referrers = ReferralService.get_admin_referrers(search=search, status_filter=status_filter)
        total_count = len(referrers)

        # In-memory slice for aggregated records
        start = (page - 1) * page_size
        end = start + page_size
        paginated_data = referrers[start:end]

        serializer = AdminReferrerItemSerializer(paginated_data, many=True)
        return Response(
            {
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": max(1, (total_count + page_size - 1) // page_size),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminReferrerDetailView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request, user_id):
        details = ReferralService.get_admin_referrer_details(user_id)
        if not details:
            return Response(
                {"detail": "Referring student not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminReferrerDetailSerializer(details)
        return Response(serializer.data, status=status.HTTP_200_OK)
