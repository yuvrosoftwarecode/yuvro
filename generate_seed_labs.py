import json
import random

langs = ["C", "C++", "PYTHON", "JAVA", "SQL", "BASH", "JAVASCRIPT", "TYPESCRIPT"]
diffs = ["EASY", "MEDIUM", "HARD"]
scenarios = ["DEBUGGING", "FEATURE_DEVELOPMENT", "API_OPTIMIZATION", "SECURITY", "ARCHITECTURE", "PERFORMANCE", "TESTING", "PRODUCTION_INCIDENT"]
dbs = ["SQLITE", "POSTGRESQL", "MYSQL", "MONGODB", "REDIS", "ELASTICSEARCH"]
domains = ["FINANCE", "INSURANCE", "EDTECH", "SUPPLY_CHAIN", "HEALTHCARE", "RETAIL", "PAYMENT", "OTHER"]

labs = []
idx = 1
for l in langs:
    for d in diffs:
        for s in scenarios[:3]: # keep it small, 8*3*3 = 72
            db = random.choice(dbs)
            dom = random.choice(domains)
            q = {
                "title": f"Lab {idx}: {l} - {d} - {s}",
                "description": f"This is a {d.lower()} {s} lab about {l}.",
                "difficulty": d,
                "domain": dom,
                "experience": "FRESHER" if d == "EASY" else "JUNIOR" if d == "MEDIUM" else "SENIOR",
                "duration_minutes": 30 if d == "EASY" else 60,
                "marks": 20 if d == "EASY" else 50,
                "scenario": s,
                "git_repo_starter_url": "https://github.com/example/starter",
                "programming_languages": [l],
                "databases": [db],
                "backend_frameworks": [],
                "frontend_frameworks": [],
                "tasks": [
                    {
                        "title": "Task 1",
                        "description": "Do the thing",
                        "difficulty": d,
                        "marks": 10,
                        "duration_minutes": 10,
                        "order_index": 0
                    }
                ]
            }
            labs.append(q)
            idx += 1

with open("ylabs-backend-api/skill_evaluation/fixtures/dev/lab_questions.json", "w") as f:
    json.dump({"lab_questions": labs}, f, indent=2)

print(f"Generated {len(labs)} labs")
