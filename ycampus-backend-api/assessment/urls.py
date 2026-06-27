from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContestViewSet,
    SkillTestViewSet,
    MockInterviewViewSet,
    MockInterviewSubmissionViewSet,
    SkillTestSubmissionViewSet,
    CertificationExamViewSet,
    CertificationSubmissionViewSet,
    PlacementDashboardViewSet,
)
from .leaderboard_views import LeaderboardViewSet

router = DefaultRouter()
router.register(r"leaderboards", LeaderboardViewSet, basename="leaderboard")
router.register(r"contests", ContestViewSet)
router.register(r"skill-tests", SkillTestViewSet)
router.register(r"mock-interviews", MockInterviewViewSet)
router.register(r"mock-interview/submissions", MockInterviewSubmissionViewSet, basename="mock-interview-submissions")
router.register(
    r"skill-test/submissions",
    SkillTestSubmissionViewSet,
    basename="skill-test-submissions",
)
router.register(r"certification-exams", CertificationExamViewSet)
router.register(r"certification-submissions", CertificationSubmissionViewSet)
router.register(r"placement-dashboard", PlacementDashboardViewSet, basename="placement-dashboard")


urlpatterns = [
    path("assessment/", include(router.urls)),
]
