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
    RecruiterPackage,
    RecruiterUserQuota,
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
    list_display = ("team", "used_candidate_attempts", "total_candidate_attempts", "used_codebase_repos", "total_codebase_repos", "used_recruiter_logins", "total_recruiter_logins")
    search_fields = ("team__name",)


@admin.register(RecruiterPackage)
class RecruiterPackageAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "badge",
        "monthly_price_usd",
        "yearly_price_usd",
        "total_submissions",
        "total_codebase_repos",
        "total_recruiter_logins",
        "display_order",
        "is_active",
    )
    list_editable = ("display_order", "is_active", "badge")
    list_filter = ("is_active", "code")
    search_fields = ("name", "code", "badge")
    fieldsets = (
        ("Plan Information", {
            "fields": ("code", "name", "badge", "description", "display_order", "is_active", "created_by")
        }),
        ("Pricing", {
            "fields": ("monthly_price_usd", "yearly_price_usd", "trial_days")
        }),
        ("Quotas & Limits", {
            "fields": ("total_submissions", "total_codebase_repos", "total_recruiter_logins")
        }),
        ("Features (Frontend Display)", {
            "fields": ("features",)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(RecruiterUserQuota)
class RecruiterUserQuotaAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "plan_tier",
        "billing_cycle",
        "submission_progress",
        "repo_progress",
        "login_progress",
        "is_active",
        "valid_until",
    )
    list_filter = ("plan_tier", "billing_cycle", "is_active")
    search_fields = ("user__email", "plan_tier")
    readonly_fields = ("created_at", "updated_at")

    def submission_progress(self, obj):
        return f"{obj.used_submissions} / {obj.total_submissions}"
    submission_progress.short_description = "Submissions (Used/Total)"

    def repo_progress(self, obj):
        return f"{obj.used_codebase_repos} / {obj.total_codebase_repos}"
    repo_progress.short_description = "Repos (Used/Total)"

    def login_progress(self, obj):
        return f"{obj.used_recruiter_logins} / {obj.total_recruiter_logins}"
    login_progress.short_description = "Logins (Used/Total)"

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
