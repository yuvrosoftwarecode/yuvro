import {
  cleanDescription,
  type EvaluationContext,
  type EvaluationCheck,
  type EvaluationReport,
} from "./evaluation";
import {
  evaluateSystemDesign as evaluateSystemDesignRules,
  type SystemDesignEvaluationResult,
} from "./systemDesignEvaluator";

export type EvaluationDesign = {
  nodes: { id: string; kind: string; label: string }[];
  edges: { from: string; to: string; label?: string }[];
  seq: string;
  schema: string;
  apis: { method: string; path: string }[];
  notes: Partial<Record<string, string>>;
};

export function convertResultToReport(
  result: SystemDesignEvaluationResult,
  context: EvaluationContext
): EvaluationReport {
  const checks: EvaluationCheck[] = result.tasks.map((t, idx) => ({
    id: t.id || `task_${idx + 1}`,
    title: t.title,
    description: t.description || "",
    maxMarks: t.maxScore || 25,
    tabs: ["hld", "sequence", "schema", "api", "notes"],
    rule: "review",
    status: t.passed ? "passed" : "failed",
    marks: t.score,
    feedback: t.feedback || (t.passed ? "Requirement satisfied." : "Requirement not satisfied yet."),
    missing: t.passed ? [] : [t.title],
  }));

  const passed = result.passedCount;
  const failed = result.totalCount - result.passedCount;

  return {
    context: {
      ...context,
      description: cleanDescription(context.description),
    },
    checks,
    score: result.totalScore,
    maxMarks: result.maxPossibleScore || 100,
    completion: result.percentage,
    passed,
    failed,
    pending: 0,
    status: result.percentage >= 70 ? "Passed" : "Needs Work",
    evaluatedAt: new Date().toISOString(),
    metrics: result.metrics,
    summary: result.summary,
  };
}

export function evaluateSystemDesign(
  context: EvaluationContext,
  design: EvaluationDesign,
  ticketData?: any
): EvaluationReport {
  const result = evaluateSystemDesignRules(design, ticketData);
  return convertResultToReport(result, context);
}

export type DesignEvaluation = EvaluationReport;
