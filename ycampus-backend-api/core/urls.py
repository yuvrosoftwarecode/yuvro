from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CollegeUserAllocationViewSet, FacultyProfileViewSet, StudentProfileViewSet, PlacementOfficerProfileViewSet
from .views import (
    CollegeUserAllocationViewSet,
    FacultyProfileViewSet,
    StudentProfileViewSet,
    AttendanceSessionViewSet,
    AttendanceRecordViewSet,
    TaskViewSet,
    TaskSubmissionViewSet,
    NoteViewSet,
    AnnouncementViewSet,
    FileUploadViewSet,
)
router = DefaultRouter()
router.register(r"college-allocation", CollegeUserAllocationViewSet, basename="college-allocation")
router.register(r"college", CollegeUserAllocationViewSet, basename="college")
router.register(r"faculty", FacultyProfileViewSet, basename="faculty")
router.register(r"student", StudentProfileViewSet, basename="student")
router.register(r"placement-officer", PlacementOfficerProfileViewSet, basename="placement-officer")
router.register(r"attendance-sessions", AttendanceSessionViewSet, basename="attendance-sessions")
router.register(r"attendance-records", AttendanceRecordViewSet, basename="attendance-records")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"task-submissions", TaskSubmissionViewSet, basename="task-submission")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"announcement", AnnouncementViewSet, basename="announcement")
router.register(r"upload", FileUploadViewSet, basename="upload")

urlpatterns = [
    path("", include(router.urls)),
]
