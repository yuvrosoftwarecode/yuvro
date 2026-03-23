from django.contrib import admin
from .models import (
    College, Batch, Department, Semester, Section,
    StudentProfile, FacultyProfile, HODProfile, PrincipalProfile, CollegeAdminProfile,
    AttendanceSession, AttendanceRecord,
    TPOProfile, Note
)


class BatchInline(admin.TabularInline):
    model = Batch
    extra = 0
    fields = ["name"]


class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 0
    fields = ["name", "short_form"]


class SemesterInline(admin.TabularInline):
    model = Semester
    extra = 0
    fields = ["number", "is_current"]


class SectionInline(admin.TabularInline):
    model = Section
    extra = 0
    fields = ["name"]


@admin.register(College)
class CollegeAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "short_form",
        "college_type",
        "affiliated_university",
        "is_aicte_approved",
        "is_ugc_approved",
    ]
    list_filter = ["college_type", "affiliated_university", "is_aicte_approved", "is_ugc_approved"]
    search_fields = ["name", "short_form"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [DepartmentInline]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "college", "short_form", "created_at", "updated_at"]
    list_filter = ["college", "created_at"]
    search_fields = ["name", "college__name", "short_form"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [BatchInline]


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ["name", "department", "created_at", "updated_at"]
    list_filter = ["department", "created_at"]
    search_fields = ["name", "department__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [SemesterInline]


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ["number", "batch", "is_current", "created_at", "updated_at"]
    list_filter = ["batch", "is_current", "created_at"]
    search_fields = ["batch__name", "number"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [SectionInline]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ["name", "semester", "created_at"]
    list_filter = ["semester__batch", "semester"]
    search_fields = ["name", "semester__batch__name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "roll_number", "college", "department"]
    list_filter = ["college", "department", "batch"]
    search_fields = ["user__email", "roll_number", "user__first_name", "user__last_name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "designation", "college", "department"]
    list_filter = ["college", "department"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "designation"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(HODProfile)
class HODProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "department", "college"]
    list_filter = ["college", "department"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "department__name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(PrincipalProfile)
class PrincipalProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "college"]
    list_filter = ["college"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "college__name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(CollegeAdminProfile)
class CollegeAdminProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "college"]
    list_filter = ["college"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "college__name"]
    readonly_fields = ["id", "created_at", "updated_at"]

@admin.register(TPOProfile)
class TPOProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "college"]
    list_filter = ["college"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "college__name"]
    readonly_fields = ["id", "created_at", "updated_at"]

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ["content_preview", "user", "created_at"]
    list_filter = ["user", "created_at"]
    search_fields = ["content", "user__username", "user__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    
    def content_preview(self, obj):
        return obj.content[:30] + "..." if len(obj.content) > 30 else obj.content
    content_preview.short_description = "Content"
