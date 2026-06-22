with open('ycode-backend-api/assessment/admin.py', 'r') as f:
    ycode_lines = f.readlines()

new_admin = ycode_lines[340:593] # from @admin.register down to just before JobTestSubmissionAdmin

with open('ycampus-backend-api/assessment/admin.py', 'r') as f:
    ycampus_lines = f.readlines()

start_idx = None
end_idx = None
for i, line in enumerate(ycampus_lines):
    if 'class MockInterviewSubmissionAdmin' in line:
        start_idx = i - 1 # include the @admin.register line
    elif 'class JobTestSubmissionAdmin' in line:
        end_idx = i - 1
        break

ycampus_lines[start_idx:end_idx] = new_admin

with open('ycampus-backend-api/assessment/admin.py', 'w') as f:
    f.writelines(ycampus_lines)

print("Patch applied to admin.py successfully.")
