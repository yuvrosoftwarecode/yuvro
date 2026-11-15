"""Evidence recording for the post-interview evaluation engine must not change the live interview.

Run:  python manage.py test mockinterviews.tests_evaluation_v2_recording
"""
import copy
import time

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from mockinterviews.evaluation_v2 import ENGINE_VERSION, queue, recording
from mockinterviews.evaluation_v2.evidence_check import summarize
from mockinterviews.evaluation_v2.recording import EVIDENCE_KEY


def make_state(questions: int = 6) -> dict:
    interview = [{
        "id": 1, "question": "Please introduce yourself.", "topic": "Self introduction",
        "difficulty": "easy", "question_type": "behavioral", "expected_points": ["background"],
    }]
    answers = {"1": {"answer": "I am a backend developer.", "score": None, "exclude_from_score": True,
                     "feedback": "Self-introduction completed (not scored)."}}
    for i in range(2, questions + 1):
        interview.append({
            "id": i, "question": f"Question {i} about Python?", "topic": "python", "difficulty": "medium",
            "question_type": "coding" if i == 4 else "technical", "expected_points": ["a", "b"],
            "sample_tests": [], "next_action": "ask_followup" if i == 3 else "next_question", "difficulty_level": 2,
        })
        if i < questions:
            answers[str(i)] = {"answer": f"Answer {i} with enough words to count.", "score": 6, "feedback": "ok",
                               "covered_points": ["a"], "missed_points": ["b"], "follow_up_suggestion": "ask b"}
    return {
        "source": "student", "interview_type": "full_ai", "difficulty": "medium",
        "analysis": {"candidate_name": "Test User", "experience_level": "beginner", "domain": "Python",
                     "skills": [{"skill": "python"}]},
        "interview": interview, "answers": answers, "current_question_index": questions - 1,
        "master_state": {"hint_level_given": 1},
        "master_last_turn": {"intent": "answer", "next_action": "next_question", "coding_action": "none",
                             "answer_rating": "partial", "evaluation_note": "note"},
        "silence_counts": {"2": 1},
    }


def record_everything(state: dict) -> None:
    q = state["interview"]
    recording.record_answer(state, q[1], status_code="normal", clean_answer="An answer", evaluation={"score": 6},
                            input_quality={"mode": "voice", "reconnects": 1, "noisy": True, "junk": "x" * 999})
    recording.record_turn(state, q[1], q[2])
    recording.record_answer(state, q[2], status_code="normal", clean_answer="i dont know", evaluation={"score": 2},
                            dont_know=True)
    recording.record_turn(state, q[2], q[3])
    recording.record_coding_event(state, q[3], {"type": "run", "code": "print(1)", "language": "python",
                                                "run": {"status": "ok", "passed": 2, "total": 3,
                                                        "failures": ["case 3"]}}, "Nice, one test left.")
    recording.record_answer(state, q[3], status_code="silence", clean_answer="[no response]",
                            evaluation={"score": 1, "no_response": True})
    recording.record_turn(state, q[3], q[4])
    recording.record_answer(state, q[5], status_code="finish", clean_answer="", evaluation={"score": 6},
                            end_reason="time_up")


class RecordingDoesNotChangeTheInterview(SimpleTestCase):
    def test_only_the_evidence_key_is_added(self):
        state = make_state()
        before = copy.deepcopy(state)
        record_everything(state)
        self.assertEqual(set(state) - set(before), {EVIDENCE_KEY})
        for key in before:
            self.assertEqual(state[key], before[key], f"live key '{key}' was changed by recording")

    def test_alex_receives_exactly_the_same_inputs(self):
        from mockinterviews.ai_interview import interview_engine as engine

        state = make_state()
        untouched = copy.deepcopy(state)
        record_everything(state)
        questions = state["interview"]
        last = questions[-2]

        def alex_inputs(s):
            return (
                engine._build_dialogue_turns(s["interview"], s["answers"], s.get(engine.CODING_EVENT_LOG_KEY)),
                engine._build_candidate_profile(s),
                engine._build_evaluator_context(engine._answer_for(last, s["answers"])),
                engine._load_master_state(s).model_dump(mode="json"),
            )

        self.assertEqual(alex_inputs(state), alex_inputs(untouched))

    def test_existing_fallback_report_is_unchanged(self):
        from types import SimpleNamespace
        from mockinterviews.views import MockInterviewSubmissionViewSet

        state = make_state()
        untouched = copy.deepcopy(state)
        record_everything(state)
        view = MockInterviewSubmissionViewSet()
        interview = SimpleNamespace(title="Python")

        def report(s):
            return view._synthesize_report_from_state(SimpleNamespace(state_data=s, mock_interview=interview), None)

        self.assertEqual(report(state), report(untouched))

    def test_recording_never_raises(self):
        for bad in (None, [], "text", 5, {"evidence_v2": "broken"}, {"evidence_v2": {"turns": "x", "answers": 3}}):
            recording.record_answer(bad, {"id": 1}, status_code="normal", clean_answer="a", evaluation=None)
            recording.record_answer({}, None, status_code=None, clean_answer=None, evaluation="x")
            recording.record_turn(bad, {"id": 1}, {"id": 2})
            recording.record_turn({}, None, None)
            recording.record_coding_event(bad, {"id": 1}, {"type": "run", "run": {"passed": "many"}}, None)
            recording.record_end(bad, None)

    def test_recording_adds_no_measurable_latency(self):
        state = make_state(questions=150)
        q = state["interview"]
        started = time.perf_counter()
        rounds = 300
        for i in range(rounds):
            a, b = q[1 + i % 140], q[2 + i % 140]
            recording.record_answer(state, a, status_code="normal", clean_answer="an answer " * 40, evaluation={"score": 5},
                                    input_quality={"mode": "voice"})
            recording.record_turn(state, a, b)
            recording.record_coding_event(state, a, {"type": "run", "code": "x = 1\n" * 200,
                                                     "run": {"passed": 1, "total": 2}}, "ok")
        per_turn_ms = (time.perf_counter() - started) * 1000 / rounds
        # One turn takes seconds (two AI calls). Recording must stay far below a millisecond.
        self.assertLess(per_turn_ms, 1.0, f"recording took {per_turn_ms:.3f} ms per turn")

    def test_evidence_content(self):
        state = make_state()
        record_everything(state)
        ev = state[EVIDENCE_KEY]
        self.assertEqual(ev["answers"]["2"]["status"], "answered")
        self.assertEqual(ev["answers"]["2"]["input"], {"mode": "voice", "reconnects": 1, "noisy": True})
        self.assertEqual(ev["answers"]["3"]["status"], "dont_know")
        self.assertEqual(ev["answers"]["4"]["status"], "no_response")
        self.assertEqual(ev["answers"]["6"]["status"], "unanswered_at_end")
        self.assertEqual(ev["ended"]["reason"], "time_up")
        # question 3 is a follow-up of question 2: same thread; question 4 starts a new thread
        self.assertEqual(ev["turns"][0]["parent_question_id"], 2)
        self.assertEqual(ev["thread_root"]["3"], 2)
        self.assertEqual(ev["thread_root"]["4"], 4)
        self.assertEqual(ev["turns"][0]["alex"], None)  # last turn's reading did not belong to this action
        run = ev["coding_runs"]["4"][0]["run"]
        self.assertEqual((run["passed"], run["total"], run["source"]), (2, 3, "browser"))
        self.assertEqual(ev["last_code"]["4"]["code"], "print(1)")
        recording.record_end(state, "ended_by_learner")
        self.assertEqual(ev["ended"]["reason"], "time_up")  # the first reason is kept
        self.assertEqual(summarize(state)["answer_statuses"]["dont_know"], 1)

    def test_lists_are_bounded(self):
        state = make_state()
        q = state["interview"]
        for _ in range(recording.MAX_RUNS_PER_QUESTION + 30):
            recording.record_coding_event(state, q[3], {"type": "idle", "code": "x" * 50000}, "")
        for _ in range(recording.MAX_TURNS + 30):
            recording.record_turn(state, q[1], q[2])
        ev = state[EVIDENCE_KEY]
        self.assertEqual(len(ev["coding_runs"]["4"]), recording.MAX_RUNS_PER_QUESTION)
        self.assertEqual(len(ev["turns"]), recording.MAX_TURNS)
        self.assertEqual(len(ev["last_code"]["4"]["code"]), recording.MAX_CODE_CHARS)


class EvaluationQueueTests(TestCase):
    def setUp(self):
        from mockinterviews.models import MockInterview, MockInterviewSubmission

        user = get_user_model().objects.create_user(username="evalv2", email="evalv2@yuvro.com", password="x12345678")
        interview = MockInterview.objects.create(title="Python", created_by=user, publish_status="active")
        self.submission = MockInterviewSubmission.objects.create(user=user, mock_interview=interview)

    def test_queueing_twice_creates_one_row(self):
        from mockinterviews.models import InterviewEvaluation

        first = queue.enqueue(self.submission)
        second = queue.enqueue(self.submission)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(InterviewEvaluation.objects.filter(submission=self.submission).count(), 1)
        self.assertEqual(first.engine_version, ENGINE_VERSION)
        self.assertEqual(first.status, InterviewEvaluation.STATUS_PENDING)

    def test_claim_retry_and_give_up(self):
        from mockinterviews.models import InterviewEvaluation

        queue.enqueue(self.submission)
        (row,) = queue.claim()
        self.assertEqual((row.status, row.attempts), (InterviewEvaluation.STATUS_PROCESSING, 1))
        self.assertEqual(queue.claim(), [])  # already taken: no duplicate processing

        queue.fail(row, "model timeout")
        row.refresh_from_db()
        self.assertEqual(row.status, InterviewEvaluation.STATUS_RETRY)
        self.assertEqual(queue.claim(), [])  # not due yet
        InterviewEvaluation.objects.filter(pk=row.pk).update(next_attempt_at=timezone.now())
        for attempt in range(2, queue.MAX_ATTEMPTS + 1):
            (row,) = queue.claim()
            self.assertEqual(row.attempts, attempt)
            queue.fail(row, "still failing")
            InterviewEvaluation.objects.filter(pk=row.pk).update(next_attempt_at=timezone.now())
        row.refresh_from_db()
        self.assertEqual(row.status, InterviewEvaluation.STATUS_FAILED)
        self.assertEqual(queue.claim(), [])

    def test_stale_processing_row_is_recovered(self):
        from mockinterviews.models import InterviewEvaluation

        queue.enqueue(self.submission)
        (row,) = queue.claim()
        InterviewEvaluation.objects.filter(pk=row.pk).update(locked_at=timezone.now() - queue.STALE_AFTER * 2)
        (again,) = queue.claim()
        self.assertEqual((again.pk, again.attempts), (row.pk, 2))

    def test_finish_stores_result_and_metadata(self):
        from mockinterviews.models import InterviewEvaluation

        queue.enqueue(self.submission)
        (row,) = queue.claim()
        queue.finish(row, result={"overall": 2.5}, status=InterviewEvaluation.STATUS_COMPLETED,
                     rubric_version="r1", evaluator_model="deepseek/deepseek-flash", metadata={"tokens": 10})
        row.refresh_from_db()
        self.assertEqual((row.status, row.rubric_version, row.evaluator_model), ("completed", "r1", "deepseek/deepseek-flash"))
        self.assertEqual(row.result, {"overall": 2.5})
        self.assertIsNotNone(row.finished_at)
