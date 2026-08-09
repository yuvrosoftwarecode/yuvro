from rest_framework import serializers
from core.storage import build_public_url
from .models import (
    Evaluation,
    EvaluationSection,
    LabQuestionBank,
    QuestionDomain,
    ExperienceLevel,
    Difficulty,
    UserEvaluationSubmission,
    EvaluationSectionType,
    FollowUpConfig,
    FollowUpCandidate
)
import logging
from lab.workspace_manager import provision_evaluation_lab_starter_repo

logger = logging.getLogger(__name__)

import re

def provision_evaluation_labs(evaluation):
    for section in evaluation.sections.all():
        if section.type == EvaluationSectionType.LAB:
            for question_data in section.questions:
                q_id = None
                if isinstance(question_data, dict):
                    q_id = question_data.get('id')
                elif isinstance(question_data, str):
                    match = re.search(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', question_data)
                    if match:
                        q_id = match.group(0)
                    else:
                        q_id = question_data
                else:
                    q_id = str(question_data)
                    
                if not q_id:
                    continue
                    
                try:
                    lab = LabQuestionBank.objects.get(id=q_id)
                    if lab.git_repo_starter_url:
                        provision_evaluation_lab_starter_repo(evaluation.id, lab.id, lab.git_repo_starter_url)
                except LabQuestionBank.DoesNotExist:
                    logger.warning(f"LabQuestionBank with id {q_id} not found.")
                except Exception as e:
                    logger.error(f"Error provisioning lab for evaluation {evaluation.id}: {e}")


class SubmissionUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

class UserEvaluationSubmissionSerializer(serializers.ModelSerializer):
    user = SubmissionUserSerializer(read_only=True)

    class Meta:
        model = UserEvaluationSubmission
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        def process_events(events):
            if not isinstance(events, list):
                return events
            for event in events:
                if isinstance(event, dict):
                    if event.get("image_path"):
                        event["image_path"] = build_public_url(event["image_path"])
                    if event.get("screen_path"):
                        event["screen_path"] = build_public_url(event["screen_path"])
            return events

        if ret.get("proctoring_events"):
            ret["proctoring_events"] = process_events(ret["proctoring_events"])
        if ret.get("general_events"):
            ret["general_events"] = process_events(ret["general_events"])
            
        return ret

class EvaluationSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationSection
        fields = ['id', 'title', 'description', 'order_index', 'type', 'questions', 'proctoring_config']

class EvaluationSerializer(serializers.ModelSerializer):
    sections = EvaluationSectionSerializer(many=True, required=False)

    class Meta:
        model = Evaluation
        fields = [
            'id', 'title', 'description', 'is_public', 'domain', 
            'candidate_invited_emails', 'experience_level', 
            'maximum_attempts', 'expiry_datetime', 'is_published', 
            'sections', 'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        sections_data = validated_data.pop('sections', [])
        evaluation = Evaluation.objects.create(**validated_data)
        for section_data in sections_data:
            EvaluationSection.objects.create(evaluation=evaluation, created_by=evaluation.created_by, **section_data)
        
        provision_evaluation_labs(evaluation)
        return evaluation

    def update(self, instance, validated_data):
        sections_data = validated_data.pop('sections', None)
        instance = super().update(instance, validated_data)
        
        if sections_data is not None:
            # Simple replace strategy for sections: delete old, create new
            instance.sections.all().delete()
            for section_data in sections_data:
                EvaluationSection.objects.create(evaluation=instance, created_by=instance.created_by, **section_data)
                
        provision_evaluation_labs(instance)
        return instance

from .models import LabQuestionBankTask

class LabQuestionBankTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabQuestionBankTask
        fields = ['id', 'title', 'description', 'difficulty', 'scoring_rules']

class LabQuestionBankSerializer(serializers.ModelSerializer):
    tasks = LabQuestionBankTaskSerializer(many=True, read_only=True)
    
    class Meta:
        model = LabQuestionBank
        fields = '__all__'

from .models import UserLabQuestionBankTaskSubmission

class UserLabQuestionBankTaskSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLabQuestionBankTaskSubmission
        fields = '__all__'
        read_only_fields = ('user',)

class FollowUpConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpConfig
        fields = '__all__'

class FollowUpCandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpCandidate
        fields = '__all__'

from .models import CandidateNote, CandidateTimelineEvent

class CandidateNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CandidateNote
        fields = '__all__'
        read_only_fields = ('author',)

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email
        return None

class CandidateTimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateTimelineEvent
        fields = '__all__'

