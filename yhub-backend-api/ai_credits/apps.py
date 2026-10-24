from django.apps import AppConfig


class AiCreditsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai_credits"
    verbose_name = "AI Credits Wallet & Metering"

    def ready(self):
        import ai_credits.signals  # noqa

