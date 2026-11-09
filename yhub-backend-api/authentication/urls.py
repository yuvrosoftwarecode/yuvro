from django.urls import path
from . import views
from .views import admin_users, google_login_view

app_name = "authentication"

urlpatterns = [
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.login_view, name="login"),
    path("google/", google_login_view, name="google_login"),
    path("public_send_otp/", views.public_send_otp, name="public_send_otp"),
    path("public_check_otp/", views.public_check_otp, name="public_check_otp"),
    path("public_verify_otp/", views.public_verify_otp, name="public_verify_otp"),
    path("recover_candidate_session/", views.recover_candidate_session, name="recover_candidate_session"),
    path("logout/", views.logout_view, name="logout"),
    path(
        "token/refresh/", views.CustomTokenRefreshView.as_view(), name="token_refresh"
    ),
    path("user/", views.user_info_view, name="user_info"),
    path(
        "forgot-password/", views.ForgotPasswordView.as_view(), name="forgot_password"
    ),
    path(
        "reset-password/<uidb64>/<token>/",
        views.ResetPasswordView.as_view(),
        name="reset_password",
    ),
    path("change-password/", views.change_password_view, name="change_password"),
    path("change-password/send-otp/", views.send_change_password_otp, name="send_change_password_otp"),
    path("admin-users/", admin_users, name="admin_users"),
    path("github/connect/", views.GithubConnectView.as_view(), name="github_connect"),
    path("linkedin/connect/", views.LinkedInConnectView.as_view(), name="linkedin_connect"),
    path("linkedin/share/", views.LinkedInShareMilestoneView.as_view(), name="linkedin_share"),
    path("linkedin/generate-gif/", views.LinkedInGenerateGifView.as_view(), name="linkedin_generate_gif"),
    path("internal/github-token/<uuid:user_id>/", views.internal_github_token_view, name="internal_github_token"),
    path("internal/delete-user/", views.internal_delete_user, name="internal_delete_user"),
    path("profile/upload-image/", views.upload_profile_image, name="upload_profile_image"),
    path("profile/remove-image/", views.remove_profile_image, name="remove_profile_image"),
    path("sessions/", views.sessions_view, name="sessions"),
    path("sessions/<uuid:session_id>/logout/", views.revoke_session_view, name="revoke_session"),
    path("sessions/logout-all/", views.revoke_other_sessions_view, name="revoke_other_sessions"),
]
