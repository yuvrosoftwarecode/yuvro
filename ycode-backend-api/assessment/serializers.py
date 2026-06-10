from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Contest,
    MockInterview,
    JobTest,
    SkillTest,
    ContestSubmission,
    MockInterviewSubmission,
    JobTestSubmission, SkillTestSubmission,
    SkillTestQuestionActivity, ContestQuestionActivity, MockInterviewQuestionActivity, JobTestQuestionActivity,
    CertificationExam, CertificationSubmission, CertificationQuestionActivity, Certificate,
    ContestRegistration
)
from django.utils import timezone
from django.utils.timezone import localdate
from core.storage import build_public_url


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
            "tab_switch_threshold",
            "violation_threshold",
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        
        # Build URLs for camera_snapshots
        snapshots = data.get("camera_snapshots")
        if snapshots and isinstance(snapshots, list):
            for snap in snapshots:
                if isinstance(snap, dict) and snap.get("image_path"):
                    snap["image_path"] = build_public_url(snap["image_path"])
                    
        # Build URLs for proctoring_activities
        activities = data.get("proctoring_activities")
        if activities and isinstance(activities, list):
            for act in activities:
                if isinstance(act, dict) and act.get("image_path"):
                    act["image_path"] = build_public_url(act["image_path"])

        # Build URLs for navigation_activities
        nav_activities = data.get("navigation_activities")
        if nav_activities and isinstance(nav_activities, list):
            for act in nav_activities:
                if isinstance(act, dict) and act.get("image_path"):
                    act["image_path"] = build_public_url(act["image_path"])

        # Build URLs for question_activities
        q_activities = data.get("question_activities")
        if q_activities and isinstance(q_activities, list):
            for act in q_activities:
                if isinstance(act, dict) and act.get("image_path"):
                    act["image_path"] = build_public_url(act["image_path"])
                    
        return data


class CertificateSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    certificate_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Certificate
        fields = [
            "id",
            "display_id",
            "user_name",
            "course_name",
            "issued_at",
            "certificate_url",
        ]
        read_only_fields = ["id", "display_id", "issued_at", "user_name", "course_name"]

    def get_certificate_url(self, obj):
        return f"/api/assessment/certificates/{obj.id}/view/"


class CertificationSubmissionSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source="certification_exam.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    attempt_number = serializers.SerializerMethodField()
    question_activities = CertificationQuestionActivitySerializer(
        source="certification_question_activities", many=True, read_only=True
    )
    certificate = CertificateSerializer(read_only=True)

    total_violations = serializers.SerializerMethodField()
    tab_switch_count = serializers.SerializerMethodField()

    def get_attempt_number(self, obj):
        # Calculate attempt number based on creation time for this user/exam
        return CertificationSubmission.objects.filter(
            certification_exam=obj.certification_exam,
            user=obj.user,
            created_at__lte=obj.created_at
        ).count()

    def get_total_violations(self, obj):
        q_violations = sum(qa.violation_count or 0 for qa in obj.certification_question_activities.all())
        sub_violations = len(obj.proctoring_events or [])
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        
        q_tab_switches = 0
        for qa in obj.certification_question_activities.all():
            q_tab_switches += sum(1 for e in (qa.navigation_activities or []) if e.get('activity_type') == 'tab_switched')
            
        tab_switch_count = q_tab_switches + sub_tab_switches
        return q_violations + sub_violations + tab_switch_count

    def get_tab_switch_count(self, obj):
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        q_tab_switches = 0
        for qa in obj.certification_question_activities.all():
            q_tab_switches += sum(1 for e in (qa.navigation_activities or []) if e.get('activity_type') == 'tab_switched')
        return q_tab_switches + sub_tab_switches

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        events = data.get("proctoring_events")
        if events and isinstance(events, list):
            for e in events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        
        gen_events = data.get("general_events")
        if gen_events and isinstance(gen_events, list):
            for e in gen_events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        return data

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
            "general_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "question_activities",
            "certificate",
            "created_at",
            "attempt_number",
            "updated_at",
            "total_violations",
            "tab_switch_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContestSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()
    my_submission_status = serializers.SerializerMethodField()

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
            "open_for_all_colleges",
            "allowed_colleges",
            "open_for_all_departments",
            "allowed_departments",
            "require_student_id",
            "registration_start_datetime",
            "registration_end_datetime",
            "allow_late_entry",
            "participants_count",
            "questions_config",
            "questions_random_config",
            "instructions",
            "total_marks",
            "passing_marks",
            "enable_proctoring",
            "tab_switch_threshold",
            "violation_threshold",
            "publish_status",
            "created_by",
            "created_at",
            "updated_at",
            "is_registered",
            "my_submission_status",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "is_registered",
            "my_submission_status",
        ]

    def validate(self, attrs):
        
        start_datetime = attrs.get('start_datetime')
        end_datetime = attrs.get('end_datetime')
        registration_start_datetime = attrs.get('registration_start_datetime')
        registration_end_datetime = attrs.get('registration_end_datetime')

        today = localdate()

        if end_datetime:
            end_date = end_datetime.date()
            is_changed = not self.instance or self.instance.end_datetime != end_datetime
            if is_changed and end_date < today:
                raise serializers.ValidationError({
                    "end_datetime": "End Date cannot be yesterday's date or past dates."
                })

        if registration_end_datetime:
            reg_end_date = registration_end_datetime.date()
            is_changed = not self.instance or self.instance.registration_end_datetime != registration_end_datetime
            if is_changed and reg_end_date < today:
                raise serializers.ValidationError({
                    "registration_end_datetime": "Registration End Date cannot be yesterday's date or past dates."
                })

        start = start_datetime or (self.instance.start_datetime if self.instance else None)
        end = end_datetime or (self.instance.end_datetime if self.instance else None)
        reg_start = registration_start_datetime or (self.instance.registration_start_datetime if self.instance else None)
        reg_end = registration_end_datetime or (self.instance.registration_end_datetime if self.instance else None)

        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_datetime": "End Date must be after Start Date."
            })

        if reg_start and reg_end and reg_end <= reg_start:
            raise serializers.ValidationError({
                "registration_end_datetime": "Registration End Date must be after Registration Start Date."
            })

        return attrs

    def get_participants_count(self, obj):
        # Returns the number of registered participants (registrations, not attempts)
        return obj.registrations.count()

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
            return ContestRegistration.objects.filter(contest=obj, user=user).exists()
        return False

    def get_my_submission_status(self, obj):
        """Returns the current user's submission status for this contest, or None if not attempted."""
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            submission = ContestSubmission.objects.filter(contest=obj, user=user).first()
            if submission:
                return submission.status
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        computed_status = getattr(instance, "computed_status", None)
        if computed_status:
            data["status"] = computed_status
        
        # Inject the new metrics into the response
        data['unique_candidates_count'] = self.get_unique_candidates_count(instance)
        data['completed_count'] = self.get_completed_count(instance)
        data['attempted_count'] = self.get_attempted_count(instance)

        # Replace raw M2M IDs with name+id details for college/department restrictions
        # This avoids exposing bare IDs while still giving the frontend what it needs
        if not instance.open_for_all_colleges:
            details = [{'id': str(c.id), 'name': c.name} for c in instance.allowed_colleges.all()]
            data['allowed_colleges'] = [d['id'] for d in details]  # keep IDs for write compatibility
            data['allowed_colleges_details'] = details
        else:
            data['allowed_colleges'] = []
            data['allowed_colleges_details'] = []

        if not instance.open_for_all_departments:
            details = [{'id': str(d.id), 'name': d.name} for d in instance.allowed_departments.all()]
            data['allowed_departments'] = [d['id'] for d in details]
            data['allowed_departments_details'] = details
        else:
            data['allowed_departments'] = []
            data['allowed_departments_details'] = []
        
        return data


class ContestRegistrationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    college_name = serializers.CharField(source='user.profile.college.name', read_only=True, default=None)
    department_name = serializers.CharField(source='user.profile.department.name', read_only=True, default=None)
    
    class Meta:
        model = ContestRegistration
        fields = [
            "id", "contest", "user", 
            "user_name", "user_email", 
            "college_name", "department_name", 
            "registered_at"
        ]
        read_only_fields = ["id", "contest", "user", "registered_at"]


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
            "tab_switch_threshold",
            "violation_threshold",
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
            "ai_context",
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
            "enable_proctoring",
            "tab_switch_threshold",
            "violation_threshold",
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
            "tab_switch_threshold",
            "violation_threshold",
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

from course.serializers import QuestionSolutionSerializer

class ContestQuestionActivitySerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    question_content = serializers.CharField(source="question.content", read_only=True)
    mcq_options = serializers.JSONField(source="question.mcq_options", read_only=True)
    marks = serializers.FloatField(source="question.marks", read_only=True)
    test_cases_basic = serializers.JSONField(
        source="question.test_cases_basic", read_only=True
    )
    solutions = QuestionSolutionSerializer(
        source="question.solutions", many=True, read_only=True
    )

    class Meta:
        from .models import ContestQuestionActivity
        model = ContestQuestionActivity
        fields = [
            "id",
            "question",
            "question_title",
            "question_type",
            "question_content",
            "mcq_options",
            "marks",
            "test_cases_basic",
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Build URLs for camera_snapshots
        snapshots = data.get("camera_snapshots")
        if snapshots and isinstance(snapshots, list):
            for snap in snapshots:
                if isinstance(snap, dict) and snap.get("image_path"):
                    snap["image_path"] = build_public_url(snap["image_path"])
                    
        # Build URLs for proctoring_activities
        activities = data.get("proctoring_activities")
        if activities and isinstance(activities, list):
            for act in activities:
                if isinstance(act, dict) and act.get("image_path"):
                    act["image_path"] = build_public_url(act["image_path"])
                    
        return data


class ContestSubmissionSerializer(serializers.ModelSerializer):
    contest_title = serializers.CharField(source="contest.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    question_activities = ContestQuestionActivitySerializer(
        source="contest_question_activities", many=True, read_only=True
    )

    total_violations = serializers.SerializerMethodField()
    tab_switch_count = serializers.SerializerMethodField()

    def get_total_violations(self, obj):
        q_violations = sum(qa.violation_count or 0 for qa in obj.contest_question_activities.all())
        sub_violations = len(obj.proctoring_events or [])
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        
        q_tab_switches = 0
        for qa in obj.contest_question_activities.all():
            q_tab_switches += sum(1 for e in (qa.navigation_activities or []) if e.get('activity_type') == 'tab_switched')
            
        tab_switch_count = q_tab_switches + sub_tab_switches
        return q_violations + sub_violations + tab_switch_count

    def get_tab_switch_count(self, obj):
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        q_tab_switches = 0
        for qa in obj.contest_question_activities.all():
            q_tab_switches += sum(1 for e in (qa.navigation_activities or []) if e.get('activity_type') == 'tab_switched')
        return q_tab_switches + sub_tab_switches

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        events = data.get("proctoring_events")
        if events and isinstance(events, list):
            for e in events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        
        gen_events = data.get("general_events")
        if gen_events and isinstance(gen_events, list):
            for e in gen_events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        return data

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
            "general_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "question_activities",
            "created_at",
            "updated_at",
            "total_violations",
            "tab_switch_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        
        # Build URLs for camera_snapshots
        snapshots = data.get("camera_snapshots")
        if snapshots and isinstance(snapshots, list):
            for snap in snapshots:
                if isinstance(snap, dict) and snap.get("image_path"):
                    snap["image_path"] = build_public_url(snap["image_path"])
                    
        # Build URLs for proctoring_activities
        activities = data.get("proctoring_activities")
        if activities and isinstance(activities, list):
            for act in activities:
                if isinstance(act, dict) and act.get("image_path"):
                    act["image_path"] = build_public_url(act["image_path"])
                    
        return data


class SkillTestSubmissionSerializer(serializers.ModelSerializer):
    skill_test_title = serializers.CharField(source="skill_test.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    question_activities = SkillTestQuestionActivitySerializer(
        source="skill_test_question_activities", many=True, read_only=True
    )

    total_violations = serializers.SerializerMethodField()
    tab_switch_count = serializers.SerializerMethodField()

    def get_total_violations(self, obj):
        q_violations = sum(qa.violation_count or 0 for qa in obj.skill_test_question_activities.all())
        sub_violations = len(obj.proctoring_events or [])
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        
        q_tab_switches = 0
        for qa in obj.skill_test_question_activities.all():
            q_tab_switches += sum(1 for e in (qa.navigation_activities or []) if e.get('activity_type') == 'tab_switched')
            
        tab_switch_count = q_tab_switches + sub_tab_switches
        return q_violations + sub_violations + tab_switch_count

    def get_tab_switch_count(self, obj):
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        q_tab_switches = 0
        for qa in obj.skill_test_question_activities.all():
            q_tab_switches += sum(1 for e in (qa.navigation_activities or []) if e.get('activity_type') == 'tab_switched')
        return q_tab_switches + sub_tab_switches

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        events = data.get("proctoring_events")
        if events and isinstance(events, list):
            for e in events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        
        gen_events = data.get("general_events")
        if gen_events and isinstance(gen_events, list):
            for e in gen_events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        return data

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
            "general_events",
            "browser_info",
            "ip_address",
            "user_agent",
            "question_activities",
            "created_at",
            "updated_at",
            "total_violations",
            "tab_switch_count",
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
            "general_events",
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


class JobTestQuestionActivitySerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    question_content = serializers.CharField(source="question.content", read_only=True)
    mcq_options = serializers.JSONField(source="question.mcq_options", read_only=True)
    marks = serializers.FloatField(source="question.marks", read_only=True)
    test_cases_basic = serializers.JSONField(
        source="question.test_cases_basic", read_only=True
    )
    solutions = QuestionSolutionSerializer(
        source="question.solutions", many=True, read_only=True
    )

    class Meta:
        model = JobTestQuestionActivity
        fields = [
            "id",
            "question",
            "question_title",
            "question_type",
            "question_content",
            "mcq_options",
            "marks",
            "test_cases_basic",
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Build URLs for camera_snapshots
        snapshots = data.get("camera_snapshots")
        if snapshots and isinstance(snapshots, list):
            for snap in snapshots:
                if isinstance(snap, dict) and snap.get("image_path"):
                    snap["image_path"] = build_public_url(snap["image_path"])
                    
        # Build URLs for proctoring_activities
        activities = data.get("proctoring_activities")
        if activities and isinstance(activities, list):
            for act in activities:
                if isinstance(act, dict) and act.get("image_path"):
                    act["image_path"] = build_public_url(act["image_path"])
                    
        return data


class JobTestSubmissionSerializer(serializers.ModelSerializer):
    job_test_title = serializers.CharField(source="job_test.title", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    question_activities = JobTestQuestionActivitySerializer(
        source="job_test_question_activities", many=True, read_only=True
    )

    total_violations = serializers.SerializerMethodField()
    tab_switch_count = serializers.SerializerMethodField()

    def get_total_violations(self, obj):
        sub_violations = len(obj.proctoring_events or [])
        sub_tab_switches = sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')
        return sub_violations + sub_tab_switches

    def get_tab_switch_count(self, obj):
        return sum(1 for e in (obj.general_events or []) if e.get('activity_type') == 'tab_switched')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        events = data.get("proctoring_events")
        if events and isinstance(events, list):
            for e in events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        
        gen_events = data.get("general_events")
        if gen_events and isinstance(gen_events, list):
            for e in gen_events:
                if isinstance(e, dict) and e.get("image_path"):
                    e["image_path"] = build_public_url(e["image_path"])
        return data

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
            "general_events",
            "ip_address",
            "user_agent",
            "question_activities",
            "created_at",
            "updated_at",
            "total_violations",
            "tab_switch_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
