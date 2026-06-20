from django.urls import path, include
from rest_framework.routers import DefaultRouter
from course.views import AttachmentViewSet

router = DefaultRouter()
router.register(r"attachments", AttachmentViewSet, basename="faculty-attachment")

urlpatterns = [
    path("", include(router.urls)),
]
