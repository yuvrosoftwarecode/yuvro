from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "authentication"


class ResumeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'resume'

    def ready(self):
        import authentication.signals
