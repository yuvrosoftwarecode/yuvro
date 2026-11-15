"""Mock interview engine — Master Interviewer (Alex) only.

Every interview question is produced by Alex (MASTER_INTERVIEWER_* prompts),
one turn at a time, via ``execute_interviewer_turn``. ``get_next_question`` is
the adapter the views call: it keeps Alex's state inside the submission's
``state_data`` and converts each Alex turn into the question dict shape the
views, evaluator and report already use.

There are no phases and no timers here: the app owns the clock and ends the
session. Alex follows an ordered list of areas defined in the prompt.
"""

import asyncio
from difflib import SequenceMatcher
import json
import logging
import re
import time
from typing import Any

from pydantic import ValidationError

from mockinterviews.ai_interview.config import settings
from mockinterviews.ai_interview.json_parser import parse_json_response
from mockinterviews.ai_interview.llm_client import get_llm_client
from mockinterviews.ai_interview.prompts import (
    MASTER_INTERVIEWER_SYSTEM_PROMPT,
    MASTER_INTERVIEWER_TURN_PROMPT,
)
from mockinterviews.ai_interview.schemas.master_interviewer import (
    AnswerRating,
    CandidateIntent,
    CodeRunResult,
    CodingAction,
    InterviewerTurnOutput,
    InterviewState,
    NextAction,
    TurnEvents,
)

logger = logging.getLogger(__name__)

SELF_INTRO_TOPIC = "Self introduction"

# Keys used inside session["state_data"] for Alex.
MASTER_STATE_KEY = "master_state"
MASTER_LAST_TURN_KEY = "master_last_turn"
CODING_EVENT_LOG_KEY = "coding_event_log"  # {question_id: [{speaker, text, event}]}

MAX_OUTPUT_TOKENS_MASTER = 600       # Alex's JSON is ~200-400 tokens; a lower cap keeps turns fast
ALEX_ATTEMPT_TIMEOUT_SECONDS = 15    # one Alex call
ALEX_TURN_BUDGET_SECONDS = 22        # all attempts together, then fall back to a template question
MAX_INTRO_QUESTIONS = 2              # experience split + "built anything with the role's skill?"
BACKGROUND_TYPES = {"engineering", "technical", "non_technical", "none", "unknown"}
MAX_CODING_HINTS = 3                 # hints per coding question (idle check-ins + asked-for hints)
CODING_EVENT_TIMEOUT_SECONDS = 12    # one Alex reaction to an idle/run event
INTRO_TOPICS = {"intro", SELF_INTRO_TOPIC.lower()}
RECENT_DIALOGUE_TURNS = 6


_CODE_FENCE_RE = re.compile(r"```.*?(?:```|$)", re.DOTALL)
_CODE_LINE_RE = re.compile(
    r"^\s*(def |class |import |from \S+ import|return\b|for .*:|while .*:|if .*:|elif |else:|try:|except|"
    r"function\b|const |let |var |public |private |#include|SELECT\b|INSERT\b|UPDATE\b|DELETE\b|"
    r"[{}()\[\];]+\s*$|.*[;{}]\s*$|.*\s=\s.*|print\(|console\.)",
    re.IGNORECASE,
)


def extract_spoken_text(text: str) -> str:
    """Return only the natural-language part of a message, dropping code.

    Coding-time answers can mix editor code with speech ("...  end the
    interview"). Code must never be read as an intent, and speech must never
    be lost inside code.
    """
    if not text:
        return ""
    without_fences = _CODE_FENCE_RE.sub(" ", text)
    lines = [line for line in without_fences.splitlines() if line.strip() and not _CODE_LINE_RE.match(line)]
    return "\n".join(lines).strip()


def split_code_and_speech(text: str) -> tuple[str, str]:
    """Split a coding-time answer into (code, speech)."""
    if not text:
        return "", ""
    code_parts = [block.strip("`").strip() for block in re.findall(r"```.*?(?:```|$)", text, re.DOTALL)]
    code_parts = [re.sub(r"^[a-zA-Z0-9_+-]*\n", "", part, count=1) for part in code_parts if part]
    without_fences = _CODE_FENCE_RE.sub(" ", text)
    code_lines = [line for line in without_fences.splitlines() if line.strip() and _CODE_LINE_RE.match(line)]
    if code_lines:
        code_parts.append("\n".join(code_lines))
    return "\n".join(code_parts).strip(), extract_spoken_text(text)


def _normalize_intent_text(text: str) -> str:
    """Lowercase, drop apostrophes ("don't" -> "dont"), keep letters/digits/slash."""
    clean = text.lower().replace("'", "").replace("’", "").replace('"', "")
    clean = re.sub(r"[^a-z0-9\s/]", " ", clean)
    return re.sub(r"\s+", " ", clean).strip()


# Phrases are written already normalised (no apostrophes).
_QUESTION_SKIP_PHRASES = [
    "skip this question", "skip the question", "stop this question", "skip question",
    "next question", "move to next question", "dont know this question", "pass this question",
    "skip to next", "skip this one", "next one",
]
_END_PHRASES_HIGH = [
    "stop the test", "stop the interview", "stop test", "stop interview",
    "close the test", "close the interview", "close test", "close interview",
    "close /test", "/test close", "end the interview", "end this interview",
    "end the test", "end this test", "end interview", "end test", "end the session",
    "i want to end", "i want to quit", "quit the interview", "quit interview", "quit test",
    "lets wrap up", "wrap up the interview", "wrap up test", "enough for today",
    "done with the interview", "exit the interview", "exit test", "exit interview",
    "can we end here", "can we stop here", "can we wrap up here", "can we finish here",
    "i dont want to continue", "i do not want to continue", "leave the interview",
    "finish the interview", "terminate the interview", "thats all for today", "thats it for today",
]
# Clear "I'm leaving" phrases, matched anywhere.
_END_PHRASES_MEDIUM = [
    "i have to go", "i need to go", "i have to leave", "i need to leave", "i want to leave",
    "gotta go", "no more questions", "lets end here", "lets stop here", "lets finish here",
    "lets wrap it up", "done for today", "done for the day",
]
# Phrases that also describe code ("I want to stop the loop"), so they only count
# when they END the utterance, optionally followed by here/now/please/today.
_END_PHRASES_TAIL = [
    "i want to end", "i want to stop", "i want to finish", "i would like to stop", "id like to stop",
    "i would like to end", "id like to end", "lets end", "lets stop", "lets finish",
    "can we end", "can we stop", "can we finish", "please end", "please stop",
    # Common speech-to-text mishearings of "end the test / interview".
    # ("and the test" / "in the test" are left out: they also end normal coding sentences.)
    "entering the test", "entering the interview", "and the interview", "and this interview",
    "ending the test", "ending the interview", "end of the test", "end of the interview",
]
_END_TAIL_SUFFIX = r"(?:\s+(?:it|here|now|please|today|for today|for now|the call))*$"
# "Done" means "finished my code" while coding, so these only count outside coding.
_DONE_EXACT = {"im done", "i am done", "we are done", "i am done for today", "im done for today"}
_END_ACTION_WORDS = {"end", "stop", "quit", "close", "terminate", "finish", "wrap", "exit"}
_END_TARGET_WORDS = {"interview", "test", "session", "assessment"}
# "I don't want to end", "not stopping", "never quit" -> NOT an end request.
_NEGATED_END_RE = re.compile(
    r"\b(dont|do not|not|never|wont|no need to)\b(?:\s+\w+){0,3}?\s+"
    r"(end|ending|stop|stopping|quit|close|finish|exit|leave|wrap|terminate)\b"
)


def detect_end_interview_intent(user_text: str, during_coding: bool = False) -> tuple[bool, float]:
    """Detect if the candidate wants to end the whole interview.

    - Code in the message is ignored (see extract_spoken_text).
    - Question-level skips ("skip this question", "next question") are not ends.
    - Negated requests ("I don't want to end") are not ends.
    - during_coding: "I'm done" means the code is finished, not the interview.
    - Callers ask for confirmation at confidence >= 0.7, so a false positive
      only costs one "Do you want to end?" question.

    Returns:
        (is_end_intent, confidence)
    """
    if not user_text:
        return False, 0.0

    clean = _normalize_intent_text(extract_spoken_text(user_text))
    if not clean:
        return False, 0.0

    if any(phrase in clean for phrase in _QUESTION_SKIP_PHRASES):
        return False, 0.0
    if _NEGATED_END_RE.search(clean):
        return False, 0.0

    if any(phrase in clean for phrase in _END_PHRASES_HIGH):
        return True, 0.95

    words = clean.split()
    words_set = set(words)
    if words_set & _END_ACTION_WORDS and words_set & _END_TARGET_WORDS and "question" not in words_set:
        return True, 0.95

    if any(re.search(rf"\b{re.escape(phrase)}\b", clean) for phrase in _END_PHRASES_MEDIUM):
        return True, 0.85
    if any(re.search(rf"\b{re.escape(phrase)}{_END_TAIL_SUFFIX}", clean) for phrase in _END_PHRASES_TAIL):
        return True, 0.85
    if not during_coding and clean in _DONE_EXACT:
        return True, 0.85

    short_exact = {"quit", "exit", "end it", "stop it", "terminate", "close", "end", "stop", "finish", "bye", "goodbye"}
    if clean in short_exact:
        return True, 0.9
    if len(words) <= 4 and words_set & {"quit", "exit", "end", "terminate", "bye", "goodbye"} and "question" not in words_set:
        return True, 0.85

    return False, 0.0


WAIT_REQUEST_SECONDS = 60
_WAIT_PHRASES = [
    "give me a minute", "give me a moment", "give me a second", "give me a sec", "give me some time",
    "give me few minutes", "give me a few minutes", "give me two minutes", "give me 2 minutes",
    "one minute", "one moment", "1 minute", "just a minute", "just a moment", "just a second",
    "hold on", "wait a minute", "wait a moment", "wait a second", "wait for a minute", "wait for some time",
    "please wait", "can you wait", "could you wait", "be right back", "brb", "ill be back", "i will be back",
    "need a minute", "need a moment", "need a break", "take a break", "few minutes", "charging",
    "someone is at the door", "attend a call", "take a call",
]


def detect_wait_request(user_text: str) -> bool:
    """True when the candidate asks the interviewer to wait (charging, a call, a minute...)."""
    if not user_text:
        return False
    clean = _normalize_intent_text(extract_spoken_text(user_text))
    if not clean or len(clean.split()) > 18:
        return False  # long messages are answers that may just contain "wait"
    return any(re.search(rf"\b{re.escape(phrase)}\b", clean) for phrase in _WAIT_PHRASES)


def check_end_confirmation_response(user_text: str) -> str:
    """Evaluate the reply to 'Do you want to end this interview?'.

    Negatives are checked first, so "I don't want to end" is a no.

    Returns:
        'yes' -> Confirmed, end the interview.
        'no'  -> Declined, continue the interview.
        'unclear' -> Needs another check.
    """
    if not user_text:
        return "unclear"

    clean = _normalize_intent_text(user_text)
    words = set(clean.split())

    no_phrases = [
        "dont end", "do not end", "dont want to end", "not now", "not yet", "keep going",
        "lets continue", "let us continue", "carry on", "go on", "never mind", "no thanks",
        "i want to continue", "continue the interview", "dont stop", "do not stop",
    ]
    no_tokens = {"no", "nope", "nah", "continue", "resume", "stay", "nevermind", "wait", "dont", "not"}
    if any(phrase in clean for phrase in no_phrases) or words & no_tokens:
        return "no"

    yes_phrases = ["go ahead", "do it", "end it", "yes please", "i want to end", "please end", "sure thing"]
    yes_tokens = {
        "yes", "yeah", "yep", "yup", "ya", "yea", "sure", "ok", "okay", "confirm", "confirmed",
        "end", "quit", "stop", "finish", "definitely", "absolutely", "please", "haan", "correct", "right",
    }
    if any(phrase in clean for phrase in yes_phrases) or words & yes_tokens:
        return "yes"

    return "unclear"


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
        # Gaps are often full sentences ("Lacks Kubernetes experience"); only short
        # skill-like gaps make sense as topics.
        if isinstance(gap, str) and len(gap.split()) <= 4 and gap not in topics:
            topics.append(gap)

    return [t for t in topics if t]


def _coerce_score(value: object, default: float = 5.0) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return default
    return max(1.0, min(10.0, score))


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
            # Fallback templates share most of their words, so the fuzzy duplicate check
            # would reject the same template for a different topic. Compare exact text here.
            if not _is_exact_repeat(text, existing_questions):
                return candidate

    generic_questions = [
        ("Can you walk through a recent technical challenge and how you approached it?",
         ["Problem context", "Approach", "Outcome"]),
        ("Tell me about a bug that took you a long time to find. How did you track it down?",
         ["Symptoms", "Debugging steps", "Root cause and fix"]),
        ("What is something technical you learned recently, and how did you learn it?",
         ["Topic", "Learning approach", "How they applied it"]),
        ("How do you make sure the code you write is correct before you share it?",
         ["Testing", "Self-review", "Edge cases"]),
    ]
    for text, points in generic_questions:
        if not _is_exact_repeat(text, existing_questions):
            break
    return {
        "id": question_id,
        "question": text,
        "topic": "General",
        "difficulty": difficulty,
        "question_type": "technical",
        "expected_points": points,
        "reasoning": "Fallback question selected after all topic-specific options repeated.",
    }


def _is_exact_repeat(text: str, existing_questions: list[dict]) -> bool:
    target = _normalize_question_text(text)
    return any(
        isinstance(q, dict) and _normalize_question_text(q.get("question", "")) == target
        for q in existing_questions
    )


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


# ───────────────────────────────────────────────────────────
# Master Interviewer (Alex): state and turn execution
# ───────────────────────────────────────────────────────────

QUESTION_TYPES = {"technical", "behavioral", "coding", "system_design"}


def starting_prior(experience_years: float | None) -> tuple[str, int]:
    """Starting prior: fresher or intern D1-D2; 1-3 years D2; 3-6 years D3; 6+ years D3-D4; unknown D2."""
    if experience_years is None:
        return "unknown", 2
    if experience_years < 1:
        return "fresher", 1
    if experience_years < 3:
        return f"{experience_years:g} years", 2
    if experience_years < 6:
        return f"{experience_years:g} years", 3
    return f"{experience_years:g} years", 4


def skill_starting_level(skill_years: float | None, background_type: str = "unknown") -> int:
    """Starting level for the ROLE'S skill topics.

    From years with the role's skill: 0 -> D1, under 1 -> D1, 1-3 -> D2, 3-6 -> D3, 6+ -> D4, unknown -> D2.
    An engineering background starts one level higher (max D5) once the skill years are known.
    """
    if skill_years is None:
        return 2
    if skill_years < 1:
        level = 1
    elif skill_years < 3:
        level = 2
    elif skill_years < 6:
        level = 3
    else:
        level = 4
    if background_type == "engineering":
        level += 1
    return min(5, level)


def _reseed_topic_levels(state: InterviewState) -> None:
    """Set every role topic to the starting level (only before calibration is done)."""
    if state.calibration_done:
        return
    level = skill_starting_level(state.skill_experience_years, state.background_type)
    state.topic_levels = {topic: level for topic in state.topic_levels} or {s.lower(): level for s in state.stack}


def _skill_label(role: str) -> str:
    """'MongoDB Development' -> 'MongoDB'; 'AI Engineering' stays."""
    label = re.sub(r"\s+(development|developer|interview|mock interview|role)$", "", (role or "").strip(), flags=re.IGNORECASE)
    return label or "this role"


def init_interview_state(
    role: str = "Software Engineer",
    stack: list[str] | None = None,
    experience_years: float | None = None,
    candidate_profile: dict[str, Any] | None = None,
) -> InterviewState:
    """Initialize interview state with the starting prior from the master prompt."""
    stack = [s for s in (stack or []) if s] or ["fundamentals"]
    exp_desc, _ = starting_prior(experience_years)
    # Total years don't set the level; only years with the role's skill do. A fresher (0 years total)
    # has 0 years with the skill, so they start at D1; otherwise the skill years are asked in the intro.
    skill_years = 0.0 if experience_years == 0 else None
    background = "none" if experience_years == 0 else "unknown"
    initial_d = skill_starting_level(skill_years, background)

    topic_levels = {tech.lower(): initial_d for tech in stack}

    return InterviewState(
        role=role,
        stack=stack,
        experience=exp_desc,
        experience_years=experience_years,
        skill_experience_years=skill_years,
        background_type=background,
        topic_levels=topic_levels,
        strong_streak=0,
        weak_streak=0,
        calibration_done=False,
    )


def _states_name(message: str | None, name: str) -> bool:
    """True when the candidate explicitly gives this name ("my name is X", "call me X", "I'm X")."""
    if not message or not name:
        return False
    first = re.escape(name.split()[0])
    return bool(re.search(
        rf"\b(my name is|my name's|name is|call me|i am|i'm|im|this is|myself|it's|its)\s+{first}\b",
        message, re.IGNORECASE,
    ))


def _apply_intro_updates(
    state: InterviewState,
    turn_output: InterviewerTurnOutput,
    updates: dict,
    candidate_message: str | None = None,
) -> None:
    """Experience, role and projects learned in the intro; re-seed difficulty from experience."""
    if "experience_years" in updates and updates["experience_years"] is not None:
        try:
            years = max(0.0, float(updates["experience_years"]))
        except (TypeError, ValueError):
            years = None
        if years is not None and years != state.experience_years:
            state.experience_years = years
            desc, _ = starting_prior(years)
            state.experience = str(updates.get("experience") or desc)
            if years == 0 and state.skill_experience_years is None:
                state.skill_experience_years = 0.0  # no work experience -> none with the role's skill either
    elif updates.get("experience"):
        state.experience = str(updates["experience"])
    level_inputs = (state.skill_experience_years, state.background_type)
    if updates.get("skill_experience_years") is not None:
        try:
            state.skill_experience_years = max(0.0, float(updates["skill_experience_years"]))
        except (TypeError, ValueError):
            pass
    background = str(updates.get("background_type") or "").strip().lower()
    if background in BACKGROUND_TYPES:
        state.background_type = background
    if isinstance(updates.get("has_role_projects"), bool):
        state.has_role_projects = updates["has_role_projects"]
    if (state.skill_experience_years, state.background_type) != level_inputs:
        _reseed_topic_levels(state)  # level comes from skill years (+1 for an engineering background)
    spoken_name = str(updates.get("candidate_name") or "").strip()
    if spoken_name and len(spoken_name) <= 40 and spoken_name.lower() not in {"none", "null", "unknown", "there"}:
        # Once a name is known it is locked: it only changes when the candidate explicitly states a new
        # name in this message. A project/component word misheard as a name ("MegaNav" -> "Meghana")
        # must never replace it.
        if not state.candidate_name or _states_name(candidate_message, spoken_name):
            state.candidate_name = spoken_name.title()
        elif spoken_name.lower() != state.candidate_name.lower():
            logger.info("Ignored name change %r -> %r (not explicitly stated)", state.candidate_name, spoken_name)
            # Don't let this turn's reply address them by the wrong name either.
            turn_output.say = re.sub(
                rf"\b{re.escape(spoken_name)}\b", state.candidate_name, turn_output.say or "", flags=re.IGNORECASE
            )
    if updates.get("current_role"):
        state.current_role = str(updates["current_role"])[:200]
    if isinstance(updates.get("projects"), list):
        for project in updates["projects"]:
            if project and str(project) not in state.projects:
                state.projects.append(str(project)[:100])
    if "intro_complete" in updates:
        state.intro_complete = bool(updates["intro_complete"])

    topic = (turn_output.topic or "").strip().lower()
    if not state.intro_complete and topic in INTRO_TOPICS:
        state.intro_questions_asked += 1
    if state.intro_questions_asked >= MAX_INTRO_QUESTIONS:
        state.intro_complete = True
    if turn_output.next_action != NextAction.CONFIRM_END and topic and topic not in INTRO_TOPICS:
        # Alex has moved on to real questions.
        state.intro_complete = True


def update_state_for_turn(
    state: InterviewState,
    turn_output: InterviewerTurnOutput,
    rated_topic: str | None = None,
    candidate_message: str | None = None,
) -> InterviewState:
    """Update state per the difficulty engine rules (no phases, no timers).

    rated_topic: topic of the question the candidate just answered; the rating
    applies to that topic, not to the new question's topic.
    """
    # Apply updates returned by model
    updates = turn_output.state_updates or {}
    _apply_intro_updates(state, turn_output, updates, candidate_message)
    if isinstance(updates.get("topic_levels"), dict):
        for key, value in updates["topic_levels"].items():
            try:
                state.topic_levels[str(key)] = max(1, min(5, int(value)))
            except (TypeError, ValueError):
                continue
    if isinstance(updates.get("claims_verified"), dict):
        state.claims_verified.update({str(k): str(v) for k, v in updates["claims_verified"].items()})
    if isinstance(updates.get("claims_to_verify"), list):
        for claim in updates["claims_to_verify"]:
            if claim and str(claim) not in state.claims_to_verify:
                state.claims_to_verify.append(str(claim))
    if updates.get("ai_usage_maturity") in {"unknown", "low", "medium", "high"}:
        state.ai_usage_maturity = updates["ai_usage_maturity"]
    for flag in ("calibration_done", "debug_done", "optimise_done"):
        if flag in updates:
            setattr(state, flag, bool(updates[flag]))

    # Difficulty engine enforcement in code as backstop (never for intro answers)
    topic = (rated_topic or turn_output.topic or (state.stack[0].lower() if state.stack else "fundamentals")).strip()
    rating = turn_output.answer_rating
    if topic.lower() in INTRO_TOPICS:
        rating = AnswerRating.NA
    current_lvl = state.topic_levels.get(topic, turn_output.difficulty_level or 2)

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

    if rating != AnswerRating.NA:
        state.topic_levels[topic] = current_lvl

    # Coding / Hints tracking (max MAX_CODING_HINTS per coding question)
    if turn_output.next_action == NextAction.NEXT_QUESTION:
        # A new question starts: fresh hint and idle budget.
        state.hint_level_given = 0
        state.idle_prompts_used = 0
    elif turn_output.coding_action == CodingAction.GUIDE_HINT or turn_output.next_action == NextAction.GIVE_HINT:
        state.hint_level_given = min(MAX_CODING_HINTS, state.hint_level_given + 1)
    elif turn_output.coding_action in (CodingAction.COMPLETE_REVIEW, CodingAction.SKIP_AND_MOVE_ON):
        state.hint_level_given = 0
        state.followups_used = 0
        state.idle_prompts_used = 0
    if turn_output.next_action == NextAction.ASK_FOLLOWUP:
        state.followups_used += 1
    elif turn_output.next_action == NextAction.NEXT_QUESTION:
        state.followups_used = 0

    return state


def _enum_value(enum_cls, value: Any, default):
    try:
        return enum_cls(value)
    except (TypeError, ValueError):
        return default


def _sanitize_turn_output(raw: Any, state: InterviewState) -> dict[str, Any]:
    """Coerce raw model JSON into valid InterviewerTurnOutput fields."""
    raw = raw if isinstance(raw, dict) else {}

    try:
        confidence = float(raw.get("intent_confidence", 0.8))
    except (TypeError, ValueError):
        confidence = 0.8
    try:
        level = int(raw.get("difficulty_level", 2))
    except (TypeError, ValueError):
        level = 2

    expected_points = raw.get("expected_points", [])
    if isinstance(expected_points, str):
        expected_points = [expected_points]
    elif not isinstance(expected_points, list):
        expected_points = []

    question_type = str(raw.get("question_type") or "technical").strip().lower()
    if question_type not in QUESTION_TYPES:
        question_type = "technical"

    sample_tests = []
    for test in raw.get("sample_tests") or []:
        if not isinstance(test, dict) or "input" not in test or "expected_output" not in test:
            continue
        as_text = lambda v: v if isinstance(v, str) else json.dumps(v)  # noqa: E731
        sample_tests.append({"input": as_text(test["input"]), "expected_output": as_text(test["expected_output"])})
        if len(sample_tests) >= 3:
            break

    default_topic = state.stack[0].lower() if state.stack else "fundamentals"
    return {
        "intent": _enum_value(CandidateIntent, raw.get("intent"), CandidateIntent.ANSWER),
        "intent_confidence": max(0.0, min(1.0, confidence)),
        "say": str(raw.get("say") or "").strip(),
        "next_action": _enum_value(NextAction, raw.get("next_action"), NextAction.NEXT_QUESTION),
        "coding_action": _enum_value(CodingAction, raw.get("coding_action"), CodingAction.NONE),
        "topic": str(raw.get("topic") or default_topic).strip(),
        "difficulty_level": max(1, min(5, level)),
        "question_type": question_type,
        "expected_points": [str(p).strip() for p in expected_points if str(p).strip()],
        "sample_tests": sample_tests if question_type == "coding" else [],
        "answer_rating": _enum_value(AnswerRating, raw.get("answer_rating"), AnswerRating.NA),
        "evaluation_note": str(raw.get("evaluation_note") or ""),
        "state_updates": raw.get("state_updates") if isinstance(raw.get("state_updates"), dict) else {},
    }


_SAY_RE = re.compile(r'"say"\s*:\s*"((?:[^"\\]|\\.)*)"', re.S)
_INTENT_RE = re.compile(r'"intent"\s*:\s*"([a-z_]*)"')


class SayWatcher:
    """TEST mock interview only: watches Alex's streamed JSON and hands over his spoken line ("say") the
    moment it is complete, so his voice can start while the rest of the reply is still being written.

    Released only when safe: the intent (written before "say") is known and is not an end request
    (those get a fixed confirmation line), and the line is not a repeat of an earlier question
    (repeats are retried). Otherwise nothing is released and the turn works exactly as before.
    """

    def __init__(self, publish, existing_questions: list[dict]):
        self._publish = publish
        self._existing = existing_questions
        self._checked = False
        self.released: str | None = None

    def new_attempt(self) -> None:
        if self.released is None:
            self._checked = False

    def feed(self, text_so_far: str) -> None:
        if self._checked or self.released is not None:
            return
        match = _SAY_RE.search(text_so_far)
        if not match:
            return
        self._checked = True
        intent_match = _INTENT_RE.search(text_so_far[: match.start()])
        if not intent_match or intent_match.group(1) == CandidateIntent.END_ASSESSMENT.value:
            return
        try:
            say = str(json.loads('"' + match.group(1) + '"')).strip()
        except ValueError:
            return
        if not say or _is_duplicate_question({"question": say}, self._existing):
            return
        try:
            self._publish(say)
        except Exception:  # noqa: BLE001 - delivery problem must not break the turn
            logger.exception("Early line delivery failed")
            return
        self.released = say


def _question_from_released_say(say: str, question_id: int, last_question: dict) -> dict:
    """Alex's line was already spoken but the rest of his reply failed: keep what the learner heard."""
    return {
        "id": question_id,
        "question": say,
        "topic": last_question.get("topic") or "General",
        "difficulty": last_question.get("difficulty") or "medium",
        "question_type": "technical",
        "expected_points": [],
        "sample_tests": [],
        "reasoning": None,
        "next_action": NextAction.NEXT_QUESTION.value,
    }


async def execute_interviewer_turn(
    session_state: InterviewState,
    events: TurnEvents,
    dialogue_history: list[dict[str, str]] | None = None,
    candidate_profile: str = "",
    evaluator_context: str = "",
    previous_questions: list[str] | None = None,
    rated_topic: str | None = None,
    allow_rating: bool = True,
    say_watcher: "SayWatcher | None" = None,
) -> tuple[InterviewerTurnOutput, InterviewState]:
    """Run one turn of Alex (the Master AI Mock Interviewer).

    Raises if the LLM call itself fails; a malformed reply is sanitized
    rather than raising.
    """
    dialogue_history = dialogue_history or []

    recent_dialogue_text = "\n\n".join(
        f"{turn.get('speaker', 'Candidate')}: {turn.get('text', '')}"
        for turn in dialogue_history[-RECENT_DIALOGUE_TURNS:]
    ) or "No prior turns in this session."

    turn_prompt = MASTER_INTERVIEWER_TURN_PROMPT.format(
        candidate_profile=candidate_profile or "Not provided.",
        interview_state_json=json.dumps(session_state.model_dump(mode="json"), indent=2),
        events_json=json.dumps(events.model_dump(mode="json", exclude_none=True), indent=2),
        evaluator_context=evaluator_context or "None.",
        previous_questions=_format_previous_questions(previous_questions or []),
        recent_dialogue=recent_dialogue_text,
    )

    client = get_llm_client()
    started = time.monotonic()
    if say_watcher is not None and hasattr(client, "generate_stream"):
        # TEST mock interview: identical request, read as it streams (see SayWatcher).
        response = await client.generate_stream(
            prompt=turn_prompt,
            system_prompt=MASTER_INTERVIEWER_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=MAX_OUTPUT_TOKENS_MASTER,
            on_text=say_watcher.feed,
        )
    else:
        response = await client.generate(
            prompt=turn_prompt,
            system_prompt=MASTER_INTERVIEWER_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=MAX_OUTPUT_TOKENS_MASTER,
        )
    logger.info("Alex LLM call took %.1fs (%d chars)", time.monotonic() - started, len(response or ""))

    try:
        raw_output = parse_json_response(response)
    except ValueError:
        logger.warning("Alex returned non-JSON output; using sanitized defaults")
        raw_output = {}

    try:
        turn_output = InterviewerTurnOutput(**_sanitize_turn_output(raw_output, session_state))
    except ValidationError as exc:
        logger.warning("Alex output failed validation (%s); using defaults", exc)
        turn_output = InterviewerTurnOutput()
    if say_watcher is not None and say_watcher.released and not turn_output.say:
        turn_output.say = say_watcher.released  # already spoken: keep it

    # Precedence Rule 1: never end without confirmation
    if turn_output.intent == CandidateIntent.END_ASSESSMENT or turn_output.next_action == NextAction.END_ASSESSMENT:
        if turn_output.intent_confidence >= 0.7 or turn_output.next_action == NextAction.END_ASSESSMENT:
            turn_output.say = "Do you want to end the interview now? Your report will be generated."
            turn_output.next_action = NextAction.CONFIRM_END
            turn_output.expected_points = []

    if not allow_rating:
        turn_output.answer_rating = AnswerRating.NA
    updated_state = update_state_for_turn(
        session_state, turn_output, rated_topic=rated_topic, candidate_message=events.candidate_message
    )
    return turn_output, updated_state


# ───────────────────────────────────────────────────────────
# Adapter used by views.py: session dict  <->  Alex turns
# ───────────────────────────────────────────────────────────

_EXPERIENCE_LEVEL_YEARS = {
    "fresher": 0.0, "intern": 0.0, "entry": 0.5, "junior": 1.0,
    "mid": 3.0, "senior": 6.0, "lead": 8.0, "principal": 10.0,
}
_DIFFICULTY_YEARS = {"easy": 0.0, "hard": 4.0}


_NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
}
_NUM = r"(\d+(?:\.\d+)?|" + "|".join(sorted(_NUMBER_WORDS, key=len, reverse=True)) + r")"


def _to_number(token: str) -> float:
    return float(token) if token[0].isdigit() else float(_NUMBER_WORDS[token])


def _years_from_text(text: Any) -> float | None:
    """Experience in years from free text, digits or words, as speech-to-text writes it.

    '8 years', 'eight years', '8+ yrs', 'over eight years', 'one and a half years', '6 months',
    'a year' -> number; 'fresher'/'student'/'intern'/'graduate' -> 0.0; else None.
    """
    if not text:
        return None
    lowered = str(text).lower().replace("-", " ")
    match = re.search(rf"\b{_NUM}(\s+and\s+a\s+half)?\s*\+?\s*(?:plus\s+)?(?:years?|yrs?)\b", lowered)
    if match:
        return _to_number(match.group(1)) + (0.5 if match.group(2) else 0.0)
    match = re.search(rf"\b{_NUM}\s*\+?\s*months?\b", lowered)
    if match:
        return round(_to_number(match.group(1)) / 12, 2)
    if re.search(
        r"\b(fresher|student|intern|internship|graduat\w*|studying|pursuing|final year|third year|fourth year|"
        r"in college|no experience|no work experience|haven'?t worked|not worked yet|b\.?tech|m\.?tech|mca|bca)\b",
        lowered,
    ):
        return 0.0
    return None


def _experience_years_from_session(session: dict[str, Any]) -> float | None:
    """Experience the candidate stated in the intro wins; then resume analysis; then level/difficulty."""
    intro_details = session.get("intro_details") or {}
    if isinstance(intro_details, dict):
        stated = _years_from_text(intro_details.get("experience"))
        if stated is not None:
            return stated
    analysis = session.get("analysis") or {}
    years = analysis.get("experience_years")
    try:
        if years is not None:
            return float(years)
    except (TypeError, ValueError):
        pass
    level = str(analysis.get("experience_level") or "").strip().lower()
    if level in _EXPERIENCE_LEVEL_YEARS:
        return _EXPERIENCE_LEVEL_YEARS[level]
    difficulty = str(session.get("difficulty") or "").strip().lower()
    return _DIFFICULTY_YEARS.get(difficulty)


def _clean_name(name: Any) -> str:
    name = str(name or "").strip()
    return "" if name.lower() in {"", "there", "none", "null", "unknown"} else name.title()


def _spoken_name(session: dict[str, Any]) -> str:
    """The name the candidate gave in the interview (Alex's state first, then the intro parser)."""
    master = session.get(MASTER_STATE_KEY) or {}
    intro_details = session.get("intro_details") or {}
    return _clean_name(
        (master.get("candidate_name") if isinstance(master, dict) else "")
        or (intro_details.get("name") if isinstance(intro_details, dict) else "")
    )


def _candidate_name(session: dict[str, Any]) -> str:
    """Spoken name wins; the account/resume name is only a fallback (someone else may be logged in)."""
    return _spoken_name(session) or _clean_name((session.get("analysis") or {}).get("candidate_name"))


def _build_candidate_profile(session: dict[str, Any]) -> str:
    analysis = sanitize_candidate_profile_for_fairness(session.get("analysis") or {})
    skills = [s.get("skill", "") for s in analysis.get("skills", []) if isinstance(s, dict)]
    account_name = _clean_name(analysis.get("candidate_name"))
    lines = [
        f"Name the candidate gave in this interview: {_spoken_name(session) or 'not given yet'}",
        f"Account/resume name: {account_name or 'unknown'} (the logged-in account; the person speaking may be "
        "someone else, so the name they give in the interview always wins)",
        f"Level: {analysis.get('experience_level') or 'unknown'}",
        f"Role / domain: {analysis.get('domain') or 'Software Development'}",
        f"Skills: {', '.join(s for s in skills[:15] if s) or 'Not given'}",
        f"Strengths: {', '.join(map(str, analysis.get('strengths', []) or [])) or 'Not given'}",
        f"Known gaps: {', '.join(map(str, analysis.get('gaps', []) or [])) or 'None identified'}",
    ]
    return "\n".join(lines)


def _load_master_state(session: dict[str, Any]) -> InterviewState:
    stored = session.get(MASTER_STATE_KEY)
    if isinstance(stored, dict):
        try:
            return InterviewState(**stored)
        except ValidationError as exc:
            logger.warning("Stored Alex state invalid (%s); re-initialising", exc)

    analysis = session.get("analysis") or {}
    role = (
        (analysis.get("_jd_requirements") or {}).get("title")
        or analysis.get("domain")
        or "Software Engineer"
    )
    stack = [s for s in _get_all_topics({"skills": analysis.get("skills", [])})[:6]]
    return init_interview_state(
        role=str(role),
        stack=stack or [str(analysis.get("domain") or "fundamentals")],
        experience_years=_experience_years_from_session(session),
    )


def _answer_for(question: dict, answers: dict[str, Any]) -> dict:
    answer = answers.get(str(question.get("id")))
    if isinstance(answer, dict):
        return answer
    if isinstance(answer, str):
        return {"answer": answer}
    return {}


def _build_dialogue_turns(
    questions: list[dict],
    answers: dict[str, Any],
    event_log: dict[str, list] | None = None,
) -> list[dict[str, str]]:
    turns: list[dict[str, str]] = []
    event_log = event_log or {}
    for question in questions:
        if not isinstance(question, dict):
            continue
        text = (question.get("question") or "").strip()
        if text:
            turns.append({"speaker": "Interviewer (Alex)", "text": text})
        for event in event_log.get(str(question.get("id")), []) or []:
            if isinstance(event, dict) and event.get("text"):
                turns.append({"speaker": event.get("speaker", "Interviewer (Alex)"), "text": event["text"]})
        answer_text = (_answer_for(question, answers).get("answer") or "").strip()
        if answer_text:
            turns.append({"speaker": "Candidate", "text": answer_text})
    return turns


def _build_evaluator_context(last_answer: dict) -> str:
    if not last_answer:
        return "None."
    parts = []
    if last_answer.get("score") is not None:
        parts.append(f"Score: {_coerce_score(last_answer.get('score')):.0f}/10")
    for label, key in (
        ("Feedback", "feedback"),
        ("Covered points", "covered_points"),
        ("Missed points", "missed_points"),
        ("Suggested follow-up", "follow_up_suggestion"),
    ):
        value = last_answer.get(key)
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value if v)
        if value:
            parts.append(f"{label}: {value}")
    return "\n".join(parts) or "None."


def _difficulty_label(level: int) -> str:
    if level <= 2:
        return "easy"
    if level == 3:
        return "medium"
    return "hard"


def _instant_intro_followup(session: dict[str, Any], state: InterviewState, intro_answer: str) -> dict:
    """First turn after the self-introduction, built without an LLM call so there is no gap.

    Role first: asks the experience split if the intro gave no years, otherwise whether they have
    built anything with the role's skill. Unrelated jobs and projects are never asked about.
    """
    name = _spoken_name(session)
    skill = _skill_label(state.role)
    thanks = f"Nice to meet you, {name}, and thanks for the introduction." if name \
        else "Thanks for the introduction, that's helpful."
    stated_years = _years_from_text(intro_answer)
    if stated_years is None:
        ask = (f"So I can pitch the questions at the right level, how long have you been working, and how much "
               f"of that with {skill}? Or are you currently studying?")
    else:
        state.experience_years = stated_years
        state.experience, _ = starting_prior(stated_years)
        if stated_years == 0:
            state.skill_experience_years = 0.0
            state.background_type = "none"
            _reseed_topic_levels(state)
        ask = f"Have you built anything with {skill} yet, at work, in a course or on your own?"
    state.intro_questions_asked = 1
    if name:
        state.candidate_name = name
    return {
        "question": f"{thanks} {ask}",
        "topic": "intro",
        "difficulty": "easy",
        "question_type": "behavioral",
        "expected_points": [],
        "reasoning": "Instant intro follow-up (no LLM call).",
        "next_action": NextAction.ASK_FOLLOWUP.value,
        "difficulty_level": 1,
    }


def _turn_to_question(turn: InterviewerTurnOutput, question_id: int) -> dict | None:
    text = (turn.say or "").strip()
    if not text:
        return None
    return {
        "id": question_id,
        "question": text,
        "topic": turn.topic or "General",
        "difficulty": _difficulty_label(turn.difficulty_level),
        "question_type": turn.question_type,
        "expected_points": list(turn.expected_points),
        "sample_tests": list(turn.sample_tests),
        "reasoning": turn.evaluation_note or None,
        "next_action": turn.next_action.value,
        "difficulty_level": turn.difficulty_level,
    }


async def get_next_question(
    session: dict[str, Any],
    num_total_questions: int | None = None,
    on_say=None,
) -> dict | None:
    """Return the next interviewer turn as a question dict (Alex only).

    Args:
        session: The full session dict (submission state_data). Alex's state is
            stored back into it under ``master_state``; the caller persists it.
        num_total_questions: Optional hard ceiling on questions (None = keep going
            until the app ends the session).

    Returns:
        Question dict, or None when the interview is complete.
    """
    questions = [q for q in (session.get("interview") or []) if isinstance(q, dict)]
    answers = session.get("answers") or {}

    if not questions:
        logger.info("Starting interview with self-introduction question")
        return build_self_intro_question()

    if num_total_questions and len(questions) >= num_total_questions:
        logger.info("Interview complete: %d/%d questions asked", len(questions), num_total_questions)
        return None

    is_first_turn = not isinstance(session.get(MASTER_STATE_KEY), dict)
    state = _load_master_state(session)
    state.questions_asked = len(questions)
    state.coding_questions_asked = sum(1 for q in questions if q.get("question_type") == "coding")

    last_question = questions[-1]
    last_answer = _answer_for(last_question, answers)
    answer_text = (last_answer.get("answer") or "").strip()
    if last_question.get("question_type") == "coding" and answer_text != "[no response]":
        # Give Alex the candidate's speech separately from the code they wrote.
        code_part, speech_part = split_code_and_speech(answer_text)
        events = TurnEvents(
            candidate_message=speech_part or None,
            code_update={"full_code": code_part} if code_part else None,
        )
    else:
        events = TurnEvents(candidate_message=answer_text or None)
    next_id = len(questions) + 1
    asked = [q.get("question", "") for q in questions if q.get("question")]

    if is_first_turn and len(questions) == 1 and questions[0].get("topic") == SELF_INTRO_TOPIC and answer_text:
        question = _instant_intro_followup(session, state, answer_text)
        question["id"] = next_id
        session[MASTER_STATE_KEY] = state.model_dump(mode="json")
        logger.info("Alex turn %d: instant intro follow-up (no LLM call)", next_id)
        return question

    common_kwargs = {
        "dialogue_history": _build_dialogue_turns(questions, answers, session.get(CODING_EVENT_LOG_KEY)),
        "candidate_profile": _build_candidate_profile(session),
        "evaluator_context": _build_evaluator_context(last_answer),
    }

    question: dict | None = None
    turn: InterviewerTurnOutput | None = None
    new_state = state
    turn_started = time.monotonic()
    # TEST mock interview only (on_say is None everywhere else): early hand-off of Alex's spoken line.
    say_watcher = SayWatcher(on_say, questions) if on_say is not None else None
    for attempt in range(1, settings.MAX_QUESTION_GENERATION_ATTEMPTS + 1):
        if say_watcher is not None:
            say_watcher.new_attempt()
        remaining = ALEX_TURN_BUDGET_SECONDS - (time.monotonic() - turn_started)
        if remaining < 4:
            logger.warning("Alex turn budget used up after %d attempt(s); using fallback", attempt - 1)
            break
        try:
            turn, new_state = await asyncio.wait_for(
                execute_interviewer_turn(
                    state.model_copy(deep=True),
                    events.model_copy(deep=True),
                    previous_questions=asked,
                    rated_topic=last_question.get("topic"),
                    say_watcher=say_watcher,
                    **common_kwargs,
                ),
                timeout=min(ALEX_ATTEMPT_TIMEOUT_SECONDS, remaining),
            )
        except asyncio.TimeoutError:
            logger.warning("Alex turn attempt %d timed out", attempt)
            turn = None
            if say_watcher is not None and say_watcher.released:
                question = _question_from_released_say(say_watcher.released, next_id, last_question)
                break
            continue
        except Exception as exc:  # LLM/network failure
            logger.warning("Alex turn attempt %d failed: %s", attempt, exc)
            turn = None
            if say_watcher is not None and say_watcher.released:
                question = _question_from_released_say(say_watcher.released, next_id, last_question)
                break
            continue

        candidate = _turn_to_question(turn, next_id)
        if candidate is None:
            logger.warning("Alex turn attempt %d returned nothing to say; retrying", attempt)
            continue
        # A requested repeat, end confirmation or follow-up may legitimately echo earlier wording.
        allow_echo = turn.next_action in (NextAction.CONFIRM_END, NextAction.ASK_FOLLOWUP) \
            or turn.intent == CandidateIntent.CLARIFY_REQUEST
        if allow_echo or not _is_duplicate_question(candidate, questions):
            question = candidate
            break
        logger.warning("Alex turn attempt %d repeated an earlier question; retrying", attempt)
        asked.append(candidate["question"])

    if question is None:
        topics = _get_all_topics(session.get("analysis") or {})
        question = _build_fallback_question(
            question_id=next_id,
            topics=topics,
            difficulty=session.get("difficulty", "medium"),
            existing_questions=questions,
        )
        new_state = state

    session[MASTER_STATE_KEY] = new_state.model_dump(mode="json")
    if new_state.candidate_name and isinstance(session.get("intro_details"), dict):
        session["intro_details"]["name"] = new_state.candidate_name
    if turn is not None and question.get("next_action"):
        session[MASTER_LAST_TURN_KEY] = {
            "intent": turn.intent.value,
            "next_action": turn.next_action.value,
            "coding_action": turn.coding_action.value,
            "answer_rating": turn.answer_rating.value,
            "evaluation_note": turn.evaluation_note,
        }
        if turn.next_action == NextAction.CONFIRM_END:
            # views.py handles the yes/no reply to this confirmation.
            session["awaiting_end_confirmation"] = True

    logger.info(
        "Alex turn %d took %.1fs: action=%s type=%s",
        next_id,
        time.monotonic() - turn_started,
        question.get("next_action", "fallback"),
        question.get("question_type"),
    )
    return question


# ───────────────────────────────────────────────────────────
# Live coding coaching: idle / run events (not scored, not stored as questions)
# ───────────────────────────────────────────────────────────

_FALLBACK_HINTS = {
    1: "Take a look at what you have so far. What should happen next?",
    2: "Try breaking it into steps: go through the input one item at a time and build up the result as you go.",
    3: ("Here's the outline: loop over the input, update your result for each item, then return it. "
        "Want to keep going, or shall we move to the next question?"),
}


def _fallback_event_reply(event_type: str, hint_level: int, code: str, run: dict | None) -> str:
    if event_type == "run":
        run = run or {}
        if run.get("error"):
            return "What does that error tell you?"
        if run.get("total") and run.get("passed", 0) < run.get("total", 0):
            return "One of the sample tests doesn't match. What does your code return for that input?"
        return "Looks good. Submit it when you're ready, and then walk me through it."
    if not code.strip():
        return "What are you thinking? Want to talk through your approach first?"
    return _FALLBACK_HINTS.get(hint_level, _FALLBACK_HINTS[3])


async def get_coding_event_reply(session: dict[str, Any], event: dict[str, Any]) -> str:
    """React to a coding-time event from the editor without recording an answer.

    event: {"type": "idle" | "run", "code": str, "language": str, "idle_seconds": int,
            "idle_count": int, "run": {"status", "error", "output", "passed", "total", "failures": [...]}}

    Idle events use the next hint level (max MAX_CODING_HINTS per coding question); once all hints
    are used, idle events get no reply. Returns the text Alex says ("" = stay quiet). The caller
    persists `session`.
    """
    questions = [q for q in (session.get("interview") or []) if isinstance(q, dict)]
    if not questions:
        return ""
    coding_question = questions[-1]
    event_type = "run" if event.get("type") == "run" else "idle"
    code = str(event.get("code") or "")[:6000]
    run = event.get("run") if isinstance(event.get("run"), dict) else None
    last_run = event.get("last_run") if isinstance(event.get("last_run"), dict) else None

    state = _load_master_state(session)
    hints_used = state.hint_level_given
    if event_type == "idle" and hints_used >= MAX_CODING_HINTS:
        logger.info("Coding idle event ignored: all %d hints already used", MAX_CODING_HINTS)
        return ""
    next_hint = min(MAX_CODING_HINTS, hints_used + 1)

    if event_type == "idle":
        idle_seconds = int(event.get("idle_seconds") or 15)
        events = TurnEvents(
            code_update={"full_code": code},
            candidate_idle={"idle_seconds": idle_seconds, "idle_count": int(event.get("idle_count") or 1)},
        )
        last_hint_note = (
            " This is the LAST hint: end by asking whether they want to keep going or move to the next question."
            if next_hint == MAX_CODING_HINTS else ""
        )
        if last_run and (last_run.get("error") or last_run.get("passed", 0) < last_run.get("total", 0)):
            failing = (last_run.get("failures") or [{}])[0]
            last_hint_note += (
                " Their last Run failed"
                + (f" with error: {str(last_run.get('error'))[:200]}" if last_run.get("error") else
                   f" on input {str(failing.get('input'))[:200]} (expected {str(failing.get('expected'))[:120]}, "
                   f"got {str(failing.get('actual'))[:120]})")
                + ": focus the hint on that failing case."
            )
        note = (
            f"CODING EVENT (idle): the candidate has stopped typing and speaking for {idle_seconds}s in the editor. "
            f"Hints used on this problem: {hints_used} of {MAX_CODING_HINTS}. Give hint H{next_hint} now "
            f"(coding_action guide_hint) about THEIR current code, using their variable names, in one or two short "
            f"sentences.{last_hint_note} If the editor is empty or only has the starter, ask what they are thinking "
            "and offer to talk through the approach instead. Stay on this coding problem: no new question, no code."
        )
    else:
        run = run or {}
        failures = run.get("failures") or []
        events = TurnEvents(
            code_update={"full_code": code},
            code_run=CodeRunResult(
                output=str(run.get("output") or "")[:1500],
                errors=str(run.get("error") or "")[:1500],
                tests_passed=int(run.get("passed") or 0),
                tests_failed=max(0, int(run.get("total") or 0) - int(run.get("passed") or 0)),
            ),
        )
        note = (
            "CODING EVENT (run): the candidate pressed Run (not submitted). "
            f"Result: {run.get('passed', 0)} of {run.get('total', 0)} sample tests passed"
            + (f"; error: {str(run.get('error'))[:300]}" if run.get("error") else "")
            + (f"; first failing test: {json.dumps(failures[0])[:400]}" if failures else "")
            + ". React in ONE short sentence: an error -> ask what the error tells them; a failing test -> point at "
            "that input and what their code returns versus what is expected, and ask a question about it (no fix); "
            "all passing -> say it looks good and tell them to click Submit code when they're ready. "
            f"Do not give a hint unless they asked. Hints used: {hints_used} of {MAX_CODING_HINTS}. "
            "Stay on this coding problem: no new question, no code."
        )
        if event.get("repeat_failure"):
            note += (
                " The SAME test failed again with no real progress: instead of another question, OFFER a hint "
                "('Would you like a hint on this one?') and do NOT give the hint itself (coding_action ask_followup)."
                if hints_used < MAX_CODING_HINTS else
                " The SAME test failed again and all hints are used: say they can keep working on it or submit what "
                "they have, since partial solutions still count."
            )

    answers = session.get("answers") or {}
    reply = ""
    new_state = state
    failed = False
    try:
        turn, new_state = await asyncio.wait_for(
            execute_interviewer_turn(
                state.model_copy(deep=True),
                events,
                dialogue_history=_build_dialogue_turns(questions, answers, session.get(CODING_EVENT_LOG_KEY)),
                candidate_profile=_build_candidate_profile(session),
                evaluator_context=note,
                previous_questions=[q.get("question", "") for q in questions if q.get("question")],
                allow_rating=False,
            ),
            timeout=CODING_EVENT_TIMEOUT_SECONDS,
        )
        if turn.next_action in (NextAction.CONFIRM_END, NextAction.END_ASSESSMENT, NextAction.WAIT) \
                or turn.coding_action == CodingAction.SILENT:
            reply = ""
        else:
            reply = (turn.say or "").strip()
    except Exception as exc:  # timeout or LLM failure
        logger.warning("Coding event reply failed (%s); using fallback", exc)
        new_state = state.model_copy(deep=True)
        failed = True

    # Idle check-ins always say something (that's the point); a run only falls back if Alex failed.
    if not reply and (event_type == "idle" or failed):
        reply = _fallback_event_reply(event_type, next_hint, code, run)

    if event_type == "run" and event.get("repeat_failure") and new_state.hint_level_given > hints_used:
        new_state.hint_level_given = hints_used  # a hint was only offered, not given
    if event_type == "idle" and reply:
        # An idle check-in always uses one hint, whatever action the model reported.
        new_state.hint_level_given = max(new_state.hint_level_given, min(MAX_CODING_HINTS, hints_used + 1))
        new_state.idle_prompts_used += 1

    session[MASTER_STATE_KEY] = new_state.model_dump(mode="json")
    if reply:
        log = session.setdefault(CODING_EVENT_LOG_KEY, {})
        log.setdefault(str(coding_question.get("id")), []).append(
            {"speaker": "Interviewer (Alex)", "text": reply, "event": event_type}
        )
    logger.info("Coding %s event: hints %d -> %d", event_type, hints_used, new_state.hint_level_given)
    return reply
