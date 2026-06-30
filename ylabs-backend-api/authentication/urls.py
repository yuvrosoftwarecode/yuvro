from django.urls import path
from . import views

app_name = "authentication"

urlpatterns = [
    path("user/", views.user_info_view, name="user_info"),
    path("sync-shadow-user/", views.sync_shadow_user, name="sync_shadow_user"),
]
