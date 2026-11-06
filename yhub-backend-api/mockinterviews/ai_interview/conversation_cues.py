from __future__ import annotations

from mockinterviews.ai_interview.config import settings


def next_question_ack() -> dict:
    return {
        "type": 1,
        "action": "next_question",
        "message": "Thank you. Let's move to the next question.",
    }


def add_more_ack() -> dict:
    return {
        "type": 2,
        "action": "add_more",
        "message": "Would you like to add anything else before we move on?",
    }


def hint_offer_ack() -> dict:
    return {
        "type": 2,
        "action": "offer_hint",
        "message": "You're close. Do you need any hint before we move ahead?",
    }


def long_answer_ack() -> dict:
    return {
        "type": 1,
        "action": "polite_stop",
        "message": (
            "Thank you, I will pause you there so we can cover the remaining areas. "
            "Let's move to the next question."
        ),
    }


def silence_ack(wait_seconds: float | None = None) -> dict:
    seconds = wait_seconds or settings.SILENCE_PROMPT_SECONDS
    return {
        "type": 3,
        "action": "presence_check",
        "message": "Are you still there? We can wait a moment, or move to the next question.",
        "wait_seconds": seconds,
    }


def closing_ack() -> dict:
    return {
        "type": 1,
        "action": "closing",
        "message": "Thank you. That completes the interview.",
    }


def cue_for_answer(
    evaluation: dict,
    answer_duration_seconds: float | None,
    interview_complete: bool,
) -> tuple[dict, bool]:
    """Choose the best post-answer acknowledgement."""
    if interview_complete:
        return closing_ack(), True

    if (
        answer_duration_seconds is not None
        and answer_duration_seconds >= settings.LONG_ANSWER_SECONDS
    ):
        return long_answer_ack(), True

    if evaluation.get("should_offer_hint"):
        return hint_offer_ack(), False

    score = _coerce_float(evaluation.get("score", 0))
    word_count = _coerce_float(evaluation.get("answer_word_count", 0))
    if score >= 7 or word_count >= 30:
        return next_question_ack(), True

    return add_more_ack(), False


def cue_for_event(
    event_type: str,
    silence_seconds: float | None = None,
    answer_duration_seconds: float | None = None,
    partial_answer: str = "",
) -> tuple[dict, bool]:
    """Return a real-time cue for timers or partial-answer events."""
    normalized_event = event_type.strip().lower()

    if (
        normalized_event == "silence"
        or (
            silence_seconds is not None
            and silence_seconds >= settings.SILENCE_PROMPT_SECONDS
        )
    ):
        return silence_ack(settings.SILENCE_PROMPT_SECONDS), False

    if (
        normalized_event == "long_answer"
        or (
            answer_duration_seconds is not None
            and answer_duration_seconds >= settings.LONG_ANSWER_SECONDS
        )
    ):
        return long_answer_ack(), True

    if normalized_event == "add_more" or partial_answer.strip():
        return add_more_ack(), False

    return next_question_ack(), True


def _coerce_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
