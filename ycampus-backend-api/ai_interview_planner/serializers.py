from rest_framework import serializers
from .models import PlannerCompany, PlannerRole, PlannerTopic, RoadmapTemplate, RoadmapTask, PrepTimeline, StudyTime

class PlannerRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannerRole
        fields = '__all__'
        read_only_fields = ('created_by',)

class PlannerCompanySerializer(serializers.ModelSerializer):
    roles = PlannerRoleSerializer(many=True, read_only=True)

    class Meta:
        model = PlannerCompany
        fields = '__all__'
        read_only_fields = ('created_by',)

class PlannerTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannerTopic
        fields = '__all__'
        read_only_fields = ('created_by',)

class RoadmapTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadmapTask
        fields = '__all__'
        read_only_fields = ('created_by',)

class RoadmapTemplateSerializer(serializers.ModelSerializer):
    tasks = RoadmapTaskSerializer(many=True, read_only=True)

    class Meta:
        model = RoadmapTemplate
        fields = '__all__'
        read_only_fields = ('created_by',)

class PrepTimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrepTimeline
        fields = '__all__'
        read_only_fields = ('created_by',)

class StudyTimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyTime
        fields = '__all__'
        read_only_fields = ('created_by',)

