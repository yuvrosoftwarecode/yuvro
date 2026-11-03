from difflib import SequenceMatcher
import logging
import re
from typing import Any

from mockinterviews.ai_interview.config import settings
from mockinterviews.ai_interview.llm_client import get_llm_client
from mockinterviews.ai_interview.prompts import (
    ADAPTIVE_QUESTION_PROMPT,
    INTERVIEW_GENERATION_PROMPT,
    FIRST_TECHNICAL_QUESTION_PROMPT,
)
from mockinterviews.ai_interview.json_parser import parse_json_response

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
    num_total_questions: int | None = None,
) -> dict | None:
    """Generate the next adaptive question based on performance so far.

    Args:
        session: The full session dict (submission state_data).
        num_total_questions: Optional total questions (None for continuous adaptive interview).

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

    client = get_llm_client()
    summary = _build_analysis_summary(analysis)
    all_topics = _get_all_topics(analysis)
    difficulty = session.get("difficulty", "medium")

    # =========================================================================
    # CASE 1: Turn immediately after self-introduction -> Opening Technical Question
    # =========================================================================
    last_q_obj = questions[-1] if questions else {}
    is_after_intro = (
        questions_asked == 1 or
        (isinstance(last_q_obj, dict) and last_q_obj.get("topic") == SELF_INTRO_TOPIC)
    )

    if is_after_intro:
        intro_answer = ""
        intro_ans_obj = answers.get("1")
        if isinstance(intro_ans_obj, dict):
            intro_answer = intro_ans_obj.get("answer", "")
        if not intro_answer and answers:
            first_ans = list(answers.values())[0]
            if isinstance(first_ans, dict):
                intro_answer = first_ans.get("answer", "")

        intro_details = session.get("intro_details", {})
        candidate_name = ""
        if isinstance(intro_details, dict):
            candidate_name = intro_details.get("name") or ""
        if not candidate_name:
            candidate_name = analysis.get("candidate_name") or ""
        if not candidate_name or candidate_name.lower() in ["there", "none", "null"]:
            candidate_name = "there"

        candidate_name = candidate_name.strip().title()
        domain = analysis.get("domain", "Software Development")
        skills_str = ", ".join(all_topics[:6]) or domain

        prompt = FIRST_TECHNICAL_QUESTION_PROMPT.format(
            analysis_summary=summary,
            candidate_intro=intro_answer or "Candidate introduced themselves.",
            candidate_name=candidate_name,
            domain=domain,
            skills=skills_str,
            difficulty=difficulty,
        )

        logger.info("Generating opening technical question for candidate: %s", candidate_name)

        for attempt in range(1, settings.MAX_QUESTION_GENERATION_ATTEMPTS + 1):
            try:
                response = await client.generate(
                    prompt=prompt,
                    system_prompt="You are a friendly technical interviewer. Return only valid JSON.",
                    max_tokens=settings.MAX_OUTPUT_TOKENS_ADAPTIVE,
                )
                question = parse_json_response(response)
                if isinstance(question, list) and question:
                    question = question[0]
                question = _normalize_question(
                    question=question,
                    question_id=2,
                    default_difficulty=difficulty,
                )
                if question and not _is_duplicate_question(question, questions):
                    return question
            except Exception as e:
                logger.warning("Attempt %d to generate opening technical question failed: %s", attempt, e)

        return _build_fallback_question(
            question_id=2,
            topics=all_topics,
            difficulty=difficulty,
            existing_questions=questions,
        )

    # =========================================================================
    # CASE 2: Adaptive Technical Question Progression (Questions 3+)
    # =========================================================================
    scores = [_coerce_score(a.get("score", 5)) for a in answers.values() if isinstance(a, dict)]
    avg_score = sum(scores) / len(scores) if scores else 5.0

    topics_covered = list({q.get("topic", "") for q in questions if isinstance(q, dict)})
    topics_remaining = [t for t in all_topics if t not in topics_covered] or all_topics

    trend = _compute_trend(scores)

    # Extract conversational context from the most recent turn
    last_question = "Previous technical question"
    last_answer = "Candidate response recorded."
    last_score = "5"
    last_feedback = "None"
    last_follow_up = "None"

    if questions:
        last_q_obj = questions[-1]
        if isinstance(last_q_obj, dict):
            last_q_text = last_q_obj.get("question", "")
            if last_q_text:
                last_question = f'"{last_q_text}"'
            last_q_id = str(last_q_obj.get("id"))
            last_answer_obj = answers.get(last_q_id)
            if not last_answer_obj and answers:
                last_key = list(answers.keys())[-1]
                last_answer_obj = answers[last_key]

            if isinstance(last_answer_obj, dict):
                ans_text = last_answer_obj.get("answer", "")
                if ans_text:
                    last_answer = f'"{ans_text}"'
                s_val = last_answer_obj.get("score")
                if s_val is not None:
                    last_score = str(s_val)
                f_val = last_answer_obj.get("feedback")
                if f_val:
                    last_feedback = str(f_val)
                fu_val = last_answer_obj.get("follow_up_suggestion")
                if fu_val:
                    last_follow_up = str(fu_val)

    avoid_questions = [q.get("question", "") for q in questions if isinstance(q, dict)]
    next_id = questions_asked + 1
    dialogue_history = _format_dialogue_history(questions, answers)

    intro_details = session.get("intro_details", {})
    candidate_name = ""
    if isinstance(intro_details, dict):
        candidate_name = intro_details.get("name") or ""
    if not candidate_name:
        candidate_name = analysis.get("candidate_name") or ""
    if not candidate_name or candidate_name.lower() in ["there", "none", "null"]:
        candidate_name = "there"
    candidate_name = candidate_name.strip().title()

    logger.info(
        "Adaptive question %d: avg_score=%.1f, trend=%s, last_score=%s",
        next_id,
        avg_score,
        trend,
        last_score,
    )

    for attempt in range(1, settings.MAX_QUESTION_GENERATION_ATTEMPTS + 1):
        try:
            prompt = ADAPTIVE_QUESTION_PROMPT.format(
                candidate_name=candidate_name,
                analysis_summary=summary,
                questions_asked=questions_asked,
                avg_score=f"{avg_score:.1f}",
                topics_covered=", ".join(topics_covered) or "none yet",
                topics_remaining=", ".join(topics_remaining),
                trend=trend,
                base_difficulty=session.get("difficulty", "medium"),
                dialogue_history=dialogue_history,
                last_answer=last_answer,
                previous_questions=_format_previous_questions(avoid_questions),
                last_feedback=last_feedback,
                follow_up_suggestion=last_follow_up,
                next_id=next_id,
            )

            response = await client.generate(
                prompt=prompt,
                system_prompt="You are an empathetic Principal Software Engineer conducting an authentic technical interview. Always warmly acknowledge the candidate's response before asking the next question, never ignore what they said, and vary your acknowledgements naturally. Return only valid JSON.",
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
        except Exception as e:
            logger.warning(
                "Adaptive question attempt %d failed: %s",
                attempt,
                e,
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
        "Can you explain the core concepts of {topic} and when you would use it in your code?",
        "What are the main advantages and common use cases of {topic}?",
        "Could you give a simple example of how {topic} works in a program?",
        "How would you explain the fundamentals of {topic} to another developer?",
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


def _format_dialogue_history(
    questions: list[dict],
    answers: dict[str, Any],
    max_turns: int = 6,
) -> str:
    """Format recent dialogue turns chronologically for the LLM prompt."""
    turns = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        q_id = str(q.get("id"))
        q_text = (q.get("question") or "").strip()
        ans_obj = answers.get(q_id)
        ans_text = ""
        if isinstance(ans_obj, dict):
            ans_text = (ans_obj.get("answer") or "").strip()
        elif isinstance(ans_obj, str):
            ans_text = ans_obj.strip()

        if q_text:
            turn_str = f"Interviewer: {q_text}"
            if ans_text:
                turn_str += f"\nCandidate: {ans_text}"
            turns.append(turn_str)

    if not turns:
        return "No prior dialogue turns."
    recent = turns[-max_turns:] if len(turns) > max_turns else turns
    return "\n\n".join(recent)



# ───────────────────────────────────────────────────────────
# Master System Prompt Engine Implementation (Alex)
# ───────────────────────────────────────────────────────────

from mockinterviews.ai_interview.schemas.master_interviewer import (
    InterviewPhase,
    CandidateIntent,
    NextAction,
    CodingAction,
    AnswerRating,
    InterviewState,
    CodeRunResult,
    TurnEvents,
    InterviewerTurnOutput,
)
from mockinterviews.ai_interview.prompts import (
    MASTER_INTERVIEWER_SYSTEM_PROMPT,
    MASTER_INTERVIEWER_TURN_PROMPT,
)

# Phase time specifications in seconds (Total 60m = 3600s)
PHASE_TIME_SPECS = {
    InterviewPhase.P1: {"target": 180, "soft": 240, "hard": 300},      # 3m
    InterviewPhase.P2: {"target": 600, "soft": 720, "hard": 840},      # 10m
    InterviewPhase.P3: {"target": 420, "soft": 540, "hard": 600},      # 7m
    InterviewPhase.P4: {"target": 720, "soft": 840, "hard": 960},      # 12m target, 14m soft, 16m hard
    InterviewPhase.P5: {"target": 240, "soft": 300, "hard": 360},      # 4m target, 5m soft, 6m hard
    InterviewPhase.P6: {"target": 240, "soft": 300, "hard": 360},      # 4m target, 5m soft, 6m hard
    InterviewPhase.P7: {"target": 360, "soft": 420, "hard": 480},      # 6m
    InterviewPhase.P8: {"target": 240, "soft": 300, "hard": 360},      # 4m
    InterviewPhase.P9: {"target": 180, "soft": 240, "hard": 300},      # 3m
    InterviewPhase.P10: {"target": 240, "soft": 300, "hard": 360},     # 4m
    InterviewPhase.P11: {"target": 180, "soft": 240, "hard": 300},     # 3m
}

PHASE_ORDER = [
    InterviewPhase.P1,
    InterviewPhase.P2,
    InterviewPhase.P3,
    InterviewPhase.P4,
    InterviewPhase.P5,
    InterviewPhase.P6,
    InterviewPhase.P7,
    InterviewPhase.P8,
    InterviewPhase.P9,
    InterviewPhase.P10,
    InterviewPhase.P11,
]


def sanitize_candidate_profile_for_fairness(profile: dict[str, Any]) -> dict[str, Any]:
    """Strip college, university, institute, tier, and company names for fairness compliance."""
    sanitized = dict(profile)
    disallowed_keys = {
        "college", "university", "institute", "school", "tier",
        "company", "employer", "organization", "company_brand"
    }
    for k in list(sanitized.keys()):
        if any(d in k.lower() for d in disallowed_keys):
            sanitized.pop(k, None)
    return sanitized


def init_interview_state(
    role: str = "Software Engineer",
    stack: list[str] | None = None,
    experience_years: float | None = None,
    candidate_profile: dict[str, Any] | None = None,
) -> InterviewState:
    """Initialize interview state with starting prior per the Master Prompt."""
    stack = stack or ["python"]
    # Starting prior: fresher or intern D1-D2; 1-3 years D2; 3-6 years D3; 6+ years D3-D4; unknown D2.
    if experience_years is None:
        exp_desc = "unknown"
        initial_d = 2
    elif experience_years < 1:
        exp_desc = "fresher"
        initial_d = 1
    elif experience_years < 3:
        exp_desc = f"{experience_years} years"
        initial_d = 2
    elif experience_years < 6:
        exp_desc = f"{experience_years} years"
        initial_d = 3
    else:
        exp_desc = f"{experience_years} years"
        initial_d = 4

    topic_levels = {tech.lower(): initial_d for tech in stack}
    if "python_basics" not in topic_levels:
        topic_levels["python_basics"] = initial_d

    p1_specs = PHASE_TIME_SPECS[InterviewPhase.P1]

    return InterviewState(
        role=role,
        stack=stack,
        experience=exp_desc,
        experience_years=experience_years,
        phase=InterviewPhase.P1,
        time_remaining=3600,
        phase_time_used=0,
        phase_target=p1_specs["target"],
        phase_soft_cap=p1_specs["soft"],
        phase_hard_cap=p1_specs["hard"],
        topic_levels=topic_levels,
        strong_streak=0,
        weak_streak=0,
        calibration_done=False,
    )


def update_state_for_turn(
    state: InterviewState,
    turn_output: InterviewerTurnOutput,
    elapsed_seconds: int = 0,
) -> InterviewState:
    """Update state per the difficulty engine rules and phase discipline in code."""
    state.time_remaining = max(0, state.time_remaining - elapsed_seconds)
    state.phase_time_used += elapsed_seconds

    # Apply updates returned by model
    updates = turn_output.state_updates or {}
    if "topic_levels" in updates and isinstance(updates["topic_levels"], dict):
        state.topic_levels.update(updates["topic_levels"])
    if "claims_verified" in updates and isinstance(updates["claims_verified"], dict):
        state.claims_verified.update(updates["claims_verified"])
    if "ai_usage_maturity" in updates:
        state.ai_usage_maturity = updates["ai_usage_maturity"]
    if "calibration_done" in updates:
        state.calibration_done = bool(updates["calibration_done"])

    # Difficulty engine enforcement in code as backstop
    topic = turn_output.topic or "python_basics"
    current_lvl = state.topic_levels.get(topic, 2)
    rating = turn_output.answer_rating

    if rating == AnswerRating.STRONG:
        state.strong_streak += 1
        state.weak_streak = 0
        if not state.calibration_done:
            # First 3 questions calibration: strong and confident goes up, 2 strong jumps +2
            bonus = 2 if state.strong_streak >= 2 else 1
            current_lvl = min(5, current_lvl + bonus)
        else:
            if state.strong_streak >= 2:
                current_lvl = min(5, current_lvl + 1)
                state.strong_streak = 0
    elif rating == AnswerRating.WEAK:
        state.weak_streak += 1
        state.strong_streak = 0
        # Weak answer drops ONE level on that topic only
        current_lvl = max(1, current_lvl - 1)
    elif rating == AnswerRating.PARTIAL:
        state.strong_streak = 0
        state.weak_streak = 0

    state.topic_levels[topic] = current_lvl

    # Coding / Hints tracking
    if turn_output.coding_action == CodingAction.GUIDE_HINT:
        state.hint_level_given = min(3, state.hint_level_given + 1)
    elif turn_output.coding_action in (CodingAction.WRAP_UP, CodingAction.COMPLETE_REVIEW, CodingAction.SKIP_AND_MOVE_ON):
        state.hint_level_given = 0
        state.followups_used = 0
        state.idle_prompts_used = 0

    if turn_output.phase == InterviewPhase.P5 and turn_output.next_action == NextAction.SWITCH_PHASE:
        state.debug_done = True
    if turn_output.phase == InterviewPhase.P6 and turn_output.next_action == NextAction.SWITCH_PHASE:
        state.optimise_done = True

    # Phase advancement & Time Rules
    # 1. 3 minutes or less left: straight to P11
    if state.time_remaining <= 180 and state.phase != InterviewPhase.P11:
        state.phase = InterviewPhase.P11
        state.phase_time_used = 0
    # 2. 8 minutes or less left: skip unfinished middle phases and jump to P10
    elif state.time_remaining <= 480 and state.phase in [
        InterviewPhase.P2, InterviewPhase.P3, InterviewPhase.P7, InterviewPhase.P8, InterviewPhase.P9
    ]:
        state.phase = InterviewPhase.P10
        state.phase_time_used = 0
    # 3. Model requests switch_phase or hard cap reached
    elif turn_output.next_action == NextAction.SWITCH_PHASE or state.phase_time_used >= state.phase_hard_cap:
        try:
            curr_idx = PHASE_ORDER.index(state.phase)
            if curr_idx < len(PHASE_ORDER) - 1:
                state.phase = PHASE_ORDER[curr_idx + 1]
                state.phase_time_used = 0
        except ValueError:
            state.phase = InterviewPhase.P11

    # Update caps for current phase
    specs = PHASE_TIME_SPECS.get(state.phase, {"target": 180, "soft": 240, "hard": 300})
    state.phase_target = specs["target"]
    state.phase_soft_cap = specs["soft"]
    state.phase_hard_cap = specs["hard"]

    return state


async def execute_interviewer_turn(
    session_state: InterviewState,
    events: TurnEvents,
    dialogue_history: list[dict[str, str]] | None = None,
    elapsed_seconds: int = 15,
) -> tuple[InterviewerTurnOutput, InterviewState]:
    """Run one turn of Alex (The Master AI Mock Interviewer)."""
    import json
    dialogue_history = dialogue_history or []

    # App-level time signal generation
    if session_state.phase_time_used + elapsed_seconds >= session_state.phase_hard_cap:
        events.time_signal = "hard_cap"
    elif session_state.phase_time_used + elapsed_seconds >= session_state.phase_soft_cap:
        events.time_signal = "soft_cap"
    elif session_state.phase_time_used + elapsed_seconds >= session_state.phase_target:
        events.time_signal = "target_reached"

    # Format dialogue turns
    recent_dialogue_text = "\n\n".join(
        f"{turn.get('speaker', 'Candidate')}: {turn.get('text', '')}"
        for turn in dialogue_history[-4:]
    ) or "No prior turns in this session."

    state_dict = session_state.model_dump()
    events_dict = events.model_dump(exclude_none=True)

    turn_prompt = MASTER_INTERVIEWER_TURN_PROMPT.format(
        interview_state_json=json.dumps(state_dict, indent=2),
        events_json=json.dumps(events_dict, indent=2),
        recent_dialogue=recent_dialogue_text,
    )

    client = get_llm_client()
    response = await client.generate(
        prompt=turn_prompt,
        system_prompt=MASTER_INTERVIEWER_SYSTEM_PROMPT,
        temperature=0.3,
        max_tokens=800,
    )

    raw_output = parse_json_response(response)
    if not isinstance(raw_output, dict):
        raw_output = {
            "intent": "answer",
            "intent_confidence": 0.8,
            "say": "Understood. Let's move forward.",
            "next_action": "next_question",
            "coding_action": "none",
            "phase": session_state.phase.value,
            "topic": list(session_state.topic_levels.keys())[0] if session_state.topic_levels else "general",
            "difficulty_level": 2,
            "answer_rating": "partial",
            "evaluation_note": "Fallback parsing applied",
            "state_updates": {},
        }

    turn_output = InterviewerTurnOutput(**raw_output)

    # Precedence Rule 1: Never end without confirmation
    if turn_output.intent == CandidateIntent.END_ASSESSMENT:
        if turn_output.intent_confidence >= 0.7 and turn_output.next_action != NextAction.CONFIRM_END:
            turn_output.say = "Do you want to end the interview now? Your report will be generated."
            turn_output.next_action = NextAction.CONFIRM_END

    # Update state
    updated_state = update_state_for_turn(session_state, turn_output, elapsed_seconds=elapsed_seconds)

    return turn_output, updated_state
