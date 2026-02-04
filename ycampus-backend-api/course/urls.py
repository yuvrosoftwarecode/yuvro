from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    TopicViewSet,
    SubtopicViewSet,
    VideoViewSet,
    NoteViewSet,
    QuestionViewSet,
    StudentCourseProgressViewSet,
    StudentCodePracticeViewSet,
)

router = DefaultRouter()
router.register(r"courses", CourseViewSet)
router.register(r"topics", TopicViewSet)
router.register(r"subtopics", SubtopicViewSet)
router.register(r"videos", VideoViewSet)
router.register(r"notes", NoteViewSet)
router.register(r"questions", QuestionViewSet)
router.register(r"student-course-progress", StudentCourseProgressViewSet)
router.register(r"student-code-practices", StudentCodePracticeViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
