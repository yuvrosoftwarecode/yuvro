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
from asgiref.sync import async_to_sync
from rest_framework.exceptions import ValidationError
from core.models import StudentProfile
from .services import PreparationPlanGenerator, AIServiceError

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
        
        # 2. Fetch student profile for AI context
        try:
            student_profile = StudentProfile.objects.get(user=self.request.user)
        except StudentProfile.DoesNotExist:
            raise ValidationError({"detail": "Student profile not found. Please complete your profile first."})

        # 3. Save the plan with snapshots
        plan = serializer.save(
            student=self.request.user, 
            created_by=self.request.user,
            company_name=company.name,
            role_title=role.title,
            company_type=company.company_type
        )
        
        # 4. Store the topics snapshot
        if role_topics:
            plan.topics.set(role_topics)
            
        # 5. Generate tasks using AI
        generator = PreparationPlanGenerator()
        topic_names = [t.name for t in role_topics]
        
        try:
            # Resolve context strings in sync context to avoid async ORM access issues
            dept_name = student_profile.department.name if student_profile.department else "N/A"
            semester_num = str(student_profile.semester.number) if student_profile.semester else "N/A"
            
            # Plan generation should be perfect for all days
            ai_tasks = async_to_sync(generator.generate_plan)(
                student_dept=dept_name,
                student_semester=semester_num,
                company_name=company.name,
                company_type=company.company_type,
                role_title=role.title,
                role_difficulty=role.difficulty,
                duration_days=plan.duration_days,
                daily_hours=plan.daily_hours,
                topics=topic_names
            )
            
            # 6. Create StudentPlanTask records from AI response
            for task_data in ai_tasks:
                StudentPlanTask.objects.create(
                    plan=plan,
                    day_number=task_data.get('day_number'),
                    title=task_data.get('title'),
                    task_type=task_data.get('task_type', 'Topic'),
                    reference_id=task_data.get('reference_id'),
                    created_by=self.request.user
                )
                
        except AIServiceError as e:
            # If AI fails, we delete the plan (since no fallback is requested) and raise error
            plan.delete()
            raise ValidationError({"detail": f"AI Plan Generation Failed: {str(e)}"})
        except Exception as e:
            plan.delete()
            raise ValidationError({"detail": f"An unexpected error occurred during plan generation: {str(e)}"})


