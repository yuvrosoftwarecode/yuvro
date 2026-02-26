from rest_framework import serializers
from django.db import transaction
from .models import (
    StudentProfile,
    FacultyProfile,
    HODProfile,
    PrincipalProfile,
    CollegeAdminProfile,
    TPOProfile,
    TPOProfile,
    College,
    Department,
    Batch,
    Semester,
    Section,
    AttendanceSession,
    AttendanceRecord,
    Task,
    TaskSubmission,
    TaskComment,
    Note,
    Announcement,
)
from authentication.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class StudentProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "user",
            "user_details",
            "college",
            "college_name",
            "department",
            "department_name",
            "batch",
            "batch_name",
            "semester",
            "semester_number",
            "section",
            "section_name",
            "roll_number",
            "phone_number",
            "admission_type",
            "is_detained",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LinkedDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]

class FacultyProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    linked_departments_data = LinkedDepartmentSerializer(source="linked_departments", many=True, read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            "id",
            "user",
            "user_details",
            "college",
            "college_name",
            "department",
            "department_name",
            "linked_departments",
            "linked_departments_data",
            "designation",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class HODProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = HODProfile
        fields = [
            "id",
            "user",
            "user_details",
            "college",
            "college_name",
            "department",
            "department_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PrincipalProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)

    class Meta:
        model = PrincipalProfile
        fields = [
            "id",
            "user",
            "user_details",
            "college",
            "college_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CollegeAdminProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)

    class Meta:
        model = CollegeAdminProfile
        fields = [
            "id",
            "user",
            "user_details",
            "college",
            "college_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TPOProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)

    class Meta:
        model = TPOProfile
        fields = [
            "id",
            "user",
            "user_details",
            "college",
            "college_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
