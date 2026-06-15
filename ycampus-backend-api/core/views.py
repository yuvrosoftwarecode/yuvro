from rest_framework import viewsets, status, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Count, Avg, Q, Sum
from django.utils import timezone
from django.db import models

from .models import (
    College,
    StudentProfile,
    FacultyProfile,
    HODProfile,
    PrincipalProfile,
    CollegeAdminProfile,
    PlacementOfficerProfile,
    Department,
    AttendanceSession,
    AttendanceRecord,
    Section,
    Task,
    TaskSubmission,
    TaskSubmissionHistory,
    TaskComment,
    Note,
    Announcement,
    University,
)
from course.models import SectionSubjectFaculty
from .serializers import (
    StudentProfileSerializer,
    FacultyProfileSerializer,
    HODProfileSerializer,
    PrincipalProfileSerializer,
    CollegeAdminProfileSerializer,
    PlacementOfficerProfileSerializer,
    AttendanceSessionSerializer,
    AttendanceRecordSerializer,
    TaskSerializer,
    TaskSubmissionSerializer,
    TaskSubmissionHistorySerializer,
    TaskCommentSerializer,
    NoteSerializer,
    AnnouncementSerializer,
    UniversitySerializer,
)
from authentication.permissions import IsCollegeManagementAdmin, IsCollegeManagementOrHOD, IsAuthenticatedUser
from django.shortcuts import get_object_or_404


class UniversityViewSet(viewsets.ModelViewSet):
    queryset = University.objects.all()
    serializer_class = UniversitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["name", "short_form"]
    filterset_fields = ["name"]


User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == "admin"


class IsCollegeAdminOrPrincipal(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role in [
            "admin",
            "college_admin",
            "principal",
        ]

class IsCollegeManagementOrFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role in [
            "admin",
            "college_admin",
            "principal",
            "faculty",
            "student",
        ]


class StudentPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class CollegeUserAllocationViewSet(viewsets.ViewSet):
    """
    ViewSet to handle allocation of Principal, College Admin and HOD
    """

    permission_classes = [permissions.IsAuthenticated, IsCollegeAdminOrPrincipal]

    def _check_admin_only(self, user):
        if user.role != "admin":
             return Response(
                {"detail": "Only platform administrators can perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    @action(detail=True, methods=["post"], url_path="allocate-principal")
    def allocate_principal(self, request, pk=None):
        """
        Allocate a user as Principal of a college.
        Payload: { "user_id": "uuid" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        college = get_object_or_404(College, pk=pk)
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, pk=user_id)

        try:
            with transaction.atomic():
                # Update user role
                user.role = "principal"
                user.save()

                # Create or update profile
                # Check if this user is already a principal elsewhere and remove?
                PrincipalProfile.objects.filter(user=user).delete()
                
                # Check if college already has THIS principal?
                # No need to delete existing principals of the college as we now support multiple.
                
                PrincipalProfile.objects.create(user=user, college=college)


            return Response(
                {"message": f"User {user.email} allocated as Principal of {college.name}"}
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="allocate-admin")
    def allocate_college_admin(self, request, pk=None):
        """
        Allocate a user as College Admin.
        Payload: { "user_id": "uuid" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        college = get_object_or_404(College, pk=pk)
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, pk=user_id)

        try:
            with transaction.atomic():
                # Update user role
                user.role = "college_admin"
                user.save()

                # Remove existing admin profile for this user if exists
                CollegeAdminProfile.objects.filter(user=user).delete()

                # Create profile
                CollegeAdminProfile.objects.create(user=user, college=college)

            return Response(
                {
                    "message": f"User {user.email} allocated as College Admin of {college.name}"
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="create-principal")
    def create_principal(self, request, pk=None):
        """
        Create a new user and allocate as Principal.
        Payload: { "email", "username", "first_name", "last_name", "password" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        college = get_object_or_404(College, pk=pk)
        data = request.data
        
        required_fields = ["email", "username", "first_name", "last_name", "password"]
        if not all(field in data for field in required_fields):
             return Response(
                {"error": f"Missing required fields: {', '.join(required_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Create User
                user = User.objects.create_user(
                    email=data["email"],
                    username=data["username"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    password=data["password"],
                    role="principal"
                )

                # Create Principal Profile
                # We do NOT remove existing principals of the college anymore.
                PrincipalProfile.objects.create(user=user, college=college)

            return Response(
                {"message": f"User {user.email} created and allocated as Principal of {college.name}"},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="create-admin")
    def create_college_admin(self, request, pk=None):
        """
        Create a new user and allocate as College Admin.
        Payload: { "email", "username", "first_name", "last_name", "password" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        college = get_object_or_404(College, pk=pk)
        data = request.data
        
        required_fields = ["email", "username", "first_name", "last_name", "password"]
        if not all(field in data for field in required_fields):
             return Response(
                {"error": f"Missing required fields: {', '.join(required_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Create User
                user = User.objects.create_user(
                    email=data["email"],
                    username=data["username"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    password=data["password"],
                    role="college_admin"
                )

                # Create College Admin Profile
                CollegeAdminProfile.objects.create(user=user, college=college)

            return Response(
                {"message": f"User {user.email} created and allocated as College Admin of {college.name}"},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=True, methods=["post"], url_path="create-tpo")
    def create_placement_officer(self, request, pk=None):
        """
        Create a new user and allocate as Placement Officer (TPO).
        Payload: { "email", "username", "first_name", "last_name", "password" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        college = get_object_or_404(College, pk=pk)
        data = request.data
        
        required_fields = ["email", "username", "first_name", "last_name", "password"]
        if not all(field in data for field in required_fields):
             return Response(
                {"error": f"Missing required fields: {', '.join(required_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Create User
                user = User.objects.create_user(
                    email=data["email"],
                    username=data["username"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    password=data["password"],
                    role="placement_officer"
                )

                # Create Placement Officer Profile
                PlacementOfficerProfile.objects.create(user=user, college=college)

            return Response(
                {"message": f"User {user.email} created and allocated as TPO of {college.name}"},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="update-staff")
    def update_staff_member(self, request, pk=None):
        """
        Update staff member details.
        Payload: { "user_id": "uuid", "first_name", "last_name", "email" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        user = get_object_or_404(User, pk=user_id)
        
        try:
            if "first_name" in request.data:
                user.first_name = request.data["first_name"]
            if "last_name" in request.data:
                user.last_name = request.data["last_name"]
            if "email" in request.data:
                user.email = request.data["email"]
                # Ideally we should validate email uniqueness here if changed
            
            user.save()
            return Response({"message": "Staff member updated successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="delete-staff")
    def delete_staff_member(self, request, pk=None):
        """
        Delete staff member (Principal or College Admin).
        Payload: { "user_id": "uuid" }
        """
        if resp := self._check_admin_only(request.user):
            return resp
            
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        user = get_object_or_404(User, pk=user_id)
        
        try:
            with transaction.atomic():
                # Delete profiles
                PrincipalProfile.objects.filter(user=user).delete()
                CollegeAdminProfile.objects.filter(user=user).delete()
                
                # Delete user account (Assuming they are created for this purpose)
                user.delete()
                
            return Response({"message": "Staff member deleted successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="create-hod")
    def create_hod(self, request, pk=None):
        """
        Create a new user and allocate as HOD.
        Payload: { "email", "username", "first_name", "last_name", "password", "department_id" }
        """
        college = get_object_or_404(College, pk=pk)
        data = request.data
        
        required_fields = ["email", "username", "first_name", "last_name", "password", "department_id"]
        if not all(field in data for field in required_fields):
             return Response(
                {"error": f"Missing required fields: {', '.join(required_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        department = get_object_or_404(Department, pk=data["department_id"], college=college)

        try:
            with transaction.atomic():
                # 1. Handle existing HOD if any
                existing_hod_profile = HODProfile.objects.filter(department=department).first()
                if existing_hod_profile:
                    old_hod_user = existing_hod_profile.user
                    # Demote to faculty role
                    old_hod_user.role = "faculty"
                    old_hod_user.save()
                    # Delete HOD profile
                    existing_hod_profile.delete()
                    # Create Faculty profile if not exists
                    FacultyProfile.objects.get_or_create(
                        user=old_hod_user,
                        college=college,
                        defaults={'department': department}
                    )

                # 2. Create New User
                user = User.objects.create_user(
                    email=data["email"],
                    username=data["username"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    password=data["password"],
                    role="hod"
                )

                # 3. Create HOD Profile
                HODProfile.objects.create(user=user, college=college, department=department)

            return Response(
                {"message": f"User {user.email} created and allocated as HOD of {department.name}"},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="allocate-hod")
    def allocate_hod(self, request, pk=None):
        """
        Allocate an existing user (usually faculty) as HOD of a department.
        If the user was faculty, they become HOD.
        If there was an existing HOD, they become faculty.
        Payload: { "user_id": "uuid", "department_id": "uuid" }
        """
        college = get_object_or_404(College, pk=pk)
        data = request.data
        
        required_fields = ["user_id", "department_id"]
        if not all(field in data for field in required_fields):
             return Response(
                {"error": f"Missing required fields: {', '.join(required_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        department = get_object_or_404(Department, pk=data["department_id"], college=college)
        new_hod_user = get_object_or_404(User, pk=data["user_id"])

        try:
            with transaction.atomic():
                # 1. Handle existing HOD for this department
                existing_hod_profile = HODProfile.objects.filter(department=department).first()
                if existing_hod_profile:
                    if existing_hod_profile.user == new_hod_user:
                        return Response({"message": "User is already HOD of this department"}, status=status.HTTP_200_OK)
                    
                    old_hod_user = existing_hod_profile.user
                    # Demote to faculty
                    old_hod_user.role = "faculty"
                    old_hod_user.save()
                    existing_hod_profile.delete()
                    # Create faculty profile
                    FacultyProfile.objects.get_or_create(
                        user=old_hod_user, 
                        college=college, 
                        defaults={'department': department}
                    )

                # 2. Handle the new HOD user
                # If they were faculty, delete faculty profile
                FacultyProfile.objects.filter(user=new_hod_user).delete()
                
                # Update role
                new_hod_user.role = "hod"
                new_hod_user.save()

                # Create HOD Profile
                HODProfile.objects.get_or_create(
                    user=new_hod_user, 
                    college=college, 
                    department=department
                )

            return Response(
                {"message": f"User {new_hod_user.email} allocated as HOD of {department.name}"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FacultyProfileViewSet(viewsets.ModelViewSet):
    queryset = FacultyProfile.objects.all()
    serializer_class = FacultyProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsCollegeManagementOrHOD]
    filterset_fields = ["college", "department"]

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        """
        Get statistics for the faculty dashboard.
        Optional filters: subject_id, department_id
        """
        user = request.user
        if user.role != "faculty":
            return Response({"error": "Only faculty can access these stats"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            faculty_profile = user.faculty_profile
        except FacultyProfile.DoesNotExist:
            return Response({"error": "Faculty profile not found"}, status=status.HTTP_404_NOT_FOUND)

        subject_id = request.query_params.get("subject_id")
        department_id = request.query_params.get("department_id")
        section_id = request.query_params.get("section_id")

        from course.models import SectionSubjectFaculty
        
        # Base assignments queryset
        assignments = SectionSubjectFaculty.objects.filter(faculty=faculty_profile)
        
        if department_id:
            assignments = assignments.filter(semester_subject__semester__batch__department_id=department_id)
        
        if subject_id:
            assignments = assignments.filter(semester_subject__subject_id=subject_id)
            
        if section_id:
            assignments = assignments.filter(section_id=section_id)

        # 1. Total Courses (Unique subjects currently assigned)
        total_courses = assignments.values('semester_subject__subject').distinct().count()

        # 2. Total Students (Sum of students in all assigned sections)
        sections = assignments.values_list('section', flat=True)
        total_students = StudentProfile.objects.filter(section__in=sections).count()

        # 3. Total Assessments (Tasks created by faculty)
        tasks = Task.objects.filter(faculty=faculty_profile)
        if subject_id:
            tasks = tasks.filter(subject_id=subject_id)
        if department_id:
            tasks = tasks.filter(department_id=department_id)
        if section_id:
            tasks = tasks.filter(sections__id=section_id)
        total_assessments = tasks.count()

        # 4. Average Attendance
        # Get sessions for these assignments
        from core.models import AttendanceSession, AttendanceRecord
        sessions = AttendanceSession.objects.filter(section_subject_faculty__in=assignments)
        
        avg_attendance = 0
        if sessions.exists():
            # Calculate average attendance across these sessions
            # Formula: (Present Records / Total Records) * 100
            total_records = AttendanceRecord.objects.filter(session__in=sessions).count()
            if total_records > 0:
                present_records = AttendanceRecord.objects.filter(session__in=sessions, is_present=True).count()
                avg_attendance = (present_records / total_records) * 100

        return Response({
            "total_courses": total_courses,
            "total_students": total_students,
            "total_assessments": total_assessments,
            "average_attendance": round(avg_attendance, 1)
        })

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # If user is a College Admin, Principal or HOD, filter by their college
        if user.role in ["college_admin", "principal", "hod"]:
            college = user.college
            if college:
                return queryset.filter(college=college)
            return queryset.none()
            
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        user_data = data.pop("user", None)
        linked_departments_ids = data.pop("linked_departments", [])
        
        if not user_data:
            return Response({"error": "User data is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        required_user_fields = ["email", "username", "first_name", "last_name", "password"]
        if not all(field in user_data for field in required_user_fields):
            return Response(
                {"error": f"Missing user fields: {', '.join(required_user_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # 1. Create User
                user = User.objects.create_user(
                    email=user_data["email"],
                    username=user_data["username"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    password=user_data["password"],
                    role="faculty"
                )

                # 2. Create Faculty Profile
                college_id = data.get("college")
                department_id = data.get("department")
                designation = data.get("designation")

                college = get_object_or_404(College, pk=college_id) if college_id else None
                department = get_object_or_404(Department, pk=department_id) if department_id else None

                profile = FacultyProfile.objects.create(
                    user=user,
                    college=college,
                    department=department,
                    designation=designation
                )
                
                # 3. Set LinkedIn Departments
                if linked_departments_ids:
                    profile.linked_departments.set(linked_departments_ids)
                
                serializer = self.get_serializer(profile)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        user_data = data.pop("user", None)
        linked_departments_ids = data.pop("linked_departments", None)

        try:
            with transaction.atomic():
                # 1. Update User if data provided
                if user_data:
                    user = instance.user
                    if "first_name" in user_data:
                        user.first_name = user_data["first_name"]
                    if "last_name" in user_data:
                        user.last_name = user_data["last_name"]
                    if "email" in user_data:
                        user.email = user_data["email"]
                    if "username" in user_data:
                        user.username = user_data["username"]
                    user.save()

                # 2. Update Profile with remaining data
                if "college" in data and isinstance(data["college"], str):
                    try:
                        data["college"] = College.objects.get(pk=data["college"]).id
                    except College.DoesNotExist:
                        pass
                
                if "department" in data and isinstance(data["department"], str):
                    try:
                        data["department"] = Department.objects.get(pk=data["department"]).id
                    except Department.DoesNotExist:
                        pass

                serializer = self.get_serializer(instance, data=data, partial=partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)

                # 3. Update Linked Departments if provided
                if linked_departments_ids is not None:
                    instance.linked_departments.set(linked_departments_ids)

                return Response(self.get_serializer(instance).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            with transaction.atomic():
                user = instance.user
                instance.delete()
                # Also delete the user account
                user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsCollegeManagementOrFaculty]
    filterset_fields = {
        "college": ["exact"],
        "department": ["exact"],
        "batch": ["exact"],
        "batch__name": ["exact"],
        "semester": ["exact"],
        "section": ["exact"],
        "semester__number": ["exact"],
        "section__name": ["exact"],
        "admission_type": ["exact"],
        "is_detained": ["exact"],
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__first_name", "user__last_name", "user__email", "roll_number"]
    ordering_fields = ["user__first_name", "user__last_name", "roll_number", "created_at"]
    ordering = ["user__first_name"]
    pagination_class = StudentPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # If user is a student, filter to only their profile
        if user.role == "student":
            return queryset.filter(user=user)
            
        # If user is a College Admin, Principal or Faculty, filter by their college
        if user.role in ["college_admin", "principal", "faculty"]:
            college = user.college
            if college:
                return queryset.filter(college=college)
            return queryset.none()

        # Students can only see their own profile
        if user.role == "student":
            return queryset.filter(user=user)
            
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        user_data = data.pop("user", None)
        
        if not user_data:
            return Response({"error": "User data is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        required_user_fields = ["email", "username", "first_name", "last_name"]
        if not all(field in user_data for field in required_user_fields):
            return Response(
                {"error": f"Missing user fields: {', '.join(required_user_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Roll number is required for student profile
        roll_number = data.get("roll_number")
        if not roll_number:
            return Response({"error": "Roll number is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Get college from current user (College Admin/Principal)
                college = request.user.college
                if not college:
                    return Response({"error": "Could not determine college for the admin"}, status=status.HTTP_400_BAD_REQUEST)

                # 1. Create User
                # Password is not required as per user feedback - it will be set to unusable
                user = User.objects.create_user(
                    email=user_data["email"],
                    username=user_data["username"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role="student"
                )
                user.set_unusable_password()
                user.save()

                # 2. Create Student Profile
                from .models import College, Department, Batch, Semester, Section
                
                # Fetch objects if IDs provided
                dept_id = data.get("department")
                batch_id = data.get("batch")
                semester_id = data.get("semester")
                section_id = data.get("section")
                
                department = Department.objects.filter(id=dept_id).first() if dept_id else None
                batch = Batch.objects.filter(id=batch_id).first() if batch_id else None
                semester = Semester.objects.filter(id=semester_id).first() if semester_id else None
                section = Section.objects.filter(id=section_id).first() if section_id else None

                profile = StudentProfile.objects.create(
                    user=user,
                    college=college,
                    department=department,
                    batch=batch,
                    semester=semester,
                    section=section,
                    roll_number=roll_number,
                    phone_number=data.get("phone_number"),
                    admission_type=data.get("admission_type", "regular"),
                    is_detained=data.get("is_detained", False)
                )
                
                serializer = self.get_serializer(profile)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        user_data = data.pop("user", None)

        try:
            with transaction.atomic():
                # 1. Update User if data provided
                if user_data:
                    user = instance.user
                    if "email" in user_data:
                        user.email = user_data["email"]
                    if "username" in user_data:
                        user.username = user_data["username"]
                    if "first_name" in user_data:
                        user.first_name = user_data["first_name"]
                    if "last_name" in user_data:
                        user.last_name = user_data["last_name"]
                    user.save()

                # 2. Update Profile fields
                # Fetch objects if IDs provided
                dept_id = data.get("department")
                batch_id = data.get("batch")
                semester_id = data.get("semester")
                section_id = data.get("section")
                
                from .models import Department, Batch, Semester, Section
                if dept_id is not None:
                    instance.department = Department.objects.filter(id=dept_id).first() if dept_id else None
                if batch_id is not None:
                    instance.batch = Batch.objects.filter(id=batch_id).first() if batch_id else None
                if semester_id is not None:
                    instance.semester = Semester.objects.filter(id=semester_id).first() if semester_id else None
                if section_id is not None:
                    instance.section = Section.objects.filter(id=section_id).first() if section_id else None

                if "roll_number" in data:
                    instance.roll_number = data["roll_number"]
                if "phone_number" in data:
                    instance.phone_number = data["phone_number"]
                if "admission_type" in data:
                    instance.admission_type = data["admission_type"]
                if "is_detained" in data:
                    instance.is_detained = data["is_detained"]
                
                instance.save()
                
                serializer = self.get_serializer(instance)
                return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            with transaction.atomic():
                user = instance.user
                instance.delete()
                # Also delete the user account
                user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        pass

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        """
        Bulk import students from a CSV or Excel (.xlsx) file.
        Payload: { "file": File, "department": UUID (optional), "batch": UUID (optional) }
        """
        import csv
        import io
        from .models import College, Department, Batch, Semester, Section
        try:
            import openpyxl
        except ImportError:
            openpyxl = None

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        is_csv = file.name.endswith('.csv')
        is_xlsx = file.name.endswith('.xlsx')

        if not is_csv and not is_xlsx:
            return Response({"error": "Only CSV and Excel (.xlsx) files are supported"}, status=status.HTTP_400_BAD_REQUEST)

        if is_xlsx and not openpyxl:
            return Response({"error": "Excel support is not installed on the server (openpyxl missing)"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Get defaults from request data
        default_dept_id = request.data.get("department")
        default_batch_id = request.data.get("batch")

        college = request.user.college
        if not college:
            return Response({"error": "Could not determine college for the admin"}, status=status.HTTP_400_BAD_REQUEST)

        rows = []
        try:
            if is_csv:
                # Robust CSV encoding detection
                content = file.read()
                try:
                    decoded_file = content.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        decoded_file = content.decode('latin-1')
                    except UnicodeDecodeError:
                        return Response({"error": "Failed to decode CSV file. Please ensure it is UTF-8 or Latin-1 encoded."}, status=status.HTTP_400_BAD_REQUEST)
                
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                rows = list(reader)
            else:
                # Excel processing
                wb = openpyxl.load_workbook(file, data_only=True)
                ws = wb.active
                
                # Get headers from first row
                headers = [str(cell.value).strip() if cell.value else None for cell in ws[1]]
                
                for row_data in ws.iter_rows(min_row=2, values_only=True):
                    row_dict = {}
                    for i, value in enumerate(row_data):
                        if i < len(headers) and headers[i]:
                            row_dict[headers[i]] = value
                    if any(row_dict.values()): # Skip empty rows
                        rows.append(row_dict)

        except Exception as e:
            return Response({"error": f"Failed to parse file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Flexible Header Mapping
        header_mapping = {
            "email": ["email", "email address", "email_address", "mail", "user email"],
            "first_name": ["first name", "firstname", "first_name", "fname", "given name"],
            "last_name": ["last name", "lastname", "last_name", "lname", "surname", "family name"],
            "roll_number": ["roll number", "roll_number", "rollno", "roll no", "id", "student id", "registration number", "roll"],
            "phone_number": ["phone number", "phone_number", "phone", "phone no", "mobile", "mobile number", "contact", "contact number"],
            "department": ["department", "dept", "department name", "branch", "stream"],
            "batch": ["batch", "year", "batch name", "class", "session"],
            "admission_type": ["admission type", "admission_type", "type", "admission"],
            "section": ["section", "sec", "class section", "allocation", "sec name"]
        }

        def normalize_str(s):
            return str(s or "").strip().lower().replace("_", " ").replace("-", " ")

        normalized_rows = []
        for row in rows:
            mapped_row = {}
            for original_key, value in row.items():
                norm_key = normalize_str(original_key)
                found = False
                for target_key, aliases in header_mapping.items():
                    if norm_key == target_key or norm_key in aliases:
                        mapped_row[target_key] = value
                        found = True
                        break
                if not found:
                    mapped_row[original_key] = value
            if any(str(v).strip() for v in mapped_row.values() if v is not None):
                normalized_rows.append(mapped_row)
        
        rows = normalized_rows

        results = {
            "total": 0,
            "created": 0,
            "errors": []
        }

        # Cache for performance
        department_cache = {}
        batch_cache = {}

        def get_department(dept_name_or_id):
            if not dept_name_or_id:
                return None
            if str(dept_name_or_id) in department_cache:
                return department_cache[str(dept_name_or_id)]
            
            # Try by ID first
            dept = Department.objects.filter(id=dept_name_or_id, college=college).first() if len(str(dept_name_or_id)) == 36 else None
            if not dept:
                # Try by Name
                dept = Department.objects.filter(name__iexact=str(dept_name_or_id), college=college).first()
            
            department_cache[str(dept_name_or_id)] = dept
            return dept

        def get_batch(batch_name_or_id, dept):
            if not batch_name_or_id:
                return None
            cache_key = f"{batch_name_or_id}_{dept.id if dept else 'none'}"
            if cache_key in batch_cache:
                return batch_cache[cache_key]
            
            # Try by ID first
            batch = Batch.objects.filter(id=batch_name_or_id, college=college).first() if len(str(batch_name_or_id)) == 36 else None
            if not batch:
                # Try by Name
                batch = Batch.objects.filter(name__iexact=str(batch_name_or_id), department=dept, college=college).first()
            
            batch_cache[cache_key] = batch
            return batch

        def get_section(section_name, semester):
            if not section_name or not semester:
                return None
            return Section.objects.filter(name__iexact=str(section_name).strip(), semester=semester).first()

        for row in rows:
            results["total"] += 1
            try:
                with transaction.atomic():
                    email = str(row.get("email") or "").strip()
                    first_name = str(row.get("first_name") or "").strip()
                    last_name = str(row.get("last_name") or "").strip()
                    roll_number = str(row.get("roll_number") or "").strip()
                    phone_number = str(row.get("phone_number") or "").strip()
                    dept_val = str(row.get("department") or "").strip() or default_dept_id
                    batch_val = str(row.get("batch") or "").strip() or default_batch_id
                    section_val = str(row.get("section") or "").strip()
                    admission_type_raw = str(row.get("admission_type") or "regular").strip().lower()
                    admission_type = "lateral_entry" if any(x in admission_type_raw for x in ["lateral", "le"]) else "regular"

                    if not all([email, first_name, last_name, roll_number]):
                        results["errors"].append({
                            "row": results["total"] + 1, # +1 because header is row 1
                            "error": "Missing required fields (email, first_name, last_name, roll_number)"
                        })
                        continue

                    # Validate uniqueness
                    if User.objects.filter(email=email).exists():
                         results["errors"].append({"row": results["total"] + 1, "error": f"User with email {email} already exists"})
                         continue
                    if StudentProfile.objects.filter(roll_number=roll_number, college=college).exists():
                         results["errors"].append({"row": results["total"] + 1, "error": f"Student with roll number {roll_number} already exists in this college"})
                         continue

                    # Resolve Dept and Batch
                    dept = get_department(dept_val)
                    batch = get_batch(batch_val, dept)

                    if not dept_val or not dept:
                         results["errors"].append({"row": results["total"] + 1, "error": f"Department '{dept_val}' not found"})
                         continue
                    if not batch_val or not batch:
                         results["errors"].append({"row": results["total"] + 1, "error": f"Batch '{batch_val}' not found in department '{dept.name}'"})
                         continue

                    # Create User
                    user = User.objects.create_user(
                        email=email,
                        username=email, # Use email as username for simplicity
                        first_name=first_name,
                        last_name=last_name,
                        role="student"
                    )
                    user.set_unusable_password()
                    user.save()

                    # Resolve Semester and Section
                    semester = Semester.objects.filter(batch=batch, is_current=True).first()
                    section = get_section(section_val, semester) if semester else None

                    # Create Profile
                    StudentProfile.objects.create(
                        user=user,
                        college=college,
                        department=dept,
                        batch=batch,
                        semester=semester,
                        section=section,
                        roll_number=roll_number,
                        phone_number=phone_number,
                        admission_type=admission_type
                    )
                    results["created"] += 1

            except Exception as e:
                results["errors"].append({
                    "row": results["total"] + 1,
                    "error": str(e)
                })

        return Response(results, status=status.HTTP_200_OK if results["created"] > 0 else status.HTTP_200_OK if results["total"] > 0 else status.HTTP_400_BAD_REQUEST)


class PlacementOfficerProfileViewSet(viewsets.ModelViewSet):
    queryset = PlacementOfficerProfile.objects.all()
    serializer_class = PlacementOfficerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsCollegeManagementAdmin]
    filterset_fields = ["college"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # If user is a College Admin or Principal, filter by their college
        if user.role in ["college_admin", "principal"]:
            college = user.college
            if college:
                return queryset.filter(college=college)
            return queryset.none()
            
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        user_data = data.pop("user", None)
        
        if not user_data:
            return Response({"error": "User data is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        required_user_fields = ["email", "username", "first_name", "last_name", "password"]
        if not all(field in user_data for field in required_user_fields):
            return Response(
                {"error": f"Missing user fields: {', '.join(required_user_fields)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # 1. Create User
                user = User.objects.create_user(
                    email=user_data["email"],
                    username=user_data["username"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    password=user_data["password"],
                    role="placement_officer"
                )

                # 2. Create Placement Officer Profile
                college_id = data.get("college")
                college = get_object_or_404(College, pk=college_id) if college_id else request.user.college

                profile = PlacementOfficerProfile.objects.create(
                    user=user,
                    college=college
                )
                
                serializer = self.get_serializer(profile)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        user_data = data.pop("user", None)

        try:
            with transaction.atomic():
                # 1. Update User if data provided
                if user_data:
                    user = instance.user
                    if "first_name" in user_data:
                        user.first_name = user_data["first_name"]
                    if "last_name" in user_data:
                        user.last_name = user_data["last_name"]
                    if "email" in user_data:
                        user.email = user_data["email"]
                    if "username" in user_data:
                        user.username = user_data["username"]
                    user.save()

                # 2. Update Profile with remaining data
                if "college" in data and isinstance(data["college"], str):
                    try:
                        data["college"] = College.objects.get(pk=data["college"]).id
                    except College.DoesNotExist:
                        pass
                
                serializer = self.get_serializer(instance, data=data, partial=partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)

                return Response(self.get_serializer(instance).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            with transaction.atomic():
                user = instance.user
                instance.delete()
                # Also delete the user account
                user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
class AttendanceSessionViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSession.objects.all()
    serializer_class = AttendanceSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["section_subject_faculty", "date"]
    search_fields = ["remarks", "section_subject_faculty__section__name"]
    ordering_fields = ["date", "created_at"]

    def get_queryset(self):
        qs = AttendanceSession.objects.all().prefetch_related("records")
        user = self.request.user
        
        if not user or user.is_anonymous:
            return AttendanceSession.objects.none()
        role = getattr(user, 'role', None)
        if role == "faculty":
            # For faculty, show sessions for any subject they are assigned to teach
            assigned_subjects = SectionSubjectFaculty.objects.filter(faculty__user=user).values_list('semester_subject__subject', flat=True)
            qs = qs.filter(section_subject_faculty__semester_subject__subject__in=assigned_subjects)
        elif role in ["college_admin", "principal"]:
            # For college management, only show sessions in their college
            qs = qs.filter(section_subject_faculty__section__semester__batch__college=user.college)
            
        return qs


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["session", "student", "is_present"]

class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage tasks assigned by faculty.
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticatedUser]
    filterset_fields = ["faculty", "department", "subject", "unit", "sub_unit"]

    def get_queryset(self):
        qs = Task.objects.select_related(
            "faculty__user", "subject", "unit", "sub_unit"
        ).prefetch_related("sections")
        
        user = self.request.user
        if user.role == "faculty":
            # Faculty see tasks for subjects they teach
            assigned_subjects = SectionSubjectFaculty.objects.filter(faculty__user=user).values_list('semester_subject__subject', flat=True)
            qs = qs.filter(subject__in=assigned_subjects)
        elif user.role == "student":
            # Students see only SENT tasks assigned to their section
            if hasattr(user, 'student_profile') and user.student_profile.section:
                qs = qs.filter(sections=user.student_profile.section, is_sent=True)
            else:
                return Task.objects.none()
        elif user.role not in ["admin", "college_admin", "principal"]:
            # Other roles restricted
            return Task.objects.none()
            
        return qs

    def perform_create(self, serializer):
        from course.models import Question
        # Auto-set faculty if role is faculty
        faculty_profile = None
        if self.request.user.role == "faculty":
            from core.models import FacultyProfile
            faculty_profile = get_object_or_404(FacultyProfile, user=self.request.user)
            
        # Check if the task is created manually
        if serializer.validated_data.get("question_source") == "manual":
            # Create a corresponding Question under the "task" category
            try:
                sub_unit = serializer.validated_data.get("sub_unit")
                unit = serializer.validated_data.get("unit")
                question_level = "subunit" if sub_unit else ("unit" if unit else "subject")
                
                question = Question.objects.create(
                    type=serializer.validated_data.get("task_type", "descriptive"),
                    title=serializer.validated_data.get("title", "Manual Task"),
                    content=serializer.validated_data.get("description", "Task Description"),
                    level=question_level,
                    subject=serializer.validated_data.get("subject"),
                    unit=unit,
                    sub_unit=sub_unit,
                    difficulty="medium",
                    marks=10,
                    categories=["task"],
                    created_by=self.request.user
                )
                
                # Append the created question to the task's questions list
                questions_qs = serializer.validated_data.get("questions")
                questions_list = list(questions_qs) if questions_qs is not None else []
                questions_list.append(question)
                serializer.validated_data["questions"] = questions_list
            except Exception as e:
                # If question creation fails, we just silently continue and create the task itself.
                print("Failed to auto-create manual question in Question Bank:", str(e))

        if faculty_profile:
            serializer.save(faculty=faculty_profile)
        else:
            serializer.save()

class TaskSubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage student task submissions.
    """
    queryset = TaskSubmission.objects.all()
    serializer_class = TaskSubmissionSerializer
    permission_classes = [IsAuthenticatedUser]
    filterset_fields = ["task", "student", "is_submitted"]

    def perform_create(self, serializer):
        from core.models import StudentProfile
        student = get_object_or_404(StudentProfile, user=self.request.user)
        instance = serializer.save(student=student)
        
        # Create initial history record
        TaskSubmissionHistory.objects.create(
            submission=instance,
            attempt_number=instance.attempt_number,
            answer=instance.answer,
            answers_data=instance.answers_data,
            file=instance.file,
            status=instance.status,
            submitted_at=instance.submitted_at
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        # Update current history record to match new state
        history_record = instance.history.filter(attempt_number=instance.attempt_number).first()
        if not history_record:
            history_record = TaskSubmissionHistory(submission=instance, attempt_number=instance.attempt_number)
            
        history_record.answer = instance.answer
        history_record.answers_data = instance.answers_data
        history_record.file = instance.file
        history_record.status = instance.status
        history_record.grade = instance.grade
        history_record.rejection_reason = instance.rejection_reason
        history_record.rejection_comment = instance.rejection_comment
        history_record.submitted_at = instance.submitted_at
        history_record.reviewed_at = instance.reviewed_at
        history_record.reviewed_by = instance.reviewed_by
        history_record.save()

    def get_queryset(self):
        qs = TaskSubmission.objects.select_related(
            "task", "student__user"
        ).prefetch_related("comments__faculty__user")
        
        user = self.request.user
        if user.role == "faculty":
            # Faculty see submissions for tasks they assigned
            qs = qs.filter(task__faculty__user=user)
        elif user.role == "student":
            # Students see their own submissions
            qs = qs.filter(student__user=user)
        elif user.role not in ["admin", "college_admin", "principal"]:
            return TaskSubmission.objects.none()
            
        return qs

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """
        Faculty action to accept or reject a submission.
        """
        submission = self.get_object()
        
        # Check permissions
        if request.user.role != "faculty":
            return Response({"error": "Only faculty can review submissions"}, status=status.HTTP_403_FORBIDDEN)
        
        from core.models import FacultyProfile
        faculty = get_object_or_404(FacultyProfile, user=request.user)
        if submission.task.faculty != faculty:
            return Response({"error": "You can only review submissions for your own tasks"}, status=status.HTTP_403_FORBIDDEN)

        status_value = request.data.get("status")
        if status_value not in ["accepted", "rejected"]:
            return Response({"error": "Invalid status. Must be 'accepted' or 'rejected'"}, status=status.HTTP_400_BAD_REQUEST)

        if status_value == "accepted":
            grade = request.data.get("grade")
            if grade is None:
                return Response({"error": "Grade is mandatory for accepted submissions"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                grade = float(grade)
                if grade < 0 or grade > 10:
                    return Response({"error": "Grade must be between 0 and 10"}, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({"error": "Grade must be a number"}, status=status.HTTP_400_BAD_REQUEST)
                
            submission.status = "accepted"
            submission.grade = grade
            submission.rejection_reason = None
            submission.rejection_comment = None
            
        elif status_value == "rejected":
            rejection_reason = request.data.get("rejection_reason")
            rejection_comment = request.data.get("rejection_comment")
            
            if not rejection_reason:
                return Response({"error": "Rejection reason is mandatory for rejected submissions"}, status=status.HTTP_400_BAD_REQUEST)
            
            if rejection_reason == "Other" and not rejection_comment:
                return Response({"error": "Custom comment is mandatory when rejection reason is 'Other'"}, status=status.HTTP_400_BAD_REQUEST)
                
            submission.status = "rejected"
            submission.rejection_reason = rejection_reason
            submission.rejection_comment = rejection_comment
            submission.grade = None

        submission.reviewed_at = timezone.now()
        submission.reviewed_by = faculty
        submission.save()
        
        # Update history
        history_record = submission.history.filter(attempt_number=submission.attempt_number).first()
        if history_record:
            history_record.status = submission.status
            history_record.grade = submission.grade
            history_record.rejection_reason = submission.rejection_reason
            history_record.rejection_comment = submission.rejection_comment
            history_record.reviewed_at = submission.reviewed_at
            history_record.reviewed_by = submission.reviewed_by
            history_record.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        """
        Student action to resubmit a rejected submission.
        """
        submission = self.get_object()
        
        # Check permissions
        if request.user.role != "student":
            return Response({"error": "Only students can resubmit"}, status=status.HTTP_403_FORBIDDEN)
            
        from core.models import StudentProfile
        student = get_object_or_404(StudentProfile, user=request.user)
        if submission.student != student:
            return Response({"error": "You can only resubmit your own submissions"}, status=status.HTTP_403_FORBIDDEN)

        if submission.status != "rejected":
            return Response({"error": "Only rejected submissions can be resubmitted"}, status=status.HTTP_400_BAD_REQUEST)

        # Increment attempt and reset status
        submission.attempt_number += 1
        submission.status = "pending"
        submission.grade = None
        submission.rejection_reason = None
        submission.rejection_comment = None
        submission.reviewed_at = None
        submission.reviewed_by = None
        # Do not clear answers here, the student will overwrite them via regular update/PATCH.
        # But we do record a new history entry right now for the new attempt:
        submission.save()
        
        TaskSubmissionHistory.objects.create(
            submission=submission,
            attempt_number=submission.attempt_number,
            answer=submission.answer,
            answers_data=submission.answers_data,
            file=submission.file,
            status=submission.status,
            submitted_at=submission.submitted_at
        )

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_comment(self, request, pk=None):
        """
        Action to add a comment to a submission (supports both faculty and students).
        """
        submission = self.get_object()
        comment_text = request.data.get("comment")
        if not comment_text:
            return Response({"error": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)

        faculty = None
        student = None

        if request.user.role == "faculty":
            from core.models import FacultyProfile
            faculty = get_object_or_404(FacultyProfile, user=request.user)
            # Check if this faculty assigned the task
            if submission.task.faculty != faculty:
                return Response({"error": "You can only comment on submissions for your own tasks"}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == "student":
            from core.models import StudentProfile
            student = get_object_or_404(StudentProfile, user=request.user)
            # Check if this is the student's own submission
            if submission.student != student:
                return Response({"error": "You can only comment on your own submissions"}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"error": "Only faculty and students can add comments"}, status=status.HTTP_403_FORBIDDEN)

        comment = TaskComment.objects.create(
            submission=submission,
            faculty=faculty,
            student=student,
            comment=comment_text
        )
        
        serializer = TaskCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="clear_chat")
    def clear_chat(self, request, pk=None):
        """
        Permanently delete all comments for a submission.
        Only the student who owns the submission or the faculty who assigned the task can clear the chat.
        """
        submission = self.get_object()

        if request.user.role == "faculty":
            from core.models import FacultyProfile
            faculty = get_object_or_404(FacultyProfile, user=request.user)
            if submission.task.faculty != faculty:
                return Response(
                    {"error": "You can only clear chat for submissions on your own tasks"},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.role == "student":
            from core.models import StudentProfile
            student = get_object_or_404(StudentProfile, user=request.user)
            if submission.student != student:
                return Response(
                    {"error": "You can only clear your own submission chat"},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            return Response(
                {"error": "Only faculty and students can clear chat"},
                status=status.HTTP_403_FORBIDDEN
            )

        deleted_count, _ = TaskComment.objects.filter(submission=submission).delete()
        return Response(
            {"message": f"Successfully deleted {deleted_count} comment(s)"},
            status=status.HTTP_200_OK
        )

class NoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing personal notes.
    """
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Only return notes owned by the current user.
        """
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Set the user to the current user when creating a note.
        """
        serializer.save(user=self.request.user)

class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing announcements.
    - College Admin can create, update, delete announcements for their college
    - Students can view announcements for their college or department
    """
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["college", "department", "level", "priority", "is_active"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content"]
    ordering_fields = ["created_at", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by active status and publish date
        from django.utils import timezone
        now = timezone.now()
        queryset = queryset.filter(
            is_active=True,
        ).filter(
            models.Q(publish_date__isnull=True) | models.Q(publish_date__lte=now)
        ).filter(
            models.Q(expiry_date__isnull=True) | models.Q(expiry_date__gte=now)
        )
        
        # If user is a College Admin or Principal, show all their college announcements
        if user.role in ["college_admin", "principal", "admin"]:
            college = user.college
            if college:
                return queryset.filter(college=college)
            return queryset.none()
        
        # If user is a student, show college-level + their department announcements
        if user.role == "student":
            try:
                student_profile = user.student_profile
                college = student_profile.college
                department = student_profile.department
                
                # Get college-level announcements OR department-level announcements for their department
                return queryset.filter(
                    models.Q(college=college, level="college") |
                    models.Q(college=college, level="department", department=department)
                )
            except StudentProfile.DoesNotExist:
                return queryset.none()
        
        # For other roles (faculty, HOD, placement_officer), show college-level + their department announcements
        if user.role in ["faculty", "hod", "placement_officer"]:
            try:
                if user.role == "hod":
                    profile = user.hod_profile
                    college = profile.college
                    department = profile.department
                elif user.role == "placement_officer":
                    profile = user.placement_officer_profile
                    college = profile.college
                    department = None
                else:
                    profile = user.faculty_profile
                    college = profile.college
                    department = profile.department
                
                if college:
                    if department:
                        return queryset.filter(
                            models.Q(college=college, level="college") |
                            models.Q(college=college, level="department", department=department)
                        )
                    return queryset.filter(college=college, level="college")
                return queryset.none()
            except:
                return queryset.none()
        
        return queryset.none()

    def perform_create(self, serializer):
        # Set created_by to current user
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        # Only college_admin and principal can create announcements
        if request.user.role not in ["college_admin", "principal", "admin"]:
            return Response(
                {"detail": "You do not have permission to create announcements."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get college from the user profile OR from request data
        college = request.user.college
        
        # If college not found in profile, try to get from request data
        if not college and 'college' in request.data:
            college_id = request.data.get('college')
            if college_id:
                try:
                    college = College.objects.get(id=college_id)
                except College.DoesNotExist:
                    pass
        
        if not college:
            return Response(
                {"detail": "Could not determine your college."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = request.data.copy()
        data['college'] = str(college.id)
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        # Only college_admin and principal can update announcements
        if request.user.role not in ["college_admin", "principal", "admin"]:
            return Response(
                {"detail": "You do not have permission to update announcements."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Only college_admin and principal can delete announcements
        if request.user.role not in ["college_admin", "principal", "admin"]:
            return Response(
                {"detail": "You do not have permission to delete announcements."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

class FileUploadViewSet(viewsets.ViewSet):
    """
    Generic File Upload ViewSet
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.core.files.storage import default_storage
        import os
        from django.utils import timezone
        
        # Create a unique filename
        ext = os.path.splitext(file_obj.name)[1]
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        new_filename = f'uploads/{request.user.id}/{timestamp}_{file_obj.name}'
        
        file_name = default_storage.save(new_filename, file_obj)
        file_url = default_storage.url(file_name)
        
        # Ensure it's an absolute URL
        if not file_url.startswith('http'):
            file_url = request.build_absolute_uri(file_url)
            
        return Response({"url": file_url}, status=status.HTTP_201_CREATED)
