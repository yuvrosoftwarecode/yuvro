from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Lab, LabSprint, LabTicket, UserLabEnrollment, UserLabTicketSubmission

User = get_user_model()


class LabModelsTest(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="lab-admin",
            email="lab-admin@example.com",
            password="testpass123",
            role="admin",
        )
        self.student_user = User.objects.create_user(
            username="lab-student",
            email="lab-student@example.com",
            password="testpass123",
            role="student",
        )

    def test_lab_models_can_be_created(self):
        lab = Lab.objects.create(
            title="Python Basics",
            type="Backend",
            description="Learn backend fundamentals",
            icon="python",
            prerequisites="Python syntax",
            skills="[\"problem-solving\"]",
            git_repo_starter_url="https://github.com/example/lab",
            difficulty="EASY",
            created_by=self.admin_user,
        )
        sprint = LabSprint.objects.create(
            title="Sprint 1",
            description="First sprint",
            order_index=1,
            lab=lab,
            created_by=self.admin_user,
        )
        ticket = LabTicket.objects.create(
            sprint=sprint,
            ticket_slug="intro",
            title="Intro Ticket",
            description="A sample ticket",
            difficulty="EASY",
            learning_objectives=["Understand basics"],
            tasks=["Write a function"],
            common_mistakes=["Missing return"],
            hints=["Check the examples"],
            scoring_rules={"points": 3},
            solution={"answer": "done"},
            accepted_programming_languages=["PYTHON"],
            created_by=self.admin_user,
        )
        enrollment = UserLabEnrollment.objects.create(user=self.student_user, lab=lab)
        submission = UserLabTicketSubmission.objects.create(
            user=self.student_user,
            lab_ticket=ticket,
            ticket_status="backlog",
            solution="print('hi')",
            yuvro_points=5,
            minutes_solved=10,
        )

        self.assertEqual(lab.title, "Python Basics")
        self.assertEqual(sprint.lab, lab)
        self.assertEqual(ticket.sprint, sprint)
        self.assertEqual(enrollment.lab, lab)
        self.assertEqual(submission.lab_ticket, ticket)
