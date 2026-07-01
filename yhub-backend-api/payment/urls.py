from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PaymentViewSet

app_name = "payment"

router = DefaultRouter()
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("", include(router.urls)),
]
