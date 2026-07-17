from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from authentication.permissions import IsAdminUser
from .models import (
    Lab, LabSprint, LabSprintTicket,
    UserLabEnrollment, UserLabSprintTicketSubmission,
)
from .serializers import (
    LabSerializer,
    LabSprintSerializer,
    LabSprintTicketSerializer,
    UserLabEnrollmentSerializer,
    UserLabSprintTicketSubmissionSerializer,
)
from rest_framework.decorators import api_view, permission_classes, action
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
import threading
from .github_client import GithubClient
from .workspace_manager import provision_user_lab_repo, get_repo_name_from_url, provision_lab_starter_repo
import os
from django.conf import settings
from rest_framework.exceptions import ValidationError
from .frontend_validator import validate_frontend_ticket

class FrontendValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ticket_slug = request.data.get("ticket_slug")
        user_html   = request.data.get("user_html", "")
        user_css    = request.data.get("user_css", "")
        lab_id      = request.data.get("lab_id", "")

        if not ticket_slug:
            return Response({"error": "ticket_slug is required"}, status=status.HTTP_400_BAD_REQUEST)

        executor_url = os.environ.get("CODE_EXECUTOR_URL", "http://yuvro-yuvro-code-executor-1:8009")
        try:
            import requests as http_requests
            resp = http_requests.post(
                f"{executor_url}/workspace/ui-validate",
                json={
                    "ticket_slug": ticket_slug,
                    "user_html":   user_html,
                    "user_css":    user_css,
                    "lab_name":    "frontend-portfolio", 
                    "lab_id":      lab_id,           
                },
                timeout=60, 
            )
            if resp.status_code == 404:
                return Response(
                    {"error": f"Base files not found for ticket '{ticket_slug}'. "
                              "Ensure the starter repo has been cloned and contains tickets/<ticket_slug>/index.html."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if not resp.ok:
                return Response(
                    {"error": f"Executor error: {resp.text[:500]}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response(resp.json())
        except Exception as e:
            return Response({"error": f"Could not reach executor: {e}"}, status=status.HTTP_502_BAD_GATEWAY)



class LabViewSet(viewsets.ModelViewSet):
    queryset = Lab.objects.all()
    serializer_class = LabSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        lab = serializer.save(created_by=self.request.user)
        if lab.git_repo_starter_url:
            threading.Thread(target=provision_lab_starter_repo, args=(lab.id, lab.git_repo_starter_url)).start()

    def perform_update(self, serializer):
        lab = serializer.save()
        if lab.git_repo_starter_url:
            threading.Thread(target=provision_lab_starter_repo, args=(lab.id, lab.git_repo_starter_url)).start()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_payment(self, request, pk=None):
        lab = self.get_object()
        enrollment, created = UserLabEnrollment.objects.get_or_create(
            user=request.user,
            lab=lab
        )
        enrollment.is_unlocked = True
        enrollment.save(update_fields=['is_unlocked'])
        return Response({"status": "success", "message": "Lab unlocked successfully."})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_unlocks(self, request):
        enrollments = UserLabEnrollment.objects.filter(user=request.user, is_unlocked=True)
        unlocked_lab_ids = list(enrollments.values_list('lab_id', flat=True))
        return Response({"unlocked_lab_ids": [str(lid) for lid in unlocked_lab_ids]})

class LabSprintViewSet(viewsets.ModelViewSet):
    queryset = LabSprint.objects.all()
    serializer_class = LabSprintSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        lab_id = self.request.query_params.get('lab')
        if lab_id:
            queryset = queryset.filter(lab_id=lab_id)
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
        
        
        lab = serializer.validated_data.get('lab')
        requested_repo_name = self.request.data.get('github_repo_name')
        if not requested_repo_name:
            requested_repo_name = f"yuvro_{lab.title.replace(' ', '_').lower()}"

        client = GithubClient(self.request.user.id)
        if not client._fetch_token():
            raise ValidationError("Please connect your GitHub account before starting a lab.")
            
        try:
            repo_data = client.create_repository(requested_repo_name, private=True)
            github_repo_url = repo_data['url']
            default_branch = repo_data['default_branch']
        except Exception as e:
            raise ValidationError(f"Failed to create GitHub repository: {str(e)}")

        enrollment = serializer.save(
            user=self.request.user,
            github_repo_name=repo_data['name'],
            github_repo_url=github_repo_url,
            default_branch=default_branch
        )
        
        if lab.git_repo_starter_url:
            starter_repo_name = get_repo_name_from_url(lab.git_repo_starter_url)
            starter_repo_path = os.path.join(settings.WORKSPACES_ROOT, "labs", str(lab.id), starter_repo_name)
            if os.path.exists(starter_repo_path):
                import threading
                threading.Thread(
                    target=provision_user_lab_repo, 
                    args=(lab.id, self.request.user.id, starter_repo_path, github_repo_url, client.access_token)
                ).start()

class UserLabSprintTicketSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabSprintTicketSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = UserLabSprintTicketSubmission.objects.filter(user=self.request.user)
        ticket_id = self.request.query_params.get('lab_sprint_ticket')
        if ticket_id:
            qs = qs.filter(lab_sprint_ticket_id=ticket_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_stats_view(request):
    user = request.user
    
    done_submissions = UserLabSprintTicketSubmission.objects.filter(
        user=user,
        ticket_status__in=['in_review', 'done']
    ).select_related('lab_sprint_ticket')
    
    total_yp = done_submissions.aggregate(
        total_yp=Sum('lab_sprint_ticket__yuvro_points')
    )['total_yp'] or 0

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_stats_view(request):
    user = request.user
    
    done_submissions = UserLabSprintTicketSubmission.objects.filter(
        user=user,
        ticket_status__in=['in_review', 'done']
    ).select_related('lab_sprint_ticket')
    
    total_yp = done_submissions.aggregate(
        total_yp=Sum('lab_sprint_ticket__yuvro_points')
    )['total_yp'] or 0

    dates_completed = set()
    for sub in done_submissions:
        dates_completed.add(sub.updated_at.date())
    
    sorted_dates = sorted(list(dates_completed), reverse=True)
    
    streak = 0
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    current_date_to_check = today
    
    if sorted_dates and sorted_dates[0] == today:
        streak = 1
        current_date_to_check = yesterday
        for d in sorted_dates[1:]:
            if d == current_date_to_check:
                streak += 1
                current_date_to_check -= timedelta(days=1)
            else:
                break
    elif sorted_dates and sorted_dates[0] == yesterday:
        streak = 1
        current_date_to_check = yesterday - timedelta(days=1)
        for d in sorted_dates[1:]:
            if d == current_date_to_check:
                streak += 1
                current_date_to_check -= timedelta(days=1)
            else:
                break
    
    return Response({
        'day_streak': streak,
        'total_yp': total_yp
    })
