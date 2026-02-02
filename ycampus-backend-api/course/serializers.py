from rest_framework import serializers

from .models import (
    Course,
    Topic,
    Subtopic,
    Video,
    Note,
    CourseInstructor,
    Question,
    UserCourseProgress,
    StudentCodePractice,
    Batch,
    BatchStudent,
)
from .gamification_models import UserGamificationProfile
from authentication.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class UserGamificationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGamificationProfile
        fields = ["current_streak", "longest_streak", "total_xp", "current_level", "last_activity_date"]



class SubtopicSerializer(serializers.ModelSerializer):
    """
    Serializer for Subtopic model.
    """

    class Meta:
        model = Subtopic
        fields = ["id", "topic", "name", "content", "order_index", "created_at"]
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


class TopicSerializer(serializers.ModelSerializer):
    """
    Serializer for Topic model with optional nested subtopics.
    """

    subtopics = SubtopicSerializer(many=True, read_only=True)

    class Meta:
        model = Topic
        fields = ["id", "course", "name", "order_index", "created_at", "subtopics", "total_problems", "solved_problems", "progress_percentage"]
        read_only_fields = ["id", "created_at"]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)


class TopicBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Topic model without nested subtopics.
    """

    class Meta:
        model = Topic
        fields = ["id", "course", "name", "order_index", "created_at", "total_problems", "solved_problems", "progress_percentage"]
        read_only_fields = ["id", "created_at"]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)


class CourseInstructorSerializer(serializers.ModelSerializer):
    instructor = UserSerializer(read_only=True)

    class Meta:
        model = CourseInstructor
        fields = ["id", "instructor", "created_at"]


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for Course model with optional nested topics.
    """

    topics = TopicSerializer(many=True, read_only=True)
    instructors = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "short_code",
            "name",
            "category",
            "created_at",
            "updated_at",
            "topics",
            "instructors",
            "total_problems",
            "solved_problems",
            "progress_percentage",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    total_problems = serializers.IntegerField(read_only=True)
    solved_problems = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)

    def get_instructors(self, obj):
        mappings = CourseInstructor.objects.filter(course=obj).select_related(
            "instructor"
        )
        return CourseInstructorSerializer(mappings, many=True).data

    def validate_short_code(self, value):
        """
        Validate short_code uniqueness if provided.
        """
        if value:
            # Check if another course with this short_code exists (excluding current instance)
            queryset = Course.objects.filter(short_code=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    "A course with this short code already exists."
                )
        return value

    def validate_category(self, value):
        """
        Validate category is one of the allowed choices.
        """
        valid_categories = [choice[0] for choice in Course.CATEGORY_CHOICES]
        if value not in valid_categories:
            raise serializers.ValidationError(
                f"Category must be one of: {', '.join(valid_categories)}"
            )
        return value


class CourseBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            "id",
            "short_code",
            "name",
            "category",
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
            "sub_topic",
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
        fields = ["id", "sub_topic", "user", "content", "created_at", "updated_at"]
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
            "course",
            "topic",
            "subtopic",
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
        if level == "course" and not data.get("course"):
            raise serializers.ValidationError(
                "Course is required for course-level questions"
            )
        if level == "topic" and not data.get("topic"):
            raise serializers.ValidationError(
                "Topic is required for topic-level questions"
            )
        if level == "subtopic" and not data.get("subtopic"):
            raise serializers.ValidationError(
                "Subtopic is required for subtopic-level questions"
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

        if level == "subtopic" and "subtopic" in validated_data:
            # If subtopic level, populate topic and course from subtopic
            subtopic = validated_data["subtopic"]
            if subtopic:
                validated_data["topic"] = subtopic.topic
                validated_data["course"] = subtopic.topic.course

        elif level == "topic" and "topic" in validated_data:
            # If topic level, populate course from topic
            topic = validated_data["topic"]
            if topic:
                validated_data["course"] = topic.course

        # For course level, course is already set

        return super().create(validated_data)


class UserCourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCourseProgress
        fields = [
            "id",
            "user",
            "course",
            "topic",
            "subtopic",
            "is_videos_watched",
            "quiz_score",
            "is_quiz_completed",
            "coding_score",
            "is_coding_completed",
            "progress_percent",
            "is_completed",
            "completed_at",
            "is_current_subtopic",
            "last_accessed",
        ]
        read_only_fields = [
            "id",
            "user",
            "course",
            "topic",
            "subtopic",
            "progress_percent",
            "completed_at",
            "last_accessed",
        ]


class BatchStudentSerializer(serializers.ModelSerializer):
    """
    Serializer for BatchStudent through model.
    """
    student = UserSerializer(read_only=True)
    student_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = BatchStudent
        fields = [
            "id",
            "student",
            "student_id",
            "enrolled_at",
            "is_active",
            "progress_percentage",
            "last_activity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "enrolled_at", "created_at", "updated_at"]

    def validate_student_id(self, value):
        """
        Validate that the student exists and has student role.
        """
        if value:
            try:
                student = User.objects.get(id=value)
                if student.role != 'student':
                    raise serializers.ValidationError("Only users with 'student' role can be enrolled in batches")
                return value
            except User.DoesNotExist:
                raise serializers.ValidationError("Student with this ID does not exist")
        return value


class BatchSerializer(serializers.ModelSerializer):
    """
    Serializer for Batch model with nested student information.
    """
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_short_code = serializers.CharField(source='course.short_code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    enrolled_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    
    # For detailed view with students
    batch_students = BatchStudentSerializer(many=True, read_only=True)
    
    # For creating/updating with student IDs
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="List of student IDs to enroll in this batch"
    )

    class Meta:
        model = Batch
        fields = [
            "id",
            "name",
            "title",
            "description",
            "course",
            "course_name",
            "course_short_code",
            "start_date",
            "end_date",
            "max_students",
            "status",
            "enrolled_count",
            "is_full",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "batch_students",
            "student_ids",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "enrolled_count", "is_full"]

    def validate_student_ids(self, value):
        """
        Validate student IDs and check for duplicates.
        """
        if value:
            # Check for duplicates
            if len(value) != len(set(value)):
                raise serializers.ValidationError("Duplicate student IDs are not allowed")
            
            # Validate each student ID
            for student_id in value:
                try:
                    student = User.objects.get(id=student_id)
                    if student.role != 'student':
                        raise serializers.ValidationError(f"User {student.username} is not a student")
                except User.DoesNotExist:
                    raise serializers.ValidationError(f"Student with ID {student_id} does not exist")
            
            # Check if adding these students would exceed max_students
            current_count = 0
            if self.instance:
                current_count = self.instance.enrolled_count
            
            max_students = self.initial_data.get('max_students', getattr(self.instance, 'max_students', 50))
            if current_count + len(value) > max_students:
                raise serializers.ValidationError(
                    f"Adding {len(value)} students would exceed maximum capacity of {max_students}"
                )
        
        return value

    def validate(self, data):
        """
        Validate batch data.
        """
        # Validate dates
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if end_date and start_date and end_date <= start_date:
            raise serializers.ValidationError("End date must be after start date")
        
        # Validate max_students
        max_students = data.get('max_students', 50)
        if max_students <= 0:
            raise serializers.ValidationError("Maximum students must be greater than 0")
        
        return data

    def create(self, validated_data):
        """
        Create batch and enroll students if provided.
        """
        student_ids = validated_data.pop('student_ids', [])
        validated_data['created_by'] = self.context['request'].user
        
        batch = super().create(validated_data)
        
        # Enroll students if provided
        if student_ids:
            batch_students = []
            for student_id in student_ids:
                student = User.objects.get(id=student_id)
                batch_students.append(BatchStudent(batch=batch, student=student))
            
            BatchStudent.objects.bulk_create(batch_students, ignore_conflicts=True)
        
        return batch

    def update(self, instance, validated_data):
        """
        Update batch and handle student enrollment changes.
        """
        student_ids = validated_data.pop('student_ids', None)
        
        batch = super().update(instance, validated_data)
        
        # Handle student enrollment if student_ids provided
        if student_ids is not None:
            # Remove existing enrollments
            BatchStudent.objects.filter(batch=batch).delete()
            
            # Add new enrollments
            if student_ids:
                batch_students = []
                for student_id in student_ids:
                    student = User.objects.get(id=student_id)
                    batch_students.append(BatchStudent(batch=batch, student=student))
                
                BatchStudent.objects.bulk_create(batch_students, ignore_conflicts=True)
        
        return batch


class BatchBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Batch model without nested data.
    """
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_short_code = serializers.CharField(source='course.short_code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    enrolled_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    class Meta:
        model = Batch
        fields = [
            "id",
            "name",
            "title",
            "description",
            "course",
            "course_name",
            "course_short_code",
            "start_date",
            "end_date",
            "max_students",
            "status",
            "enrolled_count",
            "is_full",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "enrolled_count", "is_full"]


class StudentCodePracticeSerializer(serializers.ModelSerializer):
    """
    Serializer for StudentCodePractice model
    """

    user = serializers.StringRelatedField(read_only=True)
    question = serializers.StringRelatedField(read_only=True)
    course = serializers.StringRelatedField(read_only=True)
    topic = serializers.StringRelatedField(read_only=True)
    question_difficulty = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentCodePractice
        fields = [
            "id",
            "user",
            "question",
            "course",
            "topic",
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


