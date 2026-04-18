import json
import logging
from typing import List, Dict, Any
from django.conf import settings
from ai_assistant.services import GeminiService, AIServiceError
from .models import PlannerCompany, PlannerRole, StudentPlan, StudentPlanTask
from core.models import StudentProfile

logger = logging.getLogger(__name__)

class PreparationPlanGenerator:
    """
    Service to generate personalized interview preparation plans using AI.
    """

    def __init__(self):
        # Using Gemini for plan generation
        from decouple import config
        api_key = config("GEMINI_API_KEY", default=None)
        if not api_key:
            raise AIServiceError("GEMINI_API_KEY not found. AI Plan generation required.")
        
        # Using gemini-2.0-flash-exp or similar high-quality model
        self.service = GeminiService(api_key, model_name="gemini-1.5-flash")

    async def generate_plan(
        self, 
        student_dept: str,
        student_semester: str,
        company_name: str,
        company_type: str,
        role_title: str,
        role_difficulty: str,
        duration_days: int, 
        daily_hours: int,
        topics: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Generate a detailed preparation plan for the given student and target.
        """
        
        prompt = f"""
        You are an expert Career Coach and Technical Interview Preparer.
        Your goal is to create a PERFECT day-by-day preparation plan for a student.

        STUDENT CONTEXT:
        - Department: {student_dept}
        - Semester: {student_semester}

        TARGET GOAL:
        - Company: {company_name} ({company_type})
        - Role: {role_title}
        - Difficulty: {role_difficulty}
        - Available Duration: {duration_days} days
        - Daily Study Time: {daily_hours} hours

        TOPICS TO COVER:
        {", ".join(topics)}

        INSTRUCTIONS:
        1. Create a task for EVERY SINGLE DAY from Day 1 to Day {duration_days}.
        2. Use only these three TASK TYPES:
           - "Topic": For mastering technical or behavioral concepts.
           - "Test": For practice tests or coding assessments.
           - "Mock": For mock interview sessions.
        3. The plan should be progressive:
           - Early days: Foundational topics and core concepts.
           - Middle days: Advanced topics, specialized role-based skills, and practice tests.
           - Final days: Mock interviews, revision, and company-specific preparation.
        4. Adjust the depth and complexity based on the student's semester and the target role's difficulty.
        5. DO NOT provide any conversational text. RETURN ONLY RAW JSON.

        OUTPUT FORMAT (JSON List):
        [
            {{
                "day_number": 1,
                "title": "Introduction to [Topic] and foundational concepts",
                "task_type": "Topic",
                "reference_id": "<one of the provided topic names if applicable, else null>"
            }},
            ...
            {{
                "day_number": {duration_days},
                "title": "Final Mock Interview for {company_name}",
                "task_type": "Mock",
                "reference_id": null
            }}
        ]
        """

        try:
            response = await self.service.generate_response(
                [{"role": "user", "content": prompt}],
                temperature=0.3, # Low temperature for consistent JSON structure
                max_tokens=8000
            )

            response_text = response["response"]
            
            # Clean up potential markdown formatting
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            try:
                tasks = json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback: extract just the array if there is surrounding text
                start_idx = response_text.find('[')
                end_idx = response_text.rfind(']') + 1
                if start_idx != -1 and end_idx != 0:
                    response_text = response_text[start_idx:end_idx]
                    tasks = json.loads(response_text)
                else:
                    raise
            
            # Basic validation to ensure it's a list and has required fields
            if not isinstance(tasks, list):
                raise AIServiceError("AI returned invalid plan format (not a list)")
            
            # Ensure we have tasks for expected range (at least some tasks)
            if len(tasks) == 0:
                raise AIServiceError("AI returned an empty plan")

            return tasks

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI Plan JSON: {str(e)}")
            logger.debug(f"Raw response: {response_text}")
            raise AIServiceError("Failed to generate a valid preparation plan format.")
        except Exception as e:
            logger.error(f"Plan generation error: {str(e)}")
            raise e
