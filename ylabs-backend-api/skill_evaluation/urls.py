from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EvaluationViewSet,
    LabQuestionBankViewSet,
    UserLabQuestionBankSubmissionViewSet
)

router = DefaultRouter()
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'lab-questions', LabQuestionBankViewSet, basename='labquestionbank')
router.register(r'lab-submissions', UserLabQuestionBankSubmissionViewSet, basename='labsubmission')

urlpatterns = [
    path('', include(router.urls)),
]
