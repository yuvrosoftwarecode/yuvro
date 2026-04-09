from django.contrib import admin
from .models import (
    PlannerCompany, PlannerRole, PlannerTopic, RoadmapTemplate, RoadmapTask,
    StudentPlan, StudentPlanTask, PrepTimeline, StudyTime
)

@admin.register(PlannerCompany)
class PlannerCompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at", "updated_at")
    search_fields = ("name", "description")

@admin.register(PlannerRole)
class PlannerRoleAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "difficulty", "created_at")
    list_filter = ("difficulty", "company")
    search_fields = ("title", "company__name")

@admin.register(PlannerTopic)
class PlannerTopicAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "difficulty", "question_count", "created_at")
    list_filter = ("category", "difficulty")
    search_fields = ("name",)

class RoadmapTaskInline(admin.TabularInline):
    model = RoadmapTask
    extra = 1
    ordering = ("day", "created_at")

@admin.register(RoadmapTemplate)
class RoadmapTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "duration_days", "company", "role", "created_at")
    list_filter = ("company", "duration_days")
    search_fields = ("title", "company__name", "role__title")
    inlines = [RoadmapTaskInline]

@admin.register(RoadmapTask)
class RoadmapTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "roadmap", "day", "task_type", "created_at")
    list_filter = ("task_type", "roadmap")
    search_fields = ("title", "roadmap__title")

@admin.register(PrepTimeline)
class PrepTimelineAdmin(admin.ModelAdmin):
    list_display = ("days", "created_at")

@admin.register(StudyTime)
class StudyTimeAdmin(admin.ModelAdmin):
    list_display = ("hours", "created_at")

class StudentPlanTaskInline(admin.TabularInline):
    model = StudentPlanTask
    extra = 0
    ordering = ("day_number", "created_at")

@admin.register(StudentPlan)
class StudentPlanAdmin(admin.ModelAdmin):
    list_display = ("student", "role_title", "company_name", "status", "progress_percentage", "created_at")
    list_filter = ("status", "company_type")
    search_fields = ("student__username", "role_title", "company_name")
    inlines = [StudentPlanTaskInline]
    readonly_fields = ("company_name", "role_title", "company_type", "topics")

@admin.register(StudentPlanTask)
class StudentPlanTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "plan", "day_number", "task_type", "is_completed")
    list_filter = ("task_type", "is_completed", "plan")
    search_fields = ("title", "plan__student__username")
