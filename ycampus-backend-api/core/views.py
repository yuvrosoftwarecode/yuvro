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
                PrincipalProfile.objects.update_or_create(
                    college=college, defaults={"user": user}
                )
                
                # Check if this user was assigned to another college as principal and remove?
                # For now, assuming one user can be principal of one college only (OneToOne)
                # If user already had a principal profile for another college, it would fail unique constraint?
                # Actually PrincipalProfile definition: 
                # user = OneToOneField(User...)
                # college = OneToOneField(College...)
                # So update_or_create on college might fail if we don't handle the user side.
                
                # Let's try to get profile by user first
                PrincipalProfile.objects.filter(user=user).delete()
                
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
