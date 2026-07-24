from rest_framework import serializers
from core.storage import build_public_url
from .models import (
    Evaluation,
    EvaluationSection,
    LabQuestionBank,
    QuestionDomain,
    ExperienceLevel,
    Difficulty,
    UserEvaluationSubmission
)

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
        return evaluation

    def update(self, instance, validated_data):
        sections_data = validated_data.pop('sections', None)
        instance = super().update(instance, validated_data)
        
        if sections_data is not None:
            # Simple replace strategy for sections: delete old, create new
            instance.sections.all().delete()
            for section_data in sections_data:
                EvaluationSection.objects.create(evaluation=instance, created_by=instance.created_by, **section_data)
                
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

