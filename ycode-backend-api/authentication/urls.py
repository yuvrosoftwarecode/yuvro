from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import admin_users

app_name = "authentication"

router = DefaultRouter()
router.register(r'colleges', views.CollegeViewSet, basename='college')
router.register(r'departments', views.DepartmentViewSet, basename='department')

urlpatterns = [
    path("profile/", views.UserProfileView.as_view(), name="user_profile"),
    path("profile/detail/", views.ProfileDetailView.as_view(), name="profile_detail"),
    path(
        "profile/upload-image/",
        views.upload_profile_image,
        name="profile_upload_image",
    ),
    path("user/", views.user_info_view, name="user_info"),
    path("admin-users/", admin_users, name="admin_users"),
    path("users/", views.UsersListCreateView.as_view(), name="users_list"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user_detail"),
    path(
        "users/<uuid:pk>/toggle-status/",
        views.UserToggleStatusView.as_view(),
        name="user_toggle_status",
    ),

    path("resume/generate-pdf/", views.generate_resume_pdf, name="generate_resume_pdf"),
    path("resume/templates/", views.get_resume_templates, name="get_resume_templates"),
    path("resume/config/", views.resume_config_view, name="resume_config"),
    path("sync-shadow-user/", views.sync_shadow_user, name="sync_shadow_user"),
    path("", include(router.urls)),
]
