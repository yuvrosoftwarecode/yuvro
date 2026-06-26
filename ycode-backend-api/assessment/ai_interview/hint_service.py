import logging
from asgiref.sync import sync_to_async

from assessment.ai_interview.config import settings
from assessment.ai_interview.llm_client import get_llm_client
from assessment.ai_interview.prompts import HINT_PROMPT
from assessment.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)


async def generate_hint(
    session_id: str,
    question_id: int,
    question: str,
    topic: str,
    partial_answer: str = "",
) -> dict:
    """Generate an adaptive hint for an interview question.

    Automatically escalates hint level on repeated requests.
    Returns dict with hint text, level, and remaining count.

    Args:
        session_id: Active session ID (MockInterviewSubmission UUID).
        question_id: Question being hinted.
        question: The question text.
        topic: The skill/domain area.
        partial_answer: Candidate's partial answer so far.

    Returns:
        Dict with hint, hint_level, hints_remaining.
    """
    from assessment.models import MockInterviewSubmission
    submission = await sync_to_async(MockInterviewSubmission.objects.get)(id=session_id)
    state = submission.state_data or {}

    hint_key = f"_hints_{question_id}"
    hint_count = state.get(hint_key, 0)

    max_hints = settings.MAX_HINTS_PER_QUESTION

    if hint_count >= max_hints:
        logger.info("Max hints reached for question %d", question_id)
        return {
            "hint": "No more hints available for this question. Give it your best shot!",
            "hint_level": max_hints,
            "hints_remaining": 0,
        }

    hint_level = min(hint_count + 1, 3)

    client = get_llm_client()

    prompt = HINT_PROMPT.format(
        question=question,
        topic=topic,
        hint_level=hint_level,
        partial_answer=partial_answer[:500] if partial_answer else "No answer yet",
    )

    logger.info(
        "Generating hint: question=%d, level=%d, has_partial=%s",
        question_id,
        hint_level,
        bool(partial_answer),
    )

    response = await client.generate(
        prompt=prompt,
        system_prompt="You are a helpful interview coach. Return only valid JSON.",
        max_tokens=settings.MAX_OUTPUT_TOKENS_HINT,
    )

    result = parse_json_response(response)
    hint_text = result.get("hint", "Think about the core concepts related to this topic.")

    new_count = hint_count + 1
    state[hint_key] = new_count
    submission.state_data = state
    await sync_to_async(submission.save)(update_fields=["state_data"])

    return {
        "hint": hint_text,
        "hint_level": hint_level,
        "hints_remaining": max(0, max_hints - new_count),
    }
