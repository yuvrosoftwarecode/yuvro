from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, CompanyRecruiterViewSet, RecruiterSelfRegistrationAPIView, RecruiterTeamViewSet

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"recruiters", CompanyRecruiterViewSet, basename="recruiter")
router.register(r"teams", RecruiterTeamViewSet, basename="team")

urlpatterns = [
    path("register/", RecruiterSelfRegistrationAPIView.as_view(), name="self_register"),
    path("", include(router.urls)),
]
