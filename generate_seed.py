import json

langs = ["C", "C++", "PYTHON", "JAVA", "SQL", "BASH", "JAVASCRIPT", "TYPESCRIPT"]
diffs = ["EASY", "MEDIUM", "HARD"]
formats = ["MCQ", "MULTIPLE_SELECT", "DESCRIPTION", "CODING"]

questions = []
for l in langs:
    for d in diffs:
        for f in formats:
            q = {
                "title": f"Test {l} - {d} - {f}",
                "description": f"This is a {d.lower()} {f} question about {l}.",
                "difficulty": d,
                "domain": "OTHER",
                "experience": "FRESHER" if d == "EASY" else "JUNIOR" if d == "MEDIUM" else "SENIOR",
                "duration_minutes": 5 if d == "EASY" else 10,
                "marks": 5 if d == "EASY" else 10 if d == "MEDIUM" else 20,
                "format": f,
                "programming_languages": [l],
                "databases": []
            }
            questions.append(q)

with open("ylabs-backend-api/skill_evaluation/fixtures/dev/assessment_questions.json", "w") as f:
    json.dump({"assessment_questions": questions}, f, indent=2)

print(f"Generated {len(questions)} questions")
