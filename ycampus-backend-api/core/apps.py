from django.apps import AppConfig
from django.contrib import admin


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        # Customize Django admin site for YCampus
        admin.site.site_header = "Yuvro Campus Admin"
        admin.site.site_title = "Yuvro Campus Admin"
        admin.site.index_title = "Welcome to Yuvro Campus Administration"
