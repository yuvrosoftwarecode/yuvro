import logging
from collections import defaultdict

from mockinterviews.ai_interview.config import settings
from mockinterviews.ai_interview.llm_client import get_llm_client
from mockinterviews.ai_interview.prompts import REPORT_GENERATION_PROMPT
from mockinterviews.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


async def generate_report(session: dict) -> dict:
    """Generate a comprehensive interview report from session data.

    Args:
        session: Full session dict containing analysis, interview, answers.

    Returns:
        Dict matching the InterviewReport schema.
    """
    analysis = session.get("analysis", {})
    questions = session.get("interview", []) or []
    answers = session.get("answers", {})

    if not answers:
        raise ValueError(
            "No interview answers were recorded. "
            "Please ensure your microphone is working and you are speaking clearly during the interview."
        )

    scores = []
    topic_scores = defaultdict(list)
    evaluations_text_parts = []

    for q in questions:
        qid = q.get("id")
        answer_data = answers.get(qid) or answers.get(str(qid))
        if not answer_data:
            continue

        score = answer_data.get("score", 0)
        topic = q.get("topic", "General")
        scores.append(score)
        topic_scores[topic].append(score)

        evaluations_text_parts.append(
            f"Q{qid}: [{topic}] {q.get('question', '')[:100]}\n"
            f"  Score: {score}/10 | Feedback: {answer_data.get('feedback', 'N/A')}"
        )

    if not scores:
        raise ValueError("No evaluated answers found. Submit answers before generating report.")

    avg_score = sum(scores) / len(scores)

    topic_avgs = {t: sum(s) / len(s) for t, s in topic_scores.items()}
    best_topic = max(topic_avgs, key=topic_avgs.get) if topic_avgs else "N/A"
    worst_topic = min(topic_avgs, key=topic_avgs.get) if topic_avgs else "N/A"

    evaluations_summary = "\n".join(evaluations_text_parts)

    client = get_llm_client()

    jd_reqs = analysis.get("_jd_requirements", {})
    position = jd_reqs.get("title", analysis.get("domain", "Unknown Position"))

    prompt = REPORT_GENERATION_PROMPT.format(
        candidate_name=analysis.get("candidate_name", "Unknown"),
        position=position,
        domain=analysis.get("domain", "General"),
        match_score=analysis.get("match_score", "N/A"),
        evaluations_summary=evaluations_summary,
        total_questions=len(questions),
        avg_score=f"{avg_score:.1f}",
        best_topic=f"{best_topic} ({topic_avgs.get(best_topic, 0):.1f}/10)",
        worst_topic=f"{worst_topic} ({topic_avgs.get(worst_topic, 0):.1f}/10)",
    )

    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("Report generation attempt %d/%d", attempt, MAX_RETRIES)

            response = await client.generate(
                prompt=prompt,
                system_prompt="You are a senior HR analyst. Generate a comprehensive, fair interview report. Return only valid JSON.",
                max_tokens=settings.MAX_OUTPUT_TOKENS_REPORT,
            )

            report = parse_json_response(response)
            logger.info(
                "Report generated: grade=%s, recommendation=%s",
                report.get("overall_grade", "N/A"),
                report.get("hiring_recommendation", "N/A"),
            )
            return report

        except Exception as exc:
            logger.warning("Report generation attempt %d failed: %s", attempt, exc)
            last_error = exc

    raise ValueError(f"Report generation failed after {MAX_RETRIES} attempts: {last_error}")
