import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cleanDescription, type EvaluationContext, type EvaluationReport } from "@/lib/evaluation";

const marks = (n: number) => Number(n.toFixed(2));

export interface EvaluationDrawerProps {
  report: EvaluationReport | null;
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  context?: EvaluationContext;
  onSubmit?: () => void;
  submitting?: boolean;
}

export function EvaluationDrawer({
  report,
  open,
  onClose,
  loading = false,
  context: fallbackContext,
  onSubmit,
  submitting = false,
}: EvaluationDrawerProps) {
  const context = report?.context || fallbackContext;

  const download = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.context.ticketId}-evaluation.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const strengths = report ? report.checks.filter(c => c.status === "passed") : [];
  const improvements = report ? report.checks.filter(c => c.status === "failed") : [];
  const isPassed = report ? report.completion >= 70 : false;
  const cleanScenario = context?.description ? cleanDescription(context.description) : "";

  return (
    <Sheet open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
      <SheetContent
        side="right"
        overlayClassName="z-[65] bg-background/25"
        className="z-[70] flex h-dvh w-full flex-col gap-0 overflow-hidden border-l bg-card p-0 text-card-foreground sm:w-[45vw] sm:max-w-none motion-reduce:animate-none motion-reduce:transition-none"
      >
        {/* Header */}
        <header className="shrink-0 border-b px-5 py-5 pr-12 bg-muted/10">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            <SheetTitle className="text-base font-semibold">Ticket Evaluation</SheetTitle>
          </div>
          {context && (
            <>
              <SheetDescription className="mt-1.5 text-xs text-muted-foreground">
                {context.project}
                {context.sprint ? ` / ${context.sprint}` : ""} /{" "}
                <span className="font-mono">{context.ticketId}</span>
              </SheetDescription>
              <p className="mt-1.5 text-sm font-medium text-foreground">{context.title}</p>
            </>
          )}

          {loading ? (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-amber-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-medium">Evaluating architecture with AI…</span>
            </div>
          ) : report ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs">
              <span
                className={`size-2 rounded-full ${
                  isPassed ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span
                className={`font-semibold ${
                  isPassed
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {report.status} ({report.completion}%)
              </span>
            </div>
          ) : null}
        </header>

        {/* Body */}
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in duration-200">
            {/* Blinking Yuvro Logo */}
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-xl p-4 animate-pulse">
                <img src="/logo.png" alt="Yuvro" className="h-full w-full object-contain" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-card"></span>
              </span>
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-base font-semibold text-foreground">Evaluating Architecture with AI…</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                DeepSeek AI is analyzing your High-Level Design, Sequence Flows, Database Schema, and REST APIs against ticket requirements.
              </p>
            </div>

            {/* Analysis Pipeline Step Pulses */}
            <div className="w-full max-w-xs space-y-2 pt-2 text-[11px] text-muted-foreground text-left">
              <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span>Checking architectural nodes & component routing…</span>
              </div>
              <div
                className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2 animate-pulse"
                style={{ animationDelay: "200ms" }}
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span>Validating database models & caching layers…</span>
              </div>
              <div
                className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2 animate-pulse"
                style={{ animationDelay: "400ms" }}
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span>Scoring acceptance criteria & architectural trade-offs…</span>
              </div>
            </div>
          </div>
        ) : report ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {/* Overall Score */}
            <section className="space-y-4 border-b pb-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Overall score
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                    {report.score === null
                      ? "Awaiting review"
                      : `${marks(report.score)} / ${marks(report.maxMarks)}`}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {report.score === null ? "" : "pts"}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isPassed
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {report.completion}% verified
                  </span>
                </div>
              </div>

              {/* 3-Column Stats Box */}
              <div className="grid grid-cols-3 divide-x border-y py-3 bg-muted/5 rounded-lg">
                <div className="text-center">
                  <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {report.passed}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">Passed</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {report.failed}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">Needs Work</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {report.checks.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">Total Checks</p>
                </div>
              </div>

              {/* Clean Scenario (no raw markdown dump) */}
              {cleanScenario && (
                <p className="text-xs leading-relaxed text-muted-foreground">{cleanScenario}</p>
              )}

              {/* Architecture Deliverables Metrics */}
              {report.metrics && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{report.metrics.nodeCount}</span> Nodes
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{report.metrics.edgeCount}</span> Edges
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    Sequence:{" "}
                    <span className="font-semibold text-foreground">
                      {report.metrics.hasSequence ? "Yes" : "No"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    Schema:{" "}
                    <span className="font-semibold text-foreground">
                      {report.metrics.hasSchema ? "Yes" : "No"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{report.metrics.apiCount}</span> APIs
                  </span>
                </div>
              )}
            </section>

            {/* Acceptance Criteria */}
            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Acceptance criteria · {report.checks.length} checks
              </h2>
              <div className="space-y-2.5">
                {report.checks.map((c) => {
                  const passed = c.status === "passed";
                  return (
                    <details
                      key={c.id}
                      className="group rounded-lg border bg-card transition-colors hover:border-border/80"
                      open={!passed}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            passed
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {passed ? "PASSED" : "NEEDS WORK"}
                        </span>
                        <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-foreground">
                          {c.title}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {c.marks !== null
                            ? `${marks(c.marks)}/${marks(c.maxMarks)} pts`
                            : `${marks(c.maxMarks)} pts`}
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-2 border-t px-3.5 py-3 text-xs leading-relaxed bg-muted/10">
                        {c.description && c.description !== c.title && (
                          <p className="text-muted-foreground">{c.description}</p>
                        )}
                        <div className="rounded-md border bg-background p-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Evaluation Feedback
                          </p>
                          <p className="text-xs text-foreground leading-relaxed">{c.feedback}</p>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>

            {/* Evaluation Summary */}
            <section className="space-y-4 border-t pt-4 text-xs leading-relaxed">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Evaluation summary
              </h2>

              {/* Strengths */}
              {strengths.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Strengths ({strengths.length})</span>
                  </h3>
                  <div className="space-y-1.5">
                    {strengths.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-xs text-foreground"
                      >
                        {c.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas requiring improvement */}
              {improvements.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-amber-500" />
                    <span>Areas Requiring Improvement ({improvements.length})</span>
                  </h3>
                  <div className="space-y-1.5">
                    {improvements.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs"
                      >
                        <p className="font-medium text-foreground">{c.title}</p>
                        <p className="mt-1 text-muted-foreground text-[11px] leading-relaxed">
                          {c.feedback}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All criteria satisfied */}
              {report.completion >= 100 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    All acceptance criteria satisfied!
                  </p>
                  <p className="mt-1 text-[11px] opacity-90">
                    Your architecture meets all requirements. You can submit your solution.
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* Footer */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-3 bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={download}
            disabled={!report || loading}
            className="text-xs"
          >
            <Download className="size-3.5 mr-1" />
            Download report
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Continue working
            </Button>
            {onSubmit && report && (
              <Button
                size="sm"
                disabled={submitting || loading}
                onClick={onSubmit}
                className={`text-xs ${
                  isPassed ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <span>{isPassed ? "Submit Solution" : "Submit"}</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
