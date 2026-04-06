from rest_framework import viewsets
from .models import (
    PlannerCompany, PlannerRole, PlannerTopic, RoadmapTemplate, RoadmapTask, 
    PrepTimeline, StudyTime, StudentPlan, StudentPlanTask
)
from .serializers import (
    PlannerCompanySerializer, 
    PlannerRoleSerializer, 
    PlannerTopicSerializer, 
    RoadmapTemplateSerializer, 
    RoadmapTaskSerializer,
    PrepTimelineSerializer,
    StudyTimeSerializer,
    StudentPlanSerializer,
    StudentPlanTaskSerializer
)
import random

class PlannerCompanyViewSet(viewsets.ModelViewSet):
    queryset = PlannerCompany.objects.all()
    serializer_class = PlannerCompanySerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PlannerRoleViewSet(viewsets.ModelViewSet):
    queryset = PlannerRole.objects.all()
    serializer_class = PlannerRoleSerializer
    
    def get_queryset(self):
        queryset = PlannerRole.objects.all()
        company_id = self.request.query_params.get('companyId', None)
        if company_id is not None:
            queryset = queryset.filter(company_id=company_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PlannerTopicViewSet(viewsets.ModelViewSet):
    queryset = PlannerTopic.objects.all()
    serializer_class = PlannerTopicSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class RoadmapTemplateViewSet(viewsets.ModelViewSet):
    queryset = RoadmapTemplate.objects.all()
    serializer_class = RoadmapTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class RoadmapTaskViewSet(viewsets.ModelViewSet):
    queryset = RoadmapTask.objects.all()
    serializer_class = RoadmapTaskSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PrepTimelineViewSet(viewsets.ModelViewSet):
    queryset = PrepTimeline.objects.all()
    serializer_class = PrepTimelineSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class StudyTimeViewSet(viewsets.ModelViewSet):
    queryset = StudyTime.objects.all()
    serializer_class = StudyTimeSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class StudentPlanTaskViewSet(viewsets.ModelViewSet):
    queryset = StudentPlanTask.objects.all()
    serializer_class = StudentPlanTaskSerializer
    filterset_fields = ['plan', 'is_completed']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class StudentPlanViewSet(viewsets.ModelViewSet):
    queryset = StudentPlan.objects.all()
    serializer_class = StudentPlanSerializer

    def get_queryset(self):
        return StudentPlan.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        # Save the plan first
        plan = serializer.save(student=self.request.user, created_by=self.request.user)
        
        # Simple generation logic:
        # Distribute available topics across the duration
        topics = list(PlannerTopic.objects.all())
        random.shuffle(topics)
        
        duration = plan.duration_days
        
        # Create a few tasks per day or spread topics
        for i, topic in enumerate(topics[:duration]): # limit to duration for now
            day = (i % duration) + 1
            StudentPlanTask.objects.create(
                plan=plan,
                day_number=day,
                title=f"Master {topic.name}",
                task_type="Topic",
                reference_id=str(topic.id),
                created_by=self.request.user
            )
        
        # Add a few mock interviews
        for day in [duration // 2, duration]:
            StudentPlanTask.objects.create(
                plan=plan,
                day_number=day,
                title=f"Final Mock Interview - {plan.company.name}",
                task_type="Mock",
                created_by=self.request.user
            )


