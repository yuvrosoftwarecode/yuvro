from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import admin_users, google_login_view

app_name = "authentication"

router = DefaultRouter()
router.register(r'colleges', views.CollegeViewSet, basename='college')
router.register(r'departments', views.DepartmentViewSet, basename='department')

urlpatterns = [
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.login_view, name="login"),
    path("google/", google_login_view, name="google_login"),
    path("logout/", views.logout_view, name="logout"),
    path(
        "token/refresh/", views.CustomTokenRefreshView.as_view(), name="token_refresh"
    ),
    path("profile/", views.UserProfileView.as_view(), name="user_profile"),
    path("profile/detail/", views.ProfileDetailView.as_view(), name="profile_detail"),
    path("user/", views.user_info_view, name="user_info"),
    path(
        "forgot-password/", views.ForgotPasswordView.as_view(), name="forgot_password"
    ),
    path(
        "reset-password/<uidb64>/<token>/",
        views.ResetPasswordView.as_view(),
        name="reset_password",
    ),
    path("admin-users/", admin_users, name="admin_users"),
    path("users/", views.UsersListCreateView.as_view(), name="users_list"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user_detail"),
    path(
        "users/<uuid:pk>/toggle-status/",
        views.UserToggleStatusView.as_view(),
        name="user_toggle_status",
    ),

    path("user/", views.user_info_view, name="current_user"),
    path("resume/generate-pdf/", views.generate_resume_pdf, name="generate_resume_pdf"),
    path("resume/templates/", views.get_resume_templates, name="get_resume_templates"),
    path("resume/config/", views.resume_config_view, name="resume_config"),
    path("", include(router.urls)),
]
