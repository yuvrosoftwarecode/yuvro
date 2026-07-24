from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from core.storage import upload_image
import logging
import time

from .models import (
    Evaluation,
    LabQuestionBank,
    UserEvaluationSubmission,
    DiscussionMode
)
from .serializers import (
    EvaluationSerializer,
    LabQuestionBankSerializer,
    UserEvaluationSubmissionSerializer
)
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action

class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.prefetch_related('sections').all()
    serializer_class = EvaluationSerializer
    permission_classes = [AllowAny]
    
    def perform_create(self, serializer):
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
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3002')
        eval_link = f"{frontend_url}/evaluation?e={evaluation.id}"
        
        subject = f"Yuvro Evaluation Test – {evaluation.title}"
        
        logger = logging.getLogger(__name__)
        
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
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                    html_message=html_message
                )
                logger.info(f"Successfully sent invite email to {email}")
            except Exception as e:
                logger.error(f"Failed to send invite email to {email}: {e}")

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
            return Response({"registered": True, "title": evaluation.title})
        return Response({"registered": False, "title": evaluation.title})

    def _save_snapshot(self, file_obj, user, evaluation, prefix_override=None):
        try:
            attempt_count = 1
            ts = str(int(time.time() * 1000))
            prefix = prefix_override or "snapshot"
            filename = f"{prefix}_{ts}.png"
            
            user_id = str(user.id)
            object_key = f"{user_id}/skill_evaluation/{evaluation.id}/attempt-{attempt_count}/{filename}"
            
            return upload_image(key=object_key, file_obj=file_obj)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error saving snapshot: {e}", exc_info=True)
            return None

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def log_activity(self, request, pk=None):
        evaluation = self.get_object()
        user = request.user
        
        activity_type = request.data.get("activity_type")
        meta_data = request.data.get("meta_data", {})
        if isinstance(meta_data, str):
            try:
                import json
                meta_data = json.loads(meta_data)
            except Exception:
                pass
        timestamp = request.data.get("timestamp") or timezone.now().isoformat()
        
        if not activity_type:
            return Response({"error": "activity_type is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        submission = UserEvaluationSubmission.objects.filter(user=user, evaluation=evaluation).first()
        if not submission:
            return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)
            
        image_file = request.FILES.get("snapshot")
        screen_file = request.FILES.get("screenshot")
        
        image_path = None
        if image_file:
            prefix = "passport" if activity_type == "passport_photo_captured" else "snapshot"
            image_path = self._save_snapshot(image_file, user, evaluation, prefix_override=prefix)
            
        screen_path = None
        if screen_file:
            screen_path = self._save_snapshot(screen_file, user, evaluation, prefix_override="screenshot")
            
        event = {
            "timestamp": timestamp,
            "activity_type": activity_type,
            "meta_data": meta_data,
        }
        if image_path:
            event["image_path"] = image_path
        if screen_path:
            event["screen_path"] = screen_path
            
        non_violation_types = ["snapshot", "camera_enabled", "camera_disabled", "passport_photo_captured", "initial_screenshot_captured"]
        
        CRITICAL_VIOLATION_TYPES = ["new_tab_detected", "new_window_detected", "devtools_opened", "camera_disabled", "microphone_disabled", "face_not_detected", "multiple_faces_detected", "face_recognition_failed", "violation_critical"]
        GENERAL_VIOLATION_TYPES = ["copy_detected", "paste_detected", "cut_detected", "select_all_detected", "right_click_detected", "keyboard_shortcut", "screenshot_detected", "suspicious_movement", "violation_warning", "tab_switched"]
        
        is_proctoring = (
            activity_type in CRITICAL_VIOLATION_TYPES
            or activity_type in GENERAL_VIOLATION_TYPES
            or activity_type == "snapshot"
            or bool(image_path)
        )
        is_violation = is_proctoring and (activity_type not in non_violation_types)
        
        if is_violation:
            if not isinstance(submission.proctoring_events, list):
                submission.proctoring_events = []
            submission.proctoring_events.append(event)
        else:
            if not isinstance(submission.general_events, list):
                submission.general_events = []
            submission.general_events.append(event)
            
        submission.save()
        
        # Calculate violations (we can refine this later if section-based)
        sub_violations = len(submission.proctoring_events) if isinstance(submission.proctoring_events, list) else 0
        sub_tab_switches = sum(1 for e in (submission.proctoring_events if isinstance(submission.proctoring_events, list) else []) if e.get('activity_type') == 'tab_switched' and isinstance(e.get('meta_data'), dict) and e.get('meta_data').get('type') == 'hidden')
        
        return Response({
            'status': 'logged',
            'tab_switch_count': sub_tab_switches,
            'total_violations': sub_violations,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def finish(self, request, pk=None):
        evaluation = self.get_object()
        user = request.user
        
        submission = UserEvaluationSubmission.objects.filter(user=user, evaluation=evaluation).first()
        if not submission:
            return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)
            
        submission.completed_at = timezone.now()
        submission.save(update_fields=['completed_at'])
        
        has_proctoring = any(sec.proctoring_config for sec in evaluation.sections.all())
        if has_proctoring:
            from .face_verification_proxy import run_async_face_verification
            run_async_face_verification(UserEvaluationSubmission, submission.id)
            
        return Response({"status": "finished"})

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def submissions(self, request, pk=None):
        evaluation = self.get_object()
        submissions = UserEvaluationSubmission.objects.filter(evaluation=evaluation).select_related('user')
        serializer = UserEvaluationSubmissionSerializer(submissions, many=True)
        return Response(serializer.data)

class LabQuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabQuestionBank.objects.all()
    serializer_class = LabQuestionBankSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

