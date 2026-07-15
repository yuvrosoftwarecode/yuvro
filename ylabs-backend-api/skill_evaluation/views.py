from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated

from .models import (
    Evaluation,
    LabQuestionBank
)
from .serializers import (
    EvaluationSerializer,
    LabQuestionBankSerializer
)
from rest_framework.permissions import AllowAny

class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.prefetch_related('sections').all()
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class LabQuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabQuestionBank.objects.all()
    serializer_class = LabQuestionBankSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

