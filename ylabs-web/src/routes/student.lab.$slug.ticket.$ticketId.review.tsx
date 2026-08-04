import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { tickets, labs } from "@/lib/dummy";
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

export const Route = createFileRoute("/student/lab/$slug/ticket/$ticketId/review")({
  component: Review,
});

function Review() {
  const { slug, ticketId } = useParams({ from: "/student/lab/$slug/ticket/$ticketId/review" });
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
        api.get<any[]>(`/lab/submissions/?lab_sprint_ticket=${ticketId}`).catch(() => [] as any)
      ]).then(([ticketRes, labRes, subsRes]) => {
        if (!active) return;
        setTicket(ticketRes ?? { id: ticketId, title: "Ticket" });
        setLab((labRes as any)?.data ?? (labRes as any) ?? { name: slug });
        
        const subsList = Array.isArray(subsRes) ? subsRes : (subsRes as any)?.data ?? [];
        const sub = subsList.find((s: any) => String(s.lab_sprint_ticket) === String(ticketId)) || subsList[0];
        setSubmission(sub);
        setLoading(false);
      }).catch((e) => {
        console.error(e);
        if (active) setLoading(false);
      });
    });
    return () => { active = false; };
  }, [ticketId, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Loading review...</span>
      </div>
    );
  }

  const score = submission?.yuvro_points ?? 0;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  const baseXp = ticket?.xp ?? 100;
  const totalXp = Math.floor(baseXp * (score / 100));
  
  // Parse solution output
  let parsedOutput: any = null;
  if (submission?.solution_output) {
    try {
      parsedOutput = JSON.parse(submission.solution_output);
    } catch(e) {
      // not json
    }
  }

  // Parse your solution
  let parsedSolution: any = null;
  let parsedDiffFiles: { filename: string, content: string }[] = [];
  if (submission?.solution) {
    try {
      parsedSolution = JSON.parse(submission.solution);
    } catch(e) {
      // not json, check if it's a git diff
      if (typeof submission.solution === 'string' && submission.solution.includes('diff --git ')) {
        const parts = submission.solution.split(/^diff --git /m).filter(Boolean);
        for (const part of parts) {
          const lines = part.split('\n');
          const headerLine = lines[0]; // e.g. "a/file.txt b/file.txt"
          const match = headerLine.match(/^a\/(.+?) b\/(.+)$/);
          const filename = match ? match[2] : headerLine;
          if (filename === '__none__' || filename.trim() === '') continue;
          
          parsedDiffFiles.push({ filename, content: 'diff --git ' + part.trim() });
        }
      }
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Confetti />
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-8 space-y-6 relative">
        {/* Header */}
        <div className="rounded-2xl border bg-gradient-to-br from-success/10 via-card to-background p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-success/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-success/20 border border-success/40">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {ticket?.id} · {lab?.name} · {submission?.ticket_status === 'done' ? '✅ Completed' : '🔄 In Review'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-0.5">{ticket?.title}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Solved in {submission?.minutes_solved ?? 0}m
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-4 w-4 text-primary" />+{totalXp} XP
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-semibold leading-none bg-gradient-to-br from-success to-primary bg-clip-text text-transparent">
                  {grade}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Performance grade</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-semibold text-success">{score}</div>
                <div className="text-xs text-muted-foreground">/ 100 score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance summary */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">🎉 Review Results</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={CheckCircle2}
              label="Tests passed"
              value={score >= 100 ? "Pass" : score + "%"}
              sub="Correctness"
              tone={score >= 75 ? "success" : "warning"}
              pct={score}
            />
            <Stat
              icon={Gauge}
              label="Code quality"
              value={grade}
              sub="Overall grade"
              tone="info"
              pct={score}
            />
            <Stat
              icon={Clock}
              label="Time efficiency"
              value={`${submission?.minutes_solved ?? 0}m`}
              sub="Time spent"
              tone="success"
              pct={100}
            />
            <Stat
              icon={Zap}
              label="XP earned"
              value={`+${totalXp}`}
              sub={`Base XP awarded`}
              tone="primary"
              pct={(totalXp / Math.max(baseXp, 1)) * 100}
            />
          </div>
          <AnimatedBar label={`Total XP awarded: ${totalXp}`} pct={(totalXp / Math.max(baseXp, 1)) * 100} />
        </div>

        {/* Output or Errors */}
        <Card title="Evaluation Output" icon={Code2}>
          <pre className="rounded-md bg-editor-bg border p-3 text-xs font-mono overflow-auto max-h-72 scrollbar-thin text-muted-foreground whitespace-pre-wrap">
            {submission?.solution_output ? (
              typeof parsedOutput === 'object' && parsedOutput !== null ? (
                JSON.stringify(parsedOutput, null, 2)
              ) : (
                submission.solution_output
              )
            ) : (
              "No evaluation output recorded."
            )}
          </pre>
        </Card>

        {/* Your solution */}
        <Card title="Your Solution" icon={Code2}>
          <div className="rounded-md bg-editor-bg border overflow-hidden flex flex-col">
            {typeof parsedSolution === 'object' && parsedSolution !== null ? (
              <div className="flex flex-col">
                {Object.entries(parsedSolution)
                  .filter(([k]) => k !== "__none__" && k.trim() !== "")
                  .map(([filename, content], index) => (
                    <div key={filename} className="border-b last:border-b-0 border-border/50">
                      <div className="bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50">{filename}</div>
                      <pre className="p-3 text-xs font-mono overflow-x-auto max-h-[300px] scrollbar-thin text-muted-foreground whitespace-pre-wrap">
                        {String(content) || "(empty file)"}
                      </pre>
                    </div>
                  ))}
              </div>
            ) : parsedDiffFiles.length > 0 ? (
              <div className="flex flex-col">
                {parsedDiffFiles.map(({ filename, content }) => (
                  <div key={filename} className="border-b last:border-b-0 border-border/50">
                    <div className="bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50">{filename}</div>
                    <pre className="p-3 text-xs font-mono overflow-x-auto max-h-[300px] scrollbar-thin text-muted-foreground whitespace-pre-wrap">
                      {content || "(empty file)"}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="p-3 text-xs font-mono overflow-auto max-h-[500px] scrollbar-thin text-muted-foreground whitespace-pre-wrap">
                {submission?.solution ? submission.solution : "No solution recorded."}
              </pre>
            )}
          </div>
        </Card>

        {/* Action bar */}
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
            params={{ slug: lab?.slug ?? slug }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent ml-auto"
          >
            ← Lab dashboard
          </Link>
        </div>
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
