import json
import glob

def fix_subunit_names():
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
        
        valid_subunits = []
        for su in data.get('sub_units', []):
            valid_subunits.append(su.get('name'))
            
        questions = data.get('questions', [])
        for q in questions:
            level = q.get('level', 'subject')
            if level in ['subtopic', 'subunit']:
                su_name = q.get('subunit_name', q.get('subtopic_name'))
                if su_name and su_name not in valid_subunits:
                    # fuzzy match: check if su_name is a substring of any valid subunit, or vice-versa
                    for valid_su in valid_subunits:
                        if su_name.lower() in valid_su.lower() or valid_su.lower() in su_name.lower():
                            q['subunit_name'] = valid_su
                            modified = True
                            break
                            
        if modified:
            with open(f, 'w') as file:
                json.dump(data, file, indent=4)
            print(f"Fixed subunit names in {f}")

fix_subunit_names()
