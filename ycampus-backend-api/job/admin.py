from django.contrib import admin
from .models import (
    Job,
    Company,
    JobApplication,
    SocialLinks,
    Skill,
    Experience,
    Project,
    Education,
    Certification,
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "domain", "size", "location", "created_at"]
    list_filter = ["size", "created_at"]
    search_fields = ["name", "domain", "location"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "domain", "website")}),
        ("Details", {"fields": ("size", "description", "location")}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "company",
        "employment_type",
        "status",
        "is_remote",
        "posted_at",
        "created_at",
    ]
    list_filter = [
        "employment_type",
        "status",
        "is_remote",
        "currency",
        "education_level",
        "created_at",
    ]
    search_fields = ["title", "company__name", "locations", "skills"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("company", "title", "description")}),
        (
            "Employment Details",
            {
                "fields": (
                    "employment_type",
                    "experience_min_years",
                    "experience_max_years",
                )
            },
        ),
        ("Location & Remote", {"fields": ("locations", "is_remote")}),
        ("Compensation", {"fields": ("min_salary", "max_salary", "currency")}),
        ("Requirements", {"fields": ("skills", "notice_period", "education_level")}),
        ("Status & Dates", {"fields": ("status", "posted_at", "expires_at")}),
        (
            "Screening Questions",
            {
                "fields": (
                    "screening_questions_config",
                    "screening_questions_random_config",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("company")


@admin.register(JobApplication)
class JobApplication(admin.ModelAdmin):
    list_display = ["job", "applicant", "status", "applied_at", "created_at"]


@admin.register(SocialLinks)
class SocialLinksAdmin(admin.ModelAdmin):
    list_display = ("profile", "github", "linkedin", "portfolio", "website", "email")
    search_fields = ("profile__user__email", "github", "linkedin", "portfolio")


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("profile", "name", "level", "percentage")
    search_fields = ("name", "profile__user__email")
    list_filter = ("level",)


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ("profile", "company", "role", "duration", "created_at")
    search_fields = ("company", "role", "profile__user__email")
    list_filter = ("created_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("profile", "title", "role", "created_at")
    search_fields = ("title", "role", "profile__user__email")
    list_filter = ("created_at",)


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = (
        "profile",
        "institution",
        "degree",
        "field",
        "start_year",
        "end_year",
    )
    search_fields = ("institution", "degree", "field", "profile__user__email")
    list_filter = ("start_year", "end_year")


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("profile", "name", "issuer", "completion_date")
    search_fields = ("name", "issuer", "profile__user__email")
