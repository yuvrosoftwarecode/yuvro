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

from .models import (
    Contest, MockInterview, JobTest, SkillTest,
    ContestSubmission, MockInterviewSubmission, 
    JobTestSubmission, SkillTestSubmission,
    SkillTestQuestionActivity, ContestQuestionActivity, MockInterviewQuestionActivity,
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
            existing_ids = [q['id'] for q in questions_to_send]

            for q_type, count in skill_test.questions_random_config.items():
                if count > 0:
                    q_filter = Q(type=q_type)

                    if skill_test.unit:
                        # Scope to questions linked to this unit's sub-units or directly to the unit
                        q_filter &= (Q(sub_unit__unit=skill_test.unit) | Q(unit=skill_test.unit))
                    elif skill_test.subject:
                        q_filter &= Q(subject=skill_test.subject)

                    candidates = list(Question.objects.filter(
                        q_filter
                    ).exclude(id__in=existing_ids).values('id', 'title', 'content', 'type', 'mcq_options', 'marks', 'test_cases_basic'))

                    if len(candidates) >= count:
                        selected = random.sample(candidates, count)
                    else:
                        selected = candidates

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

            marks_obtained = 0
            is_correct = False
            
            # Grading Logic
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
            mock_interview = self.get_object()
            user = request.user

            # Get user settings
            experience_level = request.data.get(
                "experience_level", MockInterviewSubmission.EXP_LEVEL_BEGINNER
            )
            selected_duration = int(request.data.get("selected_duration", 0))
            resume_file = request.FILES.get("resume")

            # 1. Check for existing active submission
            submission = MockInterviewSubmission.objects.filter(
                mock_interview=mock_interview,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
            ).first()

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
                        if hasattr(user, "profile"):
                            profile = user.profile
                            context_text += f"Name: {profile.user.get_full_name()}\n"
                            context_text += f"Title: {profile.title}\n"
                            context_text += f"About: {profile.about}\n"

                            # Skills
                            if hasattr(profile, "skills"):
                                skills = profile.skills.all()
                                if skills.exists():
                                    context_text += "Skills:\n"
                                    for skill in skills:
                                        context_text += (
                                            f"- {skill.name} ({skill.level})\n"
                                        )

                            # Experience
                            if hasattr(profile, "experiences"):
                                experiences = profile.experiences.all()
                                if experiences.exists():
                                    context_text += "Experience:\n"
                                    for exp in experiences:
                                        context_text += f"- {exp.role} at {exp.company} ({exp.duration})\n"

                            # Education
                            if hasattr(profile, "educations"):
                                educations = profile.educations.all()
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
                ai_agent = None
                if mock_interview.ai_generation_mode in [
                    MockInterview.AI_GEN_FULL,
                    MockInterview.AI_GEN_MIXED,
                    MockInterview.AI_GEN_PREDEFINED,
                ]:
                    # Find an active AI agent (prefer Anthropic, then Gemini)
                    ai_agent = AIAgent.objects.filter(
                        is_active=True, provider="anthropic"
                    ).first()
                    if not ai_agent:
                        ai_agent = AIAgent.objects.filter(
                            is_active=True, provider="gemini"
                        ).first()
                    if not ai_agent:
                        ai_agent = AIAgent.objects.filter(is_active=True).first()

                if not ai_agent and mock_interview.ai_generation_mode in [
                    MockInterview.AI_GEN_FULL,
                    MockInterview.AI_GEN_MIXED,
                    MockInterview.AI_GEN_PREDEFINED,
                ]:
                    return Response(
                        {"error": "No active AI agent available for this interview."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

                chat_session = None
                if ai_agent:
                    # Safe user name
                    user_first_name = user.first_name if user.first_name else "Candidate"
                    
                    # Safe extraction of AI Context and Coding Count
                    if isinstance(mock_interview.ai_context, dict):
                        # check if it's the old nested format or new flat format
                        if experience_level.lower() in mock_interview.ai_context:
                            raw_ai_context = mock_interview.ai_context.get(experience_level.lower(), {})
                        else:
                            raw_ai_context = mock_interview.ai_context
                    else:
                        raw_ai_context = mock_interview.ai_context

                    # Backwards compatibility check
                    if isinstance(raw_ai_context, dict):
                        actual_ai_context = raw_ai_context
                        coding_count = raw_ai_context.get('coding_questions_count', 1)
                    else:
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
                            "difficulty": experience_level or "Standard",
                            "level": experience_level or "Standard",
                            "max_duration": mock_interview.max_duration,
                            "selected_duration": selected_duration or mock_interview.max_duration,
                            "required_skills": mock_interview.required_skills,
                            "optional_skills": mock_interview.optional_skills,
                            "interviewer_name": mock_interview.interviewer_name,
                            "interviewer_voice_id": mock_interview.interviewer_voice_id,
                            "voice_speed": mock_interview.voice_speed,
                            "ai_context": actual_ai_context,
                            "coding_questions_count": coding_count,
                            "ai_generation_mode": mock_interview.ai_generation_mode,
                            "candidate_info": context_text
                        }
                    )
                    
                    # Create Interview Session record
                    interview_session = InterviewSession.objects.create(
                        user=user,
                        chat_session=chat_session,
                        role_title=mock_interview.title,
                        role_level=experience_level or "Standard",
                        difficulty="Adaptive",
                        duration_minutes=selected_duration
                        or mock_interview.max_duration,
                        status="started",
                    )

                # 4. Finalize Submission
                submission = MockInterviewSubmission.objects.create(
                    mock_interview=mock_interview,
                    user=user,
                    status=MockInterviewSubmission.STATUS_STARTED,
                    experience_level=experience_level or MockInterviewSubmission.EXP_LEVEL_BEGINNER,
                    chat_session=chat_session,
                    selected_duration=selected_duration or 0,
                    resume=resume_file
                )
            else:
                 # Update settings if restarted
                 submission.experience_level = experience_level or submission.experience_level
                 submission.selected_duration = selected_duration or submission.selected_duration
                 if resume_file: 
                     submission.resume = resume_file
                 submission.save()
                 chat_session = submission.chat_session
                 
                 # Try to get linked interview session
                 try:
                     interview_session = InterviewSession.objects.get(chat_session=chat_session)
                 except InterviewSession.DoesNotExist:
                     interview_session = InterviewSession.objects.create(
                         user=user,
                         chat_session=chat_session,
                         role_title=mock_interview.title,
                         role_level=experience_level or "Standard",
                         difficulty="Adaptive",
                         duration_minutes=selected_duration or mock_interview.max_duration,
                         status='started'
                     )

            # Extract coding count and predefined questions count for response
            if isinstance(mock_interview.ai_context, dict):
                if experience_level.lower() in mock_interview.ai_context:
                    raw_ai_context_resp = mock_interview.ai_context.get(experience_level.lower(), {})
                else:
                    raw_ai_context_resp = mock_interview.ai_context
            else:
                raw_ai_context_resp = mock_interview.ai_context
            
            coding_count_resp = raw_ai_context_resp.get('coding_questions_count', 1) if isinstance(raw_ai_context_resp, dict) else 1
            predefined_questions_count = 0
            if mock_interview.ai_generation_mode == MockInterview.AI_GEN_PREDEFINED and isinstance(raw_ai_context_resp, dict):
                predefined_questions = raw_ai_context_resp.get('predefined_questions', [])
                if isinstance(predefined_questions, list):
                    predefined_questions_count = len(predefined_questions)

            return Response({
                'submission_id': submission.id,
                'interview_session_id': interview_session.id if interview_session else None,
                'id': interview_session.id if interview_session else None, # Backwards compatibility
                'status': submission.status,
                'max_duration': mock_interview.max_duration,
                'selected_duration': submission.selected_duration,
                'experience_level': submission.experience_level,
                'chat_session_id': chat_session.id if chat_session else None,
                'ai_config': {
                    'mode': mock_interview.ai_generation_mode,
                    'coding_count': coding_count_resp,
                    'predefined_questions_count': predefined_questions_count,
                    'voice_type': mock_interview.voice_type,
                    'voice_speed': mock_interview.voice_speed,
                    'interviewer_name': mock_interview.interviewer_name,
                    'interviewer_voice_id': mock_interview.interviewer_voice_id
                }
            })

        except Exception as e:
            logger.error(f"Error starting interview: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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

        return qs

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
        return qs





