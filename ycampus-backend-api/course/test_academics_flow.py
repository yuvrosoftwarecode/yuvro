import uuid
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import College, Department, Batch, Semester, CollegeAdminProfile

User = get_user_model()

class AcademicsFlowTest(APITestCase):
    def setUp(self):
        # 1. Setup Platform Admin (is_staff=True, role="admin")
        self.platform_admin = User.objects.create_user(
            email="platform@test.com",
            username="platform",
            password="password123",
            role="admin",
            is_staff=True
        )
        
        # 2. Setup College 1 and College Admin 1
        self.college1 = College.objects.create(name="College 1", location="Loc 1")
        self.dept1 = Department.objects.create(college=self.college1, name="CS1")
        
        self.college_admin1 = User.objects.create_user(
            email="admin1@test.com",
            username="admin1",
            password="password123",
            role="college_admin",
            is_staff=False
        )
        CollegeAdminProfile.objects.create(user=self.college_admin1, college=self.college1)

    def test_create_global_batch(self):
        self.client.force_authenticate(user=self.college_admin1)
        url = "/api/course/batches/"
        data = {
            "college": self.college1.id,
            "name": "2026-2030"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        batch = Batch.objects.get(name="2026-2030")
        self.assertEqual(batch.college, self.college1)
        self.assertIsNone(batch.department)

    def test_unique_batches_includes_global(self):
        # Create a global batch
        Batch.objects.create(college=self.college1, name="Global Batch")
        # Create a department batch
        Batch.objects.create(department=self.dept1, college=self.college1, name="Dept Batch")
        
        self.client.force_authenticate(user=self.college_admin1)
        url = reverse("college-unique-batches", kwargs={"pk": self.college1.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should be sorted reverse: ["Global Batch", "Dept Batch"]
        self.assertIn("Global Batch", response.data)
        self.assertIn("Dept Batch", response.data)

    def test_bulk_initialize_from_global(self):
        # 1. Create global batch entry
        global_batch = Batch.objects.create(college=self.college1, name="2025-2029")
        
        self.client.force_authenticate(user=self.college_admin1)
        url = reverse("college-bulk-initialize-semesters", kwargs={"pk": self.college1.id})
        
        response = self.client.post(url, {"batch_name": "2025-2029"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Verify department batch created and semesters exist
        dept_batch = Batch.objects.get(department=self.dept1, name="2025-2029")
        self.assertEqual(Semester.objects.filter(batch=dept_batch).count(), 8)
