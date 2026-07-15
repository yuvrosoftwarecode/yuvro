from django.urls import path
from . import views
from .views import get_all_users

app_name = "authentication"

urlpatterns = [
    path("user/", views.user_info_view, name="user_info"),
    path("sync-shadow-user/", views.sync_shadow_user, name="sync_shadow_user"),
    path("users/", get_all_users, name="get_all_users"),
]
