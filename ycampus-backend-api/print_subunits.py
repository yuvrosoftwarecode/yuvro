import json
import sys

files = [
    'course/fixtures/prod/HTML-CSS/units/00_intro_to_html.json',
    'course/fixtures/prod/react_js/units/00_JS_Essentials_for_React.json',
    'course/fixtures/prod/sql/units/00_sql_fundamentals.json'
]
for f in files:
    with open(f, 'r') as file:
        data = json.load(file)
        print(f"File: {f}")
        for su in data.get('sub_units', []):
            print(f"  - {su.get('name')}")

