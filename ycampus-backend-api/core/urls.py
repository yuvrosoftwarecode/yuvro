from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CollegeUserAllocationViewSet

router = DefaultRouter()
router.register(r"college", CollegeUserAllocationViewSet, basename="college-allocation")

urlpatterns = [
    path("", include(router.urls)),
]
