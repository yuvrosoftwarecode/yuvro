from __future__ import annotations
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class TopicLevelBreakdown(BaseModel):
    topic: str
    demonstrated_level: str = Field("D2", description="D1 to D5")
    score: float = Field(..., ge=0, le=100)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)


class CodingAssessmentDetail(BaseModel):
    approach: str = ""
    correctness: str = ""
    complexity: str = ""
    edge_cases: str = ""
    hints_used: int = 0
    outcome: str = Field("completed", description="completed | partial | hit cap | skipped after guidance")


class DebuggingAssessmentDetail(BaseModel):
    reproduce: bool = True
    hypothesis: bool = True
    verify_process: str = ""
    hints_used: int = 0


class OptimisationAssessmentDetail(BaseModel):
    bottleneck_identified: bool = True
    tradeoff_reasoning: str = ""
    correctness_maintained: bool = True


class PracticePlanItem(BaseModel):
    priority: int = Field(..., ge=1, le=3)
    topic: str
    concrete_exercise: str


class MasterInterviewReport(BaseModel):
    overall_demonstrated_level: str = Field("D2", description="D1 to D5 overall")
    overall_score: float = Field(..., ge=0, le=100)
    overall_grade: str = Field("B", description="A+ | A | B+ | B | C+ | C | D | F")
    executive_summary: str = Field("", description="Summary starting with real strengths, then gaps")
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    topic_breakdown: List[TopicLevelBreakdown] = Field(default_factory=list)

    # Core engine dimensions
    coding: Optional[CodingAssessmentDetail] = None
    debugging: Optional[DebuggingAssessmentDetail] = None
    optimisation: Optional[OptimisationAssessmentDetail] = None

    claims_verified: Dict[str, str] = Field(default_factory=dict, description="Claim -> hands-on | theory | none")
    ai_usage_maturity: str = Field("medium", description="low | medium | high")
    ai_usage_tip: str = Field("", description="Short actionable improvement tip")
    communication_and_problem_solving: str = Field("")

    practice_plan: List[PracticePlanItem] = Field(default_factory=list, description="Top 3 most valuable exercises")
    hiring_recommendation: str = Field("hire", description="strong_hire | hire | borderline | no_hire")
    recommendation_reasoning: str = Field("")
