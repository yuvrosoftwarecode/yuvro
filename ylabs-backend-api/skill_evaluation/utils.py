import logging
from .models import LabType

logger = logging.getLogger(__name__)

def is_database_lab(lab, tasks=None) -> bool:
    """
    Determines if a lab (LabQuestionBank or Lab) is a database lab where candidates
    work with database queries / task SQL files.
    """
    if not lab:
        return False

    # 1. Check explicit type if defined
    lab_type = getattr(lab, "type", None)
    if lab_type:
        lab_type_str = str(lab_type).strip().upper()
        if lab_type_str == "DATABASE" or lab_type_str == LabType.DATABASE:
            return True
        # If type is explicitly something else (e.g. BACKEND, FRONTEND, FULL_STACK, QA, DEVOPS)
        if lab_type_str in [
            "BACKEND", LabType.BACKEND,
            "FRONTEND", LabType.FRONTEND,
            "FULL_STACK", LabType.FULL_STACK,
            "QUALITY_ASSURANCE", LabType.QUALITY_ASSURANCE,
            "DEVOPS", LabType.DEVOPS,
        ]:
            return False

    # 2. Check programming languages:
    # If the ONLY programming language specified is SQL, it's a database lab.
    prog_langs = [str(pl).upper() for pl in (getattr(lab, "programming_languages", []) or [])]
    non_sql_langs = [pl for pl in prog_langs if pl != "SQL"]
    if prog_langs and "SQL" in prog_langs and not non_sql_langs:
        return True

    # 3. Check tasks solution & scoring rules as a fallback
    if tasks is None:
        tasks_rel = getattr(lab, "tasks", None)
        if tasks_rel is not None:
            if hasattr(tasks_rel, "all"):
                tasks = tasks_rel.all()
            elif isinstance(tasks_rel, (list, tuple)):
                tasks = tasks_rel
        else:
            tasks = []

    if tasks:
        for task in tasks:
            sol = getattr(task, "solution", {}) if not isinstance(task, dict) else task.get("solution", {})
            rules = getattr(task, "scoring_rules", {}) if not isinstance(task, dict) else task.get("scoring_rules", {})

            if not isinstance(sol, dict):
                sol = {}
            if not isinstance(rules, dict):
                rules = {}

            if sol.get("query.sql"):
                return True
            if any(isinstance(k, str) and k.endswith(".sql") for k in sol.keys()):
                return True
            if rules.get("database_engine"):
                return True

            system_query = rules.get("system_query")
            if isinstance(system_query, str):
                sq_clean = system_query.strip().upper()
                if sq_clean and sq_clean not in ["N/A", "NA", "NONE", "NULL"]:
                    sql_keywords = ("SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "WITH", "ALTER", "DROP", "PRAGMA")
                    if sq_clean.startswith(sql_keywords):
                        return True

    return False
