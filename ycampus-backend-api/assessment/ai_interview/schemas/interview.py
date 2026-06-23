from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class InterviewQuestion(BaseModel):
    id: int = Field(..., description="Question sequence number")
    question: str = Field(..., description="The interview question text")
    topic: str = Field(..., description="Skill or domain area being tested")
    difficulty: str = Field(..., description="easy | medium | hard")
    question_type: str = Field("technical", description="technical | behavioral | coding | system_design")
    expected_points: list[str] = Field(
        default_factory=list,
        description="Key points the candidate should cover",
    )
    reasoning: Optional[str] = Field(None, description="Why this question was chosen (adaptive mode)")


class AnswerEvaluation(BaseModel):
    score: int = Field(..., ge=1, le=10, description="Score from 1-10")
    score_percentage: Optional[float] = Field(None, description="Approximate percentage score")
    feedback: str = Field(..., description="2-3 sentence constructive feedback")
    covered_points: list[str] = Field(default_factory=list, description="Points addressed")
    missed_points: list[str] = Field(default_factory=list, description="Points missed")
    follow_up_suggestion: Optional[str] = Field(None, description="Optional follow-up question")
    coverage_ratio: Optional[float] = Field(None, description="Rule-based expected-point coverage")
    should_offer_hint: bool = Field(False, description="Whether to offer a hint before moving on")
    hint_prompt: Optional[str] = Field(None, description="Prompt to offer a hint when answer is close")
    answer_word_count: Optional[int] = Field(None, description="Word count of submitted answer")
    answer_truncated: bool = Field(False, description="Whether the LLM evaluator saw a condensed answer")

    llm_score: Optional[int] = Field(None, description="LLM-only score component")
    rule_based_score: Optional[int] = Field(None, description="Rule-based score component")
    code_analysis_score: Optional[int] = Field(None, description="Code analysis score (coding questions)")


class AcknowledgementCue(BaseModel):
    type: int = Field(..., ge=1, le=3, description="1=next question, 2=add more/hint, 3=silence check")
    action: str = Field(..., description="Client action identifier")
    message: str = Field(..., description="Candidate-facing acknowledgement")
    wait_seconds: Optional[float] = Field(None, description="Seconds to wait before this cue")



class StartInterviewRequest(BaseModel):
    session_id: str = Field(..., description="Session from resume upload")
    difficulty: str = Field("medium", description="easy | medium | hard")
    num_questions: int = Field(5, ge=1, le=15, description="Number of questions (1-15)")
    adaptive: bool = Field(False, description="Enable adaptive interview mode")


class NextQuestionRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")


class SubmitAnswerRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")
    question_id: int = Field(..., description="ID of the question being answered")
    answer: str = Field(..., min_length=1, max_length=20_000, description="Candidate's answer")
    answer_duration_seconds: Optional[float] = Field(
        None,
        ge=0,
        description="How long the candidate spent answering, if tracked by the client",
    )


class HintRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")
    question_id: int = Field(..., description="ID of the question needing a hint")
    partial_answer: str = Field("", description="Candidate's partial answer so far")


class InterviewCueRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")
    question_id: Optional[int] = Field(None, description="Current question ID")
    event_type: str = Field(
        "progress",
        description="progress | add_more | silence | long_answer | next_question",
    )
    silence_seconds: Optional[float] = Field(None, ge=0, description="Observed silence duration")
    answer_duration_seconds: Optional[float] = Field(None, ge=0, description="Observed answer duration")
    partial_answer: str = Field("", max_length=5000, description="Current partial answer")


class StartInterviewResponse(BaseModel):
    session_id: str
    questions: list[InterviewQuestion]
    adaptive: bool = Field(False, description="Whether adaptive mode is active")
    opening_message: str = Field(
        "Let's begin with a quick self-introduction.",
        description="Message to introduce the first question",
    )
    closing_note: str = Field(
        "Thank you for completing the mock interview.",
        description="Message to show after the final question",
    )


class NextQuestionResponse(BaseModel):
    session_id: str
    question: Optional[InterviewQuestion] = None
    questions_remaining: int
    current_avg_score: float = Field(0.0, description="Running average score")
    complete: bool = Field(False, description="Whether the interview has ended")
    acknowledgement: Optional[AcknowledgementCue] = None
    closing_note: Optional[str] = None


class SubmitAnswerResponse(BaseModel):
    evaluation: AnswerEvaluation
    acknowledgement: AcknowledgementCue
    should_move_next: bool = Field(False, description="Whether the client should advance")
    closing_note: Optional[str] = None


class InterviewCueResponse(BaseModel):
    acknowledgement: AcknowledgementCue
    should_move_next: bool = Field(False, description="Whether the client should advance")


class HintResponse(BaseModel):
    hint: str = Field(..., description="Hint text")
    hint_level: int = Field(..., ge=1, le=3, description="Current hint level (1-3)")
    hints_remaining: int = Field(..., description="Hints left for this question")
