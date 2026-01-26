from django.urls import path
from .views import (
    JobViewSet,
    CompanyViewSet,
    JobApplicationViewSet,
    SocialLinksUpdateView,
    SkillCreateView,
    SkillUpdateDeleteView,
    ExperienceCreateView,
    ExperienceUpdateDeleteView,
    ProjectCreateView,
    ProjectUpdateDeleteView,
    EducationCreateView,
    EducationUpdateDeleteView,
    CertificationCreateView,
    CertificationUpdateDeleteView,
    CandidateSearchViewSet,
)

urlpatterns = [
    path(
        "companies/",
        CompanyViewSet.as_view({"get": "list", "post": "create"}),
        name="company-list",
    ),
    path(
        "companies/<uuid:pk>/",
        CompanyViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="company-detail",
    ),
    path(
        "applications/my-applications/",
        JobApplicationViewSet.as_view({"get": "my_applications"}),
        name="my-applications",
    ),
    path(
        "applications/bookmarked/",
        JobApplicationViewSet.as_view({"get": "bookmarked"}),
        name="bookmarked-jobs",
    ),
    path(
        "applications/bookmark/",
        JobApplicationViewSet.as_view({"post": "bookmark"}),
        name="bookmark-job",
    ),
    path(
        "applications/remove-bookmark/",
        JobApplicationViewSet.as_view({"post": "remove_bookmark"}),
        name="remove-bookmark",
    ),
    path(
        "applications/user-job-status/",
        JobApplicationViewSet.as_view({"get": "user_job_status"}),
        name="user-job-status",
    ),
    path(
        "applications/<uuid:pk>/update-status/",
        JobApplicationViewSet.as_view({"patch": "update_status"}),
        name="update-application-status",
    ),
    path(
        "applications/<uuid:pk>/",
        JobApplicationViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="application-detail",
    ),
    path(
        "applications/",
        JobApplicationViewSet.as_view({"get": "list", "post": "create"}),
        name="application-list",
    ),
    path(
        "with-applications/",
        JobViewSet.as_view({"get": "with_applications"}),
        name="jobs-with-applications",
    ),
    path(
        "pending-approval/",
        JobViewSet.as_view({"get": "pending_approval"}),
        name="jobs-pending-approval",
    ),
    path(
        "<uuid:pk>/approve/",
        JobViewSet.as_view({"post": "approve"}),
        name="job-approve",
    ),
    path(
        "<uuid:pk>/reject/", JobViewSet.as_view({"post": "reject"}), name="job-reject"
    ),
    path("filter/", JobViewSet.as_view({"post": "filter"}), name="job-filter"),
    path(
        "<uuid:pk>/applications/",
        JobViewSet.as_view({"get": "applications"}),
        name="job-applications",
    ),
    path("<uuid:pk>/apply/", JobViewSet.as_view({"post": "apply"}), name="job-apply"),
    path(
        "<uuid:pk>/",
        JobViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="job-detail",
    ),
    path("", JobViewSet.as_view({"get": "list", "post": "create"}), name="job-list"),
    path("profile/links/", SocialLinksUpdateView.as_view(), name="social_links"),
    path("skills/add/", SkillCreateView.as_view(), name="skill_add"),
    path(
        "skills/<uuid:pk>/", SkillUpdateDeleteView.as_view(), name="skill_edit_delete"
    ),
    path("experience/add/", ExperienceCreateView.as_view(), name="experience_add"),
    path(
        "experience/<uuid:pk>/",
        ExperienceUpdateDeleteView.as_view(),
        name="experience_edit_delete",
    ),
    path("projects/add/", ProjectCreateView.as_view(), name="project_add"),
    path(
        "projects/<uuid:pk>/",
        ProjectUpdateDeleteView.as_view(),
        name="project_edit_delete",
    ),
    path("education/add/", EducationCreateView.as_view(), name="education_add"),
    path(
        "education/<uuid:pk>/",
        EducationUpdateDeleteView.as_view(),
        name="education_edit_delete",
    ),
    path(
        "certification/add/",
        CertificationCreateView.as_view(),
        name="certification_add",
    ),
    path(
        "certification/<uuid:pk>/",
        CertificationUpdateDeleteView.as_view(),
        name="certification_edit_delete",
    ),
    path(
        "candidates/job-profiles/health/",
        CandidateSearchViewSet.as_view({"get": "health"}),
        name="candidate-health",
    ),
    path(
        "candidates/job-profiles/search/",
        CandidateSearchViewSet.as_view({"post": "search"}),
        name="candidate-search",
    ),
    path(
        "candidates/job-profiles/stats/",
        CandidateSearchViewSet.as_view({"get": "stats"}),
        name="candidate-stats",
    ),
    path(
        "candidates/job-profiles/filter-options/",
        CandidateSearchViewSet.as_view({"get": "filter_options"}),
        name="candidate-filter-options",
    ),
    path(
        "candidates/job-profiles/<uuid:pk>/",
        CandidateSearchViewSet.as_view({"get": "retrieve"}),
        name="candidate-detail",
    ),
    path(
        "candidates/job-profiles/",
        CandidateSearchViewSet.as_view({"get": "list"}),
        name="candidate-list",
    ),
]
