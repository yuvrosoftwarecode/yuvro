from django.test import TestCase
from django.contrib.auth import get_user_model
from course.models import Course, CourseCategory
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
        self.category = CourseCategory.objects.create(name="Test Category", slug="test-category")

    def test_exam_auto_creation(self):
        """Test that a CertificationExam is automatically created when a Course is created."""
        course = Course.objects.create(
            name="Test Certification Course",
            slug="test-cert-course",
            headline="Headline",
            description="Description",
            category=self.category,
            instructor=self.instructor,
            level="beginner",
            price=0
        )
        
        self.assertTrue(CertificationExam.objects.filter(course=course).exists())
        exam = CertificationExam.objects.get(course=course)
        self.assertEqual(exam.title, f"{course.name} - Certification Exam")
        self.assertEqual(exam.duration, 60)
        self.assertEqual(exam.passing_marks, 60)

    def test_start_exam(self):
        """Test starting an exam creates a submission."""
        course = Course.objects.create(
            name="Exam Course",
            slug="exam-course",
            category=self.category,
            instructor=self.instructor
        )
        exam = CertificationExam.objects.get(course=course)
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
        course = Course.objects.create(
            name="Submit Course",
            slug="submit-course",
            category=self.category,
            instructor=self.instructor
        )
        exam = CertificationExam.objects.get(course=course)
        submission = CertificationSubmission.objects.create(
            certification_exam=exam,
            user=self.student,
            status=CertificationSubmission.STATUS_STARTED
        )

        # Update submission
        submission.status = CertificationSubmission.STATUS_SUBMITTED
        submission.save()
        
        self.assertEqual(submission.status, 'submitted')
