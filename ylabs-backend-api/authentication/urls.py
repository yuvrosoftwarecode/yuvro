from django.urls import path
from . import views

app_name = "authentication"

urlpatterns = [
    path("sync-shadow-user/", views.sync_shadow_user, name="sync_shadow_user"),
]
