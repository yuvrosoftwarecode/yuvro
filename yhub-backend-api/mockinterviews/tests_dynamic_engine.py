import json
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
    UnifiedAssessmentPayload,
)
from mockinterviews.dynamic_engine.llm import OpenAIInterviewLLM, QUESTION_PROMPT_VERSION
from mockinterviews.dynamic_engine.payload_adapter import UnifiedPayloadAdapter
from mockinterviews.dynamic_engine.question_engine import DynamicQuestionEngine
from mockinterviews.dynamic_engine.reporting import InterviewReportService


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


    def test_candidate_context_payload_generates_report_bundle(self):
        workspace_snapshot = json.dumps({
            "orders/views.py": (
                "from rest_framework import generics\n"
                "from .models import Order\n"
                "class OrderListAPIView(generics.ListAPIView):\n"
                "    queryset = Order.objects.select_related('customer').all()"
            ),
            "orders/models.py": "class Order:\n    pass",
        })
        context = f"""
Engineering Labs in section 'Backend Labs':

--- Lab: REST API HTTP Status Codes and Error Handling ---
Time spent: 0 minutes
Code Diff:
```diff
{workspace_snapshot}
```

Knowledge Assessment Score: 1/2
- Question: Which HTTP status should a missing resource return?
  Selected Answer Option Index: 404
  Is Correct: Yes
- Question: Which challenge commonly occurs in large-scale sales analysis systems?
  Selected Answer Option Index: 2,1
  Is Correct: No
"""
        payload = UnifiedAssessmentPayload.model_validate({"candidate_context": context})
        adapter = UnifiedPayloadAdapter()
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(adapter.to_create_request(payload))
        for event in adapter.to_assessment_events(payload):
            engine.ingest_event(session, event)
        question = engine.next_question(session)
        engine.record_answer(
            session,
            question.id,
            "I used select_related because the serializer needs the related customer without extra queries.",
        )

        bundle = InterviewReportService().create_report_bundle(session)

        self.assertEqual("Engineering Labs Report", bundle.engineering_labs_report.title)
        self.assertEqual("Knowledge Assessment Report", bundle.knowledge_assessment_report.title)
        self.assertEqual("Overall Interview Report", bundle.overall_report.title)
        self.assertEqual(1, bundle.engineering_labs_report.lab_count)
        self.assertEqual(2, bundle.knowledge_assessment_report.question_count)
        self.assertIn("orders/views.py", bundle.engineering_labs_report.labs[0].changed_files)
        self.assertEqual(3, len(bundle.overall_report.section_scores))

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
