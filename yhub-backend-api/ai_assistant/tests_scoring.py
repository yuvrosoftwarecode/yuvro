import unittest
from unittest.mock import MagicMock, patch
from ai_assistant.scoring.factory import LabScoreEvaluatorFactory
from ai_assistant.scoring.system_design import SystemDesignLabEvaluator
from ai_assistant.scoring.practical import PracticalLabEvaluator
from ai_assistant.scoring.base import BaseLabEvaluator


class LabScoringFactoryTests(unittest.TestCase):
    def test_factory_returns_system_design_evaluator(self):
        evaluator = LabScoreEvaluatorFactory.get_evaluator("system_design", provider="deepseek")
        self.assertIsInstance(evaluator, SystemDesignLabEvaluator)
        self.assertEqual(evaluator.provider, "deepseek")

    def test_factory_returns_practical_evaluator(self):
        evaluator = LabScoreEvaluatorFactory.get_evaluator("practical")
        self.assertIsInstance(evaluator, PracticalLabEvaluator)

    def test_factory_handles_alias_keys(self):
        evaluator = LabScoreEvaluatorFactory.get_evaluator("sys_design")
        self.assertIsInstance(evaluator, SystemDesignLabEvaluator)

        evaluator_code = LabScoreEvaluatorFactory.get_evaluator("code")
        self.assertIsInstance(evaluator_code, PracticalLabEvaluator)

    def test_factory_fallback_on_unknown_type(self):
        evaluator = LabScoreEvaluatorFactory.get_evaluator("unknown_lab_type")
        self.assertIsInstance(evaluator, SystemDesignLabEvaluator)


class SystemDesignLabEvaluatorTests(unittest.TestCase):
    def setUp(self):
        self.evaluator = SystemDesignLabEvaluator(provider="deepseek", model_name="deepseek-chat")

        self.sample_context = {
            "lab_title": "System Design Lab",
            "ticket_title": "Design Scalable URL Shortener",
            "ticket_description": "Build high-throughput URL Shortener with caching and DB.",
            "tasks": [
                {"title": "Core Components", "marks": 25.0, "criteria": "Add client, gateway, service, cache, db"},
                {"title": "Routing & Protocol Flow", "marks": 25.0, "criteria": "Connect with HTTPS and DB protocols"},
                {"title": "Sequence Diagram", "marks": 25.0, "criteria": "Sequence diagram with hit/miss logic"},
                {"title": "Schema & APIs", "marks": 25.0, "criteria": "SQL table and REST endpoints"},
            ],
            "constraints": ["Low latency", "10:1 read:write"],
        }

        self.sample_submission = {
            "nodes": [
                {"id": "n1", "label": "Client", "kind": "client", "icon": "📱"},
                {"id": "n2", "label": "API Gateway", "kind": "gateway", "icon": "🚪"},
                {"id": "n3", "label": "URL Service", "kind": "service", "icon": "⚙️"},
                {"id": "n4", "label": "Redis Cache", "kind": "redis", "icon": "⚡"},
                {"id": "n5", "label": "PostgreSQL DB", "kind": "database", "icon": "🐘"},
            ],
            "edges": [
                {"id": "e1", "from": "n1", "to": "n2", "label": "HTTPS"},
                {"id": "e2", "from": "n2", "to": "n3", "label": "gRPC"},
                {"id": "e3", "from": "n3", "to": "n4", "label": "Cache lookup"},
                {"id": "e4", "from": "n3", "to": "n5", "label": "Persistent query"},
            ],
            "sequence": "sequenceDiagram\n  Client->>Gateway: GET /{shortCode}\n  Gateway->>Service: Resolve\n  Service->>Cache: Check\n  alt Hit\n    Cache-->>Service: Long URL\n  else Miss\n    Service->>DB: Query\n  end",
            "schema": "CREATE TABLE urls (id BIGSERIAL PRIMARY KEY, short_code VARCHAR(10) UNIQUE, original_url TEXT);",
            "apis": [
                {"method": "POST", "path": "/api/v1/urls", "description": "Create short URL"},
                {"method": "GET", "path": "/{shortCode}", "description": "Redirect"},
            ],
            "notes": {
                "functional_reqs": "Shorten and redirect URLs",
                "scale_estimates": "100M URLs per month",
            },
        }

    def test_json_extractor_handles_code_fences(self):
        fenced_json = '```json\n{"overall_score": 95.0, "passed": true, "summary": "Great design"}\n```'
        result = BaseLabEvaluator.extract_json(fenced_json)
        self.assertEqual(result["overall_score"], 95.0)
        self.assertTrue(result["passed"])

    def test_json_extractor_handles_preamble(self):
        text_with_preamble = 'Here is the evaluation result:\n{"overall_score": 88.0, "passed": true}\nHope this helps!'
        result = BaseLabEvaluator.extract_json(text_with_preamble)
        self.assertEqual(result["overall_score"], 88.0)

    def test_deterministic_fallback_evaluation(self):
        # Force fallback by passing invalid/unreachable LLM call
        result = self.evaluator._fallback_deterministic_evaluation(
            context=self.evaluator._normalize_lab_context(self.sample_context),
            work=self.evaluator._normalize_user_submission(self.sample_submission),
            error_msg="Simulated API offline",
        )
        self.assertIn("overall_score", result)
        self.assertIn("tasks", result)
        self.assertIn("rubric_scores", result)
        self.assertIn("metrics", result)
        self.assertGreaterEqual(result["overall_score"], 70.0)
        self.assertTrue(result["passed"])
        self.assertEqual(result["metrics"]["nodeCount"], 5)
        self.assertEqual(result["metrics"]["edgeCount"], 4)

    def test_evaluation_with_mocked_llm(self):
        mock_ai_response = {
            "content": """{
                "overall_score": 92.0,
                "percentage": 92.0,
                "passed": true,
                "summary": "Excellent architectural design with proper caching and DB separation.",
                "task_breakdown": [
                    {"task_title": "Core Components", "score": 25.0, "max_score": 25.0, "status": "passed", "feedback": "All tiers configured."},
                    {"task_title": "Routing & Protocol Flow", "score": 23.0, "max_score": 25.0, "status": "passed", "feedback": "Clear protocols labeled."},
                    {"task_title": "Sequence Diagram", "score": 24.0, "max_score": 25.0, "status": "passed", "feedback": "Hit/miss flow well covered."},
                    {"task_title": "Schema & APIs", "score": 20.0, "max_score": 25.0, "status": "passed", "feedback": "Well-indexed table and endpoints."}
                ],
                "rubric_scores": {
                    "architectural_soundness": 95,
                    "scalability_and_resilience": 90,
                    "data_modeling": 90,
                    "api_design": 88,
                    "completeness": 95
                },
                "strengths": ["Clear Redis caching tier", "Indexed DDL"],
                "weaknesses": ["Rate limiter could be added to gateway"],
                "recommendations": ["Add Token bucket rate limiting"]
            }""",
            "provider": "deepseek",
            "model": "deepseek-chat",
            "latency_ms": 1100,
        }

        with patch.object(self.evaluator.client, "agenerate", return_value=mock_ai_response):
            result = self.evaluator.evaluate(self.sample_context, self.sample_submission)
            self.assertEqual(result["overall_score"], 92.0)
            self.assertEqual(result["percentage"], 92.0)
            self.assertTrue(result["passed"])
            self.assertEqual(len(result["tasks"]), 4)
            self.assertEqual(result["rubric_scores"]["architectural_soundness"], 95)
            self.assertEqual(result["model_meta"]["provider"], "deepseek")


if __name__ == "__main__":
    unittest.main()
