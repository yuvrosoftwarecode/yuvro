from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LabViewSet,
    LabSprintViewSet,
    LabSprintTicketViewSet,
    UserLabEnrollmentViewSet,
    UserLabSprintTicketSubmissionViewSet,
    GitHubIntegrationView,
)

router = DefaultRouter()
router.register(r'labs', LabViewSet)
router.register(r'sprints', LabSprintViewSet)
router.register(r'tickets', LabSprintTicketViewSet)
router.register(r'enrollments', UserLabEnrollmentViewSet, basename='lab-enrollment')
router.register(r'submissions', UserLabSprintTicketSubmissionViewSet, basename='lab-submission')

urlpatterns = [
    path('', include(router.urls)),
    path('github-integration/', GitHubIntegrationView.as_view(), name='github-integration'),
]
