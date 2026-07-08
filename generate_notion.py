import os
import sys

# Load TASKS from the tester
tester_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sqlite-lab-tester/generate_lab_structure.py"))
import importlib.util
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

md_content = """# 📚 SQLite Learning Lab — Interactive Curriculum

Curriculum, Sprint Structure & Planning Document for the SQLite Lab.

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file in GitHub/VS Code.
2. Select All and Copy.
3. Paste directly into an empty Notion page (Notion will auto-format the Markdown).

---

## 🎯 Course Overview
* **Lab Name**: SQLite Lab
* **Total Points**: 4500 (approx)
* **Goal**: Take students from basic database initialization to advanced subqueries and performance optimization using an interactive, auto-graded SQLite terminal in the browser.

---
"""

# Group tasks by sprint
sprints = {}
for task in TASKS:
    s = task["sprint"]
    if s not in sprints:
        sprints[s] = []
    sprints[s].append(task)

for i, (sprint_key, tasks) in enumerate(sprints.items()):
    sprint_idx = i + 1
    title = SPRINT_TITLES.get(sprint_key, f"Sprint {sprint_idx}")
    md_content += f"\n## {title}\n\n"
    
    for t_idx, task in enumerate(tasks):
        # Format task ID nicely e.g. task1.1 -> 101
        slug_num = str(task['task_id']).replace('task', '').replace('.', '0')
        if len(slug_num) == 2: # e.g. 11 -> 101
            slug_num = slug_num[0] + "0" + slug_num[1]
            
        md_content += f"### Task {slug_num} — {task['title']}\n"
        md_content += f"* **Points**: 50 | **Method**: Logic Grader\n"
        md_content += f"* **Difficulty**: EASY\n"
        md_content += f"* **Time Limit**: 15 minutes\n"
        md_content += f"* **Learning Objective**: {task.get('objective', 'Master SQL commands.')}\n"
        md_content += f"* **What the user does**:\n"
        md_content += f"  - {task['problem']}\n"
        md_content += f"  - **Solution Code**:\n"
        md_content += f"    ```sql\n"
        for line in task['query'].split('\n'):
            md_content += f"    {line}\n"
        md_content += f"    ```\n"
        md_content += f"* **Hints**:\n"
        md_content += f"  - Read the SQLite documentation for the specific keyword.\n"
        md_content += f"* **Common Mistakes**:\n"
        md_content += f"  - Forgetting the semicolon at the end of the query.\n"
        md_content += f"  - Using double quotes instead of single quotes for strings.\n"
        md_content += f"* **How the system evaluates**:\n"
        md_content += f"  - Runs your query and compares against the system solution using the isolated Two-Universe executor.\n"
        md_content += f"* **Auto-scoring**:\n"
        md_content += f"  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.\n"
        md_content += f"\n---\n\n"

out_path = os.path.join(os.path.dirname(__file__), "notion_sqlite_sprints.md")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(md_content)

print("Generated notion_sqlite_sprints.md successfully!")
