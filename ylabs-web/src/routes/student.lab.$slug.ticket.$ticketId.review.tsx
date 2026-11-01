import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { tickets, labs } from "@/lib/dummy";
import { invalidateStudentStats } from "@/lib/studentStats";
import {
  CheckCircle2,
  XCircle,
  Zap,
  Award,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Code2,
  MessageSquare,
  Share2,
  BookOpen,
  Trophy,
  Flame,
  ChevronDown,
  ChevronRight,
  Gauge,
  Target,
  Users,
  Rocket,
  Flag,
  ArrowLeft,
} from "lucide-react";
import { TicketSolutionViewer } from "@/components/TicketSolutionViewer";

export const Route = createFileRoute("/student/lab/$slug/ticket/$ticketId/review")({
  component: Review,
});

function Review() {
  const { slug, ticketId } = useParams({ from: "/student/lab/$slug/ticket/$ticketId/review" });
  const { from } = Route.useSearch() as any;
  const [lab, setLab] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      Promise.all([
        api.get<any>(`/lab/tickets/${ticketId}/`).catch(() => null as any),
        api.get<any>(`/lab/labs/${slug}/`).catch(() => null as any),
        api.get<any[]>(`/lab/submissions/?lab_sprint_ticket=${ticketId}`).catch(() => [] as any),
      ])
        .then(([ticketRes, labRes, subsRes]) => {
          if (!active) return;
          setTicket(ticketRes ?? { id: ticketId, title: "Ticket" });
          setLab((labRes as any)?.data ?? (labRes as any) ?? { name: slug });

          const subsList = Array.isArray(subsRes) ? subsRes : ((subsRes as any)?.data ?? []);
          const sub =
            subsList.find((s: any) => String(s.lab_sprint_ticket) === String(ticketId)) ||
            subsList[0];
          setSubmission(sub);
          setLoading(false);
          try {
            const localKanbanStr = localStorage.getItem(`kanban_${slug}`);
            const kanban = localKanbanStr ? JSON.parse(localKanbanStr) : {};
            kanban[ticketId] = "done";
            localStorage.setItem(`kanban_${slug}`, JSON.stringify(kanban));
          } catch (e) {}

          // Invalidate student stats cache and dispatch update notifications
          invalidateStudentStats();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("yuvro-submission-updated"));
            window.dispatchEvent(new CustomEvent("yuvro:ticket_submission_updated", {
              detail: { ticketId, status: "done" }
            }));
          }
        })
        .catch((e) => {
          console.error(e);
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [ticketId, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Loading review...</span>
      </div>
    );
  }

  const maxXp = ticket?.yuvro_points ?? 0;

  // The ONLY reliable source for test score is solution_output JSON.
  // submission.yuvro_points = YP awarded by backend (stays 0 until human/AI review)
  // submission.score field does NOT exist in the API response
  // solution_output.percentage = actual test pass % calculated at submission time
  let testPercentage = 0;
  if (submission?.solution_output) {
    try {
      const parsed =
        typeof submission.solution_output === "string"
          ? JSON.parse(submission.solution_output)
          : submission.solution_output;
      testPercentage = parsed?.percentage ?? parsed?.total_score ?? 0;
    } catch (e) {}
  }

  const earnedXp =
    submission?.yuvro_points && submission.yuvro_points > 0
      ? submission.yuvro_points
      : testPercentage > 0 && maxXp > 0
        ? Math.round(maxXp * (testPercentage / 100))
        : (submission?.yuvro_points ?? 0);

  const percentage =
    earnedXp > 0 && maxXp > 0
      ? Math.round((earnedXp / maxXp) * 100)
      : testPercentage;

  const isPassed = percentage >= 70;

  const grade =
    percentage >= 90
      ? "A"
      : percentage >= 80
        ? "B"
        : percentage >= 70
          ? "C"
          : percentage >= 60
            ? "D"
            : "F";

  let formattedTime = "N/A";
  if (submission?.minutes_solved) {
    const m = submission.minutes_solved;
    formattedTime = `${m}m`;
  }

  // Parse solution output
  let parsedOutput: any = null;
  if (submission?.solution_output) {
    try {
      parsedOutput = JSON.parse(submission.solution_output);
    } catch (e) {
      // not json
    }
  }

  // Parsing is now handled in TicketSolutionViewer

  return (
    <div className="min-h-screen relative overflow-hidden">
      {isPassed && <Confetti />}
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-8 space-y-6 relative">
        {from === "report" && (
          <Link
            to="/student/lab/$slug/report"
            params={{ slug }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Report
          </Link>
        )}
        {/* Header */}
        <div className={`rounded-2xl border p-6 sm:p-8 relative overflow-hidden ${
          isPassed
            ? "bg-gradient-to-br from-success/10 via-card to-background border-success/30"
            : "bg-gradient-to-br from-destructive/10 via-card to-background border-destructive/30"
        }`}>
          <div className={`absolute -top-10 -right-10 h-56 w-56 rounded-full blur-3xl ${
            isPassed ? "bg-success/20" : "bg-destructive/20"
          }`} />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className={`grid h-20 w-20 place-items-center rounded-full border ${
              isPassed
                ? "bg-success/20 border-success/40"
                : "bg-destructive/20 border-destructive/40"
            }`}>
              {isPassed ? (
                <CheckCircle2 className="h-10 w-10 text-success" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {ticket?.id} · {lab?.name} ·{" "}
                {isPassed ? "✅ Completed" : "❌ Unresolved (Needs Revision)"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-0.5">{ticket?.title}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Solved in {formattedTime}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-4 w-4 text-primary" />+{earnedXp} YP
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="text-center">
                <div className={`text-6xl sm:text-7xl font-semibold leading-none bg-clip-text text-transparent ${
                  isPassed
                    ? "bg-gradient-to-br from-success to-primary"
                    : "bg-gradient-to-br from-destructive to-warning"
                }`}>
                  {grade}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Performance grade</div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-semibold ${isPassed ? "text-success" : "text-destructive"}`}>
                  {earnedXp} <span className="text-2xl text-muted-foreground">/ {maxXp}</span>
                </div>
                <div className="text-xs text-muted-foreground">Actual YP earned</div>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-semibold ${isPassed ? "text-primary" : "text-warning"}`}>
                  {percentage}%
                </div>
                <div className="text-xs text-muted-foreground">Calculated percentage</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance summary */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className={`h-5 w-5 ${isPassed ? "text-warning" : "text-muted-foreground"}`} />
            <h2 className="text-lg font-semibold">
              {isPassed ? "🎉 Review Results" : "📊 Review Results"}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={isPassed ? CheckCircle2 : XCircle}
              label="Resolution"
              value={isPassed ? "Resolved" : "Unresolved"}
              sub="Status"
              tone={isPassed ? "success" : "warning"}
              pct={percentage}
            />
            <Stat
              icon={Gauge}
              label="Code quality"
              value={grade}
              sub="Overall grade"
              tone="info"
              pct={percentage}
            />
            <Stat
              icon={Clock}
              label="Time efficiency"
              value={formattedTime}
              sub="Time spent"
              tone="success"
              pct={100}
            />
            <Stat
              icon={Zap}
              label="YP earned"
              value={`${earnedXp} / ${maxXp} YP`}
              sub={`Actual YP earned`}
              tone="primary"
              pct={percentage}
            />
          </div>
          <AnimatedBar label={`Total YP awarded: ${earnedXp}`} pct={percentage} />
        </div>

        {/* Output or Errors */}
        {submission?.solution_output ? (
          <Card title="Evaluation Output" icon={Code2}>
            <pre className="rounded-md bg-editor-bg border p-3 text-xs font-mono overflow-auto max-h-72 scrollbar-thin text-muted-foreground whitespace-pre-wrap">
              {typeof parsedOutput === "object" && parsedOutput !== null
                ? JSON.stringify(parsedOutput, null, 2)
                : submission.solution_output}
            </pre>
          </Card>
        ) : null}

        {/* Your solution */}
        <div className="mt-8">
          <TicketSolutionViewer solution={submission?.solution} />
        </div>

        {/* Action bar */}
        {from !== "report" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
            <Link
              to="/student/lab/$slug/ticket/$ticketId"
              params={{ slug, ticketId }}
              className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Ticket
            </Link>
            <Link
              to="/student/lab/$slug"
              params={{ slug }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("yuvro:ticket_submission_updated", {
                  detail: { ticketId, status: "done" }
                }));
              }}
              className="rounded-md border px-3 py-2 text-sm hover:bg-accent ml-auto"
            >
              ← Lab dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Components ---------- */

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
      {Array.from({ length: 36 }).map((_, i) => {
        const colors = [
          "var(--success)",
          "var(--primary)",
          "var(--warning)",
          "var(--info)",
          "var(--ui)",
        ];
        const left = (i * 2.8) % 100;
        const delay = (i % 12) * 0.12;
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            className="absolute top-0 rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: colors[i % colors.length],
              animation: `confettiFall 2.6s cubic-bezier(.2,.7,.4,1) ${delay}s forwards`,
              transform: "translateY(-20px) rotate(0deg)",
              opacity: 0.9,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(540deg); opacity: 0; }
        }
        @keyframes growBar {
          from { width: 0%; } to { width: var(--w); }
        }
      `}</style>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  pct,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  sub: string;
  tone: "success" | "info" | "primary" | "warning";
  pct: number;
}) {
  const color = {
    success: "text-success",
    info: "text-info",
    primary: "text-primary",
    warning: "text-warning",
  }[tone];
  const bar = {
    success: "bg-success",
    info: "bg-info",
    primary: "bg-primary",
    warning: "bg-warning",
  }[tone];
  return (
    <div className="rounded-xl border bg-editor-bg/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} />
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
      <div className="mt-2 h-1.5 rounded-full bg-accent overflow-hidden">
        <div
          className={`h-full ${bar}`}
          style={{ width: `${pct}%`, animation: "growBar 1.2s ease-out" } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function AnimatedBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-accent overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-success via-primary to-warning"
          style={
            {
              ["--w" as never]: `${pct}%`,
              width: "0%",
              animation: "growBar 1.4s ease-out forwards",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
  collapsible,
}: {
  title: string;
  icon: typeof Zap;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border bg-card p-5">
      <button
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 ${collapsible ? "cursor-pointer" : "cursor-default"}`}
      >
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
        {collapsible &&
          (open ? (
            <ChevronDown className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4" />
          ))}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function Block({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "success" | "warning" | "info";
  children: React.ReactNode;
}) {
  const cls = {
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    info: "border-info/30 bg-info/5",
  }[tone];
  const text = { success: "text-success", warning: "text-warning", info: "text-info" }[tone];
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className={`text-sm font-semibold ${text}`}>{title}</div>
      <div className="mt-2 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

function Insight({
  icon: Icon,
  label,
  main,
  detail,
  tone,
}: {
  icon: typeof Zap;
  label: string;
  main: string;
  detail: string;
  tone: "success" | "info" | "warning" | "primary";
}) {
  const color = {
    success: "text-success",
    info: "text-info",
    warning: "text-warning",
    primary: "text-primary",
  }[tone];
  return (
    <div className="rounded-md border bg-editor-bg/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{main}</div>
      <div className="text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function SkillBar({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>
          {from}% → <span className="text-success">{to}%</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-accent overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-muted-foreground/40"
          style={{ width: `${from}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-success"
          style={
            {
              ["--w" as never]: `${to}%`,
              width: "0%",
              animation: "growBar 1.6s ease-out forwards",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

function NextCard({
  tag,
  id,
  title,
  cta,
  tone,
  to,
  params,
  highlight,
}: {
  tag: string;
  id: string;
  title: string;
  cta: string;
  tone: "primary" | "info" | "warning";
  to: "/student/lab/$slug/ticket/$ticketId" | "/student/lab/$slug" | "/student/leaderboard";
  params?: Record<string, string>;
  highlight?: boolean;
}) {
  const color = {
    primary: "border-primary/40 bg-primary/5",
    info: "border-info/30 bg-info/5",
    warning: "border-warning/30 bg-warning/5",
  }[tone];
  return (
    <div
      className={`rounded-lg border p-4 ${color} ${highlight ? "ring-2 ring-primary/40" : ""} relative overflow-hidden`}
    >
      {highlight && (
        <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-primary font-semibold">
          Recommended
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{tag}</div>
      <div className="mt-1 font-mono text-xs text-muted-foreground">{id}</div>
      <div className="text-sm font-semibold">{title}</div>
      <Link
        to={to as string}
        params={params as never}
        className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        {cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
