from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Contest,
    MockInterview,
    JobTest,
    SkillTest,
    ContestSubmission,
    MockInterviewSubmission,
    JobTestSubmission,
    SkillTestSubmission,
    SkillTestQuestionActivity,
    CertificationExam,
    CertificationSubmission,
    CertificationQuestionActivity,
    Certificate,
)

User = get_user_model()


class CertificationExamSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    my_submissions = serializers.SerializerMethodField()
    course_name = serializers.CharField(source='course.name', read_only=True)
    
    class Meta:
        model = CertificationExam
        fields = [
            "id",
            "title",
            "description",
            "instructions",
            "difficulty",
            "duration",
            "start_datetime",
            "end_datetime",
            "total_marks",
            "passing_marks",
            "enable_proctoring",
            "max_attempts",
            "questions_config",
            "questions_random_config",
            "publish_status",
            "course",
            "course_name",
            "participants_count",
            "total_questions",
            "my_submissions",
            "certificate_template",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_participants_count(self, obj):
        return obj.certification_submissions.count()

    def get_total_questions(self, obj):
        fixed_count = 0
        if obj.questions_config:
            for q_type, ids in obj.questions_config.items():
                if isinstance(ids, list):
                    fixed_count += len(ids)

        random_count = 0
        if obj.questions_random_config:
            for q_type, count in obj.questions_random_config.items():
                if isinstance(count, int):
                    random_count += count

        return fixed_count + random_count

    def get_my_submissions(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []

        submissions = obj.certification_submissions.filter(user=request.user).order_by(
            "-created_at"
        )
        return SimpleCertificationSubmissionSerializer(submissions, many=True).data


class CertificationQuestionActivitySerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    question_content = serializers.CharField(source="question.content", read_only=True)
    mcq_options = serializers.JSONField(source="question.mcq_options", read_only=True)
    marks = serializers.FloatField(source="question.marks", read_only=True)
    test_cases_basic = serializers.JSONField(
        source="question.test_cases_basic", read_only=True
    )
    solution_code = serializers.CharField(
        source="question.solution_code", read_only=True
    )
    solution_language = serializers.CharField(
        source="question.solution_language", read_only=True
    )

    class Meta:
        model = CertificationQuestionActivity
        fields = [
            "id",
            "question",
            "question_title",
            "question_type",
            "question_content",
            "mcq_options",
            "marks",
            "test_cases_basic",
            "solution_code",
            "solution_language",
            "question_activities",
            "navigation_activities",
            "proctoring_activities",
            "camera_snapshots",
            "alert_priority",
            "answer_data",
            "is_final_answer",
            "marks_obtained",
            "is_correct",
            "total_question_time",
            "violation_count",
            "has_violations",
            "created_at",
            "updated_at",
        ]


class CertificateSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    
    class Meta:
        model = Certificate
        fields = [
            "id",
            "certificate_id",
            "user_name",
            "course_name",
            "issued_at",
            "certificate_url",
        ]
        read_only_fields = ["id", "certificate_id", "issued_at", "user_name", "course_name"]


class CertificationSubmissionSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="certification_exam.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    attempt_number = serializers.SerializerMethodField()
    question_activities = CertificationQuestionActivitySerializer(
        source="certification_question_activities", many=True, read_only=True
    )
    certificate = CertificateSerializer(read_only=True)

    def get_attempt_number(self, obj):
        # Calculate attempt number based on creation time for this user/exam
        return CertificationSubmission.objects.filter(
            certification_exam=obj.certification_exam,
            user=obj.user,
            created_at__lte=obj.created_at
        ).count()

    class Meta:
        model = CertificationSubmission
        fields = [
            "id",
            "certification_exam",
            "exam_title",
            "user",
            "user_name",
            "user_email",
            "status",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "proctoring_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "question_activities",
            "certificate",
            "created_at",
            "attempt_number",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContestSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()

    class Meta:
        model = Contest
        fields = [
            "id",
            "title",
            "organizer",
            "type",
            "status",
            "start_datetime",
            "end_datetime",
            "duration",
            "prize",
            "difficulty",
            "description",
            "registration_start_datetime",
            "registration_end_datetime",
            "allow_late_entry",
            "participants_count",
            "max_attempts",
            "questions_config",
            "questions_random_config",
            "instructions",
            "total_marks",
            "passing_marks",
            "enable_proctoring",
            "publish_status",
            "created_by",
            "created_at",
            "updated_at",
            "is_registered",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "is_registered",
        ]

    def get_participants_count(self, obj):
        # Deprecated: usage of 'participants' was ambiguous. 
        # For backward compatibility, this returns total attempts for now.
        return obj.contest_submissions.count()

    def get_unique_candidates_count(self, obj):
        return obj.contest_submissions.values('user').distinct().count()

    def get_completed_count(self, obj):
        return obj.contest_submissions.filter(status__in=['completed', 'submitted']).count()

    def get_attempted_count(self, obj):
        return obj.contest_submissions.exclude(status='cancelled').count()

    def get_is_registered(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return obj.contest_submissions.filter(user=user).exists()
        return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        computed_status = getattr(instance, "computed_status", None)
        if computed_status:
            data["status"] = computed_status
        
        # Inject the new metrics into the response
        data['unique_candidates_count'] = self.get_unique_candidates_count(instance)
        data['completed_count'] = self.get_completed_count(instance)
        data['attempted_count'] = self.get_attempted_count(instance)
        
        return data


class SkillTestSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()

    my_submissions = serializers.SerializerMethodField()

    class Meta:
        model = SkillTest
        fields = [
            "id",
            "title",
            "description",
            "instructions",
            "difficulty",
            "duration",
            "total_marks",
            "passing_marks",
            "passing_percentage",
            "enable_proctoring",
            "questions_config",
            "questions_random_config",
            "publish_status",
            "course",
            "topic",
            "participants_count",
            "total_questions",
            "my_submissions",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_participants_count(self, obj):
        return obj.skill_test_submissions.count()

    def get_unique_candidates_count(self, obj):
        return obj.skill_test_submissions.values('user').distinct().count()

    def get_completed_count(self, obj):
        return obj.skill_test_submissions.filter(status__in=['completed', 'submitted']).count()

    def get_attempted_count(self, obj):
        return obj.skill_test_submissions.exclude(status='cancelled').count()

    def get_total_questions(self, obj):
        fixed_count = 0
        if obj.questions_config:
            for q_type, ids in obj.questions_config.items():
                if isinstance(ids, list):
                    fixed_count += len(ids)

        random_count = 0
        if obj.questions_random_config:
            for q_type, count in obj.questions_random_config.items():
                if isinstance(count, int):
                    random_count += count

        return fixed_count + random_count

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Inject the new metrics into the response
        data['unique_candidates_count'] = self.get_unique_candidates_count(instance)
        data['completed_count'] = self.get_completed_count(instance)
        data['attempted_count'] = self.get_attempted_count(instance)
        
        return data

    def get_my_submissions(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []

        submissions = obj.skill_test_submissions.filter(user=request.user).order_by(
            "-created_at"
        )
        return SimpleSubmissionSerializer(submissions, many=True).data


class SimpleCertificationSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificationSubmission
        fields = ["id", "status", "marks", "started_at", "completed_at", "created_at"]


class SimpleSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillTestSubmission
        fields = ["id", "status", "marks", "started_at", "completed_at", "created_at"]


class MockInterviewSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = MockInterview
        fields = [
            "id",
            "title",
            "description",
            "instructions",
            "max_duration",
            "ai_generation_mode",
            "ai_percentage",
            "ai_verbal_question_count",
            "ai_coding_question_count",
            "voice_type",
            "interviewer_name",
            "interviewer_voice_id",
            "voice_speed",
            "audio_settings",
            "required_skills",
            "optional_skills",
            "questions_config",
            "questions_random_config",
            "publish_status",
            "participants_count",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_participants_count(self, obj):
        return obj.mock_interview_submissions.count()


class JobTestSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = JobTest
        fields = [
            "id",
            "title",
            "description",
            "instructions",
            "difficulty",
            "duration",
            "total_marks",
            "passing_marks",
            "enable_proctoring",
            "questions_config",
            "questions_random_config",
            "publish_status",
            "company_name",
            "position_title",
            "start_datetime",
            "end_datetime",
            "participants_count",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_participants_count(self, obj):
        return obj.job_test_submissions.count()


class ContestSubmissionSerializer(serializers.ModelSerializer):
    contest_title = serializers.CharField(source="contest.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ContestSubmission
        fields = [
            "id",
            "contest",
            "contest_title",
            "user",
            "user_name",
            "status",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "proctoring_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


from course.serializers import QuestionSolutionSerializer

# ...

class SkillTestQuestionActivitySerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    question_content = serializers.CharField(source="question.content", read_only=True)
    mcq_options = serializers.JSONField(source="question.mcq_options", read_only=True)
    marks = serializers.FloatField(source="question.marks", read_only=True)
    test_cases_basic = serializers.JSONField(
        source="question.test_cases_basic", read_only=True
    )
    solution_code = serializers.CharField(
        source="question.solution_code", read_only=True
    )
    solution_language = serializers.CharField(
        source="question.solution_language", read_only=True
    )
    solutions = QuestionSolutionSerializer(
        source="question.solutions", many=True, read_only=True
    )

    class Meta:
        model = SkillTestQuestionActivity
        fields = [
            "id",
            "question",
            "question_title",
            "question_type",
            "question_content",
            "mcq_options",
            "marks",
            "test_cases_basic",
            "solution_code",
            "solution_language",
            "solutions",
            "question_activities",
            "navigation_activities",
            "proctoring_activities",
            "camera_snapshots",
            "alert_priority",
            "answer_data",
            "is_final_answer",
            "marks_obtained",
            "is_correct",
            "total_question_time",
            "violation_count",
            "has_violations",
            "created_at",
            "updated_at",
        ]


class SkillTestSubmissionSerializer(serializers.ModelSerializer):
    skill_test_title = serializers.CharField(source="skill_test.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    question_activities = SkillTestQuestionActivitySerializer(
        source="skill_test_question_activities", many=True, read_only=True
    )

    class Meta:
        model = SkillTestSubmission
        fields = [
            "id",
            "skill_test",
            "skill_test_title",
            "user",
            "user_name",
            "user_email",
            "status",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "proctoring_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "question_activities",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]



class MockInterviewSubmissionSerializer(serializers.ModelSerializer):
    mock_interview_title = serializers.CharField(
        source="mock_interview.title", read_only=True
    )
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    report_summary = serializers.SerializerMethodField()
    actual_duration_display = serializers.SerializerMethodField()
    interview_session_id = serializers.SerializerMethodField()

    def get_interview_session_id(self, obj):
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
            return obj.chat_session.interview_session.id
        return None

    def get_report_summary(self, obj):
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
             interview_session = obj.chat_session.interview_session
             if hasattr(interview_session, 'report'):
                 return {
                     "overall_score": interview_session.report.overall_score,
                     "feedback_summary": interview_session.report.feedback_summary
                 }
        return None

    def get_actual_duration_display(self, obj):
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
             interview_session = obj.chat_session.interview_session
             if interview_session.actual_duration:
                total_seconds = int(interview_session.actual_duration.total_seconds())
                minutes = total_seconds // 60
                seconds = total_seconds % 60
                return f"{minutes}m {seconds}s"
        return None

    class Meta:
        model = MockInterviewSubmission
        fields = [
            "id",
            "mock_interview",
            "mock_interview_title",
            "user",
            "user_name",
            "user_email",
            "status",
            "experience_level",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "proctoring_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "created_at",
            "updated_at",
            "report_summary",
            "actual_duration_display",
            "interview_session_id",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class JobTestSubmissionSerializer(serializers.ModelSerializer):
    job_test_title = serializers.CharField(source="job_test.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = JobTestSubmission
        fields = [
            "id",
            "job_test",
            "job_test_title",
            "user",
            "user_name",
            "status",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "proctoring_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
