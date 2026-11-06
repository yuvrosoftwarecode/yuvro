import json
import logging
import re
from typing import Any, Dict, List, Optional
from .base import BaseLabEvaluator
from .llm_client import ScoringLLMClient

logger = logging.getLogger(__name__)


class SystemDesignLabEvaluator(BaseLabEvaluator):
    """
    Evaluator specialized for System Design Labs.
    Analyzes all four tabs of student work:
    - High-Level Architecture (HLD): Components and connection topology
    - Sequence Diagram: Mermaid interaction flows and branching logic
    - Database Schema: DDL / tables, columns, indexes, relationships
    - REST APIs: Endpoints, methods, payloads, status codes
    - Architectural Notes: Scale estimations, non-functional requirements, trade-offs
    """

    SYSTEM_PROMPT = """You are a Principal Distributed Systems Architect and Lead Technical Interviewer at top-tier technology companies.
Your responsibility is to grade and provide comprehensive feedback on a candidate's System Design submission for a realistic engineering lab ticket.

You must evaluate the architecture across 5 key pillars:
1. Architectural Soundness: Component tiers, separation of concerns, decoupling (gateways, load balancers, services, workers, caches, message queues, databases).
2. Scalability & Resilience: Handling scale, read/write skews, caching strategies, replication, partitions, failure modes, avoiding single points of failure.
3. Temporal Interactions (Sequence Diagram): Mermaid syntax, participants, synchronous/asynchronous flows, alternative branches (e.g. cache hit vs cache miss).
4. Data Modeling & Storage (Schema): Table/document definitions, primary keys, foreign keys, indexing for fast lookups, data consistency.
5. API Contract Design: RESTful standards, appropriate HTTP methods, request/response bodies, status codes.

GRADING INSTRUCTIONS:
- You will be given a list of specific tasks and their maximum marks. You MUST grade EACH task individually.
- Award partial credit where work is partially correct or demonstrated.
- Total score must be between 0 and 100, exactly matching the sum of task scores.
- Return ONLY a valid JSON object matching the requested schema. No prose outside the JSON."""

    def __init__(
        self,
        provider: str = "deepseek",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(provider=provider, model_name=model_name, api_key=api_key, **kwargs)
        self.client = ScoringLLMClient(
            provider=self.provider,
            model_name=self.model_name,
            api_key=self.api_key,
        )

    def evaluate(
        self, lab_context: Dict[str, Any], user_submission: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Synchronously evaluate system design."""
        import asyncio
        return asyncio.run(self.aevaluate(lab_context, user_submission))

    async def aevaluate(
        self, lab_context: Dict[str, Any], user_submission: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Asynchronously evaluate system design with DeepSeek / Gemini Flash."""
        valid, err = self.validate_input(lab_context, user_submission)
        if not valid:
            raise ValueError(f"Invalid input: {err}")

        normalized_work = self._normalize_user_submission(user_submission)
        normalized_context = self._normalize_lab_context(lab_context)

        prompt = self._build_prompt(normalized_context, normalized_work)

        try:
            llm_result = await self.client.agenerate(
                prompt=prompt,
                system_prompt=self.SYSTEM_PROMPT,
                temperature=0.2,
                max_tokens=4096,
            )

            parsed = self.extract_json(llm_result["content"])
            validated_output = self._post_process_result(
                parsed,
                normalized_context,
                normalized_work,
                llm_result.get("provider", self.provider),
                llm_result.get("model", self.model_name or "deepseek-chat"),
                llm_result.get("latency_ms", 0),
            )
            return validated_output

        except Exception as e:
            logger.error(f"SystemDesignLabEvaluator: LLM evaluation failed: {e}. Running deterministic evaluation.")
            return self._fallback_deterministic_evaluation(normalized_context, normalized_work, str(e))

    def _normalize_user_submission(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extracts and normalizes HLD, Sequence, Schema, APIs, and Notes."""
        if not isinstance(data, dict):
            return {"nodes": [], "edges": [], "sequence": "", "schema": "", "apis": [], "notes": {}}

        # Handle 4-tab export format
        tabs = data.get("tabs", {})
        if isinstance(tabs, dict) and tabs:
            hld_data = tabs.get("hld", {})
            nodes = hld_data.get("nodes", []) if isinstance(hld_data, dict) else []
            edges = hld_data.get("edges", []) if isinstance(hld_data, dict) else []
            seq = tabs.get("sequence", "")
            schema = tabs.get("schema", "")
            apis = tabs.get("api", [])
            notes = tabs.get("notes", {})
        else:
            # Handle direct dictionary format
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
            seq = data.get("sequence", data.get("seq", ""))
            schema = data.get("schema", "")
            apis = data.get("apis", data.get("api", []))
            notes = data.get("notes", {})

        clean_nodes = []
        if isinstance(nodes, list):
            for n in nodes:
                if isinstance(n, dict):
                    clean_nodes.append({
                        "id": str(n.get("id", "")),
                        "label": str(n.get("label", "")),
                        "kind": str(n.get("kind", "")),
                        "icon": str(n.get("icon", "")),
                    })

        clean_edges = []
        if isinstance(edges, list):
            for e in edges:
                if isinstance(e, dict):
                    clean_edges.append({
                        "id": str(e.get("id", "")),
                        "from": str(e.get("from", "")),
                        "to": str(e.get("to", "")),
                        "label": str(e.get("label", "")),
                    })

        return {
            "nodes": clean_nodes,
            "edges": clean_edges,
            "sequence": str(seq or "").strip(),
            "schema": str(schema or "").strip(),
            "apis": apis if isinstance(apis, list) else [],
            "notes": notes if isinstance(notes, dict) else {},
        }

    def _normalize_lab_context(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes lab title, ticket tasks, requirements, constraints, and golden criteria."""
        lab_title = ctx.get("lab_title", ctx.get("lab_name", "System Design Lab"))
        ticket_title = ctx.get("ticket_title", ctx.get("title", "System Architecture Ticket"))
        ticket_description = ctx.get("ticket_description", ctx.get("description", ""))

        raw_tasks = ctx.get("tasks", [])
        if not raw_tasks and isinstance(ctx.get("ticket"), dict):
            raw_tasks = ctx["ticket"].get("tasks", [])

        tasks = []
        if isinstance(raw_tasks, list) and raw_tasks:
            total_tasks = len(raw_tasks)
            default_marks = round(100.0 / total_tasks, 1)
            for i, t in enumerate(raw_tasks):
                if isinstance(t, str):
                    tasks.append({"title": t, "marks": default_marks, "criteria": t})
                elif isinstance(t, dict):
                    title = t.get("title") or t.get("description") or f"Task {i + 1}"
                    marks = float(t.get("marks", default_marks))
                    criteria = t.get("criteria", title)
                    tasks.append({"title": title, "marks": marks, "criteria": criteria})
        else:
            tasks = [
                {"title": "Core Components & Architecture Tiers", "marks": 25.0, "criteria": "Add and configure necessary client, gateway, microservice, caching, and persistence components."},
                {"title": "Connection Topology & Protocol Routing", "marks": 25.0, "criteria": "Route connections with clear protocol/action labels (HTTPS, gRPC, cache query, DB write)."},
                {"title": "Mermaid Sequence Diagram Flow", "marks": 25.0, "criteria": "Accurate sequence diagram detailing end-to-end client request, caching hit/miss, and database persistence."},
                {"title": "Database Schema & REST API Specifications", "marks": 25.0, "criteria": "Provide clean DDL table definitions with indexes, and documented REST endpoints."},
            ]

        constraints = ctx.get("constraints", [
            "High availability with no single point of failure",
            "Low latency read/write operations",
            "Decoupled microservice workloads",
        ])

        return {
            "lab_title": lab_title,
            "ticket_title": ticket_title,
            "ticket_description": ticket_description,
            "tasks": tasks,
            "constraints": constraints,
            "golden_solution": ctx.get("golden_solution", ctx.get("solution", {})),
        }

    def _build_prompt(self, context: Dict[str, Any], work: Dict[str, Any]) -> str:
        """Constructs the prompt for the AI Evaluator."""
        tasks_text = "\n".join(
            f"- Task {i + 1}: {t['title']} (Max marks: {t['marks']})\n  Criteria: {t['criteria']}"
            for i, t in enumerate(context["tasks"])
        )

        constraints_text = "\n".join(f"- {c}" for c in context["constraints"])

        return f"""LAB CONTEXT:
Lab: {context['lab_title']}
Ticket: {context['ticket_title']}
Objective / Description:
{context['ticket_description']}

CONSTRAINTS & SYSTEM REQUIREMENTS:
{constraints_text}

TASKS & RUBRIC TO GRADE:
{tasks_text}

CANDIDATE SUBMISSION JSON:
1. High-Level Design (Nodes):
{json.dumps(work['nodes'], indent=2)}

2. Architecture Connections (Edges):
{json.dumps(work['edges'], indent=2)}

3. Sequence Diagram (Mermaid):
{work['sequence'] if work['sequence'] else "[No sequence diagram provided]"}

4. Database Schema (DDL):
{work['schema'] if work['schema'] else "[No schema provided]"}

5. REST API Specifications:
{json.dumps(work['apis'], indent=2) if work['apis'] else "[No REST APIs specified]"}

6. Architectural Notes & Trade-offs:
{json.dumps(work['notes'], indent=2) if work['notes'] else "[No notes provided]"}

REQUIRED JSON OUTPUT SCHEMA:
{{
  "overall_score": <float 0-100>,
  "percentage": <float 0-100>,
  "passed": <boolean: true if overall_score >= 70.0>,
  "summary": "<2-3 sentence executive review of the candidate's design>",
  "task_breakdown": [
    {{
      "task_title": "<exact task title from rubric>",
      "score": <float earned marks, 0 to max_score>,
      "max_score": <float max_score>,
      "status": "<'passed' | 'partial' | 'failed'>",
      "feedback": "<clear, actionable critique of what was done right and what is missing>"
    }}
  ],
  "rubric_scores": {{
    "architectural_soundness": <int 0-100>,
    "scalability_and_resilience": <int 0-100>,
    "data_modeling": <int 0-100>,
    "api_design": <int 0-100>,
    "completeness": <int 0-100>
  }},
  "strengths": [
    "<specific architectural highlight 1>",
    "<specific architectural highlight 2>"
  ],
  "weaknesses": [
    "<specific vulnerability or missing element 1>",
    "<specific vulnerability or missing element 2>"
  ],
  "recommendations": [
    "<concrete recommendation for production readiness 1>",
    "<concrete recommendation for production readiness 2>"
  ]
}}"""

    def _post_process_result(
        self,
        parsed: Dict[str, Any],
        context: Dict[str, Any],
        work: Dict[str, Any],
        provider: str,
        model: str,
        latency_ms: int,
    ) -> Dict[str, Any]:
        """Validates and cleans model output to guarantee consistency and dual compatibility."""
        raw_score = parsed.get("overall_score", parsed.get("percentage", 0.0))
        try:
            overall_score = round(max(0.0, min(100.0, float(raw_score))), 1)
        except (ValueError, TypeError):
            overall_score = 0.0

        raw_tasks = parsed.get("task_breakdown", parsed.get("tasks", []))
        if not isinstance(raw_tasks, list):
            raw_tasks = []

        # Ensure all tasks from context are accounted for
        rubric_tasks = context.get("tasks", [])
        existing_titles = {
            str(t.get("task_title", t.get("title", ""))).lower()
            for t in raw_tasks
            if isinstance(t, dict)
        }

        for rt in rubric_tasks:
            rt_title = rt["title"]
            if rt_title.lower() not in existing_titles:
                raw_tasks.append({
                    "task_title": rt_title,
                    "score": round(overall_score * (rt["marks"] / 100.0), 1),
                    "max_score": rt["marks"],
                    "status": "passed" if overall_score >= 70 else "partial",
                    "feedback": f"Evaluated under general architectural rubric ({rt_title}).",
                })

        formatted_tasks = []
        for idx, t in enumerate(raw_tasks):
            t_title = t.get("task_title", t.get("title", f"Task {idx + 1}"))
            t_max = float(t.get("max_score", t.get("maxScore", 25.0)))
            t_score = round(min(t_max, max(0.0, float(t.get("score", 0.0)))), 1)
            is_task_passed = bool(t.get("passed", t_score >= t_max * 0.75))
            t_status = t.get("status", "passed" if is_task_passed else ("partial" if t_score > 0 else "failed"))
            t_feedback = t.get("feedback", "")

            formatted_tasks.append({
                "id": f"task_{idx + 1}",
                "title": t_title,
                "task_title": t_title,
                "score": t_score,
                "max_score": t_max,
                "maxScore": t_max,
                "status": t_status,
                "passed": is_task_passed,
                "feedback": t_feedback,
            })

        passed_count = sum(1 for t in formatted_tasks if t["passed"])
        total_count = len(formatted_tasks)
        passed = bool(parsed.get("passed", overall_score >= 70.0))

        rubric_scores = parsed.get("rubric_scores", {})
        if not isinstance(rubric_scores, dict):
            rubric_scores = {}

        for key in ["architectural_soundness", "scalability_and_resilience", "data_modeling", "api_design", "completeness"]:
            if key not in rubric_scores:
                rubric_scores[key] = int(overall_score)

        nodes = work.get("nodes", [])
        edges = work.get("edges", [])
        seq = work.get("sequence", "")
        schema = work.get("schema", "")
        apis = work.get("apis", [])
        notes = work.get("notes", {})

        metrics = {
            "node_count": len(nodes),
            "nodeCount": len(nodes),
            "edge_count": len(edges),
            "edgeCount": len(edges),
            "has_sequence": bool(seq.strip()),
            "hasSequence": bool(seq.strip()),
            "has_schema": bool(schema.strip()),
            "hasSchema": bool(schema.strip()),
            "api_count": len(apis),
            "apiCount": len(apis),
            "has_notes": any(bool(v.strip()) for v in notes.values()) if isinstance(notes, dict) else False,
            "hasNotes": any(bool(v.strip()) for v in notes.values()) if isinstance(notes, dict) else False,
        }

        return {
            "overall_score": overall_score,
            "total_score": overall_score,
            "totalScore": overall_score,
            "percentage": overall_score,
            "passed": passed,
            "passed_count": passed_count,
            "passedCount": passed_count,
            "total_count": total_count,
            "totalCount": total_count,
            "summary": parsed.get("summary", "System design evaluated successfully."),
            "task_breakdown": formatted_tasks,
            "tasks": formatted_tasks,
            "rubric_scores": rubric_scores,
            "metrics": metrics,
            "strengths": parsed.get("strengths", []),
            "weaknesses": parsed.get("weaknesses", []),
            "recommendations": parsed.get("recommendations", []),
            "model_meta": {
                "provider": provider,
                "model": model,
                "latency_ms": latency_ms,
            },
        }

    def _fallback_deterministic_evaluation(
        self, context: Dict[str, Any], work: Dict[str, Any], error_msg: str
    ) -> Dict[str, Any]:
        """
        Deterministic structural evaluator used when external LLM APIs are offline.
        Ensures students always receive valid scoring and helpful feedback.
        """
        nodes = work.get("nodes", [])
        edges = work.get("edges", [])
        seq = work.get("sequence", "")
        schema = work.get("schema", "")
        apis = work.get("apis", [])
        notes = work.get("notes", {})

        tasks = context.get("tasks", [])
        task_breakdown = []
        total_earned = 0.0

        for t in tasks:
            title = t["title"]
            t_lower = title.lower()
            marks = float(t.get("marks", 25.0))
            earned = 0.0
            feedback = ""

            # 1. Dedicated Labeling task (e.g. "Label read and write connections between components")
            if "label" in t_lower and any(k in t_lower for k in ["connection", "edge", "read", "write", "flow"]):
                labeled_edges = [e for e in edges if bool(e.get("label", "").strip())]
                has_read_or_write = any(re.search(r"read|write|get|post|lookup|fallback", e.get("label", ""), re.I) for e in labeled_edges)
                if len(labeled_edges) >= 3 and has_read_or_write:
                    earned = marks
                    feedback = f"All {len(labeled_edges)} connection paths are clearly labeled with protocols, read, and write operations."
                elif len(labeled_edges) >= 2:
                    earned = round(marks * 0.5, 1)
                    feedback = "Some connections are labeled. Ensure read (GET / cache lookups) and write (POST / DB writes) paths are explicitly distinguished."
                else:
                    earned = 0.0
                    feedback = "Label connection lines between components to designate read vs write paths."

            # 2. Dedicated Caching / Redis task (e.g. "Add Redis for frequently accessed short URLs")
            elif any(k in t_lower for k in ["redis", "cache", "memcached"]):
                has_cache = any(re.search(r"redis|cache|memcached", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)
                if has_cache:
                    earned = marks
                    feedback = "Redis cache layer added and positioned to accelerate high-frequency reads."
                else:
                    earned = 0.0
                    feedback = "Add an in-memory caching tier (e.g. Redis) to offload repeated queries from PostgreSQL."

            # 3. Dedicated Queue / Worker / DLQ task
            elif any(k in t_lower for k in ["queue", "kafka", "rabbitmq", "worker", "dlq"]):
                has_queue = any(re.search(r"queue|kafka|rabbitmq|broker|sqs", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)
                has_worker = any(re.search(r"worker|consumer|processor", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)
                if has_queue and has_worker:
                    earned = marks
                    feedback = "Asynchronous queue broker and background worker pool configured properly."
                elif has_queue or has_worker:
                    earned = round(marks * 0.5, 1)
                    feedback = "Add both the message broker and worker consumer nodes."
                else:
                    earned = 0.0
                    feedback = "Add asynchronous message broker and worker components."

            # 4. Core Component placement (e.g. "Add Web Client, Load Balancer, URL Service, and PostgreSQL")
            elif any(k in t_lower for k in ["component", "tier", "node", "service", "storage", "load balancer"]):
                has_client = any(re.search(r"client|app|web|mobile", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)
                has_gateway = any(re.search(r"gateway|load balancer|balancer|proxy", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)
                has_service = any(re.search(r"service|worker|app|shortener", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)
                has_db = any(re.search(r"db|database|sql|postgres|mongo", f"{n.get('label')} {n.get('kind')}", re.I) for n in nodes)

                valid_kinds = sum([has_client, has_gateway, has_service, has_db])
                if len(nodes) >= 4 and valid_kinds >= 3:
                    earned = marks
                    feedback = f"Architecture includes {len(nodes)} distinct components with proper client, service, and data store tiers."
                elif len(nodes) >= 2:
                    earned = round(marks * 0.6, 1)
                    feedback = "Basic components placed. Add necessary API gateway, service, and data store layers."
                else:
                    earned = 0.0
                    feedback = "Add the core architectural components from the component catalog."

            # 5. Connection & Request Flow (e.g. "Connect the components in the correct client-server request flow")
            elif any(k in t_lower for k in ["connect", "route", "flow", "topology"]):
                if len(edges) >= 4:
                    earned = marks
                    feedback = f"Topology links components in proper client-server flow with {len(edges)} connections."
                elif len(edges) >= 2:
                    earned = round(marks * 0.6, 1)
                    feedback = "Basic connections established; connect service to cache and database."
                elif len(edges) >= 1:
                    earned = round(marks * 0.3, 1)
                    feedback = "Connect client to load balancer and service to database."
                else:
                    earned = 0.0
                    feedback = "Connect components by dragging connection points between them."

            # 6. Sequence Diagram check
            elif any(k in t_lower for k in ["sequence", "mermaid", "temporal"]):
                has_participants = "participant" in seq or "actor" in seq
                has_arrows = "->>" in seq or "-->>" in seq
                has_branch = any(k in seq for k in ["alt", "else", "opt", "critical"])
                if "sequenceDiagram" in seq and has_participants and has_arrows and has_branch:
                    earned = marks
                    feedback = "Mermaid sequence diagram models both hit and miss execution flows with alternative blocks."
                elif "sequenceDiagram" in seq and has_arrows:
                    earned = round(marks * 0.65, 1)
                    feedback = "Sequence diagram captures linear flow. Add 'alt ... else ... end' blocks for branching logic."
                elif len(seq.strip()) > 10:
                    earned = round(marks * 0.3, 1)
                    feedback = "Define a complete Mermaid sequenceDiagram detailing client requests and data fetches."
                else:
                    earned = 0.0
                    feedback = "Provide a Mermaid sequence diagram in the Sequence Diagram tab."

            # 7. Schema and API check
            elif any(k in t_lower for k in ["schema", "api", "database", "rest"]):
                has_schema = bool(schema.strip()) and any(k in schema.upper() for k in ["CREATE TABLE", "COLLECTION", "PRIMARY KEY", "TABLE "])
                has_apis = len(apis) >= 1
                if has_schema and has_apis:
                    earned = marks
                    feedback = f"Provided DDL schema and {len(apis)} defined REST API endpoint contracts."
                elif has_schema or has_apis:
                    earned = round(marks * 0.5, 1)
                    feedback = "Provide both the Database Schema (DDL) and REST API endpoints."
                else:
                    earned = 0.0
                    feedback = "Fill in the Database Schema DDL and define REST API endpoints."

            else:
                earned = round(marks * 0.7, 1) if (len(nodes) >= 3 and len(edges) >= 2) else round(marks * 0.3, 1)
                feedback = "Evaluated against requirements and architectural criteria."

            total_earned += earned
            task_breakdown.append({
                "task_title": title,
                "score": earned,
                "max_score": marks,
                "status": "passed" if earned >= marks * 0.8 else ("partial" if earned > 0 else "failed"),
                "feedback": feedback,
            })

        overall_score = round(min(100.0, total_earned), 1)
        passed = overall_score >= 70.0
        passed_count = sum(1 for t in task_breakdown if t.get("status") == "passed")
        total_count = len(task_breakdown)

        metrics = {
            "node_count": len(nodes),
            "nodeCount": len(nodes),
            "edge_count": len(edges),
            "edgeCount": len(edges),
            "has_sequence": bool(seq.strip()),
            "hasSequence": bool(seq.strip()),
            "has_schema": bool(schema.strip()),
            "hasSchema": bool(schema.strip()),
            "api_count": len(apis),
            "apiCount": len(apis),
            "has_notes": any(bool(v.strip()) for v in notes.values()) if isinstance(notes, dict) else False,
            "hasNotes": any(bool(v.strip()) for v in notes.values()) if isinstance(notes, dict) else False,
        }

        return {
            "overall_score": overall_score,
            "total_score": overall_score,
            "totalScore": overall_score,
            "percentage": overall_score,
            "passed": passed,
            "passed_count": passed_count,
            "passedCount": passed_count,
            "total_count": total_count,
            "totalCount": total_count,
            "summary": "Design evaluated via deterministic architectural validator.",
            "task_breakdown": task_breakdown,
            "tasks": task_breakdown,
            "metrics": metrics,
            "rubric_scores": {
                "architectural_soundness": min(100, int(len(nodes) * 20)),
                "scalability_and_resilience": min(100, int(len(edges) * 25)),
                "data_modeling": 85 if schema.strip() else 30,
                "api_design": 85 if len(apis) >= 2 else (50 if len(apis) == 1 else 20),
                "completeness": int(overall_score),
            },
            "strengths": [
                f"Configured {len(nodes)} architectural components and {len(edges)} connections",
                "Structured design across multiple tiers",
            ],
            "weaknesses": [
                "Consider expanding caching and queue workers for asynchronous operations",
            ],
            "recommendations": [
                "Verify failover mechanisms and ensure all connection lines have protocol labels",
            ],
            "model_meta": {
                "provider": "fallback_engine",
                "model": "deterministic_structural_evaluator",
                "note": f"Fallback triggered due to: {error_msg}",
            },
        }
