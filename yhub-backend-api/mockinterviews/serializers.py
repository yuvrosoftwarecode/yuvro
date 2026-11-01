from rest_framework import serializers
from .models import (
    MockInterview,
    MockInterviewSubmission,
    PredefinedInterviewQuestion,
    UserInterviewProgress,
    CandidateMockInterviewQuota,
    MockInterviewPack,
    MockInterviewCreditLedger,
)

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
            "interview_mode",
            "required_skills",
            "optional_skills",
            "publish_status",
            "products",
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
        """Build question tree in-memory to eliminate N+1 queries."""
        all_questions = list(obj.predefined_questions.all().order_by('created_at', 'id'))
        if not all_questions:
            return []

        nodes_by_id = {
            q.id: {
                "id": q.id,
                "text": q.text,
                "level": q.level,
                "follow_ups": []
            }
            for q in all_questions
        }

        tree = []
        for q in all_questions:
            node = nodes_by_id[q.id]
            if q.parent_id and q.parent_id in nodes_by_id:
                nodes_by_id[q.parent_id]["follow_ups"].append(node)
            else:
                tree.append(node)

        return tree

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
        
        view = self.context.get('view')
        if view and getattr(view, 'action', None) == 'list':
            submissions = obj.mock_interview_submissions.filter(user=request.user).values(
                'id', 'status', 'marks', 'started_at', 'completed_at', 'created_at'
            )[:5]
            return list(submissions)

        submissions = obj.mock_interview_submissions.filter(user=request.user).order_by('-created_at')
        return MockInterviewSubmissionSerializer(submissions, many=True, context=self.context).data


class MockInterviewSubmissionSerializer(serializers.ModelSerializer):
    mock_interview_title = serializers.SerializerMethodField()
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    report_summary = serializers.SerializerMethodField()
    report = serializers.SerializerMethodField()
    report_bundle = serializers.SerializerMethodField()
    transcript = serializers.SerializerMethodField()
    actual_duration_display = serializers.SerializerMethodField()
    interview_session_id = serializers.SerializerMethodField()

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
            "selected_duration",
            "resume",
            "old_chat_session_id",
            "interview_type",
            "state_data", "session_state",
            "started_at",
            "submitted_at",
            "completed_at",
            "marks",
            "report_summary",
            "report",
            "report_bundle",
            "transcript",
            "actual_duration_display",
            "interview_session_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_mock_interview_title(self, obj):
        if obj.mock_interview:
            return obj.mock_interview.title
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
            return obj.chat_session.interview_session.role_title
        if obj.chat_session:
            return obj.chat_session.title
        return "JD & Resume AI Mock Interview"

    def get_interview_session_id(self, obj):
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
            return obj.chat_session.interview_session.id
        return obj.old_chat_session_id

    def get_report_summary(self, obj):
        if obj.session_state and isinstance(obj.session_state, dict):
            if "report_bundle" in obj.session_state:
                overall = obj.session_state["report_bundle"].get("overall_report", {})
                return {
                    "overall_score": overall.get("overall_score"),
                    "recommendation": overall.get("recommendation"),
                    "feedback_summary": overall.get("executive_summary")
                }
            if "report" in obj.session_state:
                rep = obj.session_state["report"]
                return {
                    "overall_score": rep.get("overall_score"),
                    "recommendation": rep.get("recommendation"),
                    "feedback_summary": rep.get("executive_summary")
                }
        if obj.chat_session and hasattr(obj.chat_session, 'interview_session'):
             interview_session = obj.chat_session.interview_session
             if hasattr(interview_session, 'report'):
                 return {
                     "overall_score": interview_session.report.overall_score,
                     "feedback_summary": interview_session.report.feedback_summary
                 }
        return None

    def get_report(self, obj):
        if obj.session_state and isinstance(obj.session_state, dict):
            if "report" in obj.session_state:
                return obj.session_state["report"]
            if "report_bundle" in obj.session_state:
                return obj.session_state["report_bundle"].get("vitarka_report")
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

    def get_report_bundle(self, obj):
        if obj.session_state and isinstance(obj.session_state, dict):
            if "report_bundle" in obj.session_state:
                return obj.session_state["report_bundle"]
        return None

    def get_transcript(self, obj):
        view = self.context.get('view')
        if view and getattr(view, 'action', None) in ['list', 'my_interviews']:
            return []

        if obj.chat_session and obj.chat_session.messages.exists():
            return [{
                "id": str(m.id),
                "message_type": m.message_type,
                "content": m.content,
                "created_at": m.created_at.isoformat() if hasattr(m.created_at, 'isoformat') else str(m.created_at)
            } for m in obj.chat_session.messages.all().order_by('created_at')]
        
        # Fallback to session_state turns if chat_session messages are empty
        if obj.session_state and isinstance(obj.session_state, dict):
            questions = {q.get("id"): q for q in obj.session_state.get("questions", [])}
            answers = obj.session_state.get("answers", [])
            transcript = []
            
            for q in obj.session_state.get("questions", []):
                transcript.append({
                    "id": q.get("id"),
                    "message_type": "assistant",
                    "content": q.get("prompt", ""),
                    "created_at": q.get("created_at", "")
                })
                # Find matching answer
                for a in answers:
                    if a.get("question_id") == q.get("id"):
                        transcript.append({
                            "id": a.get("id"),
                            "message_type": "user",
                            "content": a.get("transcript") or a.get("text", ""),
                            "created_at": a.get("created_at", "")
                        })
            if transcript:
                return transcript

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


class CandidateMockInterviewQuotaSerializer(serializers.ModelSerializer):
    available_interviews = serializers.IntegerField(read_only=True)
    total_granted = serializers.IntegerField(read_only=True)

    class Meta:
        model = CandidateMockInterviewQuota
        fields = [
            "id",
            "free_interviews",
            "purchased_interviews",
            "used_interviews",
            "available_interviews",
            "total_granted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class MockInterviewPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockInterviewPack
        fields = [
            "id",
            "name",
            "description",
            "interviews_count",
            "price_inr",
            "price_paise",
            "badge",
            "sort_order",
            "is_active",
        ]


class MockInterviewCreditLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockInterviewCreditLedger
        fields = [
            "id",
            "entry_type",
            "delta",
            "balance_after",
            "description",
            "created_at",
        ]

