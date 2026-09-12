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

    def test_binary_files_and_null_bytes_in_context(self):
        workspace_snapshot = json.dumps({
            "orders/views.py": "from rest_framework import generics\nclass OrderListAPIView(generics.ListAPIView): pass",
            "archive.zip": "PK\x03\x04\x14\x00\x00\x00\x08\x00binarycontent",
            "compiled.pyc": "\x03\xf3\r\n\x00\x00\x00\x00binarypyc",
        })
        context = f"""
Engineering Labs in section 'Backend Labs':

--- Lab: REST API HTTP Status Codes and Error Handling ---
Time spent: 0 minutes
Code Diff:
```diff
{workspace_snapshot}
```
"""
        payload = UnifiedAssessmentPayload.model_validate({"candidate_context": context})
        adapter = UnifiedPayloadAdapter()
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(adapter.to_create_request(payload))
        for event in adapter.to_assessment_events(payload):
            engine.ingest_event(session, event)

        dumped = json.dumps(session.model_dump(mode='json'))
        self.assertNotIn("\x00", dumped)
        self.assertNotIn("\\u0000", dumped)
        self.assertNotIn("PK\\u0003", dumped)

    def test_unattempted_candidate_zero_gating(self):
        context = """
Engineering Labs in section 'Engineering Labs':

--- Lab: Order Processing System ---
Time spent: 0 minutes
Tests: 0 passed out of 3
Errors encountered: 0
Code Diff:
```diff
{"settings.py": "DEBUG = True"}
```

Knowledge Assessment in section 'Knowledge Assessment':
Total score: 0/3
Questions:
1. What is an idempotent HTTP method?
Marks: 0/1
Candidate answer: None
Correct: GET, PUT, DELETE
Feedback: Incorrect

2. Explain database indexing.
Marks: 0/1
Candidate answer: None
Feedback: Incorrect
"""
        payload = UnifiedAssessmentPayload.model_validate({"candidate_context": context})
        adapter = UnifiedPayloadAdapter()
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(adapter.to_create_request(payload))
        for event in adapter.to_assessment_events(payload):
            engine.ingest_event(session, event)

        # Candidate answered 0 questions in Vitarka
        bundle = InterviewReportService().create_report_bundle(session)
        vitarka_rep = bundle.vitarka_report
        labs_rep = bundle.engineering_labs_report
        know_rep = bundle.knowledge_assessment_report
        overall_rep = bundle.overall_report

        # Vitarka zero-gating
        self.assertEqual(0.0, vitarka_rep.overall_score)
        self.assertEqual("Do not proceed", vitarka_rep.recommendation)
        self.assertEqual([], vitarka_rep.strengths)
        self.assertTrue(any("did not provide any responses" in r for r in vitarka_rep.risks))

        # Labs zero-gating
        self.assertEqual(0.0, labs_rep.overall_score)
        self.assertEqual([], labs_rep.strengths)
        self.assertTrue(any("0/3" in r or "no passing tests" in r.lower() for r in labs_rep.risks))

        # Knowledge zero-gating
        self.assertEqual(0.0, know_rep.score_percent)
        self.assertEqual([], know_rep.strengths)
        self.assertTrue(any("0 knowledge questions correctly" in r for r in know_rep.risks))

        # Overall zero-gating
        self.assertEqual(0.0, overall_rep.overall_score)
        self.assertEqual("Do not proceed", overall_rep.recommendation)
        self.assertEqual([], overall_rep.strengths)
        self.assertIn("0.0/10", overall_rep.executive_summary)

    def test_unattempted_lab_with_no_tests_executed_scores_zero(self):
        # 37 files in starter workspace snapshot, 0 minutes spent, no tests executed
        starter_files = {f"file_{i}.py": f"def func_{i}(): pass" for i in range(37)}
        context = f"""
Engineering Labs in section 'Engineering Labs':

--- Lab: REST API HTTP Status Codes and Error Handling ---
Time spent: 0 minutes
Code Diff:
```diff
{json.dumps(starter_files)}
```
"""
        payload = UnifiedAssessmentPayload.model_validate({"candidate_context": context})
        adapter = UnifiedPayloadAdapter()
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(adapter.to_create_request(payload))
        for event in adapter.to_assessment_events(payload):
            engine.ingest_event(session, event)

        bundle = InterviewReportService().create_report_bundle(session)
        labs_rep = bundle.engineering_labs_report
        overall_rep = bundle.overall_report

        # Labs MUST score 0.0, NOT 4.7 or 5.0
        self.assertEqual(0.0, labs_rep.overall_score)
        # Strengths MUST be empty, NOT "Submitted verified code across 37 file(s)"
        self.assertEqual([], labs_rep.strengths)
        # Risk MUST note no lab tests executed and no verified code
        self.assertTrue(any("No lab tests were executed" in r for r in labs_rep.risks))
        self.assertTrue(any("No verified implementation code was submitted" in r for r in labs_rep.risks))
        self.assertEqual(0.0, overall_rep.overall_score)

    def test_git_diff_with_database_and_metadata_files_is_ignored_and_scores_zero(self):
        git_diff = """diff --git a/.gitignore b/.gitignore
index 1234567..89abcdef 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,2 +1,3 @@
+*.pyc
diff --git a/README.md b/README.md
index 1111111..2222222 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
+# Title
diff --git a/requirements.txt b/requirements.txt
index 3333333..4444444 100644
--- a/requirements.txt
+++ b/requirements.txt
@@ -1 +1,2 @@
+django>=4.2
diff --git a/db.sqlite3 b/db.sqlite3
index 5555555..6666666 100644
Binary files a/db.sqlite3 and b/db.sqlite3 differ
"""
        context = f"""
Engineering Labs in section 'Django Labs':

--- Lab: Django Bulk Operations and 3rd-Party Mocking ---
Time spent: 0 minutes
Code Diff:
```diff
{git_diff}
```
"""
        payload = UnifiedAssessmentPayload.model_validate({"candidate_context": context})
        adapter = UnifiedPayloadAdapter()
        engine = DynamicQuestionEngine()
        session = InterviewSession.from_create_request(adapter.to_create_request(payload))
        for event in adapter.to_assessment_events(payload):
            engine.ingest_event(session, event)

        bundle = InterviewReportService().create_report_bundle(session)
        labs_rep = bundle.engineering_labs_report

        # Changed files MUST be empty (all 4 files are ignored db/meta files)
        self.assertEqual([], labs_rep.labs[0].changed_files)
        # Labs MUST score 0.0, NOT 2.2
        self.assertEqual(0.0, labs_rep.overall_score)
        # Strengths MUST be empty, NOT "Submitted verified code across 4 file(s)."
        self.assertEqual([], labs_rep.strengths)
        # Risk MUST note no lab tests executed and no verified code
        self.assertTrue(any("No lab tests were executed" in r for r in labs_rep.risks))
        self.assertTrue(any("No verified implementation code was submitted" in r for r in labs_rep.risks))


if __name__ == "__main__":
    unittest.main()
