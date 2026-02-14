from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CollegeUserAllocationViewSet, FacultyProfileViewSet, StudentProfileViewSet

router = DefaultRouter()
router.register(r"college-allocation", CollegeUserAllocationViewSet, basename="college-allocation")
router.register(r"faculty", FacultyProfileViewSet, basename="faculty")
router.register(r"student", StudentProfileViewSet, basename="student")

urlpatterns = [
    path("", include(router.urls)),
]
