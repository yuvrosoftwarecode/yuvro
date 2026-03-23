from rest_framework import viewsets, permissions, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
import os
import re
import requests
from django.db.models import (
    Count, Q, F, Case, When, Value, IntegerField, FloatField, 
    OuterRef, Subquery, Sum, Exists
)
from django.db.models.functions import Coalesce
from authentication.permissions import CanManageCourses, IsAuthenticatedUser, IsCollegeManagementAdmin
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .utils import CodeExecutionUtil
from .gamification_service import GamificationService
from .gamification_models import UserGamificationProfile, DailyUserActivity
from core.models import College, Batch, Department, Semester, Section, AttendanceSession, AttendanceRecord, StudentProfile, Task, TaskSubmission, TaskComment
from .models import (
    Subject,
    Unit,
    SubUnit,
    Video,
    Question,
    UserSubjectProgress,
    StudentCodePractice,
    CollegeSubject,
    SemesterSubject,
    SectionSubjectFaculty,
)
from .serializers import (
    CollegeSerializer,
    BatchSerializer,
    DepartmentSerializer,
    SemesterSerializer,
    SectionSerializer,
    SubjectSerializer,
    SubjectBasicSerializer,
    UnitSerializer,
    UnitBasicSerializer,
    SubUnitSerializer,
    VideoSerializer,
    QuestionSerializer,
    UserSubjectProgressSerializer,
    StudentCodePracticeSerializer,
    CollegeSubjectSerializer,
    SemesterSubjectSerializer,
    SectionSubjectFacultySerializer,
)
from core.serializers import TaskSubmissionSerializer, TaskCommentSerializer
from ai_assistant.services import AIServiceFactory, AIServiceError
from ai_assistant.models import AIAgent
from django.contrib.auth import get_user_model

User = get_user_model()


def subject_assigned_to_college_faculty(user, subject):
    """
    Check if the user (faculty) is linked to a college that has this subject.
    """
    if not hasattr(user, 'college') or not user.college:
        return False
    return CollegeSubject.objects.filter(college=user.college, subject=subject).exists()

class CollegeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing college instances.
    """

    serializer_class = CollegeSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.role == "admin":
                return College.objects.all()
            
            # For college_admin, principal, hod, faculty - they are linked to a specific college via profiles
            college = user.college
            if college:
                return College.objects.filter(id=college.id)
                
        return College.objects.none()

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            # Only platform admins should create/delete colleges
            return [IsAdminUser()]
        if self.action in ["update", "partial_update", "bulk_initialize_semesters", "unique_batches"]:
            # Platform admins, College Admins, and Principals can manage their college details/academics
            return [IsCollegeManagementAdmin()]
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def unique_batches(self, request, pk=None):
        """
        Returns unique batch names for a college.
        Includes names from global batches and department-linked batches.
        """
        college = self.get_object()
        global_names = Batch.objects.filter(college=college).values_list("name", flat=True)
        dept_names = Batch.objects.filter(department__college=college).values_list("name", flat=True)
        all_names = set(list(global_names) + list(dept_names))
        return Response(sorted(list(all_names), reverse=True))

    @action(detail=True, methods=["post"])
    def bulk_initialize_semesters(self, request, pk=None):
        """
        Initialize a batch and 8 semesters for all departments in a college.
        Payload: { "batch_name": "2021-2025" }
        """
        college = self.get_object()
        batch_name = request.data.get("batch_name")
        if not batch_name:
            return Response({"error": "batch_name is required"}, status=status.HTTP_400_BAD_REQUEST)

        departments = college.departments.all()
        processed_depts = []
        
        with transaction.atomic():
            # 1. Ensure the Global Batch entry exists (if it doesn't already)
            # This makes the batch 'official' for the college
            global_batch, _ = Batch.objects.get_or_create(
                college=college,
                name=batch_name,
                department=None
            )

            for dept in departments:
                # 2. Ensure Batch exists for this department
                batch, created = Batch.objects.get_or_create(
                    department=dept,
                    name=batch_name,
                    college=college # Maintain the link
                )
                
                # 3. Check existing semesters to avoid duplicates/integrity errors
                existing_sem_numbers = set(Semester.objects.filter(batch=batch).values_list('number', flat=True))
                
                # 4. Create missing semesters (1-8)
                semesters_to_create = []
                for i in range(1, 9):
                    if i not in existing_sem_numbers:
                        # Set 1st semester as current by default
                        is_current = (i == 1)
                        semesters_to_create.append(Semester(batch=batch, number=i, is_current=is_current))
                
                if semesters_to_create:
                    Semester.objects.bulk_create(semesters_to_create)

                # 5. Ensure Semester 1 is set to current even if it already existed
                # Using .save() instead of .update() to trigger Semester.save() logic 
                # (which handles setting others to False) and update timestamps.
                sem1 = Semester.objects.filter(batch=batch, number=1).first()
                if sem1:
                    sem1.is_current = True
                    sem1.save()
                else:
                    # Fallback if somehow it doesn't exist yet
                    Semester.objects.create(batch=batch, number=1, is_current=True)
                
                processed_depts.append(dept.name)

        return Response({
            "message": f"Initialized batch '{batch_name}' for {len(processed_depts)} departments.",
            "departments_processed_count": len(processed_depts),
            "departments": processed_depts
        })


class BatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing batch instances.
    """
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["department", "college", "name"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCollegeManagementAdmin()]
        return super().get_permissions()


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing department instances.
    """

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["college"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCollegeManagementAdmin()]
        return super().get_permissions()


class SemesterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing semester instances.
    """
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["batch"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCollegeManagementAdmin()]
        return super().get_permissions()


class SectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing section instances.
    """
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["semester"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCollegeManagementAdmin()]
        return super().get_permissions()



class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    permission_classes = [CanManageCourses]
    filterset_fields = ["short_code", "yuvro_id"]

    def get_serializer_class(self):
        return SubjectSerializer if self.action == "retrieve" else SubjectBasicSerializer

    def get_queryset(self):
        queryset = Subject.objects.all()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(subject_name__icontains=search) | Q(short_code__icontains=search) | Q(yuvro_id__icontains=search)
            )

        queryset = queryset.annotate(
            total_problems=Count(
                'questions', 
                filter=Q(questions__type='coding') & Q(questions__categories__contains=['practice']), 
                distinct=True
            ) + Count(
                'units__questions',
                filter=Q(units__questions__type='coding') & Q(units__questions__categories__contains=['practice']),
                distinct=True
            ) + Count(
                'units__subunits__questions',
                filter=Q(units__subunits__questions__type='coding') & Q(units__subunits__questions__categories__contains=['practice']),
                distinct=True
            )
        )

        if self.request.user.is_authenticated:
            solved_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                subject=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice']
            ).values('subject').annotate(cnt=Count('id')).values('cnt')
            
            score_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                subject=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice']
            ).values('subject').annotate(total_valid_score=Sum('marks_obtained')).values('total_valid_score')

            ai_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                subject=OuterRef('pk'),
                question__type='coding',
                question__categories__contains=['practice']
            ).values('subject').annotate(total_ai=Sum('ai_help_count')).values('total_ai')

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

    def update(self, request, *a, **kw):
        kw["partial"] = True
        return super().update(request, *a, **kw)


class CollegeSubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage subjects assigned to colleges.
    """
    queryset = CollegeSubject.objects.all()
    serializer_class = CollegeSubjectSerializer
    permission_classes = [CanManageCourses]
    filterset_fields = ["college", "subject"]

class SemesterSubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage subjects assigned to a specific semester.
    """
    queryset = SemesterSubject.objects.all()
    serializer_class = SemesterSubjectSerializer
    permission_classes = [IsCollegeManagementAdmin]
    filterset_fields = ["semester"]

    def get_queryset(self):
        qs = SemesterSubject.objects.select_related("subject", "semester")
        semester_id = self.request.query_params.get("semester")
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        return qs

    def perform_create(self, serializer):
        # Validate that the subject is allowed for this college
        semester = serializer.validated_data['semester']
        subject = serializer.validated_data['subject']
        
        # Check if subject is assigned to the college of the batch/semester
        college = semester.batch.college
        if not CollegeSubject.objects.filter(college=college, subject=subject).exists():
            raise serializers.ValidationError(
                f"Subject '{subject.subject_name}' is not assigned to this college."
            )
        
        serializer.save()


class SectionSubjectFacultyViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage faculty assigned to subjects per section.
    """
    queryset = SectionSubjectFaculty.objects.all()
    serializer_class = SectionSubjectFacultySerializer
    permission_classes = [IsAuthenticatedUser]
    filterset_fields = ["semester_subject", "section", "faculty"]

    def get_queryset(self):
        qs = SectionSubjectFaculty.objects.select_related("semester_subject__subject", "section", "faculty__user")
        user = self.request.user

        if user.role == "faculty":
            # For faculty, only show their own assignments
            qs = qs.filter(faculty__user=user)
        elif user.role not in ["admin", "college_admin", "principal"]:
            # Other roles (like students) should not see assignments at all through this viewset
            # Unless they need it for something else? For now, restrict.
            return SectionSubjectFaculty.objects.none()

        sem_sub_id = self.request.query_params.get("semester_subject")
        section_id = self.request.query_params.get("section")
        
        if sem_sub_id:
            qs = qs.filter(semester_subject_id=sem_sub_id)
        if section_id:
            qs = qs.filter(section_id=section_id)
            
        return qs

    def perform_create(self, serializer):
        serializer.save()


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related("subject")
    permission_classes = [IsAuthenticatedUser]

    def get_serializer_class(self):
        return UnitSerializer if self.action == "retrieve" else UnitBasicSerializer

    def get_queryset(self):
        qs = Unit.objects.select_related("subject")
        user = self.request.user

        if user.role == "faculty":
            # For faculty, they can only see units of subjects linked to their college
            if hasattr(user, 'college') and user.college:
                assigned_subject_ids = CollegeSubject.objects.filter(college=user.college).values_list(
                    "subject_id", flat=True
                )
                qs = qs.filter(subject_id__in=assigned_subject_ids)
            # If no college assigned, fall through and apply subject filter below

        subject_id = self.request.query_params.get("subject")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        
        qs = qs.annotate(
            total_problems=Count(
                'questions', 
                filter=Q(questions__type='coding') & Q(questions__categories__contains=['practice']), 
                distinct=True
            ) + Count(
                'subunits__questions',
                filter=Q(subunits__questions__type='coding') & Q(subunits__questions__categories__contains=['practice']),
                distinct=True
            )
        )

        
        if self.request.user.is_authenticated:
            solved_subquery = StudentCodePractice.objects.filter(
                user=self.request.user,
                unit=OuterRef('pk'),
                status__in=['completed', 'evaluated'],
                question__type='coding',
                question__categories__contains=['practice']
            ).values('unit').annotate(cnt=Count('id')).values('cnt')
            
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
        subject_id = request.data.get("subject")
        subject = get_object_or_404(Subject, id=subject_id)

        if user.can_manage_content():
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        unit = self.get_object()
        subject = unit.subject
        user = request.user

        if user.can_manage_content():
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        unit = self.get_object()
        subject = unit.subject
        user = request.user

        if user.can_manage_content():
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)



class SubUnitViewSet(viewsets.ModelViewSet):
    queryset = SubUnit.objects.select_related("unit__subject")
    serializer_class = SubUnitSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        qs = SubUnit.objects.select_related("unit__subject")
        unit_id = self.request.query_params.get("unit")

        if unit_id:
            qs = qs.filter(unit_id=unit_id)

        user = self.request.user
        if user.role == "faculty":
            if hasattr(user, 'college') and user.college:
                assigned_subject_ids = CollegeSubject.objects.filter(college=user.college).values_list(
                    "subject_id", flat=True
                )
                qs = qs.filter(unit__subject_id__in=assigned_subject_ids)
            else:
                qs = qs.none()

        return qs

    def create(self, request, *a, **kw):
        user = request.user
        unit = get_object_or_404(Unit, id=request.data.get("unit"))
        subject = unit.subject

        if user.can_manage_content():
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        sub = self.get_object()
        subject = sub.unit.subject
        user = request.user

        if user.can_manage_content():
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        sub = self.get_object()
        subject = sub.unit.subject
        user = request.user

        if user.can_manage_content():
            return super().destroy(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.select_related("sub_unit__unit__subject")
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_queryset(self):
        qs = Video.objects.select_related("sub_unit__unit__subject")
        sub = self.request.query_params.get("sub_unit")

        if sub:
            qs = qs.filter(sub_unit_id=sub)

        user = self.request.user
        if user.role == "faculty":
            # Faculty can only see videos for subjects assigned to their college
            if hasattr(user, 'college') and user.college:
                assigned_subject_ids = CollegeSubject.objects.filter(college=user.college).values_list(
                    "subject_id", flat=True
                )
                qs = qs.filter(sub_unit__unit__subject_id__in=assigned_subject_ids)
            else:
                qs = qs.none()
        return qs

    def create(self, request, *a, **kw):
        sub_unit = get_object_or_404(SubUnit, id=request.data.get("sub_unit"))
        subject = sub_unit.unit.subject
        user = request.user

        if user.can_manage_content():
            return super().create(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *a, **kw):
        video = self.get_object()
        subject = video.sub_unit.unit.subject
        user = request.user

        if user.can_manage_content():
            return super().update(request, *a, **kw)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *a, **kw):
        video = self.get_object()
        subject = video.sub_unit.unit.subject
        user = request.user

        if user.can_manage_content():
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

        if user.role == "faculty":
            if hasattr(user, 'college') and user.college:
                assigned_subject_ids = CollegeSubject.objects.filter(college=user.college).values_list(
                    "subject_id", flat=True
                )
                qs = qs.filter(sub_unit__unit__subject_id__in=assigned_subject_ids)
            else:
                qs = qs.none()
        if user.role == "student":
            qs = qs.filter(
                Q(user=user) |
                Q(user__role__in=["faculty", "admin"])
            )

        if sid := self.request.query_params.get("sub_unit"):
            qs = qs.filter(sub_unit_id=sid)

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
        subject = note.sub_unit.unit.subject
        is_faculty = user.role == "faculty" and subject_assigned_to_college_faculty(user, subject)
        is_admin = user.role == "admin"
        if not (is_owner or is_faculty or is_admin):
            return Response({"error": "Not allowed"}, status=403)
        return super().update(request, *a, **kw)

    def destroy(self, request, *a, **kw):
        note = self.get_object()
        user = request.user
        is_owner = note.user == user
        subject = note.sub_unit.unit.subject
        is_faculty = user.role == "faculty" and subject_assigned_to_college_faculty(user, subject)
        is_admin = user.role == "admin"
        if not (is_owner or is_faculty or is_admin):
            return Response({"error": "Not allowed"}, status=403)
        return super().destroy(request, *a, **kw)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related(
        "subject", "unit", "sub_unit", "created_by"
    )
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_assigned_subject_ids(self, user):
        if user.is_staff or user.role == 'admin':
            return Subject.objects.values_list('id', flat=True)
        if hasattr(user, 'college') and user.college:
            return CollegeSubject.objects.filter(college=user.college).values_list('subject_id', flat=True)
        return []

    def get_queryset(self):
        from django.db import models

        qs = Question.objects.select_related(
            "subject", "unit", "sub_unit", "created_by"
        )
        user = self.request.user

        if user.role == "faculty":
            assigned_subject_ids = self.get_assigned_subject_ids(user)
            qs = qs.filter(
                models.Q(subject_id__in=assigned_subject_ids)
                | models.Q(unit__subject_id__in=assigned_subject_ids)
                | models.Q(sub_unit__unit__subject_id__in=assigned_subject_ids)
            )

        subject_id = self.request.query_params.get("subject")
        unit_id = self.request.query_params.get("unit")
        sub_unit_id = self.request.query_params.get("sub_unit")
        question_type = self.request.query_params.get("type")
        difficulty = self.request.query_params.get("difficulty")
        level = self.request.query_params.get("level")
        categories = self.request.query_params.get("categories")
        search = self.request.query_params.get("search")

        if subject_id:
            qs = qs.filter(
                models.Q(subject_id=subject_id)
                | models.Q(unit__subject_id=subject_id)
                | models.Q(sub_unit__unit__subject_id=subject_id)
            )
        if unit_id:
            qs = qs.filter(
                models.Q(unit_id=unit_id)
                | models.Q(sub_unit__unit_id=unit_id)
            )
        if sub_unit_id:
            qs = qs.filter(sub_unit_id=sub_unit_id)
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

        subject = None
        level = request.data.get("level")

        if level == "subject":
            subject_id = request.data.get("subject")
            subject = get_object_or_404(Subject, id=subject_id) if subject_id else None
        elif level == "unit":
            unit_id = request.data.get("unit")
            unit = get_object_or_404(Unit, id=unit_id) if unit_id else None
            subject = unit.subject if unit else None
        elif level == "subunit":
            sub_unit_id = request.data.get("sub_unit")
            sub_unit = (
                get_object_or_404(SubUnit, id=sub_unit_id) if sub_unit_id else None
            )
            subject = sub_unit.unit.subject if sub_unit else None

        # Check permissions
        if not subject:
            return Response({"error": "Invalid subject/unit/subunit"}, status=400)

        if user.can_manage_content():
            return super().create(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)

    def update(self, request, *args, **kwargs):
        question = self.get_object()
        user = request.user

        subject = None
        if question.subject:
            subject = question.subject
        elif question.unit:
            subject = question.unit.subject
        elif question.sub_unit:
            subject = question.sub_unit.unit.subject

        if not subject:
            return Response({"error": "Invalid question association"}, status=400)

        if user.can_manage_content():
            return super().update(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)

    def destroy(self, request, *args, **kwargs):
        question = self.get_object()
        user = request.user

        # Get the Subject for permission checking
        subject = None
        if question.subject:
            subject = question.subject
        elif question.unit:
            subject = question.unit.subject
        elif question.sub_unit:
            subject = question.sub_unit.unit.subject

        if not subject:
            return Response({"error": "Invalid question association"}, status=400)

        if user.can_manage_content():
            return super().destroy(request, *args, **kwargs)

        return Response({"error": "Not allowed"}, status=403)



class StudentSubjectProgressViewSet(viewsets.GenericViewSet):
    """
    ViewSet to handle student-specific actions like progress, continue learning, etc.
    Route: /api/subject/student-subject-progress/
    """

    queryset = UserSubjectProgress.objects.all()
    permission_classes = [IsAuthenticatedUser]

    @action(detail=False, methods=["post"])
    def mark_complete(self, request):
        user = request.user
        sub_unit_id = request.data.get("sub_unit_id")

        if not sub_unit_id:
            return Response({"error": "sub_unit_id is required"}, status=400)

        sub_unit = get_object_or_404(SubUnit, id=sub_unit_id)

        progress, created = UserSubjectProgress.objects.get_or_create(
            user=user,
            sub_unit=sub_unit,
            defaults={"subject": sub_unit.unit.subject, "unit": sub_unit.unit},
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
        sub_unit_id = request.data.get("sub_unit_id")
        answers = request.data.get("answers")
        score_percent = request.data.get("score_percent", 0)
        is_passed = request.data.get("is_passed", False)

        if not sub_unit_id:
            return Response({"error": "sub_unit_id is required"}, status=400)

        sub_unit = get_object_or_404(SubUnit, id=sub_unit_id)

        progress, _ = UserSubjectProgress.objects.get_or_create(
            user=user,
            sub_unit=sub_unit,
            defaults={"subject": sub_unit.unit.subject, "unit": sub_unit.unit},
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
        sub_unit_id = request.data.get("sub_unit_id")
        coding_status = request.data.get("coding_status", {})

        question_id = request.data.get("question_id")
        language = request.data.get("language")
        code = request.data.get("code")
        test_cases_basic = request.data.get("test_cases_basic", [])
        test_cases_advanced = request.data.get("test_cases_advanced", [])
        test_cases_custom = request.data.get("test_cases_custom", [])

        # Try to get SubUnit from sub_unit_id or derive from question
        sub_unit = None
        if sub_unit_id:
            try:
                sub_unit = SubUnit.objects.get(id=sub_unit_id)
            except SubUnit.DoesNotExist:
                return Response({"error": "SubUnit not found"}, status=400)
        elif question_id:
            # Try to get SubUnit from question
            try:
                question = get_object_or_404(Question, id=question_id)
                if question.sub_unit:
                    sub_unit = question.sub_unit
                elif question.unit:
                    # For Unit-level questions without sub_unit_id, we'll skip progress tracking
                    # but still allow code execution
                    sub_unit = None
                else:
                    return Response(
                        {"error": "Cannot determine SubUnit from question"}, status=400
                    )
            except Question.DoesNotExist:
                return Response({"error": "Question not found"}, status=400)
        else:
            return Response(
                {"error": "Either sub_unit_id or question_id is required"}, status=400
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
                    subject=sub_unit.unit.subject if sub_unit else None,
                    unit=sub_unit.unit if sub_unit else None,
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
        if sub_unit:
            progress, _ = UserSubjectProgress.objects.get_or_create(
                user=user,
                sub_unit=sub_unit,
                defaults={"subject": sub_unit.unit.subject, "unit": sub_unit.unit},
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
                sub_unit=sub_unit, type="coding"
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
            if sub_unit and progress.coding_score > 0: 
                 pass
        else:
            # No SubUnit
            pass
            
        # Check if current submission was successful to award XP
        if question_id and test_results.get("passed", 0) == test_results.get("total", 0):
             GamificationService.record_activity(user, 'coding')

        response_data = {
            "message": "Coding progress updated"
            if sub_unit
            else "Code executed successfully",
            "progress": new_percent if sub_unit else 0,
            "is_completed": progress.is_completed if sub_unit else False,
            "coding_score": coding_score if sub_unit else 0,
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
                "message": "StudentSubjectProgressViewSet is working",
                "user": str(request.user),
            }
        )

    @action(detail=False, methods=["post"])
    def mark_video_watched(self, request):
        """
        Mark videos as watched for a SubUnit (20% progress).
        """
        user = request.user
        sub_unit_id = request.data.get("sub_unit_id")

        if not sub_unit_id:
            return Response({"error": "sub_unit_id is required"}, status=400)

        sub_unit = get_object_or_404(SubUnit, id=sub_unit_id)

        progress, created = UserSubjectProgress.objects.get_or_create(
            user=user,
            sub_unit=sub_unit,
            defaults={"subject": sub_unit.unit.subject, "unit": sub_unit.unit},
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

        subject = last_progress.subject

        total_lessons = SubUnit.objects.filter(unit__subject=subject).count()

        user_progress_list = UserSubjectProgress.objects.filter(user=user, subject=subject)
        total_percent_sum = sum(p.progress_percent for p in user_progress_list)

        avg_percent = 0
        if total_lessons > 0:
            avg_percent = round(total_percent_sum / total_lessons)

        return Response(
            {
                "subject_id": subject.id,
                "subject_name": subject.name,
                "unit_id": last_progress.unit.id if last_progress.unit else None,
                "sub_unit_id": last_progress.sub_unit.id,
                "sub_unit_name": last_progress.sub_unit.name,
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
        user = self.request.user
        target_user_id = request.query_params.get("user_id")

        if target_user_id:
            if not user.can_manage_content():
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            target_user = get_object_or_404(User, id=target_user_id)
            
            # Simple visibility check: if not superuser, must be same college
            if not user.is_staff and user.college != target_user.college:
                return Response({"error": "Permission denied (College mismatch)"}, status=status.HTTP_403_FORBIDDEN)
            
            user_to_query = target_user
        else:
            user_to_query = user

        # Calculate stats
        completed_count = UserSubjectProgress.objects.filter(
            user=user_to_query, is_completed=True
        ).count()

        # Calculate average progress
        avg_progress = 0
        total_minutes = 0

        progress_records = UserSubjectProgress.objects.filter(user=user_to_query)

        if progress_records.exists():
            for p in progress_records:
                total_minutes += 5  # Base
                if p.is_videos_watched:
                    total_minutes += 15
                if p.is_quiz_completed:
                    total_minutes += 10
                if p.is_coding_completed:
                    total_minutes += 25

            course_map = {}  # {subject_id: sum_of_percentages}
            for p in progress_records:
                cid = p.subject_id
                course_map[cid] = course_map.get(cid, 0) + p.progress_percent

            # 2. Calculate % for each Subject
            total_course_pct = 0
            for cid, current_sum in course_map.items():
                total_subs = SubUnit.objects.filter(unit__subject_id=cid).count()
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
        gamification_profile = GamificationService.get_or_create_profile(user_to_query)
        streak = gamification_profile.current_streak
        longest_streak = gamification_profile.longest_streak
        xp = gamification_profile.total_xp
        level = gamification_profile.current_level

        # Overall Attendance and Active Days
        overall_attendance = 0
        active_days = 0
        
        # Filter attendance by subjects assigned to this student
        relevant_subject_ids = set()
        student_profile = StudentProfile.objects.filter(user=user_to_query).first()
        if student_profile:
            if student_profile.semester:
                relevant_subject_ids.update(SemesterSubject.objects.filter(semester=student_profile.semester).values_list('subject_id', flat=True))
            if student_profile.section:
                relevant_subject_ids.update(SectionSubjectFaculty.objects.filter(section=student_profile.section).values_list('semester_subject__subject_id', flat=True))

        attendance_qs = AttendanceRecord.objects.filter(student__user=user_to_query)
        if relevant_subject_ids:
            attendance_qs = attendance_qs.filter(session__section_subject_faculty__semester_subject__subject_id__in=relevant_subject_ids)

        total_sessions = attendance_qs.count()
        if total_sessions > 0:
            present_records = attendance_qs.filter(is_present=True)
            present_sessions = present_records.count()
            overall_attendance = round((present_sessions / total_sessions) * 100)
            
            # Count unique dates as active days (within relevant subjects)
            active_days = present_records.values('session__date').distinct().count()

        return Response(
            {
                "lessons_completed": completed_count,
                "time_spent": time_spent_str,
                "avg_progress": avg_progress,
                "streak": streak,
                "longest_streak": longest_streak,
                "xp": xp,
                "level": level,
                "overall_attendance": overall_attendance,
                "active_days": active_days,
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
        user = self.request.user
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
        Get overall progress percentage for all subjects.
        For students, includes all subjects assigned to their semester and section.
        """
        user = self.request.user
        target_user_id = request.query_params.get("user_id")

        if target_user_id:
            if not user.can_manage_content():
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            target_user = get_object_or_404(User, id=target_user_id)
            if not user.is_staff and user.college != target_user.college:
                return Response({"error": "Permission denied (College mismatch)"}, status=status.HTTP_403_FORBIDDEN)
            user_to_query = target_user
        else:
            user_to_query = user

        # 1. Identify subjects to report on.
        subject_ids = set()
        student_profile = StudentProfile.objects.filter(user=user_to_query).first()
        
        if student_profile:
            # Subjects from Semester assignment
            if student_profile.semester:
                semester_subs = SemesterSubject.objects.filter(semester=student_profile.semester)
                for ss in semester_subs:
                    subject_ids.add(ss.subject_id)
            
            # Subjects from Section/Faculty assignment
            if student_profile.section:
                section_subs = SectionSubjectFaculty.objects.filter(section=student_profile.section)
                for ssf in section_subs:
                    subject_ids.add(ssf.semester_subject.subject_id)
        
        # 2. Also include any subjects with existing progress records (e.g. electives not in core list)
        progress_records = UserSubjectProgress.objects.filter(user=user_to_query).select_related("subject")
        for p in progress_records:
            subject_ids.add(p.subject_id)
            
        results = []
        subjects_map = {s.id: s for s in Subject.objects.filter(id__in=subject_ids)}

        for sid in subject_ids:
            subject = subjects_map.get(sid)
            if not subject: continue
            
            sub_progress = progress_records.filter(subject_id=sid)
            total_subs = SubUnit.objects.filter(unit__subject_id=sid).count()
            
            # Calculate metrics, default to 0 if no subunits or no progress
            sum_progress = 0.0
            percent = 0.0
            video_pct = 0
            avg_quiz = 0
            avg_coding = 0
            tasks_completed = 0
            
            if total_subs > 0:
                sum_progress = sub_progress.aggregate(s=Sum('progress_percent'))['s'] or 0.0
                percent = round(min(sum_progress / total_subs, 100.0), 1)
                
                video_count = sub_progress.filter(is_videos_watched=True).count()
                video_pct = round((video_count / total_subs) * 100)
                
                avg_quiz_raw = sub_progress.aggregate(avg=Coalesce(Sum('quiz_score'), 0.0))['avg'] or 0.0
                avg_quiz = round(avg_quiz_raw / total_subs)
                
                avg_coding_raw = sub_progress.aggregate(avg=Coalesce(Sum('coding_score'), 0.0))['avg'] or 0.0
                avg_coding = round(avg_coding_raw / total_subs)
                
                tasks_completed = sub_progress.filter(is_completed=True).count()

            # Attendance per subject
            attendance_pct = 0
            subject_sessions = AttendanceRecord.objects.filter(
                student__user=user_to_query,
                session__section_subject_faculty__semester_subject__subject_id=sid
            ).count()
            if subject_sessions > 0:
                present_count = AttendanceRecord.objects.filter(
                    student__user=user_to_query,
                    is_present=True,
                    session__section_subject_faculty__semester_subject__subject_id=sid
                ).count()
                attendance_pct = round((present_count / subject_sessions) * 100)

            results.append({
                "subject_id": str(sid),
                "subject_name": subject.subject_name,
                "subject_code": subject.short_code,
                "percent": percent,
                "video_pct": video_pct,
                "avg_quiz_score": avg_quiz,
                "avg_coding_score": avg_coding,
                "attendance_pct": attendance_pct,
                "tasks_completed": tasks_completed,
                "tasks_total": total_subs
            })

        return Response(results)

    @action(detail=False, methods=["get"])
    def get_subject_progress(self, request):
        user = self.request.user
        subject_id = request.query_params.get("subject_id")

        if not subject_id:
            return Response({"error": "subject_id is required"}, status=400)

        progress_qs = UserSubjectProgress.objects.filter(user=user, subject_id=subject_id)

        data = {}
        for p in progress_qs:
            data[str(p.sub_unit.id)] = {
                "progress_percent": p.progress_percent,
                "is_completed": p.is_completed,
            }

        return Response(data)

    @action(detail=False, methods=["get"])
    def get_user_progress_details(self, request):
        """
        Get detailed progress for all subunits in a Subject, including quiz/coding status.
        Recalculates progress on-the-fly to ensure consistency with Subject content changes (e.g. added/removed questions).
        """
        user = self.request.user
        subject_id = request.query_params.get("subject_id")
        target_user_id = request.query_params.get("user_id")

        if not subject_id:
            return Response({"error": "subject_id is required"}, status=400)

        if target_user_id:
            if not user.can_manage_content():
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            target_user = get_object_or_404(User, id=target_user_id)
            if not user.is_staff and user.college != target_user.college:
                return Response({"error": "Permission denied (College mismatch)"}, status=status.HTTP_403_FORBIDDEN)
            user_to_query = target_user
        else:
            user_to_query = user

        # Updated to use unit__subject_id or sub_unit queries
        progress_qs = (
            UserSubjectProgress.objects.filter(user=user_to_query, subject_id=subject_id)
            .select_related("sub_unit")
            .prefetch_related("sub_unit__questions")
        )

        updated_records = []
        for p in progress_qs:
            p.calculate_progress()
            updated_records.append(p)

        if updated_records:
            UserSubjectProgress.objects.bulk_update(
                updated_records, ["progress_percent", "is_completed"]
            )

        from .serializers import UserSubjectProgressSerializer

        serializer = UserSubjectProgressSerializer(updated_records, many=True)

        data = {str(item["sub_unit"]): item for item in serializer.data}

        return Response(data)

    @action(detail=False, methods=["post"])
    def log_access(self, request):
        """
        Log access to a SubUnit to update 'Continue Learning' banner.
        Does not change completion status, just updates timestamps.
        """
        user = self.request.user
        sub_unit_id = request.data.get("sub_unit_id")

        if not sub_unit_id:
            return Response({"error": "sub_unit_id is required"}, status=400)

        sub_unit = get_object_or_404(SubUnit, id=sub_unit_id)

        progress, created = UserSubjectProgress.objects.get_or_create(
            user=user,
            sub_unit=sub_unit,
            defaults={"subject": sub_unit.unit.subject, "unit": sub_unit.unit},
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
            subject_id = request.data.get("subject_id")
            unit_id = request.data.get("unit_id")
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

                subject = None
                unit = None

                if subject_id:
                    try:
                        subject = Subject.objects.get(id=subject_id)
                    except Subject.DoesNotExist:
                        pass

                if unit_id:
                    try:
                        unit = Unit.objects.get(id=unit_id)
                    except Unit.DoesNotExist:
                        pass

                if not subject:
                    subject = question.subject
                if not unit:
                    unit = question.unit
                    if not unit and question.sub_unit:
                        unit = question.sub_unit.unit

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

                    if subject_id and not submission.subject:
                        submission.subject = subject
                    elif not submission.subject and question.subject:
                        submission.subject = question.subject

                    if unit_id and not submission.unit:
                        submission.unit = unit
                    elif not submission.unit and question.unit:
                        submission.unit = question.unit
                    elif (
                        not submission.unit
                        and question.sub_unit
                        and question.sub_unit.unit
                    ):
                        submission.unit = question.sub_unit.unit

                    submission.save()

                else:
                    submission = StudentCodePractice.objects.create(
                        user=request.user,
                        question=question,
                        subject=subject,
                        unit=unit,
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
                    "type": "motivation", 
                    "title": "Short Title", 
                    "description": "Encouraging message", 
                    "icon_name": "Award"
                }}
            ]
        }}
        """

        # 4. Call AI Agent
        try:
            # Using 'code_tutor' or general agent
            agent = AIAgent.objects.filter(role='code_tutor').first()
            if not agent:
                 # Fallback to any agent or specific config
                 agent = AIAgent.objects.first()
            
            if not agent:
                return Response({"error": "AI Service not configured"}, status=503)

            ai_service = AIServiceFactory.get_service()
            response = ai_service.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a coding mentor."},
                    {"role": "user", "content": prompt}
                ],
                model=agent.model,
                temperature=0.7
            )
            
            content = response.get("content", "{}")
            # Parse JSON from content (it might be wrapped in ```json ... ```)
            import json
            import re
            
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
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



