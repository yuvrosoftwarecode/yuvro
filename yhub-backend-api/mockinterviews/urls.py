from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MockInterviewViewSet, MockInterviewSubmissionViewSet

router = DefaultRouter()
router.register(r'mock-interviews', MockInterviewViewSet, basename='mock-interview')
router.register(r'interview/submissions', MockInterviewSubmissionViewSet, basename='mock-interview-submission')

urlpatterns = [
    path('', include(router.urls)),
]
