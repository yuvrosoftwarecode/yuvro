import json
import re
import os

markdown_file = "notion_react_sprints.md"
preview_file = "react_lab_preview.json"

def main():
    # 1. Update Markdown
    if not os.path.exists(preview_file):
        print(f"Error: {preview_file} not found.")
        return

    with open(preview_file, 'r', encoding='utf-8') as f:
        lab_data = json.load(f)
        
    ticket_data_map = {}
    for sprint in lab_data['sprints']:
        for ticket in sprint['tickets']:
            ticket_data_map[ticket['ticket_slug'].upper()] = ticket

    with open(markdown_file, 'r', encoding='utf-8') as f:
        md_lines = f.readlines()
        
    new_md_lines = []
    ticket_pattern = re.compile(r'^\*\s+\*\*([A-Z]+-\d+)\s+\|\s+(.*?)\*\*')
    
    current_slug = None
    
    for line in md_lines:
        match = ticket_pattern.match(line)
        if match:
            current_slug = match.group(1).upper()
            new_md_lines.append(line)
            continue
            
        if line.strip().startswith("* **Evaluation**:") and current_slug in ticket_data_map:
            t_data = ticket_data_map[current_slug]
            indent = "  "
            new_md_lines.append(f"{indent}* **Difficulty**: {t_data['difficulty']}\n")
            new_md_lines.append(f"{indent}* **Time Limit**: {t_data['minutes_max']} minutes\n")
            new_md_lines.append(f"{indent}* **Yuvro Points**: {t_data['yuvro_points']} XP\n")
            
            hints_str = ", ".join(t_data['hints'])
            new_md_lines.append(f"{indent}* **Hints**: {hints_str}\n")
            
            mistakes_str = ", ".join(t_data['common_mistakes'])
            new_md_lines.append(f"{indent}* **Common Mistakes**: {mistakes_str}\n")
            
            current_slug = None # Prevent adding it multiple times
            
        new_md_lines.append(line)
            
    with open(markdown_file, 'w', encoding='utf-8') as f:
        f.writelines(new_md_lines)
    print("Notion markdown file updated with new fields!")

    # 2. Split JSON into proper directory structure
    base_dir = os.path.join("ylabs-backend-api", "lab", "fixtures", "dev", "react_lab")
    sprints_dir = os.path.join(base_dir, "sprints")
    os.makedirs(sprints_dir, exist_ok=True)
    
    # lab.json
    lab_json = {
        "labs": [
            {
                "title": lab_data["lab_title"],
                "type": "FRONTEND",
                "description": lab_data["description"],
                "difficulty": "MEDIUM",
                "icon": "react",
                "prerequisites": "JavaScript, HTML, CSS",
                "skills": ["React", "State Management", "Hooks"],
                "git_repo_starter_url": "",
                "is_active": True
            }
        ]
    }
    with open(os.path.join(base_dir, "lab.json"), "w", encoding="utf-8") as f:
        json.dump(lab_json, f, indent=2)
        
    # sprint_X.json
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
    main()
