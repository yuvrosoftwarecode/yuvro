import json
import re
import os

markdown_file = "notion_react_sprints.md"
output_file = "react_lab_preview.json"

def generate_hints(learning_text):
    if "useEffect" in learning_text:
        return ["Don't forget the dependency array!", "Make sure to clean up any subscriptions if needed."]
    if "useState" in learning_text:
        return ["Remember that state updates can be asynchronous.", "Never mutate state directly!"]
    return ["Review the documentation for the hooks mentioned in the learning objectives.", "Try logging your variables to the console to see their values."]

def generate_mistakes(learning_text):
    if "useEffect" in learning_text:
        return ["Forgetting the dependency array and causing an infinite loop."]
    if "useState" in learning_text:
        return ["Mutating state directly (e.g. state.value = 1) instead of using the setter."]
    return ["Using inline styles instead of CSS classes.", "Forgetting to export the component."]

def parse_markdown(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    lab = {
        "lab_title": "React Lab",
        "description": "Master React fundamentals through advanced patterns.",
        "order_index": 1,
        "sprints": []
    }
    
    current_sprint = None
    current_ticket = None
    current_section = None
    solution_file = None
    
    sprint_pattern = re.compile(r'^##\s+.*?Sprint\s+(\d+):\s+(.*)')
    ticket_pattern = re.compile(r'^\*\s+\*\*([A-Z]+-\d+)\s+\|\s+(.*?)\*\*')
    
    for line in lines:
        sprint_match = sprint_pattern.match(line)
        if sprint_match:
            if current_ticket and current_sprint:
                current_sprint["tickets"].append(current_ticket)
            if current_sprint:
                lab["sprints"].append(current_sprint)
            
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
            continue
            
        if line.startswith("**Goal**:"):
            if current_sprint and not current_ticket:
                current_sprint["description"] = line.replace("**Goal**:", "").strip()
            continue

        ticket_match = ticket_pattern.match(line)
        if ticket_match:
            if current_ticket and current_sprint:
                current_sprint["tickets"].append(current_ticket)
                
            ticket_slug = ticket_match.group(1)
            ticket_title = ticket_match.group(2).strip()
            
            # Simple difficulty scaling
            diff = "EASY"
            if current_sprint and current_sprint['order_index'] > 2:
                diff = "MEDIUM"
            if current_sprint and current_sprint['order_index'] > 4:
                diff = "HARD"
                
            current_ticket = {
                "title": ticket_title,
                "ticket_slug": ticket_slug.lower(),
                "description": "",
                "tasks": [],
                "learning_objectives": [],
                "evaluation": "",
                "difficulty": diff,
                "common_mistakes": [],
                "hints": [],
                "scoring_rules": {
                    "visual_accuracy": 40,
                    "logic_score": 50,
                    "clean_code": 10
                },
                "solution": {},
                "yuvro_points": 100,
                "minutes_max": 45,
                "accepted_programming_languages": ["JAVASCRIPT", "REACT"],
                "order_index": len(current_sprint["tickets"]) + 1 if current_sprint else 1
            }
            current_section = None
            continue
            
        if not current_ticket:
            continue
            
        if "* **Task**:" in line:
            current_section = "task"
            current_ticket["description"] = line.replace("* **Task**:", "").strip()
            current_ticket["tasks"].append(current_ticket["description"])
            continue
        elif "* **Learning**:" in line:
            current_section = "learning"
            learn_text = line.replace("* **Learning**:", "").strip()
            current_ticket["learning_objectives"].append(learn_text)
            current_ticket["hints"] = generate_hints(learn_text)
            current_ticket["common_mistakes"] = generate_mistakes(learn_text)
            continue
        elif "* **Evaluation**:" in line:
            current_section = "evaluation"
            current_ticket["evaluation"] = line.replace("* **Evaluation**:", "").strip()
            continue
        elif "* **Solution**:" in line:
            current_section = "solution"
            continue
            
        if current_section == "solution":
            # parse filenames and code blocks
            file_match = re.match(r'^\s*\*\*`(.+?)`\*\*', line)
            if file_match:
                solution_file = file_match.group(1)
                if solution_file not in current_ticket["solution"]:
                    current_ticket["solution"][solution_file] = ""
            elif "```jsx" in line or "```html" in line or "```javascript" in line or "```css" in line:
                pass # start of code block
            elif "```" in line:
                solution_file = None # end of code block
            elif solution_file:
                current_ticket["solution"][solution_file] += line
                
    if current_ticket and current_sprint:
        current_sprint["tickets"].append(current_ticket)
    if current_sprint:
        lab["sprints"].append(current_sprint)
        
    return lab

def main():
    if not os.path.exists(markdown_file):
        print(f"Error: {markdown_file} not found.")
        return
    lab_data = parse_markdown(markdown_file)
    # output the preview
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), output_file)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(lab_data, f, indent=2)
    print(f"Preview generated successfully at {out_path}")

if __name__ == '__main__':
    main()
