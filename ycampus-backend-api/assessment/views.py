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
import threading

from .models import (
    Contest, MockInterview, JobTest, SkillTest,
    ContestSubmission, MockInterviewSubmission, 
    JobTestSubmission, SkillTestSubmission,
    SkillTestQuestionActivity, ContestQuestionActivity, JobTestQuestionActivity,
    CertificationExam, CertificationSubmission, CertificationQuestionActivity, Certificate
)
from ai_assistant.models import AIAgent, ChatSession, ChatMessage, InterviewSession, InterviewReport
from authentication.models import Profile
from authentication.permissions import IsOwnerOrContentManagerOrAdmin
from .mixins import ProctoringMixin
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
    
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
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
                   candidates = list(Question.objects.filter(
                       type=q_type,
                       course=exam.course
                   ).exclude(id__in=existing_ids).values('id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'))
                   
                   if len(candidates) >= count:
                       selected = random.sample(candidates, count)
                   else:
                       selected = candidates
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
            
            is_correct = False
            marks_obtained = 0
            
            if question.type == 'mcq_single':
                correct_opt = next((opt for opt in question.mcq_options if opt.get('is_correct')), None)
                if correct_opt and user_ans == correct_opt['text']:
                    marks_obtained = question.marks
                    is_correct = True
            elif question.type == 'mcq_multiple':
                 correct_opts = set(opt['text'] for opt in question.mcq_options if opt.get('is_correct'))
                 user_opts = set(user_ans) if isinstance(user_ans, list) else set([user_ans]) if user_ans else set()
                 if correct_opts == user_opts and correct_opts:
                     marks_obtained = question.marks
                     is_correct = True
            
            CertificationQuestionActivity.objects.update_or_create(
                certification_submission=submission,
                question=question,
                user=request.user,
                defaults={
                    'answer_data': {'answer': user_ans},
                    'is_final_answer': True,
                    'is_correct': is_correct,
                    'marks_obtained': marks_obtained,
                    'auto_graded': True
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


class CertificationSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CertificationSubmission.objects.all()
    serializer_class = CertificationSubmissionSerializer
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        exam_id = self.request.query_params.get('exam')
        if exam_id:
            qs = qs.filter(certification_exam_id=exam_id)
        return qs

from course.models import Question
from authentication.permissions import IsOwnerOrContentManagerOrAdmin
from .mixins import ProctoringMixin
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


class ContestViewSet(ProctoringMixin, viewsets.ModelViewSet):
    queryset = Contest.objects.all()
    serializer_class = ContestSerializer
    
    submission_model = ContestSubmission
    question_activity_model = ContestQuestionActivity
    submission_lookup_field = 'contest'
    submission_related_field = 'contest_submission'
    
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
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
            q &= Q(start_date__gte=date_from)
        
        if date_to:
            q &= Q(start_date__lte=date_to)

        if q:
            qs = qs.filter(q)
            
        for obj in qs:
            obj.update_status()
        return qs
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, pk=None):
        contest = self.get_object()
        user = request.user

        if ContestSubmission.objects.filter(contest=contest, user=user).exists():
            return Response({'message': 'Already Registered'}, status=status.HTTP_200_OK)

        ContestSubmission.objects.create(contest=contest, user=user, status=ContestSubmission.STATUS_STARTED)

        try:
            subject = f"Registration Confirmed: {contest.title}"
            message = f"""
        Hello {user.first_name or user.username},

        You have successfully registered for the contest: {contest.title}.

        Start Time: {contest.start_datetime.strftime('%Y-%m-%d %H:%M:%Z')}
        End Time: {contest.end_datetime.strftime('%Y-%m-%d %H:%M:%Z')}
        
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

        return Response({'status': 'Registered'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start(self, request, pk=None):
        contest = self.get_object()
        user = request.user

        submission, created = ContestSubmission.objects.get_or_create(
            contest=contest, 
            user=user,
            defaults={'status': ContestSubmission.STATUS_STARTED}
        )

        contest.update_status()
        if contest.status != Contest.STATUS_ONGOING:
            return Response({'error': 'Contest is not live'}, status=status.HTTP_400_BAD_REQUEST)

        questions_to_send = []

        if contest.questions_config:
            all_ids = []
            for q_type, ids in contest.questions_config.items():
                if isinstance(ids, list):
                    all_ids.extend(ids)

            if all_ids:
                questions_to_send = list(Question.objects.filter(id__in=all_ids).values('id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'))

        if contest.questions_random_config:
            existing_ids = [q['id'] for q in questions_to_send]
            
            for q_type, count in contest.questions_random_config.items():
                if count > 0:
                    candidates = list(Question.objects.filter(
                        type=q_type
                    ).exclude(id__in=existing_ids).values('id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'))
                    
                    if len(candidates) >= count:
                        selected = random.sample(candidates, count)
                    else:
                        selected = candidates
                    
                    questions_to_send.extend(selected)

        random.shuffle(questions_to_send)

        return Response({ 'submission_id': submission.id, 'duration': contest.duration, 'questions': questions_to_send})

    @action(detail=True, methods=['post'], permission_classes= [permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        contest = self.get_object()
        submission_id = request.data.get('submission_id')
        answers = request.data.get('answers', {})

        submission = get_object_or_404(ContestSubmission, id=submission_id, user=request.user)

        if submission.status == ContestSubmission.STATUS_COMPLETED:
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
            
            if question.type == 'mcq_single':
                correct_opt = next((opt for opt in question.mcq_options if opt.get('is_correct')), None)
                if correct_opt and user_ans == correct_opt['text']:
                    total_score += question.marks
            
            elif question.type == 'mcq_multiple':
                correct_opts = set(opt['text'] for opt in question.mcq_options if opt.get('is_correct'))
                user_opts = set(user_ans) if isinstance(user_ans, list) else set([user_ans])
                if correct_opts == user_opts:
                    total_score += question.marks
                    
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

    @action(detail=True, methods=['get'], permission_classes=[IsOwnerOrContentManagerOrAdmin])
    def leaderboard(self, request, pk=None):
        contest = self.get_object()
        
        # 1. Fetch Submissions (Only submitted/completed ones)
        submissions = ContestSubmission.objects.filter(
            contest=contest,
            status__in=[ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED]
        ).select_related('user').order_by('-marks', 'submitted_at')
        
        # 2. Build Leaderboard Data
        leaderboard_data = []
        rank = 1
        
        for sub in submissions:
            leaderboard_data.append({
                'rank': rank,
                'user': f"{sub.user.first_name} {sub.user.last_name}".strip() or sub.user.username,
                'avatar': sub.user.avatar.url if hasattr(sub.user, 'avatar') and sub.user.avatar else None,
                'score': sub.marks,
                'time_taken': str(sub.submitted_at - sub.started_at) if sub.submitted_at and sub.started_at else None,
                'submitted_at': sub.submitted_at
            })
            rank += 1
            
        return Response(leaderboard_data, status=status.HTTP_200_OK)


class SkillTestViewSet(ProctoringMixin, viewsets.ModelViewSet):
    queryset = SkillTest.objects.all()
    serializer_class = SkillTestSerializer
    
    submission_model = SkillTestSubmission
    question_activity_model = SkillTestQuestionActivity
    submission_lookup_field = 'skill_test'
    submission_related_field = 'skill_test_submission'
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    
    search_fields = ['title', 'description']
    ordering_fields = ['created_at']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    def get_queryset(self):
        qs = super().get_queryset()

        # For students, only expose active tests
        user = self.request.user
        if hasattr(user, 'role') and user.role == 'student':
            qs = qs.filter(publish_status='active')

        subject_param = self.request.query_params.get('subject')
        unit_param = self.request.query_params.get('unit')
        difficulty_param = self.request.query_params.get('difficulty')
        test_type_param = self.request.query_params.get('test_type')

        q = Q()
        if subject_param:
            q &= Q(subject=subject_param)

        if unit_param:
            q &= Q(unit=unit_param)

        if difficulty_param:
            q &= Q(difficulty=difficulty_param)

        if test_type_param:
            q &= Q(test_type=test_type_param)

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
            completed_submissions = SkillTestSubmission.objects.filter(
                skill_test=skill_test,
                user=user,
                status=SkillTestSubmission.STATUS_COMPLETED
            ).order_by('-completed_at')
            
            completed_count = completed_submissions.count()

            if completed_count >= skill_test.max_attempts:
                return Response(
                    {'error': f'Maximum attempt limit ({skill_test.max_attempts}) reached for this test.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prevent double-start within 10 seconds
            last_completed = completed_submissions.first()
            if last_completed and last_completed.completed_at:
                if (timezone.now() - last_completed.completed_at).total_seconds() < 10:
                    return Response({'error': 'Please wait before starting another attempt.'}, status=status.HTTP_400_BAD_REQUEST)

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
            existing_ids = [str(q['id']) for q in questions_to_send]

            for q_type, count in skill_test.questions_random_config.items():
                if count > 0:
                    q_filter = Q(type=q_type)

                    if skill_test.unit:
                        # Scope to questions linked to this unit's sub-units or directly to the unit
                        q_filter &= (Q(sub_unit__unit=skill_test.unit) | Q(unit=skill_test.unit))
                    elif skill_test.subject:
                        q_filter &= Q(subject=skill_test.subject)
                    
                    # Strict difficulty filtering
                    if skill_test.difficulty:
                        q_filter &= Q(difficulty=skill_test.difficulty)

                    candidate_ids = list(Question.objects.filter(
                        q_filter
                    ).exclude(id__in=existing_ids).values_list('id', flat=True))

                    if len(candidate_ids) >= count:
                        selected_ids = random.sample(candidate_ids, count)
                    else:
                        selected_ids = candidate_ids

                    selected = list(Question.objects.filter(id__in=selected_ids).values(
                        'id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'
                    ))
                    questions_to_send.extend(selected)
                    existing_ids.extend([str(sid) for sid in selected_ids])
                    
        # Shuffle final list
        random.shuffle(questions_to_send)
        
        # 2. Return Response
        return Response({
            'submission_id': str(submission.id),
            'status': submission.status,
            'duration': skill_test.duration,
            'questions': [{**q, 'id': str(q['id'])} for q in questions_to_send]
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

            marks_obtained = 0
            is_correct = False
            
            # Grading Logic
            if question.type == 'mcq_single':
                correct_opt = next((opt for opt in question.mcq_options if bool(opt.get('is_correct'))), None)
                if correct_opt:
                    opt_val = str(correct_opt.get('text') or correct_opt.get('option_text', '')).strip()
                    if str(user_ans or "").strip() == opt_val:
                        marks_obtained = question.marks
                        is_correct = True
            elif question.type == 'mcq_multiple':
                 correct_opts = set(str(opt.get('text') or opt.get('option_text', '')).strip() for opt in question.mcq_options if bool(opt.get('is_correct')))
                 user_opts = set(str(ans).strip() for ans in (user_ans if isinstance(user_ans, list) else [user_ans] if user_ans else []))
                 if correct_opts == user_opts and correct_opts:
                     marks_obtained = question.marks
                     is_correct = True
            elif question.type == 'coding':
                # For coding, we'll mark as incorrect by default unless manually or auto-graded elsewhere
                # But for now, if there's code, we give 0 or partial? 
                # Let's keep it 0 as it's not auto-graded yet
                marks_obtained = 0
                is_correct = False
            elif question.type == 'descriptive':
                marks_obtained = 0
                is_correct = False

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
                    'auto_graded': True if question.type in ['mcq_single', 'mcq_multiple'] else False
                }
            )
            total_score += marks_obtained
        
        submission.marks = total_score
        submission.save()
        
        return Response({
            'status': 'submitted',
            'score': total_score
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def snapshot(self, request, pk=None):
        skill_test = self.get_object()
        submission_id = request.data.get('submission_id')
        image_data = request.data.get('image') # base64 image or file
        question_id = request.data.get('question_id')
        
        submission = get_object_or_404(
            SkillTestSubmission,
            id=submission_id,
            user=request.user,
            skill_test=skill_test
        )
        
        # Log to activity
        if question_id:
            try:
                activity = SkillTestQuestionActivity.objects.get(
                    skill_test_submission=submission,
                    question_id=question_id
                )
                # Store snapshot in JSON field for now (or file system if configured)
                current_snapshots = activity.camera_snapshots or []
                current_snapshots.append({
                    'timestamp': timezone.now().isoformat(),
                    'image': image_data[:100] + '...', # Don't bloat DB, just log existence for now or handle properly
                    'meta_data': {'type': 'periodic'}
                })
                activity.camera_snapshots = current_snapshots
                activity.save()
            except SkillTestQuestionActivity.DoesNotExist:
                # If no activity yet, maybe skip or create draft
                pass
                
        # Also log to global proctoring events
        current_events = submission.proctoring_events or []
        current_events.append({
            'timestamp': timezone.now().isoformat(),
            'activity_type': 'periodic_snapshot',
            'question_id': question_id
        })
        submission.proctoring_events = current_events
        submission.save()
        
        return Response({'status': 'logged'})

import re

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
    ]
}

class MockInterviewViewSet(viewsets.ModelViewSet):
    queryset = MockInterview.objects.all()
    serializer_class = MockInterviewSerializer
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
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

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def start_interview(self, request, pk=None):
        try:
            user = request.user
            mock_interview = self.get_object()
            experience_level = request.data.get('experience_level', 'Beginner')
            selected_duration = request.data.get('selected_duration')
            resume_file = request.FILES.get('resume')

            # --- 1. PROGRESSION CYCLE LOGIC ---
            from assessment.models import UserInterviewProgress, PredefinedInterviewQuestion
            progress, created = UserInterviewProgress.objects.get_or_create(
                user=user,
                mock_interview=mock_interview
            )

            # Determine if it's a Predefined (0-4) or Master (Full AI, 5) interview
            current_cycle_step = progress.completed_count  # 0 to 5
            is_master = current_cycle_step >= 5
            
            interview_type = "full_ai" if is_master else "predefined"
            
            # --- 2. RESUME EXTRACTION ---
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

            # --- 3. SESSION INITIALIZATION ---
            # We always want a ChatSession even for Predefined to store transcript
            ai_agent = AIAgent.objects.filter(is_active=True).first()
            if not ai_agent:
                return Response({"error": "No active AI agent available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            chat_session = ChatSession.objects.create(
                user=user,
                ai_agent=ai_agent,
                title=f"Mock Interview: {mock_interview.title}",
                page="mock_interview",
                context={
                    "role": mock_interview.title,
                    "difficulty": experience_level,
                    "interview_type": interview_type,
                    "candidate_info": context_text
                }
            )
            
            interview_session = InterviewSession.objects.create(
                user=user,
                chat_session=chat_session,
                role_title=mock_interview.title,
                role_level=experience_level,
                duration_minutes=selected_duration or mock_interview.max_duration,
                status="started"
            )

            submission = MockInterviewSubmission.objects.create(
                mock_interview=mock_interview,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
                experience_level=experience_level,
                chat_session=chat_session,
                interview_type=interview_type,
                selected_duration=selected_duration or 0,
                resume=resume_file
            )

            # --- 4. PREDEFINED SPECIFIC LOGIC ---
            first_question_text = ""
            if interview_type == "predefined":
                # Select 10 random main questions not asked in this cycle
                main_pool = PredefinedInterviewQuestion.objects.filter(
                    mock_interview=mock_interview,
                    level=1
                ).exclude(id__in=progress.asked_questions)
                
                if main_pool.count() < 10:
                    progress.asked_questions = [] # Reset if pool exhausted
                    progress.save()
                    main_pool = PredefinedInterviewQuestion.objects.filter(mock_interview=mock_interview, level=1)
                
                selected_mains = list(main_pool.order_by('?')[:10])
                planned_ids = [str(q.id) for q in selected_mains]
                
                # Initial Greeting
                greeting = f"Hello! I'm your AI interviewer today. We'll be discussing the {mock_interview.title} role. To start, could you please introduce yourself?"
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="assistant",
                    content=greeting
                )
                first_question_text = greeting
                
                # Initialize state_data
                interview_session.state_data = {
                    "current_main_index": -1, # -1 means at greeting
                    "current_node_id": None,
                    "planned_questions": planned_ids
                }
                interview_session.save()
            else:
                # Full AI mode - initial greeting prompt
                initial_prompt = f"The interview for {mock_interview.title} ({experience_level}) is starting. Use the following candidate info for context: {context_text[:1000]}. Please introduce yourself and ask the first question."
                # Note: In Full AI mode, the frontend will call sendMessage as before
                first_question_text = "Preparing your AI interviewer..."

            return Response({
                'submission_id': submission.id,
                'interview_session_id': interview_session.id,
                'chat_session_id': chat_session.id,
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

            from ai_assistant.models import ChatMessage, InterviewSession
            from assessment.models import PredefinedInterviewQuestion

            interview_session = get_object_or_404(InterviewSession, id=interview_session_id)
            chat_session = interview_session.chat_session
            
            # 1. Log user answer if substantial
            if user_answer and user_answer.strip():
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="user",
                    content=user_answer
                )

            # 2. Dialogue State
            state = interview_session.state_data or {}
            planned_questions = state.get('planned_questions', [])
            current_main_index = state.get('current_main_index', -1)
            current_node_id = state.get('current_node_id')

            # 3. Handle Status: Repeat
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

            # 4. Determine Next Node
            next_node = None
            is_new_main_topic = False
            is_skip = (status_code == 'skip')
            
            # --- Step A: Check for children follow-ups if in normal flow ---
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
            
            # --- Step B: Move to next main question if no follow-up found or status is 'skip' ---
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
                    # END OF INTERVIEW
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

            # Add appropriate transition phrase
            transition = ""
            # If current_node_id is None, it means we are transitioning from the initial greeting (self-intro) to the first question
            if current_node_id is None:
                # Try to extract name from user's intro answer
                first_name = request.user.first_name or request.user.username
                if user_answer:
                    # Common intro patterns
                    pattern = r"(?i)\b(?:my name is|i am|i'm|this is|myself)\s+([a-zA-Z]{2,})"
                    match = re.search(pattern, user_answer)
                    if match:
                        extracted = match.group(1).capitalize()
                        stop_words = {'a', 'an', 'the', 'student', 'software', 'developer', 'engineer', 'very', 'really', 'doing', 'working', 'currently', 'also', 'pursuing'}
                        if extracted.lower() not in stop_words:
                            first_name = extracted

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
        # Check if user is admin, content manager (staff), or instructor (if that role exists in user model)
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
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ["user__username", "mock_interview__title"]
    ordering_fields = ["created_at", "updated_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_authenticated:
            if hasattr(user, "role") and user.role == "student":
                qs = qs.filter(user=user)

        interview_id = self.request.query_params.get("mock_interview")
        if interview_id:
            qs = qs.filter(mock_interview_id=interview_id)

        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)

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
            if not asked_ids and instance.chat_session and hasattr(instance.chat_session, 'interview_session'):
                iv_session = instance.chat_session.interview_session
                if instance.interview_type == 'predefined':
                    # Capture both planned questions AND the actually asked ones (including follow-ups)
                    asked_ids = iv_session.state_data.get('asked_in_session', []) or iv_session.state_data.get('planned_questions', [])

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
            if instance.chat_session and hasattr(instance.chat_session, 'interview_session'):
                self._trigger_background_report(instance.chat_session.interview_session)

    def _trigger_background_report(self, interview_session):
        """
        Trigger AI report generation in a background thread to reduce perceived latency.
        """
        from ai_assistant.services import InterviewReportGenerator
        from asgiref.sync import async_to_sync
        
        def generate():
            try:
                logger.info(f"Starting background report generation for session {interview_session.id}")
                generator = InterviewReportGenerator(interview_session)
                # Use async_to_sync because generate_report is async
                async_to_sync(generator.generate_report)()
                logger.info(f"Background report generation successfully finished for session {interview_session.id}")
            except Exception as e:
                logger.error(f"Background report generation failed: {str(e)}")
                logger.error(traceback.format_exc())
                
        thread = threading.Thread(target=generate)
        thread.daemon = True
        thread.start()

    @action(detail=True, methods=["get"])
    def report(self, request, pk=None):
        submission = self.get_object()
        if (
            not submission.chat_session
            or not hasattr(submission.chat_session, "interview_session")
        ):
            return Response(
                {"error": "No interview session associated"},
                status=status.HTTP_404_NOT_FOUND,
            )

        interview_session = submission.chat_session.interview_session
        if not hasattr(interview_session, "report"):
            return Response(
                {"error": "Report not yet generated"}, status=status.HTTP_404_NOT_FOUND
            )

        from ai_assistant.serializers import InterviewReportSerializer

        serializer = InterviewReportSerializer(interview_session.report)
        return Response(serializer.data)

    


class SkillTestSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkillTestSubmission.objects.all()
    serializer_class = SkillTestSubmissionSerializer
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'marks']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Students can only see their own submissions
        if hasattr(user, 'role') and user.role == 'student':
            qs = qs.filter(user=user)

        skill_test_id = self.request.query_params.get('skill_test')
        if skill_test_id:
            qs = qs.filter(skill_test_id=skill_test_id)

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs


class CertificationSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CertificationSubmission.objects.all()
    serializer_class = CertificationSubmissionSerializer
    permission_classes = [IsOwnerOrContentManagerOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'marks']
    
    def get_queryset(self):
        qs = super().get_queryset()
        exam_id = self.request.query_params.get('certification_exam')
        if exam_id:
            qs = qs.filter(certification_exam_id=exam_id)

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs




