from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CollegeUserAllocationViewSet, FacultyProfileViewSet, StudentProfileViewSet, TPOProfileViewSet

router = DefaultRouter()
router.register(r"college-allocation", CollegeUserAllocationViewSet, basename="college-allocation")
router.register(r"college", CollegeUserAllocationViewSet, basename="college")
router.register(r"faculty", FacultyProfileViewSet, basename="faculty")
router.register(r"student", StudentProfileViewSet, basename="student")
router.register(r"tpo", TPOProfileViewSet, basename="tpo")

urlpatterns = [
    path("", include(router.urls)),
]
