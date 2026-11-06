from django.contrib import admin
from .models import (
    Lab, LabSprint, LabSprintTicket,
    UserLabEnrollment, UserLabSprintTicketSubmission,
    SystemDesign,
)

@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'difficulty', 'status')
    list_filter = ('type', 'difficulty', 'status')
    search_fields = ('title', 'description')

@admin.register(LabSprint)
class LabSprintAdmin(admin.ModelAdmin):
    list_display = ('title', 'lab', 'order_index')
    list_filter = ('lab',)
    search_fields = ('title',)

@admin.register(LabSprintTicket)
class LabSprintTicketAdmin(admin.ModelAdmin):
    list_display = ('title', 'sprint', 'ticket_slug', 'difficulty', 'order_index')
    list_filter = ('sprint__lab', 'difficulty')
    search_fields = ('title', 'ticket_slug')

@admin.register(UserLabEnrollment)
class UserLabEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'lab', 'is_unlocked', 'created_at')
    list_filter = ('lab', 'is_unlocked', 'created_at')
    search_fields = ('user__email', 'lab__title')

@admin.register(UserLabSprintTicketSubmission)
class UserLabSprintTicketSubmissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'lab_sprint_ticket', 'ticket_status', 'yuvro_points')
    list_filter = ('ticket_status', 'lab_sprint_ticket__sprint__lab')
    search_fields = ('user__email', 'lab_sprint_ticket__title')

@admin.register(SystemDesign)
class SystemDesignAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'lab', 'ticket', 'is_template', 'is_submitted', 'updated_at')
    list_filter = ('is_template', 'is_submitted', 'lab')
    search_fields = ('title', 'user__email', 'ticket__title')

