from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
import os
import requests
from django.db.models import (
    Count, Q, F, Case, When, Value, IntegerField, FloatField, 
    OuterRef, Subquery, Sum, Exists
)
from django.db.models.functions import Coalesce
from authentication.permissions import CanManageCourses, IsAuthenticatedUser
from .utils import CodeExecutionUtil
from .gamification_service import GamificationService
from .gamification_models import UserGamificationProfile, DailyUserActivity
from .models import (
    Course,
    Topic,
    Subtopic,
    Video,
    Note,
    CourseInstructor,
    Question,
    UserCourseProgress,
    StudentCodePractice,
)
from .serializers import (
    CourseSerializer,
    CourseBasicSerializer,
    TopicSerializer,
    TopicBasicSerializer,
    SubtopicSerializer,
    VideoSerializer,
    NoteSerializer,
    QuestionSerializer,
    StudentCodePracticeSerializer,
)
from django.contrib.auth import get_user_model

User = get_user_model()


def instructor_assigned(user, course):
    return CourseInstructor.objects.filter(instructor=user, course=course).exists()


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    permission_classes = [CanManageCourses]

    def get_serializer_class(self):
        return CourseSerializer if self.action == "retrieve" else CourseBasicSerializer

    def get_queryset(self):
        queryset = Course.objects.all()
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        practice_questions_filter = Q(type='coding') & Q(categories__contains=['practice'])
        
        queryset = queryset.annotate(
            total_problems=Count(
                'questions', 
                filter=Q(questions__type='coding') & Q(questions__categories__contains=['practice']), 
                distinct=True
            ) + Count(
                'topics__questions',
                filter=Q(topics__questions__type='coding') & Q(topics__questions__categories__contains=['practice']),
                distinct=True
            ) + Count(
                'topics__subtopics__questions',
                filter=Q(topics__subtopics__questions__type='coding') & Q(topics__subtopics__questions__categories__contains=['practice']),
                distinct=True
            )
        )

        if self.request.user.is_authenticated:
            solved_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                course=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice']
            ).values('course').annotate(cnt=Count('id')).values('cnt')
            
            score_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                course=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice']
            ).values('course').annotate(total_valid_score=Sum('marks_obtained')).values('total_valid_score')

            ai_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                course=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice']
            ).values('course').annotate(total_ai=Sum('ai_help_count')).values('total_ai')

            queryset = queryset.annotate(
                solved_problems=Coalesce(Subquery(solved_subquery), 0, output_field=IntegerField()),
                total_score=Coalesce(Subquery(score_subquery), 0.0, output_field=FloatField()),
                ai_help_used=Coalesce(Subquery(ai_subquery), 0, output_field=IntegerField())
            )
        else:
            queryset = queryset.annotate(
                solved_problems=Value(0, output_field=IntegerField()),
                total_score=Value(0.0, output_field=FloatField()),
                ai_help_used=Value(0, output_field=IntegerField())
            )

        
        queryset = queryset.annotate(
            progress_percentage=Case(
                When(total_problems__gt=0, then=F('solved_problems') * 100.0 / F('total_problems')),
                default=0.0,
                output_field=FloatField()
            )
        )

        return queryset

    @action(detail=True, methods=["get"])
    def instructors(self, request, pk=None):
        course = self.get_object()
        instructors = course.instructors.all()
        return Response(
            [
                {"id": str(u.id), "name": u.username, "email": u.email}
                for u in instructors
            ]
        )

    @action(detail=True, methods=["post"])
    def add_instructor(self, request, pk=None):
        course = self.get_object()
        instructor_id = request.data.get("instructor_id")

        if not instructor_id:
            return Response({"error": "instructor_id is required"}, status=400)

        instructor = get_object_or_404(User, id=instructor_id)

        try:
            CourseInstructor.objects.create(course=course, instructor=instructor)
        except IntegrityError:
            return Response({"error": "Instructor already assigned"}, status=400)

        return Response({"message": "Instructor assigned successfully"})

    @action(detail=True, methods=["post"])
    def remove_instructor(self, request, pk=None):
        course = self.get_object()
        instructor_id = request.data.get("instructor_id")
        mapping = CourseInstructor.objects.filter(
            course=course, instructor_id=instructor_id
        ).first()

        if not mapping:
            return Response({"error": "Instructor not assigned"}, status=400)

        mapping.delete()
        return Response({"message": "Removed successfully"})

    def update(self, request, *a, **kw):
        kw["partial"] = True
        return super().update(request, *a, **kw)


class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.select_related("course")
    permission_classes = [IsAuthenticatedUser]

    def get_serializer_class(self):
        return TopicSerializer if self.action == "retrieve" else TopicBasicSerializer

    def get_queryset(self):
        qs = Topic.objects.select_related("course")
        user = self.request.user

        if user.role == "instructor":
            assigned_ids = CourseInstructor.objects.filter(instructor=user).values_list(
                "course_id", flat=True
            )
            qs = qs.filter(course_id__in=assigned_ids)

        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)

        
        qs = qs.annotate(
            total_problems=Count(
                'questions', 
                filter=Q(questions__type='coding') & Q(questions__categories__contains=['practice']), 
                distinct=True
            ) + Count(
                'subtopics__questions',
                filter=Q(subtopics__questions__type='coding') & Q(subtopics__questions__categories__contains=['practice']),
                distinct=True
            )
        )

        
        if self.request.user.is_authenticated:
            solved_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                topic=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice']
            ).values('topic').annotate(cnt=Count('id')).values('cnt')
            
            qs = qs.annotate(
                solved_problems=Coalesce(Subquery(solved_subquery), 0, output_field=IntegerField())
            )
        else:
            qs = qs.annotate(solved_problems=Value(0, output_field=IntegerField()))
            
        
        qs = qs.annotate(
            progress_percentage=Case(
                When(total_problems__gt=0, then=F('solved_problems') * 100.0 / F('total_problems')),
                default=0.0,
                output_field=FloatField()
            )
        )

        return qs

    def create(self, request, *a, **kw):
        user = request.user
        course_id = request.data.get("course")
        course = get_object_or_404(Course, id=course_id)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        topic = self.get_object()
        course = topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        topic = self.get_object()
        course = topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class SubtopicViewSet(viewsets.ModelViewSet):
    queryset = Subtopic.objects.select_related("topic__course")
    serializer_class = SubtopicSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        qs = Subtopic.objects.select_related("topic__course")
        topic_id = self.request.query_params.get("topic")

        if topic_id:
            qs = qs.filter(topic_id=topic_id)

        user = self.request.user
        if user.role == "instructor":
            qs = qs.filter(
                topic__course_id__in=CourseInstructor.objects.filter(
                    instructor=user
                ).values_list("course_id", flat=True)
            )

        return qs

    def create(self, request, *a, **kw):
        user = request.user
        topic = get_object_or_404(Topic, id=request.data.get("topic"))
        course = topic.course

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        sub = self.get_object()
        course = sub.topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        sub = self.get_object()
        course = sub.topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.select_related("sub_topic__topic__course")
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        qs = Video.objects.select_related("sub_topic__topic__course")
        sub = self.request.query_params.get("sub_topic")

        if sub:
            qs = qs.filter(sub_topic_id=sub)

        user = self.request.user
        if user.role == "instructor":
            qs = qs.filter(
                sub_topic__topic__course_id__in=CourseInstructor.objects.filter(
                    instructor=user
                ).values_list("course_id", flat=True)
            )
        return qs

    def create(self, request, *a, **kw):
        subtopic = get_object_or_404(Subtopic, id=request.data.get("sub_topic"))
        course = subtopic.topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        video = self.get_object()
        course = video.sub_topic.topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        video = self.get_object()
        course = video.sub_topic.topic.course
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.select_related("sub_topic", "user")
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        from django.db.models import Q
        
        qs = Note.objects.select_related("sub_topic", "user")
        user = self.request.user

        if user.role == "instructor":
            qs = qs.filter(
                sub_topic__topic__course_id__in=CourseInstructor.objects.filter(
                    instructor=user
                ).values_list("course_id", flat=True)
            )
        if user.role == "student":
            qs = qs.filter(
                Q(user=user) | 
                Q(user__role__in=["instructor", "admin"])
            )

        if sid := self.request.query_params.get("sub_topic"):
            qs = qs.filter(sub_topic_id=sid)

        return qs

    def create(self, request, *a, **kw):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        return Response(serializer.data, status=201)

    def update(self, request, *a, **kw):
        note = self.get_object()
        user = request.user

        is_owner = note.user == user
        course = note.sub_topic.topic.course
        is_instructor = user.role == "instructor" and instructor_assigned(user, course)
        is_admin = user.role == "admin"

        if not (is_owner or is_instructor or is_admin):
            return Response({"error": "Not allowed"}, status=403)

        return super().update(request, *a, **kw)

    def destroy(self, request, *a, **kw):
        note = self.get_object()
        user = request.user

        is_owner = note.user == user
        course = note.sub_topic.topic.course
        is_instructor = user.role == "instructor" and instructor_assigned(user, course)
        is_admin = user.role == "admin"

        if not (is_owner or is_instructor or is_admin):
            return Response({"error": "Not allowed"}, status=403)

        return super().destroy(request, *a, **kw)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related(
        "course", "topic", "subtopic", "created_by"
    )
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        from django.db import models

        qs = Question.objects.select_related(
            "course", "topic", "subtopic", "created_by"
        )
        user = self.request.user

        if user.role == "instructor":
            assigned_course_ids = CourseInstructor.objects.filter(
                instructor=user
            ).values_list("course_id", flat=True)

            qs = qs.filter(
                models.Q(course_id__in=assigned_course_ids)
                | models.Q(topic__course_id__in=assigned_course_ids)
                | models.Q(subtopic__topic__course_id__in=assigned_course_ids)
            )

        course_id = self.request.query_params.get("course")
        topic_id = self.request.query_params.get("topic")
        subtopic_id = self.request.query_params.get("subtopic")
        question_type = self.request.query_params.get("type")
        difficulty = self.request.query_params.get("difficulty")
        level = self.request.query_params.get("level")
        categories = self.request.query_params.get("categories")
        search = self.request.query_params.get("search")

        if course_id:
            qs = qs.filter(course_id=course_id)
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if subtopic_id:
            qs = qs.filter(subtopic_id=subtopic_id)
        if question_type:
            qs = qs.filter(type=question_type)
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        if level and level != "all":
            qs = qs.filter(level=level)
        if categories:
            qs = qs.filter(categories__contains=[categories])
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) | models.Q(content__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        user = request.user

        course = None
        level = request.data.get("level")

        if level == "course":
            course_id = request.data.get("course")
            course = get_object_or_404(Course, id=course_id) if course_id else None
        elif level == "topic":
            topic_id = request.data.get("topic")
            topic = get_object_or_404(Topic, id=topic_id) if topic_id else None
            course = topic.course if topic else None
        elif level == "subtopic":
            subtopic_id = request.data.get("subtopic")
            subtopic = (
                get_object_or_404(Subtopic, id=subtopic_id) if subtopic_id else None
            )
            course = subtopic.topic.course if subtopic else None

        # Check permissions
        if not course:
            return Response({"error": "Invalid course/topic/subtopic"}, status=400)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().create(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *args, **kwargs):
        question = self.get_object()
        user = request.user

        course = None
        if question.course:
            course = question.course
        elif question.topic:
            course = question.topic.course
        elif question.subtopic:
            course = question.subtopic.topic.course

        if not course:
            return Response({"error": "Invalid question association"}, status=400)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().update(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *args, **kwargs):
        question = self.get_object()
        user = request.user

        # Get the course for permission checking
        course = None
        if question.course:
            course = question.course
        elif question.topic:
            course = question.topic.course
        elif question.subtopic:
            course = question.subtopic.topic.course

        if not course:
            return Response({"error": "Invalid question association"}, status=400)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, course)
        ):
            return super().destroy(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)


class StudentCourseProgressViewSet(viewsets.GenericViewSet):
    """
    ViewSet to handle student-specific actions like progress, continue learning, etc.
    Route: /api/course/student-course-progress/
    """

    queryset = UserCourseProgress.objects.all()
    permission_classes = [IsAuthenticatedUser]

    @action(detail=False, methods=["post"])
    def mark_complete(self, request):
        user = request.user
        subtopic_id = request.data.get("subtopic_id")

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        subtopic = get_object_or_404(Subtopic, id=subtopic_id)

        progress, created = UserCourseProgress.objects.get_or_create(
            user=user,
            subtopic=subtopic,
            defaults={"course": subtopic.topic.course, "topic": subtopic.topic},
        )

        progress.is_completed = True
        progress.progress_percent = 100.0
        progress.completed_at = timezone.now()
        progress.save()

        return Response(
            {"message": "Marked as complete", "progress": progress.progress_percent}
        )

    @action(detail=False, methods=["post"])
    def submit_quiz(self, request):
        user = request.user
        subtopic_id = request.data.get("subtopic_id")
        answers = request.data.get("answers")
        score_percent = request.data.get("score_percent", 0)
        is_passed = request.data.get("is_passed", False)

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        subtopic = get_object_or_404(Subtopic, id=subtopic_id)

        progress, _ = UserCourseProgress.objects.get_or_create(
            user=user,
            subtopic=subtopic,
            defaults={"course": subtopic.topic.course, "topic": subtopic.topic},
        )

        progress.quiz_score = float(score_percent)
        progress.quiz_answers = answers or {}
        progress.is_quiz_completed = is_passed

        new_percent = progress.calculate_progress()
        if new_percent >= 100:
            progress.completed_at = timezone.now()

        progress.save()

        # Gamification Hook: Quiz
        if is_passed:
            GamificationService.record_activity(user, 'quiz')

        return Response(
            {
                "message": "Quiz submitted",
                "progress": new_percent,
                "is_completed": progress.is_completed,
            }
        )

    @action(detail=False, methods=["post"])
    def submit_coding(self, request):
        user = request.user
        subtopic_id = request.data.get("subtopic_id")
        coding_status = request.data.get("coding_status", {})

        question_id = request.data.get("question_id")
        language = request.data.get("language")
        code = request.data.get("code")
        test_cases_basic = request.data.get("test_cases_basic", [])
        test_cases_advanced = request.data.get("test_cases_advanced", [])
        test_cases_custom = request.data.get("test_cases_custom", [])

        # Try to get subtopic from subtopic_id or derive from question
        subtopic = None
        if subtopic_id:
            try:
                subtopic = Subtopic.objects.get(id=subtopic_id)
            except Subtopic.DoesNotExist:
                return Response({"error": "Subtopic not found"}, status=400)
        elif question_id:
            # Try to get subtopic from question
            try:
                question = get_object_or_404(Question, id=question_id)
                if question.subtopic:
                    subtopic = question.subtopic
                elif question.topic:
                    # For topic-level questions without subtopic_id, we'll skip progress tracking
                    # but still allow code execution
                    subtopic = None
                else:
                    return Response(
                        {"error": "Cannot determine subtopic from question"}, status=400
                    )
            except Question.DoesNotExist:
                return Response({"error": "Question not found"}, status=400)
        else:
            return Response(
                {"error": "Either subtopic_id or question_id is required"}, status=400
            )

        execution_results = {}
        test_results = {}
        execution_output = ""

        if question_id and language and code:
            try:
                question = get_object_or_404(Question, id=question_id)

                result = CodeExecutionUtil.execute_code(
                    code=code,
                    language=language,
                    question_id=question_id,
                    test_cases_basic=test_cases_basic,
                    test_cases_advanced=test_cases_advanced,
                    test_cases_custom=test_cases_custom,
                )

                execution_results = result["execution_results"]
                test_results = result["test_results"]
                execution_output = result["execution_output"]

                CodeExecutionUtil.create_or_update_practice_record(
                    user=user,
                    question=question,
                    code=code,
                    language=language,
                    execution_results=execution_results,
                    execution_output=execution_output,
                    test_results=test_results,
                    course=subtopic.topic.course,
                    topic=subtopic.topic,
                )

            except requests.exceptions.RequestException as e:
                return Response(
                    {
                        "error": f"Code Executor Service Unavailable: {str(e)}",
                        "status": "error",
                    },
                    status=503,
                )
            except Exception as e:
                return Response(
                    {"error": f"Code execution failed: {str(e)}", "status": "error"},
                    status=500,
                )

        # Only update progress if we have a subtopic
        if subtopic:
            progress, _ = UserCourseProgress.objects.get_or_create(
                user=user,
                subtopic=subtopic,
                defaults={"course": subtopic.topic.course, "topic": subtopic.topic},
            )

            if not progress.coding_answers:
                progress.coding_answers = {}

            if question_id and language and code:
                progress.coding_answers[question_id] = {
                    "user_code": code,
                    "language": language,
                    "test_results": test_results,
                    "is_correct": test_results.get("passed", 0)
                    == test_results.get("total", 0)
                    if test_results
                    else False,
                    "timestamp": timezone.now().isoformat(),
                    "execution_output": execution_output,
                }

            for q_id, is_solved in coding_status.items():
                if q_id not in progress.coding_answers:
                    progress.coding_answers[q_id] = is_solved

            total_questions = Question.objects.filter(
                subtopic=subtopic, type="coding"
            ).count()

            solved_count = 0
            if progress.coding_answers:
                for q_id, answer_data in progress.coding_answers.items():
                    if isinstance(answer_data, dict):
                        if answer_data.get("is_correct", False):
                            solved_count += 1
                    elif isinstance(answer_data, bool):
                        if answer_data:
                            solved_count += 1

            for q_id, is_solved in coding_status.items():
                if is_solved and q_id not in progress.coding_answers:
                    solved_count += 1

            coding_score = 0.0
            if total_questions > 0:
                coding_score = (solved_count / total_questions) * 100.0
            else:
                coding_score = 100.0

            progress.coding_score = coding_score
            progress.is_coding_completed = coding_score >= 100.0

            new_percent = progress.calculate_progress()
            if new_percent >= 100:
                progress.completed_at = timezone.now()

            progress.save()
            
            # Gamification Hook: Coding
            if subtopic and progress.coding_score > 0: # Or checks specific question success
                 # We probably want to award XP per question success, not just overall progress
                 # But checking question level success is tricky here as 'coding_status' might be partial
                 # Let's look at the 'question_solved' flag below
                 pass
        else:
            # No subtopic
            pass
            
        # Check if current submission was successful to award XP
        if question_id and test_results.get("passed", 0) == test_results.get("total", 0):
             GamificationService.record_activity(user, 'coding')

        response_data = {
            "message": "Coding progress updated"
            if subtopic
            else "Code executed successfully",
            "progress": new_percent,
            "is_completed": progress.is_completed if subtopic else False,
            "coding_score": coding_score,
            "question_solved": question_id
            and test_results.get("passed", 0) == test_results.get("total", 0)
            if test_results
            else False,
        }

        if question_id and language and code:
            response_data.update(
                {
                    "code": code,
                    "language": language,
                    "test_results": test_results,
                    "execution_output": execution_output,
                    "status": "completed",
                }
            )

        return Response(response_data)

    @action(detail=False, methods=["get"])
    def test_endpoint(self, request):
        """Test endpoint to verify routing is working"""
        return Response(
            {
                "message": "StudentCourseProgressViewSet is working",
                "user": str(request.user),
            }
        )

    @action(detail=False, methods=["post"])
    def mark_video_watched(self, request):
        """
        Mark videos as watched for a subtopic (20% progress).
        """
        user = request.user
        subtopic_id = request.data.get("subtopic_id")

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        subtopic = get_object_or_404(Subtopic, id=subtopic_id)

        progress, created = UserCourseProgress.objects.get_or_create(
            user=user,
            subtopic=subtopic,
            defaults={"course": subtopic.topic.course, "topic": subtopic.topic},
        )

        progress.is_videos_watched = True

        new_percent = progress.calculate_progress()
        if new_percent >= 100:
            progress.completed_at = timezone.now()

        progress.save()

        # Gamification Hook: Video
        GamificationService.record_activity(user, 'video')

        return Response(
            {
                "message": "Videos marked as watched",
                "progress": new_percent,
                "is_completed": progress.is_completed,
            }
        )

    @action(detail=False, methods=["get"])
    def continue_learning(self, request):
        user = request.user
        # Sort by last_accessed to ensure the most recently viewed subtopic is returned
        last_progress = (
            UserCourseProgress.objects.filter(user=user)
            .order_by("-last_accessed", "-updated_at")
            .first()
        )

        if not last_progress:
            return Response({"message": "No progress found"}, status=200)

        course = last_progress.course

        total_lessons = Subtopic.objects.filter(topic__course=course).count()

        user_progress_list = UserCourseProgress.objects.filter(user=user, course=course)
        total_percent_sum = sum(p.progress_percent for p in user_progress_list)

        avg_percent = 0
        if total_lessons > 0:
            avg_percent = round(total_percent_sum / total_lessons)

        return Response(
            {
                "course_id": course.id,
                "course_name": course.name,
                "topic_id": last_progress.topic.id if last_progress.topic else None,
                "subtopic_id": last_progress.subtopic.id,
                "subtopic_name": last_progress.subtopic.name,
                "total_lessons": total_lessons,
                "percent": avg_percent,
                "lesson": user_progress_list.count(),  # approximate 'current lesson' count
            }
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Return user learning stats.
        """
        user = request.user

        # Calculate stats
        completed_count = UserCourseProgress.objects.filter(
            user=user, is_completed=True
        ).count()

        # Calculate average progress
        avg_progress = 0
        total_minutes = 0

        progress_records = UserCourseProgress.objects.filter(user=user)

        if progress_records.exists():
            for p in progress_records:
                total_minutes += 5  # Base
                if p.is_videos_watched:
                    total_minutes += 15
                if p.is_quiz_completed:
                    total_minutes += 10
                if p.is_coding_completed:
                    total_minutes += 25

            course_map = {}  # {course_id: sum_of_percentages}
            for p in progress_records:
                cid = p.course_id
                course_map[cid] = course_map.get(cid, 0) + p.progress_percent

            # 2. Calculate % for each course
            total_course_pct = 0
            for cid, current_sum in course_map.items():
                total_subs = Subtopic.objects.filter(topic__course_id=cid).count()
                if total_subs > 0:
                    c_pct = current_sum / total_subs
                    c_pct = min(c_pct, 100.0)
                    total_course_pct += c_pct

            # 3. Overall Average
            if len(course_map) > 0:
                avg_progress = round(total_course_pct / len(course_map))

        # Format time string "Xh Ym"
        hours = total_minutes // 60
        mins = total_minutes % 60

        time_spent_str = f"{hours}h {mins}m"
        if hours == 0:
            time_spent_str = f"{mins}m"

        # Gamification Data
        gamification_profile = GamificationService.get_or_create_profile(user)
        streak = gamification_profile.current_streak
        xp = gamification_profile.total_xp
        level = gamification_profile.current_level

        return Response(
            {
                "lessons_completed": completed_count,
                "time_spent": time_spent_str,
                "avg_progress": avg_progress,
                "streak": streak,
                "xp": xp,
                "level": level,
            }
        )

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        """
        Return top 10 users by XP.
        """
        top_profiles = UserGamificationProfile.objects.select_related('user').order_by('-total_xp')[:10]
        
        data = []
        for profile in top_profiles:
            # Check if user has a profile for avatar
            # This is inefficient if N is large, but for 10 it's fine. 
            # Ideally select_related('user__profile')
            avatar_url = None
            try:
                if hasattr(profile.user, 'profile'):
                     avatar_url = profile.user.profile.profile_image
            except:
                pass
                
            data.append({
                "rank": 0, # Filled below
                "user": profile.user.username,
                "xp": profile.total_xp,
                "level": profile.current_level,
                "avatar": avatar_url
            })
            
        # Add rank
        for i, item in enumerate(data):
            item['rank'] = i + 1
            
        return Response(data)

    @action(detail=False, methods=["get"])
    def calendar_activity(self, request):
        """
        Get active dates for the current month (or specified).
        Request: ?year=2025&month=12
        """
        user = request.user
        today = timezone.now().date()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        
        activities = DailyUserActivity.objects.filter(
            user=user,
            date__year=year,
            date__month=month,
            activity_count__gt=0
        ).values_list('date', flat=True)
        
        return Response({
            "active_dates": [d.isoformat() for d in activities],
            "year": year,
            "month": month
        })

    @action(detail=False, methods=["get"])
    def progress(self, request):
        """
        Get overall progress percentage for all courses the user has started.
        Returns: [{'course_id': 'uuid', 'percent': 45.5}, ...]
        """
        user = request.user

        # Get all progress records
        progress_records = UserCourseProgress.objects.filter(user=user).select_related(
            "course"
        )

        # Group by course
        course_stats = {}
        for p in progress_records:
            cid = str(p.course.id)
            if cid not in course_stats:
                course_stats[cid] = {"sum": 0.0}
            course_stats[cid]["sum"] += p.progress_percent

        results = []
        for cid, stats in course_stats.items():
            # Count total subtopics for this course
            total_subs = Subtopic.objects.filter(topic__course_id=cid).count()
            if total_subs > 0:
                percent = round(stats["sum"] / total_subs, 1)
                # Cap at 100% just in case
                percent = min(percent, 100.0)
                results.append({"course_id": cid, "percent": percent})

        return Response(results)

    @action(detail=False, methods=["get"])
    def get_course_progress(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")

        if not course_id:
            return Response({"error": "course_id is required"}, status=400)

        progress_qs = UserCourseProgress.objects.filter(user=user, course_id=course_id)

        data = {}
        for p in progress_qs:
            data[str(p.subtopic.id)] = {
                "progress_percent": p.progress_percent,
                "is_completed": p.is_completed,
            }

        return Response(data)

    @action(detail=False, methods=["get"])
    def get_user_progress_details(self, request):
        """
        Get detailed progress for all subtopics in a course, including quiz/coding status.
        Recalculates progress on-the-fly to ensure consistency with course content changes (e.g. added/removed questions).
        """
        user = request.user
        course_id = request.query_params.get("course_id")

        if not course_id:
            return Response({"error": "course_id is required"}, status=400)

        progress_qs = (
            UserCourseProgress.objects.filter(user=user, course_id=course_id)
            .select_related("subtopic")
            .prefetch_related("subtopic__questions")
        )

        updated_records = []
        for p in progress_qs:
            p.calculate_progress()
            updated_records.append(p)

        if updated_records:
            UserCourseProgress.objects.bulk_update(
                updated_records, ["progress_percent", "is_completed"]
            )

        from .serializers import UserCourseProgressSerializer

        serializer = UserCourseProgressSerializer(updated_records, many=True)

        data = {str(item["subtopic"]): item for item in serializer.data}

        return Response(data)

    @action(detail=False, methods=["post"])
    def log_access(self, request):
        """
        Log access to a subtopic to update 'Continue Learning' banner.
        Does not change completion status, just updates timestamps.
        """
        user = request.user
        subtopic_id = request.data.get("subtopic_id")

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        subtopic = get_object_or_404(Subtopic, id=subtopic_id)

        progress, created = UserCourseProgress.objects.get_or_create(
            user=user,
            subtopic=subtopic,
            defaults={"course": subtopic.topic.course, "topic": subtopic.topic},
        )

        progress.last_accessed = timezone.now()
        progress.save(update_fields=["last_accessed", "updated_at"])

        return Response({"message": "Access logged"})


class StudentCodePracticeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing student code practice submissions
    """

    queryset = StudentCodePractice.objects.all()
    serializer_class = StudentCodePracticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "marks_obtained"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_staff:
            qs = qs.filter(user=user)

        question_id = self.request.query_params.get("question_id")
        if question_id:
            qs = qs.filter(question_id=question_id)

        return qs

    @action(detail=False, methods=["post"], url_path="submit")
    def submit_code(self, request):
        try:
            code = request.data.get("code")
            language = request.data.get("language")
            question_id = request.data.get("question_id")  # Updated to match learn mode
            course_id = request.data.get("course_id")
            topic_id = request.data.get("topic_id")
            test_cases_basic = request.data.get("test_cases_basic", [])
            test_cases_advanced = request.data.get("test_cases_advanced", [])
            test_cases_custom = request.data.get("test_cases_custom", [])

            if not code or not language or not question_id:
                return Response(
                    {"error": "Missing required fields: code, language, question_id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                question = Question.objects.get(id=question_id)
            except Question.DoesNotExist:
                return Response(
                    {"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND
                )

            try:
                result = CodeExecutionUtil.execute_code(
                    code=code,
                    language=language,
                    question_id=question_id,
                    test_cases_basic=test_cases_basic,
                    test_cases_advanced=test_cases_advanced,
                    test_cases_custom=test_cases_custom,
                )

                execution_results = result["execution_results"]
                test_results = result["test_results"]
                execution_output = result["execution_output"]
                response_data = result["response_data"]

                service_url = os.environ.get(
                    "CODE_EXECUTOR_URL", "http://code-executor:8002"
                )
                (
                    plagiarism_score,
                    plagiarism_details,
                ) = CodeExecutionUtil.check_plagiarism(
                    code, language, question, request.user, service_url
                )

                course = None
                topic = None

                if course_id:
                    try:
                        course = Course.objects.get(id=course_id)
                    except Course.DoesNotExist:
                        pass

                if topic_id:
                    try:
                        topic = Topic.objects.get(id=topic_id)
                    except Topic.DoesNotExist:
                        pass

                if not course:
                    course = question.course
                if not topic:
                    topic = question.topic
                    if not topic and question.subtopic:
                        topic = question.subtopic.topic

                exec_res = execution_results.get("execution_result", {})
                basic_results = execution_results.get("basic_results", [])
                advanced_results = execution_results.get("advanced_results", [])
                custom_results = execution_results.get("custom_results", [])

                total_tests = test_results.get("total", 0)
                total_passed = test_results.get("passed", 0)
                basic_passed = test_results.get("basic_passed", 0)
                advanced_passed = test_results.get("advanced_passed", 0)
                custom_passed = test_results.get("custom_passed", 0)

                is_successful = total_tests > 0 and total_passed == total_tests

                existing_submission = StudentCodePractice.objects.filter(
                    user=request.user, question=question
                ).first()

                if existing_submission:
                    submission = existing_submission

                    history_entry = {
                        "timestamp": timezone.now().isoformat(),
                        "answer_data": {
                            "code": code,
                            "language": language,
                            "test_cases_basic": test_cases_basic,
                            "test_cases_advanced": test_cases_advanced,
                            "test_cases_custom": test_cases_custom,
                        },
                        "execution_results": execution_results,
                        "plagiarism_data": {
                            "is_plagiarized": plagiarism_score > 0.8,
                            "similarity_score": plagiarism_score,
                            "matched_with": plagiarism_details.get(
                                "best_match", {}
                            ).get("submission_id", "")
                            if plagiarism_details
                            else "",
                        },
                        "is_auto_save": False,
                    }

                    submission.answer_latest = {
                        "code": code,
                        "language": language,
                        "test_cases_basic": test_cases_basic,
                        "test_cases_advanced": test_cases_advanced,
                        "test_cases_custom": test_cases_custom,
                    }
                    submission.answer_history.append(history_entry)
                    submission.answer_attempt_count += 1
                    submission.execution_output = execution_output
                    submission.evaluation_results = execution_results
                    submission.plagiarism_data = {
                        "is_plagiarized": plagiarism_score > 0.8,
                        "similarity_score": plagiarism_score,
                        "matched_with": plagiarism_details.get("best_match", {}).get(
                            "submission_id", ""
                        )
                        if plagiarism_details
                        else "",
                    }
                    submission.marks_obtained = question.marks if is_successful else 0

                    if course_id and not submission.course:
                        submission.course = course
                    elif not submission.course and question.course:
                        submission.course = question.course

                    if topic_id and not submission.topic:
                        submission.topic = topic
                    elif not submission.topic and question.topic:
                        submission.topic = question.topic
                    elif (
                        not submission.topic
                        and question.subtopic
                        and question.subtopic.topic
                    ):
                        submission.topic = question.subtopic.topic

                    submission.save()

                else:
                    submission = StudentCodePractice.objects.create(
                        user=request.user,
                        question=question,
                        course=course,
                        topic=topic,
                        status=StudentCodePractice.STATUS_COMPLETED,
                        answer_latest={
                            "code": code,
                            "language": language,
                            "test_cases_basic": test_cases_basic,
                            "test_cases_advanced": test_cases_advanced,
                            "test_cases_custom": test_cases_custom,
                        },
                        answer_history=[
                            {
                                "timestamp": timezone.now().isoformat(),
                                "answer_data": {
                                    "code": code,
                                    "language": language,
                                    "test_cases_basic": test_cases_basic,
                                    "test_cases_advanced": test_cases_advanced,
                                    "test_cases_custom": test_cases_custom,
                                },
                                "execution_results": execution_results,
                                "plagiarism_data": {
                                    "is_plagiarized": plagiarism_score > 0.8,
                                    "similarity_score": plagiarism_score,
                                    "matched_with": plagiarism_details.get(
                                        "best_match", {}
                                    ).get("submission_id", "")
                                    if plagiarism_details
                                    else "",
                                },
                                "is_auto_save": False,
                            }
                        ],
                        execution_output=execution_output,
                        evaluation_results=execution_results,
                        plagiarism_data={
                            "is_plagiarized": plagiarism_score > 0.8,
                            "similarity_score": plagiarism_score,
                            "matched_with": plagiarism_details.get(
                                "best_match", {}
                            ).get("submission_id", "")
                            if plagiarism_details
                            else "",
                        },
                        answer_attempt_count=1,
                        marks_obtained=question.marks if is_successful else 0,
                    )

                basic_count = len(test_cases_basic)
                custom_count = len(test_cases_custom)
                advanced_count = len(test_cases_advanced)
                visible_test_count = basic_count + custom_count

                visible_test_results = basic_results + custom_results
                visible_passed = basic_passed + custom_passed
                visible_test_count = len(basic_results) + len(custom_results)

                masked_advanced_results = []
                for i, result in enumerate(advanced_results):
                    masked_input = CodeExecutionUtil.mask_test_data(
                        result.get("input", "")
                    )
                    masked_expected = CodeExecutionUtil.mask_test_data(
                        result.get("expected_output", "")
                    )

                    masked_advanced_results.append(
                        {
                            "passed": result.get("passed", False),
                            "input": masked_input,
                            "expected_output": masked_expected,
                            "actual_output": result.get("actual_output", "")
                            if result.get("passed", False)
                            else "***",
                            "error": result.get("error", "")
                            if not result.get("passed", False)
                            else "",
                            "execution_time": result.get("execution_time", 0),
                            "is_hidden": True,
                            "test_case_number": visible_test_count + i + 1,
                        }
                    )

                all_displayed_results = visible_test_results + masked_advanced_results
                overall_success = total_tests > 0 and total_passed == total_tests

                formatted_response = {
                    "id": submission.id,
                    "coding_problem": str(question.id),
                    "problem_title": question.title,
                    "problem_description": question.content,
                    "code": code,
                    "language": language,
                    "status": "completed",
                    "output": submission.execution_output,
                    "error_message": exec_res.get("error", ""),
                    "execution_time": exec_res.get("execution_time", 0),
                    "memory_usage": exec_res.get("memory_usage", 0),
                    "test_cases_passed": total_passed,
                    "total_test_cases": total_tests,
                    "plagiarism_score": plagiarism_score,
                    "plagiarism_details": plagiarism_details,
                    "created_at": submission.created_at.isoformat(),
                    "updated_at": submission.updated_at.isoformat(),
                    "test_results": {
                        "passed": total_passed,
                        "total": total_tests,
                        "total_passed": total_passed,
                        "total_tests": total_tests,
                        "success": overall_success,
                        "test_results": all_displayed_results,
                        "results": all_displayed_results,
                        "visible_passed": visible_passed,
                        "visible_total": visible_test_count,
                        "advanced_passed": total_passed - visible_passed
                        if total_tests > visible_test_count
                        else 0,
                        "advanced_total": advanced_count,
                        "overall_success": overall_success,
                    },
                    "plagiarism_flagged": plagiarism_score > 0.8,
                }

                return Response(formatted_response, status=status.HTTP_201_CREATED)

            except requests.exceptions.RequestException as e:
                return Response(
                    {
                        "status": "error",
                        "error_message": f"Code Executor Service Unavailable: {str(e)}",
                        "execution_result": {"success": False},
                        "test_results": [],
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except Exception as e:
                return Response(
                    {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
