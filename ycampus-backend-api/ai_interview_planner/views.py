from rest_framework import viewsets
from .models import PlannerCompany, PlannerRole, PlannerTopic, RoadmapTemplate, RoadmapTask, PrepTimeline, StudyTime
from .serializers import (
    PlannerCompanySerializer, 
    PlannerRoleSerializer, 
    PlannerTopicSerializer, 
    RoadmapTemplateSerializer, 
    RoadmapTaskSerializer,
    PrepTimelineSerializer,
    StudyTimeSerializer
)

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

