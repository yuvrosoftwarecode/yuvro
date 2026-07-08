import json
import re
import os

markdown_file = "notion_cybersecurity_sprints.md"

def process_markdown():
    if not os.path.exists(markdown_file):
        print(f"Error: {markdown_file} not found.")
        return
        
    with open(markdown_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    lab_data = {
        "lab_title": "Cyber Security Lab",
        "description": "Hands-on offensive and defensive security: OWASP, auth, crypto, network and cloud hardening.",
        "order_index": 6,
        "sprints": []
    }
    
    current_sprint = None
    current_ticket = None
    current_section = None
    solution_file = None
    
    sprint_pattern = re.compile(r'^##\s+.*?Sprint\s+(\d+)[\s:—-]+(.*)')
    ticket_pattern = re.compile(r'^\*\s+\*\*(SEC-\d+)\s+\|\s+(.*?)\*\*')
    
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
                
            ticket_slug = ticket_match.group(1).lower() # sec-101
            ticket_title = ticket_match.group(2).strip()
            
            current_ticket = {
                "title": ticket_title,
                "ticket_slug": f"cybersecurity-{ticket_slug}",
                "description": "",
                "tasks": [],
                "learning_objectives": [],
                "evaluation": "",
                "difficulty": "EASY",
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
                "accepted_programming_languages": ["Python", "JavaScript"],
                "order_index": len(current_sprint["tickets"]) + 1 if current_sprint else 1
            }
            current_section = None
            new_md_lines.append(line)
            continue
            
        if not current_ticket:
            new_md_lines.append(line)
            continue
            
        if "* **Yuvro Points**:" in line or "* **Points**:" in line:
            m = re.search(r'\*\*Yuvro Points\*\*:?\s*(\d+)', line)
            if not m:
                m = re.search(r'\*\*Points\*\*:?\s*(\d+)', line)
            if m:
                current_ticket["yuvro_points"] = int(m.group(1))
            new_md_lines.append(line)
            continue
            
        if "* **Task**:" in line:
            desc_text = line.split("* **Task**:")[1].strip()
            current_ticket["description"] = desc_text
            current_ticket["tasks"].append(desc_text)
            new_md_lines.append(line)
            continue
            
        if "* **Learning**:" in line:
            learning = line.split("* **Learning**:")[1].strip()
            current_ticket["learning_objectives"] = [x.strip() for x in learning.split(",")]
            new_md_lines.append(line)
            continue
            
        if "* **Difficulty**:" in line:
            diff_raw = line.split("* **Difficulty**:")[1].strip().upper()
            if diff_raw == "INTERMEDIATE":
                diff_raw = "MEDIUM"
            elif diff_raw == "ADVANCED":
                diff_raw = "HARD"
            current_ticket["difficulty"] = diff_raw
            new_md_lines.append(line)
            continue
            
        if "* **Time Limit**:" in line:
            m = re.search(r'(\d+)', line)
            if m:
                current_ticket["minutes_max"] = int(m.group(1))
            new_md_lines.append(line)
            continue
            
        if "* **Hints**:" in line:
            hints = line.split("* **Hints**:")[1].strip()
            current_ticket["hints"] = [x.strip() for x in hints.split(".,") if x.strip()]
            if not current_ticket["hints"]:
                current_ticket["hints"] = [hints]
            new_md_lines.append(line)
            continue
            
        if "* **Common Mistakes**:" in line:
            mistakes = line.split("* **Common Mistakes**:")[1].strip()
            current_ticket["common_mistakes"] = [x.strip() for x in mistakes.split(".,") if x.strip()]
            if not current_ticket["common_mistakes"]:
                current_ticket["common_mistakes"] = [mistakes]
            new_md_lines.append(line)
            continue
            
        if "* **Evaluation**:" in line:
            current_ticket["evaluation"] = line.split("* **Evaluation**:")[1].strip()
            new_md_lines.append(line)
            continue
            
        if "* **Solution**:" in line or "**Solution**:" in line:
            current_section = "solution"
            new_md_lines.append(line)
            continue
            
        new_md_lines.append(line)
            
        if current_section == "solution":
            if "**`" in line:
                m = re.search(r'\*\*`([^`]+)`\*\*', line)
                if m:
                    solution_file = m.group(1)
                    if solution_file not in current_ticket["solution"]:
                        current_ticket["solution"][solution_file] = ""
            elif line.strip().startswith("```") and len(line.strip()) > 3:
                pass
            elif "```" in line and "```" == line.strip():
                solution_file = None 
            elif solution_file and not "```" in line:
                current_ticket["solution"][solution_file] += line
                
    if current_ticket and current_sprint:
        current_sprint["tickets"].append(current_ticket)
    if current_sprint:
        lab_data["sprints"].append(current_sprint)
        
    with open(markdown_file, 'w', encoding='utf-8') as f:
        f.writelines(new_md_lines)
    print("Notion markdown file updated with new fields!")
    
    base_dir = os.path.join("ylabs-backend-api", "lab", "fixtures", "dev", "cybersecurity_lab")
    sprints_dir = os.path.join(base_dir, "sprints")
    os.makedirs(sprints_dir, exist_ok=True)
    
    lab_json = {
        "labs": [
            {
                "title": lab_data["lab_title"],
                "type": "SECURITY",
                "description": lab_data["description"],
                "difficulty": "HARD",
                "icon": "shield",
                "prerequisites": "Basic Python and Web",
                "skills": ["Python", "Web Security", "Cryptography"],
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
