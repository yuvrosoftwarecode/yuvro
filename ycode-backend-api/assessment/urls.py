from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContestViewSet,
    SkillTestViewSet,
        SkillTestSubmissionViewSet,
    ContestSubmissionViewSet,
    CertificationExamViewSet,
    CertificationSubmissionViewSet,
    CertificateViewSet,
    JobTestViewSet,
    FaceEnrollView,
)

router = DefaultRouter()
router.register(r"contests", ContestViewSet)
router.register(r"skill-tests", SkillTestViewSet)
router.register(r"job-tests", JobTestViewSet, basename="job-tests")
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
router.register(r"certification-exams", CertificationExamViewSet)
router.register(r"certification-submissions", CertificationSubmissionViewSet)
router.register(r"certificates", CertificateViewSet, basename="certificates")


urlpatterns = [
    path("assessment/face-enroll/", FaceEnrollView.as_view(), name="face-enroll"),
    path("assessment/", include(router.urls)),
]
