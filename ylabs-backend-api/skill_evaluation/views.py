from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated

from .models import (
    Evaluation,
    LabQuestionBank,
    AssessmentQuestionBank
)
from .serializers import (
    EvaluationSerializer,
    LabQuestionBankSerializer,
    AssessmentQuestionBankSerializer
)
from rest_framework.permissions import AllowAny

class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.prefetch_related('sections').all()
    serializer_class = EvaluationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def perform_create(self, serializer):
        # In a real app we'd set created_by from request.user
        # serializer.save(created_by=self.request.user)
        # Using first user as fallback for now
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.first()
        if not user:
            user = User.objects.create(username="default_recruiter", email="default@example.com")
        serializer.save(created_by=user)

class LabQuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabQuestionBank.objects.all()
    serializer_class = LabQuestionBankSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

class AssessmentQuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AssessmentQuestionBank.objects.all()
    serializer_class = AssessmentQuestionBankSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
