import json
import re
import os

markdown_file = "notion_mysql_sprints.md"

def generate_hints(task_desc):
    desc = task_desc.lower()
    if "join" in desc:
        return ["Ensure you are joining on the correct primary and foreign keys.", "Consider whether an INNER JOIN or LEFT JOIN is needed."]
    if "group by" in desc or "sum" in desc or "count" in desc:
        return ["Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG."]
    if "procedure" in desc:
        return ["Don't forget the DELIMITER command if you are creating procedures manually.", "Check your IN and OUT parameter definitions."]
    return ["Review the MySQL documentation for exact syntax.", "Test your queries in smaller chunks first."]

def generate_mistakes(task_desc):
    desc = task_desc.lower()
    if "join" in desc:
        return ["Using a CROSS JOIN accidentally by forgetting the ON clause.", "Selecting ambiguous column names without table aliases."]
    if "group by" in desc:
        return ["Selecting non-aggregated columns without including them in the GROUP BY clause."]
    return ["Forgetting semicolons at the end of statements.", "Using reserved keywords as column names without backticks."]

def generate_objectives(task_desc):
    desc = task_desc.lower()
    if "join" in desc:
        return ["Master relational data retrieval across multiple tables."]
    if "procedure" in desc:
        return ["Understand stored procedures and programmatic SQL."]
    return ["Write efficient, standardized SQL queries.", "Understand relational database design and querying."]

def process_markdown():
    if not os.path.exists(markdown_file):
        print(f"Error: {markdown_file} not found.")
        return
        
    with open(markdown_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    lab_data = {
        "lab_title": "MySQL Lab",
        "description": "Master relational database management, querying, and optimization using MySQL.",
        "order_index": 4,
        "sprints": []
    }
    
    current_sprint = None
    current_ticket = None
    current_section = None
    solution_file = None
    
    sprint_pattern = re.compile(r'^##\s+.*?Sprint\s+(\d+)[\s:—-]+(.*)')
    ticket_pattern = re.compile(r'^####\s+Task\s+(\d+\.\d+\.\d+)\s+—\s+(.*)')
    
    new_md_lines = []
    
    for line in lines:
        sprint_match = sprint_pattern.match(line)
        if sprint_match:
            if current_ticket and current_sprint:
                current_sprint["tickets"].append(current_ticket)
            if current_sprint:
                lab_data["sprints"].append(current_sprint)
                
            sprint_num = int(sprint_match.group(1))
            sprint_title = sprint_match.group(2).strip()
            current_sprint = {
                "title": f"Sprint {sprint_num} - {sprint_title}",
                "description": "",
                "order_index": sprint_num,
                "tickets": []
            }
            current_ticket = None
            current_section = None
            new_md_lines.append(line)
            continue
            
        ticket_match = ticket_pattern.match(line)
        if ticket_match:
            if current_ticket and current_sprint:
                current_sprint["tickets"].append(current_ticket)
                
            task_num = ticket_match.group(1).replace(".", "-")
            ticket_slug = f"mysql-{task_num}"
            ticket_title = ticket_match.group(2).strip()
            
            diff = "EASY"
            if current_sprint and current_sprint['order_index'] > 2:
                diff = "MEDIUM"
            if current_sprint and current_sprint['order_index'] > 4:
                diff = "HARD"
                
            current_ticket = {
                "title": ticket_title,
                "ticket_slug": ticket_slug,
                "description": "",
                "tasks": [],
                "learning_objectives": [],
                "evaluation": "",
                "difficulty": diff,
                "common_mistakes": [],
                "hints": [],
                "scoring_rules": {
                    "correctness": 40,
                    "optimality": 30,
                    "quality": 20,
                    "speed_bonus": 10
                },
                "solution": {},
                "yuvro_points": 100,
                "minutes_max": 45,
                "accepted_programming_languages": ["SQL"],
                "order_index": len(current_sprint["tickets"]) + 1 if current_sprint else 1
            }
            current_section = None
            new_md_lines.append(line)
            continue
            
        if not current_ticket:
            new_md_lines.append(line)
            continue
            
        if "* **Points**:" in line:
            m = re.search(r'\*\*Points\*\*:?\s*(\d+)', line)
            if m:
                current_ticket["yuvro_points"] = int(m.group(1))
            new_md_lines.append(line)
            continue
            
        if "* **What the user does**:" in line:
            current_section = "what_user_does"
            new_md_lines.append(line)
            continue
            
        if "* **How the system evaluates**:" in line:
            current_section = "evaluation"
            indent = "  "
            desc_text = current_ticket["description"]
            current_ticket["learning_objectives"] = generate_objectives(desc_text)
            current_ticket["hints"] = generate_hints(desc_text)
            current_ticket["common_mistakes"] = generate_mistakes(desc_text)
            
            new_md_lines.append(f"{indent}* **Learning Objectives**: {', '.join(current_ticket['learning_objectives'])}\n")
            new_md_lines.append(f"{indent}* **Difficulty**: {current_ticket['difficulty']}\n")
            new_md_lines.append(f"{indent}* **Time Limit**: {current_ticket['minutes_max']} minutes\n")
            new_md_lines.append(f"{indent}* **Hints**: {', '.join(current_ticket['hints'])}\n")
            new_md_lines.append(f"{indent}* **Common Mistakes**: {', '.join(current_ticket['common_mistakes'])}\n")
            
            new_md_lines.append(line)
            continue
            
        if "* **Solution Code**:" in line or "**Solution Code**:" in line or "Query:" in line:
            current_section = "solution"
            new_md_lines.append(line)
            continue
            
        new_md_lines.append(line)
            
        if current_section == "what_user_does":
            if line.strip().startswith("- "):
                desc_part = line.strip()[2:]
                current_ticket["description"] += desc_part + " "
                current_ticket["tasks"].append(desc_part)
                
        elif current_section == "evaluation":
            if line.strip().startswith("- "):
                current_ticket["evaluation"] += line.strip()[2:] + " "
                
        elif current_section == "solution":
            if "```sql" in line:
                solution_file = "query.sql"
                if solution_file not in current_ticket["solution"]:
                    current_ticket["solution"][solution_file] = ""
            elif "```" in line:
                solution_file = None 
            elif solution_file:
                current_ticket["solution"][solution_file] += line
                
    if current_ticket and current_sprint:
        current_sprint["tickets"].append(current_ticket)
    if current_sprint:
        lab_data["sprints"].append(current_sprint)
        
    with open(markdown_file, 'w', encoding='utf-8') as f:
        f.writelines(new_md_lines)
    print("Notion markdown file updated with new fields!")
    
    base_dir = os.path.join("ylabs-backend-api", "lab", "fixtures", "dev", "mysql_lab")
    sprints_dir = os.path.join(base_dir, "sprints")
    os.makedirs(sprints_dir, exist_ok=True)
    
    lab_json = {
        "labs": [
            {
                "title": lab_data["lab_title"],
                "type": "DATABASE",
                "description": lab_data["description"],
                "difficulty": "MEDIUM",
                "icon": "mysql",
                "prerequisites": "None",
                "skills": ["MySQL", "Database Design", "SQL Queries"],
                "git_repo_starter_url": "",
                "is_active": True
            }
        ]
    }
    with open(os.path.join(base_dir, "lab.json"), "w", encoding="utf-8") as f:
        json.dump(lab_json, f, indent=2)
        
    for idx, sprint in enumerate(lab_data["sprints"]):
        sprint_json = {
            "title": sprint["title"],
            "description": sprint["description"],
            "order_index": sprint["order_index"],
            "lab_title": lab_data["lab_title"],
            "tickets": sprint["tickets"]
        }
        sprint_file = os.path.join(sprints_dir, f"sprint_{idx+1}.json")
        with open(sprint_file, "w", encoding="utf-8") as f:
            json.dump(sprint_json, f, indent=2)
            
    print(f"JSON fixtures created in {base_dir}")

if __name__ == '__main__':
    process_markdown()
