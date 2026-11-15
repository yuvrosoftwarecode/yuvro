from __future__ import annotations

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.email_service import EmailService

logger = logging.getLogger(__name__)


class SupportFeedbackView(APIView):
    """
    API endpoint for users/visitors to submit improvement suggestions and feedback.
    Validates mandatory subject and description.
    Emails support@yuvrolabs.com.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data or {}
        subject = str(data.get("subject", "")).strip()
        description = str(data.get("description", "")).strip()

        if not subject:
            return Response(
                {"error": "Subject is mandatory."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not description:
            return Response(
                {"error": "Description is mandatory."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if user and user.is_authenticated:
            sender_email = getattr(user, "email", None) or str(data.get("email", "")).strip()
            full_name = user.get_full_name() if hasattr(user, "get_full_name") else ""
            sender_name = full_name or getattr(user, "username", "") or getattr(user, "name", "")
            user_id = str(user.id)
        else:
            sender_email = str(data.get("email", "")).strip() or "Anonymous / Guest"
            sender_name = str(data.get("name", "")).strip() or "Guest User"
            user_id = "Unauthenticated"

        metadata = {
            "user_id": user_id,
            "page_url": str(data.get("page_url", "")).strip(),
            "submitted_at": timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_agent": request.META.get("HTTP_USER_AGENT", "")[:200],
        }

        try:
            EmailService.send_support_feedback(
                subject=subject,
                description=description,
                sender_email=sender_email,
                sender_name=sender_name,
                metadata=metadata,
            )
        except Exception as exc:
            logger.error("Error sending support feedback email: %s", exc, exc_info=True)

        return Response(
            {
                "status": "success",
                "message": "Thanks for your feedback, you're adding value to the journey",
            },
            status=status.HTTP_200_OK,
        )
