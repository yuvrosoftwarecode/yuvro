import re
import os
import asyncio
import tempfile
from typing import Optional, Dict, Any
from pydantic import BaseModel

class SqliteRunRequest(BaseModel):
    user_id: str
    lab_id: str
    sprint_id: str
    query: str
    db_file: str = "lab.db"
    expected_query: Optional[str] = None
    expected_output: Optional[str] = None
    scoring_rules: Optional[Dict[str, int]] = None

def evaluate_sql_submission(user_query: str, expected_query: str, user_output: str, expected_output: str, scoring_rules: dict) -> dict:
    logic_score_weight = scoring_rules.get("logic_score", 100) / 100.0
    
    expected_query = (expected_query or "").strip()
    user_query = (user_query or "").strip()
    
    def normalize_str(s):
        s = re.sub(r'--.*', '', s)
        s = re.sub(r'\s+', ' ', s).strip().lower()
        s = re.sub(r'\s*\(\s*', '(', s)
        s = re.sub(r'\s*\)\s*', ')', s)
        s = re.sub(r'\s*,\s*', ',', s)
        s = re.sub(r'\s*;\s*', ';', s)
        return s

    norm_expected = normalize_str(expected_query)
    norm_user = normalize_str(user_query)
    
    query_matches = (norm_expected in norm_user) if norm_expected else False
    
    expected_output = expected_output or ""
    output_matches = True
    
    if "Error:" in user_output or "Parse error" in user_output or re.search(r"exit code [^0]", user_output) or "Traceback" in user_output:
        output_matches = False

    if expected_output and output_matches:
        try:
            if not re.search(expected_output, user_output, re.IGNORECASE) and expected_output not in user_output:
                output_matches = False
        except re.error:
            if expected_output not in user_output:
                output_matches = False

    earned_percentage = 0.0
    if query_matches and output_matches:
        earned_percentage = 1.0
    elif query_matches or (expected_output and output_matches):
        earned_percentage = 0.5
        
    final_score_pct = logic_score_weight * earned_percentage
    
    return {
        "query_matches": query_matches,
        "output_matches": output_matches,
        "earned_percentage": earned_percentage,
        "final_score_pct": final_score_pct
    }
