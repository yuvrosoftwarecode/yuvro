from rest_framework import serializers

from core.models import College, Batch, Department, Semester, Section
from .models import (
    Subject,
    Unit,
    SubUnit,
    Video,
    Note,
    Question,
    UserSubjectProgress,
    StudentCodePractice,
    CollegeSubject,
)
from .gamification_models import UserGamificationProfile
from authentication.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()



class CollegeBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = College
        fields = ["id", "name", "short_form"]


class DepartmentBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]


class BatchBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BatchSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_details = DepartmentBasicSerializer(source="department", read_only=True)
    college = serializers.PrimaryKeyRelatedField(queryset=College.objects.all(), required=False, allow_null=True)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Batch
        fields = ["id", "college", "department", "department_name", "department_details", "name", "semesters", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
        validators = []  # Disable automatic UniqueTogetherValidator to allow optional department
    
    semesters = serializers.SerializerMethodField()

    def get_semesters(self, obj):
        return SemesterSerializer(obj.semesters.all(), many=True).data


class DepartmentSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source="college.name", read_only=True)
    college_details = CollegeBasicSerializer(source="college", read_only=True)
    hod_details = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "college", "college_name", "college_details", "hod_details", "name", "short_form", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_hod_details(self, obj):
        try:
            from core.serializers import HODProfileSerializer
            if hasattr(obj, 'hod'):
                return HODProfileSerializer(obj.hod, context=self.context).data
        except Exception:
            pass
        return None


class SemesterBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ["id", "number", "is_current", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SemesterSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    batch_details = BatchBasicSerializer(source="batch", read_only=True)

    class Meta:
        model = Semester
        fields = ["id", "batch", "batch_name", "batch_details", "number", "is_current", "sections", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    sections = serializers.SerializerMethodField()

    def get_sections(self, obj):
        return SectionBasicSerializer(obj.sections.all(), many=True).data


class SectionBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ["id", "name", "student_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    student_count = serializers.SerializerMethodField()

    def get_student_count(self, obj):
        return obj.students.count()


class SectionSerializer(serializers.ModelSerializer):
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)
    semester_details = SemesterBasicSerializer(source="semester", read_only=True)

    class Meta:
        model = Section
        fields = ["id", "semester", "semester_number", "semester_details", "name", "student_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    student_count = serializers.SerializerMethodField()

    def get_student_count(self, obj):
        return obj.students.count()





class CollegeSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    principals = serializers.SerializerMethodField()
    college_admins = serializers.SerializerMethodField()

    class Meta:
        model = College
        fields = [
            "id",
            "name",
            "short_form",
            "college_type",
            "affiliated_university",
            "is_aicte_approved",
            "is_ugc_approved",
            "department_names",
            "departments",
            "principals",
            "college_admins",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_principals(self, obj):
        from core.serializers import PrincipalProfileSerializer
        return PrincipalProfileSerializer(obj.principals.all(), many=True, context=self.context).data

    def get_college_admins(self, obj):
        from core.serializers import CollegeAdminProfileSerializer
        return CollegeAdminProfileSerializer(obj.college_admins.all(), many=True, context=self.context).data

    department_names = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    def create(self, validated_data):
        department_names = validated_data.pop("department_names", [])
        college = College.objects.create(**validated_data)
        for dept_name in department_names:
            Department.objects.get_or_create(college=college, name=dept_name)
        return college

    def update(self, instance, validated_data):
        department_names = validated_data.pop("department_names", None)
        instance = super().update(instance, validated_data)

        if department_names is not None:
            # Sync departments
            current_depts = set(instance.departments.values_list("name", flat=True))
            new_depts = set(department_names)

            # Delete departments not in the new list
            Department.objects.filter(college=instance, name__in=current_depts - new_depts).delete()

            # Create new departments
            for dept_name in new_depts - current_depts:
                Department.objects.get_or_create(college=instance, name=dept_name)

        return instance


class UserGamificationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGamificationProfile
        fields = ["current_streak", "longest_streak", "total_xp", "current_level", "last_activity_date"]



class SubUnitSerializer(serializers.ModelSerializer):
    """
    Serializer for SubUnit model.
    """

    class Meta:
        model = SubUnit
        fields = ["id", "unit", "name", "content", "order_index", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_video_url(self, value):
        """
        Validate video URL format if provided.
        """
        if value and not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "Video URL must start with http:// or https://"
            )
        return value


class UnitSerializer(serializers.ModelSerializer):
    """
    Serializer for Unit model with optional nested subunits.
    """

    subunits = SubUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Unit
        fields = ["id", "subject", "name", "order_index", "created_at", "subunits", "total_problems", "solved_problems", "progress_percentage"]
        read_only_fields = ["id", "created_at"]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)


class UnitBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Unit model without nested subunits.
    """

    class Meta:
        model = Unit
        fields = ["id", "subject", "name", "order_index", "created_at", "total_problems", "solved_problems", "progress_percentage"]
        read_only_fields = ["id", "created_at"]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)


class CollegeSubjectSerializer(serializers.ModelSerializer):
    college_name = serializers.CharField(source="college.name", read_only=True)
    subject_details = serializers.SerializerMethodField()

    class Meta:
        model = CollegeSubject
        fields = ["id", "college", "college_name", "subject", "subject_code", "subject_details", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_subject_details(self, obj):
        return SubjectBasicSerializer(obj.subject).data


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model with optional nested units.
    """

    units = UnitSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = [
            "id",
            "yuvro_id",
            "short_code",
            "subject_name",
            "created_at",
            "updated_at",
            "units",
            "total_problems",
            "solved_problems",
            "progress_percentage",
        ]
        read_only_fields = ["id", "yuvro_id", "created_at", "updated_at"]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)

    def validate_short_code(self, value):
        """
        Validate short_code uniqueness if provided.
        """
        if value:
            queryset = Subject.objects.filter(short_code=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("A Subject with this short code already exists.")
        return value


class SubjectBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = [
            "id",
            "yuvro_id",
            "short_code",
            "subject_name",
            "created_at",
            "updated_at",
            "total_problems",
            "solved_problems",
            "progress_percentage",
            "total_score",
            "ai_help_used",
        ]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    total_score = serializers.FloatField(read_only=True)
    ai_help_used = serializers.IntegerField(read_only=True)


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = [
            "id",
            "sub_unit",
            "title",
            "video_link",
            "ai_context",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "sub_unit", "user", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "user"]

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Content cannot be empty.")
        return value


class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for Question model - supports MCQ, Coding, and Descriptive questions
    """

    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "type",
            "title",
            "content",
            "level",
            "subject",
            "unit",
            "sub_unit",
            "difficulty",
            "marks",
            "categories",
            "mcq_options",
            "test_cases_basic",
            "test_cases_advanced",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            # If the user is a student, hide advanced test cases
            if getattr(request.user, "role", "") == "student":
                ret.pop("test_cases_advanced", None)
        return ret

    def validate(self, data):
        """
        Validate question data based on type and level
        """
        question_type = data.get("type")
        level = data.get("level")

        # Validate level associations
        if level == "subject" and not data.get("subject"):
            raise serializers.ValidationError(
                "Subject is required for subject-level questions"
            )
        if level == "unit" and not data.get("unit"):
            raise serializers.ValidationError(
                "Unit is required for unit-level questions"
            )
        if level == "subunit" and not data.get("sub_unit"):
            raise serializers.ValidationError(
                "SubUnit is required for subunit-level questions"
            )

        # Validate categories
        categories = data.get("categories", [])
        if categories:
            valid_categories = [choice[0] for choice in Question.QUESTION_CATEGORIES]
            for category in categories:
                if category not in valid_categories:
                    raise serializers.ValidationError(f"Invalid category: {category}")

        # Validate MCQ specific fields
        if question_type in ["mcq_single", "mcq_multiple"]:
            mcq_options = data.get("mcq_options")

            if (
                not mcq_options
                or not isinstance(mcq_options, list)
                or len(mcq_options) < 2
            ):
                raise serializers.ValidationError(
                    "MCQ questions must have at least 2 options"
                )

            # Validate that each option has required fields
            for i, option in enumerate(mcq_options):
                if not isinstance(option, dict):
                    raise serializers.ValidationError(
                        f"MCQ option {i+1} must be an object with 'text' and 'is_correct' fields"
                    )
                if not option.get("text", "").strip():
                    raise serializers.ValidationError(
                        f"MCQ option {i+1} text cannot be empty"
                    )
                if "is_correct" not in option:
                    raise serializers.ValidationError(
                        f"MCQ option {i+1} must have 'is_correct' field"
                    )

            # Validate that at least one option is marked as correct
            correct_options = [opt for opt in mcq_options if opt.get("is_correct")]
            if not correct_options:
                raise serializers.ValidationError(
                    "MCQ questions must have at least one correct answer"
                )

            # For single answer MCQ, ensure only one correct answer
            if question_type == "mcq_single" and len(correct_options) > 1:
                raise serializers.ValidationError(
                    "Single answer MCQ questions can only have one correct answer"
                )

        # Validate coding specific fields
        if question_type == "coding":
            test_cases_basic = data.get("test_cases_basic")
            if (
                not test_cases_basic
                or not isinstance(test_cases_basic, list)
                or len(test_cases_basic) == 0
            ):
                raise serializers.ValidationError(
                    "Coding questions must have at least 1 basic test case"
                )

            # Validate basic test case structure
            for i, test_case in enumerate(test_cases_basic):
                if not isinstance(test_case, dict):
                    raise serializers.ValidationError(
                        f"Basic test case {i+1} must be an object"
                    )
                if "input" not in test_case or "expected_output" not in test_case:
                    raise serializers.ValidationError(
                        f"Basic test case {i+1} must have 'input' and 'expected_output' fields"
                    )

            # Validate advanced test cases if provided
            test_cases_advanced = data.get("test_cases_advanced", [])
            if test_cases_advanced:
                for i, test_case in enumerate(test_cases_advanced):
                    if not isinstance(test_case, dict):
                        raise serializers.ValidationError(
                            f"Advanced test case {i+1} must be an object"
                        )
                    if "input" not in test_case or "expected_output" not in test_case:
                        raise serializers.ValidationError(
                            f"Advanced test case {i+1} must have 'input' and 'expected_output' fields"
                        )

        return data

    def create(self, validated_data):
        # Set the created_by field to the current user
        validated_data["created_by"] = self.context["request"].user

        # Auto-populate related fields based on question level
        level = validated_data.get("level")

        if level == "subunit" and "sub_unit" in validated_data:
            # If SubUnit level, populate Unit and Subject from SubUnit
            sub_unit = validated_data["sub_unit"]
            if sub_unit:
                validated_data["unit"] = sub_unit.unit
                validated_data["subject"] = sub_unit.unit.subject

        elif level == "unit" and "unit" in validated_data:
            # If Unit level, populate Subject from Unit
            unit = validated_data["unit"]
            if unit:
                validated_data["subject"] = unit.subject

        # For Subject level, Subject is already set

        return super().create(validated_data)


class UserSubjectProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSubjectProgress
        fields = [
            "id",
            "user",
            "subject",
            "unit",
            "sub_unit",
            "is_videos_watched",
            "quiz_score",
            "is_quiz_completed",
            "coding_score",
            "is_coding_completed",
            "progress_percent",
            "is_completed",
            "completed_at",
            "is_current_subunit",
            "last_accessed",
        ]
        read_only_fields = [
            "id",
            "user",
            "subject",
            "unit",
            "sub_unit",
            "progress_percent",
            "completed_at",
            "last_accessed",
        ]


class StudentCodePracticeSerializer(serializers.ModelSerializer):
    """
    Serializer for StudentCodePractice model
    """

    user = serializers.StringRelatedField(read_only=True)
    question = serializers.StringRelatedField(read_only=True)
    subject = serializers.StringRelatedField(read_only=True)
    unit = serializers.StringRelatedField(read_only=True)
    question_difficulty = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentCodePractice
        fields = [
            "id",
            "user",
            "question",
            "subject",
            "unit",
            "status",
            "answer_latest",
            "answer_history",
            "answer_attempt_count",
            "execution_output",
            "plagiarism_data",
            "evaluation_results",
            "marks_obtained",
            "ai_help_count",
            "question_difficulty",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def get_question_difficulty(self, obj):
        return obj.question.difficulty if obj.question else None
        
    def validate_status(self, value):
        """
        Validate status is one of the allowed choices
        """
        valid_statuses = [choice[0] for choice in StudentCodePractice.STATUS_CHOICES]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(valid_statuses)}"
            )
        return value

