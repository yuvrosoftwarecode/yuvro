from django.urls import path

from mockinterviews.test_stt.consumers import TestMockInterviewSttConsumer

websocket_urlpatterns = [
    # Mock interview speech-to-text (Sarvam AI / OpenAI realtime transcription).
    path("ws/mock-interview/stt/", TestMockInterviewSttConsumer.as_asgi()),
]
