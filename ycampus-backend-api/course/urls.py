from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollegeViewSet,
    DepartmentViewSet,
    SubjectViewSet,
    UnitViewSet,
    SubUnitViewSet,
    VideoViewSet,
    NoteViewSet,
    QuestionViewSet,
    StudentSubjectProgressViewSet,
    StudentCodePracticeViewSet,
)

router = DefaultRouter()
router.register(r"colleges", CollegeViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"units", UnitViewSet)
router.register(r"subunits", SubUnitViewSet)
router.register(r"videos", VideoViewSet)
router.register(r"notes", NoteViewSet)
router.register(r"questions", QuestionViewSet)
router.register(r"student-subject-progress", StudentSubjectProgressViewSet)
router.register(r"student-code-practices", StudentCodePracticeViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
