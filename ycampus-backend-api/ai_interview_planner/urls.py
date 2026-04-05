from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlannerCompanyViewSet,
    PlannerRoleViewSet,
    PlannerTopicViewSet,
    RoadmapTemplateViewSet,
    RoadmapTaskViewSet,
    PrepTimelineViewSet,
    StudyTimeViewSet
)

router = DefaultRouter()
router.register(r'companies', PlannerCompanyViewSet)
router.register(r'roles', PlannerRoleViewSet)
router.register(r'topics', PlannerTopicViewSet)
router.register(r'roadmaps', RoadmapTemplateViewSet)
router.register(r'tasks', RoadmapTaskViewSet)
router.register(r'prep-timelines', PrepTimelineViewSet)
router.register(r'study-times', StudyTimeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
