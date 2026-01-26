from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContestViewSet,
    SkillTestViewSet,
    MockInterviewViewSet,
    SkillTestSubmissionViewSet,
    CertificationExamViewSet,
    CertificationSubmissionViewSet,
)

router = DefaultRouter()
router.register(r"contests", ContestViewSet)
router.register(r"skill-tests", SkillTestViewSet)
router.register(r"mock-interviews", MockInterviewViewSet)
router.register(
    r"skill-test/submissions",
    SkillTestSubmissionViewSet,
    basename="skill-test-submissions",
)
router.register(r"certification-exams", CertificationExamViewSet)
router.register(r"certification-submissions", CertificationSubmissionViewSet)


urlpatterns = [
    path("assessment/", include(router.urls)),
]
