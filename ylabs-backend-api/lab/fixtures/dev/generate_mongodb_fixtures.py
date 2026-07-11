import os
import sys
import json
import importlib.util

# Load Sprints from the new script in the root directory
tester_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../generate_mongodb_sprints.py"))
spec = importlib.util.spec_from_file_location("generate_mongodb_sprints", tester_path)
lab_structure = importlib.util.module_from_spec(spec)
sys.modules["generate_mongodb_sprints"] = lab_structure
spec.loader.exec_module(lab_structure)
SPRINTS_DATA = lab_structure.sprints

# 1. Create lab.json
lab_data = {
  "labs": [
    {
      "title": "MongoDB Lab",
      "type": "DATABASE",
      "description": "Master MongoDB fundamentals through interactive queries. Learn collections, CRUD operations, aggregation pipelines, and indexing.",
      "difficulty": "EASY",
      "icon": "database",
      "prerequisites": "None",
      "skills": [
        "NoSQL",
        "MongoDB",
        "Databases",
        "Data Engineering"
      ],
      "git_repo_starter_url": "",
      "is_active": True
    }
  ]
}

out_dir = os.path.join(os.path.dirname(__file__), "mongodb_lab")
os.makedirs(out_dir, exist_ok=True)
os.makedirs(os.path.join(out_dir, "sprints"), exist_ok=True)

with open(os.path.join(out_dir, "lab.json"), "w", encoding="utf-8") as f:
    json.dump(lab_data, f, indent=2)

# Generate sprint files
for i, sprint in enumerate(SPRINTS_DATA):
    sprint_idx = i + 1
    sprint_data = {
        "title": sprint["name"],
        "description": "Complete all MongoDB queries in this sprint.",
        "order_index": sprint_idx,
        "lab_title": "MongoDB Lab",
        "tickets": []
    }
    
    for t_idx, task in enumerate(sprint['tasks']):
        # title usually starts with 'Task 101 — '
        slug_num = task["title"].split(' ')[1] if "Task" in task["title"] else str(t_idx + 1)
        clean_title = task["title"].split(' — ')[1] if ' — ' in task["title"] else task["title"]
        
        ticket = {
            "title": clean_title,
            "ticket_slug": f"mongodb-{slug_num}",
            "description": f"{task['problem']}\n\n### SQL Equivalent\n```sql\n{task.get('sql_equiv', '')}\n```",
            "tasks": [task["problem"]],
            "learning_objectives": [task.get("objective", "Master MongoDB commands.")],
            "evaluation": task.get("eval_type", "Runs your query and compares against the system solution."),
            "difficulty": "EASY",
            "common_mistakes": [task.get("mistakes", "")] if task.get("mistakes") else [],
            "hints": [task.get("hints", "")] if task.get("hints") else [],
            "scoring_rules": {
                "system_query": task.get("system_query", "")
            },
            "solution": {
                "query.js": task["solution"],
                "database_identifier": "learning_lab"
            },
            "yuvro_points": 50,
            "minutes_max": 15,
            "accepted_programming_languages": [
                "MONGOSH"
            ],
            "order_index": t_idx + 1
        }
        
        sprint_data["tickets"].append(ticket)
        
    file_path = os.path.join(out_dir, "sprints", f"sprint_{sprint_idx}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(sprint_data, f, indent=2)

print("Generated mongodb_lab fixtures successfully from generate_mongodb_sprints data!")
