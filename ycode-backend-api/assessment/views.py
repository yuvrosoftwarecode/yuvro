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
from pypdf import PdfReader # type: ignore
from io import BytesIO
import traceback
import logging

from authentication.models import Profile
from authentication.permissions import IsOwnerOrInstructorOrAdmin
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    SkillTest, SkillTestSubmission, SkillTestQuestionActivity,
    Contest, ContestRegistration, ContestSubmission, ContestQuestionActivity,
    JobTest, JobTestSubmission, JobTestQuestionActivity,
    CertificationExam, CertificationSubmission, CertificationQuestionActivity, Certificate,
    MockInterview, MockInterviewSubmission, MockInterviewQuestionActivity
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


def has_active_submission(user, excluding_model=None, excluding_assessment_field=None, excluding_assessment_id=None):
    """
    Checks if the user has any active test, assessment, or mock interview submission.
    Returns the active submission object if found, otherwise None.
    If excluding_model is provided, we ignore the active submission of that model 
    if it matches the excluding_assessment_field with excluding_assessment_id.
    """
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
                # start_datetime__lte=now,
                # end_datetime__gte=now
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

        # Check active submission
        submission = CertificationSubmission.objects.filter(
            certification_exam=exam,
            user=user,
            status=CertificationSubmission.STATUS_STARTED
        ).first()

        if not submission:
            # Check max attempts
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
        # Reuse logic from SkillTest for questions... or simpler if only fixed config
        # Assuming Certification also uses questions_config / random_config
        
        if exam.questions_config:
            all_ids = []
            for q_type, ids in exam.questions_config.items():
                if isinstance(ids, list):
                    all_ids.extend(ids)
            if all_ids:
                 questions_to_send = list(Question.objects.filter(id__in=all_ids).values(
                    'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                ))
        
        # Random config logic
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
        
        total_violations, tab_switch_count = self._get_submission_stats(submission)
        
        return Response({
            'submission_id': submission.id,
            'status': submission.status,
            'duration': exam.duration,
            'questions': questions_to_send,
            # Uniform proctoring config
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
        
        # Calculate score (reusing simplified logic for now)
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
            # Check for hints/solutions/AI usage penalty
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
            
            # Apply 0-score penalty if any assistance was used
            if activity.used_hint or activity.viewed_solution or activity.ai_help_count > 0:
                marks_obtained = 0
                activity.marks_obtained = 0
                activity.save(update_fields=['marks_obtained'])

            total_score += marks_obtained
            
        submission.marks = total_score
        submission.save()
        
        # Check for passing and issue certificate
        passed = False
        certificate_id = None
        certificate_url = None
        if total_score >= exam.passing_marks:
            passed = True
            # Check if certificate already exists
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

        # --- Gamification: record activity for certification submission ---
        gamification = {}
        try:
            from gamification.service import GamificationService
            gamification = GamificationService.record_activity(request.user, 'quiz')
        except Exception:
            pass  # Gamification should never break assessment flow
            
        # Trigger async face verification
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


from course.models import Question
from django.core.mail import send_mail
from django.conf import settings

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
        
        # Bulk update statuses efficiently using database annotations
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

        # 0. Check contest is published and not ended
        if contest.publish_status != 'active':
            return Response({'error': 'This contest is not yet published.'}, status=status.HTTP_400_BAD_REQUEST)
        if contest.end_datetime and now > contest.end_datetime:
            return Response({'error': 'This contest has already ended.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Profile Validation
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

        # 2. Check if already registered
        if ContestRegistration.objects.filter(contest=contest, user=user).exists():
            return Response({'message': 'Already Registered'}, status=status.HTTP_200_OK)

        # 3. Validate registration window
        is_late_entry = False
        
        if contest.registration_start_datetime and now < contest.registration_start_datetime:
            return Response({'error': 'Registration has not started yet'}, status=status.HTTP_400_BAD_REQUEST)
        
        if contest.registration_end_datetime and now > contest.registration_end_datetime:
            if not contest.allow_late_entry:
                return Response({'error': 'Registration is closed'}, status=status.HTTP_400_BAD_REQUEST)
            if now > contest.end_datetime:
                return Response({'error': 'Contest has ended'}, status=status.HTTP_400_BAD_REQUEST)
            is_late_entry = True

        # 4. Create registration record
        ContestRegistration.objects.create(contest=contest, user=user, created_by=user, is_late_entry=is_late_entry)

        # 5. Send confirmation email
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

        # Enforce registration before starting
        registration = ContestRegistration.objects.filter(contest=contest, user=user).first()
        if not registration:
            return Response(
                {'error': 'You must register for this contest before starting it.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check contest is live BEFORE creating submission (avoid orphans)
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

        # Block re-entry after submission
        if submission.status in [ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_EVALUATED]:
            return Response({'error': 'You have already submitted this contest.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate actual duration based on late entry status
        if submission.is_late_entry:
            # For late entrants, give them remaining time (but not more than contest duration)
            remaining_seconds = (contest.end_datetime - now).total_seconds()
            actual_duration = min(int(remaining_seconds / 60), contest.duration)
        else:
            actual_duration = contest.duration

        # Use shared helper for question fetching
        questions_to_send = self._fetch_questions_for_assessment(contest)

        total_violations, tab_switch_count = self._get_submission_stats(submission)

        return Response({
            'submission_id': submission.id, 
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

    @action(detail=True, methods=['post'], permission_classes= [permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        contest = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})
        time_spent = request.data.get('time_spent', {}) or {}
        if not isinstance(time_spent, dict):
            time_spent = {}

        # Validate submission belongs to THIS contest and this user
        submission = get_object_or_404(ContestSubmission, id=submission_id, user=request.user, contest=contest)

        if submission.status in [ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_EVALUATED]:
            return Response({'error': 'Submission already completed'}, status=status.HTTP_400_BAD_REQUEST)

        # Build the set of valid question IDs for this contest
        valid_question_ids = set()
        if contest.questions_config:
            for ids in contest.questions_config.values():
                if isinstance(ids, list):
                    valid_question_ids.update(str(i) for i in ids)
        # Also include any questions that were served via random config (already in ContestQuestionActivity)
        existing_activity_ids = set(
            ContestQuestionActivity.objects.filter(contest_submission=submission)
            .values_list('question_id', flat=True)
        )
        valid_question_ids.update(str(i) for i in existing_activity_ids)

        submission.answer_data = answers
        submission.status = ContestSubmission.STATUS_SUBMITTED
        submission.submitted_at = timezone.now()
        
        total_score = 0
        # Only process answers for questions that belong to this contest
        filtered_answers = {q_id: ans for q_id, ans in answers.items() if q_id in valid_question_ids}
        db_questions = Question.objects.filter(id__in=filtered_answers.keys())
        q_map = {str(q.id): q for q in db_questions}
        
        for q_id, user_ans in filtered_answers.items():
            if q_id not in q_map:
                continue
            question = q_map[q_id]
            is_correct, marks_obtained = question.grade_answer(user_ans)
            # Check for hints/solutions/AI usage penalty
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

            # Apply 0-score penalty if any assistance was used
            if activity.used_hint or activity.viewed_solution or activity.ai_help_count > 0:
                marks_obtained = 0
                activity.marks_obtained = 0
                activity.save(update_fields=['marks_obtained'])

            if is_correct:
                total_score += marks_obtained
                
        submission.marks = total_score
        submission.save()

        # --- Gamification: record activity for contest submission ---
        gamification = {}
        try:
            from gamification.service import GamificationService
            # Count correctly solved coding problems for separate credit
            coding_correct = sum(
                1 for q_id, ans in filtered_answers.items()
                if q_id in q_map and q_map[q_id].type == 'coding'
                and q_map[q_id].grade_answer(ans)[0]
            )
            for _ in range(coding_correct):
                GamificationService.record_activity(request.user, 'coding')
            # Record overall quiz activity for the submission itself
            gamification = GamificationService.record_activity(request.user, 'quiz')
        except Exception:
            pass  # Gamification should never break assessment flow
        
        # Trigger async face verification
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
        
        # 1. Fetch Submissions (Only submitted/completed ones)
        submissions = ContestSubmission.objects.filter(
            contest=contest,
            status__in=[ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED]
        ).select_related('user').order_by('-marks', 'submitted_at')
        
        # 2. Apply Pagination
        paginator = LeaderboardPagination()
        page = paginator.paginate_queryset(submissions, request)
        
        # Calculate starting rank based on page offset
        page_size = paginator.page_size
        page_number = request.query_params.get(paginator.page_query_param, 1)
        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1
        start_rank = (page_number - 1) * page_size + 1
        
        # 3. Build Leaderboard Data
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

        # --- 1. Contest Summary ---
        registrations = ContestRegistration.objects.filter(contest=contest)
        # Include ALL non-cancelled submissions (started, in_progress, submitted, completed, evaluated)
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

        # --- 2. Top Performers ---
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

        # --- 3. College Breakdown (DB aggregation) ---
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

        # --- 4. Department Comparison (DB aggregation) ---
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

        # --- 5. Question Performance (Skill Gap Analysis) ---
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

        # Sort by correct_percentage ascending (weakest first = skill gaps)
        question_performance.sort(key=lambda x: x['correct_percentage'])

        # --- 6. Integrity Summary (use ContestQuestionActivity.violation_count — consistent with analytics_service) ---
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

                # Check if AI insights should be included
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
        
        # Check if admin/instructor is requesting another user's analytics
        target_user_id = request.query_params.get('user_id')
        
        if target_user_id:
            # Only admins/instructors can view other users' analytics
            if not (user.is_staff or user.role in ['admin', 'instructor']):
                return Response(
                    {"error": "You don't have permission to view other users' analytics"},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_user_id = target_user_id
        else:
            # Regular student viewing their own analytics
            target_user_id = str(user.id)

        # Check if student has participated in this contest
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
        
        # Only admins/instructors can view college analytics
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
            
            # Check if AI insights should be included
            include_ai = request.query_params.get('include_ai_insights', 'false').lower() == 'true'
            
            if include_ai:
                try:
                    # Generate AI insights for college
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

        # Only admins/instructors can view college contest participation
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

        # Find all contests where students from this college have participated
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

        # 1. Check for existing UNFINISHED submission to resume
        submission = SkillTestSubmission.objects.filter(
            skill_test=skill_test,
            user=user,
            status=SkillTestSubmission.STATUS_STARTED
        ).first()

        if not submission:
            # 2. Check total completed attempts
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

            # 3. Create NEW submission
            submission = SkillTestSubmission.objects.create(
                skill_test=skill_test,
                user=user,
                status=SkillTestSubmission.STATUS_STARTED
            )
        
        # 1. Resolve Questions
        questions_to_send = []
        
        # Option A: Fixed Configuration
        if skill_test.questions_config:
            # Expected format: {'mcq_single': [id1, id2], ...}
            all_ids = []
            for q_type, ids in skill_test.questions_config.items():
                if isinstance(ids, list):
                    all_ids.extend(ids)
            
            if all_ids:
                questions_to_send = list(Question.objects.filter(id__in=all_ids).values(
                    'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                ))
        
        # Option B: Random Configuration (Additive)
        if skill_test.questions_random_config:
            # Expected format: {'mcq_single': 10, 'coding': 2} or {'mcq_single': {'easy': 2, 'medium': 3, 'hard': 0}}
            
            # Get IDs already selected to avoid duplicates
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
                            # Include questions linked to subtopics of this topic OR directly to the topic
                            q_filter &= (Q(subtopic__topic=skill_test.topic) | Q(topic=skill_test.topic))
                        elif skill_test.course:
                            q_filter &= Q(course=skill_test.course)
                            
                        # Fetch candidate questions directly with randomization limit in DBMS
                        selected = list(Question.objects.filter(
                            q_filter
                        ).exclude(id__in=existing_ids).order_by('?')[:count].values(
                            'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                        ))
                        
                        questions_to_send.extend(selected)
                        existing_ids.extend([q['id'] for q in selected])
                    
        # Shuffle final list
        random.shuffle(questions_to_send)
        
        total_violations, tab_switch_count = self._get_submission_stats(submission)

        # 2. Return Response
        return Response({
            'submission_id': submission.id,
            'status': submission.status,
            'duration': skill_test.duration,
            'questions': questions_to_send,
            # Uniform proctoring config
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
        
        # Merge all_question_ids with answers.keys() to ensure we process everything
        question_ids = list(set(list(answers.keys()) + all_question_ids))

        if submission.status == SkillTestSubmission.STATUS_COMPLETED:
             return Response({'error': 'Already submitted'}, status=status.HTTP_400_BAD_REQUEST)

        submission.status = SkillTestSubmission.STATUS_COMPLETED
        submission.submitted_at = timezone.now()
        submission.completed_at = timezone.now()
        submission.answer_data = answers
        
        total_score = 0
        
        # Process each answer and create activities
        for q_id in question_ids:
            user_ans = answers.get(q_id)
            try:
                question = Question.objects.get(id=q_id)
            except Question.DoesNotExist:
                continue

            is_correct, marks_obtained = question.grade_answer(user_ans)

            # Create or update activity
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
            
            # Apply 0-score penalty if any assistance was used
            if activity.used_hint or activity.viewed_solution or activity.ai_help_count > 0:
                marks_obtained = 0
                activity.marks_obtained = 0
                activity.save(update_fields=['marks_obtained'])

            total_score += marks_obtained
        
        submission.marks = total_score
        submission.save()

        # --- Gamification: record activity for skill test submission ---
        gamification = {}
        try:
            from gamification.service import GamificationService
            # Count correctly solved coding problems for separate credit
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
            # Record overall quiz activity for the submission itself
            gamification = GamificationService.record_activity(request.user, 'quiz')
        except Exception:
            pass  # Gamification should never break assessment flow
            
        # Trigger async face verification
        if skill_test.enable_proctoring:
            run_async_face_verification(SkillTestSubmission, submission.id)
        
        return Response({
            'status': 'submitted',
            'score': total_score,
            'gamification': gamification,
        })

class MockInterviewViewSet(viewsets.ModelViewSet):
    queryset = MockInterview.objects.all()
    serializer_class = MockInterviewSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        publish_status_param = self.request.query_params.get('publish_status')
        ai_mode_param = self.request.query_params.get('ai_generation_mode')

        q = Q()
        if publish_status_param:
            q &= Q(publish_status=publish_status_param)

        if ai_mode_param:
            q &= Q(ai_generation_mode=ai_mode_param)

        if q:
            qs = qs.filter(q)

        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start_interview(self, request, pk=None):
        try:
            mock_interview = self.get_object()
            user = request.user

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
            
            # Get user settings
            experience_level = request.data.get('experience_level', MockInterviewSubmission.EXP_LEVEL_BEGINNER)
            selected_duration = request.data.get('selected_duration', 0)
            resume_file = request.FILES.get('resume')
            
            # 1. Check for existing active submission
            submission = MockInterviewSubmission.objects.filter(
                mock_interview=mock_interview,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED
            ).first()

            chat_session = None

            if not submission:
                # 2. Handle Resume / Context Extraction
                context_text = ""
                
                if resume_file:
                    try:
                        # Parse PDF
                        reader = PdfReader(resume_file)
                        for page in reader.pages:
                            text = page.extract_text()
                            if text:
                                context_text += text + "\n"
                    except Exception as e:
                        logger.warning(f"Error parsing resume: {e}")
                
                # If no resume text, fetch profile data
                if not context_text.strip():
                    try:
                        # Handle potential Profile.DoesNotExist
                        if hasattr(user, 'profile'):
                            profile = user.profile
                            context_text += f"Name: {profile.full_name}\n"
                            context_text += f"Title: {profile.title}\n"
                            context_text += f"About: {profile.about}\n"
                            
                            # Skills
                            skills = profile.skills.all()
                            if skills.exists():
                                context_text += "Skills:\n"
                                for skill in skills:
                                    context_text += f"- {skill.name} ({skill.level})\n"
                                    
                            # Experience
                            experiences = profile.experiences.all()
                            if experiences.exists():
                                context_text += "Experience:\n"
                                for exp in experiences:
                                    context_text += f"- {exp.role} at {exp.company} ({exp.duration})\n"
                                    
                            # Education
                            educations = profile.education.all()
                            if educations.exists():
                                context_text += "Education:\n"
                                for edu in educations:
                                    context_text += f"- {edu.degree} in {edu.field} from {edu.institution}\n"
                    except Exception as e:
                        logger.warning(f"Error fetching profile: {e}")
                
                # If still empty, use fallback
                if not context_text.strip():
                    context_text = "No resume or profile information provided. Please ask general questions relevant to the position."

                # 3. Initialize AI Chat Session directly on YHub
                chat_session_id = None
                interview_session_id = None

                if mock_interview.ai_generation_mode in [MockInterview.AI_GEN_FULL, MockInterview.AI_GEN_MIXED]:
                    # Safe extraction of AI Context and Coding Count
                    raw_ai_context = mock_interview.ai_context.get(
                        experience_level.lower(), {}
                    ) if isinstance(mock_interview.ai_context, dict) else mock_interview.ai_context

                    # Backwards compatibility check
                    if isinstance(raw_ai_context, dict):
                        actual_ai_context = raw_ai_context.get('context_str') or raw_ai_context.get('context', [])
                        coding_count = raw_ai_context.get('coding_questions_count', 1)
                    else:
                        actual_ai_context = raw_ai_context
                        coding_count = 1

                    try:
                        import requests
                        yhub_url = "http://yhub-backend:8000/api/sessions/create_from_ycode/"
                        auth_header = request.headers.get("Authorization")
                        headers = {}
                        if auth_header:
                            headers["Authorization"] = auth_header
                        
                        context_payload = {
                            "role": mock_interview.title,
                            "description": mock_interview.description,
                            "instructions": mock_interview.instructions,
                            "difficulty": experience_level,
                            "level": experience_level,
                            "max_duration": mock_interview.max_duration,
                            "selected_duration": selected_duration,
                            "required_skills": mock_interview.required_skills,
                            "optional_skills": mock_interview.optional_skills,
                            "interviewer_name": mock_interview.interviewer_name,
                            "interviewer_voice_id": mock_interview.interviewer_voice_id,
                            "voice_speed": mock_interview.voice_speed,
                            "ai_context": actual_ai_context,
                            "coding_questions_count": coding_count,
                            "candidate_info": context_text
                        }

                        payload = {
                            "ai_agent_provider": "gemini",
                            "ai_agent_model_name": "gemini-2.5-flash",
                            "title": f"Mock Interview: {mock_interview.title}",
                            "page": "mock_interview",
                            "context": context_payload,
                            "interview_session": {
                                "role_title": mock_interview.title,
                                "role_level": experience_level,
                                "difficulty": "Adaptive",
                                "duration_minutes": selected_duration or mock_interview.max_duration,
                                "status": "started"
                            }
                        }

                        resp = requests.post(yhub_url, json=payload, headers=headers, timeout=10)
                        if resp.status_code == 201:
                            resp_data = resp.json()
                            chat_session_id = resp_data.get("id")
                            interview_session_id = resp_data.get("interview_session_id")
                        else:
                            raise Exception(f"Failed to create session on YHub: {resp.text}")
                    except Exception as e:
                        logger.error(f"Error calling YHub to create session: {e}")
                        raise Exception(f"Failed to connect to AI server: {str(e)}")

                # 4. Create NEW submission
                submission = MockInterviewSubmission.objects.create(
                    mock_interview=mock_interview,
                    user=user,
                    status=MockInterviewSubmission.STATUS_STARTED,
                    experience_level=experience_level,
                    selected_duration=selected_duration,
                    resume=resume_file,
                    chat_session_id=chat_session_id
                )
            else:
                 # Update settings if restarted
                 submission.experience_level = experience_level
                 submission.selected_duration = selected_duration
                 if resume_file: 
                     submission.resume = resume_file
                 submission.save()
                 
                 chat_session_id = submission.chat_session_id
                 if chat_session_id:
                     # Fetch existing interview_session_id from YHub
                     try:
                         import requests
                         yhub_url = f"http://yhub-backend:8000/api/sessions/{chat_session_id}/"
                         auth_header = request.headers.get("Authorization")
                         headers = {}
                         if auth_header:
                             headers["Authorization"] = auth_header
                         
                         resp = requests.get(yhub_url, headers=headers, timeout=5)
                         if resp.status_code == 200:
                             resp_data = resp.json()
                             interview_session_id = resp_data.get("interview_session_id")
                     except Exception as e:
                         logger.error(f"Error fetching existing session from YHub: {e}")

            # Extract coding count one more time for frontend response
            raw_ai_context_resp = mock_interview.ai_context.get(
                experience_level.lower(), {}
            ) if isinstance(mock_interview.ai_context, dict) else mock_interview.ai_context
            coding_count_resp = raw_ai_context_resp.get('coding_questions_count', 1) if isinstance(raw_ai_context_resp, dict) else 1

            # 5. Return Response
            return Response({
                'submission_id': submission.id,
                'interview_session_id': interview_session_id,
                'id': interview_session_id, # Backwards compatibility for frontend
                'status': submission.status,
                'max_duration': mock_interview.max_duration,
                'selected_duration': submission.selected_duration,
                'experience_level': submission.experience_level,
                'chat_session_id': chat_session_id,
                'ai_config': {
                    'mode': mock_interview.ai_generation_mode,
                    'coding_count': coding_count_resp,
                    'voice_type': mock_interview.voice_type,
                    'voice_speed': mock_interview.voice_speed,
                    'interviewer_name': mock_interview.interviewer_name,
                    'interviewer_voice_id': mock_interview.interviewer_voice_id
                },
                # Uniform proctoring config
                'enable_proctoring': mock_interview.enable_proctoring,
                'tab_switch_threshold': getattr(mock_interview, 'tab_switch_threshold', 3),
                'violation_threshold': getattr(mock_interview, 'violation_threshold', 5),
            })
        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def submissions(self, request, pk=None):
        mock_interview = self.get_object()
        user = request.user
        
        qs = MockInterviewSubmission.objects.filter(mock_interview=mock_interview)
        if not (user.is_staff or (hasattr(user, 'role') and user.role in ['admin', 'instructor'])):
            qs = qs.filter(user=user)
            
        # We need the serializer, but it might be imported as MockInterviewSubmissionSerializer
        from .serializers import MockInterviewSubmissionSerializer
        serializer = MockInterviewSubmissionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_interviews(self, request):
        user = request.user
        qs = MockInterviewSubmission.objects.filter(user=user).order_by('-created_at')
        
        from .serializers import MockInterviewSubmissionSerializer
        serializer = MockInterviewSubmissionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def complete_submission(self, request):
        """Internal endpoint to complete a mock interview submission."""
        chat_session_id = request.data.get("chat_session_id")
        if not chat_session_id:
            return Response({"error": "Missing chat_session_id"}, status=status.HTTP_400_BAD_REQUEST)
            
        submission = MockInterviewSubmission.objects.filter(chat_session_id=chat_session_id).first()
        if submission:
            submission.status = MockInterviewSubmission.STATUS_COMPLETED
            submission.completed_at = timezone.now()
            submission.save()
            return Response({"status": "completed"}, status=status.HTTP_200_OK)
            
        return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)


    



class MockInterviewSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MockInterviewSubmission.objects.all()
    serializer_class = MockInterviewSubmissionSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'marks']
    
    def get_queryset(self):
        qs = super().get_queryset()
        mock_interview_id = self.request.query_params.get('mock_interview')
        if mock_interview_id:
            qs = qs.filter(mock_interview_id=mock_interview_id)
        
        # Filter by user if not instructor/admin
        if not (self.request.user.is_staff or (hasattr(self.request.user, 'role') and self.request.user.role in ['admin', 'instructor'])):
            qs = qs.filter(user=self.request.user)
            
        return qs

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



