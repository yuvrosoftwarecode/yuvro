from rest_framework import serializers
from django.db import transaction
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
    AttendanceSession,
    AttendanceRecord,
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


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    roll_number = serializers.CharField(source="student.roll_number", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ["id", "session", "student", "student_name", "roll_number", "is_present", "created_at", "updated_at"]
        read_only_fields = ["id", "session", "created_at", "updated_at"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    records = AttendanceRecordSerializer(many=True, required=False)
    section_name = serializers.CharField(source="section_subject_faculty.section.name", read_only=True)
    subject_name = serializers.CharField(source="section_subject_faculty.semester_subject.subject.subject_name", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            "id", 
            "section_subject_faculty", 
            "section_name", 
            "subject_name", 
            "date", 
            "remarks", 
            "records", 
            "created_at", 
            "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        validators = []  # Disable class-level UniqueTogetherValidator

    @transaction.atomic
    def create(self, validated_data):
        records_data = validated_data.pop('records', [])
        
        # Use update_or_create to handle existing sessions for the same date/assignment
        session, created = AttendanceSession.objects.update_or_create(
            section_subject_faculty=validated_data.get('section_subject_faculty'),
            date=validated_data.get('date'),
            defaults={'remarks': validated_data.get('remarks', '')}
        )
        
        # Clear existing records to avoid duplicates
        session.records.all().delete()
            
        for record_data in records_data:
            AttendanceRecord.objects.create(session=session, **record_data)
        
        return session


class AnnouncementSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source="college.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source="created_by.email", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "content",
            "college",
            "college_name",
            "department",
            "department_name",
            "level",
            "created_by",
            "created_by_name",
            "priority",
            "is_active",
            "publish_date",
            "expiry_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
