from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from django.conf import settings
from django.conf.urls.static import static
from authentication.views import check_username_view, check_email_view, username_available_view


def health_check(request):
    return JsonResponse({"status": "healthy", "service": "yhub-backend-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/auth/", include("authentication.urls")),
    path("me/username-available", username_available_view, name="me_username_available_root_no_slash"),
    path("me/username-available/", username_available_view, name="me_username_available_root"),
    path("api/me/username-available", username_available_view, name="api_me_username_available_no_slash"),
    path("api/me/username-available/", username_available_view, name="api_me_username_available"),
    path("api/users/check-username/", check_username_view, name="check_username_users"),
    path("api/users/check-email/", check_email_view, name="check_email_users"),
    path("api/", include("ai_assistant.urls")),
    path("api/", include("mockinterviews.urls")),
    path("api/payment/", include("payment.urls")),
    path("api/credits/", include("ai_credits.urls")),
    path("api/health/", health_check, name="health_check"),
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
