from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, 
    CompanyRecruiterViewSet, 
    RecruiterSelfRegistrationAPIView, 
    RecruiterTeamViewSet,
    GithubAppInstallRedirectView,
    GithubAppInstallCallbackView,
    GithubAppInstallationsView,
    GithubAppRepositoriesView,
    RecruiterPackageListView,
    RecruiterMyQuotaView,
)

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"recruiters", CompanyRecruiterViewSet, basename="recruiter")
router.register(r"teams", RecruiterTeamViewSet, basename="team")

urlpatterns = [
    path("packages/", RecruiterPackageListView.as_view(), name="recruiter_packages"),
    path("my-quota/", RecruiterMyQuotaView.as_view(), name="recruiter_my_quota"),
    path("register/", RecruiterSelfRegistrationAPIView.as_view(), name="self_register"),
    path("github-app/install/", GithubAppInstallRedirectView.as_view(), name="github_app_install"),
    path("github-app/callback/", GithubAppInstallCallbackView.as_view(), name="github_app_callback"),
    path("github-app/installations/", GithubAppInstallationsView.as_view(), name="github_app_installations"),
    path("github-app/installations/<str:installation_id>/", GithubAppInstallationsView.as_view(), name="github_app_installation_detail"),
    path("github-app/installations/<str:installation_id>/repositories/", GithubAppRepositoriesView.as_view(), name="github_app_repositories"),
    path("", include(router.urls)),
]
