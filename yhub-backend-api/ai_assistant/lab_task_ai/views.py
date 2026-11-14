import asyncio
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import (
    SuggestTaskSerializer,
    StandardizeTaskSerializer,
    BulkTasksSerializer,
    EstimateDurationSerializer,
    GenerateScoringRulesSerializer,
    PushScoringRulesSerializer,
    GenerateLifecycleCommandsSerializer,
)
from .task_engine import LabTaskAIEngine
from .scoring_synthesizer import ScoringRulesSynthesizer
from .github_pusher import GitHubScoringRulesPusher

logger = logging.getLogger(__name__)


class LabTaskAIViewSet(viewsets.ViewSet):
    """
    AI Controller for Engineering Labs.
    Powers Step 3 of the Question Builder:
    - Suggest individual tasks
    - Standardize recruiter tasks
    - Generate bulk progressive tasks (2, 3, or 4)
    - Estimate task duration in minutes
    - Synthesize yuvro_scoring_rules
    - Push scoring rules directly to GitHub repositories
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["post"], url_path="suggest-task")
    def suggest_task(self, request):
        serializer = SuggestTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        engine = LabTaskAIEngine(
            provider=data.get("provider", "deepseek"),
            model_name=data.get("model_name"),
        )
        try:
            result = asyncio.run(
                engine.suggest_task(
                    lab_context=data["lab_context"],
                    existing_tasks=data.get("existing_tasks", []),
                )
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to suggest task: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="standardize-task")
    def standardize_task(self, request):
        serializer = StandardizeTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        engine = LabTaskAIEngine(
            provider=data.get("provider", "deepseek"),
            model_name=data.get("model_name"),
        )
        try:
            result = asyncio.run(
                engine.standardize_task(
                    raw_task=data["raw_task"],
                    lab_context=data.get("lab_context", {}),
                )
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to standardize task: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="generate-bulk-tasks")
    def generate_bulk_tasks(self, request):
        serializer = BulkTasksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        engine = LabTaskAIEngine(
            provider=data.get("provider", "deepseek"),
            model_name=data.get("model_name"),
        )
        try:
            result = asyncio.run(
                engine.generate_bulk_tasks(
                    lab_context=data["lab_context"],
                    count=data.get("count", 3),
                )
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to generate bulk tasks: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="estimate-duration")
    def estimate_duration(self, request):
        serializer = EstimateDurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        engine = LabTaskAIEngine(
            provider=data.get("provider", "deepseek"),
            model_name=data.get("model_name"),
        )
        try:
            result = asyncio.run(
                engine.estimate_duration(
                    task=data["task"],
                    lab_context=data.get("lab_context", {}),
                )
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to estimate task duration: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="generate-scoring-rules")
    def generate_scoring_rules(self, request):
        serializer = GenerateScoringRulesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        synthesizer = ScoringRulesSynthesizer(
            provider=data.get("provider", "deepseek"),
            model_name=data.get("model_name"),
        )
        try:
            result = asyncio.run(
                synthesizer.generate_rules(
                    lab_context=data["lab_context"],
                    tasks=data["tasks"],
                )
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to generate scoring rules: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="push-scoring-rules")
    def push_scoring_rules(self, request):
        serializer = PushScoringRulesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_github_token = None
        try:
            if request.user and request.user.is_authenticated:
                conn = getattr(request.user, "github_connection", None)
                if conn and conn.access_token:
                    user_github_token = conn.access_token
        except Exception:
            pass

        pusher = GitHubScoringRulesPusher()
        try:
            result = pusher.push_scoring_rules(
                repo_identifier=data["repo_identifier"],
                files=data["files"],
                branch=data.get("branch", "main"),
                installation_id=data.get("installation_id"),
                custom_token=user_github_token,
                commit_message=data.get("commit_message", "feat(eval): add yuvro scoring rules for automated grading"),
                allow_system_pat=False,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to push scoring rules to GitHub: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="generate-lifecycle-commands")
    def generate_lifecycle_commands(self, request):
        serializer = GenerateLifecycleCommandsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        engine = LabTaskAIEngine(
            provider=data.get("provider", "deepseek"),
            model_name=data.get("model_name"),
        )
        try:
            result = asyncio.run(
                engine.generate_lifecycle_commands(
                    lab_context=data["lab_context"],
                    tasks=data.get("tasks", []),
                )
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to generate lifecycle commands: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

