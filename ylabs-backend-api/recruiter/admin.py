from django.contrib import admin

from .models import Company, CompanyRecruiter


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "domain", "location", "size", "website", "created_at")
    list_filter = ("domain", "size")
    search_fields = ("name", "domain", "location")
    ordering = ("-created_at",)


@admin.register(CompanyRecruiter)
class CompanyRecruiterAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "created_at")
    list_filter = ("company",)
    search_fields = ("user__email", "company__name")
    ordering = ("-created_at",)
