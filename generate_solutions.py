import json
import glob

markdown_content = "# MySQL Lab Solutions\n\nHere are the solutions for all the MySQL lab tickets so you can quickly test them.\n\n"

sprint_files = sorted(glob.glob(r"c:\Users\vloke\OneDrive\Documents\yuvro intern\yuvro\ylabs-backend-api\lab\fixtures\dev\mysql_lab\sprints\sprint_*.json"))

for file_path in sprint_files:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
        markdown_content += f"## {data.get('title', 'Sprint')}\n\n"
        
        tickets = data.get("tickets", [])
        for ticket in tickets:
            title = ticket.get("title", "Untitled Ticket")
            solution = ticket.get("solution", {}).get("query.sql", "-- No solution provided")
            
            markdown_content += f"### {title}\n"
            markdown_content += f"```sql\n{solution}\n```\n\n"

out_path = r"C:\Users\vloke\.gemini\antigravity-ide\brain\e71027f8-f830-4ac2-abdb-6db1dd26ddb7\mysql_lab_solutions.md"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(markdown_content)

print(f"Generated {out_path}")
