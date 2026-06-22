import sys

with open('ycode-backend-api/assessment/views.py', 'r') as f:
    lines = f.readlines()

new_methods = lines[2146:2730] # 2147 to 2731

with open('ycampus-backend-api/assessment/views.py', 'r') as f:
    ycampus_lines = f.readlines()

for i, line in enumerate(ycampus_lines):
    if 'class SkillTestSubmissionViewSet' in line:
        insert_idx = i - 1
        break

ycampus_lines.insert(insert_idx, "".join(new_methods) + "\n")

with open('ycampus-backend-api/assessment/views.py', 'w') as f:
    f.writelines(ycampus_lines)

print("Patch applied successfully.")
