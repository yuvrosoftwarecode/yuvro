"""Prompt templates for all LLM interactions.

Conventions:
    - Every template uses {placeholders} filled at call-site.
    - Output spec is JSON so the LLM returns machine-parseable results.
    - Keep prompts short to stay within token budgets.
"""

SKILL_EXTRACTION_PROMPT = """\
Extract all technical and soft skills from the following resume text.

=== RESUME ===
{resume_text}

Return ONLY a valid JSON object:
{{
  "skills": [
    {{
      "skill": "<skill name>",
      "category": "<technical | soft | tool | framework | language | certification | domain>",
      "proficiency": "<beginner | intermediate | advanced>",
      "years_experience": <number or null>,
      "context": "<very brief context (4-6 words)>"
    }}
  ],
  "summary": "<one-line summary of candidate's skill profile>"
}}

Rules:
- Extract EVERY skill mentioned, including implicit ones (e.g. "led a team" -> Leadership).
- Estimate proficiency from context clues (years, depth of usage, seniority).
- Be exhaustive but avoid duplicates.
"""


JD_PARSING_PROMPT = """\
Parse the following job description into structured requirements.

=== JOB DESCRIPTION ===
{jd_text}

Return ONLY a valid JSON object:
{{
  "title": "<job title>",
  "company": "<company name or empty string>",
  "experience_required": {{
    "min_years": <number or null>,
    "max_years": <number or null>,
    "level": "<junior | mid | senior | lead | principal>"
  }},
  "required_skills": [
    {{
      "skill": "<skill name>",
      "category": "<technical | soft | tool | framework | language | certification | domain>",
      "importance": "<must-have | preferred | nice-to-have>"
    }}
  ],
  "responsibilities": ["<responsibility 1>", "<responsibility 2>"],
  "qualifications": ["<qualification 1>", "<qualification 2>"],
  "domain": "<primary domain e.g. Backend Engineering>",
  "summary": "<one-line JD summary>"
}}

Rules:
- Distinguish must-have vs preferred vs nice-to-have skills.
- Extract ALL skills including those implied by responsibilities.
- If experience years are not explicit, infer from seniority level.
"""


RESUME_EXTRACTION_PROMPT = """\
Analyze the following resume against the job description.

=== RESUME ===
{resume_text}

=== JOB DESCRIPTION ===
{jd_text}

=== EXTRACTED RESUME SKILLS ===
{resume_skills}

=== PARSED JD REQUIREMENTS ===
{jd_requirements}

Return ONLY a valid JSON object:
{{
  "candidate_name": "<string or empty>",
  "experience_years": <number or null>,
  "experience_level": "<junior | mid | senior | lead>",
  "domain": "<primary domain>",
  "skills": [
    {{
      "skill": "<skill name>",
      "found_in_resume": <true | false>,
      "proficiency": "<beginner | intermediate | advanced | null>",
      "importance": "<must-have | preferred | nice-to-have>"
    }}
  ],
  "match_score": <float 0-100>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "summary": "<1-2 sentence recruiter summary>"
}}

Rules:
- Cross-reference extracted skills against JD requirements.
- match_score reflects overall alignment (skills + experience + domain).
- Be concise -- no commentary outside the JSON.
"""


INTERVIEW_GENERATION_PROMPT = """\
You are a technical interviewer.

Candidate profile:
{analysis_summary}

Difficulty: {difficulty}
Number of questions to generate: {num_questions}
Question IDs must start at: {start_id}

Generate interview questions as a JSON array:
[
  {{
    "id": <int>,
    "question": "<question text>",
    "topic": "<skill or domain area>",
    "difficulty": "<easy | medium | hard>",
    "question_type": "<technical | behavioral | coding | system_design>",
    "expected_points": ["<key point 1>", "<key point 2>"]
  }}
]

Focus on skills from the JD. Mix behavioral + technical questions.
Do not include the self-introduction question; the system asks it separately.
Each question must be meaningfully different in wording, topic, and expected points.
Return ONLY the JSON array.
"""


ADAPTIVE_QUESTION_PROMPT = """\
You are an adaptive technical interviewer.

Candidate profile:
{analysis_summary}

Interview progress:
- Questions asked so far: {questions_asked}
- Running average score: {avg_score}/10
- Topics covered: {topics_covered}
- Topics remaining: {topics_remaining}
- Performance trend: {trend}
- Base difficulty: {base_difficulty}
- Previous questions to avoid:
{previous_questions}

Generate exactly 1 next interview question. Adjust difficulty based on performance:
- avg_score >= 8: increase difficulty
- avg_score <= 4: decrease difficulty
- otherwise: maintain current level
- Do not repeat or rephrase any previous question.
- Do not ask for self-introduction; that is already handled.

Return ONLY a valid JSON object:
{{
  "id": {next_id},
  "question": "<question text>",
  "topic": "<skill or domain area from remaining topics>",
  "difficulty": "<easy | medium | hard>",
  "question_type": "<technical | behavioral | coding | system_design>",
  "expected_points": ["<key point 1>", "<key point 2>"],
  "reasoning": "<why this question was chosen given performance>"
}}
"""


EVALUATION_PROMPT = """\
Evaluate this interview answer.

Question: {question}
Question type: {question_type}
Expected points: {expected_points}
Answer processing note: {answer_note}
Candidate answer: {answer}

Return JSON:
{{
  "score": <int 1-10>,
  "feedback": "<2-3 sentence constructive feedback>",
  "covered_points": ["<points the candidate addressed>"],
  "missed_points": ["<points the candidate missed>"],
  "follow_up_suggestion": "<optional follow-up question to probe deeper>"
}}
"""


HINT_PROMPT = """\
Give a hint for this interview question.

Question: {question}
Topic: {topic}
Hint level: {hint_level} (1=vague nudge, 2=moderate guidance, 3=strong pointer)
Candidate's partial answer so far: {partial_answer}

Return JSON:
{{
  "hint": "<hint appropriate to the level>",
  "hint_level": {hint_level}
}}

Rules:
- Level 1: Very vague. Just point them in the right direction.
- Level 2: Mention a relevant concept or approach without details.
- Level 3: Give a specific pointer that nearly reveals the answer structure.
- If partial_answer is provided, tailor the hint to what they're missing.
"""


REPORT_GENERATION_PROMPT = """\
Generate a comprehensive interview performance report.
Always use gender-neutral pronouns (they/them/their/theirs) when referring to the candidate. Never use gendered pronouns like he/him/his or she/her/hers because candidate gender is unspecified.

Candidate: {candidate_name}
Position: {position}
Domain: {domain}

Resume-JD Match Score: {match_score}%

Questions and Evaluations:
{evaluations_summary}

Overall Statistics:
- Total questions: {total_questions}
- Average score: {avg_score}/10
- Highest topic: {best_topic}
- Lowest topic: {worst_topic}

Return ONLY a valid JSON object:
{{
  "overall_score": <float 0-100>,
  "overall_grade": "<A+ | A | B+ | B | C+ | C | D | F>",
  "executive_summary": "<3-4 sentence summary for hiring manager using gender-neutral pronouns (they/them/their)>",
  "strengths": ["<strength with evidence using gender-neutral pronouns>"],
  "weaknesses": ["<weakness with evidence using gender-neutral pronouns>"],
  "topic_breakdown": [
    {{
      "topic": "<topic name>",
      "score": <float 0-100>,
      "assessment": "<1 sentence>"
    }}
  ],
  "hiring_recommendation": "<strong_hire | hire | borderline | no_hire>",
  "recommendation_reasoning": "<2-3 sentence justification>",
  "development_areas": ["<area for growth>"],
  "follow_up_topics": ["<topics to explore in next round>"]
}}
"""


CODE_ANALYSIS_PROMPT = """\
Analyze the following code submitted as an interview answer.

Question: {question}
Expected approach: {expected_points}

Submitted code:
```
{code}
```

Syntax valid: {syntax_valid}
Complexity metrics: {complexity_metrics}

Return JSON:
{{
  "code_quality_score": <int 1-10>,
  "correctness": <int 1-10>,
  "efficiency": <int 1-10>,
  "readability": <int 1-10>,
  "issues": ["<issue 1>", "<issue 2>"],
  "suggestions": ["<improvement 1>"],
  "overall_feedback": "<2-3 sentence code review>"
}}
"""
