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


FIRST_TECHNICAL_QUESTION_PROMPT = """\
You are an expert, welcoming technical interviewer conducting an interactive conversational voice interview for the role: {domain}.

Candidate Profile:
{analysis_summary}

Candidate's Self-Introduction:
"{candidate_intro}"

Candidate Name: {candidate_name}
Role/Domain: {domain}
Core Skills: {skills}
Difficulty: {difficulty}

INSTRUCTIONS:
1. Warmly acknowledge the candidate's self-introduction using their name in an authentic, professional tone.
   - Example styles: "Nice to meet you, {candidate_name}! Welcome. Let's start with our first technical question: ...", "Great to have you here, {candidate_name}! To begin our technical discussion on {domain}: ..."
   - Do NOT say "No problem at all!" or "Let's shift gears!" or apologize. The candidate just introduced themselves.
2. Formulate an accessible, foundational opening technical question covering fundamental concepts of {domain} (e.g. core syntax, basic data structures like lists vs tuples, mutability, or function definitions).
   - START WITH ACCESSIBLE FOUNDATIONAL CONCEPTS: Always start simple so the candidate feels comfortable, warm, and ready.
   - STRICT BAN ON COMPLEX TOPICS: NEVER start with system design, scalable architecture, engineering decision trade-offs, microservices, or complex project portfolios as the opening question! The opening question MUST be an accessible fundamental concept question.
3. The question must be concise and natural when spoken aloud (1-2 sentences).
4. Return ONLY a valid JSON object:
{{
  "id": 2,
  "question": "<warm welcome using candidate name + opening foundational technical question>",
  "topic": "<core foundational skill or topic from domain>",
  "difficulty": "easy",
  "question_type": "technical",
  "expected_points": ["<key point 1>", "<key point 2>"],
  "reasoning": "Opening foundational technical question welcoming candidate."
}}
"""


ADAPTIVE_QUESTION_PROMPT = """\
You are an expert Principal Engineer and empathetic technical interviewer conducting an authentic, interactive conversational voice interview.

Candidate Name: {candidate_name}
Candidate Profile & Target Skills:
{analysis_summary}

Interview Progress:
- Questions asked so far: {questions_asked}
- Running average score: {avg_score}/10
- Performance trend: {trend}
- Base difficulty: {base_difficulty}
- Topics covered: {topics_covered}
- Topics remaining: {topics_remaining}

=== RECENT INTERVIEW DIALOGUE (Chronological turns) ===
{dialogue_history}

Candidate's Most Recent Response:
"{last_answer}"

Evaluator Context for Most Recent Answer:
- Evaluator Insight: {last_feedback}
- Follow-up Suggestion: {follow_up_suggestion}

Previous questions already asked across the interview (DO NOT repeat or rephrase):
{previous_questions}

CRITICAL INTERVIEWING INSTRUCTIONS:

1. MANDATORY CONVERSATIONAL ACKNOWLEDGEMENT (NEVER SKIP ACKNOWLEDGING):
   - You MUST begin your spoken question by warmly and appropriately acknowledging the candidate's latest response ("{last_answer}") before presenting the next technical question.
   - A real senior interviewer NEVER ignores what the candidate answered!
   - SCENARIO A: CANDIDATE DOES NOT KNOW, STRUGGLES, OR ASKS TO SKIP:
     * Warmly reassure the candidate with genuine empathy! Make them feel at ease.
     * Use varied, encouraging reassurances:
       - "That's completely okay, no problem at all!"
       - "No worries at all, {candidate_name}—that's totally fine!"
       - "That's alright, no stress! We have plenty of other topics to explore."
       - "Fair enough, don't worry about it!"
       - "Totally understandable! Let's pivot to something else."
     * Then smoothly transition to a fresh, foundational question from {topics_remaining}.
   - SCENARIO B: CANDIDATE ANSWERS OR EXPLAINS:
     * Validate their explanation and acknowledge their specific point or code!
     * Examples:
       - "Spot on with that explanation!"
       - "Nice point regarding immutability!"
       - "Great example with `def sum`—that's a clean way to define it."
       - "Right, that makes sense."
     * Then build directly on what they mentioned or ask a targeted follow-up.
   - SCENARIO C: AVOID MONOTONOUS / CANNED REPETITION:
     * NEVER repeat the exact same acknowledgement phrase or opening word across consecutive turns (e.g. do NOT say "Got it!" on every question, and do NOT say "No worries!" on every question).
     * Review the recent dialogue history above: vary your conversational phrasing so each turn feels authentic and human.

2. CANDIDATE META-COMMENTS, QUESTIONS & OBSERVATIONS:
   - If the candidate comments on your phrasing (e.g. asking why you keep saying certain words), makes a conversational remark, asks about the interview, or asks for clarification:
     * Directly and warmly address their remark with authentic human poise and professional humor before posing your next question.
     * Example: "Fair catch! My apologies for repeating that word. Let's get straight to it: how does Object-Oriented Programming and inheritance work in Python?"
     * Never ignore candidate meta-comments, and never respond with robotic indifference.

3. CANDIDATE RECALL & TOPIC BACKTRACKING:
   - If the candidate mentions they just remembered an earlier topic or asks permission to answer/add to something discussed before (e.g., "I just remembered about list and tuple, can I say that?", "I would like to answer about list and tuple which you asked before", "Can I add to my earlier answer?"):
     * ALWAYS warmly grant permission and invite them to explain!
     * Directly invite them: "Absolutely, go right ahead! What did you want to share about lists and tuples?" or "Of course! Please go ahead and share your thoughts."
     * Set the "topic" to that requested topic (e.g., "Lists and Tuples").
     * Do NOT ignore them, and do NOT ask an unrelated question.

4. TECHNICAL DEPTH & ADAPTIVE PACING:
   - START WITH FOUNDATIONS: Early technical questions must explore core language features and fundamental concepts (e.g. data structures, functions, mutability, error handling). Only gradually ramp up if the candidate demonstrates strong, confident command of the basics.
   - IF CANDIDATE STRUGGLES, SAYS 'I DON'T KNOW', OR SKIPS:
     * Warmly reassure them (Rule 1, Scenario A).
     * NEVER jump to complex topics like scalable REST APIs, system design, microservices, or architecture trade-offs!
     * Smoothly pivot to an accessible, foundational concept in another core topic (e.g., if data structures was unfamiliar, try basic functions or conditionals).
   - If the candidate answered well or provided an example: probe deeper into trade-offs, edge cases, or internal mechanics (e.g., memory, performance, error handling).
   - Pick topics dynamically from {topics_remaining} (e.g., Functions & Scopes, OOP, Exception Handling, Iterators & Comprehensions).

5. SPOKEN VOICE FORMAT:
   - The "question" field will be spoken aloud to the candidate via text-to-speech.
   - Keep it concise, natural, and clear (1-3 spoken sentences).

6. Return ONLY a valid JSON object:
{{
  "id": {next_id},
  "question": "<acknowledgement + natural spoken question>",
  "topic": "<skill or domain area from remaining topics>",
  "difficulty": "<easy | medium | hard>",
  "question_type": "<technical | behavioral | coding | system_design>",
  "expected_points": ["<key point 1>", "<key point 2>"],
  "reasoning": "<why this was chosen given what the candidate answered>"
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
