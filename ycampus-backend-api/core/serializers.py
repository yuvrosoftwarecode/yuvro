from rest_framework import serializers
from .models import (
    StudentProfile,
    FacultyProfile,
    HODProfile,
    PrincipalProfile,
    CollegeAdminProfile,
    College,
    Department,
    Batch,
    Semester,
    Section,
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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FacultyProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

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
