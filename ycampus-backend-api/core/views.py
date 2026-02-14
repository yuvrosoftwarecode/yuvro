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
    ViewSet to handle allocation of Principal and College Admin
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @action(detail=True, methods=["post"], url_path="allocate-principal")
    def allocate_principal(self, request, pk=None):
        """
        Allocate a user as Principal of a college.
        Payload: { "user_id": "uuid" }
        """
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

    @action(detail=True, methods=["post"], url_path="allocate-hod")
    def allocate_hod(self, request, pk=None):
            

        """
        Allocate a user as HOD of a department in the college.
        Payload: { "user_id": "uuid", "department_id": "uuid" }
        """
        college = get_object_or_404(College, pk=pk)
        user_id = request.data.get("user_id")
        department_id = request.data.get("department_id")

        if not user_id or not department_id:
            return Response(
                {"error": "user_id and department_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(User, pk=user_id)
        department = get_object_or_404(Department, pk=department_id, college=college)

        try:
            with transaction.atomic():
                # Update user role
                user.role = "hod"
                user.save()

                # Clean up existing HOD profile for this user
                HODProfile.objects.filter(user=user).delete()
                
                # Check if department already has an HOD
                if hasattr(department, 'hod'):
                     department.hod.delete()

                # Create profile
                HODProfile.objects.create(
                    user=user, college=college, department=department
                )

            return Response(
                {
                    "message": f"User {user.email} allocated as HOD of {department.name} in {college.name}"
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
