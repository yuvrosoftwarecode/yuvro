from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InterviewPhase(str, Enum):
    P1 = "P1"   # Warm-up (3 min)
    P2 = "P2"   # Fundamentals and calibration (10 min)
    P3 = "P3"   # Projects (7 min)
    P4 = "P4"   # Coding problem (editor) (12 min)
    P5 = "P5"   # Debugging (editor) (4 min)
    P6 = "P6"   # Optimisation (editor) (4 min)
    P7 = "P7"   # Gap probing (6 min)
    P8 = "P8"   # Design or scenario (3+ years) (4 min)
    P9 = "P9"   # Behavioral and general (3 min)
    P10 = "P10" # AI usage (4 min)
    P11 = "P11" # Close (3 min)


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
    SWITCH_PHASE = "switch_phase"
    CONFIRM_END = "confirm_end"
    END_ASSESSMENT = "end_assessment"


class CodingAction(str, Enum):
    NONE = "none"
    SILENT = "silent"
    ASK_FOLLOWUP = "ask_followup"
    PROBE_BUG = "probe_bug"
    GUIDE_HINT = "guide_hint"
    WRAP_UP = "wrap_up"
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

    # Phase and clock tracking
    phase: InterviewPhase = Field(InterviewPhase.P1, description="Current interview phase P1-P11")
    time_remaining: int = Field(3600, description="Seconds remaining in total 60-min budget")
    phase_time_used: int = Field(0, description="Seconds spent in the current phase")
    phase_target: int = Field(180, description="Target seconds for current phase")
    phase_soft_cap: int = Field(240, description="Soft cap seconds for current phase")
    phase_hard_cap: int = Field(300, description="Hard cap seconds for current phase")

    # Difficulty engine (D1 to D5 per topic)
    topic_levels: Dict[str, int] = Field(default_factory=dict, description="Current level 1-5 per topic")
    strong_streak: int = Field(0, description="Consecutive strong answers in current topic")
    weak_streak: int = Field(0, description="Consecutive weak answers in current topic")
    calibration_done: bool = Field(False, description="Whether initial 3-question calibration is done")

    # Interaction & hints counters
    followups_used: int = Field(0, description="Follow-ups used in current problem/phase")
    idle_prompts_used: int = Field(0, description="Idle prompts used in current problem")
    hint_level_given: int = Field(0, description="Highest hint level given (0-3) for current problem")

    # Verification & claims
    claims_to_verify: List[str] = Field(default_factory=list, description="Self-ratings or claims to verify")
    claims_verified: Dict[str, str] = Field(default_factory=dict, description="Claim -> hands-on | theory | none")
    debug_done: bool = Field(False, description="Whether Phase 5 debugging question was completed")
    optimise_done: bool = Field(False, description="Whether Phase 6 optimisation question was completed")
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
    time_signal: Optional[str] = Field(None, description="target_reached | soft_cap | hard_cap")
    extension_granted: Optional[int] = Field(None, description="Extension seconds granted, if any")


class InterviewerTurnOutput(BaseModel):
    """Single unified JSON output returned by Alex."""

    intent: CandidateIntent = CandidateIntent.ANSWER
    intent_confidence: float = Field(1.0, ge=0.0, le=1.0)
    say: str = Field("", description="1-3 short sentences spoken to the candidate. Empty string when next_action is wait.")
    next_action: NextAction = NextAction.ASK_FOLLOWUP
    coding_action: CodingAction = CodingAction.NONE
    phase: InterviewPhase = InterviewPhase.P1
    topic: str = Field("general", description="Current topic being assessed")
    difficulty_level: int = Field(1, ge=1, le=5, description="Difficulty level D1 to D5")
    answer_rating: AnswerRating = AnswerRating.NA
    evaluation_note: str = Field("", description="Private short note, never shown to candidate")
    state_updates: Dict[str, Any] = Field(default_factory=dict, description="Updates to interview state")
