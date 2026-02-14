from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CollegeUserAllocationViewSet, FacultyProfileViewSet

router = DefaultRouter()
router.register(r"college", CollegeUserAllocationViewSet, basename="college-allocation")
router.register(r"faculty", FacultyProfileViewSet, basename="faculty")

urlpatterns = [
    path("", include(router.urls)),
]
