from django.contrib import admin
from .models import PlannerCompany, PlannerRole, PlannerTopic, RoadmapTemplate, RoadmapTask

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
