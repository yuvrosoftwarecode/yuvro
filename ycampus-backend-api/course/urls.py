from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollegeViewSet,
    BatchViewSet,
    DepartmentViewSet,
    SemesterViewSet,
    SectionViewSet,
    SubjectViewSet,
    UnitViewSet,
    SubUnitViewSet,
    VideoViewSet,
    NoteViewSet,
    QuestionViewSet,
    StudentSubjectProgressViewSet,
    StudentCodePracticeViewSet,
    CollegeSubjectViewSet,
    SemesterSubjectViewSet,
    SectionSubjectFacultyViewSet,
)

router = DefaultRouter()
router.register(r"colleges", CollegeViewSet, basename="college")
router.register(r"batches", BatchViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"semesters", SemesterViewSet)
router.register(r"sections", SectionViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"college-subjects", CollegeSubjectViewSet)
router.register(r"semester-subjects", SemesterSubjectViewSet)
router.register(r"section-subject-faculty", SectionSubjectFacultyViewSet)
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
