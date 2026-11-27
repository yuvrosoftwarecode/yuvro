from django.urls import path
from . import views

app_name = "referrals"

urlpatterns = [
    # Student Referral Endpoints
    path("my-code/", views.MyReferralCodeView.as_view(), name="my_referral_code"),
    path("validate/", views.ValidateReferralCodeView.as_view(), name="validate_referral_code"),
    path("my-stats/", views.MyReferralStatsView.as_view(), name="my_referral_stats"),
    path("my-history/", views.MyReferralHistoryView.as_view(), name="my_referral_history"),

    # Admin Referral Endpoints
    path("admin/summary/", views.AdminReferralSummaryView.as_view(), name="admin_referral_summary"),
    path("admin/students/", views.AdminReferrersListView.as_view(), name="admin_referral_students"),
    path("admin/students/<uuid:user_id>/", views.AdminReferrerDetailView.as_view(), name="admin_referral_student_detail"),
    path("admin/generate/", views.AdminGenerateReferralCodeView.as_view(), name="admin_referral_generate"),
]
