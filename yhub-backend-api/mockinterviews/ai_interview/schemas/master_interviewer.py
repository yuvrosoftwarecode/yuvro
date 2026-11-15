from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CandidateIntent(str, Enum):
    ANSWER = "answer"
    CLARIFY_REQUEST = "clarify_request"
    SKIP_QUESTION = "skip_question"
    HINT_REQUEST = "hint_request"
    END_ASSESSMENT = "end_assessment"
    PAUSE = "pause"
    OFF_TOPIC = "off_topic"
    OTHER = "other"


class NextAction(str, Enum):
    ASK_FOLLOWUP = "ask_followup"
    NEXT_QUESTION = "next_question"
    GIVE_HINT = "give_hint"
    WAIT = "wait"
    CONFIRM_END = "confirm_end"
    END_ASSESSMENT = "end_assessment"


class CodingAction(str, Enum):
    NONE = "none"
    SILENT = "silent"
    ASK_FOLLOWUP = "ask_followup"
    PROBE_BUG = "probe_bug"
    GUIDE_HINT = "guide_hint"
    COMPLETE_REVIEW = "complete_review"
    SKIP_AND_MOVE_ON = "skip_and_move_on"


class AnswerRating(str, Enum):
    STRONG = "strong"
    PARTIAL = "partial"
    WEAK = "weak"
    NA = "n/a"


class InterviewState(BaseModel):
    """Rich state maintained across turns and sent to the LLM every turn."""

    role: str = Field("Software Engineer", description="Role being interviewed for")
    stack: List[str] = Field(default_factory=list, description="Primary technical stack/languages")
    experience: str = Field("fresher", description="fresher, intern or years (e.g. '3 years')")
    experience_years: Optional[float] = Field(None, description="Numeric years of experience if available")
    candidate_name: str = Field("", description="Name the candidate gave in the interview (wins over the account name)")
    skill_experience_years: Optional[float] = Field(None, description="Years with the ROLE'S skill (sets the starting level)")
    background_type: str = Field("unknown", description="engineering | technical | non_technical | none | unknown")
    has_role_projects: Optional[bool] = Field(None, description="Built/worked on something with the role's skill")
    current_role: str = Field("", description="Current/most recent role and main responsibilities")
    projects: List[str] = Field(default_factory=list, description="Projects the candidate mentioned")

    # Intro details (experience, role, projects) gathered before the technical round
    intro_complete: bool = Field(False, description="Whether intro details have been gathered (or asks used up)")
    intro_questions_asked: int = Field(0, description="Intro-detail questions asked so far (max 3)")

    # Progress (no phases or timers; the app owns the clock)
    questions_asked: int = Field(0, description="Questions asked so far, including the self-introduction")
    coding_questions_asked: int = Field(0, description="Coding (editor) questions asked so far")

    # Difficulty engine (D1 to D5 per topic)
    topic_levels: Dict[str, int] = Field(default_factory=dict, description="Current level 1-5 per topic")
    strong_streak: int = Field(0, description="Consecutive strong answers in current topic")
    weak_streak: int = Field(0, description="Consecutive weak answers in current topic")
    calibration_done: bool = Field(False, description="Whether initial 3-question calibration is done")

    # Interaction & hints counters
    followups_used: int = Field(0, description="Follow-ups used on the current problem or topic")
    idle_prompts_used: int = Field(0, description="Idle prompts used in current problem")
    hint_level_given: int = Field(0, description="Highest hint level given (0-3) for current problem")

    # Verification & claims
    claims_to_verify: List[str] = Field(default_factory=list, description="Self-ratings or claims to verify")
    claims_verified: Dict[str, str] = Field(default_factory=dict, description="Claim -> hands-on | theory | none")
    debug_done: bool = Field(False, description="Whether a debugging question was completed")
    optimise_done: bool = Field(False, description="Whether an optimisation question was completed")
    ai_usage_maturity: str = Field("unknown", description="unknown | low | medium | high")


class CodeRunResult(BaseModel):
    output: str = ""
    errors: str = ""
    tests_passed: int = 0
    tests_failed: int = 0


class TurnEvents(BaseModel):
    """Events happening in the app between/at turns."""

    candidate_message: Optional[str] = Field(None, description="Spoken or typed candidate message")
    code_update: Optional[Dict[str, str]] = Field(None, description="Dict with 'full_code' and 'diff'")
    code_run: Optional[CodeRunResult] = Field(None, description="Result of executing candidate code")
    candidate_idle: Optional[Dict[str, Any]] = Field(None, description="idle_seconds and idle_count")
    snippet_loaded: Optional[str] = Field(None, description="Identifier or summary of loaded snippet")


class InterviewerTurnOutput(BaseModel):
    """Single unified JSON output returned by Alex."""

    intent: CandidateIntent = CandidateIntent.ANSWER
    intent_confidence: float = Field(1.0, ge=0.0, le=1.0)
    say: str = Field("", description="1-3 short sentences spoken to the candidate. Empty string when next_action is wait.")
    next_action: NextAction = NextAction.ASK_FOLLOWUP
    coding_action: CodingAction = CodingAction.NONE
    topic: str = Field("general", description="Current topic being assessed")
    difficulty_level: int = Field(1, ge=1, le=5, description="Difficulty level D1 to D5")
    question_type: str = Field("technical", description="technical | behavioral | coding | system_design (coding opens the editor)")
    expected_points: List[str] = Field(default_factory=list, description="Key points a good answer to the question in `say` covers")
    sample_tests: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Coding questions only: 2-3 visible tests {input, expected_output} (JSON strings) for the Run button",
    )
    answer_rating: AnswerRating = AnswerRating.NA
    evaluation_note: str = Field("", description="Private short note, never shown to candidate")
    state_updates: Dict[str, Any] = Field(default_factory=dict, description="Updates to interview state")
