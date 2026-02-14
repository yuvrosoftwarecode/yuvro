from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    College,
    StudentProfile,
    FacultyProfile,
    HODProfile,
    PrincipalProfile,
    CollegeAdminProfile,
    Department,
)
from .serializers import (
    StudentProfileSerializer,
    FacultyProfileSerializer,
    HODProfileSerializer,
    PrincipalProfileSerializer,
    CollegeAdminProfileSerializer,
)
from authentication.permissions import IsCollegeManagementAdmin

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
    permission_classes = [permissions.IsAuthenticated, IsCollegeManagementAdmin]
    filterset_fields = ["college", "department"]

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
    permission_classes = [permissions.IsAuthenticated, IsCollegeManagementAdmin]
    filterset_fields = ["college", "department", "batch", "semester", "section"]

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

    def perform_create(self, serializer):
        # We might need custom logic for creating students later (e.g. creating User first)
        serializer.save()
