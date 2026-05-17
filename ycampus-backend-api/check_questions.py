import json
import glob
import sys

def check_questions(data, filepath):
    questions = []
    
    # Check root level
    if 'questions' in data:
        questions.extend(data['questions'])
        
    # Check subjects level
    for subject in data.get('subjects', data.get('courses', [])):
        if 'questions' in subject:
            questions.extend(subject['questions'])
            
        for unit in subject.get('units', subject.get('topics', [])):
            if 'questions' in unit:
                questions.extend(unit['questions'])
                
            for subunit in unit.get('sub_units', unit.get('subtopics', [])):
                if 'questions' in subunit:
                    questions.extend(subunit['questions'])
                    
    # Also for modular units
    if 'sub_units' in data:
        for subunit in data['sub_units']:
            if 'questions' in subunit:
                questions.extend(subunit['questions'])
                
    # Direct questions array in unit files
    if 'questions' in data and filepath.endswith('.json') and 'course.json' not in filepath:
        pass # Already captured above

    for q in questions:
        level = q.get('level', 'subject')
        if level in ['subtopic', 'subunit']:
            unit_name = q.get('unit_name', q.get('topic_name'))
            subunit_name = q.get('subunit_name', q.get('subtopic_name'))
            if not unit_name or not subunit_name:
                print(f"Error in {filepath}: Question '{q.get('title')}' is subunit level but missing unit_name or subunit_name")

for f in glob.glob('course/fixtures/prod/**/*.json', recursive=True):
    with open(f, 'r') as file:
        try:
            data = json.load(file)
            check_questions(data, f)
        except Exception as e:
            print(f"Failed to read {f}: {e}")

