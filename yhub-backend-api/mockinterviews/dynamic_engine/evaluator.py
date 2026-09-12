from __future__ import annotations

import re
from collections import defaultdict

from mockinterviews.dynamic_engine.models import (
    AssessmentEvent,
    Competency,
    CompetencyCoverage,
    CompetencyScore,
    EvaluationCoverage,
    EvaluationEvidence,
    EventType,
    InterviewEvaluation,
    InterviewSession,
)


EVENT_COMPETENCY_EVIDENCE: dict[EventType, list[Competency]] = {
    EventType.FILE_OPENED: [Competency.PROBLEM_SOLVING],
    EventType.FILE_MODIFIED: [Competency.CODE_QUALITY, Competency.ENGINEERING_DECISION_MAKING],
    EventType.CODE_CHANGED: [Competency.CODE_QUALITY, Competency.PROBLEM_SOLVING],
    EventType.DEBUG_STEP: [Competency.DEBUGGING_ABILITY, Competency.PROBLEM_SOLVING],
    EventType.TERMINAL_COMMAND: [Competency.DEBUGGING_ABILITY, Competency.OWNERSHIP_COLLABORATION],
    EventType.TEST_RUN: [Competency.TESTING_MINDSET, Competency.CODE_QUALITY],
    EventType.DATABASE_QUERY: [
        Competency.PERFORMANCE_AWARENESS,
        Competency.SECURITY_AWARENESS,
    ],
    EventType.TIME_SPENT: [Competency.TIME_MANAGEMENT],
    EventType.MULTIPLE_EDITS: [Competency.ADAPTABILITY, Competency.LEARNING_ABILITY],
    EventType.SOLUTION_CHANGE: [
        Competency.ENGINEERING_DECISION_MAKING,
        Competency.ADAPTABILITY,
    ],
    EventType.ERROR_ENCOUNTERED: [Competency.DEBUGGING_ABILITY, Competency.LEARNING_ABILITY],
    EventType.FINAL_IMPLEMENTATION: [
        Competency.OWNERSHIP_COLLABORATION,
        Competency.CODE_QUALITY,
    ],
    EventType.DECISION_TAKEN: [Competency.ENGINEERING_DECISION_MAKING],
    EventType.MCQ_ANSWERED: [Competency.TECHNICAL_KNOWLEDGE],
    EventType.OTHER: [Competency.PROBLEM_SOLVING],
}


ANSWER_KEYWORDS: dict[Competency, set[str]] = {
    Competency.TECHNICAL_KNOWLEDGE: {"algorithm", "architecture", "api", "database", "thread", "memory"},
    Competency.PROBLEM_SOLVING: {"because", "hypothesis", "root", "cause", "isolate", "breakdown"},
    Competency.DEBUGGING_ABILITY: {"debug", "trace", "log", "reproduce", "stack", "inspect"},
    Competency.ENGINEERING_DECISION_MAKING: {
        "tradeoff",
        "constraint",
        "alternative",
        "decision",
        "because",
    },
    Competency.CODE_QUALITY: {"refactor", "readable", "maintain", "abstraction", "testable"},
    Competency.COMMUNICATION: {"because", "for example", "specifically", "first", "then"},
    Competency.LEARNING_ABILITY: {"learn", "feedback", "iterate", "adjust", "changed"},
    Competency.ADAPTABILITY: {"adapt", "changed", "switch", "iterate", "alternative"},
    Competency.TIME_MANAGEMENT: {"deadline", "prioritize", "time", "scope", "tradeoff"},
    Competency.TESTING_MINDSET: {"test", "edge", "case", "coverage", "assert"},
    Competency.PERFORMANCE_AWARENESS: {"latency", "scale", "cache", "index", "throughput", "performance"},
    Competency.SECURITY_AWARENESS: {
        "security",
        "auth",
        "permission",
        "validate",
        "injection",
        "secret",
    },
    Competency.OWNERSHIP_COLLABORATION: {"owner", "collaborate", "handoff", "document", "monitor"},
}


CoverageEvidence = dict[Competency, list[EvaluationEvidence]]
ScoreAdjustments = dict[Competency, int]


COVERAGE_PROBES: dict[Competency, str] = {
    Competency.TECHNICAL_KNOWLEDGE: "Ask the candidate to explain the framework or algorithm choice behind their implementation.",
    Competency.PROBLEM_SOLVING: "Ask for the edge case or failure mode that shaped their approach.",
    Competency.DEBUGGING_ABILITY: "Ask how they reproduced, isolated, and verified the issue.",
    Competency.ENGINEERING_DECISION_MAKING: "Ask why they chose this path over one concrete alternative.",
    Competency.CODE_QUALITY: "Ask them to defend one changed file, line, or abstraction from their solution.",
    Competency.COMMUNICATION: "Ask for a concise walkthrough with assumptions, tradeoffs, and outcome.",
    Competency.LEARNING_ABILITY: "Ask what they would inspect or learn first if blocked.",
    Competency.ADAPTABILITY: "Ask what they changed after feedback, errors, or failing tests.",
    Competency.TIME_MANAGEMENT: "Ask how they scoped the work and chose where to spend time.",
    Competency.TESTING_MINDSET: "Ask for the exact test that proves the risky path now works.",
    Competency.PERFORMANCE_AWARENESS: "Ask how they measured runtime, query count, latency, or scale impact.",
    Competency.SECURITY_AWARENESS: "Ask what input, data, or access boundary could be abused and how they guarded it.",
    Competency.OWNERSHIP_COLLABORATION: "Ask what they would monitor, document, or hand off after shipping.",
}


class InterviewEvaluator:
    DEFAULT_RUBRIC_VERSION = "engineering_manager_v1.2"

    def __init__(self, rubric_version: str | None = None) -> None:
        self.rubric_version = rubric_version or self.DEFAULT_RUBRIC_VERSION

    def evaluate(self, session: InterviewSession) -> InterviewEvaluation:
        # Zero-gating: If candidate answered no questions, entire interview is unattempted
        if len(session.answers) == 0:
            scores = [
                CompetencyScore(
                    competency=comp,
                    score=0,
                    evidence=[
                        EvaluationEvidence(
                            source="system",
                            reference_id="unattempted",
                            note="Candidate did not provide any responses during the interview.",
                        )
                    ],
                    guidance="No interview answers were provided to evaluate this competency.",
                )
                for comp in Competency
            ]
            competency_coverages = [
                CompetencyCoverage(
                    competency=comp,
                    evidence_count=0,
                    status="missing",
                    score=0,
                    suggested_probe=COVERAGE_PROBES[comp],
                )
                for comp in Competency
            ]
            coverage = EvaluationCoverage(
                session_id=session.id,
                rubric_version=self.rubric_version,
                covered_competencies=0,
                total_competencies=len(Competency),
                coverage_percent=0.0,
                competencies=competency_coverages,
            )
            return InterviewEvaluation(
                session_id=session.id,
                rubric_version=self.rubric_version,
                overall_score=0.0,
                scores=scores,
                coverage=coverage,
                summary="The candidate did not answer any questions during the Vitarka interview session. Evidence coverage is 0/13 competencies (0.0%). Overall score: 0.0/10.",
                strengths=[],
                risks=["Candidate did not provide any responses during the interview."],
            )

        evidence_by_competency, adjustments = self._collect_evidence(session)
        scores = self._scores_from_evidence(evidence_by_competency, adjustments)
        coverage = self._coverage_from_scores(session.id, scores)
        overall = round(sum(score.score for score in scores) / len(scores), 1)
        strengths = [
            self._label(score.competency)
            for score in sorted(scores, key=lambda item: item.score, reverse=True)
            if score.score >= 7
        ][:3]
        risks = [
            self._label(score.competency)
            for score in sorted(scores, key=lambda item: item.score)
            if score.score <= 4
        ][:3]

        summary = (
            f"Evaluation is based on {len(session.observations)} assessment events and "
            f"{len(session.answers)} interview answers using rubric {self.rubric_version}. "
            f"Evidence coverage is {coverage.covered_competencies}/{coverage.total_competencies} "
            f"competencies ({coverage.coverage_percent}%). Overall score: {overall}/10."
        )

        return InterviewEvaluation(
            session_id=session.id,
            rubric_version=self.rubric_version,
            overall_score=overall,
            scores=scores,
            coverage=coverage,
            summary=summary,
            strengths=strengths,
            risks=risks,
        )

    def coverage(self, session: InterviewSession) -> EvaluationCoverage:
        evidence_by_competency, adjustments = self._collect_evidence(session)
        scores = self._scores_from_evidence(evidence_by_competency, adjustments)
        return self._coverage_from_scores(session.id, scores)

    def _collect_evidence(self, session: InterviewSession) -> tuple[CoverageEvidence, ScoreAdjustments]:
        evidence_by_competency: CoverageEvidence = defaultdict(list)
        adjustments: ScoreAdjustments = defaultdict(int)

        for event in session.observations:
            self._apply_event(event, evidence_by_competency, adjustments)

        for answer in session.answers:
            self._apply_answer(answer.id, answer.answer_text, answer.metadata, evidence_by_competency, adjustments)

        return evidence_by_competency, adjustments

    def _scores_from_evidence(
        self,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
    ) -> list[CompetencyScore]:
        return [
            self._score_competency(competency, evidence_by_competency, adjustments)
            for competency in Competency
        ]

    def _coverage_from_scores(
        self,
        session_id: str,
        scores: list[CompetencyScore],
    ) -> EvaluationCoverage:
        competencies: list[CompetencyCoverage] = []
        for score in scores:
            evidence_count = len(
                [
                    evidence
                    for evidence in score.evidence
                    if evidence.reference_id != "not_observed"
                ]
            )
            if evidence_count >= 3 and score.score >= 7:
                status = "strong"
            elif evidence_count > 0:
                status = "partial"
            else:
                status = "missing"
            competencies.append(
                CompetencyCoverage(
                    competency=score.competency,
                    evidence_count=evidence_count,
                    status=status,
                    score=score.score,
                    suggested_probe=COVERAGE_PROBES[score.competency],
                )
            )

        covered = sum(1 for item in competencies if item.evidence_count > 0)
        total = len(competencies)
        return EvaluationCoverage(
            session_id=session_id,
            rubric_version=self.rubric_version,
            covered_competencies=covered,
            total_competencies=total,
            coverage_percent=round((covered / total) * 100, 1),
            competencies=competencies,
        )

    def _apply_answer(
        self,
        answer_id: str,
        answer_text: str,
        metadata: dict,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
    ) -> None:
        normalized = answer_text.lower()
        answer_length = len(answer_text.split())
        if metadata.get("answer_quality") == "unknown" or self._looks_unknown(normalized):
            adjustments[Competency.COMMUNICATION] -= 1
            adjustments[Competency.LEARNING_ABILITY] -= 1
            evidence_by_competency[Competency.COMMUNICATION].append(
                EvaluationEvidence(
                    source="answer",
                    reference_id=answer_id,
                    note="Candidate said they did not know and required a reframed prompt.",
                )
            )
            return

        for competency, keywords in ANSWER_KEYWORDS.items():
            if any(keyword in normalized for keyword in keywords):
                evidence_by_competency[competency].append(
                    EvaluationEvidence(
                        source="answer",
                        reference_id=answer_id,
                        note=self._answer_note(answer_text),
                    )
                )
                adjustments[competency] += 1

        if answer_length >= 40:
            adjustments[Competency.COMMUNICATION] += 1
            evidence_by_competency[Competency.COMMUNICATION].append(
                EvaluationEvidence(
                    source="answer",
                    reference_id=answer_id,
                    note="Candidate provided a detailed verbal explanation.",
                )
            )
        elif answer_length < 12:
            adjustments[Competency.COMMUNICATION] -= 1
            evidence_by_competency[Competency.COMMUNICATION].append(
                EvaluationEvidence(
                    source="answer",
                    reference_id=answer_id,
                    note="Candidate response was brief and may need clarification.",
                )
            )

    def _apply_event(
        self,
        event: AssessmentEvent,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
    ) -> None:
        competencies = EVENT_COMPETENCY_EVIDENCE[event.event_type]
        for competency in competencies:
            evidence_by_competency[competency].append(
                EvaluationEvidence(
                    source="event",
                    reference_id=event.id,
                    note=f"{event.event_type.value}: {event.summary}",
                )
            )
            adjustments[competency] += 1

        if event.event_type == EventType.TEST_RUN:
            result = str(event.details.get("result") or event.details.get("status") or "").lower()
            if any(token in result for token in ("pass", "success", "green")):
                adjustments[Competency.TESTING_MINDSET] += 2
                adjustments[Competency.CODE_QUALITY] += 1
            elif any(token in result for token in ("fail", "error", "red")):
                adjustments[Competency.TESTING_MINDSET] += 1

        if event.event_type == EventType.MCQ_ANSWERED:
            is_correct = event.details.get("is_correct")
            skipped = event.details.get("skipped")
            used_hint = event.details.get("used_hint")
            if is_correct is True:
                adjustments[Competency.TECHNICAL_KNOWLEDGE] += 2
            elif is_correct is False:
                adjustments[Competency.TECHNICAL_KNOWLEDGE] -= 1
            if skipped:
                adjustments[Competency.TIME_MANAGEMENT] -= 1
            if used_hint:
                adjustments[Competency.LEARNING_ABILITY] += 1

        if event.event_type == EventType.TIME_SPENT:
            duration = event.duration_seconds or event.details.get("duration_seconds") or 0
            if isinstance(duration, int | float) and duration > 900:
                adjustments[Competency.TIME_MANAGEMENT] -= 1

        code_insights = event.details.get("code_insights")
        if isinstance(code_insights, dict):
            self._apply_code_insights(event, code_insights, evidence_by_competency, adjustments)

    def _score_competency(
        self,
        competency: Competency,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
    ) -> CompetencyScore:
        evidence = evidence_by_competency.get(competency, [])
        if evidence:
            raw_score = 5 + min(3, len(evidence)) + adjustments[competency]
            guidance = "Supported by observed assessment behaviour and interview answers."
        else:
            raw_score = 0
            evidence = [
                EvaluationEvidence(
                    source="system",
                    reference_id="not_observed",
                    note="No direct evidence captured for this competency.",
                )
            ]
            guidance = "No evidence observed for this competency."

        return CompetencyScore(
            competency=competency,
            score=max(0, min(10, raw_score)),
            evidence=evidence[:4],
            guidance=guidance,
        )

    def _apply_code_insights(
        self,
        event: AssessmentEvent,
        code_insights: dict,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
    ) -> None:
        changed_files = self._as_list(code_insights.get("changed_files"))
        if changed_files:
            file_note = f"Candidate changed files: {', '.join(changed_files[:5])}."
            self._add_code_evidence(
                evidence_by_competency,
                Competency.ENGINEERING_DECISION_MAKING,
                event.id,
                file_note,
            )
            adjustments[Competency.ENGINEERING_DECISION_MAKING] += 1

        self._add_code_evidence(
            evidence_by_competency,
            Competency.CODE_QUALITY,
            event.id,
            code_insights.get("patch_summary") or "Candidate implementation was available for review.",
        )
        adjustments[Competency.CODE_QUALITY] += 1

        correctness_concerns = self._as_list(
            code_insights.get("candidate_correctness_concerns")
            or code_insights.get("solution_contrast")
        )
        if correctness_concerns:
            self._add_code_evidence(
                evidence_by_competency,
                Competency.PROBLEM_SOLVING,
                event.id,
                "; ".join(correctness_concerns[:2]),
            )
            adjustments[Competency.PROBLEM_SOLVING] -= 1
            adjustments[Competency.CODE_QUALITY] -= 1

        performance_concerns = self._as_list(
            code_insights.get("performance_concerns")
            or code_insights.get("candidate_performance_concerns")
            or code_insights.get("candidate_complexity_concerns")
        )
        if performance_concerns:
            self._add_code_evidence(
                evidence_by_competency,
                Competency.PERFORMANCE_AWARENESS,
                event.id,
                "; ".join(performance_concerns[:2]),
            )
            adjustments[Competency.PERFORMANCE_AWARENESS] -= 1

        security_concerns = self._as_list(
            code_insights.get("security_concerns") or code_insights.get("candidate_security_concerns")
        )
        if security_concerns:
            self._add_code_evidence(
                evidence_by_competency,
                Competency.SECURITY_AWARENESS,
                event.id,
                "; ".join(security_concerns[:2]),
            )
            adjustments[Competency.SECURITY_AWARENESS] -= 1

        if code_insights.get("framework_choices") or code_insights.get("candidate_framework_choices"):
            self._add_code_evidence(
                evidence_by_competency,
                Competency.TECHNICAL_KNOWLEDGE,
                event.id,
                "Candidate used framework-specific implementation choices in submitted code.",
            )
            adjustments[Competency.TECHNICAL_KNOWLEDGE] += 1

    def _add_code_evidence(
        self,
        evidence_by_competency: CoverageEvidence,
        competency: Competency,
        reference_id: str,
        note: str,
    ) -> None:
        evidence_by_competency[competency].append(
            EvaluationEvidence(
                source="code",
                reference_id=reference_id,
                note=f"Code evidence: {note}",
            )
        )

    def _as_list(self, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        return [str(value)]

    def _answer_note(self, answer_text: str) -> str:
        normalized = re.sub(r"\s+", " ", answer_text.strip())
        if len(normalized) <= 140:
            return f"Answer evidence: {normalized}"
        return f"Answer evidence: {normalized[:137]}..."

    def _looks_unknown(self, normalized_answer: str) -> bool:
        normalized = re.sub(r"[^a-z0-9\s']", " ", normalized_answer.replace("dont", "don't"))
        normalized = " ".join(normalized.split())
        return normalized in {
            "don't know",
            "do not know",
            "i don't know",
            "i do not know",
            "idk",
            "no idea",
            "not sure",
            "pass",
            "skip",
        }

    def _label(self, competency: Competency) -> str:
        return competency.value.replace("_", " ").title()
