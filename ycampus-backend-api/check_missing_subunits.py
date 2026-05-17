import json
import glob
import sys

def check_questions(data, filepath):
    # Collect defined units and subunits
    valid_keys = set()
    
    if 'sub_units' in data: # Unit file
        unit_name = data.get('name')
        for su in data.get('sub_units', []):
            su_name = su.get('name')
            valid_keys.add(f"{unit_name}::{su_name}")
            
    # For subjects level
    for subject in data.get('subjects', data.get('courses', [])):
        for unit in subject.get('units', subject.get('topics', [])):
            unit_name = unit.get('name')
            for su in unit.get('sub_units', unit.get('subtopics', [])):
                su_name = su.get('name')
                valid_keys.add(f"{unit_name}::{su_name}")

    questions = data.get('questions', [])
    for q in questions:
        level = q.get('level', 'subject')
        if level in ['subtopic', 'subunit']:
            unit_name = q.get('unit_name', q.get('topic_name'))
            subunit_name = q.get('subunit_name', q.get('subtopic_name'))
            key = f"{unit_name}::{subunit_name}"
            if key not in valid_keys:
                print(f"Error in {filepath}: Key '{key}' not found in valid keys. Question: {q.get('title')}")

for f in glob.glob('course/fixtures/prod/**/*.json', recursive=True):
    with open(f, 'r') as file:
        try:
            data = json.load(file)
            check_questions(data, f)
        except Exception as e:
            pass

