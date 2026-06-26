import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator


def _parse_optional_years(value: object) -> float | None:
    """Accept fractional years and common LLM strings like '3.5 years'."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().lower()
        if not cleaned or cleaned in {"n/a", "na", "none", "null", "not specified"}:
            return None
        match = re.search(r"\d+(?:\.\d+)?", cleaned)
        if match:
            return float(match.group())
    return value


class ResumeUploadRequest(BaseModel):
    """POST /api/v1/upload-resume body."""

    resume_text: str = Field(
        ...,
        min_length=50,
        max_length=10_000,
        description="Plain-text resume content (50-10 000 chars).",
    )
    jd_text: str = Field(
        ...,
        min_length=20,
        max_length=5_000,
        description="Job description text (20-5 000 chars).",
    )

    @field_validator("resume_text", "jd_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field must contain non-whitespace text.")
        return v.strip()


class SkillMatch(BaseModel):
    """Single skill comparison between resume and JD."""

    skill: str = Field(..., description="Skill name (e.g. 'Python', 'Docker')")
    found_in_resume: bool = Field(..., description="Whether the candidate lists this skill")
    proficiency: Optional[str] = Field(
        None, description="Estimated level: beginner | intermediate | advanced"
    )


class ResumeAnalysis(BaseModel):
    """Structured output from the LLM resume + JD analysis."""

    candidate_name: str = Field("", description="Extracted candidate name")
    experience_years: Optional[float] = Field(None, description="Total years of experience")
    experience_level: str = Field(
        ...,
        description="junior | mid | senior | lead",
    )
    domain: str = Field(
        ...,
        description="Primary domain (e.g. 'Backend Engineering')",
    )
    skills: list[SkillMatch] = Field(
        default_factory=list,
        description="Per-skill match analysis",
    )
    match_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Overall resume-JD alignment percentage (0-100)",
    )
    strengths: list[str] = Field(default_factory=list, description="Key strengths relative to JD")
    gaps: list[str] = Field(default_factory=list, description="Missing or weak areas relative to JD")
    summary: str = Field("", description="One-paragraph recruiter summary")

    @field_validator("experience_years", mode="before")
    @classmethod
    def parse_experience_years(cls, value: object) -> float | None:
        return _parse_optional_years(value)


class ResumeUploadResponse(BaseModel):
    """Response returned after a successful resume upload."""

    session_id: str = Field(..., description="Unique session identifier for subsequent calls")
    analysis: ResumeAnalysis = Field(..., description="Structured resume-JD analysis")
