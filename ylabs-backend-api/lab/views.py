from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from authentication.permissions import IsAdminUser
from .models import Lab, LabSprint, LabSprintTicket, UserLabEnrollment, UserLabSprintTicketSubmission
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
        queryset = LabSprintTicket.objects.all()
        sprint = self.request.query_params.get('sprint')
        if sprint is not None:
            queryset = queryset.filter(sprint=sprint)
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
        serializer.save(user=self.request.user)