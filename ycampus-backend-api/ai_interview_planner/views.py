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
        # 1. Fetch relevant entities for snapshot
        company_id = self.request.data.get('company')
        role_id = self.request.data.get('role')
        
        company = PlannerCompany.objects.get(id=company_id)
        role = PlannerRole.objects.get(id=role_id)
        role_topics = list(role.topics.all())
        
        # 2. Save the plan with snapshots
        plan = serializer.save(
            student=self.request.user, 
            created_by=self.request.user,
            company_name=company.name,
            role_title=role.title,
            company_type=company.company_type
        )
        
        # 3. Store the topics snapshot
        if role_topics:
            plan.topics.set(role_topics)
            
            # 4. Generate tasks specifically for THESE topics
            duration = plan.duration_days
            for i, topic in enumerate(role_topics):
                # Simple distribution: 1 topic per day or wrap around
                day = (i % duration) + 1
                StudentPlanTask.objects.create(
                    plan=plan,
                    day_number=day,
                    title=f"Master {topic.name}",
                    task_type="Topic",
                    reference_id=str(topic.id),
                    created_by=self.request.user
                )
        else:
            # Fallback if role has no topics: just add some generic ones or leave empty
            pass
        
        # 5. Add a few mock interviews
        for day in [max(1, plan.duration_days // 2), plan.duration_days]:
            StudentPlanTask.objects.create(
                plan=plan,
                day_number=day,
                title=f"Final Mock Interview - {plan.company_name}",
                task_type="Mock",
                created_by=self.request.user
            )


