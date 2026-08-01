import json
import os
import re

directory = r"c:\Users\vloke\OneDrive\Documents\yuvro intern\yuvro\ylabs-backend-api\lab\fixtures\dev\postgresql_lab\sprints"

for filename in os.listdir(directory):
    if not filename.endswith(".json"):
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    changed = False
    
    for ticket in data.get("tickets", []):
        scoring_rules = ticket.get("scoring_rules", {})
        sys_query = scoring_rules.get("system_query", "")
        
        # Fix system_query
        if "postgresql_master" in sys_query:
            if "type='table' AND name=" in sys_query:
                match = re.search(r"name='([^']+)'", sys_query)
                if match:
                    table_name = match.group(1)
                    scoring_rules["system_query"] = f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}';"
                    scoring_rules["expected_result"] = "id"  # Safe default since all these tables have an 'id' column
                    changed = True
            elif "type='index' AND name=" in sys_query:
                match = re.search(r"name='([^']+)'", sys_query)
                if match:
                    idx_name = match.group(1)
                    scoring_rules["system_query"] = f"SELECT indexname FROM pg_indexes WHERE indexname='{idx_name}';"
                    scoring_rules["expected_result"] = idx_name
                    changed = True
            elif "type='table'" in sys_query and "name=" not in sys_query:
                scoring_rules["system_query"] = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
                scoring_rules["expected_result"] = "users" # default for sprint 1
                changed = True
                
        # Fix query.sql and description for AUTOINCREMENT -> SERIAL
        if "solution" in ticket and "query.sql" in ticket["solution"]:
            old_q = ticket["solution"]["query.sql"]
            new_q = old_q.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            if old_q != new_q:
                ticket["solution"]["query.sql"] = new_q
                changed = True
                
        # Also fix AUTOINCREMENT in description/tasks just in case, or rather fix the syntax
        if "description" in ticket:
            ticket["description"] = ticket["description"].replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            ticket["description"] = ticket["description"].replace("auto-incrementing", "serial")
        
        if "tasks" in ticket:
            new_tasks = []
            for task in ticket["tasks"]:
                if isinstance(task, str):
                    new_tasks.append(task.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY").replace("auto-incrementing", "serial"))
                else:
                    new_tasks.append(task)
            ticket["tasks"] = new_tasks

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
print("Done fixing PostgreSQL JSONs.")
