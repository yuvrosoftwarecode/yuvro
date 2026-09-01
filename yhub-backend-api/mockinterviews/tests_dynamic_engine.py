import unittest

from mockinterviews.dynamic_engine.models import (
    AssessmentEvent,
    CandidateContext,
    EventSource,
    EventType,
    InterviewCreateRequest,
    InterviewMode,
    InterviewQuestion,
    InterviewSession,
    QuestionKind,
)
from mockinterviews.dynamic_engine.llm import OpenAIInterviewLLM, QUESTION_PROMPT_VERSION
from mockinterviews.dynamic_engine.question_engine import DynamicQuestionEngine


class DynamicEngineIntegrationTest(unittest.TestCase):
    def test_patch_question_starts_with_changed_files(self):
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(
            InterviewCreateRequest(
                mode=InterviewMode.AUTOMATIC,
                candidate=CandidateContext(candidate_id="cand-files"),
            )
        )
        engine.ingest_event(
            session,
            AssessmentEvent(
                event_type=EventType.CODE_CHANGED,
                source=EventSource.CODING_ASSESSMENT,
                summary="Candidate optimized Django endpoint",
                details={
                    "solution_patch": (
                        "diff --git a/api/views.py b/api/views.py\n"
                        "--- a/api/views.py\n"
                        "+++ b/api/views.py\n"
                        "@@ -1 +1 @@\n"
                        "-users = User.objects.all()\n"
                        "+users = User.objects.select_related('profile').all()\n"
                        "diff --git a/api/models.py b/api/models.py\n"
                        "--- a/api/models.py\n"
                        "+++ b/api/models.py\n"
                        "@@ -1 +1,2 @@\n"
                        "+user = models.OneToOneField(User, on_delete=models.CASCADE, db_index=True)\n"
                    )
                },
            ),
        )

        question = engine.next_question(session)

        self.assertEqual("file_change_overview", question.metadata["probe_axis"])
        self.assertIn("api/views.py", question.prompt)
        self.assertIn("api/models.py", question.prompt)
        self.assertIn("why did you choose these files", question.prompt)

    def test_dont_know_reframes_instead_of_repeating(self):
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(
            InterviewCreateRequest(
                mode=InterviewMode.AUTOMATIC,
                candidate=CandidateContext(candidate_id="cand-unknown"),
            )
        )
        engine.ingest_event(
            session,
            AssessmentEvent(
                event_type=EventType.CODE_CHANGED,
                source=EventSource.CODING_ASSESSMENT,
                summary="Candidate changed repository query",
                details={
                    "solution_patch": (
                        "diff --git a/services/repository.py b/services/repository.py\n"
                        "--- a/services/repository.py\n"
                        "+++ b/services/repository.py\n"
                        "@@ -1 +1 @@\n"
                        "-return User.objects.get(id=user_id)\n"
                        "+return User.objects.select_related('profile').get(id=user_id)\n"
                    )
                },
            ),
        )

        first_question = engine.next_question(session)
        answer = engine.record_answer(session, first_question.id, "don't know")
        recovery_question = engine.next_question(session)

        self.assertNotEqual(first_question.prompt, recovery_question.prompt)
        self.assertEqual(QuestionKind.REFRAME, recovery_question.kind)
        self.assertEqual("unknown", answer.metadata["answer_quality"])
        self.assertTrue(recovery_question.metadata["unknown_recovery"])
        self.assertIn("services/repository.py", recovery_question.prompt)

    def test_custom_mode_preserves_drafted_question(self):
        class FakeLLM:
            def generate_question(self, session, fallback_question):
                return None

            def generate_report_narrative(self, session, evaluation):
                return None

        engine = DynamicQuestionEngine(llm_client=FakeLLM())
        session = InterviewSession.from_create_request(
            InterviewCreateRequest(
                mode=InterviewMode.CUSTOM,
                candidate=CandidateContext(candidate_id="cand-custom"),
                recruiter_questions=["Explain API idempotency exactly as drafted."],
            )
        )

        question = engine.next_question(session)

        self.assertEqual("Explain API idempotency exactly as drafted.", question.prompt)
        self.assertEqual(QuestionKind.RECRUITER_REQUIRED, question.kind)

    def test_missing_openai_key_records_llm_skip(self):
        session = InterviewSession.from_create_request(
            InterviewCreateRequest(
                mode=InterviewMode.AUTOMATIC,
                candidate=CandidateContext(candidate_id="cand-no-key"),
            )
        )
        fallback_question = InterviewQuestion(
            prompt="Walk me through the riskiest part of your implementation.",
            kind=QuestionKind.DYNAMIC_FOLLOW_UP,
            rationale="Fallback question for telemetry test.",
        )
        llm = OpenAIInterviewLLM(api_key=None, model="gpt-4o-mini", enabled=True)

        generated = llm.generate_question(session, fallback_question)

        self.assertIsNone(generated)
        self.assertEqual(1, len(session.llm_calls))
        self.assertEqual("missing_openai_api_key", session.llm_calls[0].fallback_reason)
        self.assertEqual(QUESTION_PROMPT_VERSION, session.llm_calls[0].prompt_version)


if __name__ == "__main__":
    unittest.main()
