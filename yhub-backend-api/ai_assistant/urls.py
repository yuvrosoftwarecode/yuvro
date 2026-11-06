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
    LabScoringViewSet,
)
from .lab_task_ai.views import LabTaskAIViewSet

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
router.register(r"scoring", LabScoringViewSet, basename="labscoring")
router.register(r"lab-task-ai", LabTaskAIViewSet, basename="labtaskai")

urlpatterns = [
    path("", include(router.urls)),
]
