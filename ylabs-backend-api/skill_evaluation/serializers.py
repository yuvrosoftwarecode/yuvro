from rest_framework import serializers
from .models import (
    Evaluation,
    EvaluationSection,
    LabQuestionBank,
    QuestionDomain,
    ExperienceLevel,
    Difficulty
)

class EvaluationSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationSection
        fields = ['id', 'title', 'description', 'order_index', 'type', 'questions']

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

class LabQuestionBankSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabQuestionBank
        fields = '__all__'

