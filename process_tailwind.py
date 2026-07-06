import json
import re
import os

markdown_file = "notion_tailwindcss_sprints.md"

def generate_hints(task_desc):
    desc = task_desc.lower()
    if "grid" in desc or "col" in desc:
        return ["Tailwind's grid system uses 'grid' and 'grid-cols-*' utilities.", "Use 'gap-*' to add spacing between grid items."]
    if "flex" in desc or "center" in desc:
        return ["Use 'flex', 'justify-center', and 'items-center' to quickly center content."]
    if "responsive" in desc or "mobile" in desc:
        return ["Remember Tailwind uses a mobile-first approach. Unprefixed utilities apply to mobile, while 'md:', 'lg:', etc., apply to larger screens."]
    return ["Don't write custom CSS. Check the Tailwind documentation for the correct utility class."]

def generate_mistakes(task_desc):
    desc = task_desc.lower()
    if "responsive" in desc:
        return ["Applying 'md:' to mobile styles instead of desktop styles."]
    if "grid" in desc:
        return ["Forgetting to add 'grid' before using 'grid-cols-*'."]
    return ["Using inline styles or a custom stylesheet instead of composing utility classes."]

def generate_objectives(task_desc):
    desc = task_desc.lower()
    if "grid" in desc:
        return ["Master Tailwind's CSS Grid utility classes."]
    if "flex" in desc:
        return ["Understand Flexbox layout with Tailwind utilities."]
    return ["Apply utility-first CSS styling concepts.", "Build pixel-perfect UI without custom CSS."]

def process_markdown():
    if not os.path.exists(markdown_file):
        print(f"Error: {markdown_file} not found.")
        return
        
    with open(markdown_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    lab_data = {
        "lab_title": "Tailwind CSS Lab",
        "description": "Master utility-first styling by building pixel-perfect designs with Tailwind CSS.",
        "order_index": 3,
        "sprints": []
    }
    
    current_sprint = None
    current_ticket = None
    current_section = None
    solution_file = None
    
    sprint_pattern = re.compile(r'^##\s+.*?Sprint\s+(\d+):\s+(.*)')
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
            ticket_slug = f"tailwind-{task_num}"
            ticket_title = ticket_match.group(2).strip()
            
            diff = "EASY"
            if current_sprint and current_sprint['order_index'] > 1:
                diff = "MEDIUM"
                
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
                    "visual_accuracy": 40,
                    "logic_score": 40,
                    "clean_code": 10,
                    "speed_bonus": 10
                },
                "solution": {},
                "yuvro_points": 100,
                "minutes_max": 30,
                "accepted_programming_languages": ["HTML", "CSS"],
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
            
        if "* **Solution Code**:" in line or "**Solution Code**:" in line:
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
            if "```html" in line or "```css" in line:
                solution_file = "index.html"
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
    
    base_dir = os.path.join("ylabs-backend-api", "lab", "fixtures", "dev", "tailwindcss_lab")
    sprints_dir = os.path.join(base_dir, "sprints")
    os.makedirs(sprints_dir, exist_ok=True)
    
    lab_json = {
        "labs": [
            {
                "title": lab_data["lab_title"],
                "type": "FRONTEND",
                "description": lab_data["description"],
                "difficulty": "EASY",
                "icon": "tailwind",
                "prerequisites": "HTML, CSS",
                "skills": ["Tailwind CSS", "Responsive Design", "Utility-First CSS"],
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
