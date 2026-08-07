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
from authentication.permissions import CanManageCourses, IsAuthenticatedUser, IsAdminUser
from .utils import CodeExecutionUtil
from gamification.service import GamificationService
from gamification.models import UserGamificationProfile, DailyUserActivity
from .models import (
    Course,
    Topic,
    Subtopic,
    Video,
    Note,
    CourseInstructor,
    Question,
    QuestionSolution,
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
    QuestionSolutionSerializer,
    StudentCodePracticeSerializer,
)
from core.ai_client import AIClient
from django.contrib.auth import get_user_model
from .serializers import QuestionBasicSerializer

User = get_user_model()


def instructor_assigned(user, course):
    return CourseInstructor.objects.filter(instructor=user, course=course).exists()


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    permission_classes = [CanManageCourses]

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdminUser()]
        return super().get_permissions()

    def get_serializer_class(self):
        return CourseSerializer if self.action == "retrieve" else CourseBasicSerializer

    def get_queryset(self):
        queryset = Course.objects.prefetch_related('course_instructors__instructor').all()
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        if self.request.query_params.get("basic") == "true":
            return queryset

        practice_questions_filter = Q(type='coding') & Q(categories__contains=['practice'])
        
        queryset = queryset.annotate(
            total_problems=Count(
                'questions', 
                filter=Q(questions__type='coding') & Q(questions__categories__contains=['practice']), 
                distinct=True
            ),
            topic_count=Count('topics', distinct=True)
        )

        if self.request.user.is_authenticated:
            solved_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                course=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice'],
                context='practice',
            ).values('course').annotate(cnt=Count('id')).values('cnt')
            
            score_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                course=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice'],
                context='practice',
            ).values('course').annotate(total_valid_score=Sum('marks_obtained')).values('total_valid_score')

            ai_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                course=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice'],
                context='practice',
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

    @action(detail=False, methods=["get"], url_path="check-name")
    def check_name(self, request):
        name = request.query_params.get("name", "").strip()
        if not name:
            return Response({"exists": False})
        
        qs = Course.objects.filter(name__iexact=name)
        
        exclude_id = request.query_params.get("exclude_id")
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
            
        return Response({"exists": qs.exists()})

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
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


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
        if self.action == "retrieve":
            qs = qs.prefetch_related("subtopics")

        if self.request.query_params.get("basic") == "true":
            return qs

        qs = qs.annotate(
            total_problems=Count(
                'questions', 
                filter=Q(questions__type='coding') & Q(questions__categories__contains=['practice']), 
                distinct=True
            )
        )

        
        if self.request.user.is_authenticated:
            solved_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                topic=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice'],
                context='practice',
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

        return qs.order_by('order_index')

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

    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


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

    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


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

    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


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



class QuestionSolutionViewSet(viewsets.ModelViewSet):
    queryset = QuestionSolution.objects.select_related("question")
    serializer_class = QuestionSolutionSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


    def get_queryset(self):
        qs = QuestionSolution.objects.select_related("question")
        question_id = self.request.query_params.get("question")

        if question_id:
            qs = qs.filter(question_id=question_id)

        # Access Control:
        # Instructors can only see solutions for questions they have access to.
        # Students might be restricted based on logic (handled in serializer representation or here if needed).
        # For now, let's allow read access if they have access to the question.
        # But for modification, strict checks.

        user = self.request.user
        if user.role == "instructor":
            # Filter by courses assigned to instructor
            assigned_course_ids = CourseInstructor.objects.filter(
                instructor=user
            ).values_list("course_id", flat=True)

            qs = qs.filter(
                Q(question__course_id__in=assigned_course_ids)
                | Q(question__topic__course_id__in=assigned_course_ids)
                | Q(question__subtopic__topic__course_id__in=assigned_course_ids)
            )

        return qs

    def perform_create(self, serializer):
        question = serializer.validated_data.get("question")
        self._check_permission(question)
        serializer.save()

    def perform_update(self, serializer):
        question = serializer.instance.question
        self._check_permission(question)
        serializer.save()

    def perform_destroy(self, instance):
        question = instance.question
        self._check_permission(question)
        instance.delete()

    def _check_permission(self, question):
        user = self.request.user
        if user.role == "admin":
            return

        course = None
        if question.course:
            course = question.course
        elif question.topic:
            course = question.topic.course
        elif question.subtopic:
            course = question.subtopic.topic.course

        if not course:
             # Should practically not happen if question is valid, but safe guard
             if user.role != "admin":
                 raise permissions.PermissionDenied("Invalid question association")

        if not instructor_assigned(user, course):
            raise permissions.PermissionDenied("You do not have permission for this course.")


from rest_framework.pagination import PageNumberPagination

class QuestionPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related(
        "course", "topic", "subtopic", "created_by"
    )
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticatedUser]
    pagination_class = QuestionPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


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

        # Get the new level and associations from the request, falling back to existing
        level = request.data.get("level", question.level)
        course = None

        if level == "course":
            course_id = request.data.get("course", question.course_id if question.level == "course" else None)
            course = get_object_or_404(Course, id=course_id) if course_id else None
        elif level == "topic":
            topic_id = request.data.get("topic", question.topic_id if question.level == "topic" else None)
            topic = get_object_or_404(Topic, id=topic_id) if topic_id else None
            course = topic.course if topic else None
        elif level == "subtopic":
            subtopic_id = request.data.get("subtopic", question.subtopic_id if question.level == "subtopic" else None)
            subtopic = get_object_or_404(Subtopic, id=subtopic_id) if subtopic_id else None
            course = subtopic.topic.course if subtopic else None

        if not course:
            return Response({"error": "Invalid course/topic/subtopic"}, status=400)

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

    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionBasicSerializer
        return QuestionSerializer


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
        gamification = {}
        if is_passed:
            gamification = GamificationService.record_activity(user, 'quiz')

        return Response(
            {
                "message": "Quiz submitted",
                "progress": new_percent,
                "is_completed": progress.is_completed,
                "gamification": gamification,
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

                response_data = result.get("response_data", {})
                if response_data.get("status") == "tle":
                    return Response(
                        {
                            "status": "tle",
                            "message": "Time Limit Exceeded"
                        },
                        status=status.HTTP_400_BAD_REQUEST
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
                    context='learn',
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
        gamification = {}
        if question_id and test_results.get("passed", 0) == test_results.get("total", 0):
            gamification = GamificationService.record_activity(user, 'coding')

        response_data = {
            "message": "Coding progress updated"
            if subtopic
            else "Code executed successfully",
            "progress": new_percent if subtopic else 0,
            "is_completed": progress.is_completed if subtopic else False,
            "coding_score": coding_score if subtopic else 0,
            "question_solved": (
                question_id
                and test_results.get("passed", 0) == test_results.get("total", 0)
                if test_results
                else False
            ),
            "gamification": gamification,
        }

        if question_id and language and code:
            basic_results = execution_results.get("basic_results", [])
            advanced_results = execution_results.get("advanced_results", [])
            custom_results = execution_results.get("custom_results", [])
            all_results = basic_results + custom_results + [
                {**r, "is_hidden": True, "actual_output": "***" if not r.get("passed") else r.get("actual_output", "")}
                for r in advanced_results
            ]

            status_val = "completed"
            reason_val = ""
            performance_warnings = []
            if response_data.get("status") == "tle":
                status_val = "timeout"
                reason_val = "Execution Timed Out"
            for r in (basic_results + advanced_results + custom_results):
                if r.get("error") in ["Time Limit Exceeded", "Memory Limit Exceeded"]:
                    status_val = "failed"
                    err_type = r.get("error")
                    if err_type == "Time Limit Exceeded":
                        reason_val = f"Time Limit Exceeded. Solution took {r.get('execution_time', 0):.2f}s, which exceeds the limit."
                    else:
                        reason_val = f"Memory Limit Exceeded. Solution used {r.get('memory_usage', 0):.2f}MB, which exceeds the limit."
                    performance_warnings.append({
                        "type": err_type,
                        "execution_time": r.get("execution_time", 0),
                        "memory_usage": r.get("memory_usage", 0)
                    })
                    break

            response_data.update(
                {
                    "code": code,
                    "language": language,
                    "test_results": {
                        "passed": test_results.get("passed", 0),
                        "total": test_results.get("total", 0),
                        "success": test_results.get("passed", 0) == test_results.get("total", 0),
                        "results": all_results,
                        "test_results": all_results,
                    },
                    "execution_output": execution_output,
                    "status": status_val,
                    "reason": reason_val,
                    "execution_time": exec_res.get("execution_time", 0),
                    "memory_usage": exec_res.get("memory_usage", 0),
                    "test_cases_passed": test_results.get("passed", 0),
                    "total_test_cases": test_results.get("total", 0),
                    "performance_warnings": performance_warnings,
                    "plagiarism_score": 0,
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
        gamification = GamificationService.record_activity(user, 'video')

        return Response(
            {
                "message": "Videos marked as watched",
                "progress": new_percent,
                "is_completed": progress.is_completed,
                "gamification": gamification,
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
        max_streak = gamification_profile.longest_streak
        xp = gamification_profile.total_xp
        streak_freezes = gamification_profile.streak_freezes_remaining

        # Use progressive leveling
        from gamification.service import get_level_progress
        level, xp_into_level, xp_for_next, progress_pct, tier_name = get_level_progress(xp)

        return Response(
            {
                "lessons_completed": completed_count,
                "time_spent": time_spent_str,
                "avg_progress": avg_progress,
                "streak": streak,
                "max_streak": max_streak,
                "xp": xp,
                "level": level,
                "tier_name": tier_name,
                "xp_progress_pct": progress_pct,
                "xp_for_next_level": xp_for_next,
                "streak_freezes": streak_freezes,
            }
        )


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

                response_data = result.get("response_data", {})
                execution_results = result["execution_results"]
                test_results = result["test_results"]
                execution_output = result["execution_output"]


                service_url = os.environ.get(
                    "CODE_EXECUTOR_URL", "http://yuvro-code-executor:8009"
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

                context = request.data.get("context", "practice")

                status_val = "completed"
                reason_val = ""
                if response_data.get("status") == "tle":
                    status_val = "timeout"
                    reason_val = "Execution Timed Out"
                for r in (basic_results + advanced_results + custom_results):
                    if r.get("error") in ["Time Limit Exceeded", "Memory Limit Exceeded"]:
                        status_val = "failed"
                        if r.get("error") == "Time Limit Exceeded":
                            reason_val = f"Time Limit Exceeded. Solution took {r.get('execution_time', 0):.2f}s, which exceeds the limit."
                        else:
                            reason_val = f"Memory Limit Exceeded. Solution used {r.get('memory_usage', 0):.2f}MB, which exceeds the limit."
                        break

                plagiarism_dict = {
                    "is_plagiarized": plagiarism_score > 0.8,
                    "similarity_score": plagiarism_score,
                    "matched_with": plagiarism_details.get("best_match", {}).get("submission_id", "")
                    if plagiarism_details else "",
                }

                submission = StudentCodePractice.objects.create(
                    user=request.user,
                    question=question,
                    course=course or question.course,
                    topic=topic or question.topic or (question.subtopic.topic if question.subtopic else None),
                    context=context,
                    status=StudentCodePractice.STATUS_COMPLETED if is_successful else StudentCodePractice.STATUS_SUBMITTED,
                    answer_latest={
                        "code": code,
                        "language": language,
                        "test_cases_basic": test_cases_basic,
                        "test_cases_advanced": test_cases_advanced,
                        "test_cases_custom": test_cases_custom,
                    },
                    answer_history=[{
                        "timestamp": timezone.now().isoformat(),
                        "answer_data": {
                            "code": code,
                            "language": language,
                            "test_cases_basic": test_cases_basic,
                            "test_cases_advanced": test_cases_advanced,
                            "test_cases_custom": test_cases_custom,
                        },
                        "execution_results": execution_results,
                        "plagiarism_data": plagiarism_dict,
                        "is_auto_save": False,
                    }],
                    execution_output=execution_output,
                    evaluation_results=execution_results,
                    plagiarism_data=plagiarism_dict,
                    marks_obtained=round((total_passed / total_tests) * question.marks, 2) if total_tests > 0 else 0,
                )
                basic_count = len(test_cases_basic)
                custom_count = len(test_cases_custom)
                advanced_count = len(test_cases_advanced)

                visible_passed = basic_passed + custom_passed
                visible_test_count = len(basic_results) + len(custom_results)

                # Normalize visible test results with display metadata
                normalized_visible_results = []
                for i, result in enumerate(basic_results + custom_results):
                    normalized_visible_results.append({
                        "passed": result.get("passed", False),
                        "input": result.get("input", ""),
                        "expected_output": result.get("expected_output", ""),
                        "actual_output": result.get("actual_output", ""),
                        "error": result.get("error", ""),
                        "execution_time": result.get("execution_time", 0),
                        "memory_usage": result.get("memory_usage", 0),
                        "console_output": result.get("console_output", ""),
                        "is_hidden": False,
                        "test_case_number": i + 1,
                    })

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
                            "memory_usage": result.get("memory_usage", 0),
                            "console_output": "",
                            "is_hidden": True,
                            "test_case_number": visible_test_count + i + 1,
                        }
                    )

                all_displayed_results = normalized_visible_results + masked_advanced_results

                # Detect performance warnings: correct output but resource limit exceeded
                performance_warnings = []
                for r in (basic_results + advanced_results + custom_results):
                    err = r.get("error", "")
                    if err in ("Time Limit Exceeded", "Memory Limit Exceeded"):
                        performance_warnings.append({
                            "type": err,
                            "execution_time": r.get("execution_time", 0),
                            "memory_usage": r.get("memory_usage", 0),
                        })
                overall_success = total_tests > 0 and total_passed == total_tests

                # --- Gamification: record activity for coding practice ---
                gamification = {}
                if overall_success:
                    try:
                        from gamification.service import GamificationService
                        gamification = GamificationService.record_activity(request.user, 'coding')
                    except Exception:
                        pass

                new_badges = gamification.get('new_badges', [])
                welcome_bonus = gamification.get('welcome_bonus', 0)

                formatted_response = {
                    "id": submission.id,
                    "coding_problem": str(question.id),
                    "problem_title": question.title,
                    "problem_description": question.content,
                    "code": code,
                    "language": language,
                    "status": status_val,
                    "reason": reason_val,
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
                    "performance_warnings": performance_warnings,
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
                    "new_badges": [{"key": b['key'], "name": b['name'], "icon": b['icon']} for b in new_badges],
                    "welcome_bonus": welcome_bonus,
                    "gamification": gamification,
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

    @action(detail=False, methods=["post"], url_path="reveal-hint")
    def reveal_hint(self, request, pk=None):
        question_id = request.data.get("question_id")
        if not question_id:
            return Response({"error": "question_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND)

        context = request.data.get("context", "practice")
        submission = StudentCodePractice.objects.filter(
            user=request.user, question=question, context=context
        ).order_by('-created_at').first()
        if not submission:
            return Response({"error": "No submission found for this question"}, status=status.HTTP_404_NOT_FOUND)

        hint_index = request.data.get("hint_index", 0)
        hints = question.hints

        if not hints or hint_index >= len(hints):
            return Response({"error": "Hint not available"}, status=status.HTTP_404_NOT_FOUND)

        submission.used_hint = True
        submission.marks_obtained = 0
        submission.save(update_fields=['used_hint', 'marks_obtained'])

        return Response({"hint": hints[hint_index]})

    @action(detail=False, methods=["post"], url_path="reveal-solution")
    def reveal_solution(self, request, pk=None):
        question_id = request.data.get("question_id")
        if not question_id:
            return Response({"error": "question_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND)

        context = request.data.get("context", "practice")
        submission = StudentCodePractice.objects.filter(
            user=request.user, question=question, context=context
        ).order_by('-created_at').first()
        if not submission:
            return Response({"error": "No submission found for this question"}, status=status.HTTP_404_NOT_FOUND)

        solutions = question.solutions.all()
        if not solutions.exists():
            return Response({"error": "No predefined solutions available for this question"}, status=status.HTTP_404_NOT_FOUND)

        submission.viewed_solution = True
        submission.marks_obtained = 0
        submission.save(update_fields=['viewed_solution', 'marks_obtained'])

        from .serializers import QuestionSolutionSerializer
        serializer = QuestionSolutionSerializer(solutions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="use-ai")
    def increment_ai_count(self, request, pk=None):
        submission = self.get_object()
        submission.ai_help_count += 1
        submission.marks_obtained = 0
        submission.save(update_fields=['ai_help_count', 'marks_obtained'])
        return Response({"message": "AI help count incremented"})

    @action(detail=False, methods=["get"])
    def generate_insights(self, request):
        """
        Generate AI insights based on user's recent coding practice using `ai_assistant` service.
        """
        user = request.user
        
        # 1. Fetch recent submissions (last 20)
        recent_submissions = StudentCodePractice.objects.filter(
            user=user
        ).order_by('-created_at')[:20]
        
        if not recent_submissions.exists():
             return Response({
                "insights": [],
                "message": "No coding practice data available yet."
            })

        # 2. aggregate stats
        total_submissions = recent_submissions.count()
        languages = {}
        error_types = {}
        total_time = 0
        success_count = 0
        
        problems_summary = []

        for sub in recent_submissions:
            # Language usage
            lang = sub.language
            languages[lang] = languages.get(lang, 0) + 1
            
            # Execution time
            if sub.evaluation_results:
                 # evaluation_results might be list (old) or dict (new)
                 # Handle based on typical structure
                 exec_time = 0
                 if isinstance(sub.evaluation_results, dict):
                     exec_time = sub.evaluation_results.get('execution_result', {}).get('execution_time', 0)
                 total_time += exec_time

            # Status/Success
            # Check marks or status
            is_success = sub.marks_obtained > 0 
            if is_success:
                success_count += 1
            else:
                # Collect errors if any
                error = sub.execution_output 
                if error and "Error" in error:
                    # naive classification or just take first line
                    err_line = error.split('\n')[0]
                    error_types[err_line] = error_types.get(err_line, 0) + 1

            problems_summary.append({
                "problem": sub.question.title,
                "language": lang,
                "status": "Success" if is_success else "Failed",
            })

        avg_time = total_time / total_submissions if total_submissions > 0 else 0
        success_rate = (success_count / total_submissions) * 100

        # 3. Construct Prompt
        prompt = f"""
        Analyze the following coding practice data for a student and provide 4 specific, personalized insights in JSON format.
        
        Data Summary:
        - Total Submissions: {total_submissions}
        - Success Rate: {success_rate:.1f}%
        - Average Execution Time: {avg_time:.4f}s
        - Languages Used: {languages}
        - Common Errors: {error_types}
        - Recent Problem Attempt History: {problems_summary}

        Required JSON Structure:
        {{
            "insights": [
                {{
                    "type": "strength", 
                    "title": "Short Title", 
                    "description": "2 sentence explanation", 
                    "icon_name": "TrendingUp"
                }},
                {{
                    "type": "weakness", 
                    "title": "Short Title", 
                    "description": "2 sentence explanation", 
                    "icon_name": "BookOpen"
                }},
                {{
                    "type": "recommendation", 
                    "title": "Short Title", 
                    "description": "Actionable advice", 
                    "icon_name": "Lightbulb"
                }},
                {{
                    "type": "trend", 
                    "title": "Short Title", 
                    "description": "Observation about progress", 
                    "icon_name": "TrendingUp"
                }}
            ]
        }}
        
        Ensure "type" is strictly one of: 'strength', 'weakness', 'recommendation', 'trend'.
        """

        try:
            auth_token = str(request.auth) if request.auth else None
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                response_data = loop.run_until_complete(
                    AIClient.generate_response(
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.7,
                        max_tokens=1000
                    )
                )
            finally:
                loop.close()
            
            ai_text = response_data.get('response', '{}')
            
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', ai_text, re.DOTALL)
            if json_match:
                ai_text = json_match.group(1)
            elif '```' in ai_text:
                 json_match = re.search(r'```\s*(.*?)\s*```', ai_text, re.DOTALL)
                 if json_match:
                    ai_text = json_match.group(1)

            import json
            try:
                insights_data = json.loads(ai_text)
                if "insights" not in insights_data:
                     if isinstance(insights_data, list):
                         insights_data = {"insights": insights_data}
                     else:
                         insights_data = {"insights": []}
            except json.JSONDecodeError:
                print("Failed to parse AI JSON response:", ai_text)
                return Response({"error": "Failed to parse AI response"}, status=500)

            return Response(insights_data)

        except AIServiceError as e:
             return Response({"error": f"AI Service Error: {str(e)}"}, status=503)
        except Exception as e:
             return Response({"error": f"Unexpected Error: {str(e)}"}, status=500)
