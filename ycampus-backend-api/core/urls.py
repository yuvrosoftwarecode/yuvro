from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CollegeUserAllocationViewSet, FacultyProfileViewSet, StudentProfileViewSet, TPOProfileViewSet
from .views import (
    AttendanceSessionViewSet,
    AttendanceRecordViewSet,
    AnnouncementViewSet
)

router = DefaultRouter()
router.register(r"college-allocation", CollegeUserAllocationViewSet, basename="college-allocation")
router.register(r"college", CollegeUserAllocationViewSet, basename="college")
router.register(r"faculty", FacultyProfileViewSet, basename="faculty")
router.register(r"student", StudentProfileViewSet, basename="student")
router.register(r"tpo", TPOProfileViewSet, basename="tpo")
router.register(r"attendance-sessions", AttendanceSessionViewSet, basename="attendance-sessions")
router.register(r"attendance-records", AttendanceRecordViewSet, basename="attendance-records")
router.register(r"announcement", AnnouncementViewSet, basename="announcement")

urlpatterns = [
    path("", include(router.urls)),
]
