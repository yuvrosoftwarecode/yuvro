from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import MockInterviewViewSet, MockInterviewSubmissionViewSet
from .test_stt.tts_views import test_mock_interview_tts

router = DefaultRouter()
router.register(r'mock-interviews', MockInterviewViewSet, basename='mock-interview')
router.register(r'interview/submissions', MockInterviewSubmissionViewSet, basename='mock-interview-submission')
router.register(r'mock-interview-submissions', MockInterviewSubmissionViewSet, basename='mock-interview-submissions')

urlpatterns = [
    # Test mock interview: Alex's voice via Sarvam AI text-to-speech
    path('test-mock-interview/tts/', test_mock_interview_tts, name='test-mock-interview-tts'),
    path('', include(router.urls)),
]
