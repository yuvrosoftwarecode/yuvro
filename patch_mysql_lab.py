import json
import glob
import os

mysql_sprints = glob.glob(r"c:\Users\vloke\OneDrive\Documents\yuvro intern\yuvro\ylabs-backend-api\lab\fixtures\dev\mysql_lab\sprints\sprint_*.json")

for path in mysql_sprints:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # SQLite -> MySQL syntax fixes
    content = content.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "INT AUTO_INCREMENT PRIMARY KEY")
    content = content.replace("TEXT DEFAULT", "VARCHAR(255) DEFAULT")
    content = content.replace("date('now')", "CURDATE()")
    content = content.replace("PRAGMA index_list('todos');", "SHOW INDEX FROM todos;")
    content = content.replace("PRAGMA index_info('idx_todos_status');", "SHOW INDEX FROM todos WHERE Key_name = 'idx_todos_status';")
    content = content.replace("information_schema.columns WHERE table_name=", "information_schema.columns WHERE table_schema=DATABASE() AND table_name=")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("MySQL lab JSON files patched successfully!")
