from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EvaluationViewSet,
    LabQuestionBankViewSet,
    UserLabQuestionBankTaskSubmissionViewSet,
    CandidateNoteViewSet,
    CandidateTimelineEventViewSet
)

router = DefaultRouter()
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'lab-questions', LabQuestionBankViewSet, basename='labquestionbank')
router.register(r'lab-submissions', UserLabQuestionBankTaskSubmissionViewSet, basename='labsubmission')
router.register(r'notes', CandidateNoteViewSet, basename='candidatenote')
router.register(r'timeline-events', CandidateTimelineEventViewSet, basename='candidatetimelineevent')

urlpatterns = [
    path('', include(router.urls)),
]
