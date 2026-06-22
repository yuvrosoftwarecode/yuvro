from __future__ import annotations
from pydantic import BaseModel, Field


class TopicBreakdown(BaseModel):
    """Per-topic performance breakdown."""

    topic: str
    score: float = Field(..., ge=0, le=100)
    assessment: str = Field("", description="One sentence assessment")


class InterviewReport(BaseModel):
    """Comprehensive interview performance report."""

    overall_score: float = Field(..., ge=0, le=100, description="Weighted overall score")
    overall_grade: str = Field(..., description="A+ | A | B+ | B | C+ | C | D | F")
    executive_summary: str = Field(..., description="3-4 sentence summary for hiring manager")
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    topic_breakdown: list[TopicBreakdown] = Field(default_factory=list)
    hiring_recommendation: str = Field(
        ..., description="strong_hire | hire | borderline | no_hire"
    )
    recommendation_reasoning: str = Field("")
    development_areas: list[str] = Field(default_factory=list)
    follow_up_topics: list[str] = Field(default_factory=list)


class ReportRequest(BaseModel):
    """POST /api/v1/generate-report body."""

    session_id: str = Field(..., description="Session with completed interview answers")


class ReportResponse(BaseModel):
    """Response with the full interview report."""

    session_id: str
    candidate_name: str = Field("")
    position: str = Field("")
    report: InterviewReport
    questions_answered: int = Field(0)
    total_questions: int = Field(0)
