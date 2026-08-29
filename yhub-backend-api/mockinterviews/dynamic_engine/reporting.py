from __future__ import annotations

from mockinterviews.dynamic_engine.models import (
    EvaluationEvidence,
    InterviewEvaluation,
    InterviewReport,
    InterviewSession,
    InterviewTranscriptItem,
    ReportCompetencySummary,
)
from mockinterviews.dynamic_engine.evaluator import InterviewEvaluator
from mockinterviews.dynamic_engine.llm import InterviewLLM


class InterviewReportService:
    def __init__(
        self,
        *,
        evaluator: InterviewEvaluator | None = None,
        llm_client: InterviewLLM | None = None,
    ) -> None:
        self.evaluator = evaluator or InterviewEvaluator()
        self.llm_client = llm_client

    def create_report(self, session: InterviewSession) -> InterviewReport:
        evaluation = self.evaluator.evaluate(session)
        narrative = (
            self.llm_client.generate_report_narrative(session, evaluation)
            if self.llm_client is not None
            else None
        )
        recommendation = (
            narrative.recommendation if narrative is not None else self._recommendation(evaluation)
        )
        executive_summary = (
            narrative.executive_summary if narrative is not None else self._executive_summary(session, evaluation)
        )
        strengths = narrative.strengths[:5] if narrative is not None else evaluation.strengths
        risks = narrative.risks[:5] if narrative is not None else evaluation.risks
        competency_summaries = [
            ReportCompetencySummary(
                competency=score.competency,
                score=score.score,
                guidance=score.guidance,
                evidence=score.evidence,
            )
            for score in evaluation.scores
        ]
        evidence_highlights = self._evidence_highlights(evaluation)
        transcript = self._transcript(session)

        markdown = self._markdown(
            session=session,
            evaluation=evaluation,
            recommendation=recommendation,
            executive_summary=executive_summary,
            strengths=strengths,
            risks=risks,
            competency_summaries=competency_summaries,
            evidence_highlights=evidence_highlights,
            transcript=transcript,
        )

        return InterviewReport(
            session_id=session.id,
            candidate_id=session.candidate.candidate_id,
            target_role=session.candidate.target_role,
            mode=session.mode,
            status=session.status,
            overall_score=evaluation.overall_score,
            recommendation=recommendation,
            executive_summary=executive_summary,
            strengths=strengths,
            risks=risks,
            competency_summaries=competency_summaries,
            evidence_highlights=evidence_highlights,
            transcript=transcript,
            markdown=markdown,
        )

    def _recommendation(self, evaluation: InterviewEvaluation) -> str:
        if evaluation.overall_score >= 8:
            return "Strong proceed"
        if evaluation.overall_score >= 6:
            return "Proceed"
        if evaluation.overall_score >= 4:
            return "Needs review"
        return "Do not proceed"

    def _executive_summary(
        self,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
    ) -> str:
        role = session.candidate.target_role or "the target role"
        strengths = ", ".join(evaluation.strengths) if evaluation.strengths else "no dominant strengths yet"
        risks = ", ".join(evaluation.risks) if evaluation.risks else "no major evidence gaps"
        return (
            f"Candidate {session.candidate.candidate_id} completed a {session.mode.value} "
            f"engineering interview for {role}. The evidence-backed overall score is "
            f"{evaluation.overall_score}/10. Main strengths: {strengths}. Main risks or "
            f"evidence gaps: {risks}."
        )

    def _evidence_highlights(self, evaluation: InterviewEvaluation) -> list[EvaluationEvidence]:
        highlights: list[EvaluationEvidence] = []
        for score in sorted(evaluation.scores, key=lambda item: item.score, reverse=True):
            for evidence in score.evidence:
                if evidence.reference_id == "not_observed":
                    continue
                highlights.append(evidence)
                if len(highlights) >= 8:
                    return highlights
        return highlights

    def _transcript(self, session: InterviewSession) -> list[InterviewTranscriptItem]:
        answers_by_question_id = {answer.question_id: answer for answer in session.answers}
        transcript = []
        for question in session.questions:
            answer = answers_by_question_id.get(question.id)
            transcript.append(
                InterviewTranscriptItem(
                    question_id=question.id,
                    question=question.prompt,
                    question_kind=question.kind,
                    answer_id=answer.id if answer else None,
                    answer=answer.answer_text if answer else None,
                    competency_targets=question.competency_targets,
                )
            )
        return transcript

    def _markdown(
        self,
        *,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
        recommendation: str,
        executive_summary: str,
        strengths: list[str],
        risks: list[str],
        competency_summaries: list[ReportCompetencySummary],
        evidence_highlights: list[EvaluationEvidence],
        transcript: list[InterviewTranscriptItem],
    ) -> str:
        lines = [
            "# Vitarka Interview Report",
            "",
            f"Candidate: {session.candidate.candidate_id}",
            f"Role: {session.candidate.target_role or 'Not specified'}",
            f"Mode: {session.mode.value}",
            f"Overall score: {evaluation.overall_score}/10",
            f"Recommendation: {recommendation}",
            "",
            "## Executive Summary",
            executive_summary,
            "",
            "## Strengths",
        ]
        lines.extend(self._list_lines(strengths))
        lines.extend(["", "## Risks And Evidence Gaps"])
        lines.extend(self._list_lines(risks))
        lines.extend(["", "## Competency Scores"])
        for summary in competency_summaries:
            label = summary.competency.value.replace("_", " ").title()
            lines.append(f"- {label}: {summary.score}/10 - {summary.guidance}")

        lines.extend(["", "## Evidence Highlights"])
        if evidence_highlights:
            for evidence in evidence_highlights:
                lines.append(f"- [{evidence.source}:{evidence.reference_id}] {evidence.note}")
        else:
            lines.append("- No high-confidence evidence highlights captured yet.")

        lines.extend(["", "## Interview Transcript"])
        if transcript:
            for item in transcript:
                lines.append(f"- Q: {item.question}")
                lines.append(f"  A: {item.answer or 'No answer recorded.'}")
        else:
            lines.append("- No interview questions were recorded.")

        return "\n".join(lines)

    def _list_lines(self, values: list[str]) -> list[str]:
        if not values:
            return ["- None captured yet."]
        return [f"- {value}" for value in values]

