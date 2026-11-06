import logging

from mockinterviews.ai_interview.config import settings
from mockinterviews.ai_interview.llm_client import get_llm_client
from mockinterviews.ai_interview.prompts import SKILL_EXTRACTION_PROMPT
from mockinterviews.ai_interview.schemas.job_description import ExtractedSkill, SkillProfile
from mockinterviews.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


async def extract_skills(resume_text: str) -> SkillProfile:
    """Extract all skills from resume text.

    Args:
        resume_text: Plain-text resume content.

    Returns:
        SkillProfile with list of ExtractedSkill and summary.
    """
    client = get_llm_client()

    prompt = SKILL_EXTRACTION_PROMPT.format(
        resume_text=resume_text[: settings.MAX_RESUME_CHARS],
    )

    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("Skill extraction attempt %d/%d", attempt, MAX_RETRIES)

            response = await client.generate(
                prompt=prompt,
                system_prompt="You are a technical recruiter. Extract skills precisely. Return only valid JSON.",
                max_tokens=settings.MAX_OUTPUT_TOKENS_SKILL,
            )

            data = parse_json_response(response)
            profile = SkillProfile(**data)
            logger.info("Extracted %d skills", len(profile.skills))
            return profile

        except Exception as exc:
            logger.warning(
                "Skill extraction attempt %d failed. Error: %s. Response preview: %s...", 
                attempt, 
                exc, 
                str(response)[:100] if 'response' in locals() else "None"
            )
            last_error = exc

    raise ValueError(f"Skill extraction failed after {MAX_RETRIES} attempts: {last_error}")
