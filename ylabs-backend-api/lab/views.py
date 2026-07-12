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
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum

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
