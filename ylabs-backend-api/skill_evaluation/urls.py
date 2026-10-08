from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EvaluationViewSet,
    LabQuestionBankViewSet,
    KnowledgeQuestionBankViewSet,
    UserLabQuestionBankSubmissionViewSet,
    CandidateNoteViewSet,
    CandidateTimelineEventViewSet,
    RecruiterActivityLogViewSet,
    SharedReportView,
    EvaluationFeedbackAPIView
)

router = DefaultRouter()
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'lab-questions', LabQuestionBankViewSet, basename='labquestionbank')
router.register(r'knowledge-questions', KnowledgeQuestionBankViewSet, basename='knowledgequestionbank')
router.register(r'lab-submissions', UserLabQuestionBankSubmissionViewSet, basename='labsubmission')
router.register(r'notes', CandidateNoteViewSet, basename='candidatenote')
router.register(r'timeline-events', CandidateTimelineEventViewSet, basename='candidatetimelineevent')
router.register(r'activity-logs', RecruiterActivityLogViewSet, basename='recruiteractivitylog')

urlpatterns = [
    path('shared-report/<str:token>/', SharedReportView.as_view(), name='shared-report'),
    path('evaluations/<str:pk>/feedback/', EvaluationFeedbackAPIView.as_view(), name='evaluation-feedback'),
    path('', include(router.urls)),
]

