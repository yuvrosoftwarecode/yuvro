"""Read-only summary of the evidence stored for one interview (what the evaluation engine will see)."""
from __future__ import annotations

from mockinterviews.evaluation_v2.recording import EVIDENCE_KEY

INTRO_TOPICS = ("self introduction", "self_intro", "introduction")


def summarize(state: dict) -> dict:
    state = state if isinstance(state, dict) else {}
    interview = [q for q in (state.get("interview") or []) if isinstance(q, dict)]
    answers = state.get("answers") if isinstance(state.get("answers"), dict) else {}
    ev = state.get(EVIDENCE_KEY) if isinstance(state.get(EVIDENCE_KEY), dict) else {}
    ev_answers = ev.get("answers") or {}
    turns = ev.get("turns") or []
    roots = ev.get("thread_root") or {}
    runs = ev.get("coding_runs") or {}

    statuses: dict = {}
    for entry in ev_answers.values():
        statuses[entry.get("status", "?")] = statuses.get(entry.get("status", "?"), 0) + 1

    scored_answers = [
        qid for qid, a in answers.items()
        if isinstance(a, dict) and not a.get("exclude_from_score")
    ]
    missing_status = sorted(qid for qid in scored_answers if qid not in ev_answers)
    questions_after_intro = [q for q in interview[2:]]  # question 1 = introduction, 2 = first question after it
    linked = {str(t.get("next_question_id")) for t in turns}
    missing_links = [q.get("id") for q in questions_after_intro if str(q.get("id")) not in linked]
    coding_questions = [q for q in interview if q.get("question_type") == "coding"]

    threads: dict = {}
    for qid, root in roots.items():
        threads.setdefault(str(root), []).append(qid)

    issues = []
    if not ev:
        issues.append("no evidence recorded (interview from before recording was added)")
    if missing_status:
        issues.append(f"answers without a recorded status: {missing_status}")
    if missing_links:
        issues.append(f"questions without a recorded turn link: {missing_links}")
    if coding_questions and not runs:
        issues.append("coding question(s) asked but no Run or idle event recorded")
    if ev and not ev.get("ended"):
        issues.append("no end reason recorded (interview still running or abandoned)")
    voice_or_typed = sum(1 for e in ev_answers.values() if isinstance(e.get("input"), dict))

    return {
        "schema": ev.get("schema"),
        "questions": len(interview),
        "answers": len(answers),
        "answers_with_status": len(ev_answers),
        "answer_statuses": statuses,
        "answers_with_input_quality": voice_or_typed,
        "turns_recorded": len(turns),
        "threads": len(threads),
        "follow_up_or_hint_turns": sum(1 for t in turns if t.get("parent_question_id") is not None),
        "hint_turns": sum(1 for t in turns if t.get("next_action") == "give_hint"),
        "coding_questions": len(coding_questions),
        "coding_events": sum(len(v) for v in runs.values()),
        "coding_runs_with_results": sum(1 for v in runs.values() for r in v if r.get("run")),
        "last_code_saved_for": sorted((ev.get("last_code") or {}).keys()),
        "ended": ev.get("ended"),
        "issues": issues,
    }
