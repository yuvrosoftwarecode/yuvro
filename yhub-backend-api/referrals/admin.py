from django.contrib import admin
from .models import ReferralCode, Referral


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "user", "is_active", "created_at"]
    search_fields = ["code", "user__email", "user__username"]
    list_filter = ["is_active", "created_at"]


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ["referrer", "referred_user", "referral_code", "status", "accepted_at", "created_at"]
    search_fields = ["referrer__email", "referred_user__email", "referral_code"]
    list_filter = ["status", "created_at", "accepted_at"]
