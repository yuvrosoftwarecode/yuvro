from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from authentication.permissions import IsAdminUser
from .models import (
    Lab, LabSprint, LabSprintTicket,
    UserLabEnrollment, UserLabSprintTicketSubmission,
    UserGitHubIntegration,
)
from .serializers import (
    LabSerializer,
    LabSprintSerializer,
    LabSprintTicketSerializer,
    UserLabEnrollmentSerializer,
    UserLabSprintTicketSubmissionSerializer,
)

class LabViewSet(viewsets.ModelViewSet):
    queryset = Lab.objects.all()
    serializer_class = LabSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class LabSprintViewSet(viewsets.ModelViewSet):
    queryset = LabSprint.objects.all()
    serializer_class = LabSprintSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        lab_id = self.request.query_params.get('lab')
        if lab_id:
            queryset = queryset.filter(lab_id=lab_id)
        return queryset
    
    def get_queryset(self):
        queryset = LabSprint.objects.all()
        lab = self.request.query_params.get('lab')
        if lab is not None:
            queryset = queryset.filter(lab=lab)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class LabSprintTicketViewSet(viewsets.ModelViewSet):
    queryset = LabSprintTicket.objects.all()
    serializer_class = LabSprintTicketSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        sprint_id = self.request.query_params.get('sprint')
        if sprint_id:
            queryset = queryset.filter(sprint_id=sprint_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class UserLabEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserLabEnrollment.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserLabSprintTicketSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabSprintTicketSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserLabSprintTicketSubmission.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        submission = serializer.save(user=self.request.user)
        submission.score_submission()
        submission.save(update_fields=['yuvro_points', 'ticket_status'])

    def perform_update(self, serializer):
        submission = serializer.save()
        submission.score_submission()
        submission.save(update_fields=['yuvro_points', 'ticket_status'])


class GitHubIntegrationView(APIView):
    """
    GET  /api/lab/github-integration/  → returns connection status (no PAT)
    POST /api/lab/github-integration/  → save or update PAT + username + repo
    DELETE /api/lab/github-integration/ → remove integration

    Internal: when called with X-Internal-User-Id header (from code executor inside Docker),
    resolves the user by ID and returns the decrypted PAT for git remote configuration.
    """
    def get_permissions(self):
        if self.request.headers.get("X-Internal-User-Id"):
            return [] 
        return [IsAuthenticated()]

    def get(self, request):
        internal_uid = request.headers.get("X-Internal-User-Id")
        if internal_uid:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(pk=internal_uid)
                gh = user.github_integration
                return Response({
                    "connected": gh.is_active,
                    "github_username": gh.github_username,
                    "github_repo": gh.github_repo,
                    "pat": gh.get_pat(), 
                })
            except Exception:
                return Response({"connected": False})
        try:
            gh = request.user.github_integration
            return Response({
                "connected": gh.is_active,
                "github_username": gh.github_username,
                "github_repo": gh.github_repo,
            })
        except UserGitHubIntegration.DoesNotExist:
            return Response({"connected": False})

    def post(self, request):
        pat = request.data.get("pat", "").strip()
        username = request.data.get("github_username", "").strip()
        repo = request.data.get("github_repo", "").strip()

        if not pat or not username or not repo:
            return Response(
                {"error": "pat, github_username, and github_repo are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gh, _ = UserGitHubIntegration.objects.get_or_create(
            user=request.user,
            defaults={"github_username": username, "github_repo": repo, "pat_encrypted": ""},
        )
        gh.github_username = username
        gh.github_repo = repo
        gh.is_active = True
        gh.set_pat(pat)
        gh.save()

        return Response({
            "connected": True,
            "github_username": username,
            "github_repo": repo,
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        try:
            request.user.github_integration.delete()
        except UserGitHubIntegration.DoesNotExist:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)