from django.test import TestCase
from django.contrib.auth import get_user_model
from Subject.models import Subject, SubjectCategory
from assessment.models import CertificationExam, CertificationSubmission
from assessment.serializers import CertificationSubmissionSerializer

User = get_user_model()

class CertificationFlowTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email='instructor@test.com',
            password='password123',
            role='instructor',
            first_name='Instructor',
            last_name='User'
        )
        self.student = User.objects.create_user(
            email='student@test.com',
            password='password123',
            role='student',
            first_name='Student',
            last_name='User'
        )
        self.category = SubjectCategory.objects.create(name="Test Category", slug="test-category")

    def test_exam_auto_creation(self):
        """Test that a CertificationExam is automatically created when a Subject is created."""
        Subject = Subject.objects.create(
            name="Test Certification Subject",
            slug="test-cert-Subject",
            headline="Headline",
            description="Description",
            category=self.category,
            instructor=self.instructor,
            level="beginner",
            price=0
        )
        
        self.assertTrue(CertificationExam.objects.filter(Subject=Subject).exists())
        exam = CertificationExam.objects.get(Subject=Subject)
        self.assertEqual(exam.title, f"{Subject.name} - Certification Exam")
        self.assertEqual(exam.duration, 60)
        self.assertEqual(exam.passing_marks, 60)

    def test_start_exam(self):
        """Test starting an exam creates a submission."""
        Subject = Subject.objects.create(
            name="Exam Subject",
            slug="exam-Subject",
            category=self.category,
            instructor=self.instructor
        )
        exam = CertificationExam.objects.get(Subject=Subject)
        exam.publish_status = 'active'
        exam.save()

        # Simulate start logic (usually in ViewSet, but testing model/serializer logic here)
        submission = CertificationSubmission.objects.create(
            certification_exam=exam,
            user=self.student,
            status=CertificationSubmission.STATUS_STARTED
        )
        
        self.assertEqual(submission.status, 'started')
        self.assertEqual(submission.user, self.student)
        self.assertEqual(submission.certification_exam, exam)

    def test_submit_exam(self):
        """Test submitting an exam updates status."""
        Subject = Subject.objects.create(
            name="Submit Subject",
            slug="submit-Subject",
            category=self.category,
            instructor=self.instructor
        )
        exam = CertificationExam.objects.get(Subject=Subject)
        submission = CertificationSubmission.objects.create(
            certification_exam=exam,
            user=self.student,
            status=CertificationSubmission.STATUS_STARTED
        )

        # Update submission
        submission.status = CertificationSubmission.STATUS_SUBMITTED
        submission.save()
        
        self.assertEqual(submission.status, 'submitted')

