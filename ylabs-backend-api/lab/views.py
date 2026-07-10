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
from rest_framework.decorators import action
from rest_framework.response import Response
import requests

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
    filterset_fields = ['lab']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class LabSprintTicketViewSet(viewsets.ModelViewSet):
    queryset = LabSprintTicket.objects.all()
    serializer_class = LabSprintTicketSerializer
    filterset_fields = ['sprint']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def execute(self, request, pk=None):
        ticket = self.get_object()
        code = request.data.get('code', '')

        # Forward execution to yuvro-code-executer for SQLite Lab
        if ticket.sprint.lab.title == 'SQLite Lab' or ticket.evaluation == 'DATABASE_STATE':
            try:
                solution = ticket.solution if isinstance(ticket.solution, dict) else {}
                db_id = solution.get('database_identifier', 'todo_management')
                system_query = solution.get('query.sql', '')

                payload = {
                    "lab_id": str(ticket.sprint.lab.id),
                    "task_id": str(ticket.id),
                    "database_identifier": db_id,
                    "user_query": code,
                    "system_query": system_query,
                    "points_possible": ticket.yuvro_points,
                    "check_order": False,
                    "check_columns": True
                }

                # Try to reach the executer on the docker network or local host
                response = requests.post("http://host.docker.internal:8005/evaluate-sqlite", json=payload, timeout=15)
            except requests.exceptions.RequestException:
                try:
                    response = requests.post("http://127.0.0.1:8005/evaluate-sqlite", json=payload, timeout=15)
                except Exception as e:
                    return Response({"error": f"Failed to reach code executor: {str(e)}"}, status=500)

            if response.status_code == 200:
                return Response(response.json(), status=200)
            else:
                return Response({"error": "Execution failed", "details": response.text}, status=response.status_code)

        return Response({"error": "Execution not supported for this ticket"}, status=400)

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
