from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.db import transaction
import zoneinfo
from core.storage import upload_image, build_public_url
from .models import RecruiterActivityLog
from .serializers import RecruiterActivityLogSerializer
import logging
import time

from .models import (
    Evaluation,
    LabQuestionBank,
    KnowledgeQuestionBank,
    UserEvaluationSubmission,
    DiscussionMode,
    FollowUpConfig, 
    FollowUpCandidate,
    UserLabQuestionBankSubmission,
    UserKnowledgeAssessmentSubmission,
    EvaluationSection,
    EvaluationSectionType,
    CandidateTimelineEvent,
    CandidateTimelineEventType
)
from .serializers import (
    EvaluationSerializer,
    LabQuestionBankSerializer,
    KnowledgeQuestionBankSerializer,
    UserEvaluationSubmissionSerializer,
    FollowUpConfigSerializer, 
    FollowUpCandidateSerializer,
    UserLabQuestionBankSubmissionSerializer
)
from .email_utils import send_evaluation_email
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
import os
import re
from lab.workspace_manager import provision_evaluation_user_repo, get_repo_name_from_url
from .utils import is_database_lab
import json

def get_emails_list(emails):
    if not emails:
        return []
    if isinstance(emails, dict):
        return list(emails.keys())
    
    parsed = emails
    if isinstance(emails, str):
        try:
            parsed = json.loads(emails)
            if isinstance(parsed, dict):
                return list(parsed.keys())
            if isinstance(parsed, list):
                return [e.get('email') if isinstance(e, dict) else e for e in parsed]
            return [emails]
        except Exception:
            return [emails]
    if isinstance(emails, list):
        return [e.get('email') if isinstance(e, dict) else e for e in emails]
    return []

def get_emails_with_names(emails):
    result = {}
    if not emails:
        return result
    if isinstance(emails, str):
        try:
            parsed = json.loads(emails)
            emails = parsed
        except Exception:
            return {emails: ""}
    
    if isinstance(emails, dict):
        for k, v in emails.items():
            if isinstance(v, dict):
                result[k] = v.get("name", "")
            else:
                result[k] = ""
        return result
        
    if isinstance(emails, list):
        for e in emails:
            if isinstance(e, dict):
                email = e.get("email")
                if email:
                    result[email] = e.get("name", "")
            elif isinstance(e, str):
                result[e] = ""
    return result

class EvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Evaluation.objects.prefetch_related('sections').all().order_by('-created_at')
        if self.action == 'list':
            user = self.request.user
            if user and user.is_authenticated:
                qs = qs.filter(created_by=user)
            else:
                qs = qs.none()
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        user = request.user if (request.user and request.user.is_authenticated) else None
        if not user:
            email = request.query_params.get('email')
            if email:
                User = get_user_model()
                user = User.objects.filter(email=email).first()

        if user:
            submission = UserEvaluationSubmission.objects.filter(evaluation=instance, user=user).first()
            if not submission and instance.created_by_id != user.id and request.user and request.user.is_authenticated:
                submission = UserEvaluationSubmission.objects.create(
                    evaluation=instance,
                    user=user,
                    duration=0,
                    discussion_mode=DiscussionMode.AUTOMATIC
                )
                CandidateTimelineEvent.objects.get_or_create(
                    evaluation=instance,
                    candidate_email=user.email,
                    title=CandidateTimelineEventType.STARTED,
                    defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
                )
            if submission:
                data['submission_id'] = submission.id
                data['started_at'] = submission.created_at.isoformat()
                data['status'] = submission.hiring_status
                data['completed_at'] = submission.completed_at.isoformat() if submission.completed_at else None

        is_not_started = False
        start_error = None
        if instance.start_datetime and timezone.now() < instance.start_datetime:
            ist = zoneinfo.ZoneInfo('Asia/Kolkata')
            start_ist = instance.start_datetime.astimezone(ist)
            is_not_started = True
            start_error = f"This evaluation hasn't started yet. It will be accessible from {start_ist.strftime('%Y-%m-%d %I:%M %p')} IST."
            
        is_expired = False
        if instance.expiry_datetime and timezone.now() > instance.expiry_datetime:
            is_expired = True
            
        data['is_not_started'] = is_not_started
        data['start_error'] = start_error
        data['is_expired'] = is_expired

        return Response(data)
    
    def perform_create(self, serializer):
        user = self.request.user if self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated else None
        if not user:
            user = User.objects.filter(username="default_recruiter").first()
            if not user:
                user = User.objects.create(username="default_recruiter", email="default@example.com")
        
        # Ensure dict format
        validated_data = serializer.validated_data
        invited = validated_data.get('candidate_invited_emails', [])
        names_dict = get_emails_with_names(invited)
        
        if isinstance(invited, list):
            now_ms = int(time.time() * 1000)
            validated_data['candidate_invited_emails'] = {e: {"invited_at": now_ms, "name": names_dict.get(e, "")} for e in get_emails_list(invited)}
            
        instance = serializer.save(created_by=user)
        subject = self.request.data.get('subject', None) if hasattr(self, 'request') else None
        body = self.request.data.get('body', None) if hasattr(self, 'request') else None
        
        if instance.is_published and instance.candidate_invited_emails:
            emails_to_send = [{"email": k, "name": v.get("name", "") if isinstance(v, dict) else ""} for k, v in instance.candidate_invited_emails.items()]
            self.send_invitation_emails(instance, emails_to_send, subject=subject, body=body)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_emails = set(get_emails_list(old_instance.candidate_invited_emails))
        
        validated_data = serializer.validated_data
        if 'candidate_invited_emails' in validated_data:
            invited = validated_data['candidate_invited_emails']
            names_dict = get_emails_with_names(invited)
            
            # merge with old
            current = old_instance.candidate_invited_emails
            if isinstance(current, list):
                current = {e: {"invited_at": int(old_instance.created_at.timestamp() * 1000), "name": ""} for e in current}
            elif not isinstance(current, dict):
                current = {}
                
            for k, v in current.items():
                if not isinstance(v, dict):
                    current[k] = {"invited_at": v, "name": ""}
                    
            now_ms = int(time.time() * 1000)
            new_invited = get_emails_list(invited)
            
            final_invited = {}
            for e in new_invited:
                if e in current:
                    final_invited[e] = current[e]
                    # update name if provided and wasn't there
                    if names_dict.get(e):
                        final_invited[e]["name"] = names_dict[e]
                else:
                    final_invited[e] = {"invited_at": now_ms, "name": names_dict.get(e, "")}
            
            validated_data['candidate_invited_emails'] = final_invited
            
        instance = serializer.save()
        subject = self.request.data.get('subject', None) if hasattr(self, 'request') else None
        body = self.request.data.get('body', None) if hasattr(self, 'request') else None
        
        if instance.is_published and instance.candidate_invited_emails:
            if not old_instance.is_published:
                new_emails = set(get_emails_list(instance.candidate_invited_emails))
            else:
                new_emails = set(get_emails_list(instance.candidate_invited_emails)) - old_emails
                
            if new_emails:
                emails_to_send = [{"email": e, "name": instance.candidate_invited_emails[e].get("name", "") if isinstance(instance.candidate_invited_emails[e], dict) else ""} for e in new_emails]
                self.send_invitation_emails(instance, emails_to_send, subject=subject, body=body)


    def send_invitation_emails(self, evaluation, emails, subject=None, body=None):
        send_evaluation_email(evaluation, emails, is_reminder=False, custom_body=body, custom_subject=subject)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def invite(self, request, pk=None):
        evaluation = self.get_object()
        emails = request.data.get('emails', [])
        subject = request.data.get('subject', '')
        body = request.data.get('body', '')
        template = request.data.get('template', '')
        
        emails_list = get_emails_list(emails)
        names_dict = get_emails_with_names(emails)
        
        if not emails_list:
            return Response({"error": "No emails provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        new_emails = set(emails_list)
        
        current_invited = evaluation.candidate_invited_emails
        if isinstance(current_invited, str):
            try:
                current_invited = json.loads(current_invited)
            except:
                current_invited = []
                
        if isinstance(current_invited, list):
            fallback_ts = int(evaluation.created_at.timestamp() * 1000)
            current_invited = {email: {"invited_at": fallback_ts, "name": ""} for email in current_invited}
        elif not isinstance(current_invited, dict):
            current_invited = {}
            
        # Ensure dict format is { email: { invited_at, name } }
        for k, v in current_invited.items():
            if not isinstance(v, dict):
                current_invited[k] = {"invited_at": v, "name": ""}
                
        now_ms = int(time.time() * 1000)
        actually_new = []
        for email in new_emails:
            if email not in current_invited:
                current_invited[email] = {"invited_at": now_ms, "name": names_dict.get(email, "")}
                actually_new.append({"email": email, "name": names_dict.get(email, "")})
            else:
                if names_dict.get(email):
                    current_invited[email]["name"] = names_dict[email]
                
        evaluation.candidate_invited_emails = current_invited
        evaluation.save(update_fields=['candidate_invited_emails', 'updated_at'])
        
        self.send_invitation_emails(evaluation, actually_new, subject=subject, body=body or template)
        
        return Response({"status": "success", "invited": emails_list})

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def public_register(self, request, pk=None):
        evaluation = self.get_object()
        
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Authentication required. Please verify OTP first."}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = request.user
        phone = request.data.get('phone', '')
        
        submission = UserEvaluationSubmission.objects.filter(evaluation=evaluation, user=user).first()
        if submission:
            if phone and not submission.phone:
                submission.phone = phone
                submission.save(update_fields=['phone'])
        else:
            UserEvaluationSubmission.objects.create(
                evaluation=evaluation, 
                user=user,
                duration=0,
                discussion_mode=DiscussionMode.AUTOMATIC,
                phone=phone or ""
            )
        
        resume_url = request.data.get('resume_url')
        if resume_url:
            from authentication.models import Profile
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.resume_file = resume_url
            profile.save()
        
        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=user.email,
            title=CandidateTimelineEventType.INVITATION_SENT,
            defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
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
        
        # Check access times
        if evaluation.start_datetime and timezone.now() < evaluation.start_datetime:
            ist = zoneinfo.ZoneInfo('Asia/Kolkata')
            start_ist = evaluation.start_datetime.astimezone(ist)
            return Response({"is_expired": True, "error": f"This evaluation hasn't started yet. It will be accessible from {start_ist.strftime('%Y-%m-%d %I:%M %p')} IST.", "registered": False}, status=status.HTTP_200_OK)
            
        if evaluation.expiry_datetime and timezone.now() > evaluation.expiry_datetime:
            return Response({"is_expired": True, "error": "This evaluation has expired and is no longer accepting submissions.", "registered": False}, status=status.HTTP_200_OK)
            
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # We allow any email to register via the public link.
        # They will be tracked as 'Shared Link' source if not explicitly invited.
            
        User = get_user_model()
        user = User.objects.filter(email=email).first()
        if user and UserEvaluationSubmission.objects.filter(evaluation=evaluation, user=user, completed_at__isnull=False).exists():
            return Response({"registered": True, "title": evaluation.title})
        return Response({"registered": False, "title": evaluation.title})

    def _save_snapshot(self, file_obj, user, evaluation, prefix_override=None):
        try:
            attempt_count = 1
            ts = str(int(time.time() * 1000))
            prefix = prefix_override or "snapshot"
            
            ext = "png"
            if file_obj and hasattr(file_obj, 'name') and file_obj.name:
                parts = file_obj.name.rsplit('.', 1)
                if len(parts) > 1:
                    ext = parts[-1].lower()
                    
            filename = f"{prefix}_{ts}.{ext}"
            
            user_id = str(user.id)
            object_key = f"{user_id}/skill_evaluation/{evaluation.id}/attempt-{attempt_count}/{filename}"
            
            saved_key = upload_image(key=object_key, file_obj=file_obj)
            if saved_key:
                return build_public_url(saved_key) or saved_key
            return None
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
            submission, _ = UserEvaluationSubmission.objects.get_or_create(
                user=user,
                evaluation=evaluation,
                defaults={
                    'duration': 0,
                    'discussion_mode': DiscussionMode.AUTOMATIC
                }
            )
            
        image_file = request.FILES.get("snapshot")
        screen_file = request.FILES.get("screenshot")
        
        # Fallback if frontend sent initial screenshot under snapshot field
        if not screen_file and activity_type == "initial_screenshot_captured" and image_file:
            screen_file = image_file
            image_file = None
        
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
        
        question_id = request.data.get("question_id")
        if question_id:
            event["question_id"] = question_id
            
        question_title = request.data.get("question_title")
        if question_title:
            event["question_title"] = question_title
            
        if image_path:
            event["image_path"] = image_path
        if screen_path:
            event["screen_path"] = screen_path
            
        non_violation_types = [
            "snapshot", 
            "screen_snapshot", 
            "camera_enabled", 
            "camera_disabled", 
            "passport_photo_captured", 
            "initial_screenshot_captured"
        ]
        
        CRITICAL_VIOLATION_TYPES = [
            "new_tab_detected", "new_window_detected", "devtools_opened", 
            "camera_disabled", "microphone_disabled", "face_not_detected", 
            "multiple_faces_detected", "face_recognition_failed", "violation_critical"
        ]
        GENERAL_VIOLATION_TYPES = [
            "copy_detected", "paste_detected", "cut_detected", 
            "select_all_detected", "right_click_detected", "keyboard_shortcut", 
            "screenshot_detected", "suspicious_movement", "violation_warning", "tab_switched"
        ]
        
        is_proctoring = (
            activity_type in CRITICAL_VIOLATION_TYPES
            or activity_type in GENERAL_VIOLATION_TYPES
            or activity_type in ["snapshot", "screen_snapshot"]
            or bool(image_path)
            or bool(screen_path)
        )
        is_violation = is_proctoring and (activity_type not in non_violation_types)
        
        with transaction.atomic():
            submission = UserEvaluationSubmission.objects.select_for_update().get(id=submission.id)
            if is_violation:
                if not isinstance(submission.proctoring_events, list):
                    submission.proctoring_events = []
                submission.proctoring_events.append(event)
                submission.save(update_fields=['proctoring_events', 'updated_at'])
            else:
                if not isinstance(submission.general_events, list):
                    submission.general_events = []
                submission.general_events.append(event)
                submission.save(update_fields=['general_events', 'updated_at'])
        
        # Calculate violations (we can refine this later if section-based)
        sub_violations = len(submission.proctoring_events) if isinstance(submission.proctoring_events, list) else 0
        sub_tab_switches = sum(1 for e in (submission.proctoring_events if isinstance(submission.proctoring_events, list) else []) if e.get('activity_type') == 'tab_switched' and isinstance(e.get('meta_data'), dict) and e.get('meta_data').get('type') == 'hidden')
        
        return Response({
            'status': 'logged',
            'tab_switch_count': sub_tab_switches,
            'total_violations': sub_violations,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_candidate_status(self, request, pk=None):
        evaluation = self.get_object()
        email = request.data.get('email')
        new_status = request.data.get('status')
        
        if not email or not new_status:
            return Response({"error": "email and status are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        submission = UserEvaluationSubmission.objects.filter(evaluation=evaluation, user__email=email).first()
        if not submission:
            # Fallback if email doesn't strictly match a user submission (e.g. they haven't started but are invited)
            # Yuvro currently tracks hiring status on the submission model.
            return Response({"error": "Submission not found for this email"}, status=status.HTTP_404_NOT_FOUND)
            
        submission.hiring_status = new_status
        submission.save(update_fields=['hiring_status'])
        
        return Response({"status": "success", "message": f"Updated hiring status to {new_status}"})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def force_finish_submissions(self, request, pk=None):
        evaluation = self.get_object()
        candidate_emails = request.data.get('candidate_emails', [])
        
        if not candidate_emails:
            return Response({"error": "No candidates provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        submissions = UserEvaluationSubmission.objects.filter(
            evaluation=evaluation, 
            user__email__in=candidate_emails, 
            completed_at__isnull=True
        )
        
        count = 0
        for submission in submissions:
            submission.completed_at = timezone.now()
            submission.save(update_fields=['completed_at'])
            
            user = submission.user
            CandidateTimelineEvent.objects.get_or_create(
                evaluation=evaluation,
                candidate_email=user.email,
                title=CandidateTimelineEventType.AUTO_SUBMITTED,
                defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": request.user}
            )
            
            has_vitarka = any(sec.type == "VITARKA_AI_INTERVIEW" for sec in evaluation.sections.all())
            has_started_vitarka = False
            if has_vitarka and isinstance(submission.general_events, list):
                for event in submission.general_events:
                    if isinstance(event, dict) and event.get('activity_type') == 'vitarka_session_started':
                        has_started_vitarka = True
                        break
                        
            if has_vitarka and has_started_vitarka:
                CandidateTimelineEvent.objects.get_or_create(
                    evaluation=evaluation,
                    candidate_email=user.email,
                    title=CandidateTimelineEventType.VITARKA_COMPLETED,
                    defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": request.user}
                )

            has_proctoring = any(sec.proctoring_config for sec in evaluation.sections.all())
            if has_proctoring:
                from .face_verification_proxy import run_async_face_verification
                run_async_face_verification(UserEvaluationSubmission, submission.id)
                
            count += 1
            
        return Response({"status": "success", "message": f"Force finished {count} submissions."})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def finish(self, request, pk=None):
        evaluation = self.get_object()
        user = request.user
        
        submission = UserEvaluationSubmission.objects.filter(user=user, evaluation=evaluation).first()
        if not submission:
            return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)
            
        submission.completed_at = timezone.now()
        submission.save(update_fields=['completed_at'])
        
        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=user.email,
            title=CandidateTimelineEventType.STARTED,
            defaults={"status": "SUCCESS", "occurred_at": submission.created_at or timezone.now(), "created_by": user}
        )

        has_vitarka = any(sec.type == "VITARKA_AI_INTERVIEW" for sec in evaluation.sections.all())
        has_started_vitarka = False
        if has_vitarka and isinstance(submission.general_events, list):
            for event in submission.general_events:
                if isinstance(event, dict) and event.get('activity_type') == 'vitarka_session_started':
                    has_started_vitarka = True
                    break
                    
        if has_vitarka and has_started_vitarka:
            CandidateTimelineEvent.objects.get_or_create(
                evaluation=evaluation,
                candidate_email=user.email,
                title=CandidateTimelineEventType.VITARKA_COMPLETED,
                defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
            )
            
        if UserLabQuestionBankSubmission.objects.filter(user=user, evaluation=evaluation).exists():
            CandidateTimelineEvent.objects.get_or_create(
                evaluation=evaluation,
                candidate_email=user.email,
                title=CandidateTimelineEventType.LABS_SUBMITTED,
                defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
            )

        if UserKnowledgeAssessmentSubmission.objects.filter(user=user, evaluation=evaluation).exists():
            CandidateTimelineEvent.objects.get_or_create(
                evaluation=evaluation,
                candidate_email=user.email,
                title=CandidateTimelineEventType.ASSESSMENT_SUBMITTED,
                defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
            )

        auto_submitted = request.data.get('auto_submitted', False)

        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=user.email,
            title=CandidateTimelineEventType.AUTO_SUBMITTED if auto_submitted else CandidateTimelineEventType.EVALUATION_FINISHED,
            defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
        )
        
        has_proctoring = any(sec.proctoring_config for sec in evaluation.sections.all())
        if has_proctoring:
            from .face_verification_proxy import run_async_face_verification
            run_async_face_verification(UserEvaluationSubmission, submission.id)
            
        return Response({"status": "success", "message": "Evaluation finished successfully"})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def start_lab(self, request, pk=None):
        evaluation = self.get_object()
        lab_id = request.data.get('lab_id')
        if not lab_id:
            return Response({"error": "lab_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            lab = LabQuestionBank.objects.get(id=lab_id)
        except LabQuestionBank.DoesNotExist:
            return Response({"error": "Lab not found"}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        submission, created = UserLabQuestionBankSubmission.objects.get_or_create(
            user=request.user,
            evaluation=evaluation,
            lab_question=lab,
            defaults={'started_at': now, 'status': 'IN_PROGRESS'}
        )
        if not submission.started_at:
            submission.started_at = now
            submission.save(update_fields=['started_at'])

        return Response({"status": "started", "started_at": submission.started_at})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_lab(self, request, pk=None):
        evaluation = self.get_object()
        lab_id = request.data.get('lab_id')
        
        if not lab_id:
            return Response({"error": "lab_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            lab = LabQuestionBank.objects.get(id=lab_id)
        except LabQuestionBank.DoesNotExist:
            return Response({"error": "Lab not found"}, status=status.HTTP_404_NOT_FOUND)
            
        status_val = request.data.get('status', 'in_review')
        solution = request.data.get('solution', '')
        now = timezone.now()

        existing = UserLabQuestionBankSubmission.objects.filter(
            user=request.user, evaluation=evaluation, lab_question=lab
        ).first()

        started_at = None
        if existing and existing.started_at:
            started_at = existing.started_at
        elif request.data.get('started_at'):
            from django.utils.dateparse import parse_datetime
            started_at = parse_datetime(str(request.data.get('started_at')))

        if not started_at:
            if existing and existing.created_at:
                started_at = existing.created_at
            else:
                raw_seconds = request.data.get('seconds_solved') or request.data.get('time_taken_seconds')
                try:
                    calc_seconds = max(0, int(raw_seconds)) if raw_seconds is not None else 0
                except (ValueError, TypeError):
                    calc_seconds = 0
                started_at = now - timezone.timedelta(seconds=calc_seconds) if calc_seconds > 0 else now

        score_val = request.data.get('score')
        solution_output_val = request.data.get('solution_output')
        defaults = {
            'status': status_val,
            'started_at': started_at,
            'submitted_at': now,
        }
        if solution:
            defaults['solution'] = solution
        if score_val is not None:
            try:
                defaults['score'] = int(score_val)
            except (ValueError, TypeError):
                pass
        if solution_output_val is not None:
            defaults['solution_output'] = solution_output_val

        submission, created = UserLabQuestionBankSubmission.objects.update_or_create(
            user=request.user,
            evaluation=evaluation,
            lab_question=lab,
            defaults=defaults
        )
        
        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=request.user.email,
            title=CandidateTimelineEventType.LABS_SUBMITTED,
            defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": request.user}
        )
        
        if status_val in ['in_review', 'done']:
            user_dir = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation.id), "users", str(request.user.id), "labs", str(lab.id))
            if os.path.exists(user_dir):
                import subprocess
                try:
                    subprocess.run(["git", "add", "-A", "-N"], cwd=user_dir, check=True, capture_output=True)
                    diff_output = subprocess.check_output(
                        [
                            "git", "diff", "-U99999", "HEAD", "--", ".",
                            ":(exclude)*.sqlite3", ":(exclude)*.db", ":(exclude)*.sqlite",
                            ":(exclude)*.db-journal", ":(exclude)*.db-wal", ":(exclude)*.dbsqlite3",
                            ":(exclude)*.zip", ":(exclude)*.tar", ":(exclude)*.gz",
                            ":(exclude)*.pyc", ":(exclude)*__pycache__*",
                            ":(exclude)*.log", ":(exclude)*bash_history*",
                            ":(exclude)README.md", ":(exclude).gitignore", ":(exclude)requirements.txt"
                        ], 
                        cwd=user_dir,
                        stderr=subprocess.DEVNULL
                    ).decode()
                    if diff_output:
                        submission.solution = diff_output
                        if submission.score == 0 and ("HTTP_201_CREATED" in diff_output or "201_CREATED" in diff_output):
                            submission.score = 2
                        submission.save(update_fields=['solution', 'score'])
                except Exception as e:
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Failed to generate git diff for lab {lab.id}: {e}")
                
                tasks = lab.tasks.all().order_by('order_index')
                selected_task_ids = None
                for sec in evaluation.sections.filter(type=EvaluationSectionType.LAB):
                    for q in sec.questions or []:
                        if isinstance(q, dict) and str(q.get('id') or q.get('lab_id')) == str(lab.id):
                            if q.get('selected_task_ids'):
                                selected_task_ids = [str(tid) for tid in q.get('selected_task_ids')]
                            elif q.get('selected_task_id'):
                                selected_task_ids = [str(q.get('selected_task_id'))]
                            break
                    if selected_task_ids:
                        break

                if selected_task_ids:
                    tasks = [t for t in tasks if str(t.id) in selected_task_ids or getattr(t, 'task_slug', None) in selected_task_ids or str(t.title) in selected_task_ids]

                executer_host = os.environ.get("CODE_EXECUTOR_URL", os.environ.get("CODE_EXECUTER_URL", "http://yuvro-code-executor:8009"))

                if is_database_lab(lab, tasks):
                    import requests
                    import json
                    db_engine = "sqlite"
                    if lab.databases and any("mongo" in str(d).lower() for d in lab.databases):
                        db_engine = "mongodb"
                    elif lab.databases and any("mysql" in str(d).lower() for d in lab.databases):
                        db_engine = "mysql"
                    elif lab.databases and any("postgres" in str(d).lower() for d in lab.databases):
                        db_engine = "postgresql"

                    payload_tasks = []
                    for i, task in enumerate(tasks, start=1):
                        expected_sol = task.solution or {}
                        rules = task.scoring_rules or {}
                        if rules.get("database_engine"):
                            db_engine = rules.get("database_engine")
                        
                        task_ext = "js" if db_engine in ["mongodb", "mongo", "mongosh"] else "sql"
                        
                        expected_query = ""
                        if isinstance(expected_sol, dict):
                            expected_query = (
                                expected_sol.get(f"task{i}.{task_ext}")
                                or expected_sol.get(f"task_{i}.{task_ext}")
                                or expected_sol.get(f"task{i}")
                                or expected_sol.get(f"query.{task_ext}")
                                or expected_sol.get("query.sql")
                                or expected_sol.get("query.js")
                                or (list(expected_sol.values())[0] if expected_sol else "")
                            )
                        elif isinstance(expected_sol, str):
                            expected_query = expected_sol

                        if not expected_query and rules.get("system_query"):
                            expected_query = rules.get("system_query")

                        exp_out = getattr(task, 'expected_output', None) or rules.get("expected_output", "")
                        if isinstance(exp_out, (dict, list)):
                            exp_out_str = json.dumps(exp_out)
                        else:
                            exp_out_str = str(exp_out) if exp_out is not None else ""
                        
                        payload_tasks.append({
                            "task_id": str(task.id),
                            "task_file": f"task{i}.{task_ext}",
                            "expected_query": expected_query,
                            "expected_output": exp_out_str,
                            "scoring_rules": rules,
                            "system_query": rules.get("system_query", ""),
                            "expected_result": rules.get("expected_result", "")
                        })
                        
                    try:
                        db_conn_url = getattr(lab, 'connection_url', None) or ""
                        response = requests.post(f"{executer_host}/workspace/database_submit", json={
                            "user_id": str(request.user.id),
                            "lab_id": str(lab.id),
                            "sprint_id": str(lab.id),
                            "database_engine": db_engine,
                            "evaluation_id": str(evaluation.id),
                            "connection_url": db_conn_url,
                            "tasks": payload_tasks
                        }, timeout=30)
                        if response.status_code == 200:
                            result_data = response.json()
                            submission.solution_output = json.dumps(result_data)
                            tasks_list = result_data.get("tasks", [])
                            if tasks_list and len(tasks_list) > 0:
                                passed_count = sum(1 for t in tasks_list if t.get("passed"))
                                calc_score = round((passed_count / len(tasks_list)) * 100)
                            else:
                                calc_score = round(float(result_data.get("percentage", 0)))
                            submission.score = calc_score
                            submission.save(update_fields=['solution_output', 'score'])
                    except Exception as e:
                        logger = logging.getLogger(__name__)
                        logger.error(f"Failed to submit database lab to executer: {e}")
                elif getattr(lab, 'test_command', None) and lab.test_command.strip():
                    import requests
                    import json
                    try:
                        response = requests.post(f"{executer_host}/workspace/run_test_command", json={
                            "user_id": str(request.user.id),
                            "lab_id": str(lab.id),
                            "sprint_id": str(lab.id),
                            "command": lab.test_command.strip(),
                            "evaluation_id": str(evaluation.id)
                        }, timeout=35)
                        if response.status_code == 200:
                            result_data = response.json()
                            submission.solution_output = json.dumps(result_data)
                            
                            res_tasks = result_data.get("tasks")
                            if isinstance(res_tasks, dict) and selected_task_ids:
                                total_sel_score = 0
                                max_sel_score = 0
                                task_list = list(tasks)
                                for t in task_list:
                                    t_max = getattr(t, 'marks', 10) or 10
                                    max_sel_score += t_max
                                    matched_res = None
                                    for k, v in res_tasks.items():
                                        if str(k) in [str(t.id), getattr(t, 'task_slug', None), str(t.title)] or f"task{task_list.index(t)+1}" == str(k).lower():
                                            matched_res = v
                                            break
                                    if matched_res:
                                        is_pass = matched_res.get("result") == "passed" or matched_res.get("status") == "passed" or (matched_res.get("score") or 0) > 0
                                        if is_pass:
                                            t_score = matched_res.get("score", t_max)
                                            total_sel_score += min(t_score, t_max) if isinstance(t_score, (int, float)) and t_score > 0 else t_max
                                
                                if max_sel_score > 0:
                                    calc_score = round((total_sel_score / max_sel_score) * 100)
                                else:
                                    calc_score = result_data.get("total_score", 0)
                            else:
                                calc_score = result_data.get("total_score")
                                if calc_score is None:
                                    calc_score = result_data.get("percentage", 0)
                                calc_score = int(calc_score)
                            
                            if calc_score > 0 or submission.score == 0:
                                submission.score = calc_score
                            submission.save(update_fields=['solution_output', 'score'])
                    except Exception as e:
                        logger = logging.getLogger(__name__)
                        logger.error(f"Failed to submit test_command lab to executer: {e}")
        
        return Response({"status": "success"})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_knowledge_answers(self, request, pk=None):
        evaluation = self.get_object()
        section_id = request.data.get('section_id')
        answers = request.data.get('answers', [])
        
        if not section_id:
            return Response({"error": "section_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            section = EvaluationSection.objects.get(id=section_id, evaluation=evaluation)
        except EvaluationSection.DoesNotExist:
            return Response({"error": "Section not found"}, status=status.HTTP_404_NOT_FOUND)
            
        questions_by_id = {str(q.get('id')): q for q in (section.questions or [])}
        computed_score = 0
        evaluated_answers = []

        for a in answers:
            qid = str(a.get('question_id') or a.get('question'))
            q = questions_by_id.get(qid)
            user_opt = a.get('selected_option')
            if user_opt is None:
                user_opt = a.get('selected_options')
            
            is_corr = False
            if q:
                mcq_opts = q.get('mcq_options') or q.get('options') or []
                if mcq_opts:
                    if isinstance(mcq_opts[0], dict):
                        corr_indices = [i for i, opt in enumerate(mcq_opts) if opt.get('is_correct')]
                    else:
                        corr_val = q.get('correct') if q.get('correct') is not None else q.get('correct_answer')
                        corr_indices = corr_val if isinstance(corr_val, list) else ([corr_val] if corr_val is not None else [])
                    
                    user_indices = user_opt if isinstance(user_opt, list) else ([user_opt] if user_opt is not None else [])
                    try:
                        user_indices = [int(x) for x in user_indices if x is not None]
                        corr_indices = [int(x) for x in corr_indices if x is not None]
                        is_corr = len(corr_indices) > 0 and sorted(user_indices) == sorted(corr_indices)
                    except (ValueError, TypeError):
                        is_corr = False
                elif q.get('correct') is not None or q.get('correct_answer') is not None:
                    expected = q.get('correct') if q.get('correct') is not None else q.get('correct_answer')
                    is_corr = str(user_opt).strip() == str(expected).strip()
            else:
                is_corr = bool(a.get('is_correct'))
            
            if is_corr:
                q_marks = float(q.get('marks') or 1) if q else 1
                computed_score += q_marks

            seconds_spent = 0
            if a.get('seconds_spent') is not None:
                try:
                    seconds_spent = int(a.get('seconds_spent'))
                except (ValueError, TypeError):
                    seconds_spent = 0
            elif a.get('seconds') is not None:
                try:
                    seconds_spent = int(a.get('seconds'))
                except (ValueError, TypeError):
                    seconds_spent = 0

            evaluated_answers.append({
                'question_id': qid,
                'selected_option': user_opt,
                'is_correct': is_corr,
                'seconds_spent': seconds_spent
            })

        if evaluated_answers and all(ans.get('seconds_spent', 0) == 0 for ans in evaluated_answers):
            last_event = CandidateTimelineEvent.objects.filter(
                evaluation=evaluation,
                candidate_email=request.user.email,
                title__in=[CandidateTimelineEventType.STARTED, CandidateTimelineEventType.LABS_SUBMITTED]
            ).order_by('-occurred_at').first()
            if last_event and last_event.occurred_at:
                elapsed = max(1, round((timezone.now() - last_event.occurred_at).total_seconds()))
                per_q = max(1, round(elapsed / len(evaluated_answers)))
                for ea in evaluated_answers:
                    ea['seconds_spent'] = per_q

        submission, created = UserKnowledgeAssessmentSubmission.objects.update_or_create(
            user=request.user,
            evaluation=evaluation,
            section=section,
            defaults={
                'answers': evaluated_answers,
                'total_questions': len(section.questions or answers),
                'score': int(computed_score)
            }
        )
        
        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=request.user.email,
            title=CandidateTimelineEventType.ASSESSMENT_SUBMITTED,
            defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": request.user}
        )
        
        return Response({"status": "success"})

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def submissions(self, request, pk=None):
        evaluation = self.get_object()
        submissions = UserEvaluationSubmission.objects.filter(evaluation=evaluation).select_related('user')
        serializer = UserEvaluationSubmissionSerializer(submissions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def generate_share_link(self, request, pk=None):
        evaluation = self.get_object()
        candidate_email = request.data.get('candidate_email')
        candidate_id = request.data.get('candidate_id')
        
        from django.db.models import Q
        import secrets
        from datetime import timedelta

        query = Q(evaluation=evaluation)
        if candidate_id and candidate_email:
            query &= (Q(id=candidate_id) | Q(user__id=candidate_id) | Q(user__email__iexact=candidate_email))
        elif candidate_id:
            query &= (Q(id=candidate_id) | Q(user__id=candidate_id))
        elif candidate_email:
            query &= Q(user__email__iexact=candidate_email)
        else:
            return Response({"error": "candidate_email or candidate_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        submission = UserEvaluationSubmission.objects.filter(query).first()
        if not submission:
            # Fallback: find submission in this evaluation by candidate email or candidate id
            if candidate_email:
                submission = UserEvaluationSubmission.objects.filter(evaluation=evaluation, user__email__iexact=candidate_email).first()
            if not submission and candidate_id:
                submission = UserEvaluationSubmission.objects.filter(evaluation=evaluation, id=candidate_id).first()
            if not submission:
                return Response({"error": "Candidate submission not found"}, status=status.HTTP_404_NOT_FOUND)
        
        token = secrets.token_urlsafe(12)
        submission.share_token = token
        submission.share_token_expires_at = timezone.now() + timedelta(days=30)
        submission.save(update_fields=['share_token', 'share_token_expires_at'])
        
        return Response({
            "token": token,
            "expires_at": submission.share_token_expires_at
        })

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def start_lab(self, request, pk=None):
        evaluation = self.get_object()
        lab_id = request.data.get('lab_id')
        
        if not lab_id:
            return Response({"error": "lab_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            lab = LabQuestionBank.objects.get(id=lab_id)
        except LabQuestionBank.DoesNotExist:
            return Response({"error": "Lab not found"}, status=status.HTTP_404_NOT_FOUND)
            
        starter_repo_path = None
        if lab.git_repo_starter_url:
            starter_repo_name = get_repo_name_from_url(lab.git_repo_starter_url)
            starter_repo_path = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation.id), "labs", str(lab.id), starter_repo_name)
            if not os.path.exists(starter_repo_path):
                try:
                    from lab.workspace_manager import provision_evaluation_lab_starter_repo
                    provision_evaluation_lab_starter_repo(evaluation.id, lab.id, lab.git_repo_starter_url, branch=lab.git_repo_starter_branch)
                except Exception as e:
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error provisioning starter repo for lab {lab.id}: {e}")
        
        user = request.user if (request.user and request.user.is_authenticated) else None
        user_id = user.id if user else (request.data.get('user_id') or "anon")

        try:
            provision_evaluation_user_repo(evaluation.id, lab.id, user_id, starter_repo_path)
            return Response({"status": "success", "message": "Lab workspace provisioned successfully"})
        except Exception as e:
            return Response({"error": f"Failed to provision workspace: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def provision_labs(self, request, pk=None):
        evaluation = self.get_object()
        
        user = request.user if (request.user and request.user.is_authenticated) else None
        user_id = user.id if user else (request.data.get('user_id') or "anon")

        labs_provisioned = 0
        for section in evaluation.sections.all():
            if section.type != 'LAB' or not section.questions:
                continue
                
            for question in section.questions:
                lab_id = None
                if isinstance(question, dict):
                    lab_id = question.get('id')
                elif isinstance(question, str):
                    match = re.search(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', question)
                    if match:
                        lab_id = match.group(0)
                    else:
                        lab_id = question
                else:
                    lab_id = str(question)

                if not lab_id:
                    continue
                    
                try:
                    lab = LabQuestionBank.objects.get(id=lab_id)
                    starter_repo_path = None
                    if lab.git_repo_starter_url:
                        starter_repo_name = get_repo_name_from_url(lab.git_repo_starter_url)
                        starter_repo_path = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation.id), "labs", str(lab.id), starter_repo_name)
                        if not os.path.exists(starter_repo_path):
                            try:
                                from lab.workspace_manager import provision_evaluation_lab_starter_repo
                                provision_evaluation_lab_starter_repo(evaluation.id, lab.id, lab.git_repo_starter_url, branch=lab.git_repo_starter_branch)
                            except Exception as e:
                                logger = logging.getLogger(__name__)
                                logger.error(f"Error provisioning starter repo for lab {lab.id}: {e}")
                    
                    try:
                        provision_evaluation_user_repo(evaluation.id, lab.id, user_id, starter_repo_path)
                        labs_provisioned += 1
                    except Exception as e:
                        logger = logging.getLogger(__name__)
                        logger.error(f"Failed to provision lab workspace {lab_id}: {e}", exc_info=True)
                except LabQuestionBank.DoesNotExist:
                    pass

        return Response({"status": "success", "message": f"{labs_provisioned} lab workspace(s) provisioned successfully"})

    @action(detail=True, methods=['get', 'post'], permission_classes=[AllowAny])
    def follow_ups(self, request, pk=None):
        evaluation = self.get_object()
        
        if request.method == 'GET':
            config = FollowUpConfig.objects.filter(evaluation=evaluation).first()
            candidates = FollowUpCandidate.objects.filter(evaluation=evaluation)
            return Response({
                "config": FollowUpConfigSerializer(config).data if config else None,
                "candidates": FollowUpCandidateSerializer(candidates, many=True).data
            })
            
        elif request.method == 'POST':
            data = request.data
            config_data = data.get('config', {})
            candidates_data = data.get('candidates', [])
            
            config, _ = FollowUpConfig.objects.update_or_create(
                evaluation=evaluation,
                defaults={
                    'start_date': config_data.get('startDate') or None,
                    'deadline': config_data.get('deadline') or None,
                    'timezone': config_data.get('timezone', 'UTC'),
                    'smart_followups': config_data.get('smart', True),
                    'reminder1': config_data.get('reminder1', ''),
                    'reminder1_custom_time': config_data.get('reminder1CustomDate') or None,
                    'reminder2': config_data.get('reminder2', ''),
                    'reminder2_custom_time': config_data.get('reminder2CustomDate') or None,
                    'email_template': config_data.get('emailTemplate', ''),
                    'ai_call': config_data.get('aiCall', False),
                    'ai_timing': config_data.get('aiTiming', '4 Hours Before Deadline'),
                    'language': config_data.get('language', 'English'),
                    'voice': config_data.get('voice', 'Aria (Female)'),
                    'created_by': evaluation.created_by
                }
            )
            
            # Upsert candidates
            processed_emails = set()
            newly_added_emails = set()
            for cand in candidates_data:
                email = cand.get('email')
                if not email:
                    continue
                processed_emails.add(email)
                obj, created = FollowUpCandidate.objects.update_or_create(
                    evaluation=evaluation,
                    email=email,
                    defaults={
                        'name': cand.get('name', ''),
                        'phone': cand.get('phone', ''),
                        'followups_enabled': config.smart_followups,
                        'created_by': evaluation.created_by
                    }
                )
                if created:
                    newly_added_emails.add(email)
                    
            if newly_added_emails:
                current_invited = evaluation.candidate_invited_emails
                if isinstance(current_invited, str):
                    try:
                        current_invited = json.loads(current_invited)
                    except:
                        current_invited = []
                
                if isinstance(current_invited, list):
                    fallback_ts = int(evaluation.created_at.timestamp() * 1000)
                    current_invited = {e: fallback_ts for e in current_invited}
                elif not isinstance(current_invited, dict):
                    current_invited = {}
                    
                now_ms = int(time.time() * 1000)
                for email in newly_added_emails:
                    if email not in current_invited:
                        current_invited[email] = now_ms
                
                evaluation.candidate_invited_emails = current_invited
                evaluation.save(update_fields=['candidate_invited_emails', 'updated_at'])
            
            if processed_emails and config.smart_followups:
                from .email_utils import send_evaluation_email
                send_evaluation_email(
                    evaluation, 
                    list(processed_emails), 
                    is_reminder=True, 
                    custom_body=config.email_template if config and config.email_template else None
                )
            
            return Response({"status": "success"})

    @action(detail=True, methods=['post'])
    def toggle_followup(self, request, pk=None):
        evaluation = self.get_object()
        email = request.data.get('email')
        enabled = request.data.get('enabled', True)
        
        if not email:
            return Response({"error": "email is required"}, status=400)
            
        try:
            candidate = FollowUpCandidate.objects.get(evaluation=evaluation, email=email)
            candidate.followups_enabled = enabled
            candidate.save(update_fields=['followups_enabled'])
            return Response({"status": "success", "enabled": enabled})
        except FollowUpCandidate.DoesNotExist:
            return Response({"error": "Candidate not found"}, status=404)
            
    @action(detail=True, methods=['post'])
    def remove_followup(self, request, pk=None):
        evaluation = self.get_object()
        email = request.data.get('email')
        
        if not email:
            return Response({"error": "email is required"}, status=400)
            
        FollowUpCandidate.objects.filter(evaluation=evaluation, email=email).delete()
        
        # Also remove from candidate_invited_emails so they disappear from Candidate Records
        invited = evaluation.candidate_invited_emails
        if isinstance(invited, str):
            import json
            try:
                invited = json.loads(invited)
            except:
                invited = []
                
        if isinstance(invited, list):
            if email in invited:
                invited.remove(email)
                evaluation.candidate_invited_emails = invited
                evaluation.save(update_fields=['candidate_invited_emails'])
        elif isinstance(invited, dict):
            if email in invited:
                del invited[email]
                evaluation.candidate_invited_emails = invited
                evaluation.save(update_fields=['candidate_invited_emails'])
                
        return Response({"status": "success"})

    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        evaluation = self.get_object()
        email = request.data.get('email')
        
        if not email:
            return Response({"error": "email is required"}, status=400)
            
        from .email_utils import send_evaluation_email
        config = FollowUpConfig.objects.filter(evaluation=evaluation).first()
        try:
            candidate = FollowUpCandidate.objects.get(evaluation=evaluation, email=email)
            candidate.emails_sent_count += 1
            candidate.activity = "Reminder Sent Manually"
            candidate.save(update_fields=['emails_sent_count', 'activity'])
        except:
            pass
            
        send_evaluation_email(
            evaluation, 
            [email], 
            is_reminder=True, 
            custom_body=config.email_template if config and config.email_template else None
        )
        return Response({"status": "success"})
        
    @action(detail=True, methods=['post'])
    def edit_candidate_deadline(self, request, pk=None):
        evaluation = self.get_object()
        email = request.data.get('email')
        deadline = request.data.get('deadline')
        
        if not email or not deadline:
            return Response({"error": "email and deadline are required"}, status=400)
            
        try:
            candidate = FollowUpCandidate.objects.get(evaluation=evaluation, email=email)
            candidate.deadline = deadline
            candidate.save(update_fields=['deadline'])
            return Response({"status": "success"})
        except FollowUpCandidate.DoesNotExist:
            return Response({"error": "Candidate not found"}, status=404)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def update_candidate_status(self, request, pk=None):
        evaluation = self.get_object()
        candidate_email = request.data.get("email")
        hiring_status = request.data.get("status")

        if not candidate_email or not hiring_status:
            return Response({"error": "email and status are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(email=candidate_email)
            submission = UserEvaluationSubmission.objects.get(evaluation=evaluation, user=user)
            submission.hiring_status = hiring_status
            submission.save(update_fields=['hiring_status'])
            return Response({"status": "success"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def records(self, request, pk=None):
        evaluation = self.get_object()
        
        invited_emails = set(get_emails_list(evaluation.candidate_invited_emails))
                
        followup_cands = {c.email: c for c in evaluation.followup_candidates.all()}
        submissions = {s.user.email: s for s in evaluation.submissions.select_related('user').all()}
        
        lab_subs = UserLabQuestionBankSubmission.objects.filter(evaluation=evaluation).select_related('user')
        ka_subs = UserKnowledgeAssessmentSubmission.objects.filter(evaluation=evaluation).select_related('user')
        
        lab_scores_by_email = {}
        for ls in lab_subs:
            email = ls.user.email
            lab_scores_by_email[email] = lab_scores_by_email.get(email, 0) + ls.score
            
        ka_scores_by_email = {}
        for ks in ka_subs:
            email = ks.user.email
            ka_scores_by_email[email] = ka_scores_by_email.get(email, 0) + ks.score

        all_emails = invited_emails.union(followup_cands.keys()).union(submissions.keys())
        
        records_list = []
        for email in all_emails:
            fc = followup_cands.get(email)
            sub = submissions.get(email)
            
            if email in followup_cands:
                source = "Follow-up Setup"
            elif email in invited_emails:
                source = "Yuvro Invite"
            else:
                source = "Shared Link"
                
            name = fc.name if fc else (f"{sub.user.first_name} {sub.user.last_name}".strip() if sub else "")
            if not name:
                name = email.split('@')[0]
                
            phone = fc.phone if fc else ""
            
            submitted_at = int(sub.completed_at.timestamp() * 1000) if sub and sub.completed_at else None
            status_val = "Submitted" if sub and sub.completed_at else "Not Submitted"
            
            sent_at = None
            if fc and fc.created_at:
                sent_at = int(fc.created_at.timestamp() * 1000)
            elif source == "Yuvro Invite":
                invites_data = evaluation.candidate_invited_emails
                if isinstance(invites_data, str):
                    try:
                        invites_data = json.loads(invites_data)
                    except:
                        pass
                if isinstance(invites_data, dict) and email in invites_data:
                    sent_at = invites_data[email]
                elif evaluation.created_at:
                    sent_at = int(evaluation.created_at.timestamp() * 1000)
            elif source == "Shared Link" and sub and sub.created_at:
                sent_at = int(sub.created_at.timestamp() * 1000)
            
            l_score = lab_scores_by_email.get(email)
            a_score = ka_scores_by_email.get(email)
            v_score = None
            
            total = 0
            has_score = False
            if l_score is not None:
                total += l_score
                has_score = True
            if a_score is not None:
                total += a_score
                has_score = True
                
            final_score = total if has_score else None
            
            result_val = "Not Evaluated"
            if sub and getattr(sub, 'hiring_status', None):
                hs = sub.hiring_status
                if hs in ["Passed", "Failed", "Not Evaluated"]:
                    result_val = hs
                else:
                    result_val = "Passed" if (final_score and final_score >= 50) else "Failed"

            records_list.append({
                "id": email,
                "candidateId": email,
                "name": name,
                "email": email,
                "phone": phone,
                "source": source,
                "sentAt": sent_at,
                "accessedAt": None,
                "status": status_val,
                "submittedAt": submitted_at,
                "score": final_score,
                "result": result_val,
                "followUp": fc.followups_enabled if fc else False,
                "labsScore": l_score,
                "assessmentScore": a_score,
                "vitarkaScore": v_score,
                "eci": final_score,
                "deadline": None,
                "emailsSent": fc.emails_sent_count if fc else 0,
                "aiCall": False,
                "lastActivity": submitted_at or int(time.time() * 1000),
                "activity": []
            })
            
        records_list.sort(key=lambda x: x['lastActivity'] or 0, reverse=True)
        return Response(records_list)

def export_lab_question_to_fixture(lab_question):
    """
    Exports a LabQuestionBank instance and its tasks into standard
    dev fixture JSON format at skill_evaluation/fixtures/dev/<slug>.json
    """
    slug = re.sub(r'[^a-z0-9_]+', '_', (lab_question.title or '').lower().strip()).strip('_')
    if not slug:
        slug = f"lab_question_{lab_question.id}"

    tasks_data = []
    for task in lab_question.tasks.all().order_by("order_index"):
        scoring_rules = task.scoring_rules or {
            "logic_score": task.marks,
            "clean_code": 0,
            "visual_accuracy": 0,
            "system_query": "N/A",
            "expected_result": "N/A"
        }
        tasks_data.append({
            "title": task.title,
            "description": task.description,
            "difficulty": task.difficulty,
            "marks": task.marks,
            "duration_minutes": task.duration_minutes,
            "order_index": task.order_index,
            "scoring_rules": scoring_rules,
            "expected_output": task.expected_output or [],
            "solution": task.solution or {}
        })

    fixture_content = {
        "lab_questions": [
            {
                "title": lab_question.title,
                "type": lab_question.type,
                "description": lab_question.description,
                "difficulty": lab_question.difficulty,
                "domain": lab_question.domain,
                "experience": lab_question.experience,
                "duration_minutes": lab_question.duration_minutes,
                "marks": lab_question.marks,
                "scenario": lab_question.scenario,
                "git_repo_starter_url": lab_question.git_repo_starter_url,
                "git_repo_starter_branch": lab_question.git_repo_starter_branch,
                "startup_command": lab_question.startup_command,
                "test_command": lab_question.test_command,
                "connection_url": getattr(lab_question, 'connection_url', None) or "",
                "programming_languages": lab_question.programming_languages,
                "databases": lab_question.databases,
                "backend_frameworks": lab_question.backend_frameworks,
                "frontend_frameworks": lab_question.frontend_frameworks,
                "tasks": tasks_data,
                "allow_task_selection": lab_question.allow_task_selection,
                "solution": lab_question.solution or {}
            }
        ]
    }

    fixtures_dir = os.path.join(settings.BASE_DIR, "skill_evaluation", "fixtures", "dev")
    os.makedirs(fixtures_dir, exist_ok=True)
    file_path = os.path.join(fixtures_dir, f"{slug}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(fixture_content, f, indent=2)
    return file_path, fixture_content


class LabQuestionBankViewSet(viewsets.ModelViewSet):
    queryset = LabQuestionBank.objects.all()
    serializer_class = LabQuestionBankSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user:
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.filter(is_superuser=True).first()
        instance = serializer.save(created_by=user)
        try:
            export_lab_question_to_fixture(instance)
        except Exception as e:
            logging.getLogger(__name__).warning(f"Auto-export fixture failed on create: {e}")

    def perform_update(self, serializer):
        instance = serializer.save()
        try:
            export_lab_question_to_fixture(instance)
        except Exception as e:
            logging.getLogger(__name__).warning(f"Auto-export fixture failed on update: {e}")

    @action(detail=True, methods=['get', 'post'], permission_classes=[AllowAny])
    def export_fixture(self, request, pk=None):
        lab = self.get_object()
        file_path, fixture_content = export_lab_question_to_fixture(lab)
        return Response({
            "status": "success",
            "message": f"Exported fixture to {file_path}",
            "file_path": file_path,
            "fixture": fixture_content
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def verify(self, request):
        import uuid as uuid_lib
        import requests
        import shutil
        from lab.workspace_manager import provision_evaluation_lab_starter_repo, provision_evaluation_user_repo

        repo_url = request.data.get("git_repo_starter_url")
        branch = request.data.get("git_repo_starter_branch", "main")
        test_command = request.data.get("test_command", "python yuvro_scoring_rules/main_test.py")
        solution_files = request.data.get("solution_files") or {}
        solution_code = request.data.get("solution_code")
        solution_file_path = request.data.get("solution_file_path", "procurement/views.py")

        if not repo_url:
            return Response({"error": "git_repo_starter_url is required"}, status=status.HTTP_400_BAD_REQUEST)

        test_id = str(uuid_lib.uuid4())
        eval_id = str(uuid_lib.uuid4())
        starter_lab_dir = os.path.join(settings.WORKSPACES_ROOT, "evaluation", eval_id, "labs", test_id)
        user_lab_dir = os.path.join(settings.WORKSPACES_ROOT, "evaluation", eval_id, "users", test_id, "labs", test_id)

        try:
            starter_path = provision_evaluation_lab_starter_repo(eval_id, test_id, repo_url, branch=branch)
            provision_evaluation_user_repo(eval_id, test_id, test_id, starter_path)

            executor_url = os.environ.get("CODE_EXECUTOR_URL", os.environ.get("CODE_EXECUTER_URL", "http://yuvro-code-executor:8009"))
            
            # If Django manage.py is present and test_command doesn't already run migrate, prepend migrate
            test_exec_cmd = test_command
            if os.path.exists(os.path.join(user_lab_dir, "manage.py")) and "migrate" not in test_command:
                test_exec_cmd = f"python manage.py migrate && {test_command}"

            # 1. Run test command on starter code
            starter_resp = requests.post(
                f"{executor_url}/workspace/run_test_command",
                json={
                    "user_id": test_id,
                    "lab_id": test_id,
                    "evaluation_id": eval_id,
                    "command": test_exec_cmd
                },
                timeout=60
            )
            starter_data = starter_resp.json() if starter_resp.status_code == 200 else {}
            starter_score = starter_data.get("total_score", 0)
            max_score = starter_data.get("max_possible_score", 30) or 30

            # 2. If solution is provided, apply it and test
            solution_data = None
            solution_score = None
            if solution_files or solution_code:
                if isinstance(solution_files, dict) and solution_files:
                    for rel_p, code in solution_files.items():
                        target = os.path.join(user_lab_dir, rel_p.lstrip("/\\"))
                        os.makedirs(os.path.dirname(target), exist_ok=True)
                        with open(target, "w", encoding="utf-8") as f:
                            f.write(code)
                elif solution_code:
                    target = os.path.join(user_lab_dir, solution_file_path.lstrip("/\\"))
                    os.makedirs(os.path.dirname(target), exist_ok=True)
                    with open(target, "w", encoding="utf-8") as f:
                        f.write(solution_code)

                sol_resp = requests.post(
                    f"{executor_url}/workspace/run_test_command",
                    json={
                        "user_id": test_id,
                        "lab_id": test_id,
                        "evaluation_id": eval_id,
                        "command": test_exec_cmd
                    },
                    timeout=60
                )
                solution_data = sol_resp.json() if sol_resp.status_code == 200 else {}
                solution_score = solution_data.get("total_score", 0)

            starter_passed = (starter_score == 0)
            solution_passed = (solution_score == max_score) if solution_score is not None else None
            is_valid = starter_passed and (solution_passed is True or solution_passed is None)

            return Response({
                "status": "success",
                "is_valid": is_valid,
                "starter": {
                    "score": starter_score,
                    "max_score": max_score,
                    "passed": starter_passed,
                    "tasks": starter_data.get("data", {}).get("tasks", {}),
                    "stdout": starter_data.get("stdout", ""),
                    "stderr": starter_data.get("stderr", "")
                },
                "solution": {
                    "score": solution_score,
                    "max_score": max_score,
                    "passed": solution_passed,
                    "tasks": solution_data.get("data", {}).get("tasks", {}),
                    "stdout": solution_data.get("stdout", ""),
                    "stderr": solution_data.get("stderr", "")
                } if solution_data else None
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Verification failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            shutil.rmtree(starter_lab_dir, ignore_errors=True)
            shutil.rmtree(user_lab_dir, ignore_errors=True)


class KnowledgeQuestionBankViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeQuestionBank.objects.all().order_by('-created_at')
    serializer_class = KnowledgeQuestionBankSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return KnowledgeQuestionBank.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        company = user.recruiter_profiles.first().company if hasattr(user, 'recruiter_profiles') and user.recruiter_profiles.exists() else None
        serializer.save(created_by=user, company=company)


class UserLabQuestionBankSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabQuestionBankSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserLabQuestionBankSubmission.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        now = timezone.now()
        started = serializer.validated_data.get('started_at') or now
        instance = serializer.save(user=self.request.user, started_at=started, submitted_at=now)
        self._ensure_git_diff(instance)

    def perform_update(self, serializer):
        now = timezone.now()
        instance = serializer.save(submitted_at=now)
        self._ensure_git_diff(instance)

    def _ensure_git_diff(self, instance):
        if not instance.evaluation_id or not instance.lab_question_id:
            return
        user_dir = os.path.join(
            settings.WORKSPACES_ROOT,
            "evaluation",
            str(instance.evaluation_id),
            "users",
            str(instance.user_id),
            "labs",
            str(instance.lab_question_id)
        )
        if os.path.exists(user_dir):
            import subprocess
            try:
                subprocess.run(["git", "add", "-A", "-N"], cwd=user_dir, check=True, capture_output=True)
                diff_output = subprocess.check_output(
                    [
                        "git", "diff", "-U99999", "HEAD", "--", ".",
                        ":(exclude)*.sqlite3", ":(exclude)*.db", ":(exclude)*.sqlite",
                        ":(exclude)*.db-journal", ":(exclude)*.db-wal", ":(exclude)*.dbsqlite3",
                        ":(exclude)*.zip", ":(exclude)*.tar", ":(exclude)*.gz",
                        ":(exclude)*.pyc", ":(exclude)*__pycache__*",
                        ":(exclude)*.log", ":(exclude)*bash_history*",
                        ":(exclude)README.md", ":(exclude).gitignore", ":(exclude)requirements.txt"
                    ],
                    cwd=user_dir,
                    stderr=subprocess.DEVNULL
                ).decode()
                if diff_output and diff_output.strip():
                    instance.solution = diff_output
                    instance.save(update_fields=['solution'])
            except Exception:
                pass

from .models import CandidateNote
from .serializers import CandidateNoteSerializer, CandidateTimelineEventSerializer

class CandidateNoteViewSet(viewsets.ModelViewSet):
    serializer_class = CandidateNoteSerializer
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = CandidateNote.objects.all()
        evaluation_id = self.request.query_params.get('evaluation_id')
        candidate_email = self.request.query_params.get('candidate_email')
        
        if evaluation_id:
            queryset = queryset.filter(evaluation_id=evaluation_id)
        if candidate_email:
            queryset = queryset.filter(candidate_email=candidate_email)
            
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated:
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.first()
        serializer.save(author=user, created_by=user)

class CandidateTimelineEventViewSet(viewsets.ModelViewSet):
    serializer_class = CandidateTimelineEventSerializer
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = CandidateTimelineEvent.objects.all()
        evaluation_id = self.request.query_params.get('evaluation_id')
        candidate_email = self.request.query_params.get('candidate_email')
        
        if evaluation_id:
            queryset = queryset.filter(evaluation_id=evaluation_id)
        if candidate_email:
            queryset = queryset.filter(candidate_email=candidate_email)
            
        return queryset

    def perform_create(self, serializer):
        email = self.request.data.get('candidate_email')
        if not email and self.request.user and self.request.user.is_authenticated:
            email = self.request.user.email
        
        user = self.request.user
        if not user or not user.is_authenticated:
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.first()

        if email:
            serializer.save(candidate_email=email, created_by=user)
        else:
            serializer.save(created_by=user)


class RecruiterActivityLogViewSet(viewsets.ModelViewSet):
    serializer_class = RecruiterActivityLogSerializer
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = RecruiterActivityLog.objects.all()
        evaluation_id = self.request.query_params.get('evaluation_id')
        candidate_email = self.request.query_params.get('candidate_email')
        
        if evaluation_id:
            queryset = queryset.filter(evaluation_id=evaluation_id)
        if candidate_email:
            queryset = queryset.filter(candidate_email=candidate_email)
            
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.first()
            
        serializer.save(recruiter=user, created_by=user)

from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

class SharedReportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token, format=None):
        submission = get_object_or_404(UserEvaluationSubmission, share_token=token)
        
        if submission.share_token_expires_at and timezone.now() > submission.share_token_expires_at:
            return Response({'error': 'Shared report link has expired.'}, status=status.HTTP_410_GONE)

        evaluation = submission.evaluation
        
        # Serialize only the evaluation context and the specific candidate submission
        eval_serializer = EvaluationSerializer(evaluation)
        sub_serializer = UserEvaluationSubmissionSerializer(submission)
        
        # Include timeline events specifically for this candidate and evaluation
        candidate_email = submission.user.email if submission.user else submission.email
        events = []
        if candidate_email:
            events = CandidateTimelineEvent.objects.filter(
                evaluation=evaluation, 
                candidate_email=candidate_email
            )
        from .serializers import CandidateTimelineEventSerializer
        event_serializer = CandidateTimelineEventSerializer(events, many=True)
        
        return Response({
            'evaluation': eval_serializer.data,
            'submission': sub_serializer.data,
            'timeline_events': event_serializer.data
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Evaluation, CandidateEvaluationFeedback
from .serializers import CandidateEvaluationFeedbackSerializer

from rest_framework.permissions import AllowAny
class EvaluationFeedbackAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, pk):
        feedbacks = CandidateEvaluationFeedback.objects.filter(evaluation_id=pk)
        serializer = CandidateEvaluationFeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        evaluation = get_object_or_404(Evaluation, pk=pk)
        user = request.user
        if not user.is_authenticated:
            # For guest users, they might be logged in as guest.
            pass
        candidate_user = user if user.is_authenticated else None
        if candidate_user:
            feedback, created = CandidateEvaluationFeedback.objects.update_or_create(
                evaluation=evaluation,
                candidate=candidate_user,
                defaults={
                    'rating': request.data.get('rating'),
                    'description': request.data.get('description', '')
                }
            )
        else:
            feedback = CandidateEvaluationFeedback.objects.create(
                evaluation=evaluation,
                candidate=None,
                rating=request.data.get('rating'),
                description=request.data.get('description', '')
            )
            created = True
        serializer = CandidateEvaluationFeedbackSerializer(feedback)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

