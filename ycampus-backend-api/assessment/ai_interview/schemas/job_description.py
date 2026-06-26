import re
from typing import Optional
from pydantic import BaseModel, Field, ValidationInfo, field_validator


def _parse_optional_years(value: object, prefer: str = "first") -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().lower()
        if not cleaned or cleaned in {"n/a", "na", "none", "null", "not specified"}:
            return None
        matches = re.findall(r"\d+(?:\.\d+)?", cleaned)
        if matches:
            selected = matches[-1] if prefer == "max" else matches[0]
            return float(selected)
    return value


class ExtractedSkill(BaseModel):
    skill: str = Field(..., description="Skill name")
    category: str = Field(
        ..., description="technical | soft | tool | framework | language | certification | domain"
    )
    proficiency: str = Field("intermediate", description="beginner | intermediate | advanced")
    years_experience: Optional[float] = Field(None, description="Years using this skill")
    context: str = Field("", description="Brief context where skill was used")

    @field_validator("years_experience", mode="before")
    @classmethod
    def parse_years_experience(cls, value: object) -> float | None:
        return _parse_optional_years(value)


class SkillProfile(BaseModel):
    skills: list[ExtractedSkill] = Field(default_factory=list)
    summary: str = Field("", description="One-line skill profile summary")


class JDSkillRequirement(BaseModel):
    skill: str = Field(..., description="Required skill name")
    category: str = Field(
        ..., description="technical | soft | tool | framework | language | certification | domain"
    )
    importance: str = Field("must-have", description="must-have | preferred | nice-to-have")


class ExperienceRequirement(BaseModel):
    min_years: Optional[float] = None
    max_years: Optional[float] = None
    level: str = Field("mid", description="junior | mid | senior | lead | principal")

    @field_validator("min_years", "max_years", mode="before")
    @classmethod
    def parse_years(cls, value: object, info: ValidationInfo) -> float | None:
        prefer = "max" if info.field_name == "max_years" else "first"
        return _parse_optional_years(value, prefer=prefer)

    @field_validator("level", mode="before")
    @classmethod
    def coerce_level(cls, value: object) -> str:
        """Coerce None or non-string values to 'mid'."""
        if not value or not isinstance(value, str):
            return "mid"
        return value


class JDRequirements(BaseModel):
    title: str = Field("", description="Job title")
    company: str = Field("", description="Company name")
    experience_required: ExperienceRequirement = Field(default_factory=ExperienceRequirement)
    required_skills: list[JDSkillRequirement] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    qualifications: list[str] = Field(default_factory=list)
    domain: str = Field("", description="Primary domain")
    summary: str = Field("", description="One-line JD summary")
