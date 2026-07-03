from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, F
from django.db import models
from django.shortcuts import get_object_or_404
import random
import os
import requests
import json
from pypdf import PdfReader 
from io import BytesIO
import traceback
import logging
from asgiref.sync import async_to_sync

from core.ai_client import AIClient
from authentication.models import Profile
from authentication.permissions import IsOwnerOrInstructorOrAdmin
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    SkillTest, SkillTestSubmission, SkillTestQuestionActivity,
    Contest, ContestRegistration, ContestSubmission, ContestQuestionActivity,
    JobTest, JobTestSubmission, JobTestQuestionActivity,
    CertificationExam, CertificationSubmission, CertificationQuestionActivity, Certificate,
    MockInterview, MockInterviewSubmission
)
from .face_verification_proxy import run_async_face_verification
from .mixins import ProctoringMixin, AssessmentMixin, LeaderboardPagination
from .serializers import (
    ContestSerializer, SkillTestSerializer, MockInterviewSerializer,
    SkillTestSubmissionSerializer, ContestSubmissionSerializer,
    MockInterviewSubmissionSerializer,
    CertificationExamSerializer, CertificationSubmissionSerializer
)
from job.models import JobApplication
import os
import time
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from course.models import Question
from django.core.mail import send_mail
from django.conf import settings

def has_active_submission(user, excluding_model=None, excluding_assessment_field=None, excluding_assessment_id=None):
    if not user or not user.is_authenticated or (hasattr(user, 'role') and user.role != 'student'):
        return None

    from .models import (
        SkillTestSubmission, ContestSubmission, MockInterviewSubmission,
        CertificationSubmission, JobTestSubmission
    )
    
    submissions_to_check = [
        (SkillTestSubmission, 'skill_test_id'),
        (ContestSubmission, 'contest_id'),
        (MockInterviewSubmission, 'mock_interview_id'),
        (CertificationSubmission, 'certification_exam_id'),
        (JobTestSubmission, 'job_test_id'),
    ]
    
    for model, field in submissions_to_check:
        try:
            if model == excluding_model:
                active = model.objects.filter(
                    user=user,
                    status__in=['started', 'in_progress']
                ).exclude(**{field: excluding_assessment_id}).first()
            else:
                active = model.objects.filter(
                    user=user,
                    status__in=['started', 'in_progress']
                ).first()
                
            if active:
                if model == MockInterviewSubmission:
                    active.status = MockInterviewSubmission.STATUS_CANCELLED
                    active.save()
                    continue
                return active
        except Exception:
            pass
            
    return None


from django.shortcuts import render
class CertificationExamViewSet(ProctoringMixin, viewsets.ModelViewSet):
    queryset = CertificationExam.objects.all()
    serializer_class = CertificationExamSerializer
    
    submission_model = CertificationSubmission
    question_activity_model = CertificationQuestionActivity
    submission_lookup_field = 'certification_exam'
    submission_related_field = 'certification_submission'
    
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    
    search_fields = ['title', 'course__name']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)

        user = self.request.user
        if hasattr(user, 'role') and user.role == 'student':
            now = timezone.now()
            qs = qs.filter(
                publish_status='active',
            )
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start(self, request, pk=None):
        exam = self.get_object()
        user = request.user
        
        active_session = has_active_submission(
            user,
            excluding_model=CertificationSubmission,
            excluding_assessment_field='certification_exam_id',
            excluding_assessment_id=exam.id
        )
        if active_session:
            return Response(
                {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = CertificationSubmission.objects.filter(
            certification_exam=exam,
            user=user,
            status=CertificationSubmission.STATUS_STARTED
        ).first()

        if not submission:
            completed_count = CertificationSubmission.objects.filter(
                certification_exam=exam,
                user=user,
                status=CertificationSubmission.STATUS_COMPLETED
            ).count()
            
            if completed_count >= exam.max_attempts:
                return Response({'error': 'Max attempts reached'}, status=status.HTTP_400_BAD_REQUEST)

            submission = CertificationSubmission.objects.create(
                certification_exam=exam,
                user=user,
                status=CertificationSubmission.STATUS_STARTED
            )
            
        questions_to_send = []
        
        if exam.questions_config:
            all_ids = []
            for q_type, ids in exam.questions_config.items():
                if isinstance(ids, list):
                    all_ids.extend(ids)
            if all_ids:
                 questions_to_send = list(Question.objects.filter(id__in=all_ids).values(
                    'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                ))
        
        if exam.questions_random_config:
            existing_ids = [q['id'] for q in questions_to_send]
            for q_type, count in exam.questions_random_config.items():
                   if count > 0:
                       selected = list(Question.objects.filter(
                           type=q_type,
                           course=exam.course
                       ).exclude(id__in=existing_ids).order_by('?')[:count].values(
                           'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                       ))
                       questions_to_send.extend(selected)

        random.shuffle(questions_to_send)
        
        for q in questions_to_send:
            if q.get('mcq_options') and isinstance(q['mcq_options'], list):
                for opt in q['mcq_options']:
                    if isinstance(opt, dict):
                        opt.pop('is_correct', None)
        
        total_violations, tab_switch_count = self._get_submission_stats(submission)
        
        return Response({
            'submission_id': submission.id,
            'status': submission.status,
            'started_at': submission.started_at,
            'duration': exam.duration,
            'questions': questions_to_send,
            'enable_proctoring': exam.enable_proctoring,
            'tab_switch_threshold': exam.tab_switch_threshold,
            'violation_threshold': exam.violation_threshold,
            'violation_count': total_violations,
            'tab_switch_count': tab_switch_count,
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        exam = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})
        
        submission = get_object_or_404(
            CertificationSubmission,
            id=submission_id,
            user=request.user,
            certification_exam=exam
        )
        
        if submission.status == CertificationSubmission.STATUS_COMPLETED:
             return Response({'error': 'Already submitted'}, status=status.HTTP_400_BAD_REQUEST)

        submission.status = CertificationSubmission.STATUS_COMPLETED
        submission.submitted_at = timezone.now()
        submission.completed_at = timezone.now()
        submission.answer_data = answers
        
        total_score = 0
        
        all_question_ids = request.data.get('all_question_ids', [])
        question_ids = list(set(list(answers.keys()) + all_question_ids))
        db_questions = Question.objects.filter(id__in=question_ids)
        q_map = {str(q.id): q for q in db_questions}
        time_spent = request.data.get('time_spent', {}) or {}
        if not isinstance(time_spent, dict):
            time_spent = {}

        for q_id in question_ids:
            if q_id not in q_map: continue
            question = q_map[q_id]
            user_ans = answers.get(q_id)
            
            is_correct, marks_obtained = question.grade_answer(user_ans)
            activity, created = CertificationQuestionActivity.objects.update_or_create(
                certification_submission=submission,
                question=question,
                user=request.user,
                defaults={
                    'answer_data': {'answer': user_ans},
                    'is_final_answer': True,
                    'is_correct': is_correct,
                    'marks_obtained': marks_obtained,
                    'auto_graded': question.is_auto_gradable,
                    'total_question_time': time_spent.get(str(q_id), 0)
                }
            )
            
            if activity.used_hint or activity.viewed_solution or activity.ai_help_count > 0:
                marks_obtained = 0
                activity.marks_obtained = 0
                activity.save(update_fields=['marks_obtained'])

            total_score += marks_obtained
            
        submission.marks = total_score
        submission.save()
        
        passed = False
        certificate_id = None
        certificate_url = None
        if total_score >= exam.passing_marks:
            passed = True
            cert, created = Certificate.objects.get_or_create(
                user=request.user,
                course=exam.course,
                defaults={
                    'certification_exam': exam,
                    'submission': submission
                }
            )
            certificate_id = str(cert.id)
            certificate_url = f"/api/assessment/certificates/{cert.id}/view/"

        gamification = {}
        try:
            from gamification.service import GamificationService
            gamification = GamificationService.record_activity(request.user, 'quiz')
        except Exception:
            pass 
            
        if exam.enable_proctoring:
            run_async_face_verification(CertificationSubmission, submission.id)
            
        return Response({
            'status': 'submitted',
            'score': total_score,
            'passed': passed,
            'certificate_id': certificate_id,
            'certificate_display_id': cert.display_id if passed else None,
            'certificate_url': certificate_url,
            'gamification': gamification,
        })

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        exam = self.get_object()
        submissions = exam.certification_submissions.filter(status='completed')
        
        total = submissions.count()
        if total == 0:
            return Response({'passed_count': 0, 'avg_score': 0})
            
        passed_count = submissions.filter(marks__gte=exam.passing_marks).count()
        avg_score = submissions.aggregate(models.Avg('marks'))['marks__avg'] or 0
        
        return Response({
            'total_attempts': total,
            'passed_count': passed_count,
            'pass_rate': round((passed_count / total) * 100, 1),
            'avg_score': round(avg_score, 1)
        })



logger = logging.getLogger(__name__)


class ContestViewSet(AssessmentMixin, ProctoringMixin, viewsets.ModelViewSet):
    queryset = Contest.objects.all()
    serializer_class = ContestSerializer
    
    submission_model = ContestSubmission
    question_activity_model = ContestQuestionActivity
    submission_lookup_field = 'contest'
    submission_related_field = 'contest_submission'
    
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    
    search_fields = ['title', 'organizer', 'description']
    ordering_fields = ['start_datetime']
    
    def get_permissions(self):
        if self.action in ['retrieve', 'list']:
            return [AllowAny()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    def get_queryset(self):
        qs = super().get_queryset()
        
        status_param = self.request.query_params.get('status')
        type_param = self.request.query_params.get('type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        q = Q()
        if status_param:
            q &= Q(status=status_param)
            
        if type_param:
            q &= Q(type=type_param)
        
        if date_from:
            q &= Q(start_datetime__gte=date_from)
        
        if date_to:
            q &= Q(start_datetime__lte=date_to)

        if q:
            qs = qs.filter(q)
        
        now = timezone.now()
        from django.db.models import Case, When, Value, CharField
        qs = qs.annotate(
            computed_status=Case(
                When(start_datetime__gt=now, then=Value(Contest.STATUS_UPCOMING)),
                When(start_datetime__lte=now, end_datetime__gte=now, then=Value(Contest.STATUS_ONGOING)),
                When(end_datetime__lt=now, then=Value(Contest.STATUS_PAST)),
                default=Value(Contest.STATUS_UPCOMING),
                output_field=CharField()
            )
        )
        return qs
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, pk=None):
        contest = self.get_object()
        user = request.user
        now = timezone.now()

        from .models import ContestRegistration

        if contest.publish_status != 'active':
            return Response({'error': 'This contest is not yet published.'}, status=status.HTTP_400_BAD_REQUEST)
        if contest.end_datetime and now > contest.end_datetime:
            return Response({'error': 'This contest has already ended.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = user.profile
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found. Please complete your profile', 'requires_profile_update': True}, status=status.HTTP_403_FORBIDDEN)

        if not contest.open_for_all_colleges:
            allowed = contest.allowed_colleges.all()
            allowed_names = [c.name for c in allowed]
            student_college_name = profile.college.name if profile.college else None

            if not profile.college:
                return Response({
                    'error': 'Please select your college to register for this contest.',
                    'error_type': 'no_college',
                    'requires_profile_update': True,
                    'allowed_college_names': allowed_names,
                }, status=status.HTTP_403_FORBIDDEN)

            if profile.college not in allowed:
                return Response({
                    'error': f'This contest is restricted to specific colleges. Your college ({student_college_name}) is not in the allowed list.',
                    'error_type': 'college_mismatch',
                    'requires_profile_update': False,
                    'student_college_name': student_college_name,
                    'allowed_college_names': allowed_names,
                }, status=status.HTTP_403_FORBIDDEN)

        if not contest.open_for_all_departments:
            allowed_depts = contest.allowed_departments.all()
            allowed_dept_names = [d.name for d in allowed_depts]
            student_dept_name = profile.department.name if profile.department else None

            if not profile.department:
                return Response({
                    'error': 'Please select your department to register for this contest.',
                    'error_type': 'no_department',
                    'requires_profile_update': True,
                    'allowed_department_names': allowed_dept_names,
                }, status=status.HTTP_403_FORBIDDEN)

            if profile.department not in allowed_depts:
                return Response({
                    'error': f'This contest is restricted to specific departments. Your department ({student_dept_name}) is not in the allowed list.',
                    'error_type': 'department_mismatch',
                    'requires_profile_update': False,
                    'student_department_name': student_dept_name,
                    'allowed_department_names': allowed_dept_names,
                }, status=status.HTTP_403_FORBIDDEN)

        if contest.require_student_id and not profile.student_id:
            return Response({'error': 'Student ID is required', 'requires_profile_update': True}, status=status.HTTP_403_FORBIDDEN)

        if ContestRegistration.objects.filter(contest=contest, user=user).exists():
            return Response({'message': 'Already Registered'}, status=status.HTTP_200_OK)

        is_late_entry = False
        
        if contest.registration_start_datetime and now < contest.registration_start_datetime:
            return Response({'error': 'Registration has not started yet'}, status=status.HTTP_400_BAD_REQUEST)
        
        if contest.registration_end_datetime and now > contest.registration_end_datetime:
            if not contest.allow_late_entry:
                return Response({'error': 'Registration is closed'}, status=status.HTTP_400_BAD_REQUEST)
            if now > contest.end_datetime:
                return Response({'error': 'Contest has ended'}, status=status.HTTP_400_BAD_REQUEST)
            is_late_entry = True

        if contest.payment_type == Contest.PAYMENT_TYPE_PAID:
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken.for_user(user)
            token['contest_id'] = str(contest.id)
            token['payment_pending'] = True
            token['amount'] = float(contest.amount) if contest.amount else 0.0
            return Response({
                "status": "payment_required", 
                "message": "Proceed to payment",
                "payment_token": str(token),
                "amount": contest.amount
            })

        ContestRegistration.objects.create(contest=contest, user=user, created_by=user, is_late_entry=is_late_entry)

        try:
            from django.core.mail import send_mail
            from django.conf import settings
            late_entry_note = "\n        Note: This is a late entry. You will have reduced time to complete the contest." if is_late_entry else ""
            subject = f"Registration Confirmed: {contest.title}"
            message = f"""
        Hello {user.first_name or user.username},

        You have successfully registered for the contest: {contest.title}.

        Start Time: {contest.start_datetime.strftime('%Y-%m-%d %H:%M:%Z')}
        End Time: {contest.end_datetime.strftime('%Y-%m-%d %H:%M:%Z')}{late_entry_note}
        
        Good Luck!

        Team Yuvro
        """

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True
            )

        except Exception as e:
            logger.warning(f"Failed to send email: {str(e)}")

        return Response({
            'status': 'Registered',
            'is_late_entry': is_late_entry,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[IsOwnerOrInstructorOrAdmin])
    def participants(self, request, pk=None):
        contest = self.get_object()
        from .models import ContestRegistration
        from .serializers import ContestRegistrationSerializer
        registrations = ContestRegistration.objects.filter(contest=contest).select_related('user', 'user__profile', 'user__profile__college', 'user__profile__department')
        serializer = ContestRegistrationSerializer(registrations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start(self, request, pk=None):
        from .models import ContestRegistration
        
        contest = self.get_object()
        user = request.user

        active_session = has_active_submission(
            user,
            excluding_model=ContestSubmission,
            excluding_assessment_field='contest_id',
            excluding_assessment_id=contest.id
        )
        if active_session:
            return Response(
                {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()

        registration = ContestRegistration.objects.filter(contest=contest, user=user).first()
        if not registration:
            return Response(
                {'error': 'You must register for this contest before starting it.'},
                status=status.HTTP_403_FORBIDDEN
            )

        contest.update_status()
        if contest.status != Contest.STATUS_ONGOING:
            return Response({'error': 'Contest is not live'}, status=status.HTTP_400_BAD_REQUEST)

        submission, created = ContestSubmission.objects.get_or_create(
            contest=contest, 
            user=user,
            defaults={
                'status': ContestSubmission.STATUS_STARTED,
                'is_late_entry': registration.is_late_entry,
            }
        )

        if submission.status in [ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_EVALUATED]:
            return Response({'error': 'You have already submitted this contest.'}, status=status.HTTP_400_BAD_REQUEST)

        if submission.is_late_entry:
            remaining_seconds = (contest.end_datetime - now).total_seconds()
            actual_duration = min(int(remaining_seconds / 60), contest.duration)
        else:
            actual_duration = contest.duration

        questions_to_send = self._fetch_questions_for_assessment(contest)

        total_violations, tab_switch_count = self._get_submission_stats(submission)

        return Response({
            'submission_id': submission.id, 
            'started_at': submission.started_at,
            'duration': actual_duration,
            'questions': questions_to_send,
            'is_late_entry': submission.is_late_entry,
            # Uniform proctoring config
            'enable_proctoring': contest.enable_proctoring,
            'tab_switch_threshold': contest.tab_switch_threshold,
            'violation_threshold': contest.violation_threshold,
            'violation_count': total_violations,
            'tab_switch_count': tab_switch_count,
        })

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def public_send_otp(self, request, pk=None):
        contest = self.get_object()
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        otp = str(random.randint(100000, 999999))
        
        from django.core.cache import cache
        cache.set(f"contest_registration_otp_{contest.id}_{email}", otp, timeout=300) # 5 minutes
        
        from django.core.mail import send_mail
        from django.conf import settings
        from django.template.loader import render_to_string
        
        context = {
            "contest_title": contest.title,
            "otp": otp,
            "frontend_url": settings.FRONTEND_URL
        }
        html_message = render_to_string("emails/otp_verification.html", context)
        
        send_mail(
            subject=f"OTP for Contest Registration: {contest.title}",
            message=f"Your OTP for registering in the contest '{contest.title}' is: {otp}. It is valid for 5 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_message
        )
        
        return Response({"status": "success", "message": "OTP sent successfully"})

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def public_verify_otp(self, request, pk=None):
        contest = self.get_object()
        email = request.data.get('email')
        otp = request.data.get('otp')
        
        if not email or not otp:
            return Response({"error": "Email and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        cached_otp = cache.get(f"contest_registration_otp_{contest.id}_{email}")
        
        if cached_otp and str(cached_otp) == str(otp):
            return Response({"status": "success", "message": "OTP verified"})
        
        return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def public_register(self, request, pk=None):
        contest = self.get_object()
        email = request.data.get('email')
        otp = request.data.get('otp')
        details = request.data.get('details', {})
        
        if not email or not otp:
            return Response({"error": "Email and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        cached_otp = cache.get(f"contest_registration_otp_{contest.id}_{email}")
        
        if cached_otp and str(cached_otp) == str(otp):
            from django.contrib.auth import get_user_model
            from rest_framework_simplejwt.tokens import AccessToken
            from .models import ContestRegistration
            import string
            
            User = get_user_model()
            user = User.objects.filter(email=email).first()
            
            if not user:
                password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
                base_username = email.split('@')[0]
                username = base_username
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{random.randint(100, 9999)}"
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                )
                user.is_otp_login = True
                user.save(update_fields=['is_otp_login'])
                
            if contest.payment_type == Contest.PAYMENT_TYPE_PAID:
                token = AccessToken.for_user(user)
                token['contest_id'] = str(contest.id)
                token['payment_pending'] = True
                token['amount'] = float(contest.amount) if contest.amount else 0.0
                
                cache.delete(f"contest_registration_otp_{contest.id}_{email}")
                return Response({
                    "status": "payment_required", 
                    "message": "Proceed to payment",
                    "payment_token": str(token),
                    "amount": contest.amount
                })
                
            ContestRegistration.objects.get_or_create(
                contest=contest, 
                user=user,
                defaults={'created_by': user}
            )
            
            cache.delete(f"contest_registration_otp_{contest.id}_{email}")
            
            token = AccessToken.for_user(user)
            
            return Response({
                "status": "success", 
                "message": "Successfully registered",
                "access_token": str(token)
            })
            
        else:
            return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def verify_payment(self, request, pk=None):
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        from .models import ContestRegistration
        from core.models import Transaction
        import uuid
        
        token_str = request.data.get('payment_token')
        if not token_str:
            return Response({"error": "Payment token is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            token = AccessToken(token_str)
            user_id = token['user_id']
            contest_id = token.get('contest_id')
            amount = token.get('amount')
            
            if str(contest_id) != str(pk):
                return Response({"error": "Invalid token for this contest"}, status=status.HTTP_400_BAD_REQUEST)
                
            User = get_user_model()
            user = User.objects.get(id=user_id)
            contest = self.get_object()
            
            transaction = Transaction.objects.create(
                user=user,
                contest=contest,
                amount=amount,
                status=Transaction.STATUS_COMPLETED,
                transaction_id=str(uuid.uuid4()) 
            )
            
            ContestRegistration.objects.get_or_create(
                contest=contest, 
                user=user,
                defaults={'created_by': user}
            )
            
            new_token = AccessToken.for_user(user)
            
            return Response({
                "status": "success",
                "message": "Payment verified and successfully registered",
                "access_token": str(new_token),
                "transaction_id": transaction.transaction_id
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes= [permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        contest = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})
        time_spent = request.data.get('time_spent', {}) or {}
        if not isinstance(time_spent, dict):
            time_spent = {}

        submission = get_object_or_404(ContestSubmission, id=submission_id, user=request.user, contest=contest)

        if submission.status in [ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_EVALUATED]:
            return Response({'error': 'Submission already completed'}, status=status.HTTP_400_BAD_REQUEST)

        valid_question_ids = set()
        if contest.questions_config:
            for ids in contest.questions_config.values():
                if isinstance(ids, list):
                    valid_question_ids.update(str(i) for i in ids)
        existing_activity_ids = set(
            ContestQuestionActivity.objects.filter(contest_submission=submission)
            .values_list('question_id', flat=True)
        )
        valid_question_ids.update(str(i) for i in existing_activity_ids)

        submission.answer_data = answers
        submission.status = ContestSubmission.STATUS_SUBMITTED
        submission.submitted_at = timezone.now()
        
        total_score = 0
        filtered_answers = {q_id: ans for q_id, ans in answers.items() if q_id in valid_question_ids}
        db_questions = Question.objects.filter(id__in=filtered_answers.keys())
        q_map = {str(q.id): q for q in db_questions}
        
        for q_id, user_ans in filtered_answers.items():
            if q_id not in q_map:
                continue
            question = q_map[q_id]
            is_correct, marks_obtained = question.grade_answer(user_ans)
            activity, created = ContestQuestionActivity.objects.update_or_create(
                contest_submission=submission,
                question=question,
                defaults={
                    'user': request.user,
                    'answer_data': user_ans if isinstance(user_ans, dict) else {'answer': user_ans},
                    'is_final_answer': True,
                    'is_correct': is_correct,
                    'marks_obtained': marks_obtained,
                    'auto_graded': True,
                    'total_question_time': time_spent.get(str(q_id), 0),
                }
            )

            if activity.used_hint or activity.viewed_solution or activity.ai_help_count > 0:
                marks_obtained = 0
                activity.marks_obtained = 0
                activity.save(update_fields=['marks_obtained'])

            if is_correct:
                total_score += marks_obtained
                
        submission.marks = total_score
        submission.save()

        gamification = {}
        try:
            from gamification.service import GamificationService
            coding_correct = sum(
                1 for q_id, ans in filtered_answers.items()
                if q_id in q_map and q_map[q_id].type == 'coding'
                and q_map[q_id].grade_answer(ans)[0]
            )
            for _ in range(coding_correct):
                GamificationService.record_activity(request.user, 'coding')
            gamification = GamificationService.record_activity(request.user, 'quiz')
        except Exception:
            pass 
        
        if contest.enable_proctoring:
            run_async_face_verification(ContestSubmission, submission.id)

        return Response({'status': 'Submitted', 'score': total_score, 'gamification': gamification}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path="increment-participant")
    def increment_participant(self, request, pk=None):
        contest = self.get_object() 
        contest.participants_count = F('participants_count') + 1
        contest.save(update_fields=['participants_count'])
        contest.refresh_from_db()
        
        return Response({'participants_count': contest.participants_count}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='recompute-status')
    def recompute_status(self, request, pk=None):
        contest = self.get_object()
        new_status = contest.update_status()
        contest.save(update_fields=['status'])
        return Response({'status': new_status}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def leaderboard(self, request, pk=None):
        contest = self.get_object()
        
        submissions = ContestSubmission.objects.filter(
            contest=contest,
            status__in=[ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED]
        ).select_related('user').order_by('-marks', 'submitted_at')
        
        paginator = LeaderboardPagination()
        page = paginator.paginate_queryset(submissions, request)
        
        page_size = paginator.page_size
        page_number = request.query_params.get(paginator.page_query_param, 1)
        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1
        start_rank = (page_number - 1) * page_size + 1
        
        leaderboard_data = []
        
        for idx, sub in enumerate(page or submissions):
            leaderboard_data.append({
                'rank': start_rank + idx,
                'user': f"{sub.user.first_name} {sub.user.last_name}".strip() or sub.user.username,
                'avatar': sub.user.avatar.url if hasattr(sub.user, 'avatar') and sub.user.avatar else None,
                'score': sub.marks,
                'time_taken': str(sub.submitted_at - sub.started_at) if sub.submitted_at and sub.started_at else None,
                'submitted_at': sub.submitted_at
            })
        
        if page is not None:
            return paginator.get_paginated_response(leaderboard_data)
            
        return Response(leaderboard_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsOwnerOrInstructorOrAdmin])
    def report(self, request, pk=None):
        """Generate a comprehensive post-contest report for college POCs."""
        contest = self.get_object()
        from .models import ContestRegistration
        from django.db.models import Avg, Max, Min, Count, Sum

        registrations = ContestRegistration.objects.filter(contest=contest)
        submissions = ContestSubmission.objects.filter(
            contest=contest,
        ).exclude(
            status=ContestSubmission.STATUS_CANCELLED
        ).select_related('user', 'user__profile', 'user__profile__college', 'user__profile__department')

        registered_count = registrations.count()
        attempted_count = submissions.count()
        completed_count = submissions.filter(
            status__in=[ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_EVALUATED]
        ).count()
        
        marks_agg = submissions.aggregate(
            avg_marks=Avg('marks'),
            max_marks=Max('marks'),
            min_marks=Min('marks'),
        )

        summary = {
            'contest_title': contest.title,
            'organizer': contest.organizer,
            'type': contest.type,
            'difficulty': contest.difficulty,
            'start_datetime': contest.start_datetime,
            'end_datetime': contest.end_datetime,
            'duration_minutes': contest.duration,
            'total_marks': contest.total_marks,
            'registered_count': registered_count,
            'attempted_count': attempted_count,
            'completed_count': completed_count,
            'completion_rate': round((completed_count / registered_count * 100), 1) if registered_count > 0 else 0,
            'avg_marks': round(marks_agg['avg_marks'] or 0, 1),
            'max_marks': marks_agg['max_marks'] or 0,
            'min_marks': marks_agg['min_marks'] or 0,
        }

        top_performers = []
        top_subs = submissions.order_by('-marks', 'submitted_at')[:10]
        for rank, sub in enumerate(top_subs, 1):
            profile = getattr(sub.user, 'profile', None)
            top_performers.append({
                'rank': rank,
                'user_id': str(sub.user.id),
                'name': f"{sub.user.first_name} {sub.user.last_name}".strip() or sub.user.username,
                'college': profile.college.name if profile and profile.college else 'N/A',
                'department': profile.department.name if profile and profile.department else 'N/A',
                'marks': sub.marks or 0,
                'submitted_at': sub.submitted_at,
            })

        college_agg = submissions.exclude(
            user__profile__college__isnull=True
        ).values(
            'user__profile__college__id',
            'user__profile__college__name',
        ).annotate(
            participants=Count('id'),
            avg_marks=Avg('marks'),
            max_marks=Max('marks'),
            min_marks=Min('marks'),
            completed=Count('id', filter=Q(
                status__in=[ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_EVALUATED]
            ))
        ).order_by('-avg_marks')

        college_breakdown = [
            {
                'college': row['user__profile__college__name'] or 'Unknown',
                'college_id': str(row['user__profile__college__id']) if row['user__profile__college__id'] else None,
                'participants': row['participants'],
                'avg_marks': round(row['avg_marks'] or 0, 1),
                'max_marks': row['max_marks'] or 0,
                'min_marks': row['min_marks'] or 0,
                'completion_rate': round(row['completed'] / row['participants'] * 100, 1) if row['participants'] > 0 else 0,
            }
            for row in college_agg
        ]

        dept_agg = submissions.exclude(
            user__profile__department__isnull=True
        ).values(
            'user__profile__department__name',
        ).annotate(
            participants=Count('id'),
            avg_marks=Avg('marks'),
            max_marks=Max('marks'),
        ).order_by('-avg_marks')

        department_comparison = [
            {
                'department': row['user__profile__department__name'] or 'Unknown',
                'participants': row['participants'],
                'avg_marks': round(row['avg_marks'] or 0, 1),
                'max_marks': row['max_marks'] or 0,
            }
            for row in dept_agg
        ]

        question_activities = ContestQuestionActivity.objects.filter(
            contest_submission__contest=contest,
            is_final_answer=True
        ).select_related('question', 'question__topic')

        question_stats = {}
        for qa in question_activities:
            q_id = str(qa.question_id)
            if q_id not in question_stats:
                question_stats[q_id] = {
                    'title': qa.question.title[:80],
                    'type': qa.question.type,
                    'difficulty': qa.question.difficulty,
                    'max_marks': qa.question.marks,
                    'topic': qa.question.topic.name if qa.question.topic else 'General',
                    'total_attempts': 0,
                    'correct_count': 0,
                    'marks_list': [],
                    'time_list': [],
                }

            question_stats[q_id]['total_attempts'] += 1
            if qa.is_correct:
                question_stats[q_id]['correct_count'] += 1
            question_stats[q_id]['marks_list'].append(qa.marks_obtained or 0)
            if qa.total_question_time > 0:
                question_stats[q_id]['time_list'].append(qa.total_question_time)

        question_performance = []
        for q_id, stats in question_stats.items():
            marks = stats['marks_list']
            times = stats['time_list']
            question_performance.append({
                'question_title': stats['title'],
                'type': stats['type'],
                'difficulty': stats['difficulty'],
                'topic': stats['topic'],
                'max_marks': stats['max_marks'],
                'total_attempts': stats['total_attempts'],
                'correct_percentage': round(stats['correct_count'] / stats['total_attempts'] * 100, 1) if stats['total_attempts'] > 0 else 0,
                'avg_marks': round(sum(marks) / len(marks), 1) if marks else 0,
                'avg_time_seconds': round(sum(times) / len(times)) if times else 0,
            })

        question_performance.sort(key=lambda x: x['correct_percentage'])

        submission_ids = submissions.values_list('id', flat=True)
        all_qa = ContestQuestionActivity.objects.filter(
            contest_submission_id__in=submission_ids,
            is_final_answer=True
        )
        total_violations = sum(qa.violation_count for qa in all_qa)
        submissions_with_violations = set(
            all_qa.filter(has_violations=True).values_list('contest_submission_id', flat=True)
        )
        clean_submissions_count = attempted_count - len(submissions_with_violations)

        integrity = {
            'total_violations': total_violations,
            'clean_submissions': clean_submissions_count,
            'total_submissions': attempted_count,
            'clean_percentage': round(clean_submissions_count / attempted_count * 100, 1) if attempted_count > 0 else 100,
            'proctoring_enabled': contest.enable_proctoring,
            'proctoring_techniques': contest.proctoring_techniques or [],
        }

        report_data = {
            'summary': summary,
            'top_performers': top_performers,
            'college_breakdown': college_breakdown,
            'department_comparison': department_comparison,
            'question_performance': question_performance,
            'integrity': integrity,
        }

        include_ai = request.query_params.get('include_ai_insights', 'false').lower() == 'true'
        
        if include_ai:
            try:
                from .ai_insights_service import generate_contest_insights_sync
                ai_insights = generate_contest_insights_sync(
                    contest_data=report_data,
                    contest_title=contest.title
                )
                report_data['ai_insights'] = ai_insights
            except Exception as ai_error:
                logger.warning(f"Failed to generate AI insights for contest: {str(ai_error)}")
                report_data['ai_insights'] = {
                    "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                    "ai_generated": False
                }

        return Response(report_data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def student_analytics(self, request, pk=None):
        """
        Get detailed analytics for the authenticated student's contest performance.
        Students can only access their own analytics.
        Admins/Instructors can view any student's analytics by passing user_id query param.
        
        Query Parameters:
            - include_ai_insights: boolean (default: true) - Whether to include AI-generated insights
            - user_id: string (admin/instructor only) - View analytics for specific user
        """
        contest = self.get_object()
        user = request.user
        
        target_user_id = request.query_params.get('user_id')
        
        if target_user_id:
            if not (user.is_staff or user.role in ['admin', 'instructor']):
                return Response(
                    {"error": "You don't have permission to view other users' analytics"},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_user_id = target_user_id
        else:
            target_user_id = str(user.id)

        try:
            ContestSubmission.objects.get(contest=contest, user__id=target_user_id)
        except ContestSubmission.DoesNotExist:
            return Response(
                {"error": "This user has not participated in this contest"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            from .analytics_service import ContestAnalyticsService
            from .ai_insights_service import generate_student_insights_sync
            
            analytics_service = ContestAnalyticsService(contest_id=str(contest.id))
            analytics_data = analytics_service.get_student_analytics(user_id=target_user_id)
            
            # Check if AI insights should be included
            include_ai = request.query_params.get('include_ai_insights', 'true').lower() == 'true'
            
            if include_ai:
                try:
                    # Generate AI insights
                    ai_insights = generate_student_insights_sync(
                        student_analytics=analytics_data,
                        contest_title=contest.title
                    )
                    analytics_data['ai_insights'] = ai_insights
                except Exception as ai_error:
                    # If AI insights fail, continue without them
                    logger.warning(f"Failed to generate AI insights: {str(ai_error)}")
                    analytics_data['ai_insights'] = {
                        "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                        "ai_generated": False
                    }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Failed to generate analytics: {str(e)}")
            return Response(
                {"error": "Failed to generate analytics", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def college_analytics(self, request, pk=None):
        """
        Get detailed analytics for a college's performance in the contest.
        Only admins/instructors can access college analytics.
        
        Query Parameters:
            - college_id: string (required) - College ID to get analytics for
            - include_ai_insights: boolean (default: false) - Whether to include AI-generated insights
        """
        contest = self.get_object()
        user = request.user
        
        if not (user.is_staff or user.role in ['admin', 'instructor']):
            return Response(
                {"error": "You don't have permission to view college analytics"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        college_id = request.query_params.get('college_id')
        if not college_id:
            return Response(
                {"error": "college_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from .analytics_service import ContestAnalyticsService
            from .ai_insights_service import generate_college_insights_sync
            
            analytics_service = ContestAnalyticsService(contest_id=str(contest.id))
            analytics_data = analytics_service.get_college_analytics(college_id=college_id)
            
            include_ai = request.query_params.get('include_ai_insights', 'false').lower() == 'true'
            
            if include_ai:
                try:
                    ai_insights = generate_college_insights_sync(
                        college_analytics=analytics_data,
                        contest_title=contest.title
                    )
                    analytics_data['ai_insights'] = ai_insights
                except Exception as ai_error:
                    logger.warning(f"Failed to generate AI insights for college: {str(ai_error)}")
                    analytics_data['ai_insights'] = {
                        "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                        "ai_generated": False
                    }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Failed to generate college analytics: {str(e)}")
            return Response(
                {"error": "Failed to generate college analytics", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='by-college')
    def contests_by_college(self, request):
        """
        Get all contests that a specific college has participated in.
        Returns contests with submission counts for that college.

        URL: /api/assessment/contests/by-college/?college_id={college_id}
        """
        user = request.user

        if not (user.is_staff or user.role in ['admin', 'instructor']):
            return Response(
                {"error": "You don't have permission to view college contest data"},
                status=status.HTTP_403_FORBIDDEN
            )

        college_id = request.query_params.get('college_id')
        if not college_id:
            return Response(
                {"error": "college_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from authentication.models import College
            college = College.objects.get(id=college_id)
        except College.DoesNotExist:
            return Response(
                {"error": "College not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        from django.db.models import Count, Avg

        contests_with_participation = Contest.objects.filter(
            contest_submissions__user__profile__college=college
        ).annotate(
            college_participants=Count('contest_submissions', filter=Q(contest_submissions__user__profile__college=college), distinct=True),
            college_avg_score=Avg('contest_submissions__marks', filter=Q(contest_submissions__user__profile__college=college))
        ).filter(
            college_participants__gt=0
        ).order_by('-start_datetime').distinct()

        contest_data = []
        for contest in contests_with_participation:
            contest_data.append({
                'id': str(contest.id),
                'title': contest.title,
                'type': contest.type,
                'difficulty': contest.difficulty,
                'start_datetime': contest.start_datetime,
                'end_datetime': contest.end_datetime,
                'total_marks': contest.total_marks,
                'status': contest.status,
                'college_participants': contest.college_participants,
                'college_avg_score': round(contest.college_avg_score or 0, 1),
            })

        return Response({
            'college_id': str(college.id),
            'college_name': college.name,
            'contests': contest_data,
            'total_contests': len(contest_data)
        }, status=status.HTTP_200_OK)


class SkillTestViewSet(ProctoringMixin, viewsets.ModelViewSet):
    queryset = SkillTest.objects.all()
    serializer_class = SkillTestSerializer
    
    submission_model = SkillTestSubmission
    question_activity_model = SkillTestQuestionActivity
    submission_lookup_field = 'skill_test'
    submission_related_field = 'skill_test_submission'
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    
    search_fields = ['title', 'description']
    ordering_fields = ['created_at']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    def get_queryset(self):
        qs = super().get_queryset()
        
        course_param = self.request.query_params.get('course')
        topic_param = self.request.query_params.get('topic')
        difficulty_param = self.request.query_params.get('difficulty')
        
        q = Q()
        if course_param:
            q &= Q(course=course_param)
            
        if topic_param:
            q &= Q(topic=topic_param)
        
        if difficulty_param:
            q &= Q(difficulty=difficulty_param)

        if q:
            qs = qs.filter(q)
            
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start(self, request, pk=None):
        skill_test = self.get_object()
        user = request.user
        
        active_session = has_active_submission(
            user,
            excluding_model=SkillTestSubmission,
            excluding_assessment_field='skill_test_id',
            excluding_assessment_id=skill_test.id
        )
        if active_session:
            return Response(
                {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = SkillTestSubmission.objects.filter(
            skill_test=skill_test,
            user=user,
            status=SkillTestSubmission.STATUS_STARTED
        ).first()

        if not submission:
            completed_count = SkillTestSubmission.objects.filter(
                skill_test=skill_test,
                user=user,
                status=SkillTestSubmission.STATUS_COMPLETED
            ).count()

            if completed_count >= skill_test.max_attempts:
                return Response(
                    {'error': f'Maximum attempt limit ({skill_test.max_attempts}) reached for this test.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            submission = SkillTestSubmission.objects.create(
                skill_test=skill_test,
                user=user,
                status=SkillTestSubmission.STATUS_STARTED
            )
        
        questions_to_send = []
        
        if skill_test.questions_config:
            all_ids = []
            for q_type, ids in skill_test.questions_config.items():
                if isinstance(ids, list):
                    all_ids.extend(ids)
            
            if all_ids:
                questions_to_send = list(Question.objects.filter(id__in=all_ids).values(
                    'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                ))
        
        if skill_test.questions_random_config:
            
            existing_ids = [q['id'] for q in questions_to_send]
            
            for q_type, config in skill_test.questions_random_config.items():
                if isinstance(config, dict):
                    difficulty_counts = config
                elif isinstance(config, int) or (isinstance(config, str) and config.isdigit()):
                    difficulty_counts = {None: int(config)}
                else:
                    continue
                
                for diff, count in difficulty_counts.items():
                    if isinstance(count, int) and count > 0:
                        q_filter = Q(type=q_type)
                        
                        if diff is not None:
                            q_filter &= Q(difficulty=diff)
                            
                        if skill_test.topic:
                            q_filter &= (Q(subtopic__topic=skill_test.topic) | Q(topic=skill_test.topic))
                        elif skill_test.course:
                            q_filter &= Q(course=skill_test.course)
                            
                        selected = list(Question.objects.filter(
                            q_filter
                        ).exclude(id__in=existing_ids).order_by('?')[:count].values(
                            'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                        ))
                        
                        questions_to_send.extend(selected)
                        existing_ids.extend([q['id'] for q in selected])
                    
        random.shuffle(questions_to_send)
        
        for q in questions_to_send:
            if q.get('mcq_options') and isinstance(q['mcq_options'], list):
                for opt in q['mcq_options']:
                    if isinstance(opt, dict):
                        opt.pop('is_correct', None)
        
        total_violations, tab_switch_count = self._get_submission_stats(submission)

        return Response({
            'submission_id': submission.id,
            'status': submission.status,
            'started_at': submission.started_at,
            'duration': skill_test.duration,
            'questions': questions_to_send,
            'enable_proctoring': skill_test.enable_proctoring,
            'tab_switch_threshold': skill_test.tab_switch_threshold,
            'violation_threshold': skill_test.violation_threshold,
            'violation_count': total_violations,
            'tab_switch_count': tab_switch_count,
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        skill_test = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})
        explanations = request.data.get('explanations', {})
        all_question_ids = request.data.get('all_question_ids', [])
        time_spent = request.data.get('time_spent', {}) or {}
        if not isinstance(time_spent, dict):
            time_spent = {}

        submission = get_object_or_404(
            SkillTestSubmission,
            id=submission_id,
            user=request.user,
            skill_test=skill_test
        )
        question_ids = list(set(list(answers.keys()) + all_question_ids))

        if submission.status == SkillTestSubmission.STATUS_COMPLETED:
             return Response({'error': 'Already submitted'}, status=status.HTTP_400_BAD_REQUEST)

        submission.status = SkillTestSubmission.STATUS_COMPLETED
        submission.submitted_at = timezone.now()
        submission.completed_at = timezone.now()
        submission.answer_data = answers
        
        total_score = 0
        
        for q_id in question_ids:
            user_ans = answers.get(q_id)
            try:
                question = Question.objects.get(id=q_id)
            except Question.DoesNotExist:
                continue

            is_correct, marks_obtained = question.grade_answer(user_ans)

            activity, created = SkillTestQuestionActivity.objects.update_or_create(
                skill_test_submission=submission,
                question=question,
                user=request.user,
                defaults={
                    'answer_data': {
                        'answer': user_ans,
                        'explanation': explanations.get(q_id, '')
                    },
                    'is_final_answer': True,
                    'is_correct': is_correct,
                    'marks_obtained': marks_obtained,
                    'auto_graded': question.is_auto_gradable,
                    'total_question_time': time_spent.get(str(q_id), 0)
                }
            )
            
            if activity.used_hint or activity.viewed_solution or activity.ai_help_count > 0:
                marks_obtained = 0
                activity.marks_obtained = 0
                activity.save(update_fields=['marks_obtained'])

            total_score += marks_obtained
        
        submission.marks = total_score
        submission.save()

        gamification = {}
        try:
            from gamification.service import GamificationService
            for q_id in question_ids:
                user_ans = answers.get(q_id)
                try:
                    question = Question.objects.get(id=q_id)
                    if question.type == 'coding':
                        is_correct, _ = question.grade_answer(user_ans)
                        if is_correct:
                            GamificationService.record_activity(request.user, 'coding')
                except Question.DoesNotExist:
                    pass
            gamification = GamificationService.record_activity(request.user, 'quiz')
        except Exception:
            pass  
            
        if skill_test.enable_proctoring:
            run_async_face_verification(SkillTestSubmission, submission.id)
        
        return Response({
            'status': 'submitted',
            'score': total_score,
            'gamification': gamification,
        })

INTERVIEW_TRANSITIONS = {
    'acknowledgment': [
        "Hmm, I got it. ",
        "Understood. ",
        "Got it. ",
        "Fair enough. ",
        "I see. ",
        "Okay, understood. ",
        "Makes sense. ",
        "Alright, noted. ",
        "Interesting. ",
        "That clarifies things. ",
        "I appreciate the answer. ",
        "Thanks for explaining that. ",
        "Good to know. ",
        "That's clear. ",
        "I understand your point. "
    ],
    'repeat': [
        "Ok, I am repeating again. ",
        "Sure, let me ask that one more time. ",
        "No problem, here is the question again. ",
        "Alright, let me repeat that. ",
        "I can repeat that. ",
        "Sure thing, I'll say it again. ",
        "Let me re-state the question. ",
        "Okay, I'll read the question once more. ",
        "Not a problem, I will repeat it. ",
        "Here it is again. ",
        "Let's go over that question again. ",
        "Okay, repeating the question now. ",
        "I will repeat the question for you. ",
        "Sure, I can read it again. ",
        "Let me say that one more time. "
    ],
    'skip_topic': [
        "Alright no problem, let's move to a different topic. ",
        "That's fine. We can skip that and discuss something else. ",
        "Okay, let's pivot to something else. ",
        "No worries, we can move on. ",
        "Let's skip this one and move forward. ",
        "Alright, moving past that. ",
        "We can come back to this if needed, let's move on. ",
        "Okay, let's jump to the next area. ",
        "Noted, let's shift our focus. ",
        "Sure, we can skip that. ",
        "Let's proceed with another topic. ",
        "Okay, we will leave that for now. ",
        "Moving on from that question. ",
        "Alright, let's try a different direction. ",
        "Let's skip it and go to the next topic. "
    ],
    'next_topic': [
        "Ok, let's move to the next topic. ",
        "Great. Now, let's switch gears a bit. ",
        "Alright, moving on to the next area. ",
        "Let's transition to a different subject. ",
        "Now, let's talk about something else. ",
        "Moving forward to our next main topic. ",
        "Let's explore another area now. ",
        "Okay, let's move along. ",
        "Next, I'd like to ask you about a new topic. ",
        "Alright, let's shift gears. ",
        "Let's go to the next section. ",
        "Moving on to our next topic. ",
        "Now, let's discuss another aspect. ",
        "Okay, onto the next set of questions. ",
        "Let's change the topic now. "
    ],
    'first_question_intro': [
        "Thanks {name}. Let's dive into the first question. ",
        "Great to meet you, {name}. Let's get started. ",
        "Hi {name}, thanks for the intro. Here is your first question: ",
        "Pleasure to meet you, {name}. Let's begin. ",
        "Thank you for that introduction, {name}. Let's start. ",
        "Awesome, {name}. Let's kick things off with this: ",
        "Nice to meet you, {name}. Let's jump right in. ",
        "Thanks for sharing, {name}. Let's move to the technical part. ",
        "Got it, {name}. Let's begin the interview now. ",
        "Wonderful, {name}. Here is the first question for you. ",
        "Thanks {name}. Let's start with something basic. ",
        "Hello {name}. Let's proceed with the interview. ",
        "Excellent, {name}. Let's start the technical questions. ",
        "Thanks for the intro, {name}. Let's get into it. ",
        "Alright {name}, let's begin the evaluation. "
    ],
    'ask_missing_name': [
        "I didn't quite catch your name, could you please tell me?",
        "Could you please share your name with me?",
        "Before we begin, may I have your name?",
        "Sorry, I missed your name. What should I call you?",
        "Could you tell me your name before we start?",
        "I'd love to know your name first.",
        "To get started, what is your name?",
        "Please let me know your name.",
        "Could you start by telling me your name?",
        "What name do you prefer to go by?",
        "I missed your name, could you repeat it?",
        "May I know who I'm speaking with?",
        "Could you confirm your name for me?",
        "Just to be sure, what is your name?",
        "Please share your name with me."
    ],
    'ask_missing_experience': [
        "Thanks {name}. Could you briefly mention your years of experience?",
        "Got it, {name}. How many years of experience do you have?",
        "Understood, {name}. Could you also share your experience level?",
        "Okay {name}. Are you a fresher or do you have prior experience?",
        "Alright {name}, just to understand better, what is your experience level?",
        "Thanks {name}. Could you tell me about your work experience?",
        "Noted, {name}. How much professional experience do you have?",
        "Okay {name}, could you briefly outline your experience?",
        "Got it, {name}. What is your total years of experience?",
        "Understood, {name}. Let me know your experience level before we continue.",
        "Thanks for that, {name}. How many years have you been working?",
        "Alright {name}, could you summarize your professional experience?",
        "Okay {name}, just one more detail: what is your experience level?",
        "Got it, {name}. Do you have any prior industry experience?",
        "Thanks {name}. Please also mention your total experience."
    ],
    'ask_missing_skills': [
        "Got it, {name}. What are your core technical skills?",
        "Understood, {name}. Could you highlight a few of your key technical skills?",
        "Okay {name}. Which programming languages or tools are you most proficient in?",
        "Alright {name}, before we jump into the technical questions, what are your main skills?",
        "Thanks {name}. Could you list your primary technical skills?",
        "Noted, {name}. What technologies do you have the most experience with?",
        "Okay {name}, please share your core competencies and skills.",
        "Understood, {name}. I'd like to know your primary technical stack. Could you share?",
        "Got it, {name}. What are the main skills you bring to the table?",
        "Thanks {name}. Could you briefly mention your top technical skills?",
        "Alright {name}. Which technologies are you most comfortable working with?",
        "Okay {name}, what are your key areas of technical expertise?",
        "Understood, {name}. Please list the main tools and languages you use.",
        "Got it, {name}. Before we begin, what is your technical skill set?",
        "Thanks {name}. Could you tell me your core skills?"
    ]
}


class MockInterviewViewSet(viewsets.ModelViewSet):
    queryset = MockInterview.objects.all()
    serializer_class = MockInterviewSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        publish_status_param = self.request.query_params.get("publish_status")
        ai_mode_param = self.request.query_params.get("ai_generation_mode")

        q = Q()
        if publish_status_param:
            q &= Q(publish_status=publish_status_param)

        if ai_mode_param:
            q &= Q(ai_generation_mode=ai_mode_param)

        if q:
            qs = qs.filter(q)

        return qs

    def _analyze_intro_answer(self, text):
        from asgiref.sync import async_to_sync
        from core.ai_client import AIClient
        import json
        
        if not text or len(text.strip()) < 2:
            return {}
            
        try:
            prompt = f"""
            Extract the following information from the user's self-introduction.
            Return ONLY valid JSON. If a detail is missing, return null for it.
            
            Text: "{text}"
            
            Format:
            {{
                "name": "<string or null>",
                "experience": "<string or null, e.g. '2 years' or 'fresher'>",
                "skills": "<string or null, e.g. 'React, Python, Java'>"
            }}
            """
            
            response = async_to_sync(AIClient.generate_response)(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=200
            )
            resp_text = response.get("response", "").replace("```json", "").replace("```", "").strip()
            return json.loads(resp_text)
        except Exception as e:
            logger.error(f"Error extracting intro details: {str(e)}")
            return {}

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def start_interview(self, request, pk=None):
        try:
            user = request.user
            mock_interview = self.get_object()

            active_session = has_active_submission(
                user,
                excluding_model=MockInterviewSubmission,
                excluding_assessment_field='mock_interview_id',
                excluding_assessment_id=mock_interview.id
            )
            if active_session:
                return Response(
                    {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            experience_level = request.data.get('experience_level', 'Beginner')
            selected_duration = request.data.get('selected_duration')
            resume_file = request.FILES.get('resume')

            from assessment.models import UserInterviewProgress, PredefinedInterviewQuestion
            progress, created = UserInterviewProgress.objects.get_or_create(
                user=user,
                mock_interview=mock_interview
            )

            current_cycle_step = progress.completed_count  # 0 to 5
            is_master = current_cycle_step >= 5
            
            interview_type = "full_ai" if is_master else "predefined"
            
            context_text = ""
            if resume_file:
                try:
                    reader = PdfReader(resume_file)
                    for page in reader.pages:
                        text = page.extract_text()
                        if text: context_text += text + "\n"
                except Exception as e:
                    logger.warning(f"Error parsing resume: {e}")

            if not context_text.strip():
                try:
                    if hasattr(user, "profile"):
                        profile = user.profile
                        context_text += f"Name: {profile.user.get_full_name()}\n"
                        context_text += f"Title: {profile.title}\n"
                        context_text += f"About: {profile.about}\n"
                except Exception: pass

            auth_token = str(request.auth) if request.auth else None
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                yhub_data = {
                    "role_title": mock_interview.title,
                    "role_level": experience_level,
                    "difficulty": experience_level,
                    "duration_minutes": selected_duration or mock_interview.max_duration,
                }
                if resume_file:
                    yhub_data["resume"] = resume_file
                    
                response_data = loop.run_until_complete(
                    AIClient.create_interview_session(
                        data=yhub_data,
                        auth_token=auth_token
                    )
                )
                chat_session_id = response_data.get("id")
            except Exception as e:
                return Response({"error": f"Failed to initialize interview: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            submission = MockInterviewSubmission.objects.create(
                mock_interview=mock_interview,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
                experience_level=experience_level,
                chat_session_id=chat_session_id,
                interview_type=interview_type,
                selected_duration=selected_duration or 0,
                resume=resume_file
            )

            first_question_text = ""
            if interview_type == "predefined":
                main_pool = PredefinedInterviewQuestion.objects.filter(
                    mock_interview=mock_interview,
                    level=1
                ).exclude(id__in=progress.asked_questions)
                
                if main_pool.count() < 10:
                    progress.asked_questions = [] 
                    progress.save()
                    main_pool = PredefinedInterviewQuestion.objects.filter(mock_interview=mock_interview, level=1)
                
                selected_mains = list(main_pool.order_by('?')[:10])
                planned_ids = [str(q.id) for q in selected_mains]
                
                greeting = f"Hello! I'm your AI interviewer today. We'll be discussing the {mock_interview.title} role. To start, could you please introduce yourself?"
                try:
                    loop.run_until_complete(
                        AIClient.add_interview_message(chat_session_id, "assistant", greeting, auth_token=auth_token)
                    )
                except Exception:
                    pass
                first_question_text = greeting
                
                state_data = {
                    "current_main_index": -1, 
                    "current_node_id": None,
                    "planned_questions": planned_ids
                }
                try:
                    loop.run_until_complete(
                        AIClient.update_interview_state(chat_session_id, state_data, auth_token=auth_token)
                    )
                except Exception:
                    pass
            else:
                initial_prompt = f"The interview for {mock_interview.title} ({experience_level}) is starting. Use the following candidate info for context: {context_text[:1000]}. Please introduce yourself and ask the first question."
                first_question_text = "Preparing your AI interviewer..."

            return Response({
                'submission_id': submission.id,
                'interview_session_id': chat_session_id,
                'status': submission.status,
                'interview_type': interview_type,
                'first_question': first_question_text,
                'progress': {
                    "completed_count": current_cycle_step,
                    "is_master": is_master
                }
            })

        except Exception as e:
            logger.error(f"Error starting interview: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def get_next_question(self, request, pk=None):
        try:
            mock_interview = self.get_object()
            interview_session_id = request.data.get('interview_session_id')
            user_answer = request.data.get('user_answer', '')
            status_code = request.data.get('status', 'normal')

            if not interview_session_id:
                return Response({"error": "No interview session ID provided"}, status=status.HTTP_400_BAD_REQUEST)


            from assessment.models import PredefinedInterviewQuestion
            
            auth_token = str(request.auth) if request.auth else None
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                state = loop.run_until_complete(
                    AIClient.get_interview_state(interview_session_id, auth_token=auth_token)
                )
            except Exception as e:
                return Response({"error": f"Failed to retrieve interview state: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if user_answer and user_answer.strip():
                try:
                    loop.run_until_complete(
                        AIClient.add_interview_message(interview_session_id, "user", user_answer, auth_token=auth_token)
                    )
                except Exception:
                    pass

            planned_questions = state.get('planned_questions', [])
            current_main_index = state.get('current_main_index', -1)
            current_node_id = state.get('current_node_id')

            intro_details = state.get('intro_details', {'name': None, 'experience': None, 'skills': None, 'attempts': 0, 'completed': False})

            if current_main_index == -1 and not intro_details.get('completed'):
                if user_answer and user_answer.strip():
                    intro_details['attempts'] = intro_details.get('attempts', 0) + 1
                    new_details = self._analyze_intro_answer(user_answer)
                    if new_details.get('name'): intro_details['name'] = new_details['name']
                    if new_details.get('experience'): intro_details['experience'] = new_details['experience']
                    if new_details.get('skills'): intro_details['skills'] = new_details['skills']

                    intro_details['completed'] = True
                    state['intro_details'] = intro_details
                    try:
                        loop.run_until_complete(
                            AIClient.update_interview_state(interview_session_id, state, auth_token=auth_token)
                        )
                    except Exception:
                        pass
                else:
                    state['intro_details'] = intro_details
                    try:
                        loop.run_until_complete(
                            AIClient.update_interview_state(interview_session_id, state, auth_token=auth_token)
                        )
                    except Exception:
                        pass
                    
                    ask_phrase = ""
                    if not intro_details.get('name'):
                        ask_phrase = random.choice(INTERVIEW_TRANSITIONS['ask_missing_name'])
                    elif not intro_details.get('experience'):
                        name = intro_details.get('name') or request.user.first_name or request.user.username or "there"
                        ask_phrase = random.choice(INTERVIEW_TRANSITIONS['ask_missing_experience']).format(name=name)
                    elif not intro_details.get('skills'):
                        name = intro_details.get('name') or request.user.first_name or request.user.username or "there"
                        ask_phrase = random.choice(INTERVIEW_TRANSITIONS['ask_missing_skills']).format(name=name)

                    try:
                        loop.run_until_complete(
                            AIClient.add_interview_message(interview_session_id, "assistant", ask_phrase, auth_token=auth_token)
                        )
                    except Exception:
                        pass
                    return Response({
                        "question": ask_phrase,
                        "is_finished": False
                    })

            if status_code == 'repeat' and current_node_id:
                try:
                    curr_node = PredefinedInterviewQuestion.objects.get(id=current_node_id)
                    transition = random.choice(INTERVIEW_TRANSITIONS['repeat'])
                    return Response({
                        "question": transition + curr_node.text,
                        "is_finished": False
                    })
                except PredefinedInterviewQuestion.DoesNotExist:
                    pass

            next_node = None
            is_new_main_topic = False
            is_skip = (status_code == 'skip')
            
            if current_node_id and status_code == 'normal':
                try:
                    curr_node = PredefinedInterviewQuestion.objects.get(id=current_node_id)
                    follow_ups = curr_node.follow_ups.all().order_by('created_at')
                    
                    asked_in_session = state.get('asked_in_session', [])
                    for fu in follow_ups:
                        if str(fu.id) not in asked_in_session:
                            next_node = fu
                            break
                except PredefinedInterviewQuestion.DoesNotExist:
                    pass
            
            if not next_node:
                current_main_index += 1
                if current_main_index < len(planned_questions):
                    next_node_id = planned_questions[current_main_index]
                    try:
                        next_node = PredefinedInterviewQuestion.objects.get(id=next_node_id)
                        is_new_main_topic = True
                    except PredefinedInterviewQuestion.DoesNotExist:
                        return self.get_next_question(request, pk)
                else:
                    farewell = "Thank you! That concludes our predefined questions for today. I'll now finalize your performance report."
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=farewell
                    )
                    return Response({
                        "question": farewell,
                        "is_finished": True
                    })

            transition = ""
            if current_node_id is None:
                intro_details = state.get('intro_details', {})
                first_name = intro_details.get('name') or request.user.first_name or request.user.username

                transition_template = random.choice(INTERVIEW_TRANSITIONS['first_question_intro'])
                transition = transition_template.format(name=first_name)
            else:
                if is_skip:
                    transition = random.choice(INTERVIEW_TRANSITIONS['skip_topic'])
                elif is_new_main_topic:
                    transition = random.choice(INTERVIEW_TRANSITIONS['next_topic'])
                elif status_code == 'normal':
                    transition = random.choice(INTERVIEW_TRANSITIONS['acknowledgment'])
                    
            final_question_text = transition + next_node.text

            # 5. Update state
            asked_in_session = state.get('asked_in_session', [])
            asked_in_session.append(str(next_node.id))
            
            state['current_main_index'] = current_main_index
            state['current_node_id'] = str(next_node.id)
            state['asked_in_session'] = list(set(asked_in_session))
            
            interview_session.state_data = state
            interview_session.save()

            # 6. Log Assistant Message
            ChatMessage.objects.create(
                chat_session=chat_session,
                message_type="assistant",
                content=final_question_text
            )

            return Response({
                "question": final_question_text,
                "is_finished": False
            })

        except Exception as e:
            logger.error(f"Error in get_next_question: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": "Internal server error during question progression"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def submissions(self, request, pk=None):
        mock_interview = self.get_object()
        user = request.user
        
        qs = MockInterviewSubmission.objects.filter(mock_interview=mock_interview)
        is_privileged = user.is_staff or (hasattr(user, 'role') and user.role in ['admin', 'instructor'])
        
        if not is_privileged:
            qs = qs.filter(user=user)
            
        serializer = MockInterviewSubmissionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_interviews(self, request):
        user = request.user
        qs = MockInterviewSubmission.objects.filter(user=user).order_by('-created_at')
        
        serializer = MockInterviewSubmissionSerializer(qs, many=True)
        return Response(serializer.data)


    



class MockInterviewSubmissionViewSet(viewsets.ModelViewSet):
    queryset = MockInterviewSubmission.objects.all()
    serializer_class = MockInterviewSubmissionSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__username", "mock_interview__title"]
    ordering_fields = ['created_at', 'marks']
    
    def get_queryset(self):
        qs = super().get_queryset()
        mock_interview_id = self.request.query_params.get('mock_interview')
        if mock_interview_id:
            qs = qs.filter(mock_interview_id=mock_interview_id)
        
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
            
        # Filter by user if not instructor/admin
        if not (self.request.user.is_staff or (hasattr(self.request.user, 'role') and self.request.user.role in ['admin', 'instructor'])):
            qs = qs.filter(user=self.request.user)
            
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Check if interview just completed
        if instance.status == MockInterviewSubmission.STATUS_COMPLETED:
            logger.info(f"--- Interview Completed detected for submission {instance.id} ---")
            from assessment.models import UserInterviewProgress
            
            progress, created = UserInterviewProgress.objects.get_or_create(
                user=instance.user,
                mock_interview=instance.mock_interview
            )
            
            # Increment count
            progress.completed_count += 1
            
            # Update asked questions list
            asked_ids = self.request.data.get('asked_question_ids', [])
            if not asked_ids and instance.chat_session_id:
                try:
                    auth_token = str(self.request.auth) if self.request.auth else None
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    state = loop.run_until_complete(AIClient.get_interview_state(instance.chat_session_id, auth_token=auth_token))
                    if instance.interview_type == 'predefined':
                        # Capture both planned questions AND the actually asked ones (including follow-ups)
                        asked_ids = state.get('asked_in_session', []) or state.get('planned_questions', [])
                except Exception as e:
                    logger.error(f"Failed to fetch state for perform_update: {e}")

            if asked_ids:
                if not isinstance(progress.asked_questions, list):
                    progress.asked_questions = []
                progress.asked_questions.extend(asked_ids)
                # Keep it unique
                progress.asked_questions = list(set(progress.asked_questions))
            
            # Reset cycle if Master Interview completed (Step 6)
            if progress.completed_count >= 6:
                progress.completed_count = 0
                progress.asked_questions = [] # Optional: Reset questions on new cycle
                
            progress.save()
            
            # Trigger Background Report Generation
            if instance.chat_session_id:
                def trigger():
                    try:
                        auth_token = str(self.request.auth) if self.request.auth else None
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(AIClient.generate_interview_report(instance.chat_session_id, auth_token=auth_token))
                    except Exception as e:
                        logger.error(f"Failed to trigger report generation: {e}")
                
                import threading
                t = threading.Thread(target=trigger)
                t.daemon = True
                t.start()

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_resume(self, request):
        try:
            jd_text = request.data.get('jd_text', '')
            resume_text = request.data.get('resume_text', '')
            if not jd_text.strip() or not resume_text.strip():
                return Response({"error": "Both Job Description and Resume text are required."}, status=status.HTTP_400_BAD_REQUEST)
            
            from assessment.ai_interview.resume_parser import analyze_resume
            
            analysis = async_to_sync(analyze_resume)(resume_text, jd_text)
            return Response(analysis)
        except Exception as e:
            logger.error(f"Error in upload_resume: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_resume_pdf(self, request):
        try:
            jd_text = request.data.get('jd_text', '')
            resume_file = request.FILES.get('resume')
            if not jd_text.strip() or not resume_file:
                return Response({"error": "Both Job Description and Resume PDF file are required."}, status=status.HTTP_400_BAD_REQUEST)
            
            from assessment.ai_interview.resume_parser import extract_text_from_pdf, analyze_resume
            
            pdf_bytes = resume_file.read()
            resume_text = async_to_sync(extract_text_from_pdf)(pdf_bytes)
            if not resume_text.strip():
                return Response({"error": "Could not extract text from the provided PDF. Please try pasting the text instead."}, status=status.HTTP_400_BAD_REQUEST)
            
            analysis = async_to_sync(analyze_resume)(resume_text, jd_text)
            return Response(analysis)
        except Exception as e:
            logger.error(f"Error in upload_resume_pdf: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start_interview(self, request):
        try:
            user = request.user
            active_session = has_active_submission(user)
            if active_session:
                return Response(
                    {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            analysis = request.data.get('analysis')
            difficulty = request.data.get('difficulty', 'medium').lower()
            num_questions = int(request.data.get('num_questions', 5))
            adaptive = bool(request.data.get('adaptive', False))
            # Raw texts for admin visibility
            jd_text = request.data.get('jd_text', '')
            resume_text = request.data.get('resume_text', '')
            
            if not analysis:
                return Response({"error": "Resume/JD analysis is required to start the interview."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get AI Agent
            ai_agent = AIAgent.objects.filter(is_active=True).first()
            if not ai_agent:
                return Response({"error": "No active AI agent available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            role_title = analysis.get('_jd_requirements', {}).get('title') or analysis.get('domain') or 'Custom Role'
            
            # Create ChatSession
            chat_session = ChatSession.objects.create(
                user=user,
                ai_agent=ai_agent,
                title=f"Custom JD/Resume Interview: {role_title}",
                page="mock_interview",
                context={
                    "role": role_title,
                    "difficulty": difficulty,
                    "interview_type": "jd_resume",
                    "adaptive": adaptive,
                    "candidate_info": f"Candidate Analysis: {json.dumps(analysis)}"
                }
            )
            
            # Create InterviewSession
            interview_session = InterviewSession.objects.create(
                user=user,
                chat_session=chat_session,
                role_title=role_title,
                role_level=difficulty,
                duration_minutes=30,
                status="started"
            )
            
            # Initialize State
            state_data = {
                "analysis": analysis,
                "difficulty": difficulty,
                "num_questions": num_questions,
                "adaptive": adaptive,
                "interview": [],
                "answers": {},
                "current_question_index": 0,
                "hints": {},
                "face_checks": [],
                "face_enrollment": None,
                # Raw JD + resume for admin review
                "jd_text": jd_text,
                "resume_text": resume_text,
            }
            
            from assessment.ai_interview.interview_engine import generate_questions, get_next_question
            
            if not adaptive:
                # Batch mode: generate all questions
                state_data["interview"] = async_to_sync(generate_questions)(analysis, difficulty, num_questions)
            else:
                # Adaptive mode: generate first question
                first_q = async_to_sync(get_next_question)(state_data, num_questions)
                if first_q:
                    state_data["interview"] = [first_q]
            
            if not state_data["interview"]:
                return Response({"error": "Failed to generate interview questions. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create Submission
            submission = MockInterviewSubmission.objects.create(
                mock_interview=None,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
                experience_level=difficulty,
                chat_session=chat_session,
                interview_type="full_ai",
                selected_duration=30,
                state_data=state_data
            )
            
            # Save first question as ChatMessage
            first_question = state_data["interview"][0]
            ChatMessage.objects.create(
                chat_session=chat_session,
                message_type="assistant",
                content=first_question["question"]
            )
            
            return Response({
                'submission_id': submission.id,
                'interview_session_id': interview_session.id,
                'chat_session_id': chat_session.id,
                'first_question': first_question["question"],
                'first_question_id': first_question["id"],
                'status': submission.status,
                'is_finished': False
            })
        except Exception as e:
            logger.error(f"Error in start_interview: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def next_question(self, request, pk=None):
        try:
            submission = self.get_object()
            state = submission.state_data or {}
            
            interview = state.get("interview", [])
            current_index = state.get("current_question_index", 0)
            num_questions = state.get("num_questions", 5)
            adaptive = state.get("adaptive", False)
            
            # Increment question index
            next_index = current_index + 1
            state["current_question_index"] = next_index
            
            if next_index >= num_questions:
                # End of interview
                farewell = "Thank you! That completes the interview. I'll now finalize your performance report."
                ChatMessage.objects.create(
                    chat_session=submission.chat_session,
                    message_type="assistant",
                    content=farewell
                )
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save()
                return Response({
                    "question": farewell,
                    "is_finished": True
                })
            
            next_q = None
            if not adaptive:
                # Batch mode: retrieve pre-generated question
                if next_index < len(interview):
                    next_q = interview[next_index]
            else:
                # Adaptive mode: generate next question on the fly
                from assessment.ai_interview.interview_engine import get_next_question
                next_q = async_to_sync(get_next_question)(state, num_questions)
                if next_q:
                    interview.append(next_q)
                    state["interview"] = interview
            
            if not next_q:
                # Fallback to farewell if we couldn't retrieve/generate the question
                farewell = "Thank you! That completes the interview. I'll now finalize your performance report."
                ChatMessage.objects.create(
                    chat_session=submission.chat_session,
                    message_type="assistant",
                    content=farewell
                )
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save()
                return Response({
                    "question": farewell,
                    "is_finished": True
                })
            
            # Save next question as ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="assistant",
                content=next_q["question"]
            )
            
            submission.state_data = state
            submission.save()
            
            return Response({
                "question": next_q["question"],
                "question_id": next_q["id"],
                "is_finished": False
            })
        except Exception as e:
            logger.error(f"Error in next_question: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit_answer(self, request, pk=None):
        try:
            submission = self.get_object()
            state = submission.state_data or {}
            
            question_id = int(request.data.get('question_id'))
            user_answer = request.data.get('answer', '')
            answer_duration_seconds = request.data.get('answer_duration_seconds')
            if answer_duration_seconds is not None:
                answer_duration_seconds = float(answer_duration_seconds)
            
            # Find the question
            interview = state.get("interview", [])
            target_q = None
            for q in interview:
                if q.get("id") == question_id:
                    target_q = q
                    break
            
            if not target_q:
                return Response({"error": "Question not found in this interview session."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Log user's answer as ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="user",
                content=user_answer
            )
            
            # Update answers dict in state_data
            answers = state.get("answers", {})
            is_follow_up = str(question_id) in answers
            previous_answer_data = answers.get(str(question_id))
            
            is_negative_followup = False
            if is_follow_up and previous_answer_data:
                clean_ans = user_answer.strip().lower().rstrip('.!?')
                negative_phrases = {
                    "no", "nothing", "nothing else", "no nothing else", "skip", "next", 
                    "pass", "move on", "go ahead", "no thanks", "no, thank you", "none",
                    "no other details", "done", "that's it", "thats it", "no more"
                }
                if clean_ans in negative_phrases or len(clean_ans.split()) < 4:
                    is_negative_followup = True
            
            if is_negative_followup:
                # Use the previous evaluation, don't overwrite with low score
                evaluation = {
                    k: v for k, v in previous_answer_data.items()
                    if k not in ["answer", "duration_seconds"]
                }
                proceed = True
                num_questions = state.get("num_questions", 5)
                is_finished = len(answers) >= num_questions
                from assessment.ai_interview.conversation_cues import closing_ack, next_question_ack
                cue = closing_ack() if is_finished else next_question_ack()
            else:
                # If follow up and not negative, evaluate combined answer
                eval_answer = user_answer
                if is_follow_up and previous_answer_data:
                    eval_answer = previous_answer_data.get("answer", "") + "\n" + user_answer
                
                # Evaluate answer
                from assessment.ai_interview.evaluator import evaluate_answer
                
                evaluation = async_to_sync(evaluate_answer)(
                    question=target_q.get("question"),
                    expected_points=target_q.get("expected_points", []),
                    answer=eval_answer,
                    question_type=target_q.get("question_type", "technical")
                )
                
                answers[str(question_id)] = {
                    "answer": eval_answer,
                    "duration_seconds": (previous_answer_data.get("duration_seconds") or 0) + (answer_duration_seconds or 0) if is_follow_up else answer_duration_seconds,
                    **evaluation
                }
                state["answers"] = answers
                
                # Determine dialogue acknowledgement cue
                num_questions = state.get("num_questions", 5)
                is_finished = len(answers) >= num_questions
                
                from assessment.ai_interview.conversation_cues import cue_for_answer
                cue, proceed = cue_for_answer(evaluation, answer_duration_seconds, is_finished)
                
                # Force proceed if it's a follow-up attempt to prevent infinite looping
                if is_follow_up:
                    proceed = True
                    from assessment.ai_interview.conversation_cues import closing_ack, next_question_ack
                    cue = closing_ack() if is_finished else next_question_ack()
            
            # Save cue to ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="assistant",
                content=cue.get("message")
            )
            
            submission.state_data = state
            submission.save()
            
            return Response({
                "evaluation": evaluation,
                "cue": cue,
                "proceed": proceed
            })
        except Exception as e:
            logger.error(f"Error in submit_answer: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def get_hint(self, request, pk=None):
        try:
            submission = self.get_object()
            state = submission.state_data or {}
            
            question_id = int(request.data.get('question_id'))
            partial_answer = request.data.get('partial_answer', '')
            
            # Find the question
            interview = state.get("interview", [])
            target_q = None
            for q in interview:
                if q.get("id") == question_id:
                    target_q = q
                    break
            
            if not target_q:
                return Response({"error": "Question not found in this interview session."}, status=status.HTTP_400_BAD_REQUEST)
            
            from assessment.ai_interview.hint_service import generate_hint
            
            hint_res = async_to_sync(generate_hint)(
                session_id=str(submission.id),
                question_id=question_id,
                question=target_q.get("question"),
                topic=target_q.get("topic", "General"),
                partial_answer=partial_answer
            )
            
            # Save hint as ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="assistant",
                content=hint_res.get("hint")
            )
            
            # Reload submission
            submission.refresh_from_db()
            
            return Response(hint_res)
        except Exception as e:
            logger.error(f"Error in get_hint: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def interview_cue(self, request, pk=None):
        try:
            event_type = request.data.get('event_type', '')
            silence_seconds = request.data.get('silence_seconds')
            if silence_seconds is not None: silence_seconds = float(silence_seconds)
            answer_duration_seconds = request.data.get('answer_duration_seconds')
            if answer_duration_seconds is not None: answer_duration_seconds = float(answer_duration_seconds)
            partial_answer = request.data.get('partial_answer', '')
            
            from assessment.ai_interview.conversation_cues import cue_for_event
            cue, proceed = cue_for_event(
                event_type=event_type,
                silence_seconds=silence_seconds,
                answer_duration_seconds=answer_duration_seconds,
                partial_answer=partial_answer
            )
            
            return Response({
                "cue": cue,
                "proceed": proceed
            })
        except Exception as e:
            logger.error(f"Error in interview_cue: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def face_enroll(self, request, pk=None):
        try:
            submission = self.get_object()
            image_b64 = request.data.get('image', '')
            if not image_b64:
                return Response({"error": "No image provided for enrollment."}, status=status.HTTP_400_BAD_REQUEST)
            
            import base64, io
            # Handle base64 image data url format
            if ',' in image_b64:
                image_b64 = image_b64.split(',')[1]
            image_bytes = base64.b64decode(image_b64)
            
            from assessment.ai_interview.face_verification import enroll_face
            
            res = async_to_sync(enroll_face)(image_bytes)
            
            # Upload enrollment photo to S3/MinIO
            enroll_photo_key = None
            try:
                from core.storage import upload_image
                from django.core.files.base import ContentFile
                user_id = submission.user_id
                s3_key = f"mock_interviews/{user_id}/{submission.id}/enroll.jpg"
                enroll_photo_key = upload_image(
                    key=s3_key,
                    file_obj=ContentFile(image_bytes, name="enroll.jpg"),
                    replace_extensions=("png", "jpeg", "jpg"),
                )
            except Exception as upload_err:
                logger.warning(f"face_enroll: S3 upload failed (non-fatal): {upload_err}")
            
            if res.get("enrolled") or res.get("status") == "stub":
                state = submission.state_data or {}
                state["face_enrollment"] = {
                    "enrolled": True,
                    "face_id": res.get("reference_id") or "stub",
                    "photo_key": enroll_photo_key,
                }
                submission.state_data = state
                submission.save()
                
            return Response(res)
        except Exception as e:
            logger.error(f"Error in face_enroll: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def face_verify(self, request, pk=None):
        try:
            submission = self.get_object()
            image_b64 = request.data.get('image', '')
            if not image_b64:
                return Response({"error": "No image provided for verification."}, status=status.HTTP_400_BAD_REQUEST)
            
            state = submission.state_data or {}
            enrollment = state.get("face_enrollment") or {}
            if not enrollment.get("enrolled"):
                return Response({"error": "Face not enrolled. Enroll first."}, status=status.HTTP_400_BAD_REQUEST)
            
            import base64, io
            # Handle base64 image data url format
            if ',' in image_b64:
                image_b64 = image_b64.split(',')[1]
            image_bytes = base64.b64decode(image_b64)
            
            from assessment.ai_interview.face_verification import verify_face
            
            res = async_to_sync(verify_face)(image_bytes)
            
            # Upload verification photo to S3/MinIO
            verify_photo_key = None
            try:
                from core.storage import upload_image
                from django.core.files.base import ContentFile
                user_id = submission.user_id
                ts = timezone.now().strftime("%Y%m%dT%H%M%S")
                s3_key = f"mock_interviews/{user_id}/{submission.id}/verify_{ts}.jpg"
                verify_photo_key = upload_image(
                    key=s3_key,
                    file_obj=ContentFile(image_bytes, name=f"verify_{ts}.jpg"),
                )
            except Exception as upload_err:
                logger.warning(f"face_verify: S3 upload failed (non-fatal): {upload_err}")
            
            # Log verify check in state_data
            face_checks = state.get("face_checks", [])
            face_checks.append({
                "timestamp": timezone.now().isoformat(),
                "photo_key": verify_photo_key,
                **res
            })
            state["face_checks"] = face_checks
            submission.state_data = state
            submission.save()
            
            return Response(res)
        except Exception as e:
            logger.error(f"Error in face_verify: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def generate_report(self, request, pk=None):
        try:
            submission = self.get_object()
            
            if not submission.chat_session_id:
                return Response({"error": "No active interview session associated with this submission."}, status=status.HTTP_400_BAD_REQUEST)
            
            auth_token = str(request.auth) if request.auth else None
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # End the interview to generate the report
            try:
                loop.run_until_complete(AIClient.generate_interview_report(submission.chat_session_id, auth_token=auth_token))
            except Exception as e:
                # Might already be completed
                pass
                
            # Fetch the session and report from YHub
            session_data = loop.run_until_complete(AIClient.get_interview_session(submission.chat_session_id, auth_token=auth_token))
            report_data = session_data.get("report")
            
            if report_data:
                # Update submission marks and status
                submission.marks = report_data.get("overall_score", 0.0)
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save()
                return Response(report_data)
            else:
                return Response({"error": "Report not yet available or failed to generate."}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error in generate_report: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SkillTestSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkillTestSubmission.objects.all()
    serializer_class = SkillTestSubmissionSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'marks']
    
    def get_queryset(self):
        qs = super().get_queryset()
        skill_test_id = self.request.query_params.get('skill_test')
        if skill_test_id:
            qs = qs.filter(skill_test_id=skill_test_id)
        return qs


class ContestSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ContestSubmission.objects.all()
    serializer_class = ContestSubmissionSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'marks']

    def get_queryset(self):
        qs = super().get_queryset()
        contest_id = self.request.query_params.get('contest')
        if contest_id:
            qs = qs.filter(contest_id=contest_id)
        return qs


class CertificationSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CertificationSubmission.objects.all()
    serializer_class = CertificationSubmissionSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'marks']
    
    def get_queryset(self):
        qs = super().get_queryset()
        exam_id = self.request.query_params.get('certification_exam')
        if exam_id:
            qs = qs.filter(certification_exam_id=exam_id)
        return qs


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Certificate.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CertificateSerializer
        return CertificateSerializer

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'role') and user.role in ['admin', 'instructor']:
            return Certificate.objects.all()
        return Certificate.objects.filter(user=user)

    @action(detail=True, methods=['get'], url_path='view', permission_classes=[AllowAny])
    def view_certificate(self, request, pk=None):
        cert = get_object_or_404(Certificate, pk=pk)
        
        # Calculate percentage
        percentage = 0
        score = 0
        if cert.submission and cert.submission.marks is not None:
            score = cert.submission.marks
            if cert.certification_exam and cert.certification_exam.total_marks:
                percentage = round((score / cert.certification_exam.total_marks) * 100, 1)
        
        completion_date = cert.issued_at.strftime('%B %d, %Y')
        if cert.submission and cert.submission.completed_at:
            completion_date = cert.submission.completed_at.strftime('%B %d, %Y')

        student_name = f"{cert.user.first_name} {cert.user.last_name}".strip() or cert.user.username

        context = {
            'student_name': student_name,
            'exam_title': cert.certification_exam.title if cert.certification_exam else cert.course.name,
            'course_name': cert.course.name,
            'score': score,
            'percentage': percentage,
            'completion_date': completion_date,
            'certificate_id': cert.display_id,
            'issued_at': cert.issued_at.strftime('%B %d, %Y'),
        }
        
        
        return render(request, 'assessment/certificate.html', context)


class JobTestViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="log-activity")
    def log_activity(self, request, pk=None):
        

        application = get_object_or_404(JobApplication, id=pk)
        
        # Check permissions
        if application.applicant != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        activity_type = request.data.get("activity_type")
        meta_data = request.data.get("meta_data", {})
        timestamp = request.data.get("timestamp") or timezone.now().isoformat()
        
        if not activity_type:
            return Response({"error": "activity_type is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        event = {
            "timestamp": timestamp,
            "activity_type": activity_type,
            "meta_data": meta_data,
        }
        
        # Handle camera snapshot
        image_file = request.FILES.get("snapshot")
        if image_file:
            try:
                from core.storage import upload_image
                user_id = str(request.user.id)
                company_name = slugify(application.job.company.name) if application.job.company else "general"
                exam_folder = slugify(application.job.title)
                attempt_dir = "attempt-1"
                ts = str(int(time.time()))
                filename = f"snapshot_{ts}.png"
                object_key = f"{user_id}/job_test/{company_name}/{exam_folder}/{attempt_dir}/{filename}"
                uploaded_path = upload_image(key=object_key, file_obj=image_file)
                event["image_path"] = uploaded_path
            except Exception as e:
                logger.error(f"Error saving job assessment snapshot: {e}")
                
        # Initialize screening_responses structure if needed
        if not isinstance(application.screening_responses, dict):
            application.screening_responses = {}
        if "proctoring_events" not in application.screening_responses:
            application.screening_responses["proctoring_events"] = []
        if "general_events" not in application.screening_responses:
            application.screening_responses["general_events"] = []
            
        proctoring_types = [
            "copy_detected",
            "paste_detected",
            "cut_detected",
            "right_click_detected",
            "keyboard_shortcut",
            "face_not_detected",
            "multiple_faces_detected",
            "face_recognition_failed",
            "suspicious_movement",
            "audio_anomaly",
            "suspicious_activity",
            "device_change",
            "external_monitor",
        ]
        
        is_proctoring = (
            activity_type in proctoring_types
            or activity_type == "snapshot"
            or image_file
        )
        non_violation_types = ["snapshot", "camera_enabled", "camera_disabled"]
        is_violation = is_proctoring and (activity_type not in non_violation_types)
        
        if is_violation:
            application.screening_responses["proctoring_events"].append(event)
        else:
            application.screening_responses["general_events"].append(event)
            
        application.save(update_fields=["screening_responses"])

        # Also update JobTestSubmission and JobTestQuestionActivity
        from assessment.models import JobTestSubmission, JobTestQuestionActivity
        submission = JobTestSubmission.objects.filter(application=application).first()
        if not submission and application.job and hasattr(application.job, 'job_test'):
            submission = JobTestSubmission.objects.filter(user=application.applicant, job_test=application.job.job_test).first()

        if submission:
            if not isinstance(submission.proctoring_events, list):
                submission.proctoring_events = []
            if not isinstance(submission.general_events, list):
                submission.general_events = []
            
            if is_violation:
                submission.proctoring_events.append(event)
            else:
                submission.general_events.append(event)
            submission.save(update_fields=["proctoring_events", "general_events"])

            # Handle question level activity if applicable
            question_id = request.data.get("question_id")
            if question_id:
                try:
                    qa_record = JobTestQuestionActivity.objects.get(
                        job_test_submission=submission, 
                        question_id=question_id
                    )
                    qa_updated = False
                    if activity_type == "snapshot" and image_file:
                        if not isinstance(qa_record.camera_snapshots, list):
                            qa_record.camera_snapshots = []
                        qa_record.camera_snapshots.append(event)
                        qa_updated = True
                    elif activity_type in proctoring_types:
                        if not isinstance(qa_record.proctoring_activities, list):
                            qa_record.proctoring_activities = []
                        qa_record.proctoring_activities.append(event)
                        qa_record.violation_count += 1
                        qa_record.has_violations = True
                        qa_updated = True
                    elif activity_type in ["question_viewed", "question_left", "answer_started", "answer_changed", "answer_submitted"]:
                        # Record as navigation event
                        if not hasattr(qa_record, 'question_activities') or not isinstance(qa_record.question_activities, list):
                            qa_record.question_activities = []
                        qa_record.question_activities.append(event)
                        qa_updated = True
                        
                        if activity_type == 'question_left':
                            last_viewed = next((visit for visit in reversed(qa_record.question_activities) if visit.get('activity_type') == 'question_viewed'), None)
                            if last_viewed:
                                try:
                                    from datetime import datetime
                                    view_time = datetime.fromisoformat(last_viewed['timestamp'].replace('Z', '+00:00'))
                                    leave_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                    duration_seconds = (leave_time - view_time).total_seconds()
                                    if duration_seconds > 0:
                                        qa_record.total_question_time += int(duration_seconds)
                                except Exception as e:
                                    logger.error(f"Error calculating time: {e}")
                        
                    if qa_updated:
                        qa_record.save()
                except JobTestQuestionActivity.DoesNotExist:
                    pass
        
        # Threshold checks removed as per requirement to not auto-submit
            
        tab_switch_count = sum(
            1 for e in application.screening_responses.get("general_events", [])
            if e.get("activity_type") == "tab_switched"
        )
        total_violations = len(application.screening_responses.get("proctoring_events", []))
            
        return Response({
            "status": "logged",
            "scope": "submission",
            "tab_switch_count": tab_switch_count,
            "total_submission_violations": total_violations + tab_switch_count,
            "total_violations": total_violations + tab_switch_count,
            "auto_submitted": False,
            "auto_submit_reason": None,
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def submission(self, request, pk=None):
        application = get_object_or_404(JobApplication, id=pk)
        
        user = request.user
        if not (user.is_staff or (hasattr(user, 'role') and user.role in ['admin', 'recruiter'])) and application.applicant != user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        submission = JobTestSubmission.objects.filter(application=application).first()
        if not submission:
            return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)
            
        from .serializers import JobTestSubmissionSerializer
        serializer = JobTestSubmissionSerializer(submission)
        return Response({"submission": serializer.data})


from rest_framework.views import APIView

class FaceEnrollView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            image_b64 = request.data.get('image', '')
            if not image_b64:
                return Response({"error": "No image provided for enrollment."}, status=status.HTTP_400_BAD_REQUEST)
            
            import base64
            if ',' in image_b64:
                image_b64 = image_b64.split(',')[1]
            image_bytes = base64.b64decode(image_b64)
            
            from assessment.ai_interview.face_verification import enroll_face
            
            res = async_to_sync(enroll_face)(image_bytes)
            return Response(res)
        except Exception as e:
            logger.error(f"Error in general face_enroll: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




