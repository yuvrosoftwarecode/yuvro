import os
import sys
import json
import importlib.util

# Load TASKS from the tester
tester_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../sqlite-lab-tester/generate_lab_structure.py"))
spec = importlib.util.spec_from_file_location("generate_lab_structure", tester_path)
lab_structure = importlib.util.module_from_spec(spec)
sys.modules["generate_lab_structure"] = lab_structure
spec.loader.exec_module(lab_structure)
TASKS = lab_structure.TASKS

SPRINT_TITLES = {
    "sprint1": "Sprint 1 - Database Initialization",
    "sprint2": "Sprint 2 - Table Creation & Schema",
    "sprint3": "Sprint 3 - Basic Data Insertion",
    "sprint4": "Sprint 4 - Basic Retrieval & Filtering",
    "sprint5": "Sprint 5 - Sorting, Limiting & Updating",
    "sprint6": "Sprint 6 - Deleting & Aggregation Basics",
    "sprint7": "Sprint 7 - Advanced Aggregation & Math",
    "sprint8": "Sprint 8 - Subqueries, CTEs & Optimization",
    "sprint9": "Sprint 9 - Set Operations & Constraints"
}

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

# Group tasks by sprint
sprints = {}
for task in TASKS:
    s = task["sprint"]
    if s not in sprints:
        sprints[s] = []
    sprints[s].append(task)

# Generate sprint files
for i, (sprint_key, tasks) in enumerate(sprints.items()):
    sprint_idx = i + 1
    sprint_data = {
        "title": SPRINT_TITLES.get(sprint_key, f"Sprint {sprint_idx}"),
        "description": "Complete all SQL queries in this sprint.",
        "order_index": sprint_idx,
        "lab_title": "SQLite Lab",
        "tickets": []
    }
    
    for t_idx, task in enumerate(tasks):
        slug_num = str(task['task_id']).replace('task', '').replace('.', '')
        # Handle decimal format, if it was task1.1 we want sqlite-101
        ticket = {
            "title": task["title"],
            "ticket_slug": f"sqlite-{slug_num}",
            "description": task["problem"],
            "tasks": [task["problem"]],
            "learning_objectives": [task.get("objective", "Master SQL commands.")],
            "evaluation": "Runs your query and compares against the system solution.",
            "difficulty": "EASY",
            "common_mistakes": [
                "Forgetting the semicolon at the end of the query.",
                "Using double quotes instead of single quotes for strings."
            ],
            "hints": [
                "Read the SQLite documentation for the specific keyword."
            ],
            "scoring_rules": {
                "logic_score": 100,
                "clean_code": 0,
                "visual_accuracy": 0
            },
            "solution": {
                "query.sql": task["query"]
            },
            "yuvro_points": 50,
            "minutes_max": 15,
            "accepted_programming_languages": [
                "SQL"
            ],
            "order_index": t_idx + 1
        }
        
        # We also need to map database_identifier inside evaluation rules or solution!
        # The executor needs `database_identifier`. We'll just pass it in solution.
        ticket["solution"]["database_identifier"] = "todo_management"
        
        sprint_data["tickets"].append(ticket)
        
    file_path = os.path.join(out_dir, "sprints", f"sprint_{sprint_idx}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(sprint_data, f, indent=2)

print("Generated sqlite_lab fixtures successfully!")
