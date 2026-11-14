from django.urls import path
from .views import (
    ResearchPaperListView,
    ResearchPaperDetailView,
    SummarizePaperView,
    ResearchTopicListView,
    ToggleFollowTopicView,
    UserFollowedTopicsListView,
    IngestArxivPapersView,
)

urlpatterns = [
    path("papers/", ResearchPaperListView.as_view(), name="research-paper-list"),
    path("papers/<uuid:pk>/", ResearchPaperDetailView.as_view(), name="research-paper-detail"),
    path("papers/<uuid:pk>/summarize/", SummarizePaperView.as_view(), name="research-paper-summarize"),
    path("topics/", ResearchTopicListView.as_view(), name="research-topic-list"),
    path("topics/<str:topic_name>/toggle-follow/", ToggleFollowTopicView.as_view(), name="research-topic-toggle-follow"),
    path("followed-topics/", UserFollowedTopicsListView.as_view(), name="research-user-followed-topics"),
    path("sync/", IngestArxivPapersView.as_view(), name="research-sync"),
]
