"""Evidence recording during the live interview (for the post-interview evaluation engine).

Rules this module keeps:
  * It only ADDS data under one new key of the interview state, `evidence_v2`. It never reads or
    changes the keys the live interview uses (`interview`, `answers`, `master_state`, ...), so the
    scorer, Alex and the existing report see exactly what they saw before.
  * No AI call, no database query, no network: plain dictionary writes that take microseconds. The
    data is saved by the save that the interview already performs right after each hook.
  * It can never break a turn: every public function swallows its own errors.

What is recorded (schema 1):
  evidence_v2 = {
    "schema": 1,
    "answers":     {question_id: {"status", "at", "source_status", "words", "input"?}},
    "turns":       [{"answered_question_id", "next_question_id", "next_action", "parent_question_id",
                     "thread_root_id", "alex": {...} | None, "hint_level_given", "difficulty_level", "at"}],
    "thread_root": {question_id: root_question_id},
    "coding_runs": {question_id: [{"type", "at", "run": {...} | None, "language", "code_chars",
                                   "hint_level_given", "repeat_failure"}]},
    "last_code":   {question_id: {"language", "code", "at"}},
    "ended":       {"reason", "at"} | None,
  }
"""
from __future__ import annotations

import functools
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

EVIDENCE_KEY = "evidence_v2"
SCHEMA = 1

ANSWER_STATUSES = (
    "answered", "dont_know", "skipped", "no_response", "remark", "backtrack_request", "intro",
    "unanswered_at_end",
)
FINISH_STATUSES = ("finish", "end", "complete")
SAME_THREAD_ACTIONS = ("ask_followup", "give_hint", "wait", "confirm_end")

MAX_TURNS = 400
MAX_RUNS_PER_QUESTION = 60
MAX_CODE_CHARS = 12000
MAX_FAILURES = 5


def _safe(fn):
    """Recording must never affect the interview: log and carry on."""

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            logger.warning("evidence recording skipped (%s): %s", fn.__name__, exc)
            return None

    return wrapper


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _evidence(state: dict) -> dict:
    ev = state.get(EVIDENCE_KEY)
    if not isinstance(ev, dict):
        ev = {}
        state[EVIDENCE_KEY] = ev
    ev.setdefault("schema", SCHEMA)
    for key, empty in (("answers", {}), ("turns", []), ("thread_root", {}), ("coding_runs", {}), ("last_code", {})):
        if not isinstance(ev.get(key), type(empty)):
            ev[key] = empty
    ev.setdefault("ended", None)
    return ev


def _int(value, default=0, top=100000) -> int:
    try:
        return max(0, min(top, int(value)))
    except (TypeError, ValueError):
        return default


def _clean_input_quality(raw) -> dict | None:
    """What the page reports about how the answer was captured (whitelisted, bounded)."""
    if not isinstance(raw, dict):
        return None
    out: dict = {}
    mode = str(raw.get("mode") or "")[:10]
    if mode in ("voice", "typed"):
        out["mode"] = mode
    for key in ("failed_segments", "reconnects"):
        if key in raw:
            out[key] = _int(raw.get(key), top=1000)
    for key in ("noisy", "stt_failure", "connection_lost"):
        if key in raw:
            out[key] = bool(raw.get(key))
    return out or None


@_safe
def record_end(state: dict, reason: str | None) -> None:
    """Why the interview ended. The first recorded reason is kept."""
    ev = _evidence(state)
    if not ev.get("ended"):
        ev["ended"] = {"reason": str(reason or "finished")[:40], "at": _now()}


@_safe
def record_answer(
    state: dict,
    question: dict,
    *,
    status_code: str,
    clean_answer: str,
    evaluation: dict | None,
    backtrack: bool = False,
    remark: bool = False,
    dont_know: bool = False,
    input_quality=None,
    end_reason: str | None = None,
) -> None:
    """Called where the live interview stores an answer. Same decision order as the live code."""
    ev = _evidence(state)
    evaluation = evaluation if isinstance(evaluation, dict) else {}
    finishing = status_code in FINISH_STATUSES
    if evaluation.get("no_response"):
        status = "no_response"
    elif evaluation.get("exclude_from_score"):
        status = "intro"
    elif backtrack:
        status = "backtrack_request"
    elif remark:
        status = "remark"
    elif dont_know:
        status = "dont_know"
    elif status_code == "skip":
        status = "skipped"
    elif clean_answer:
        status = "answered"
    else:
        status = "unanswered_at_end" if finishing else "skipped"

    entry = {
        "status": status,
        "at": _now(),
        "source_status": str(status_code or "")[:20],
        "words": len((clean_answer or "").split()),
    }
    quality = _clean_input_quality(input_quality)
    if quality:
        entry["input"] = quality
    ev["answers"][str(question.get("id"))] = entry
    if finishing:
        record_end(state, end_reason)


@_safe
def record_turn(state: dict, answered_question: dict, next_question: dict) -> None:
    """Called after Alex's reply was added to the question list: links the turn to its thread."""
    ev = _evidence(state)
    answered_id = answered_question.get("id")
    next_id = next_question.get("id")
    action = next_question.get("next_action")
    roots = ev["thread_root"]
    root = roots.get(str(answered_id), answered_id)
    roots.setdefault(str(answered_id), root)
    same_thread = action in SAME_THREAD_ACTIONS
    roots[str(next_id)] = root if same_thread else next_id

    alex = None
    last = state.get("master_last_turn")
    if action and isinstance(last, dict) and last.get("next_action") == action:
        alex = {k: last.get(k) for k in ("intent", "answer_rating", "coding_action")}

    master = state.get("master_state") if isinstance(state.get("master_state"), dict) else {}
    ev["turns"].append({
        "answered_question_id": answered_id,
        "next_question_id": next_id,
        "next_action": action or "fallback",
        "parent_question_id": answered_id if same_thread else None,
        "thread_root_id": roots[str(next_id)],
        "alex": alex,
        "hint_level_given": _int(master.get("hint_level_given"), top=20),
        "difficulty_level": next_question.get("difficulty_level"),
        "at": _now(),
    })
    if len(ev["turns"]) > MAX_TURNS:
        del ev["turns"][: len(ev["turns"]) - MAX_TURNS]


@_safe
def record_coding_event(state: dict, question: dict | None, event: dict, reply: str = "") -> None:
    """Called for idle / Run events from the code editor (test results come from the learner's browser)."""
    if not isinstance(question, dict) or not isinstance(event, dict):
        return
    ev = _evidence(state)
    qid = str(question.get("id"))
    run = event.get("run") if isinstance(event.get("run"), dict) else None
    run_summary = None
    if run:
        failures = run.get("failures") if isinstance(run.get("failures"), list) else []
        run_summary = {
            "status": str(run.get("status") or "")[:30],
            "passed": _int(run.get("passed"), top=1000),
            "total": _int(run.get("total"), top=1000),
            "error": str(run.get("error") or "")[:300],
            "failures": [str(f)[:200] for f in failures[:MAX_FAILURES]],
            "source": "browser",  # supporting evidence, not proof of correctness
        }
    code = str(event.get("code") or "")
    master = state.get("master_state") if isinstance(state.get("master_state"), dict) else {}
    runs = ev["coding_runs"].setdefault(qid, [])
    runs.append({
        "type": "run" if event.get("type") == "run" else "idle",
        "at": _now(),
        "run": run_summary,
        "language": str(event.get("language") or "")[:20],
        "code_chars": len(code),
        "hint_level_given": _int(master.get("hint_level_given"), top=20),
        "repeat_failure": bool(event.get("repeat_failure")),
        "alex_replied": bool(reply),
    })
    if len(runs) > MAX_RUNS_PER_QUESTION:
        del runs[: len(runs) - MAX_RUNS_PER_QUESTION]
    if code.strip():
        ev["last_code"][qid] = {
            "language": str(event.get("language") or "")[:20],
            "code": code[:MAX_CODE_CHARS],
            "truncated": len(code) > MAX_CODE_CHARS,
            "at": _now(),
        }
