"""
AI-Powered Insights Service for Contest Analytics
Generates personalized insights using AI for students, colleges, and contests.
"""
import asyncio
import json
from typing import Dict, List, Any
from django.conf import settings
from ai_assistant.services import AIServiceFactory, AIServiceError


class ContestAIInsightsService:
    """Service for generating AI-powered insights for contest analytics."""

    def __init__(self):
        """Initialize the AI service."""
        self.provider = "gemini"
        self.model_name = "gemini-2.5-flash"
        
    async def generate_student_insights(
        self,
        student_analytics: Dict[str, Any],
        contest_title: str,
    ) -> Dict[str, Any]:
        """
        Generate personalized AI insights for a student's contest performance.
        
        Args:
            student_analytics: Complete analytics data from ContestAnalyticsService
            contest_title: Title of the contest
            
        Returns:
            Dictionary containing AI-generated insights
        """
        try:
            # Create AI service
            ai_service = AIServiceFactory.create_service(self.provider, self.model_name)
            
            # Prepare the prompt with student data
            prompt = self._build_student_insights_prompt(student_analytics, contest_title)
            
            # Generate insights
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert educational AI assistant specializing in analyzing student performance in coding contests and technical assessments. Provide constructive, encouraging, and actionable insights."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = await ai_service.generate_response(
                messages=messages,
                temperature=0.7,
                max_tokens=1500
            )
            
            # Parse the AI response
            insights = self._parse_student_insights(response.get("content", ""))
            
            return insights
            
        except AIServiceError as e:
            # Return user-friendly error message instead of fallback
            return {
                "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                "ai_generated": False
            }
        except Exception as e:
            # Return user-friendly error message for any other errors
            return {
                "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                "ai_generated": False
            }

    def _build_student_insights_prompt(
        self, analytics: Dict[str, Any], contest_title: str
    ) -> str:
        """Build the prompt for AI to generate student insights."""
        perf = analytics.get("performance_overview", {})
        topics = analytics.get("topic_performance", [])
        difficulty = analytics.get("difficulty_analysis", {})
        time = analytics.get("time_analysis", {})
        behavioral = analytics.get("behavioral_insights", {})
        
        # Identify strengths and weaknesses
        strong_topics = [t for t in topics if t.get("vs_average", 0) > 10][:3]
        weak_topics = [t for t in topics if t.get("vs_average", 0) < -10][:3]
        
        # Determine if student passed or failed
        passing_percentage = 40  # Typical passing threshold
        did_pass = perf.get('percentage', 0) >= passing_percentage
        performance_level = "excellent" if perf.get('percentage', 0) >= 80 else "good" if perf.get('percentage', 0) >= 60 else "needs improvement"
        
        prompt = f"""Analyze this student's performance in the "{contest_title}" contest and provide comprehensive, personalized insights.

**Performance Summary:**
- Score: {perf.get('score')}/{perf.get('max_score')} ({perf.get('percentage')}%)
- Result: {"PASSED" if did_pass else "NEEDS IMPROVEMENT"}
- Rank: #{perf.get('rank')} out of {perf.get('total_participants')} participants
- Percentile: {perf.get('percentile')}%
- vs Contest Average: {perf.get('vs_contest_avg'):+.1f} pts
{f"- vs College Average: {perf.get('vs_college_avg'):+.1f} pts" if perf.get('vs_college_avg') is not None else ""}

**Topic Performance:**
Strong Topics:
{chr(10).join([f"- {t['topic']}: {t['accuracy']:.1f}% accuracy, {t['vs_average']:+.1f}% vs average" for t in strong_topics]) if strong_topics else "- None identified"}

Weak Topics:
{chr(10).join([f"- {t['topic']}: {t['accuracy']:.1f}% accuracy, {t['vs_average']:+.1f}% vs average" for t in weak_topics]) if weak_topics else "- None identified"}

**Difficulty Analysis:**
- Easy: {difficulty.get('easy', {}).get('correct', 0)}/{difficulty.get('easy', {}).get('total', 0)} ({difficulty.get('easy', {}).get('percentage', 0):.1f}%)
- Medium: {difficulty.get('medium', {}).get('correct', 0)}/{difficulty.get('medium', {}).get('total', 0)} ({difficulty.get('medium', {}).get('percentage', 0):.1f}%)
- Hard: {difficulty.get('hard', {}).get('correct', 0)}/{difficulty.get('hard', {}).get('total', 0)} ({difficulty.get('hard', {}).get('percentage', 0):.1f}%)

**Time Management:**
- Time used: {time.get('total_time_minutes', 0):.1f} / {time.get('allocated_time_minutes', 0)} minutes
- Avg time per question: {time.get('avg_time_per_question_minutes', 0):.1f} minutes
- Time efficiency: {time.get('time_efficiency_percentage', 0):.1f}%
- Time pressure: {"High - rushed through questions" if time.get('time_efficiency_percentage', 0) > 95 else "Moderate - good pacing" if time.get('time_efficiency_percentage', 0) > 70 else "Low - had time to spare"}

**Integrity & Behavior:**
- Integrity score: {behavioral.get('integrity_score', 100)}/100
- Tab switches: {behavioral.get('tab_switches', 0)}
- Focus loss events: {behavioral.get('focus_loss_count', 0)}
- Violations: {behavioral.get('violation_count', 0)}
- Assessment: {"Clean - No integrity issues" if behavioral.get('integrity_score', 100) >= 90 else "Some concerns detected" if behavioral.get('integrity_score', 100) >= 70 else "Multiple violations detected"}

Please provide comprehensive, actionable insights in JSON format:
{{
  "why_this_result": "2-3 sentences explaining the PRIMARY reasons for their performance (pass/fail). Be specific about what led to this outcome.",
  "strengths": ["3-4 specific strengths with examples from their performance"],
  "weaknesses": ["3-4 specific weaknesses that need immediate attention"],
  "what_to_improve": ["4-5 concrete areas to focus on, prioritized by impact"],
  "how_to_improve_timing": ["3-4 specific time management strategies based on their performance"],
  "integrity_feedback": "1-2 sentences about their academic integrity behavior. If violations exist, address them constructively. If clean, acknowledge it positively.",
  "recommendations": ["4-5 actionable next steps they should take"],
  "learning_path": ["4-5 step-by-step actions to improve, in order of priority"],
  "motivational_message": "A personalized, encouraging 2-3 sentence message that acknowledges their effort and inspires improvement",
  "comparison_insight": "2 sentences comparing their performance to peers and what it means"
}}

CRITICAL GUIDELINES:
1. Be SPECIFIC - mention actual topics, question types, and numbers from their data
2. Be HONEST but CONSTRUCTIVE - if they failed, explain why clearly but encouragingly
3. Be ACTIONABLE - every recommendation should be something they can do immediately
4. Address TIME MANAGEMENT explicitly if they rushed or had too much time left
5. Address INTEGRITY issues directly if violations exist, but constructively
6. If they did well, celebrate it but still provide growth areas
7. Make the "why_this_result" section the most important - students need to understand WHY
8. Keep each point concise but meaningful (1-2 sentences)
"""
        
        return prompt

    def _parse_student_insights(self, ai_response: str) -> Dict[str, Any]:
        """Parse the AI response into structured insights."""
        try:
            # Try to extract JSON from the response
            # AI might wrap it in markdown code blocks
            response_text = ai_response.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            insights = json.loads(response_text)
            
            # Validate required fields
            required_fields = [
                "strengths", "weaknesses", "recommendations",
                "learning_path", "motivational_message", "comparison_insight"
            ]
            
            for field in required_fields:
                if field not in insights:
                    insights[field] = []
            
            return insights
            
        except json.JSONDecodeError:
            # If JSON parsing fails, return error
            return {
                "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                "ai_generated": False
            }

    def _extract_insights_from_text(self, text: str) -> Dict[str, Any]:
        """Extract insights from unstructured text response."""
        # Return error instead of fallback
        return {
            "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
            "ai_generated": False
        }

    async def generate_college_insights(
        self,
        college_analytics: Dict[str, Any],
        contest_title: str,
    ) -> Dict[str, Any]:
        """
        Generate AI-powered insights for a college's contest performance.
        """
        try:
            ai_service = AIServiceFactory.create_service(self.provider, self.model_name)

            overview = college_analytics.get("college_overview", {})
            departments = college_analytics.get("department_breakdown", [])
            topics = college_analytics.get("topic_performance", [])
            integrity = college_analytics.get("integrity_metrics", {})

            strong_topics = [t for t in topics if t.get("vs_average", 0) > 5][:3]
            weak_topics = [t for t in topics if t.get("vs_average", 0) < -5][:3]
            top_depts = sorted(departments, key=lambda d: d.get("average_score", 0), reverse=True)[:3]
            weak_depts = sorted(departments, key=lambda d: d.get("average_score", 0))[:2]

            prompt = f"""Analyze this college's performance in the "{contest_title}" contest and provide comprehensive institutional insights for faculty and administrators.

**College Overview:**
- College: {overview.get('college_name')}
- Rank: #{overview.get('college_rank')} out of {overview.get('total_colleges')} colleges
- Total Students: {overview.get('total_students')} ({overview.get('completed_students')} completed)
- Completion Rate: {overview.get('completion_rate'):.1f}%
- Average Score: {overview.get('average_score'):.1f} (Contest avg: {overview.get('contest_average'):.1f}, Difference: {overview.get('vs_contest_avg'):+.1f})
- Performance Status: {overview.get('performance_status')}

**Department Performance:**
Top Departments:
{chr(10).join([f"- {d['department_name']}: avg {d['average_score']:.1f}, {d['student_count']} students, {d['completion_rate']:.1f}% completion" for d in top_depts]) if top_depts else "- No department data"}

Weak Departments:
{chr(10).join([f"- {d['department_name']}: avg {d['average_score']:.1f}, {d['student_count']} students" for d in weak_depts]) if weak_depts and len(departments) > 1 else "- N/A"}

**Topic Performance:**
Strong Topics (above contest avg):
{chr(10).join([f"- {t['topic']}: {t['score_percentage']:.1f}% ({t['vs_average']:+.1f}% vs avg)" for t in strong_topics]) if strong_topics else "- None"}

Weak Topics (below contest avg):
{chr(10).join([f"- {t['topic']}: {t['score_percentage']:.1f}% ({t['vs_average']:+.1f}% vs avg)" for t in weak_topics]) if weak_topics else "- None"}

**Integrity:**
- Clean Submissions: {integrity.get('clean_percentage', 100):.1f}%
- Total Violations: {integrity.get('total_violations', 0)}

Provide institutional insights in JSON format:
{{
  "strengths": ["3-4 specific institutional strengths with data references"],
  "weaknesses": ["3-4 specific areas needing improvement with data references"],
  "recommendations": ["4-5 actionable recommendations for faculty/administrators"],
  "learning_path": ["4-5 concrete steps to improve institutional performance"],
  "motivational_message": "2-3 sentence encouraging message for the institution acknowledging their performance",
  "comparison_insight": "2 sentences comparing this college's performance to peers and what it means"
}}

Be specific, data-driven, and actionable. Reference actual departments, topics, and numbers."""

            messages = [
                {
                    "role": "system",
                    "content": "You are an expert educational data analyst specializing in institutional performance assessment. Provide constructive, data-driven insights for college administrators and faculty."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]

            response = await ai_service.generate_response(
                messages=messages,
                temperature=0.7,
                max_tokens=1500
            )

            content = response.get("content", "").strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            insights = json.loads(content)
            insights["ai_generated"] = True
            return insights

        except (AIServiceError, Exception):
            return {
                "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                "ai_generated": False
            }



def generate_student_insights_sync(
    student_analytics: Dict[str, Any],
    contest_title: str,
) -> Dict[str, Any]:
    """
    Synchronous wrapper for generating student insights.
    Can be called from Django views.
    """
    service = ContestAIInsightsService()
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(
            service.generate_student_insights(student_analytics, contest_title)
        )
    finally:
        loop.close()



def generate_college_insights_sync(
    college_analytics: Dict[str, Any],
    contest_title: str,
) -> Dict[str, Any]:
    """
    Synchronous wrapper for generating AI-powered college insights.
    """
    service = ContestAIInsightsService()
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(
            service.generate_college_insights(college_analytics, contest_title)
        )
    finally:
        loop.close()


async def generate_contest_insights(
    contest_data: Dict[str, Any],
    contest_title: str,
) -> Dict[str, Any]:
    """
    Generate AI-powered insights for overall contest performance.
    
    Args:
        contest_data: Complete contest report data
        contest_title: Title of the contest
        
    Returns:
        Dictionary containing AI-generated contest insights
    """
    try:
        ai_service = AIServiceFactory.create_service("gemini", "gemini-2.5-flash")
        
        summary = contest_data.get("summary", {})
        top_performers = contest_data.get("top_performers", [])[:5]
        college_breakdown = contest_data.get("college_breakdown", [])[:10]
        question_performance = contest_data.get("question_performance", [])
        
        # Identify hardest and easiest questions
        hardest_questions = sorted(question_performance, key=lambda x: x.get("correct_percentage", 100))[:3]
        easiest_questions = sorted(question_performance, key=lambda x: x.get("correct_percentage", 0), reverse=True)[:3]
        
        prompt = f"""Analyze this contest's overall performance and provide insights for the organizers.

**Contest: {contest_title}**

**Participation Metrics:**
- Total Registered: {summary.get('registered_count')}
- Total Attempted: {summary.get('attempted_count')}
- Completed: {summary.get('completed_count')}
- Completion Rate: {summary.get('completion_rate')}%

**Score Distribution:**
- Average Score: {summary.get('avg_marks')}/{summary.get('total_marks')} ({summary.get('avg_marks')/summary.get('total_marks')*100:.1f}%)
- Highest Score: {summary.get('max_marks')}
- Lowest Score: {summary.get('min_marks')}

**College Participation:**
- Total Colleges: {len(college_breakdown)}
- Top College Average: {college_breakdown[0].get('avg_marks') if college_breakdown else 0}
- Lowest College Average: {college_breakdown[-1].get('avg_marks') if college_breakdown else 0}

**Question Difficulty Analysis:**
Hardest Questions (lowest accuracy):
{chr(10).join([f"- {q['question_title']}: {q['correct_percentage']}% correct, {q['difficulty']} difficulty, {q['topic']} topic" for q in hardest_questions])}

Easiest Questions (highest accuracy):
{chr(10).join([f"- {q['question_title']}: {q['correct_percentage']}% correct, {q['difficulty']} difficulty, {q['topic']} topic" for q in easiest_questions])}

**Integrity:**
- Clean Submissions: {contest_data.get('integrity', {}).get('clean_percentage')}%
- Total Violations: {contest_data.get('integrity', {}).get('total_violations')}

Please provide:
1. **Contest Quality Assessment** (2-3 sentences): Overall quality, difficulty calibration, question balance
2. **Strengths** (3-4 bullet points): What worked well in this contest
3. **Areas for Improvement** (3-4 bullet points): What could be better
4. **Question Recommendations** (2-3 bullet points): Specific feedback on question difficulty and topics
5. **Future Contest Suggestions** (3-4 bullet points): Actionable recommendations for organizing better contests
6. **Participation Insights** (2 sentences): Analysis of participation and completion patterns

Format your response as JSON with these exact keys: quality_assessment, strengths, areas_for_improvement, question_recommendations, future_suggestions, participation_insights.
Each list should contain strings, and text fields should be strings."""

        messages = [
            {
                "role": "system",
                "content": "You are an expert contest organizer and educational assessment specialist. Provide constructive, data-driven insights to help improve future contests."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await ai_service.generate_response(
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        # Parse AI response
        content = response.get("content", "")
        
        # Try to extract JSON from the response
        try:
            # Remove markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            insights = json.loads(content)
            insights["ai_generated"] = True
            return insights
        except json.JSONDecodeError:
            # If JSON parsing fails, return error
            return {
                "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
                "ai_generated": False
            }
            
    except Exception as e:
        return {
            "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
            "ai_generated": False
        }


def generate_contest_insights_sync(
    contest_data: Dict[str, Any],
    contest_title: str,
) -> Dict[str, Any]:
    """Synchronous wrapper for generate_contest_insights."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(generate_contest_insights(contest_data, contest_title))
    except Exception:
        return {
            "error": "We're sorry for the inconvenience. AI insights are temporarily unavailable. Please try again later.",
            "ai_generated": False
        }
    finally:
        loop.close()

