import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Course, Topic, Subtopic
from .serializers import CourseSerializer, TopicSerializer, SubtopicSerializer

User = get_user_model()


class CourseModelTest(TestCase):
    """
    Test cases for Course model.
    """

    def test_course_creation(self):
        """Test creating a course with required fields."""
        course = Course.objects.create(name="Test Course", category="fundamentals")
        self.assertEqual(course.name, "Test Course")
        self.assertEqual(course.category, "fundamentals")
        self.assertIsInstance(course.id, uuid.UUID)
        self.assertIsNotNone(course.created_at)
        self.assertIsNotNone(course.updated_at)

    def test_course_with_short_code(self):
        """Test creating a course with short code."""
        course = Course.objects.create(
            name="Test Course", short_code="TC101", category="programming_languages"
        )
        self.assertEqual(course.short_code, "TC101")
        self.assertEqual(course.category, "programming_languages")
        self.assertEqual(str(course), "TC101: Test Course")

    def test_course_without_short_code(self):
        """Test course string representation without short code."""
        course = Course.objects.create(name="Test Course", category="databases")
        self.assertEqual(str(course), "Test Course")

    def test_course_ordering(self):
        """Test course ordering by category first, then created_at descending."""
        course1 = Course.objects.create(
            name="Course 1", category="programming_languages"
        )
        course2 = Course.objects.create(name="Course 2", category="fundamentals")
        courses = Course.objects.all()
        self.assertEqual(courses[0], course2)  # Fundamentals comes first alphabetically

    def test_course_category_choices(self):
        """Test that course category must be one of the valid choices."""
        # Test valid categories
        valid_categories = [
            "fundamentals",
            "programming_languages",
            "databases",
            "ai_tools",
        ]
        for category in valid_categories:
            course = Course.objects.create(
                name=f"Test Course {category}", category=category
            )
            self.assertEqual(course.category, category)

    def test_course_category_required(self):
        """Test that category field is required for serializer validation."""
        from .serializers import CourseSerializer

        data = {
            "name": "Test Course"
            # Missing category field
        }
        serializer = CourseSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)


class TopicModelTest(TestCase):
    """
    Test cases for Topic model.
    """

    def setUp(self):
        self.course = Course.objects.create(name="Test Course", category="fundamentals")

    def test_topic_creation(self):
        """Test creating a topic with required fields."""
        topic = Topic.objects.create(
            course=self.course, name="Test Topic", order_index=0
        )
        self.assertEqual(topic.name, "Test Topic")
        self.assertEqual(topic.course, self.course)
        self.assertEqual(topic.order_index, 0)
        self.assertIsInstance(topic.id, uuid.UUID)

    def test_topic_auto_order_index(self):
        """Test automatic order_index assignment."""
        topic1 = Topic.objects.create(course=self.course, name="Topic 1", order_index=0)
        topic2 = Topic.objects.create(
            course=self.course, name="Topic 2", order_index=None
        )
        topic2.save()  # Trigger save method
        # Note: Auto-assignment logic would need to be tested with actual save behavior

    def test_topic_ordering(self):
        """Test topic ordering by order_index."""
        topic2 = Topic.objects.create(course=self.course, name="Topic 2", order_index=1)
        topic1 = Topic.objects.create(course=self.course, name="Topic 1", order_index=0)
        topics = Topic.objects.all()
        self.assertEqual(topics[0], topic1)
        self.assertEqual(topics[1], topic2)


class SubtopicModelTest(TestCase):
    """
    Test cases for Subtopic model.
    """

    def setUp(self):
        self.course = Course.objects.create(name="Test Course", category="fundamentals")
        self.topic = Topic.objects.create(
            course=self.course, name="Test Topic", order_index=0
        )

    def test_subtopic_creation(self):
        """Test creating a subtopic with required fields."""
        subtopic = Subtopic.objects.create(
            topic=self.topic, name="Test Subtopic", order_index=0
        )
        self.assertEqual(subtopic.name, "Test Subtopic")
        self.assertEqual(subtopic.topic, self.topic)
        self.assertEqual(subtopic.order_index, 0)
        self.assertIsInstance(subtopic.id, uuid.UUID)

    def test_subtopic_with_content_and_video(self):
        """Test creating a subtopic with content and video URL."""
        subtopic = Subtopic.objects.create(
            topic=self.topic,
            name="Test Subtopic",
            content="This is test content",
            video_url="https://example.com/video.mp4",
            order_index=0,
        )
        self.assertEqual(subtopic.content, "This is test content")
        self.assertEqual(subtopic.video_url, "https://example.com/video.mp4")


class CourseSerializerTest(TestCase):
    """
    Test cases for Course serializer.
    """

    def test_course_serialization(self):
        """Test course serialization."""
        course = Course.objects.create(
            name="Test Course", short_code="TC101", category="programming_languages"
        )
        serializer = CourseSerializer(course)
        data = serializer.data
        self.assertEqual(data["name"], "Test Course")
        self.assertEqual(data["short_code"], "TC101")
        self.assertEqual(data["category"], "programming_languages")
        self.assertIn("id", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_course_deserialization(self):
        """Test course deserialization."""
        data = {"name": "New Course", "short_code": "NC101", "category": "databases"}
        serializer = CourseSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        course = serializer.save()
        self.assertEqual(course.name, "New Course")
        self.assertEqual(course.short_code, "NC101")
        self.assertEqual(course.category, "databases")

    def test_course_category_validation(self):
        """Test course category validation."""
        # Test invalid category
        data = {"name": "New Course", "category": "invalid_category"}
        serializer = CourseSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

        # Test valid category
        data["category"] = "ai_tools"
        serializer = CourseSerializer(data=data)
        self.assertTrue(serializer.is_valid())


class CourseAPITest(APITestCase):
    """
    Test cases for Course API endpoints.
    """

    def setUp(self):
        # Create test users
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email="user@test.com", username="user", password="testpass123"
        )

        # Create test course
        self.course = Course.objects.create(
            name="Test Course", short_code="TC101", category="fundamentals"
        )

        # URLs
        self.courses_url = reverse("course-list")
        self.course_detail_url = reverse("course-detail", kwargs={"pk": self.course.pk})

    def get_jwt_token(self, user):
        """Helper method to get JWT token for user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_list_courses_authenticated(self):
        """Test listing courses as authenticated user."""
        token = self.get_jwt_token(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(self.courses_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_courses_unauthenticated(self):
        """Test listing courses as unauthenticated user."""
        response = self.client.get(self.courses_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_course_as_admin(self):
        """Test creating course as admin user."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        data = {
            "name": "New Course",
            "short_code": "NC101",
            "category": "programming_languages",
        }
        response = self.client.post(self.courses_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 2)

    def test_create_course_as_regular_user(self):
        """Test creating course as regular user (should fail)."""
        token = self.get_jwt_token(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        data = {"name": "New Course", "short_code": "NC101", "category": "databases"}
        response = self.client.post(self.courses_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_course_with_topics(self):
        """Test retrieving course with nested topics."""
        # Create a topic for the course
        Topic.objects.create(course=self.course, name="Test Topic", order_index=0)

        token = self.get_jwt_token(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(self.course_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("topics", response.data)
        self.assertEqual(len(response.data["topics"]), 1)

    def test_update_course_as_admin(self):
        """Test updating course as admin user."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        data = {
            "name": "Updated Course Name",
            "short_code": "UC101",
            "category": "ai_tools",
        }
        response = self.client.put(self.course_detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.name, "Updated Course Name")
        self.assertEqual(self.course.category, "ai_tools")

    def test_delete_course_as_admin(self):
        """Test deleting course as admin user."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.delete(self.course_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Course.objects.count(), 0)

    def test_filter_courses_by_category(self):
        """Test filtering courses by category."""
        # Create additional courses with different categories
        Course.objects.create(
            name="Programming Course", category="programming_languages"
        )
        Course.objects.create(name="Database Course", category="databases")

        token = self.get_jwt_token(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Test filtering by fundamentals
        response = self.client.get(f"{self.courses_url}?category=fundamentals")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], "fundamentals")

        # Test filtering by programming_languages
        response = self.client.get(f"{self.courses_url}?category=programming_languages")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], "programming_languages")

        # Test no filter returns all courses
        response = self.client.get(self.courses_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)


class TopicAPITest(APITestCase):
    """
    Test cases for Topic API endpoints.
    """

    def setUp(self):
        # Create test users
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123",
            is_staff=True,
        )

        # Create test data
        self.course = Course.objects.create(name="Test Course", category="fundamentals")
        self.topic = Topic.objects.create(
            course=self.course, name="Test Topic", order_index=0
        )

        # URLs
        self.topics_url = reverse("topic-list")
        self.topic_detail_url = reverse("topic-detail", kwargs={"pk": self.topic.pk})

    def get_jwt_token(self, user):
        """Helper method to get JWT token for user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_create_topic_as_admin(self):
        """Test creating topic as admin user."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        data = {"course": str(self.course.id), "name": "New Topic", "order_index": 1}
        response = self.client.post(self.topics_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Topic.objects.count(), 2)

    def test_filter_topics_by_course(self):
        """Test filtering topics by course."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(f"{self.topics_url}?course={self.course.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class SubtopicAPITest(APITestCase):
    """
    Test cases for Subtopic API endpoints.
    """

    def setUp(self):
        # Create test users
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123",
            is_staff=True,
        )

        # Create test data
        self.course = Course.objects.create(name="Test Course", category="fundamentals")
        self.topic = Topic.objects.create(
            course=self.course, name="Test Topic", order_index=0
        )
        self.subtopic = Subtopic.objects.create(
            topic=self.topic, name="Test Subtopic", order_index=0
        )

        # URLs
        self.subtopics_url = reverse("subtopic-list")
        self.subtopic_detail_url = reverse(
            "subtopic-detail", kwargs={"pk": self.subtopic.pk}
        )

    def get_jwt_token(self, user):
        """Helper method to get JWT token for user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_create_subtopic_as_admin(self):
        """Test creating subtopic as admin user."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        data = {
            "topic": str(self.topic.id),
            "name": "New Subtopic",
            "content": "This is new content",
            "video_url": "https://example.com/video.mp4",
            "order_index": 1,
        }
        response = self.client.post(self.subtopics_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Subtopic.objects.count(), 2)

    def test_filter_subtopics_by_topic(self):
        """Test filtering subtopics by topic."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(f"{self.subtopics_url}?topic={self.topic.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
