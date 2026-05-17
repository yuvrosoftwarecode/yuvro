import json
import glob

def fix_unit_names():
    files = glob.glob('course/fixtures/prod/**/*.json', recursive=True)
    for f in files:
        if 'course.json' in f: continue
        
        with open(f, 'r') as file:
            try:
                data = json.load(file)
            except Exception:
                continue
                
        modified = False
        unit_name = data.get('name')
        if not unit_name: continue
        
        # Build set of valid subunit names
        valid_subunits = set()
        for su in data.get('sub_units', []):
            valid_subunits.add(su.get('name'))
            
        questions = data.get('questions', [])
        for q in questions:
            level = q.get('level', 'subject')
            if level in ['subtopic', 'subunit']:
                old_unit_name = q.get('unit_name', q.get('topic_name'))
                if old_unit_name != unit_name:
                    q['unit_name'] = unit_name
                    modified = True
                    
                # Fix subunit names if they differ slightly
                su_name = q.get('subunit_name', q.get('subtopic_name'))
                if su_name and su_name not in valid_subunits:
                    # try to find a close match, e.g. ignoring case
                    for valid_su in valid_subunits:
                        if valid_su.lower() == su_name.lower():
                            q['subunit_name'] = valid_su
                            modified = True
                            break
                            
        if modified:
            with open(f, 'w') as file:
                json.dump(data, file, indent=4)
            print(f"Fixed {f}")

fix_unit_names()
