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
    PredefinedInterviewQuestion,
)

User = get_user_model()


class CertificationExamSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    my_submissions = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
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
            "subject",
            "subject_name",
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
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    
    class Meta:
        model = Certificate
        fields = [
            "id",
            "certificate_id",
            "user_name",
            "subject_name",
            "issued_at",
            "certificate_url",
        ]
        read_only_fields = ["id", "certificate_id", "issued_at", "user_name", "subject_name"]


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
        return obj.contest_submissions.count()

    def get_is_registered(self, obj):
        user = self.context.get("request").user
        if user.is_authenticated:
            return obj.contest_submissions.filter(user=user).exists()
        return False


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
            "enable_proctoring",
            "max_attempts",
            "questions_config",
            "questions_random_config",
            "publish_status",
            "test_type",
            "subject",
            "unit",
            "section",
            "participants_count",
            "total_questions",
            "my_submissions",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        # Strip raw question IDs from student-facing responses
        if request and hasattr(request.user, 'role') and request.user.role == 'student':
            data.pop("questions_config", None)
            data.pop("questions_random_config", None)
        return data

    def get_participants_count(self, obj):
        return obj.skill_test_submissions.count()

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
    user_progress = serializers.SerializerMethodField()
    my_submissions = serializers.SerializerMethodField()
    predefined_tree = serializers.SerializerMethodField()

    class Meta:
        model = MockInterview
        fields = [
            "id",
            "title",
            "description",
            "instructions",
            "max_duration",
            "required_skills",
            "optional_skills",
            "publish_status",
            "participants_count",
            "user_progress",
            "my_submissions",
            "predefined_tree",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_participants_count(self, obj):
        return obj.mock_interview_submissions.count()

    def get_predefined_tree(self, obj):
        """Recursively fetch the question tree."""
        def _serialize_node(node):
            return {
                "id": node.id,
                "text": node.text,
                "level": node.level,
                "follow_ups": [_serialize_node(f) for f in node.follow_ups.all().order_by('created_at')]
            }
        
        roots = PredefinedInterviewQuestion.objects.filter(mock_interview=obj, parent__isnull=True).order_by('created_at')
        return [_serialize_node(root) for root in roots]

    def create(self, validated_data):
        predefined_tree = self.initial_data.get('predefined_tree', [])
        mock_interview = super().create(validated_data)
        self._save_predefined_tree(mock_interview, predefined_tree)
        return mock_interview

    def update(self, instance, validated_data):
        predefined_tree = self.initial_data.get('predefined_tree')
        mock_interview = super().update(instance, validated_data)
        if predefined_tree is not None:
            # Clear existing tree for fresh update
            PredefinedInterviewQuestion.objects.filter(mock_interview=mock_interview).delete()
            self._save_predefined_tree(mock_interview, predefined_tree)
        return mock_interview

    def _save_predefined_tree(self, mock_interview, tree_data):
        user = self.context['request'].user
        
        def _create_node(node_data, parent=None, level=1):
            text = node_data.get('text')
            if not text:
                return
            
            q_obj = PredefinedInterviewQuestion.objects.create(
                mock_interview=mock_interview,
                text=text,
                parent=parent,
                level=level,
                created_by=user
            )
            
            for follow_up in node_data.get('follow_ups', []):
                _create_node(follow_up, parent=q_obj, level=level + 1)

        for root_data in tree_data:
            _create_node(root_data)

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        from .models import UserInterviewProgress
        progress = UserInterviewProgress.objects.filter(user=request.user, mock_interview=obj).first()
        if not progress:
            return {"completed_count": 0, "is_master": False}
        
        return {
            "completed_count": progress.completed_count,
            "is_master": progress.completed_count >= 5
        }

    def get_my_submissions(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        
        submissions = obj.mock_interview_submissions.filter(user=request.user).order_by('-created_at')
        return MockInterviewSubmissionSerializer(submissions, many=True).data


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
        return obj.certification_submissions.count()


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


class SkillTestQuestionActivitySerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    question_content = serializers.CharField(source="question.content", read_only=True)
    mcq_options = serializers.JSONField(source="question.mcq_options", read_only=True)
    marks = serializers.FloatField(source="question.marks", read_only=True)
    test_cases_basic = serializers.JSONField(
        source="question.test_cases_basic", read_only=True
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
    total_violations = serializers.SerializerMethodField()

    def get_total_violations(self, obj):
        return sum((activity.violation_count or 0) for activity in obj.skill_test_question_activities.all())

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
            "total_violations",
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
    report = serializers.SerializerMethodField()
    transcript = serializers.SerializerMethodField()
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

    def get_report(self, obj):
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
             interview_session = obj.chat_session.interview_session
             if hasattr(interview_session, 'report'):
                 report = interview_session.report
                 return {
                     "overall_score": report.overall_score,
                     "feedback_summary": report.feedback_summary,
                     "performance_metrics": report.performance_metrics,
                     "skill_analysis": report.skill_analysis,
                     "question_analysis": report.question_analysis,
                     "key_takeaways": report.key_takeaways,
                     "meta_stats": report.meta_stats,
                     "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
                 }
        return None

    def get_transcript(self, obj):
        if obj.chat_session:
            return [{
                "id": str(m.id),
                "message_type": m.message_type,
                "content": m.content,
                "created_at": m.created_at.isoformat() if hasattr(m.created_at, 'isoformat') else str(m.created_at)
            } for m in obj.chat_session.messages.all().order_by('created_at')]
        return []

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
            "interview_type",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "created_at",
            "updated_at",
            "report_summary",
            "report",
            "transcript",
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