import json
import glob
from difflib import get_close_matches

def fix_all():
    files = glob.glob('course/fixtures/prod/**/*.json', recursive=True)
    for f in files:
        if 'course.json' in f: continue
        with open(f, 'r') as file:
            try:
                data = json.load(file)
            except Exception:
                continue
                
        modified = False
        if 'subunits' in data and 'sub_units' not in data:
            data['sub_units'] = data.pop('subunits')
            modified = True
            
        unit_name = data.get('name')
        if not unit_name: 
            if modified:
                with open(f, 'w') as file:
                    json.dump(data, file, indent=4)
            continue
        
        valid_subunits = [su.get('name') for su in data.get('sub_units', []) if su.get('name')]
        
        for q in data.get('questions', []):
            level = q.get('level', 'subject')
            if level in ['subtopic', 'subunit']:
                old_unit_name = q.get('unit_name', q.get('topic_name'))
                if old_unit_name != unit_name:
                    q['unit_name'] = unit_name
                    modified = True
                    
                su_name = q.get('subunit_name', q.get('subtopic_name'))
                if su_name and su_name not in valid_subunits and valid_subunits:
                    matches = get_close_matches(su_name, valid_subunits, n=1, cutoff=0.3)
                    if matches:
                        q['subunit_name'] = matches[0]
                        modified = True
                    else:
                        for vsu in valid_subunits:
                            if su_name.lower() in vsu.lower() or vsu.lower() in su_name.lower():
                                q['subunit_name'] = vsu
                                modified = True
                                break
        
        if modified:
            with open(f, 'w') as file:
                json.dump(data, file, indent=4)
            print(f"Fixed {f}")

fix_all()
