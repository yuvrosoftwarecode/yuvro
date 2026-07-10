import os
import sys
import json
import importlib.util

# Load Sprints from the new script in the root directory
tester_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../generate_sqlite_sprints.py"))
spec = importlib.util.spec_from_file_location("generate_sqlite_sprints", tester_path)
lab_structure = importlib.util.module_from_spec(spec)
sys.modules["generate_sqlite_sprints"] = lab_structure
spec.loader.exec_module(lab_structure)
SPRINTS_DATA = lab_structure.sprints

# 1. Create lab.json
lab_data = {
  "labs": [
    {
      "title": "SQLite Lab",
      "type": "BACKEND",
      "description": "Master SQL and SQLite fundamentals through interactive queries.",
      "difficulty": "EASY",
      "icon": "database",
      "prerequisites": "None",
      "skills": [
        "SQL",
        "SQLite",
        "Databases",
        "Data Engineering"
      ],
      "git_repo_starter_url": "",
      "is_active": True
    }
  ]
}

out_dir = os.path.join(os.path.dirname(__file__), "sqlite_lab")
os.makedirs(out_dir, exist_ok=True)
os.makedirs(os.path.join(out_dir, "sprints"), exist_ok=True)

with open(os.path.join(out_dir, "lab.json"), "w", encoding="utf-8") as f:
    json.dump(lab_data, f, indent=2)

# Generate sprint files
for i, sprint in enumerate(SPRINTS_DATA):
    sprint_idx = i + 1
    sprint_data = {
        "title": sprint["name"],
        "description": "Complete all SQL queries in this sprint.",
        "order_index": sprint_idx,
        "lab_title": "SQLite Lab",
        "tickets": []
    }
    
    for t_idx, task in enumerate(sprint['tasks']):
        # title usually starts with 'Task 101 — '
        # let's extract the number, e.g. 101
        slug_num = task["title"].split(' ')[1] if "Task" in task["title"] else str(t_idx + 1)
        clean_title = task["title"].split(' — ')[1] if ' — ' in task["title"] else task["title"]
        
        ticket = {
            "title": clean_title,
            "ticket_slug": f"sqlite-{slug_num}",
            "description": task["problem"],
            "tasks": [task["problem"]],
            "learning_objectives": [task.get("objective", "Master SQL commands.")],
            "evaluation": task.get("eval_type", "Runs your query and compares against the system solution."),
            "difficulty": "EASY",
            "common_mistakes": [task.get("mistakes", "")] if task.get("mistakes") else [],
            "hints": [task.get("hints", "")] if task.get("hints") else [],
            "scoring_rules": {
                "logic_score": 100,
                "clean_code": 0,
                "visual_accuracy": 0
            },
            "solution": {
                "query.sql": task["solution"],
                "database_identifier": "todo_management"
            },
            "yuvro_points": 50,
            "minutes_max": 15,
            "accepted_programming_languages": [
                "SQL"
            ],
            "order_index": t_idx + 1
        }
        
        sprint_data["tickets"].append(ticket)
        
    file_path = os.path.join(out_dir, "sprints", f"sprint_{sprint_idx}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(sprint_data, f, indent=2)

print("Generated sqlite_lab fixtures successfully from notion_sqlite_sprints data!")
