from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, CompanyRecruiterViewSet, RecruiterSelfRegistrationAPIView

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"recruiters", CompanyRecruiterViewSet, basename="recruiter")

urlpatterns = [
    path("register/", RecruiterSelfRegistrationAPIView.as_view(), name="self_register"),
    path("", include(router.urls)),
]
