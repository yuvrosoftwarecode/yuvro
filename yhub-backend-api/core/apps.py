from django.apps import AppConfig
from django.contrib import admin


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        admin.site.site_header = "Yuvro Hub Admin"
        admin.site.site_title = "Yuvro Hub Admin"
        admin.site.index_title = "Welcome to Yuvro Hub Administration"
