from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


class InterviewMode(StrEnum):
    AUTOMATIC = "automatic"
    HYBRID = "hybrid"
    CUSTOM = "custom"


class InterviewStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class LLMCallStatus(StrEnum):
    SKIPPED = "skipped"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    INVALID_OUTPUT = "invalid_output"


class EventSource(StrEnum):
    SIMULATION_LAB = "simulation_lab"
    CODING_ASSESSMENT = "coding_assessment"
    MCQ = "mcq"
    INTERVIEW = "interview"
    SYSTEM = "system"


class EventType(StrEnum):
    FILE_OPENED = "file_opened"
    FILE_MODIFIED = "file_modified"
    CODE_CHANGED = "code_changed"
    DEBUG_STEP = "debug_step"
    TERMINAL_COMMAND = "terminal_command"
    TEST_RUN = "test_run"
    DATABASE_QUERY = "database_query"
    TIME_SPENT = "time_spent"
    MULTIPLE_EDITS = "multiple_edits"
    SOLUTION_CHANGE = "solution_change"
    ERROR_ENCOUNTERED = "error_encountered"
    FINAL_IMPLEMENTATION = "final_implementation"
    DECISION_TAKEN = "decision_taken"
    MCQ_ANSWERED = "mcq_answered"
    OTHER = "other"


class Competency(StrEnum):
    TECHNICAL_KNOWLEDGE = "technical_knowledge"
    PROBLEM_SOLVING = "problem_solving"
    DEBUGGING_ABILITY = "debugging_ability"
    ENGINEERING_DECISION_MAKING = "engineering_decision_making"
    CODE_QUALITY = "code_quality"
    COMMUNICATION = "communication"
    LEARNING_ABILITY = "learning_ability"
    ADAPTABILITY = "adaptability"
    TIME_MANAGEMENT = "time_management"
    TESTING_MINDSET = "testing_mindset"
    PERFORMANCE_AWARENESS = "performance_awareness"
    SECURITY_AWARENESS = "security_awareness"
    OWNERSHIP_COLLABORATION = "ownership_collaboration"


class QuestionKind(StrEnum):
    RECRUITER_REQUIRED = "recruiter_required"
    CUSTOM_SCOPE_FOLLOW_UP = "custom_scope_follow_up"
    DYNAMIC_FOLLOW_UP = "dynamic_follow_up"
    CLARIFICATION = "clarification"
    REFRAME = "reframe"
    MCQ_REASONING = "mcq_reasoning"
    MCQ_REMEDIATION = "mcq_remediation"


class MCQInterviewerAction(StrEnum):
    ASK_REASONING = "ask_reasoning"
    ASK_SELECTION_RATIONALE = "ask_selection_rationale"
    OFFER_HINT_RETRY_SKIP = "offer_hint_retry_skip"
    ASSESS_AFTER_HINT = "assess_after_hint"


class CandidateContext(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    target_role: str | None = None
    resume: str = ""
    job_description: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class MCQOption(BaseModel):
    id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)


class MCQItem(BaseModel):
    id: str = Field(default_factory=lambda: new_id("mcq"))
    prompt: str = Field(..., min_length=1)
    options: list[MCQOption] = Field(default_factory=list, min_length=2)
    correct_option_id: str | None = None
    hint: str | None = None
    topic: str | None = None

    @model_validator(mode="after")
    def validate_correct_option(self) -> "MCQItem":
        option_ids = {option.id for option in self.options}
        if self.correct_option_id is not None and self.correct_option_id not in option_ids:
            raise ValueError("correct_option_id must match one of the MCQ option ids")
        return self


class InterviewCreateRequest(BaseModel):
    mode: InterviewMode
    candidate: CandidateContext
    recruiter_questions: list[str] = Field(default_factory=list)
    simulation_labs: list[str] = Field(default_factory=list)
    coding_assessments: list[str] = Field(default_factory=list)
    mcqs: list[MCQItem] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("recruiter_questions")
    @classmethod
    def trim_questions(cls, value: list[str]) -> list[str]:
        return [question.strip() for question in value if question.strip()]

    @model_validator(mode="after")
    def validate_mode_contract(self) -> "InterviewCreateRequest":
        question_count = len(self.recruiter_questions)
        if self.mode == InterviewMode.AUTOMATIC and question_count:
            raise ValueError("automatic mode cannot include recruiter_questions")
        if self.mode == InterviewMode.HYBRID and not 1 <= question_count <= 2:
            raise ValueError("hybrid mode requires 1 or 2 recruiter_questions")
        if self.mode == InterviewMode.CUSTOM and question_count == 0:
            raise ValueError("custom mode requires recruiter_questions")
        return self


class UnifiedAssessmentPayload(BaseModel):
    """Frontend aggregate payload sent after an assessment is completed.

    This shape intentionally accepts extra fields because the frontend aggregate
    can grow without forcing backend deploys for unrelated additions.
    """

    model_config = ConfigDict(extra="allow")

    event_type: str | None = None
    timestamp: datetime | None = None
    evaluation_id: str | None = None
    discussion_mode: str = "AUTOMATIC"
    candidate_context: str | None = None
    force: bool | None = None
    sequential: bool | None = None
    candidate: dict[str, Any] = Field(default_factory=dict)
    job_description: dict[str, Any] | str = Field(default_factory=dict)
    knowledge_assessment: dict[str, Any] = Field(default_factory=dict)
    engineering_labs: list[dict[str, Any]] = Field(default_factory=list)
    recruiter_questions: list[Any] = Field(default_factory=list)
    custom_questions: list[Any] = Field(default_factory=list)
    interviewer_questions: list[Any] = Field(default_factory=list)
    drafted_questions: list[Any] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_payload_identity(self) -> "UnifiedAssessmentPayload":
        if not self.event_type and not self.candidate_context:
            raise ValueError("unified payload requires event_type or candidate_context")
        return self


class AssessmentEvent(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evt"))
    event_type: EventType
    source: EventSource
    summary: str = Field(..., min_length=1)
    details: dict[str, Any] = Field(default_factory=dict)
    duration_seconds: int | None = Field(default=None, ge=0)
    tags: list[str] = Field(default_factory=list)
    occurred_at: datetime = Field(default_factory=utc_now)


class ObservationSignal(BaseModel):
    id: str = Field(default_factory=lambda: new_id("sig"))
    competency: Competency
    label: str
    evidence_event_id: str
    weight: int = Field(default=1, ge=1, le=5)
    reason: str


class InterviewQuestion(BaseModel):
    id: str = Field(default_factory=lambda: new_id("qst"))
    prompt: str
    kind: QuestionKind
    competency_targets: list[Competency] = Field(default_factory=list)
    evidence_event_ids: list[str] = Field(default_factory=list)
    evidence_answer_ids: list[str] = Field(default_factory=list)
    rationale: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class NextQuestionRequest(BaseModel):
    force_new: bool = False


class CandidateAnswerRequest(BaseModel):
    question_id: str = Field(..., min_length=1)
    answer_text: str = Field(..., min_length=1)
    confidence: int | None = Field(default=None, ge=1, le=5)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CandidateAnswer(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ans"))
    question_id: str
    answer_text: str
    confidence: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    answered_at: datetime = Field(default_factory=utc_now)


class LLMCallLog(BaseModel):
    id: str = Field(default_factory=lambda: new_id("llm"))
    operation: str
    provider: str = "openai"
    model: str
    status: LLMCallStatus
    prompt_version: str
    latency_ms: int | None = Field(default=None, ge=0)
    fallback_reason: str | None = None
    request_summary: dict[str, Any] = Field(default_factory=dict)
    response_excerpt: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class MCQAnswerRequest(BaseModel):
    selected_option_id: str | None = None
    skipped: bool = False
    used_hint: bool = False
    explanation: str | None = None

    @model_validator(mode="after")
    def validate_selection(self) -> "MCQAnswerRequest":
        if not self.skipped and not self.selected_option_id:
            raise ValueError("selected_option_id is required unless skipped=true")
        return self


class MCQInterviewResponse(BaseModel):
    mcq_id: str
    action: MCQInterviewerAction
    prompt: str
    is_correct: bool | None = None
    hint: str | None = None
    next_options: list[str] = Field(default_factory=list)
    evidence_event_id: str


class EvaluationEvidence(BaseModel):
    source: str
    reference_id: str
    note: str


class CompetencyScore(BaseModel):
    competency: Competency
    score: int = Field(..., ge=0, le=10)
    evidence: list[EvaluationEvidence] = Field(default_factory=list)
    guidance: str


class CompetencyCoverage(BaseModel):
    competency: Competency
    evidence_count: int = Field(default=0, ge=0)
    status: str
    score: int = Field(..., ge=0, le=10)
    suggested_probe: str


class EvaluationCoverage(BaseModel):
    session_id: str
    rubric_version: str
    covered_competencies: int = Field(..., ge=0)
    total_competencies: int = Field(..., ge=1)
    coverage_percent: float = Field(..., ge=0, le=100)
    competencies: list[CompetencyCoverage] = Field(default_factory=list)


class InterviewEvaluation(BaseModel):
    session_id: str
    rubric_version: str
    overall_score: float = Field(..., ge=0, le=10)
    scores: list[CompetencyScore]
    coverage: EvaluationCoverage
    summary: str
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=utc_now)


class InterviewTranscriptItem(BaseModel):
    question_id: str
    question: str
    question_kind: QuestionKind
    answer_id: str | None = None
    answer: str | None = None
    competency_targets: list[Competency] = Field(default_factory=list)


class ReportCompetencySummary(BaseModel):
    competency: Competency
    score: int = Field(..., ge=0, le=10)
    guidance: str
    evidence: list[EvaluationEvidence] = Field(default_factory=list)


class EngineeringLabReportItem(BaseModel):
    lab_id: str | None = None
    title: str
    scenario: str | None = None
    time_spent_seconds: int | None = Field(default=None, ge=0)
    tests_passed: int | None = Field(default=None, ge=0)
    tests_total: int | None = Field(default=None, ge=0)
    terminal_commands_run: int | None = Field(default=None, ge=0)
    errors_encountered: int | None = Field(default=None, ge=0)
    changed_files: list[str] = Field(default_factory=list)
    code_diff_format: str | None = None
    score: float | None = Field(default=None, ge=0, le=10)
    summary: str
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    evidence_event_ids: list[str] = Field(default_factory=list)


class EngineeringLabsReport(BaseModel):
    id: str = Field(default_factory=lambda: new_id("eng_rpt"))
    title: str = "Engineering Labs Report"
    session_id: str
    candidate_id: str
    lab_count: int = Field(..., ge=0)
    total_time_seconds: int = Field(default=0, ge=0)
    tests_passed: int = Field(default=0, ge=0)
    tests_total: int = Field(default=0, ge=0)
    overall_score: float | None = Field(default=None, ge=0, le=10)
    labs: list[EngineeringLabReportItem] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    markdown: str
    generated_at: datetime = Field(default_factory=utc_now)


class KnowledgeQuestionReport(BaseModel):
    question_id: str | None = None
    question_type: str | None = None
    title: str | None = None
    prompt: str
    difficulty: str | None = None
    marks_awarded: float | None = Field(default=None, ge=0)
    max_marks: float | None = Field(default=None, ge=0)
    is_correct: bool | None = None
    time_spent_seconds: int | None = Field(default=None, ge=0)
    candidate_answer: Any = None
    correct_solution: Any = None
    score_percent: float | None = Field(default=None, ge=0, le=100)
    feedback: str


class KnowledgeAssessmentReport(BaseModel):
    id: str = Field(default_factory=lambda: new_id("know_rpt"))
    title: str = "Knowledge Assessment Report"
    session_id: str
    candidate_id: str
    total_score: float | None = Field(default=None, ge=0)
    max_score: float | None = Field(default=None, ge=0)
    score_percent: float | None = Field(default=None, ge=0, le=100)
    correct_count: int = Field(default=0, ge=0)
    question_count: int = Field(default=0, ge=0)
    questions: list[KnowledgeQuestionReport] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    markdown: str
    generated_at: datetime = Field(default_factory=utc_now)


class OverallReportSectionScore(BaseModel):
    section: str
    score: float | None = Field(default=None, ge=0, le=10)
    max_score: float = Field(default=10, ge=0)
    weight: float = Field(default=0, ge=0, le=1)
    summary: str


class OverallInterviewReport(BaseModel):
    id: str = Field(default_factory=lambda: new_id("overall_rpt"))
    title: str = "Overall Interview Report"
    session_id: str
    candidate_id: str
    target_role: str | None = None
    overall_score: float = Field(..., ge=0, le=10)
    recommendation: str
    executive_summary: str
    section_scores: list[OverallReportSectionScore] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    markdown: str
    generated_at: datetime = Field(default_factory=utc_now)


class InterviewReport(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rpt"))
    session_id: str
    candidate_id: str
    target_role: str | None = None
    mode: InterviewMode
    status: InterviewStatus
    rubric_version: str
    overall_score: float = Field(..., ge=0, le=10)
    coverage: EvaluationCoverage
    recommendation: str
    executive_summary: str
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    competency_summaries: list[ReportCompetencySummary] = Field(default_factory=list)
    evidence_highlights: list[EvaluationEvidence] = Field(default_factory=list)
    transcript: list[InterviewTranscriptItem] = Field(default_factory=list)
    markdown: str
    generated_at: datetime = Field(default_factory=utc_now)


class InterviewReportBundle(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rpt_bundle"))
    session_id: str
    candidate_id: str
    target_role: str | None = None
    engineering_labs_report: EngineeringLabsReport
    knowledge_assessment_report: KnowledgeAssessmentReport
    vitarka_report: InterviewReport
    overall_report: OverallInterviewReport
    generated_at: datetime = Field(default_factory=utc_now)


class InterviewSession(BaseModel):
    id: str = Field(default_factory=lambda: new_id("int"))
    mode: InterviewMode
    candidate: CandidateContext
    recruiter_questions: list[str] = Field(default_factory=list)
    simulation_labs: list[str] = Field(default_factory=list)
    coding_assessments: list[str] = Field(default_factory=list)
    mcqs: list[MCQItem] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    status: InterviewStatus = InterviewStatus.ACTIVE
    required_question_cursor: int = 0
    turn_index: int = 0
    current_question_id: str | None = None
    asked_signatures: list[str] = Field(default_factory=list)
    questions: list[InterviewQuestion] = Field(default_factory=list)
    answers: list[CandidateAnswer] = Field(default_factory=list)
    llm_calls: list[LLMCallLog] = Field(default_factory=list)
    observations: list[AssessmentEvent] = Field(default_factory=list)
    signals: list[ObservationSignal] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @classmethod
    def from_create_request(cls, request: InterviewCreateRequest) -> "InterviewSession":
        return cls(
            mode=request.mode,
            candidate=request.candidate,
            recruiter_questions=request.recruiter_questions,
            simulation_labs=request.simulation_labs,
            coding_assessments=request.coding_assessments,
            mcqs=request.mcqs,
            metadata=request.metadata,
        )

    def touch(self) -> None:
        self.updated_at = utc_now()


class EventIngestResponse(BaseModel):
    session_id: str
    event: AssessmentEvent
    extracted_signals: list[ObservationSignal]
    suggested_focus: list[Competency]


class AnswerResponse(BaseModel):
    session_id: str
    answer: CandidateAnswer
    follow_up_ready: bool
