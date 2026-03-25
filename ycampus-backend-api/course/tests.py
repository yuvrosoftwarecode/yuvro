import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Subject, Unit, SubUnit
from .serializers import SubjectSerializer, UnitSerializer, SubUnitSerializer

User = get_user_model()


class SubjectModelTest(TestCase):
    """
    Test cases for Subject model.
    """

    def test_subject_creation(self):
        """Test creating a subject with required fields."""
        subject = Subject.objects.create(subject_name="Test Subject")
        self.assertEqual(subject.subject_name, "Test Subject")
        self.assertIsInstance(subject.id, uuid.UUID)
        self.assertIsNotNone(subject.created_at)
        self.assertIsNotNone(subject.updated_at)

    def test_subject_with_short_code(self):
        """Test creating a subject with short code."""
        subject = Subject.objects.create(
            subject_name="Test Subject", short_code="TS101"
        )
        self.assertEqual(subject.short_code, "TS101")
        self.assertEqual(str(subject), "TS101: Test Subject")

    def test_subject_without_short_code(self):
        """Test subject string representation without short code."""
        subject = Subject.objects.create(subject_name="Test Subject")
        self.assertEqual(str(subject), "Test Subject")


class UnitModelTest(TestCase):
    """
    Test cases for Unit model.
    """

    def setUp(self):
        self.subject = Subject.objects.create(subject_name="Test Subject")

    def test_unit_creation(self):
        """Test creating a unit with required fields."""
        unit = Unit.objects.create(
            subject=self.subject, name="Test Unit", order_index=0
        )
        self.assertEqual(unit.name, "Test Unit")
        self.assertEqual(unit.subject, self.subject)
        self.assertEqual(unit.order_index, 0)
        self.assertIsInstance(unit.id, uuid.UUID)

    def test_unit_ordering(self):
        """Test unit ordering by order_index."""
        unit2 = Unit.objects.create(subject=self.subject, name="Unit 2", order_index=1)
        unit1 = Unit.objects.create(subject=self.subject, name="Unit 1", order_index=0)
        units = Unit.objects.all()
        self.assertEqual(units[0], unit1)
        self.assertEqual(units[1], unit2)


class SubUnitModelTest(TestCase):
    """
    Test cases for SubUnit model.
    """

    def setUp(self):
        self.subject = Subject.objects.create(subject_name="Test Subject")
        self.unit = Unit.objects.create(
            subject=self.subject, name="Test Unit", order_index=0
        )

    def test_subunit_creation(self):
        """Test creating a subunit with required fields."""
        subunit = SubUnit.objects.create(
            unit=self.unit, name="Test SubUnit", order_index=0
        )
        self.assertEqual(subunit.name, "Test SubUnit")
        self.assertEqual(subunit.unit, self.unit)
        self.assertEqual(subunit.order_index, 0)
        self.assertIsInstance(subunit.id, uuid.UUID)

    def test_subunit_with_content(self):
        """Test creating a subunit with content."""
        subunit = SubUnit.objects.create(
            unit=self.unit,
            name="Test SubUnit",
            content="This is test content",
            order_index=0,
        )
        self.assertEqual(subunit.content, "This is test content")


class SubjectSerializerTest(TestCase):
    """
    Test cases for Subject serializer.
    """

    def test_subject_serialization(self):
        """Test subject serialization."""
        subject = Subject.objects.create(
            subject_name="Test Subject", short_code="TS101"
        )
        serializer = SubjectSerializer(subject)
        data = serializer.data
        self.assertEqual(data["subject_name"], "Test Subject")
        self.assertEqual(data["short_code"], "TS101")
        self.assertIn("id", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_subject_deserialization(self):
        """Test subject deserialization."""
        data = {"subject_name": "New Subject", "short_code": "NS101"}
        serializer = SubjectSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        subject = serializer.save()
        self.assertEqual(subject.subject_name, "New Subject")
        self.assertEqual(subject.short_code, "NS101")


class SubjectAPITest(APITestCase):
    """
    Test cases for Subject API endpoints.
    """

    def setUp(self):
        # Create test users
        from authentication.models import User
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123",
            role="admin",
        )
        self.regular_user = User.objects.create_user(
            email="user@test.com", username="user", password="testpass123", role="student"
        )

        # Create test subject
        self.subject = Subject.objects.create(
            subject_name="Test Subject", short_code="TS101"
        )

        # URLs
        self.subjects_url = reverse("subject-list")
        self.subject_detail_url = reverse("subject-detail", kwargs={"pk": self.subject.pk})

    def get_jwt_token(self, user):
        """Helper method to get JWT token for user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_list_subjects_authenticated(self):
        """Test listing subjects as authenticated user."""
        token = self.get_jwt_token(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(self.subjects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Note: Depending on pagination, this might be response.data['results']
        # But looking at views.py, it seems it might be returning a list for basic serializer
        if isinstance(response.data, dict) and 'results' in response.data:
            self.assertEqual(len(response.data['results']), 1)
        else:
            self.assertEqual(len(response.data), 1)

    def test_list_subjects_unauthenticated(self):
        """Test listing subjects as unauthenticated user."""
        response = self.client.get(self.subjects_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_subject_with_units(self):
        """Test retrieving subject with nested units."""
        # Create a unit for the subject
        Unit.objects.create(subject=self.subject, name="Test Unit", order_index=0)

        token = self.get_jwt_token(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(self.subject_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("units", response.data)
        self.assertEqual(len(response.data["units"]), 1)


class UnitAPITest(APITestCase):
    """
    Test cases for Unit API endpoints.
    """

    def setUp(self):
        # Create test users
        from authentication.models import User
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123",
            role="admin",
        )

        # Create test data
        self.subject = Subject.objects.create(subject_name="Test Subject")
        self.unit = Unit.objects.create(
            subject=self.subject, name="Test Unit", order_index=0
        )

        # URLs
        self.units_url = reverse("unit-list")
        self.unit_detail_url = reverse("unit-detail", kwargs={"pk": self.unit.pk})

    def get_jwt_token(self, user):
        """Helper method to get JWT token for user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_filter_units_by_subject(self):
        """Test filtering units by subject."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(f"{self.units_url}?subject={self.subject.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if isinstance(response.data, dict) and 'results' in response.data:
            self.assertEqual(len(response.data['results']), 1)
        else:
            self.assertEqual(len(response.data), 1)


class SubUnitAPITest(APITestCase):
    """
    Test cases for SubUnit API endpoints.
    """

    def setUp(self):
        # Create test users
        from authentication.models import User
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123",
            role="admin",
        )

        # Create test data
        self.subject = Subject.objects.create(subject_name="Test Subject")
        self.unit = Unit.objects.create(
            subject=self.subject, name="Test Unit", order_index=0
        )
        self.subunit = SubUnit.objects.create(
            unit=self.unit, name="Test SubUnit", order_index=0
        )

        # URLs
        self.subunits_url = reverse("subunit-list")
        self.subunit_detail_url = reverse(
            "subunit-detail", kwargs={"pk": self.subunit.pk}
        )

    def get_jwt_token(self, user):
        """Helper method to get JWT token for user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_filter_subunits_by_unit(self):
        """Test filtering subunits by unit."""
        token = self.get_jwt_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(f"{self.subunits_url}?unit={self.unit.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if isinstance(response.data, dict) and 'results' in response.data:
            self.assertEqual(len(response.data['results']), 1)
        else:
            self.assertEqual(len(response.data), 1)
