import os
import json
import glob

# Directory containing the MongoDB sprint fixtures
fixtures_dir = r"c:\Users\vloke\OneDrive\Documents\yuvro intern\yuvro\ylabs-backend-api\lab\fixtures\dev\mongodb_lab\sprints"
sprint_files = glob.glob(os.path.join(fixtures_dir, "*.json"))

out_md = "# MongoDB Lab Solutions\n\n"

for file_path in sorted(sprint_files):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    sprint_title = data.get("title", "Unknown Sprint")
    out_md += f"## {sprint_title}\n\n"
    
    tickets = data.get("tickets", [])
    for ticket in tickets:
        ticket_title = ticket.get("title", "Unknown Ticket")
        out_md += f"### {ticket_title}\n\n"
        
        # In MongoDB fixtures, tasks is a list of strings, not objects
        tasks = ticket.get("tasks", [])
        desc = ticket.get("description", "")
        solution = ticket.get("solution", {})
        
        # The solution is usually under solution["query.js"] for MongoDB
        query = ""
        if isinstance(solution, dict):
            query = solution.get("query.js", "")
        elif isinstance(solution, str):
            query = solution
            
        out_md += f"{desc}\n\n"
        
        if query:
            out_md += f"**Solution:**\n```javascript\n{query}\n```\n\n"
        else:
            out_md += f"**Solution:**\n*(No solution provided)*\n\n"

# Write out the Markdown file to the artifacts directory
out_file = r"C:\Users\vloke\.gemini\antigravity-ide\brain\e71027f8-f830-4ac2-abdb-6db1dd26ddb7\mongodb_lab_solutions.md"
with open(out_file, "w", encoding="utf-8") as f:
    f.write(out_md)

print("Generated mongodb_lab_solutions.md")
