from django.contrib import admin

from .models import (
    Lab,
    LabSprint,
    LabSprintTicket,
    UserGitHubIntegration,
    UserLabEnrollment,
    UserLabSprintTicketSubmission,
)


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "difficulty", "is_active", "created_at")
    list_filter = ("type", "difficulty", "is_active")
    search_fields = ("title", "description")
    ordering = ("-created_at",)


@admin.register(LabSprint)
class LabSprintAdmin(admin.ModelAdmin):
    list_display = ("title", "lab", "order_index", "created_at")
    list_filter = ("lab",)
    search_fields = ("title",)
    ordering = ("lab", "order_index")


@admin.register(LabSprintTicket)
class LabSprintTicketAdmin(admin.ModelAdmin):
    list_display = ("title", "ticket_slug", "sprint", "difficulty", "yuvro_points", "order_index")
    list_filter = ("sprint__lab", "difficulty", "editor_type")
    search_fields = ("title", "ticket_slug")
    ordering = ("sprint", "order_index")


@admin.register(UserLabEnrollment)
class UserLabEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "lab", "github_repo_name", "created_at")
    list_filter = ("lab",)
    search_fields = ("user__email", "lab__title", "github_repo_name")
    ordering = ("-created_at",)


@admin.register(UserLabSprintTicketSubmission)
class UserLabSprintTicketSubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "lab_sprint_ticket", "ticket_status", "yuvro_points", "minutes_solved", "created_at")
    list_filter = ("ticket_status", "lab_sprint_ticket__sprint__lab")
    search_fields = ("user__email", "lab_sprint_ticket__title")
    ordering = ("-created_at",)


@admin.register(UserGitHubIntegration)
class UserGitHubIntegrationAdmin(admin.ModelAdmin):
    list_display = ("user", "github_username", "github_repo", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("user__email", "github_username", "github_repo")
    ordering = ("-created_at",)
