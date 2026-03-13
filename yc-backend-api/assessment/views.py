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

from ai_assistant.models import AIAgent, ChatSession, ChatMessage, InterviewSession, InterviewReport
from authentication.models import Profile
from authentication.permissions import IsOwnerOrInstructorOrAdmin
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    Contest, MockInterview, JobTest, SkillTest,
    ContestSubmission, MockInterviewSubmission, 
    JobTestSubmission, SkillTestSubmission,
    SkillTestQuestionActivity, ContestQuestionActivity, MockInterviewQuestionActivity,
    CertificationExam, CertificationSubmission, CertificationQuestionActivity, Certificate
)
from .mixins import ProctoringMixin, AssessmentMixin, LeaderboardPagination
from .serializers import (
    ContestSerializer, SkillTestSerializer, MockInterviewSerializer,
    SkillTestSubmissionSerializer, ContestSubmissionSerializer,
    MockInterviewSubmissionSerializer,
    CertificationExamSerializer, CertificationSubmissionSerializer
)

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
        
        return Response({
            'submission_id': submission.id,
            'status': submission.status,
            'duration': exam.duration,
            'questions': questions_to_send
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
        question_ids = answers.keys()
        db_questions = Question.objects.filter(id__in=question_ids)
        q_map = {str(q.id): q for q in db_questions}

        for q_id, user_ans in answers.items():
            if q_id not in q_map: continue
            question = q_map[q_id]
            
            is_correct, marks_obtained = question.grade_answer(user_ans)
            
            CertificationQuestionActivity.objects.update_or_create(
                certification_submission=submission,
                question=question,
                user=request.user,
                defaults={
                    'answer_data': {'answer': user_ans},
                    'is_final_answer': True,
                    'is_correct': is_correct,
                    'auto_graded': question.is_auto_gradable
                }
            )
            total_score += marks_obtained
            
        submission.marks = total_score
        submission.save()
        
        # Check for passing and issue certificate
        passed = False
        certificate_id = None
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
            certificate_id = cert.certificate_id
            
        return Response({
            'status': 'submitted',
            'score': total_score,
            'passed': passed,
            'certificate_id': certificate_id
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
        ContestRegistration.objects.create(contest=contest, user=user, created_by=user)

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
        now = timezone.now()

        # Enforce registration before starting
        if not ContestRegistration.objects.filter(contest=contest, user=user).exists():
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
            defaults={'status': ContestSubmission.STATUS_STARTED}
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

        return Response({
            'submission_id': submission.id, 
            'duration': actual_duration,
            'questions': questions_to_send,
            'is_late_entry': submission.is_late_entry
        })

    @action(detail=True, methods=['post'], permission_classes= [permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        contest = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})
        time_spent = request.data.get('time_spent', {})  # {question_id: seconds}

        # Validate submission belongs to THIS contest and this user
        submission = get_object_or_404(ContestSubmission, id=submission_id, user=request.user, contest=contest)

        if submission.status in [ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_EVALUATED]:
            return Response({'error': 'Submission already completed'}, status=status.HTTP_400_BAD_REQUEST)

        submission.answer_data = answers
        submission.status = ContestSubmission.STATUS_SUBMITTED
        submission.submitted_at = timezone.now()
        
        total_score = 0
        question_ids = answers.keys()
        db_questions = Question.objects.filter(id__in=question_ids)
        q_map = {str(q.id): q for q in db_questions}
        
        for q_id, user_ans in answers.items():
            if q_id not in q_map:
                continue
            question = q_map[q_id]
            is_correct, marks_obtained = question.grade_answer(user_ans)
            if is_correct:
                total_score += marks_obtained

            # Create ContestQuestionActivity record for skill gap analysis
            ContestQuestionActivity.objects.update_or_create(
                contest_submission=submission,
                question=question,
                defaults={
                    'user': request.user,
                    'answer_data': user_ans if isinstance(user_ans, dict) else {'answer': user_ans},
                    'is_final_answer': True,
                    'is_correct': is_correct,
                    'marks_obtained': marks_obtained,
                    'auto_graded': True,
                    'total_question_time': time_spent.get(q_id, 0),
                }
            )
                
        submission.marks = total_score
        submission.save()
        
        return Response({'status': 'Submitted', 'score': total_score}, status=status.HTTP_200_OK)

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

        # --- 3. College Breakdown ---
        college_stats = {}
        for sub in submissions:
            profile = getattr(sub.user, 'profile', None)
            college_name = profile.college.name if profile and profile.college else 'Unknown'
            college_id = profile.college.id if profile and profile.college else None
            
            if college_name not in college_stats:
                college_stats[college_name] = {
                    'participants': 0, 
                    'marks_list': [], 
                    'completed': 0,
                    'college_id': college_id
                }
            
            college_stats[college_name]['participants'] += 1
            college_stats[college_name]['marks_list'].append(sub.marks or 0)
            if sub.status in [ContestSubmission.STATUS_COMPLETED, ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_EVALUATED]:
                college_stats[college_name]['completed'] += 1

        college_breakdown = []
        for name, stats in sorted(college_stats.items(), key=lambda x: -(sum(x[1]['marks_list']) / len(x[1]['marks_list']) if x[1]['marks_list'] else 0)):
            marks = stats['marks_list']
            college_breakdown.append({
                'college': name,
                'college_id': str(stats['college_id']) if stats.get('college_id') else None,
                'participants': stats['participants'],
                'avg_marks': round(sum(marks) / len(marks), 1) if marks else 0,
                'max_marks': max(marks) if marks else 0,
                'min_marks': min(marks) if marks else 0,
                'completion_rate': round(stats['completed'] / stats['participants'] * 100, 1) if stats['participants'] > 0 else 0,
            })

        # --- 4. Department Comparison ---
        dept_stats = {}
        for sub in submissions:
            profile = getattr(sub.user, 'profile', None)
            dept_name = profile.department.name if profile and profile.department else 'Unknown'
            
            if dept_name not in dept_stats:
                dept_stats[dept_name] = {'participants': 0, 'marks_list': []}
            
            dept_stats[dept_name]['participants'] += 1
            dept_stats[dept_name]['marks_list'].append(sub.marks or 0)

        department_comparison = []
        for name, stats in sorted(dept_stats.items(), key=lambda x: -(sum(x[1]['marks_list']) / len(x[1]['marks_list']) if x[1]['marks_list'] else 0)):
            marks = stats['marks_list']
            department_comparison.append({
                'department': name,
                'participants': stats['participants'],
                'avg_marks': round(sum(marks) / len(marks), 1) if marks else 0,
                'max_marks': max(marks) if marks else 0,
            })

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

        # --- 6. Integrity Summary ---
        total_violations = 0
        clean_submissions = 0
        for sub in submissions:
            violations = len(sub.proctoring_events) if sub.proctoring_events else 0
            total_violations += violations
            if violations == 0:
                clean_submissions += 1

        integrity = {
            'total_violations': total_violations,
            'clean_submissions': clean_submissions,
            'total_submissions': attempted_count,
            'clean_percentage': round(clean_submissions / attempted_count * 100, 1) if attempted_count > 0 else 100,
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
            submission = ContestSubmission.objects.get(contest=contest, user__id=target_user_id)
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
            # Expected format: {'mcq_single': 10, 'coding': 2}
            
            # Get IDs already selected to avoid duplicates
            existing_ids = [q['id'] for q in questions_to_send]
            
            for q_type, count in skill_test.questions_random_config.items():
                if count > 0:
                    q_filter = Q(type=q_type)
                    
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
                    
        # Shuffle final list
        random.shuffle(questions_to_send)
        
        # 2. Return Response
        return Response({
            'submission_id': submission.id,
            'status': submission.status,
            'duration': skill_test.duration,
            'questions': questions_to_send
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        skill_test = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})
        explanations = request.data.get('explanations', {})
        all_question_ids = request.data.get('all_question_ids', [])

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
            SkillTestQuestionActivity.objects.update_or_create(
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
                    'auto_graded': question.is_auto_gradable
                }
            )
            total_score += marks_obtained
        
        submission.marks = total_score
        submission.save()
        
        return Response({
            'status': 'submitted',
            'score': total_score
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

                # 3. Initialize AI Chat Session
                if mock_interview.ai_generation_mode in [MockInterview.AI_GEN_FULL, MockInterview.AI_GEN_MIXED]:
                    # Find an active AI agent (prefer Claude/Anthropic)
                    ai_agent = AIAgent.objects.filter(is_active=True, provider='anthropic').first()
                    if not ai_agent:
                        # Fallback to Gemini
                        ai_agent = AIAgent.objects.filter(is_active=True, provider='gemini').first()
                        if not ai_agent:
                            # Last resort fallback
                            ai_agent = AIAgent.objects.filter(is_active=True).first()
                    
                    if ai_agent:
                        # Safe user name
                        user_first_name = user.first_name if user.first_name else "Candidate"
                        
                        # Safe extraction of AI Context and Coding Count
                        raw_ai_context = mock_interview.ai_context.get(
                            experience_level.lower(), {}
                        ) if isinstance(mock_interview.ai_context, dict) else mock_interview.ai_context

                        # Backwards compatibility check
                        if isinstance(raw_ai_context, dict):
                            # Try both keys, default to empty list or string accordingly
                            actual_ai_context = raw_ai_context.get('context_str') or raw_ai_context.get('context', [])
                            coding_count = raw_ai_context.get('coding_questions_count', 1)
                        else:
                            # Fallback for legacy flat array format
                            actual_ai_context = raw_ai_context
                            coding_count = 1

                        chat_session = ChatSession.objects.create(
                            user=user,
                            ai_agent=ai_agent,
                            title=f"Mock Interview: {mock_interview.title}",
                            page="mock_interview",
                            context={
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
                        )
                        
                        # Create InterviewSession linking to ChatSession
                        # This is crucial for the AI Assistant module to track it as an interview
                        interview_session = InterviewSession.objects.create(
                            user=user,
                            chat_session=chat_session,
                            role_title=mock_interview.title,
                            role_level=experience_level,
                            difficulty="Adaptive", # Mock interviews are generally adaptive
                            duration_minutes=selected_duration or mock_interview.max_duration,
                            status='started'
                        )

                # 4. Create NEW submission
                submission = MockInterviewSubmission.objects.create(
                    mock_interview=mock_interview,
                    user=user,
                    status=MockInterviewSubmission.STATUS_STARTED,
                    experience_level=experience_level,
                    selected_duration=selected_duration,
                    resume=resume_file,
                    chat_session=chat_session
                )
            else:
                 # Update settings if restarted
                 submission.experience_level = experience_level
                 submission.selected_duration = selected_duration
                 if resume_file: 
                     submission.resume = resume_file
                 submission.save()
                 chat_session = submission.chat_session

                 # Try to get linked interview session
                 try:
                     interview_session = InterviewSession.objects.get(chat_session=chat_session)
                 except InterviewSession.DoesNotExist:
                     # Create it if it was missing (e.g. from old data)
                     interview_session = InterviewSession.objects.create(
                         user=user,
                         chat_session=chat_session,
                         role_title=mock_interview.title,
                         role_level=experience_level,
                         difficulty="Adaptive",
                         duration_minutes=selected_duration or mock_interview.max_duration,
                         status='started'
                     )

            # Extract coding count one more time for frontend response
            raw_ai_context_resp = mock_interview.ai_context.get(
                experience_level.lower(), {}
            ) if isinstance(mock_interview.ai_context, dict) else mock_interview.ai_context
            coding_count_resp = raw_ai_context_resp.get('coding_questions_count', 1) if isinstance(raw_ai_context_resp, dict) else 1

            # 5. Return Response
            return Response({
                'submission_id': submission.id,
                'interview_session_id': interview_session.id if interview_session else None,
                'id': interview_session.id if interview_session else None, # Backwards compatibility for frontend
                'status': submission.status,
                'max_duration': mock_interview.max_duration,
                'selected_duration': submission.selected_duration,
                'experience_level': submission.experience_level,
                'chat_session_id': chat_session.id if chat_session else None,
                'ai_config': {
                    'mode': mock_interview.ai_generation_mode,
                    'coding_count': coding_count_resp,
                    'voice_type': mock_interview.voice_type,
                    'voice_speed': mock_interview.voice_speed,
                    'interviewer_name': mock_interview.interviewer_name,
                    'interviewer_voice_id': mock_interview.interviewer_voice_id
                }
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


