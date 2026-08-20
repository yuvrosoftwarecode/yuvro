from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from core.storage import upload_image
from .models import RecruiterActivityLog
from .serializers import RecruiterActivityLogSerializer
import logging
import time

from .models import (
    Evaluation,
    LabQuestionBank,
    UserEvaluationSubmission,
    DiscussionMode,
    FollowUpConfig, 
    FollowUpCandidate,
    UserLabQuestionBankSubmission,
    UserKnowledgeAssessmentSubmission,
    EvaluationSection,
    CandidateTimelineEvent,
    CandidateTimelineEventType
)
from .serializers import (
    EvaluationSerializer,
    LabQuestionBankSerializer,
    UserEvaluationSubmissionSerializer,
    FollowUpConfigSerializer, 
    FollowUpCandidateSerializer,
    UserLabQuestionBankSubmissionSerializer
)
from .email_utils import send_evaluation_email
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
import os
from lab.workspace_manager import provision_evaluation_user_repo, get_repo_name_from_url
import json

def get_emails_list(emails):
    if not emails:
        return []
    if isinstance(emails, str):
        try:
            parsed = json.loads(emails)
            if isinstance(parsed, list):
                return parsed
            return [emails]
        except Exception:
            return [emails]
    if isinstance(emails, list):
        return emails
    return []

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
        old_emails = set(get_emails_list(old_instance.candidate_invited_emails))
        instance = serializer.save()
        
        if instance.is_published and instance.candidate_invited_emails:
            new_emails = set(get_emails_list(instance.candidate_invited_emails)) - old_emails
            if new_emails:
                self.send_invitation_emails(instance, new_emails)

    def send_invitation_emails(self, evaluation, emails):
        send_evaluation_email(evaluation, emails, is_reminder=False)

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
        
        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=user.email,
            title=CandidateTimelineEventType.VITARKA_COMPLETED,
            defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
        )
        CandidateTimelineEvent.objects.get_or_create(
            evaluation=evaluation,
            candidate_email=user.email,
            title=CandidateTimelineEventType.EVALUATION_FINISHED,
            defaults={"status": "SUCCESS", "occurred_at": timezone.now(), "created_by": user}
        )
        
        has_proctoring = any(sec.proctoring_config for sec in evaluation.sections.all())
        if has_proctoring:
            from .face_verification_proxy import run_async_face_verification
            run_async_face_verification(UserEvaluationSubmission, submission.id)
            
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_lab(self, request, pk=None):
        evaluation = self.get_object()
        lab_id = request.data.get('lab_id')
        status_val = request.data.get('status', 'in_review')
        solution = request.data.get('solution', '')
        minutes_solved = request.data.get('minutes_solved', 0)
        
        if not lab_id:
            return Response({"error": "lab_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            lab = LabQuestionBank.objects.get(id=lab_id)
        except LabQuestionBank.DoesNotExist:
            return Response({"error": "Lab not found"}, status=status.HTTP_404_NOT_FOUND)
            
        submission, created = UserLabQuestionBankSubmission.objects.update_or_create(
            user=request.user,
            evaluation=evaluation,
            lab_question=lab,
            defaults={
                'status': status_val,
                'solution': solution,
                'minutes_solved': minutes_solved
            }
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
                        ["git", "diff", "HEAD"], 
                        cwd=user_dir,
                        stderr=subprocess.DEVNULL
                    ).decode()
                    submission.solution = diff_output
                    submission.save(update_fields=['solution'])
                except Exception:
                    pass
        
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
            
        submission, created = UserKnowledgeAssessmentSubmission.objects.update_or_create(
            user=request.user,
            evaluation=evaluation,
            section=section,
            defaults={
                'answers': answers,
                'total_questions': len(answers),
                # Calculate score if 'is_correct' is provided in answers JSON
                'score': sum(1 for a in answers if a.get('is_correct'))
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
            
        if not lab.git_repo_starter_url:
            return Response({"error": "Lab does not have a starter repository"}, status=status.HTTP_400_BAD_REQUEST)
            
        starter_repo_name = get_repo_name_from_url(lab.git_repo_starter_url)
        starter_repo_path = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation.id), "labs", str(lab.id), starter_repo_name)
        
        try:
            provision_evaluation_user_repo(evaluation.id, lab.id, request.user.id, starter_repo_path)
            return Response({"status": "success", "message": "Lab workspace provisioned successfully"})
        except Exception as e:
            return Response({"error": f"Failed to provision workspace: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def provision_labs(self, request, pk=None):
        evaluation = self.get_object()
        
        labs_provisioned = 0
        for section in evaluation.sections.all():
            if section.type != 'LAB' or not section.questions:
                continue
                
            for question in section.questions:
                lab_id = question.get('id')
                if not lab_id:
                    continue
                    
                try:
                    lab = LabQuestionBank.objects.get(id=lab_id)
                    if lab.git_repo_starter_url:
                        starter_repo_name = get_repo_name_from_url(lab.git_repo_starter_url)
                        starter_repo_path = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation.id), "labs", str(lab.id), starter_repo_name)
                        
                        try:
                            provision_evaluation_user_repo(evaluation.id, lab.id, request.user.id, starter_repo_path)
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
                        'created_by': evaluation.created_by
                    }
                )
                if created:
                    newly_added_emails.add(email)
                    
            if newly_added_emails:
                current_invited = set(get_emails_list(evaluation.candidate_invited_emails))
                current_invited.update(newly_added_emails)
                evaluation.candidate_invited_emails = list(current_invited)
                evaluation.save(update_fields=['candidate_invited_emails'])
            
            if processed_emails:
                from .email_utils import send_evaluation_email
                send_evaluation_email(evaluation, list(processed_emails), is_reminder=True)
            
            return Response({"status": "success"})

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
            status_val = "Submitted" if sub and sub.completed_at else ("In Progress" if sub else "Not Submitted")
            
            records_list.append({
                "id": email,
                "candidateId": email,
                "name": name,
                "email": email,
                "phone": phone,
                "source": source,
                "sentAt": None,
                "accessedAt": None,
                "status": status_val,
                "submittedAt": submitted_at,
                "score": None,
                "result": "Not Evaluated",
                "followUp": fc.followups_enabled if fc else False,
                "labsScore": None,
                "assessmentScore": None,
                "vitarkaScore": None,
                "eci": None,
                "deadline": None,
                "emailsSent": fc.emails_sent_count if fc else 0,
                "aiCall": False,
                "lastActivity": submitted_at or int(time.time() * 1000),
                "activity": fc.timeline if fc else []
            })
            
        records_list.sort(key=lambda x: x['lastActivity'] or 0, reverse=True)
        return Response(records_list)

class LabQuestionBankViewSet(viewsets.ModelViewSet):
    queryset = LabQuestionBank.objects.all()
    serializer_class = LabQuestionBankSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

class UserLabQuestionBankSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabQuestionBankSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserLabQuestionBankSubmission.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
