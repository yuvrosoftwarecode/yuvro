from django.urls import path
from . import views
from .views import admin_users, google_login_view

app_name = "authentication"

urlpatterns = [
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.login_view, name="login"),
    path("google/", google_login_view, name="google_login"),
    path("public_send_otp/", views.public_send_otp, name="public_send_otp"),
    path("public_verify_otp/", views.public_verify_otp, name="public_verify_otp"),
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
    path("admin-users/", admin_users, name="admin_users"),
]
