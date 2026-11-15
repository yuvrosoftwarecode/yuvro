from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class SupportFeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="tester@example.com",
            password="testpassword123",
        )

    def test_anonymous_feedback_submission_success(self):
        response = self.client.post(
            "/api/support/feedback/",
            {
                "subject": "Add dark mode toggle in code editor",
                "description": "It would be great to have dark mode in the coding workspace.",
                "email": "visitor@example.com",
                "name": "Alex Visitor",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data.get("message"),
            "Thanks for your feedback, you're adding value to the journey",
        )

        # Check mail sent to support@yuvrolabs.com
        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("support@yuvrolabs.com", sent.to)
        self.assertIn("Add dark mode toggle in code editor", sent.subject)
        self.assertIn("Alex Visitor", sent.body)
        self.assertIn("visitor@example.com", sent.body)
        self.assertIn("It would be great to have dark mode", sent.body)

    def test_authenticated_feedback_submission_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/support/feedback/",
            {
                "subject": "System Design practice mock interview request",
                "description": "Please add system design mock interviews with audio evaluation.",
                "page_url": "http://localhost:3002/mock-interviews",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data.get("message"),
            "Thanks for your feedback, you're adding value to the journey",
        )

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("support@yuvrolabs.com", sent.to)
        self.assertIn("tester@example.com", sent.body)
        self.assertIn("System Design practice", sent.body)

    def test_missing_subject_returns_400(self):
        response = self.client.post(
            "/api/support/feedback/",
            {
                "subject": "",
                "description": "Some description without a subject",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Subject is mandatory", response.data.get("error", ""))

    def test_missing_description_returns_400(self):
        response = self.client.post(
            "/api/support/feedback/",
            {
                "subject": "Some subject",
                "description": "   ",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Description is mandatory", response.data.get("error", ""))
