import os
import requests
from django.utils import timezone
from .models import Question, StudentCodePractice


class CodeExecutionUtil:
    """
    Utility class for executing code and handling results consistently
    across different ViewSets (StudentCourseProgressViewSet and StudentCodePracticeViewSet)
    """

    @staticmethod
    def execute_code(
        code,
        language,
        question_id=None,
        test_cases_basic=None,
        test_cases_advanced=None,
        test_cases_custom=None,
    ):
        """
        Execute code using the code executor service

        Args:
            code (str): The code to execute
            language (str): Programming language
            question_id (str, optional): Question ID to get test cases from
            test_cases_basic (list, optional): Basic test cases
            test_cases_advanced (list, optional): Advanced test cases
            test_cases_custom (list, optional): Custom test cases

        Returns:
            dict: Execution results containing test results, output, etc.

        Raises:
            requests.exceptions.RequestException: If code executor service is unavailable
            Exception: For other execution errors
        """
        if question_id:
            try:
                question = Question.objects.get(id=question_id)
                if not test_cases_basic:
                    test_cases_basic = question.test_cases_basic or []
                if not test_cases_advanced:
                    test_cases_advanced = question.test_cases_advanced or []
            except Question.DoesNotExist:
                raise Exception(f"Question with id {question_id} not found")

        if not test_cases_basic:
            test_cases_basic = []
        if not test_cases_advanced:
            test_cases_advanced = []
        if not test_cases_custom:
            test_cases_custom = []

        service_url = os.environ.get("CODE_EXECUTOR_URL", "http://code-executor:8002")

        payload = {
            "code": code,
            "language": language,
            "test_cases_basic": test_cases_basic,
            "test_cases_advanced": test_cases_advanced,
            "test_cases_custom": test_cases_custom,
            "timeout": 10,
        }

        executor_response = requests.post(
            f"{service_url}/execute-with-tests", json=payload, timeout=15
        )
        response_data = executor_response.json()

        exec_res = response_data.get("execution_result", {})
        execution_output = exec_res.get("output", "")

        basic_passed = response_data.get("basic_passed", 0)
        advanced_passed = response_data.get("advanced_passed", 0)
        custom_passed = response_data.get("custom_passed", 0)

        total_tests = response_data.get("total_tests", 0)
        total_passed = response_data.get("total_passed", 0)

        test_results = {
            "passed": total_passed,
            "total": total_tests,
            "basic_passed": basic_passed,
            "advanced_passed": advanced_passed,
            "custom_passed": custom_passed,
            "success": exec_res.get("success", False),
        }

        execution_results = {
            "execution_result": exec_res,
            "basic_results": response_data.get("basic_results", []),
            "advanced_results": response_data.get("advanced_results", []),
            "custom_results": response_data.get("custom_results", []),
            "test_results": test_results,
        }

        return {
            "execution_results": execution_results,
            "test_results": test_results,
            "execution_output": execution_output,
            "response_data": response_data,
        }

    @staticmethod
    def check_plagiarism(code, language, question, user, service_url):
        """
        Check for plagiarism against recent submissions

        Args:
            code (str): Code to check
            language (str): Programming language
            question (Question): Question object
            user: User object
            service_url (str): Code executor service URL

        Returns:
            tuple: (plagiarism_score, plagiarism_details)
        """
        plagiarism_score = 0.0
        plagiarism_details = {}

        try:
            reference_submissions = []

            recent_submissions = (
                StudentCodePractice.objects.filter(question=question)
                .exclude(user=user)
                .select_related("user")
                .order_by("-created_at")[:20]
            )

            for submission in recent_submissions:
                code_data = (
                    submission.answer_latest.get("code", "")
                    if submission.answer_latest
                    else ""
                )
                reference_submissions.append(
                    {
                        "submission_id": str(submission.id),
                        "user_id": str(submission.user.id),
                        "answer_data": {"code": code_data},
                    }
                )

            if reference_submissions:
                plagiarism_payload = {
                    "target_code": code,
                    "language": language,
                    "reference_submissions": reference_submissions,
                }

                plag_response = requests.post(
                    f"{service_url}/plagiarism-check",
                    json=plagiarism_payload,
                    timeout=5,
                )

                if plag_response.status_code == 200:
                    plag_data = plag_response.json()
                    plagiarism_score = plag_data.get("max_similarity", 0.0)
                    plagiarism_details = plag_data

        except Exception as e:
            print(f"Plagiarism check failed: {e}")
            pass

        return plagiarism_score, plagiarism_details

    @staticmethod
    def create_or_update_practice_record(
        user,
        question,
        code,
        language,
        execution_results,
        execution_output,
        test_results,
        course=None,
        topic=None,
    ):
        """
        Create or update StudentCodePractice record

        Args:
            user: User object
            question: Question object
            code (str): Submitted code
            language (str): Programming language
            execution_results (dict): Execution results from code executor
            execution_output (str): Console output
            test_results (dict): Test results summary
            course: Course object (optional)
            topic: Topic object (optional)

        Returns:
            StudentCodePractice: The created or updated practice record
        """
        practice_record, created = StudentCodePractice.objects.get_or_create(
            user=user,
            question=question,
            defaults={
                "course": course or question.course,
                "topic": topic
                or question.topic
                or (question.subtopic.topic if question.subtopic else None),
                "status": StudentCodePractice.STATUS_SUBMITTED,
            },
        )

        practice_record.answer_latest = {
            "code": code,
            "language": language,
            "timestamp": timezone.now().isoformat(),
        }

        practice_record.evaluation_results = execution_results
        practice_record.execution_output = execution_output
        practice_record.answer_attempt_count += 1

        if test_results:
            total_tests_count = test_results.get("total", 0)
            passed_tests_count = test_results.get("passed", 0)
            if total_tests_count > 0:
                practice_record.marks_obtained = (
                    passed_tests_count / total_tests_count
                ) * 100
                if passed_tests_count == total_tests_count:
                    practice_record.status = StudentCodePractice.STATUS_COMPLETED

        if not practice_record.answer_history:
            practice_record.answer_history = []

        practice_record.answer_history.append(
            {
                "timestamp": timezone.now().isoformat(),
                "answer_data": {"code": code, "language": language},
                "is_auto_save": False,
                "execution_results": execution_results,
                "execution_output": execution_output,
            }
        )

        practice_record.save()
        return practice_record

    @staticmethod
    def mask_test_data(data_str):
        """
        Mask sensitive parts of test data while keeping structure visible
        Used for hiding advanced test case details from students
        """
        if not data_str:
            return data_str

        if data_str.startswith("[") and data_str.endswith("]"):
            try:
                import json

                data = json.loads(data_str)
                if isinstance(data, list) and len(data) > 0:
                    if len(data) <= 3:
                        masked = data.copy()
                        for i in range(1, len(masked) - 1):
                            masked[i] = "***"
                        return json.dumps(masked)
                    else:
                        masked = [data[0], "***", "***"]
                        if len(data) > 3:
                            masked.append("***")
                        masked.append(data[-1])
                        return json.dumps(masked)
            except:
                pass

        if len(data_str) <= 3:
            return "***"
        elif len(data_str) <= 10:
            return data_str[:2] + "***"
        else:
            return data_str[:3] + "***" + data_str[-2:]
