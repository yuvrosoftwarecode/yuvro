from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from course.models import Course, Question
from assessment.models import SkillTest, SkillTestSubmission, SkillTestQuestionActivity
from assessment.serializers import SkillTestSubmissionSerializer
from core.storage import build_public_url

User = get_user_model()

class ProctoringFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='student@test.com',
            username='student_test',
            password='password123',
            role='student',
            first_name='Student',
            last_name='User'
        )
        self.instructor = User.objects.create_user(
            email='instructor@test.com',
            username='instructor_test',
            password='password123',
            role='instructor',
            first_name='Instructor',
            last_name='User'
        )
        self.course = Course.objects.create(
            name="Test Course",
            category="fundamentals"
        )
        self.skill_test = SkillTest.objects.create(
            title="Python Basics Skill Test",
            course=self.course,
            created_by=self.instructor,
            duration=30,
            enable_proctoring=True,
            tab_switch_threshold=3,
            violation_threshold=5
        )
        self.question = Question.objects.create(
            type="coding",
            title="Sum two numbers",
            content="Write a function to sum two numbers.",
            level="course",
            course=self.course,
            categories=["skill_test"],
            created_by=self.instructor,
            test_cases_basic=[{"input": [1, 2], "output": 3}]
        )

    def test_submission_stats_calculation(self):
        """Test that _get_submission_stats correctly aggregates violations and tab switches."""
        submission = SkillTestSubmission.objects.create(
            skill_test=self.skill_test,
            user=self.user,
            status=SkillTestSubmission.STATUS_STARTED
        )
        
        # 1. Add general events (tab switch)
        submission.general_events.append({
            "timestamp": timezone.now().isoformat(),
            "activity_type": "tab_switched",
            "meta_data": {}
        })
        submission.save()

        # 2. Add proctoring events
        submission.proctoring_events.append({
            "timestamp": timezone.now().isoformat(),
            "activity_type": "copy_detected",
            "meta_data": {}
        })
        submission.save()

        # 3. Add question activity with violations and tab switches
        qa_activity = SkillTestQuestionActivity.objects.create(
            skill_test_submission=submission,
            question=self.question,
            user=self.user,
            violation_count=2,
            navigation_activities=[{
                "timestamp": timezone.now().isoformat(),
                "activity_type": "tab_switched",
                "meta_data": {}
            }]
        )

        # Retrieve stats
        # We can construct the view or mixin helper manually to test
        from assessment.mixins import ProctoringMixin
        mixin = ProctoringMixin()
        mixin.submission_model = SkillTestSubmission
        mixin.question_activity_model = SkillTestQuestionActivity
        mixin.submission_related_field = 'skill_test_submission'
        
        total_violations, tab_switch_count = mixin._get_submission_stats(submission)
        
        # q_violations = 2
        # sub_violations = 1 (copy_detected)
        # tab_switch_count = 2 (1 in sub general_events, 1 in qa navigation_activities)
        # total_violations = q_violations + sub_violations + tab_switch_count = 2 + 1 + 2 = 5
        self.assertEqual(tab_switch_count, 2)
        self.assertEqual(total_violations, 5)

    def test_serializer_builds_public_urls(self):
        """Test that serializers convert relative snapshot paths to public URLs."""
        submission = SkillTestSubmission.objects.create(
            skill_test=self.skill_test,
            user=self.user,
            status=SkillTestSubmission.STATUS_STARTED
        )
        submission.proctoring_events.append({
            "timestamp": timezone.now().isoformat(),
            "activity_type": "face_not_detected",
            "image_path": "ycode/student_test/snapshot_123.png"
        })
        submission.save()

        serializer = SkillTestSubmissionSerializer(submission)
        data = serializer.data

        # Check that the image_path has been converted to public URL
        event = data["proctoring_events"][0]
        self.assertTrue(event["image_path"].startswith("http"))
        self.assertIn("ycode/student_test/snapshot_123.png", event["image_path"])
