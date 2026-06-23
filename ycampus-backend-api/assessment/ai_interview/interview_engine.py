from difflib import SequenceMatcher
import logging
import re
from typing import Any

from assessment.ai_interview.config import settings
from assessment.ai_interview.llm_client import get_llm_client
from assessment.ai_interview.prompts import ADAPTIVE_QUESTION_PROMPT, INTERVIEW_GENERATION_PROMPT
from assessment.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)

SELF_INTRO_TOPIC = "Self introduction"
CLOSING_NOTE = (
    "Thank you for completing the mock interview. I appreciate your time and "
    "the detail you shared today. You can now review your feedback and report."
)


async def generate_questions(
    analysis: dict,
    difficulty: str = "medium",
    num_questions: int = 5,
) -> list[dict]:
    """Generate all interview questions in one batch.

    Args:
        analysis: The ResumeAnalysis dict from the session.
        difficulty: easy | medium | hard.
        num_questions: How many questions to generate (1-15).

    Returns:
        List of question dicts.
    """
    intro_question = build_self_intro_question()
    if num_questions <= 1:
        return [intro_question]

    client = get_llm_client()

    summary = _build_analysis_summary(analysis)
    remaining_count = num_questions - 1

    prompt = INTERVIEW_GENERATION_PROMPT.format(
        analysis_summary=summary,
        difficulty=difficulty,
        num_questions=remaining_count,
        start_id=2,
    )

    logger.info("Batch generating %d %s questions", remaining_count, difficulty)

    response = await client.generate(
        prompt=prompt,
        system_prompt="You are a technical interviewer. Return only valid JSON.",
        max_tokens=settings.MAX_OUTPUT_TOKENS_QUESTIONS,
    )

    questions = parse_json_response(response)

    if isinstance(questions, dict):
        questions = questions.get("questions", [])

    questions = _dedupe_and_reindex_questions(
        questions=questions,
        existing_questions=[intro_question],
        start_id=2,
        limit=remaining_count,
        default_difficulty=difficulty,
    )
    questions = _fill_missing_questions(
        questions=questions,
        analysis=analysis,
        difficulty=difficulty,
        target_count=remaining_count,
        existing_questions=[intro_question],
    )

    all_questions = [intro_question, *questions]
    logger.info("Generated %d questions including self introduction", len(all_questions))
    return all_questions


async def get_next_question(
    session: dict[str, Any],
    num_total_questions: int = 5,
) -> dict | None:
    """Generate the next adaptive question based on performance so far.

    Args:
        session: The full session dict (submission state_data).
        num_total_questions: Total questions planned for this interview.

    Returns:
        Next question dict, or None if interview is complete.
    """
    analysis = session.get("analysis", {})
    questions = session.get("interview", []) or []
    answers = session.get("answers", {})

    questions_asked = len(questions)

    if questions_asked == 0:
        logger.info("Starting adaptive interview with self-introduction question")
        return build_self_intro_question()

    if questions_asked >= num_total_questions:
        logger.info("Interview complete: %d/%d questions asked", questions_asked, num_total_questions)
        return None

    scores = [_coerce_score(a.get("score", 5)) for a in answers.values() if isinstance(a, dict)]
    avg_score = sum(scores) / len(scores) if scores else 5.0

    topics_covered = list({q.get("topic", "") for q in questions})
    all_topics = _get_all_topics(analysis)
    topics_remaining = [t for t in all_topics if t not in topics_covered] or all_topics

    trend = _compute_trend(scores)

    client = get_llm_client()
    summary = _build_analysis_summary(analysis)
    avoid_questions = [q.get("question", "") for q in questions if isinstance(q, dict)]
    next_id = questions_asked + 1

    logger.info(
        "Adaptive question %d/%d: avg_score=%.1f, trend=%s",
        next_id,
        num_total_questions,
        avg_score,
        trend,
    )

    for attempt in range(1, settings.MAX_QUESTION_GENERATION_ATTEMPTS + 1):
        prompt = ADAPTIVE_QUESTION_PROMPT.format(
            analysis_summary=summary,
            questions_asked=questions_asked,
            avg_score=f"{avg_score:.1f}",
            topics_covered=", ".join(topics_covered) or "none yet",
            topics_remaining=", ".join(topics_remaining),
            trend=trend,
            base_difficulty=session.get("difficulty", "medium"),
            previous_questions=_format_previous_questions(avoid_questions),
            next_id=next_id,
        )

        response = await client.generate(
            prompt=prompt,
            system_prompt="You are an adaptive technical interviewer. Return only valid JSON.",
            max_tokens=settings.MAX_OUTPUT_TOKENS_ADAPTIVE,
        )

        question = parse_json_response(response)

        if isinstance(question, list) and question:
            question = question[0]

        question = _normalize_question(
            question=question,
            question_id=next_id,
            default_difficulty=session.get("difficulty", "medium"),
        )

        if question and not _is_duplicate_question(question, questions):
            return question

        rejected = question.get("question", "") if isinstance(question, dict) else ""
        if rejected:
            avoid_questions.append(rejected)
        logger.warning(
            "Adaptive question attempt %d produced a duplicate; retrying",
            attempt,
        )

    return _build_fallback_question(
        question_id=next_id,
        topics=topics_remaining,
        difficulty=session.get("difficulty", "medium"),
        existing_questions=questions,
    )


def build_self_intro_question() -> dict:
    """Return the standard first question for every interview."""
    return {
        "id": 1,
        "question": (
            "Please start with a brief self-introduction, including your background, "
            "key experience, and what interests you about this role."
        ),
        "topic": SELF_INTRO_TOPIC,
        "difficulty": "easy",
        "question_type": "behavioral",
        "expected_points": [
            "Professional background",
            "Relevant experience",
            "Interest in the role",
        ],
        "reasoning": "Every interview starts by helping the candidate warm up.",
    }


def _build_analysis_summary(analysis: dict) -> str:
    """Build a concise profile summary for prompts."""
    skills = analysis.get("skills", [])
    skill_names = [s.get("skill", "") for s in skills if isinstance(s, dict)]

    return (
        f"Name: {analysis.get('candidate_name', 'Unknown')}\n"
        f"Level: {analysis.get('experience_level', 'mid')}\n"
        f"Domain: {analysis.get('domain', 'General')}\n"
        f"Match Score: {analysis.get('match_score', 'N/A')}%\n"
        f"Skills: {', '.join(skill_names[:15])}\n"
        f"Strengths: {', '.join(analysis.get('strengths', []))}\n"
        f"Gaps: {', '.join(analysis.get('gaps', []))}"
    )


def _get_all_topics(analysis: dict) -> list[str]:
    """Extract topic areas from skills + domain."""
    topics = []

    for skill in analysis.get("skills", []):
        if isinstance(skill, dict):
            topics.append(skill.get("skill", ""))

    domain = analysis.get("domain", "")
    if domain and domain not in topics:
        topics.append(domain)

    for gap in analysis.get("gaps", []):
        if gap not in topics:
            topics.append(gap)

    return [t for t in topics if t]


def _compute_trend(scores: list[int | float]) -> str:
    """Determine performance trend from recent scores."""
    if len(scores) < 2:
        return "not_enough_data"

    recent = scores[-3:]
    if len(recent) >= 2:
        diff = recent[-1] - recent[0]
        if diff > 1.5:
            return "improving"
        elif diff < -1.5:
            return "declining"

    return "stable"


def _coerce_score(value: object, default: float = 5.0) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return default
    return max(1.0, min(10.0, score))


def _dedupe_and_reindex_questions(
    questions: Any,
    existing_questions: list[dict],
    start_id: int,
    limit: int,
    default_difficulty: str,
) -> list[dict]:
    """Remove duplicate LLM questions and assign stable sequential IDs."""
    if not isinstance(questions, list):
        return []

    accepted: list[dict] = []
    for raw_question in questions:
        question = _normalize_question(
            question=raw_question,
            question_id=start_id + len(accepted),
            default_difficulty=default_difficulty,
        )
        if not question:
            continue
        if _is_duplicate_question(question, [*existing_questions, *accepted]):
            logger.info("Dropping duplicate question: %s", question["question"][:80])
            continue
        accepted.append(question)
        if len(accepted) >= limit:
            break

    return accepted


def _fill_missing_questions(
    questions: list[dict],
    analysis: dict,
    difficulty: str,
    target_count: int,
    existing_questions: list[dict],
) -> list[dict]:
    """Backfill any questions lost during de-duplication."""
    topics = _get_all_topics(analysis) or [analysis.get("domain", "the role")]
    while len(questions) < target_count:
        question_id = len(existing_questions) + len(questions) + 1
        fallback = _build_fallback_question(
            question_id=question_id,
            topics=topics,
            difficulty=difficulty,
            existing_questions=[*existing_questions, *questions],
        )
        questions.append(fallback)
    return questions


def _normalize_question(
    question: Any,
    question_id: int,
    default_difficulty: str,
) -> dict | None:
    """Coerce a model-generated question into the API shape."""
    if not isinstance(question, dict):
        return None

    text = str(question.get("question", "")).strip()
    if not text:
        return None

    expected_points = question.get("expected_points", [])
    if isinstance(expected_points, str):
        expected_points = [expected_points]
    elif not isinstance(expected_points, list):
        expected_points = []

    return {
        "id": question_id,
        "question": text,
        "topic": str(question.get("topic") or "General").strip(),
        "difficulty": str(question.get("difficulty") or default_difficulty).strip(),
        "question_type": str(question.get("question_type") or "technical").strip(),
        "expected_points": [str(point).strip() for point in expected_points if str(point).strip()],
        "reasoning": question.get("reasoning"),
    }


def _build_fallback_question(
    question_id: int,
    topics: list[str],
    difficulty: str,
    existing_questions: list[dict],
) -> dict:
    """Create a deterministic unique question when the model repeats itself."""
    clean_topics = [topic for topic in topics if topic and topic != SELF_INTRO_TOPIC] or ["the role"]
    templates = [
        "Can you describe a project where you used {topic} and explain the key trade-offs you made?",
        "What are the most important considerations when applying {topic} in a production environment?",
        "How would you troubleshoot a challenging issue related to {topic}?",
        "Can you compare two approaches for solving a problem involving {topic}?",
    ]

    for topic in clean_topics:
        for template in templates:
            text = template.format(topic=topic)
            candidate = {
                "id": question_id,
                "question": text,
                "topic": topic,
                "difficulty": difficulty,
                "question_type": "technical",
                "expected_points": [
                    f"Practical experience with {topic}",
                    "Trade-offs or decision criteria",
                    "Clear outcome or troubleshooting approach",
                ],
                "reasoning": "Fallback question selected to avoid repetition.",
            }
            if not _is_duplicate_question(candidate, existing_questions):
                return candidate

    return {
        "id": question_id,
        "question": "Can you walk through a recent technical challenge and how you approached it?",
        "topic": "General",
        "difficulty": difficulty,
        "question_type": "technical",
        "expected_points": ["Problem context", "Approach", "Outcome"],
        "reasoning": "Fallback question selected after all topic-specific options repeated.",
    }


def _is_duplicate_question(question: dict, existing_questions: list[dict]) -> bool:
    """Detect exact or near-duplicate interview questions."""
    candidate = question.get("question", "")
    if not candidate:
        return True

    for existing in existing_questions:
        existing_text = existing.get("question", "") if isinstance(existing, dict) else ""
        if _questions_are_similar(candidate, existing_text):
            return True
    return False


def _questions_are_similar(left: str, right: str) -> bool:
    left_norm = _normalize_question_text(left)
    right_norm = _normalize_question_text(right)
    if not left_norm or not right_norm:
        return False
    if left_norm == right_norm:
        return True

    sequence_ratio = SequenceMatcher(None, left_norm, right_norm).ratio()
    if sequence_ratio >= settings.QUESTION_DUPLICATE_SIMILARITY:
        return True

    left_tokens = set(left_norm.split())
    right_tokens = set(right_norm.split())
    if not left_tokens or not right_tokens:
        return False
    overlap = len(left_tokens & right_tokens) / min(len(left_tokens), len(right_tokens))
    return overlap >= settings.QUESTION_DUPLICATE_SIMILARITY


def _normalize_question_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _format_previous_questions(questions: list[str]) -> str:
    if not questions:
        return "- none"
    return "\n".join(f"- {question}" for question in questions if question.strip())
