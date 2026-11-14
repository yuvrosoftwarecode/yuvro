export type EvaluationTab = "hld" | "sequence" | "schema" | "api" | "notes" | "code";
export type EvaluationRule = "review" | "api-contract";
export type EvaluationCriterion = { id: string; title: string; description: string; maxMarks: number; tabs: EvaluationTab[]; rule: EvaluationRule };
export type EvaluationContext = { project: string; projectDescription?: string; labType: string; sprint?: string; ticketId: string; title: string; description: string; acceptanceCriteria?: string[]; evaluationCriteria?: EvaluationCriterion[] };
export type EvaluationCheck = EvaluationCriterion & { status: "passed" | "failed" | "pending"; marks: number | null; feedback: string; missing: string[] };
export type EvaluationReport = {
  context: EvaluationContext;
  checks: EvaluationCheck[];
  score: number | null;
  maxMarks: number;
  completion: number;
  passed: number;
  failed: number;
  pending: number;
  status: string;
  evaluatedAt: string;
  metrics?: {
    nodeCount: number;
    edgeCount: number;
    hasSequence: boolean;
    hasSchema: boolean;
    apiCount: number;
    hasNotes: boolean;
  };
  summary?: string[];
};

export function cleanDescription(desc?: string): string {
  if (!desc) return "";
  const scenarioMatch = desc.match(/###\s*Scenario\s*([\s\S]*?)(?:###|$)/i);
  if (scenarioMatch && scenarioMatch[1].trim()) {
    let firstPara = scenarioMatch[1].trim().split(/\n\s*\n|\n(?=###)/)[0].trim();
    firstPara = firstPara.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
    return firstPara.length > 250 ? firstPara.slice(0, 250) + "…" : firstPara;
  }
  if (desc.includes("###")) {
    let cleaned = desc.replace(/###\s*Requirements[\s\S]*$/i, "");
    cleaned = cleaned.replace(/###.*?(?:\n|$)/g, " ").replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
    return cleaned.length > 250 ? cleaned.slice(0, 250) + "…" : cleaned;
  }
  const clean = desc.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > 250 ? clean.slice(0, 250) + "…" : clean;
}

export function requirementCriteria(context: EvaluationContext): EvaluationCriterion[] {
  if (context.evaluationCriteria?.length) return context.evaluationCriteria;
  const requirements = context.acceptanceCriteria?.length ? context.acceptanceCriteria : context.description.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const titles = requirements.length ? requirements : [context.title];
  return titles.map((title, i) => ({ id: `${context.ticketId}-requirement-${i + 1}`, title, description: context.description, maxMarks: 100 / titles.length, tabs: ["code"], rule: "review" }));
}

export function buildEvaluationReport(context: EvaluationContext, checks: EvaluationCheck[]): EvaluationReport {
  const pending = checks.filter(c => c.status === "pending").length;
  const passed = checks.filter(c => c.status === "passed").length;
  const failed = checks.filter(c => c.status === "failed").length;
  return { context, checks, score: pending ? null : checks.reduce((sum, c) => sum + (c.marks ?? 0), 0), maxMarks: checks.reduce((sum, c) => sum + c.maxMarks, 0), completion: checks.length ? Math.round(passed / checks.length * 100) : 0, passed, failed, pending, status: pending ? "Pending review" : failed ? "Needs work" : "Passed", evaluatedAt: new Date().toISOString() };
}

export function pendingEvaluation(context: EvaluationContext) {
  return buildEvaluationReport(context, requirementCriteria(context).map(c => ({ ...c, status: "pending", marks: null, feedback: "No executable validator or recorded review is available for this requirement. No marks have been awarded.", missing: [] })));
}
