from rest_framework import serializers
from .models import (
    PlannerCompany, PlannerRole, PlannerTopic, RoadmapTemplate, RoadmapTask, 
    PrepTimeline, StudyTime, StudentPlan, StudentPlanTask
)

class PlannerRoleSerializer(serializers.ModelSerializer):
    required_skills = serializers.SlugRelatedField(
        many=True,
        slug_field='name',
        queryset=PlannerTopic.objects.all(),
        source='topics'
    )

    class Meta:
        model = PlannerRole
        fields = ('id', 'company', 'title', 'difficulty', 'required_skills', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

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

class StudentPlanTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentPlanTask
        fields = '__all__'
        read_only_fields = ('created_by',)

class StudentPlanSerializer(serializers.ModelSerializer):
    tasks = StudentPlanTaskSerializer(many=True, read_only=True)
    topics = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')

    class Meta:
        model = StudentPlan
        fields = (
            'id', 'student', 'company', 'role', 'duration_days', 'daily_hours',
            'company_name', 'role_title', 'company_type', 'topics',
            'status', 'progress_percentage', 'tasks', 'created_at'
        )
        read_only_fields = (
            'student', 'created_by', 'progress_percentage', 
            'company_name', 'role_title', 'company_type', 'topics'
        )
