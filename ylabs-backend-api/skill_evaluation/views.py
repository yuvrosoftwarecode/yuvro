from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .models import (
    Evaluation,
    LabQuestionBank,
    UserEvaluationSubmission,
    DiscussionMode
)
from .serializers import (
    EvaluationSerializer,
    LabQuestionBankSerializer
)
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action

class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.prefetch_related('sections').all()
    serializer_class = EvaluationSerializer
    permission_classes = [AllowAny]
    
    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.first()
        if not user:
            user = User.objects.create(username="default_recruiter", email="default@example.com")
        instance = serializer.save(created_by=user)
        if instance.is_published and instance.candidate_invited_emails:
            self.send_invitation_emails(instance, instance.candidate_invited_emails)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_emails = set(old_instance.candidate_invited_emails or [])
        instance = serializer.save()
        
        if instance.is_published and instance.candidate_invited_emails:
            new_emails = set(instance.candidate_invited_emails) - old_emails
            if new_emails:
                self.send_invitation_emails(instance, new_emails)

    def send_invitation_emails(self, evaluation, emails):
        from django.conf import settings
        import logging
        import requests
        import os
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3002')
        eval_link = f"{frontend_url}/evaluation?e={evaluation.id}"
        
        subject = f"Yuvro Evaluation Test – {evaluation.title}"
        
        logger = logging.getLogger(__name__)
        
        yhub_url = getattr(settings, 'YHUB_BACKEND_URL', os.environ.get('YHUB_BACKEND_URL', 'http://yhub-backend:8000'))
        internal_secret = getattr(settings, 'INTERNAL_API_SECRET', os.environ.get('INTERNAL_API_SECRET', 'dev-secret-key'))
        endpoint = f"{yhub_url.rstrip('/')}/api/auth/internal/send-email/"
        
        for email in emails:
            message = f"Hello,\n\nYou have been invited to complete a Yuvro Evaluation.\n\nEvaluation: {evaluation.title}\n\nPlease complete the assessment before it expires.\nYour unique evaluation link: {eval_link}\n\nBest,\nYuvro Team"
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #059669;">Yuvro Evaluation Invitation</h2>
                <p>Hello,</p>
                <p>You have been invited to complete a Yuvro Evaluation: <strong>{evaluation.title}</strong>.</p>
                <p>Please click the button below to start your assessment:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{eval_link}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Evaluation</a>
                </p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="{eval_link}">{eval_link}</a></p>
                <p>Best regards,<br>Yuvro Team</p>
            </div>
            """
            
            try:
                response = requests.post(
                    endpoint,
                    json={
                        "subject": subject,
                        "message": message,
                        "html_message": html_message,
                        "recipient_list": [email]
                    },
                    headers={
                        "X-Internal-Secret": internal_secret,
                        "Content-Type": "application/json"
                    },
                    timeout=30
                )
                if response.status_code == 200:
                    logger.info(f"Successfully sent invite email to {email} via YHub")
                else:
                    logger.error(f"Failed to send invite email to {email} via YHub. Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                logger.error(f"Failed to send invite email to {email} via YHub: {e}")

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def public_register(self, request, pk=None):
        evaluation = self.get_object()
        
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Authentication required. Please verify OTP first."}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = request.user
        
        if evaluation.candidate_invited_emails and user.email not in evaluation.candidate_invited_emails:
            return Response({"error": "This email was not invited for this assessment."}, status=status.HTTP_403_FORBIDDEN)
            
        if UserEvaluationSubmission.objects.filter(evaluation=evaluation, user=user).exists():
            return Response({"error": "This email is already registered for this evaluation"}, status=status.HTTP_400_BAD_REQUEST)
            
        UserEvaluationSubmission.objects.create(
            evaluation=evaluation, 
            user=user,
            duration=0,
            discussion_mode=DiscussionMode.AUTOMATIC
        )
        
        return Response({
            "status": "success", 
            "message": "Successfully registered"
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def face_enroll(self, request):
        return Response({"enrolled": True, "status": "stub"})

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def check_registration(self, request, pk=None):
        evaluation = self.get_object()
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if evaluation.candidate_invited_emails and email not in evaluation.candidate_invited_emails:
            return Response({"error": "This email was not invited for this assessment."}, status=status.HTTP_403_FORBIDDEN)
            
        User = get_user_model()
        user = User.objects.filter(email=email).first()
        if user and UserEvaluationSubmission.objects.filter(evaluation=evaluation, user=user).exists():
            return Response({"registered": True})
        return Response({"registered": False})

class LabQuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabQuestionBank.objects.all()
    serializer_class = LabQuestionBankSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

