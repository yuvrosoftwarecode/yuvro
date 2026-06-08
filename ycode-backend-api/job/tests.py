from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from job.models import Job, JobApplication, Company
from course.models import Question, StudentCodePractice, Course
from job.views import JobApplicationViewSet
import uuid

User = get_user_model()

class JobAssessmentGradingTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        
        # Create user
        self.applicant = User.objects.create_user(
            username="applicant",
            email="applicant@test.com",
            password="password123",
            role="student"
        )
        
        self.recruiter = User.objects.create_user(
            username="recruiter",
            email="recruiter@test.com",
            password="password123",
            role="recruiter"
        )
        
        # Create company
        self.company = Company.objects.create(
            name="Test Company",
            created_by=self.recruiter
        )
        
        # Create job
        self.job = Job.objects.create(
            title="Software Engineer",
            company=self.company,
            created_by=self.recruiter
        )
        
        # Create course
        self.course = Course.objects.create(
            name="Python Programming",
            category="programming_languages"
        )
        
        # Create coding question
        self.coding_question = Question.objects.create(
            type="coding",
            title="Sum two numbers",
            content="Return sum of a and b",
            level="course",
            course=self.course,
            categories=["practice"],
            test_cases_basic=[{"input": "1\n2", "expected_output": "3"}],
            marks=10,
            created_by=self.recruiter
        )
        
        # Create application
        self.application = JobApplication.objects.create(
            job=self.job,
            applicant=self.applicant,
            status="screening_test_completed", # We will change this in tests
            screening_responses={
                "question_ids": [str(self.coding_question.id)]
            }
        )

    def test_start_test_records_started_at(self):
        self.application.status = "under_review" # change status so it can be started
        self.application.save()
        
        view = JobApplicationViewSet.as_view({"get": "start_test"})
        request = self.factory.get(f"/api/jobs/applications/{self.application.id}/start-test/")
        force_authenticate(request, user=self.applicant)
        
        response = view(request, pk=str(self.application.id))
        self.assertEqual(response.status_code, 200)
        
        # Reload application
        self.application.refresh_from_db()
        self.assertIn("started_at", self.application.screening_responses)
        self.assertIsNotNone(self.application.screening_responses["started_at"])

    def test_submit_test_grades_coding_question(self):
        # 1. Simulate starting test (sets started_at)
        self.application.status = "under_review"
        self.application.screening_responses["started_at"] = timezone.now().isoformat()
        self.application.save()
        
        # 2. Simulate user submitting code via code execution
        # Set marks_obtained = 10 (full marks)
        practice = StudentCodePractice.objects.create(
            user=self.applicant,
            question=self.coding_question,
            marks_obtained=10,
            status="completed"
        )
        
        # 3. Submit the assessment
        view = JobApplicationViewSet.as_view({"post": "submit_test"})
        payload = {
            "responses": {
                str(self.coding_question.id): "def sum(a, b):\n    return a + b"
            }
        }
        request = self.factory.post(f"/api/jobs/applications/{self.application.id}/submit-test/", payload, format="json")
        force_authenticate(request, user=self.applicant)
        
        response = view(request, pk=str(self.application.id))
        self.assertEqual(response.status_code, 200)
        
        # Reload application
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "screening_test_completed")
        
        screening_res = self.application.screening_responses
        self.assertEqual(screening_res["score"], 10)
        self.assertEqual(screening_res["total_marks"], 10)
        
        graded_results = screening_res["graded_results"]
        self.assertIn(str(self.coding_question.id), graded_results)
        q_result = graded_results[str(self.coding_question.id)]
        
        self.assertEqual(q_result["score"], 10)
        self.assertEqual(q_result["is_correct"], True)
        self.assertNotIn("pending_review", q_result)
        self.assertEqual(q_result["user_answer"], "def sum(a, b):\n    return a + b")

    def test_submit_test_grades_coding_question_zero_if_no_submission_during_test(self):
        # 1. Simulate starting test (sets started_at)
        self.application.status = "under_review"
        self.application.screening_responses["started_at"] = timezone.now().isoformat()
        self.application.save()
        
        # 2. Simulate historical code practice submission BEFORE test started
        # This should be ignored!
        historical_time = timezone.now() - timezone.timedelta(hours=2)
        practice = StudentCodePractice.objects.create(
            user=self.applicant,
            question=self.coding_question,
            marks_obtained=10,
            status="completed"
        )
        # Manually force created_at to be historical
        StudentCodePractice.objects.filter(id=practice.id).update(created_at=historical_time)
        
        # 3. Submit the assessment (no submissions made during the test)
        view = JobApplicationViewSet.as_view({"post": "submit_test"})
        payload = {
            "responses": {
                str(self.coding_question.id): ""
            }
        }
        request = self.factory.post(f"/api/jobs/applications/{self.application.id}/submit-test/", payload, format="json")
        force_authenticate(request, user=self.applicant)
        
        response = view(request, pk=str(self.application.id))
        self.assertEqual(response.status_code, 200)
        
        # Reload application
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "screening_test_completed")
        
        screening_res = self.application.screening_responses
        self.assertEqual(screening_res["score"], 0)
        
        graded_results = screening_res["graded_results"]
        q_result = graded_results[str(self.coding_question.id)]
        self.assertEqual(q_result["score"], 0)
        self.assertEqual(q_result["is_correct"], False)
        self.assertNotIn("pending_review", q_result)

    def test_submit_test_grades_coding_question_partial_marks(self):
        # 1. Simulate starting test (sets started_at)
        self.application.status = "under_review"
        self.application.screening_responses["started_at"] = timezone.now().isoformat()
        self.application.save()
        
        # 2. Simulate user submitting code via code execution with 50% passing tests (5 out of 10 marks)
        practice = StudentCodePractice.objects.create(
            user=self.applicant,
            question=self.coding_question,
            marks_obtained=5.0,
            status="submitted"
        )
        
        # 3. Submit the assessment
        view = JobApplicationViewSet.as_view({"post": "submit_test"})
        payload = {
            "responses": {
                str(self.coding_question.id): "def sum(a, b):\n    return a + b"
            }
        }
        request = self.factory.post(f"/api/jobs/applications/{self.application.id}/submit-test/", payload, format="json")
        force_authenticate(request, user=self.applicant)
        
        response = view(request, pk=str(self.application.id))
        self.assertEqual(response.status_code, 200)
        
        # Reload application
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "screening_test_completed")
        
        screening_res = self.application.screening_responses
        self.assertEqual(screening_res["score"], 5.0)
        self.assertEqual(screening_res["total_marks"], 10)
        
        graded_results = screening_res["graded_results"]
        self.assertIn(str(self.coding_question.id), graded_results)
        q_result = graded_results[str(self.coding_question.id)]
        
        self.assertEqual(q_result["score"], 5.0)
        self.assertEqual(q_result["is_correct"], False)
        self.assertNotIn("pending_review", q_result)
