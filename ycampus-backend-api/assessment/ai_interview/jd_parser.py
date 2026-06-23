import logging

from assessment.ai_interview.config import settings
from assessment.ai_interview.llm_client import get_llm_client
from assessment.ai_interview.prompts import JD_PARSING_PROMPT
from assessment.ai_interview.schemas.job_description import JDRequirements
from assessment.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


async def parse_jd(jd_text: str) -> JDRequirements:
    """Parse a job description into structured requirements.

    Args:
        jd_text: Raw job description text.

    Returns:
        JDRequirements with title, skills, experience, qualifications, etc.
    """
    client = get_llm_client()

    prompt = JD_PARSING_PROMPT.format(
        jd_text=jd_text[: settings.MAX_JD_CHARS],
    )

    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("JD parsing attempt %d/%d", attempt, MAX_RETRIES)

            response = await client.generate(
                prompt=prompt,
                system_prompt="You are an HR analyst. Parse job descriptions precisely. Return only valid JSON.",
                max_tokens=settings.MAX_OUTPUT_TOKENS_JD,
            )

            data = parse_json_response(response)
            requirements = JDRequirements(**data)
            logger.info(
                "JD parsed: title='%s', %d required skills",
                requirements.title,
                len(requirements.required_skills),
            )
            return requirements

        except Exception as exc:
            logger.warning("JD parsing attempt %d failed: %s", attempt, exc)
            last_error = exc

    raise ValueError(f"JD parsing failed after {MAX_RETRIES} attempts: {last_error}")
