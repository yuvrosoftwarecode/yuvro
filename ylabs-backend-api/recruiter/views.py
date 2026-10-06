from rest_framework import viewsets, mixins, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from .models import Company, CompanyRecruiter
from .serializers import (
    CompanySerializer,
    CompanyRecruiterSerializer,
    CompanyRecruiterCreateSerializer,
    CompanyRecruiterUpdateSerializer,
    RecruiterSelfRegistrationSerializer
)
from .services import delete_user_in_yhub


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by("-created_at")
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


class RecruiterSelfRegistrationAPIView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RecruiterSelfRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Create company/recruiter and return the YHub response directly (with tokens)
        response_data = serializer.save()
        return Response(response_data, status=status.HTTP_201_CREATED)


from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class CompanyRecruiterViewSet(viewsets.ModelViewSet):
    queryset = CompanyRecruiter.objects.all().select_related("user", "company").order_by("-created_at")
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_serializer_class(self):
        if self.action == "create":
            return CompanyRecruiterCreateSerializer
        if self.action in ["update", "partial_update"]:
            return CompanyRecruiterUpdateSerializer
        return CompanyRecruiterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company_recruiter = serializer.save(created_by=request.user)

        # Return the standard serialized format of the new object
        response_serializer = CompanyRecruiterSerializer(company_recruiter)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        company_recruiter = serializer.save()
        
        response_serializer = CompanyRecruiterSerializer(company_recruiter)
        return Response(response_serializer.data)

    def perform_destroy(self, instance):
        user = instance.user
        email = user.email if user else None
        super().perform_destroy(instance)
        if user:
            user.delete()
        if email:
            delete_user_in_yhub(email)

from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import RecruiterTeam, RecruiterTeamMember, RecruiterTeamMemberRole
from .serializers import (
    RecruiterTeamSerializer,
    RecruiterTeamMemberSerializer,
    RecruiterTeamMemberAddSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()

class RecruiterTeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RecruiterTeamSerializer

    def get_queryset(self):
        user = self.request.user
        # Get teams where the user is a member
        team_ids = RecruiterTeamMember.objects.filter(user=user).values_list("team_id", flat=True)
        return RecruiterTeam.objects.filter(id__in=team_ids).prefetch_related(
            "members__user", "quota", "subscription", "owner"
        )

    @action(detail=False, methods=["get"])
    def me(self, request):
        team = self.get_queryset().first()
        if not team:
            return Response({"detail": "No team found for this user."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(team)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def members(self, request, pk=None):
        team = self.get_object()
        
        # Only owner or admin can add members
        member_obj = RecruiterTeamMember.objects.filter(team=team, user=request.user).first()
        if not member_obj or member_obj.role not in [RecruiterTeamMemberRole.OWNER, RecruiterTeamMemberRole.ADMIN]:
            return Response({"detail": "You do not have permission to add members to this team."}, status=status.HTTP_403_FORBIDDEN)

        quota = team.quota
        if not quota.has_available_quota("recruiter_logins"):
            return Response({"detail": "Team has reached its maximum recruiter logins quota."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RecruiterTeamMemberAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        user_to_add = User.objects.filter(email=email).first()
        if not user_to_add:
            return Response({"detail": "User with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        if RecruiterTeamMember.objects.filter(team=team, user=user_to_add).exists():
            return Response({"detail": "User is already a member of this team."}, status=status.HTTP_400_BAD_REQUEST)

        # Add member and increment quota
        RecruiterTeamMember.objects.create(team=team, user=user_to_add, role=role)
        quota.increment_usage("recruiter_logins")

        return Response({"detail": "Member added successfully."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="members/(?P<member_id>[^/.]+)")
    def remove_member(self, request, pk=None, member_id=None):
        team = self.get_object()

        # Only owner or admin can remove members
        requester = RecruiterTeamMember.objects.filter(team=team, user=request.user).first()
        if not requester or requester.role not in [RecruiterTeamMemberRole.OWNER, RecruiterTeamMemberRole.ADMIN]:
            return Response({"detail": "You do not have permission to remove members from this team."}, status=status.HTTP_403_FORBIDDEN)

        member_to_remove = get_object_or_404(RecruiterTeamMember, id=member_id, team=team)
        
        if member_to_remove.role == RecruiterTeamMemberRole.OWNER:
            return Response({"detail": "Cannot remove the team owner."}, status=status.HTTP_400_BAD_REQUEST)

        member_to_remove.delete()
        
        # Decrement usage if needed, assuming the quota decrements when a member leaves.
        team.quota.used_recruiter_logins = max(0, team.quota.used_recruiter_logins - 1)
        team.quota.save(update_fields=["used_recruiter_logins"])

        return Response(status=status.HTTP_204_NO_CONTENT)
