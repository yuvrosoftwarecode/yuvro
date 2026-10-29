import json
import logging
import os
import re

logger = logging.getLogger(__name__)

SYSTEM_DESIGN_SCHEMA_TEMPLATE = {
    "nodes": [],
    "edges": [],
    "seq": "",
    "schema": "",
    "apis": [],
    "notes": {
        "hld": "",
        "sequence": "",
        "schema": "",
        "api": "",
    },
}


def get_empty_system_design():
    return {
        "nodes": [],
        "edges": [],
        "seq": "",
        "schema": "",
        "apis": [],
        "notes": {
            "hld": "",
            "sequence": "",
            "schema": "",
            "api": "",
        },
    }


def normalize_system_design(data):
    """
    Validates and normalizes the system design JSON structure.
    Accepts a dictionary or JSON string, ensuring that:
    - nodes: list of dicts with id, kind, label, x, y, icon
    - edges: list of dicts with id, from, to, label
    - seq: string (Mermaid sequence diagram)
    - schema: string (DBML database schema)
    - apis: list of dicts with id, method, path, summary, request, status, response
    - notes: dict with keys hld, sequence, schema, api
    """
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}

    if not isinstance(data, dict):
        return get_empty_system_design()

    nodes = data.get("nodes")
    edges = data.get("edges")
    seq = data.get("seq")
    schema = data.get("schema")
    apis = data.get("apis")
    notes = data.get("notes")

    clean_nodes = []
    if isinstance(nodes, list):
        for n in nodes:
            if isinstance(n, dict):
                clean_nodes.append({
                    "id": str(n.get("id") or ""),
                    "kind": str(n.get("kind") or "service"),
                    "label": str(n.get("label") or ""),
                    "icon": str(n.get("icon") or ""),
                    "x": float(n.get("x") or 0),
                    "y": float(n.get("y") or 0),
                })

    clean_edges = []
    if isinstance(edges, list):
        for e in edges:
            if isinstance(e, dict):
                clean_edges.append({
                    "id": str(e.get("id") or ""),
                    "from": str(e.get("from") or ""),
                    "to": str(e.get("to") or ""),
                    "label": str(e.get("label") or ""),
                })

    clean_apis = []
    if isinstance(apis, list):
        for a in apis:
            if isinstance(a, dict):
                clean_apis.append({
                    "id": str(a.get("id") or ""),
                    "method": str(a.get("method") or "GET").upper(),
                    "path": str(a.get("path") or "/"),
                    "summary": str(a.get("summary") or ""),
                    "request": str(a.get("request") or "") if not isinstance(a.get("request"), (dict, list)) else json.dumps(a.get("request"), indent=2),
                    "status": str(a.get("status") or "200 OK"),
                    "response": str(a.get("response") or "") if not isinstance(a.get("response"), (dict, list)) else json.dumps(a.get("response"), indent=2),
                })

    clean_notes = {"hld": "", "sequence": "", "schema": "", "api": ""}
    if isinstance(notes, dict):
        for k in ["hld", "sequence", "schema", "api"]:
            clean_notes[k] = str(notes.get(k) or "")
    elif isinstance(notes, str):
        clean_notes["hld"] = notes

    return {
        "nodes": clean_nodes,
        "edges": clean_edges,
        "seq": str(seq or ""),
        "schema": str(schema or ""),
        "apis": clean_apis,
        "notes": clean_notes,
    }


KNOWN_COMPONENTS = [
    ("Web Client", [r"\bweb client\b", r"\bclient\b", r"\bbrowser\b", r"\bfrontend\b"]),
    ("Mobile App", [r"\bmobile app\b", r"\bmobile\b", r"\bapp client\b"]),
    ("User / Actor", [r"\buser\b", r"\bactor\b", r"\bcustomer\b"]),
    ("API Gateway", [r"\bapi gateway\b", r"\bgateway\b", r"\breverse proxy\b"]),
    ("Load Balancer", [r"\bload balancer\b", r"\bbalancer\b", r"\blb\b", r"\balb\b"]),
    ("Product Service", [r"\bproduct service\b", r"\bcatalog service\b", r"\bproduct\b"]),
    ("Order Service", [r"\border service\b", r"\border processing\b", r"\border\b"]),
    ("URL Service", [r"\burl service\b", r"\burl shortener\b", r"\bshortener\b"]),
    ("Notification Service", [r"\bnotification service\b", r"\bnotification\b", r"\bnotifier\b"]),
    ("Auth Service", [r"\bauth service\b", r"\bauthentication service\b", r"\bauth\b"]),
    ("Streaming Service", [r"\bstreaming service\b", r"\bstreaming\b", r"\bvideo service\b"]),
    ("PostgreSQL", [r"\bpostgresql\b", r"\bpostgres\b"]),
    ("MySQL", [r"\bmysql\b"]),
    ("Database", [r"\bdatabase\b", r"\bdata store\b", r"\bdatastore\b", r"\bsql db\b", r"\bdb\b"]),
    ("Redis", [r"\bredis\b", r"\bcache\b", r"\bmemcached\b"]),
    ("Kafka", [r"\bkafka\b", r"\bevent bus\b"]),
    ("Message Queue", [r"\bmessage queue\b", r"\bqueue\b", r"\bsqs\b", r"\brabbitmq\b"]),
    ("Worker", [r"\bworker\b", r"\bbackground worker\b", r"\bconsumer\b"]),
    ("CDN", [r"\bcdn\b", r"\bcloudfront\b"]),
    ("Object Storage", [r"\bobject storage\b", r"\bs3\b", r"\bblob storage\b", r"\bblob\b"]),
]


def evaluate_system_design(ticket_data, user_design):
    """
    Evaluates a student's system design against a ticket's tasks and requirements.
    """
    design = normalize_system_design(user_design)
    nodes = design.get("nodes", [])
    edges = design.get("edges", [])
    seq = design.get("seq", "")
    schema = design.get("schema", "")
    apis = design.get("apis", [])
    notes = design.get("notes", {})

    node_texts = [f"{n.get('label', '')} {n.get('kind', '')}".lower() for n in nodes]
    node_map = {n.get("id"): f"{n.get('label', '')} {n.get('kind', '')}".lower() for n in nodes}
    has_edge_labels = any(bool(e.get("label", "").strip()) for e in edges)

    # Extract tasks
    tasks = []
    raw_tasks = getattr(ticket_data, "tasks", None)
    if raw_tasks is None and isinstance(ticket_data, dict):
        raw_tasks = ticket_data.get("tasks")

    if isinstance(raw_tasks, list) and len(raw_tasks) > 0:
        tasks = raw_tasks
    else:
        tasks = [
            "Add the core architectural components required for this service.",
            "Connect the components in the correct client-server request flow.",
            "Configure required data stores, caching, or messaging queues.",
            "Document key architectural decisions, trade-offs, or schemas.",
        ]

    task_evaluations = []
    total_tasks = len(tasks)
    max_per_task = round(100.0 / total_tasks) if total_tasks > 0 else 25

    for idx, t in enumerate(tasks):
        t_title = t if isinstance(t, str) else (t.get("title") or t.get("description") or f"Task {idx + 1}")
        t_marks = t.get("marks", max_per_task) if isinstance(t, dict) else max_per_task
        t_lower = t_title.lower()

        passed = False
        earned = 0
        feedback = ""

        is_connection_task = (
            any(k in t_lower for k in ["connect", "route", "routing", "entry point"])
            and not re.search(r"\badd\b", t_lower)
        )
        is_label_task = "label" in t_lower and "connection" in t_lower
        is_decouple_task = (
            any(k in t_lower for k in ["separate", "decouple", "distinguish"])
            and not "connect" in t_lower
        )

        if is_label_task:
            if len(edges) >= 2 and has_edge_labels:
                passed = True
                earned = t_marks
                feedback = "Connection lines are routed and labeled with protocol or action names."
            elif len(edges) >= 2:
                passed = False
                earned = round(t_marks * 0.4)
                feedback = "Components are connected. Double click edges to add descriptive labels (e.g. 'HTTPS', 'read', 'write')."
            else:
                passed = False
                earned = 0
                feedback = "Connect components and label the connection lines with request flows."

        elif is_decouple_task:
            service_nodes = [n for n in nodes if re.search(r"service|worker|instance|process|app", f"{n.get('label', '')} {n.get('kind', '')}", re.I)]
            if len(service_nodes) >= 2:
                passed = True
                earned = t_marks
                feedback = f"Decoupled workloads into {len(service_nodes)} dedicated service components: {', '.join(n.get('label', '') for n in service_nodes)}."
            else:
                passed = False
                earned = round(t_marks * 0.5) if len(service_nodes) > 0 else 0
                feedback = "Add separate service nodes on the canvas to isolate browsing from order/creation workloads."

        elif is_connection_task:
            has_client_to_gateway = any(
                (re.search(r"client|user|app|actor", node_map.get(e.get("from"), "")) and re.search(r"gateway|load balancer|balancer|lb|proxy", node_map.get(e.get("to"), "")))
                or (re.search(r"client|user|app|actor", node_map.get(e.get("from"), "")) and re.search(r"service|shortener", node_map.get(e.get("to"), "")))
                for e in edges
            )
            has_service_to_db = any(
                re.search(r"service|shortener|worker", node_map.get(e.get("from"), "")) and re.search(r"database|db|postgres|mysql|redis|cache|mongo|dynamo", node_map.get(e.get("to"), ""))
                for e in edges
            )

            if len(edges) >= 3 and (has_client_to_gateway or has_service_to_db):
                passed = True
                earned = t_marks
                feedback = f"Configured valid request flows and data connections ({len(edges)} connections placed)."
            elif len(edges) >= 1:
                passed = False
                earned = round(t_marks * 0.5)
                feedback = "Connect services to their corresponding data stores and clients to entry gateways."
            else:
                passed = False
                earned = 0
                feedback = "Drag connection lines from component connectors to link clients, services, and databases."

        # Sequence diagram
        elif any(k in t_lower for k in ["sequence", "mermaid", "participant", "interaction flow"]):
            has_seq = "sequenceDiagram" in seq
            has_participants = "participant" in seq or "actor" in seq
            has_arrows = "->>" in seq or "-->>" in seq
            has_branch = any(k in seq for k in ["alt", "else", "opt", "critical"])
            needs_branch = any(k in t_lower for k in ["error", "branch", "fail", "retry"])

            if has_seq and has_participants and has_arrows and (not needs_branch or has_branch):
                passed = True
                earned = t_marks
                feedback = "Sequence diagram defines interaction flows, participants, and branch handling."
            elif has_seq and has_arrows:
                passed = False
                earned = round(t_marks * 0.6)
                feedback = "Sequence diagram is present; add alternative flows or error branches as requested."
            else:
                passed = False
                earned = 0
                feedback = "Switch to Sequence tab and model the interaction flow with participants and messages."

        # DBML schema
        elif any(k in t_lower for k in ["schema", "dbml", "table", "foreign key", "primary key"]):
            has_table = "table " in schema.lower()
            has_pk = "[pk]" in schema or "pk" in schema

            if has_table and has_pk:
                passed = True
                earned = t_marks
                feedback = "Database schema defined with tables and primary keys."
            elif has_table:
                passed = False
                earned = round(t_marks * 0.5)
                feedback = "Tables defined, but primary keys [pk] or constraints should be explicitly specified."
            else:
                passed = False
                earned = 0
                feedback = "Switch to DB Schema tab and define tables with fields, primary keys, and relationships."

        # REST API
        elif any(k in t_lower for k in ["api", "endpoint", "rest", "http"]):
            if len(apis) >= 2 and any(a.get("path", "").startswith("/") for a in apis):
                passed = True
                earned = t_marks
                feedback = f"Defined {len(apis)} REST API endpoints with HTTP methods, paths, and status codes."
            elif len(apis) >= 1:
                passed = False
                earned = round(t_marks * 0.6)
                feedback = f"Found {len(apis)} endpoint; add additional endpoints to cover required operations."
            else:
                passed = False
                earned = 0
                feedback = "Switch to REST API tab and define the required endpoints and request/response contracts."

        # Trade-offs / Documentation
        elif any(k in t_lower for k in ["trade-off", "bottleneck", "document", "strategy"]):
            all_notes = " ".join(notes.values()) if isinstance(notes, dict) else str(notes)
            if len(all_notes.strip()) >= 30:
                passed = True
                earned = t_marks
                feedback = "Architectural trade-offs and decisions documented in Solution Notes."
            else:
                passed = False
                earned = 0
                feedback = "Document key trade-offs and scaling strategies in the Solution Notes drawer."

        # Component check
        else:
            required = []
            for name, patterns in KNOWN_COMPONENTS:
                if any(re.search(p, t_title, re.I) for p in patterns):
                    if name == "Database" and any(c == "PostgreSQL" or c == "MySQL" for c in required):
                        continue
                    if name not in required:
                        required.append(name)

            if required:
                found = []
                missing = []
                for req_name in required:
                    patterns = next(p for n, p in KNOWN_COMPONENTS if n == req_name)
                    if any(any(re.search(p, txt, re.I) for p in patterns) for txt in node_texts):
                        found.append(req_name)
                    else:
                        missing.append(req_name)

                if not missing:
                    passed = True
                    earned = t_marks
                    feedback = f"Added required components: {', '.join(found)}."
                elif found:
                    passed = False
                    earned = round(t_marks * (len(found) / len(required)))
                    feedback = f"Missing on canvas: {', '.join(missing)}."
                else:
                    passed = False
                    earned = 0
                    feedback = f"Missing on canvas: {', '.join(missing)}."
            else:
                if len(nodes) >= 3 and len(edges) >= 2:
                    passed = True
                    earned = t_marks
                    feedback = "Requirements satisfied by the architecture structure."
                else:
                    passed = False
                    earned = 0
                    feedback = "Add and connect components on the canvas to satisfy task requirements."

        task_evaluations.append({
            "id": f"task_{idx + 1}",
            "title": t_title,
            "passed": passed,
            "score": earned,
            "max_score": t_marks,
            "feedback": feedback,
        })

    total_score = sum(te["score"] for te in task_evaluations)
    max_score = sum(te["max_score"] for te in task_evaluations) or 100
    percentage = min(100, max(0, round((total_score / max_score) * 100)))
    passed_count = sum(1 for te in task_evaluations if te["passed"])

    summary = []
    if percentage >= 70:
        summary.append(f"Ready to submit! {passed_count}/{total_tasks} tasks passed ({percentage}%).")
    else:
        summary.append(f"Keep going: {passed_count}/{total_tasks} tasks passed ({percentage}%).")

    return {
        "total_score": percentage,
        "max_possible_score": 100,
        "percentage": percentage,
        "passed_count": passed_count,
        "total_count": total_tasks,
        "status": "passed" if percentage >= 70 else "needs_work",
        "tasks": task_evaluations,
        "summary": summary,
        "metrics": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "has_sequence": bool(seq.strip()),
            "has_schema": bool(schema.strip()),
            "api_count": len(apis),
            "has_notes": any(bool(v.strip()) for v in notes.values()) if isinstance(notes, dict) else False,
        }
    }


def evaluate_system_design_with_ai(ticket, user_design, user=None):
    """
    Evaluates system design using YHub's AI Scoring Layer (DeepSeek / Gemini Flash).
    Falls back gracefully to deterministic rule-based evaluation if YHub is unreachable.
    """
    clean_design = normalize_system_design(user_design)

    try:
        from django.conf import settings
        import requests

        yhub_url = os.environ.get(
            "YHUB_INTERNAL_URL",
            getattr(settings, "YHUB_INTERNAL_URL", "http://yhub-backend:8000")
        )
        yhub_url = yhub_url.rstrip("/")

        sprint = getattr(ticket, "sprint", None)
        lab = getattr(sprint, "lab", None) if sprint else None

        lab_context = {
            "lab_id": str(lab.id) if lab else "",
            "lab_title": str(lab.title) if lab else "System Design Lab",
            "sprint_title": str(sprint.title) if sprint else "",
            "ticket_id": str(ticket.id),
            "ticket_title": str(ticket.title),
            "ticket_description": str(ticket.description or ""),
            "tasks": getattr(ticket, "tasks", []) or [],
            "constraints": [
                "High availability with no single point of failure",
                "Low latency for client reads and writes",
                "Proper data persistence, caching, and decoupling",
            ],
            "golden_solution": getattr(ticket, "solution", {}) or {},
        }

        payload = {
            "lab_context": lab_context,
            "user_submission": clean_design,
            "provider": "deepseek",
            "model_name": "deepseek-chat",
            "save_record": True,
        }

        resp = requests.post(
            f"{yhub_url}/api/scoring/system-design/",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        if resp.status_code == 200:
            result = resp.json()
            if isinstance(result, dict) and "overall_score" in result:
                result["total_score"] = result.get("overall_score", 0)
                result["percentage"] = result.get("overall_score", 0)
                result["tasks"] = result.get("task_breakdown", result.get("tasks", []))
                return result

    except Exception as e:
        logger.warning(f"YHub AI scoring call failed ({e}). Falling back to deterministic rule engine.")

    return evaluate_system_design(ticket, clean_design)

