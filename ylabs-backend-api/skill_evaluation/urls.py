from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EvaluationViewSet,
    LabQuestionBankViewSet,
    UserLabQuestionBankSubmissionViewSet,
    CandidateNoteViewSet,
    CandidateTimelineEventViewSet,
    RecruiterActivityLogViewSet,
    SharedReportView
)

router = DefaultRouter()
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'lab-questions', LabQuestionBankViewSet, basename='labquestionbank')
router.register(r'lab-submissions', UserLabQuestionBankSubmissionViewSet, basename='labsubmission')
router.register(r'notes', CandidateNoteViewSet, basename='candidatenote')
router.register(r'timeline-events', CandidateTimelineEventViewSet, basename='candidatetimelineevent')
router.register(r'activity-logs', RecruiterActivityLogViewSet, basename='recruiteractivitylog')

urlpatterns = [
    path('shared-report/<str:token>/', SharedReportView.as_view(), name='shared-report'),
    path('', include(router.urls)),
]
