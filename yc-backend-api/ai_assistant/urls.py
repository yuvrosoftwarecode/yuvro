from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIAgentViewSet,
    ChatSessionViewSet,
    ChatMessageViewSet,
    AIAgentUsageViewSet,
    AIAgentConfigurationViewSet,
    AIAgentConfigurationViewSet,
    ChatViewSet,
    InterviewSessionViewSet,
)

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r"agents", AIAgentViewSet)
router.register(r"sessions", ChatSessionViewSet, basename="chatsession")
router.register(r"messages", ChatMessageViewSet, basename="chatmessage")
router.register(r"usage", AIAgentUsageViewSet, basename="aiagentusage")
router.register(
    r"configurations", AIAgentConfigurationViewSet, basename="aiagentconfiguration"
)
router.register(r"chat", ChatViewSet, basename="chat")
router.register(r"interviews", InterviewSessionViewSet, basename="interviewsession")

# The API URLs are now determined automatically by the router
urlpatterns = [
    path("", include(router.urls)),
]
