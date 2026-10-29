import os
import requests
from .models import TicketProgressStatus

def evaluate_and_score_submission(submission):
    ticket = submission.lab_sprint_ticket
    scoring_rules = ticket.scoring_rules or {}
    expected_solution = ticket.solution or {}
    
    expected_query = expected_solution.get("query.sql", "").strip()
    user_query = submission.solution.strip()
    expected_output = expected_solution.get("expected_output", "")
    
    system_query = scoring_rules.get("system_query", "").strip()
    expected_result = scoring_rules.get("expected_result", "").strip()
    
    payload = {
        "database_engine": "sqlite",
        "user_id": str(submission.user.id),
        "lab_id": str(ticket.sprint.lab.id),
        "sprint_id": str(ticket.sprint.id),
        "user_query": user_query,
        "expected_query": expected_query,
        "user_output": submission.solution_output,
        "expected_output": expected_output,
        "scoring_rules": scoring_rules,
        "system_query": system_query,
        "expected_result": expected_result
    }
    
    if ticket.sprint.lab.type == 'DATABASE':
        try:
            executer_host = os.environ.get("CODE_EXECUTOR_URL", os.environ.get("CODE_EXECUTER_URL", "http://yuvro-code-executor:8009"))
            response = requests.post(f"{executer_host}/workspace/database_evaluate", json=payload, timeout=5)
            if response.status_code == 200:
                eval_data = response.json()
                final_score_pct = eval_data.get("final_score_pct", 0.0)
            else:
                final_score_pct = 0.0
        except requests.RequestException:
            final_score_pct = 0.0
            
        total_points = int(ticket.yuvro_points * final_score_pct)
    else:
        # For non-database labs, we trust the test results set by the frontend/other evaluators.
        # If no valid solution_output is present, award nothing (never infer a pass from status alone).
        try:
            import json
            parsed = json.loads(submission.solution_output)
            test_pct = parsed.get("percentage", parsed.get("total_score", 0.0))
            final_score_pct = max(0.0, min(float(test_pct), 100.0)) / 100.0
        except Exception:
            final_score_pct = 0.0
                
        total_points = int(ticket.yuvro_points * final_score_pct)
    
    if submission.solution_revealed:
        total_points = 0
    elif submission.hint_penalty_applied:
        total_points = total_points // 2
        
    submission.yuvro_points = total_points
    
    if total_points >= ticket.yuvro_points and ticket.yuvro_points > 0:
        submission.ticket_status = TicketProgressStatus.DONE
    elif total_points > 0:
        submission.ticket_status = TicketProgressStatus.IN_REVIEW
    elif final_score_pct < 0.7 and submission.ticket_status == TicketProgressStatus.DONE:
        submission.ticket_status = TicketProgressStatus.IN_PROGRESS
        
    return total_points
