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

from .models import (
    RecruiterTeam,
    RecruiterTeamMember,
    RecruiterTeamSubscription,
    RecruiterTeamQuota,
)

class RecruiterTeamMemberInline(admin.TabularInline):
    model = RecruiterTeamMember
    extra = 1

class RecruiterTeamQuotaInline(admin.StackedInline):
    model = RecruiterTeamQuota

class RecruiterTeamSubscriptionInline(admin.StackedInline):
    model = RecruiterTeamSubscription

@admin.register(RecruiterTeam)
class RecruiterTeamAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__email")
    inlines = [RecruiterTeamSubscriptionInline, RecruiterTeamQuotaInline, RecruiterTeamMemberInline]

@admin.register(RecruiterTeamSubscription)
class RecruiterTeamSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("team", "plan_tier", "billing_cycle", "is_active", "valid_until")
    list_filter = ("plan_tier", "billing_cycle", "is_active")
    search_fields = ("team__name", "latest_payment_id")

@admin.register(RecruiterTeamQuota)
class RecruiterTeamQuotaAdmin(admin.ModelAdmin):
    list_display = ("team", "used_candidate_attempts", "total_candidate_attempts", "used_ai_minutes", "total_ai_minutes")
    search_fields = ("team__name",)
