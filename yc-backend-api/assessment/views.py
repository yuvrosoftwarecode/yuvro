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

from ai_assistant.models import AIAgent, ChatSession, ChatMessage
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

        # 1. Check if already registered
        existing_submission = ContestSubmission.objects.filter(contest=contest, user=user).first()
        if existing_submission:
            return Response({
                'message': 'Already Registered',
                'is_late_entry': existing_submission.is_late_entry,
                'remaining_time_minutes': None
            }, status=status.HTTP_200_OK)

        # 2. Validate registration window
        is_late_entry = False
        
        if contest.registration_start_datetime and now < contest.registration_start_datetime:
            return Response({'error': 'Registration has not started yet'}, status=status.HTTP_400_BAD_REQUEST)
        
        if contest.registration_end_datetime and now > contest.registration_end_datetime:
            # Registration window closed - check for late entry
            if not contest.allow_late_entry:
                return Response({'error': 'Registration is closed'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if contest is still ongoing
            if now > contest.end_datetime:
                return Response({'error': 'Contest has ended'}, status=status.HTTP_400_BAD_REQUEST)
            
            is_late_entry = True

        # 3. Create submission record with late entry flag
        ContestSubmission.objects.create(
            contest=contest, 
            user=user, 
            status=ContestSubmission.STATUS_STARTED,
            is_late_entry=is_late_entry
        )

        # 4. Calculate remaining time for late entrants
        remaining_time = None
        if is_late_entry:
            remaining_time = int((contest.end_datetime - now).total_seconds() / 60)

        # 5. Send confirmation email
        try:
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

        # 6. Return enhanced response
        return Response({
            'status': 'Registered',
            'is_late_entry': is_late_entry,
            'remaining_time_minutes': remaining_time
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start(self, request, pk=None):
        contest = self.get_object()
        user = request.user
        now = timezone.now()

        submission, created = ContestSubmission.objects.get_or_create(
            contest=contest, 
            user=user,
            defaults={'status': ContestSubmission.STATUS_STARTED}
        )

        contest.update_status()
        if contest.status != Contest.STATUS_ONGOING:
            return Response({'error': 'Contest is not live'}, status=status.HTTP_400_BAD_REQUEST)

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
            is_correct, marks_obtained = question.grade_answer(user_ans)
            if is_correct:
                total_score += marks_obtained
                    
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
                    # Find an active AI agent (prefer Gemini)
                    ai_agent = AIAgent.objects.filter(is_active=True, provider='gemini').first()
                    if not ai_agent:
                        ai_agent = AIAgent.objects.filter(is_active=True).first()
                    
                    if ai_agent:
                        # Safe user name
                        user_first_name = user.first_name if user.first_name else "Candidate"
                        
                        chat_session = ChatSession.objects.create(
                            user=user,
                            ai_agent=ai_agent,
                            title=f"Mock Interview: {mock_interview.title}",
                            page="mock_interview"
                        )
                        
                        # Create System Prompt
                        system_prompt = f"""You are {mock_interview.interviewer_name}, an expert technical interviewer conducting a mock interview.
ROLE & PERSONA:
- You are professional yet conversational. Avoid robotic or standard "textbook" phrasing.
- Speak naturally, like a human interviewer. Use phrases like "That's interesting, tell me more about...", "Let's pivot to...", or "I see, but considering...".
- Do NOT say "Next question" or "Moving on". Transition naturally between topics.

INTERVIEW CONTEXT:
- Title: {mock_interview.title}
- Description: {mock_interview.description}
- Instructions: {mock_interview.instructions}

CANDIDATE INFO:
{context_text}

CRITICAL RULES:
1. NO DEFINITIONAL QUESTIONS: Never ask "What is X?" or "Define Y". These are strictly forbidden.
2. SCENARIO-BASED ONLY: All questions must be practical scenarios or problem-solving challenges.
   - Bad: "What is a deadlock?"
   - Good: "You have two threads waiting on each other's resources, causing the application to freeze. How would you detect this in production and fix it?"
3. ADAPTIVE DIFFICULTY:
   - If the candidate answers well: Increase complexity. Add constraints (e.g., "Now assume we have limited memory", "What if the network is unreliable?").
   - If the candidate struggles: De-escalate. Ask a guiding follow-up or a simpler foundational question to help them regain confidence.
   - If the answer is vague: Ask for specific examples or deeper technical reasoning.
4. FOCUS: Test depth of understanding, not memorization. Ask "Why" and "How", not "What".

START:
Greet {user_first_name} warmly, introduce yourself, and immediately present the first scenario or problem statement based on the interview context and candidate's background.
"""
                        ChatMessage.objects.create(
                            chat_session=chat_session,
                            message_type="system",
                            content=system_prompt
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

            # 5. Return Response
            return Response({
                'submission_id': submission.id,
                'status': submission.status,
                'max_duration': mock_interview.max_duration,
                'selected_duration': submission.selected_duration,
                'experience_level': submission.experience_level,
                'chat_session_id': chat_session.id if chat_session else None,
                'ai_config': {
                    'mode': mock_interview.ai_generation_mode,
                    'verbal_count': mock_interview.ai_verbal_question_count,
                    'coding_count': mock_interview.ai_coding_question_count,
                    'voice_type': mock_interview.voice_type,
                    'voice_speed': mock_interview.voice_speed,
                    'interviewer_name': mock_interview.interviewer_name,
                    'interviewer_voice_id': mock_interview.interviewer_voice_id
                }
            })
        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    


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


