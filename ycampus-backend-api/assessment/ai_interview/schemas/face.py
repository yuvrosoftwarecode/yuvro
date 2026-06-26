from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class FaceMonitoringMetrics(BaseModel):
    total_checks: int = Field(0, description="Total periodic verification checks")
    passed_checks: int = Field(0, description="Checks where the enrolled face matched")
    warning_checks: int = Field(0, description="Checks with non-blocking uncertainty")
    failed_checks: int = Field(0, description="Checks with no face, mismatch, or multiple faces")
    consecutive_failures: int = Field(0, description="Current streak of failed checks")
    no_face_count: int = Field(0, description="Times no face was detected")
    multiple_faces_count: int = Field(0, description="Times more than one face was detected")
    mismatch_count: int = Field(0, description="Times live face did not match reference")
    low_confidence_count: int = Field(0, description="Times face confidence was low")
    last_status: Optional[str] = Field(None, description="Most recent verification status")
    last_checked_at: Optional[str] = Field(None, description="UTC timestamp of latest check")


class FaceBaseResponse(BaseModel):
    session_id: str
    status: str = Field(..., description="passed | warning | failed | stub")
    face_detected: bool
    num_faces: int
    multiple_faces_detected: bool = False
    confidence: float = Field(..., ge=0)
    dominant_emotion: Optional[str] = None
    risk_flags: list[str] = Field(default_factory=list)
    message: str
    stub_mode: bool = False
    recommended_interval_seconds: int


class FaceEnrollResponse(FaceBaseResponse):
    enrolled: bool
    reference_id: Optional[str] = None
    enrolled_at: Optional[str] = None


class FaceVerifyResponse(FaceBaseResponse):
    verified: bool = Field(False, description="Whether this monitoring frame passed")
    identity_verified: Optional[bool] = Field(None, description="Whether live face matches reference")
    distance: Optional[float] = Field(None, description="DeepFace comparison distance")
    threshold: Optional[float] = Field(None, description="DeepFace model threshold")
    model: Optional[str] = Field(None, description="DeepFace model name")
    similarity_metric: Optional[str] = Field(None, description="DeepFace distance metric")
    checked_at: str
    question_id: Optional[int] = None
    metrics: FaceMonitoringMetrics
