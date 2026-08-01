import json
import codecs

try:
    with codecs.open('all_solutions.json', 'r', encoding='utf-16le') as f:
        data = f.read()
except UnicodeError:
    with open('all_solutions.json', 'r', encoding='utf-8') as f:
        data = f.read()

# psql outputs trailing spaces or newlines
data = data.strip()
if not data:
    print("No data found")
    exit(1)

# Sometimes psql adds a header or footer if -t wasn't fully clean, but we used -t
try:
    items = json.loads(data)
except Exception as e:
    # try to clean it
    idx1 = data.find('[')
    idx2 = data.rfind(']')
    if idx1 != -1 and idx2 != -1:
        data = data[idx1:idx2+1]
        items = json.loads(data)
    else:
        raise e

# Group by sprint
sprints = {}
for item in items:
    sprint = item.get('sprint_title', 'Unknown Sprint')
    if sprint not in sprints:
        sprints[sprint] = []
    sprints[sprint].append(item)

out_md = "# Lab Solutions\n\n"
for sprint, tickets in sprints.items():
    out_md += f"## {sprint}\n\n"
    for ticket in tickets:
        out_md += f"### {ticket['ticket_title']}\n\n"
        tasks = ticket.get('tasks', [])
        solutions = ticket.get('solution', {})
        if isinstance(tasks, str):
            tasks = json.loads(tasks)
        if isinstance(solutions, str):
            solutions = json.loads(solutions)
            
        if not tasks:
            continue
            
        for task in tasks:
            if isinstance(task, str):
                try:
                    task = json.loads(task)
                except:
                    continue
                    
            if not isinstance(task, dict):
                continue
                
            task_slug = task.get('task_slug')
            title = task.get('title', 'Unknown Task')
            desc = task.get('description', '')
            
            if not task_slug:
                continue
                
            sol = solutions.get(task_slug)
            if not sol:
                continue
                
            out_md += f"#### {title}\n"
            out_md += f"{desc}\n\n"
            
            # sol might be a list of dicts, or a dict, or just a string
            if isinstance(sol, list):
                for s in sol:
                    query = s.get('query', '')
                    out_md += f"```sql\n{query}\n```\n\n"
            elif isinstance(sol, dict):
                query = sol.get('query', '')
                out_md += f"```sql\n{query}\n```\n\n"
            elif isinstance(sol, str):
                out_md += f"```sql\n{sol}\n```\n\n"

with open('all_lab_solutions.md', 'w', encoding='utf-8') as f:
    f.write(out_md)
print("Done writing all_lab_solutions.md")
