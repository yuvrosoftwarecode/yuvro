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
    Subject,
    Unit,
    SubUnit,
    Video,
    Note,
    SubjectInstructor,
    Question,
    UserSubjectProgress,
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
from ai_assistant.services import AIServiceFactory, AIServiceError
from ai_assistant.models import AIAgent
from django.contrib.auth import get_user_model

User = get_user_model()


def instructor_assigned(user, Subject):
    return SubjectInstructor.objects.filter(instructor=user, Subject=Subject).exists()


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    permission_classes = [CanManageCourses]

    def get_serializer_class(self):
        return CourseSerializer if self.action == "retrieve" else CourseBasicSerializer

    def get_queryset(self):
        queryset = Subject.objects.all()
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
                Subject=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice']
            ).values('Subject').annotate(cnt=Count('id')).values('cnt')
            
            score_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                Subject=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice']
            ).values('Subject').annotate(total_valid_score=Sum('marks_obtained')).values('total_valid_score')

            ai_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                Subject=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice']
            ).values('Subject').annotate(total_ai=Sum('ai_help_count')).values('total_ai')

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
        Subject = self.get_object()
        instructors = Subject.instructors.all()
        return Response(
            [
                {"id": str(u.id), "name": u.username, "email": u.email}
                for u in instructors
            ]
        )

    @action(detail=True, methods=["post"])
    def add_instructor(self, request, pk=None):
        Subject = self.get_object()
        instructor_id = request.data.get("instructor_id")

        if not instructor_id:
            return Response({"error": "instructor_id is required"}, status=400)

        instructor = get_object_or_404(User, id=instructor_id)

        try:
            SubjectInstructor.objects.create(Subject=Subject, instructor=instructor)
        except IntegrityError:
            return Response({"error": "Instructor already assigned"}, status=400)

        return Response({"message": "Instructor assigned successfully"})

    @action(detail=True, methods=["post"])
    def remove_instructor(self, request, pk=None):
        Subject = self.get_object()
        instructor_id = request.data.get("instructor_id")
        mapping = SubjectInstructor.objects.filter(
            Subject=Subject, instructor_id=instructor_id
        ).first()

        if not mapping:
            return Response({"error": "Instructor not assigned"}, status=400)

        mapping.delete()
        return Response({"message": "Removed successfully"})

    def update(self, request, *a, **kw):
        kw["partial"] = True
        return super().update(request, *a, **kw)


class TopicViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related("Subject")
    permission_classes = [IsAuthenticatedUser]

    def get_serializer_class(self):
        return TopicSerializer if self.action == "retrieve" else TopicBasicSerializer

    def get_queryset(self):
        qs = Unit.objects.select_related("Subject")
        user = self.request.user

        if user.role == "instructor":
            assigned_ids = SubjectInstructor.objects.filter(instructor=user).values_list(
                "course_id", flat=True
            )
            qs = qs.filter(course_id__in=assigned_ids)

        course_id = self.request.query_params.get("Subject")
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
                Unit=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice']
            ).values('Unit').annotate(cnt=Count('id')).values('cnt')
            
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
        course_id = request.data.get("Subject")
        Subject = get_object_or_404(Subject, id=course_id)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        Unit = self.get_object()
        Subject = Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        Unit = self.get_object()
        Subject = Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class SubtopicViewSet(viewsets.ModelViewSet):
    queryset = SubUnit.objects.select_related("topic__course")
    serializer_class = SubtopicSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        qs = SubUnit.objects.select_related("topic__course")
        topic_id = self.request.query_params.get("Unit")

        if topic_id:
            qs = qs.filter(topic_id=topic_id)

        user = self.request.user
        if user.role == "instructor":
            qs = qs.filter(
                topic__course_id__in=SubjectInstructor.objects.filter(
                    instructor=user
                ).values_list("course_id", flat=True)
            )

        return qs

    def create(self, request, *a, **kw):
        user = request.user
        Unit = get_object_or_404(Unit, id=request.data.get("Unit"))
        Subject = Unit.Subject

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        sub = self.get_object()
        Subject = sub.Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        sub = self.get_object()
        Subject = sub.Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.select_related("sub_topic__topic__course")
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        qs = Video.objects.select_related("sub_topic__topic__course")
        sub = self.request.query_params.get("sub_unit")

        if sub:
            qs = qs.filter(sub_topic_id=sub)

        user = self.request.user
        if user.role == "instructor":
            qs = qs.filter(
                sub_topic__topic__course_id__in=SubjectInstructor.objects.filter(
                    instructor=user
                ).values_list("course_id", flat=True)
            )
        return qs

    def create(self, request, *a, **kw):
        SubUnit = get_object_or_404(SubUnit, id=request.data.get("sub_unit"))
        Subject = SubUnit.Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        video = self.get_object()
        Subject = video.sub_unit.Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        video = self.get_object()
        Subject = video.sub_unit.Unit.Subject
        user = request.user

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.select_related("sub_unit", "user")
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        from django.db.models import Q
        
        qs = Note.objects.select_related("sub_unit", "user")
        user = self.request.user

        if user.role == "instructor":
            qs = qs.filter(
                sub_topic__topic__course_id__in=SubjectInstructor.objects.filter(
                    instructor=user
                ).values_list("course_id", flat=True)
            )
        if user.role == "student":
            qs = qs.filter(
                Q(user=user) | 
                Q(user__role__in=["instructor", "admin"])
            )

        if sid := self.request.query_params.get("sub_unit"):
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
        Subject = note.sub_unit.Unit.Subject
        is_instructor = user.role == "instructor" and instructor_assigned(user, Subject)
        is_admin = user.role == "admin"

        if not (is_owner or is_instructor or is_admin):
            return Response({"error": "Not allowed"}, status=403)

        return super().update(request, *a, **kw)

    def destroy(self, request, *a, **kw):
        note = self.get_object()
        user = request.user

        is_owner = note.user == user
        Subject = note.sub_unit.Unit.Subject
        is_instructor = user.role == "instructor" and instructor_assigned(user, Subject)
        is_admin = user.role == "admin"

        if not (is_owner or is_instructor or is_admin):
            return Response({"error": "Not allowed"}, status=403)

        return super().destroy(request, *a, **kw)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related(
        "Subject", "Unit", "SubUnit", "created_by"
    )
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        from django.db import models

        qs = Question.objects.select_related(
            "Subject", "Unit", "SubUnit", "created_by"
        )
        user = self.request.user

        if user.role == "instructor":
            assigned_course_ids = SubjectInstructor.objects.filter(
                instructor=user
            ).values_list("course_id", flat=True)

            qs = qs.filter(
                models.Q(course_id__in=assigned_course_ids)
                | models.Q(topic__course_id__in=assigned_course_ids)
                | models.Q(subtopic__topic__course_id__in=assigned_course_ids)
            )

        course_id = self.request.query_params.get("Subject")
        topic_id = self.request.query_params.get("Unit")
        subtopic_id = self.request.query_params.get("SubUnit")
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

        Subject = None
        level = request.data.get("level")

        if level == "Subject":
            course_id = request.data.get("Subject")
            Subject = get_object_or_404(Subject, id=course_id) if course_id else None
        elif level == "Unit":
            topic_id = request.data.get("Unit")
            Unit = get_object_or_404(Unit, id=topic_id) if topic_id else None
            Subject = Unit.Subject if Unit else None
        elif level == "SubUnit":
            subtopic_id = request.data.get("SubUnit")
            SubUnit = (
                get_object_or_404(SubUnit, id=subtopic_id) if subtopic_id else None
            )
            Subject = SubUnit.Unit.Subject if SubUnit else None

        # Check permissions
        if not Subject:
            return Response({"error": "Invalid Subject/Unit/SubUnit"}, status=400)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().create(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *args, **kwargs):
        question = self.get_object()
        user = request.user

        Subject = None
        if question.Subject:
            Subject = question.Subject
        elif question.Unit:
            Subject = question.Unit.Subject
        elif question.SubUnit:
            Subject = question.SubUnit.Unit.Subject

        if not Subject:
            return Response({"error": "Invalid question association"}, status=400)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().update(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *args, **kwargs):
        question = self.get_object()
        user = request.user

        # Get the Subject for permission checking
        Subject = None
        if question.Subject:
            Subject = question.Subject
        elif question.Unit:
            Subject = question.Unit.Subject
        elif question.SubUnit:
            Subject = question.SubUnit.Unit.Subject

        if not Subject:
            return Response({"error": "Invalid question association"}, status=400)

        if user.role == "admin" or (
            user.role == "instructor" and instructor_assigned(user, Subject)
        ):
            return super().destroy(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)


class StudentCourseProgressViewSet(viewsets.GenericViewSet):
    """
    ViewSet to handle student-specific actions like progress, continue learning, etc.
    Route: /api/Subject/student-Subject-progress/
    """

    queryset = UserSubjectProgress.objects.all()
    permission_classes = [IsAuthenticatedUser]

    @action(detail=False, methods=["post"])
    def mark_complete(self, request):
        user = request.user
        subtopic_id = request.data.get("subtopic_id")

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        SubUnit = get_object_or_404(SubUnit, id=subtopic_id)

        progress, created = UserSubjectProgress.objects.get_or_create(
            user=user,
            SubUnit=SubUnit,
            defaults={"Subject": SubUnit.Unit.Subject, "Unit": SubUnit.Unit},
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

        SubUnit = get_object_or_404(SubUnit, id=subtopic_id)

        progress, _ = UserSubjectProgress.objects.get_or_create(
            user=user,
            SubUnit=SubUnit,
            defaults={"Subject": SubUnit.Unit.Subject, "Unit": SubUnit.Unit},
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

        # Try to get SubUnit from subtopic_id or derive from question
        SubUnit = None
        if subtopic_id:
            try:
                SubUnit = SubUnit.objects.get(id=subtopic_id)
            except SubUnit.DoesNotExist:
                return Response({"error": "SubUnit not found"}, status=400)
        elif question_id:
            # Try to get SubUnit from question
            try:
                question = get_object_or_404(Question, id=question_id)
                if question.SubUnit:
                    SubUnit = question.SubUnit
                elif question.Unit:
                    # For Unit-level questions without subtopic_id, we'll skip progress tracking
                    # but still allow code execution
                    SubUnit = None
                else:
                    return Response(
                        {"error": "Cannot determine SubUnit from question"}, status=400
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
                    Subject=SubUnit.Unit.Subject,
                    Unit=SubUnit.Unit,
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

        # Only update progress if we have a SubUnit
        if SubUnit:
            progress, _ = UserSubjectProgress.objects.get_or_create(
                user=user,
                SubUnit=SubUnit,
                defaults={"Subject": SubUnit.Unit.Subject, "Unit": SubUnit.Unit},
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
                SubUnit=SubUnit, type="coding"
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
            if SubUnit and progress.coding_score > 0: # Or checks specific question success
                 # We probably want to award XP per question success, not just overall progress
                 # But checking question level success is tricky here as 'coding_status' might be partial
                 # Let's look at the 'question_solved' flag below
                 pass
        else:
            # No SubUnit
            pass
            
        # Check if current submission was successful to award XP
        if question_id and test_results.get("passed", 0) == test_results.get("total", 0):
             GamificationService.record_activity(user, 'coding')

        response_data = {
            "message": "Coding progress updated"
            if SubUnit
            else "Code executed successfully",
            "progress": new_percent,
            "is_completed": progress.is_completed if SubUnit else False,
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
        Mark videos as watched for a SubUnit (20% progress).
        """
        user = request.user
        subtopic_id = request.data.get("subtopic_id")

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        SubUnit = get_object_or_404(SubUnit, id=subtopic_id)

        progress, created = UserSubjectProgress.objects.get_or_create(
            user=user,
            SubUnit=SubUnit,
            defaults={"Subject": SubUnit.Unit.Subject, "Unit": SubUnit.Unit},
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
        # Sort by last_accessed to ensure the most recently viewed SubUnit is returned
        last_progress = (
            UserSubjectProgress.objects.filter(user=user)
            .order_by("-last_accessed", "-updated_at")
            .first()
        )

        if not last_progress:
            return Response({"message": "No progress found"}, status=200)

        Subject = last_progress.Subject

        total_lessons = SubUnit.objects.filter(topic__course=Subject).count()

        user_progress_list = UserSubjectProgress.objects.filter(user=user, Subject=Subject)
        total_percent_sum = sum(p.progress_percent for p in user_progress_list)

        avg_percent = 0
        if total_lessons > 0:
            avg_percent = round(total_percent_sum / total_lessons)

        return Response(
            {
                "course_id": Subject.id,
                "course_name": Subject.name,
                "topic_id": last_progress.Unit.id if last_progress.Unit else None,
                "subtopic_id": last_progress.SubUnit.id,
                "subtopic_name": last_progress.SubUnit.name,
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
        completed_count = UserSubjectProgress.objects.filter(
            user=user, is_completed=True
        ).count()

        # Calculate average progress
        avg_progress = 0
        total_minutes = 0

        progress_records = UserSubjectProgress.objects.filter(user=user)

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

            # 2. Calculate % for each Subject
            total_course_pct = 0
            for cid, current_sum in course_map.items():
                total_subs = SubUnit.objects.filter(topic__course_id=cid).count()
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
        progress_records = UserSubjectProgress.objects.filter(user=user).select_related(
            "Subject"
        )

        # Group by Subject
        course_stats = {}
        for p in progress_records:
            cid = str(p.Subject.id)
            if cid not in course_stats:
                course_stats[cid] = {"sum": 0.0}
            course_stats[cid]["sum"] += p.progress_percent

        results = []
        for cid, stats in course_stats.items():
            # Count total subtopics for this Subject
            total_subs = SubUnit.objects.filter(topic__course_id=cid).count()
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

        progress_qs = UserSubjectProgress.objects.filter(user=user, course_id=course_id)

        data = {}
        for p in progress_qs:
            data[str(p.SubUnit.id)] = {
                "progress_percent": p.progress_percent,
                "is_completed": p.is_completed,
            }

        return Response(data)

    @action(detail=False, methods=["get"])
    def get_user_progress_details(self, request):
        """
        Get detailed progress for all subtopics in a Subject, including quiz/coding status.
        Recalculates progress on-the-fly to ensure consistency with Subject content changes (e.g. added/removed questions).
        """
        user = request.user
        course_id = request.query_params.get("course_id")

        if not course_id:
            return Response({"error": "course_id is required"}, status=400)

        progress_qs = (
            UserSubjectProgress.objects.filter(user=user, course_id=course_id)
            .select_related("SubUnit")
            .prefetch_related("subtopic__questions")
        )

        updated_records = []
        for p in progress_qs:
            p.calculate_progress()
            updated_records.append(p)

        if updated_records:
            UserSubjectProgress.objects.bulk_update(
                updated_records, ["progress_percent", "is_completed"]
            )

        from .serializers import UserCourseProgressSerializer

        serializer = UserCourseProgressSerializer(updated_records, many=True)

        data = {str(item["SubUnit"]): item for item in serializer.data}

        return Response(data)

    @action(detail=False, methods=["post"])
    def log_access(self, request):
        """
        Log access to a SubUnit to update 'Continue Learning' banner.
        Does not change completion status, just updates timestamps.
        """
        user = request.user
        subtopic_id = request.data.get("subtopic_id")

        if not subtopic_id:
            return Response({"error": "subtopic_id is required"}, status=400)

        SubUnit = get_object_or_404(SubUnit, id=subtopic_id)

        progress, created = UserSubjectProgress.objects.get_or_create(
            user=user,
            SubUnit=SubUnit,
            defaults={"Subject": SubUnit.Unit.Subject, "Unit": SubUnit.Unit},
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

                Subject = None
                Unit = None

                if course_id:
                    try:
                        Subject = Subject.objects.get(id=course_id)
                    except Subject.DoesNotExist:
                        pass

                if topic_id:
                    try:
                        Unit = Unit.objects.get(id=topic_id)
                    except Unit.DoesNotExist:
                        pass

                if not Subject:
                    Subject = question.Subject
                if not Unit:
                    Unit = question.Unit
                    if not Unit and question.SubUnit:
                        Unit = question.SubUnit.Unit

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

                    if course_id and not submission.Subject:
                        submission.Subject = Subject
                    elif not submission.Subject and question.Subject:
                        submission.Subject = question.Subject

                    if topic_id and not submission.Unit:
                        submission.Unit = Unit
                    elif not submission.Unit and question.Unit:
                        submission.Unit = question.Unit
                    elif (
                        not submission.Unit
                        and question.SubUnit
                        and question.SubUnit.Unit
                    ):
                        submission.Unit = question.SubUnit.Unit

                    submission.save()

                else:
                    submission = StudentCodePractice.objects.create(
                        user=request.user,
                        question=question,
                        Subject=Subject,
                        Unit=Unit,
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

        # 4. Call AI Service
        try:
            # Find an active agent
            agent = AIAgent.objects.filter(is_active=True).first()
            if not agent:
                 # Fallback if no agent in DB, but we need one. 
                 # For now, return error or mock if forced.
                 return Response({"error": "No active AI agent configured."}, status=503)

            ai_service = AIServiceFactory.create_service(agent.provider, agent.model_name)
            
            # Using async wrapper as seen in other views
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                response_data = loop.run_until_complete(
                    ai_service.generate_response(
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.7,
                        max_tokens=1000
                    )
                )
            finally:
                loop.close()
            
            ai_text = response_data.get('response', '{}')
            
            # Extract JSON from markdown code blocks if present
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', ai_text, re.DOTALL)
            if json_match:
                ai_text = json_match.group(1)
            elif '```' in ai_text:
                 # Check for generic block
                 json_match = re.search(r'```\s*(.*?)\s*```', ai_text, re.DOTALL)
                 if json_match:
                    ai_text = json_match.group(1)

            import json
            try:
                insights_data = json.loads(ai_text)
                # Ensure valid structure
                if "insights" not in insights_data:
                     # try to look if it returned a list directly
                     if isinstance(insights_data, list):
                         insights_data = {"insights": insights_data}
                     else:
                         insights_data = {"insights": []}
            except json.JSONDecodeError:
                # Fallback or retry? for now just return empty with error message
                print("Failed to parse AI JSON response:", ai_text)
                return Response({"error": "Failed to parse AI response"}, status=500)

            return Response(insights_data)

        except AIServiceError as e:
             return Response({"error": f"AI Service Error: {str(e)}"}, status=503)
        except Exception as e:
             return Response({"error": f"Unexpected Error: {str(e)}"}, status=500)

