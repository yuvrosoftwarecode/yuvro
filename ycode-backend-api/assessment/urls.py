from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContestViewSet,
    SkillTestViewSet,
    MockInterviewViewSet,
    SkillTestSubmissionViewSet,
    ContestSubmissionViewSet,
    MockInterviewSubmissionViewSet,
    CertificationExamViewSet,
    CertificationSubmissionViewSet,
    CertificateViewSet,
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
router.register(
    r"contest/submissions",
    ContestSubmissionViewSet,
    basename="contest-submissions",
)
router.register(
    r"mock-interview/submissions",
    MockInterviewSubmissionViewSet,
    basename="mock-interview-submissions",
)
router.register(r"certification-exams", CertificationExamViewSet)
router.register(r"certification-submissions", CertificationSubmissionViewSet)
router.register(r"certificates", CertificateViewSet, basename="certificates")


urlpatterns = [
    path("assessment/", include(router.urls)),
]
