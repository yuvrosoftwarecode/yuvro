import { useMemo, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Zap,
  Users,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileArchive,
  ChevronRight,
  Search,
  ArrowUpRight,
  Star,
  GitCompare,
  Activity,
  AlertTriangle,
  CheckCircle2,
  X,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Evaluation } from "@/lib/recruiter";
import type { Candidate } from "@/lib/recruiterCandidates";
import { experienceBucket, vitarkaLabel } from "@/lib/recruiterCandidates";
import EmptyState from "@/components/common/EmptyState";

// -------- section nav --------
const SECTIONS = [
  { id: "health", label: "Evaluation Health" },
  { id: "insights", label: "AI Insights" },
  { id: "funnel", label: "Hiring Funnel" },
  { id: "reports", label: "Recruiter Reports" },
  { id: "questions", label: "Question Analytics" },
  { id: "labs", label: "Lab Analytics" },
  { id: "assessment", label: "Assessment" },
  { id: "vitarka", label: "Vitarka" },
  { id: "colleges", label: "Colleges" },
  { id: "companies", label: "Companies" },
  { id: "downloads", label: "Downloads" },
] as const;

export function IntelligenceTab({
  ev,
  candidates,
  notify,
}: {
  ev: Evaluation;
  candidates: Candidate[];
  notify: (m: string) => void;
}) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("health");
  const [globalQ, setGlobalQ] = useState("");

  if (candidates.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Sparkles}
          title="No Intelligence Data Available"
          description="AI insights, performance metrics, and section analytics will be generated automatically as candidates complete this evaluation."
        />
      </div>
    );
  }
  const submitted = useMemo(
    () => candidates.filter((c) => c.status === "Submitted" || c.status === "Completed"),
    [candidates],
  );
  const stats = useMemo(() => computeStats(candidates, submitted), [candidates, submitted]);

  const searchHits = useMemo(() => {
    if (!globalQ.trim()) return [];
    const q = globalQ.trim().toLowerCase();
    return candidates
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.college.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [candidates, globalQ]);

  return (
    <div className="space-y-8">
      {/* Executive header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Hiring Intelligence
          </div>
          <h2 className="mt-1 text-[22px] font-medium tracking-tight text-white">
            Make hiring decisions in minutes, not hours.
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-neutral-500">
            AI reads {candidates.length.toLocaleString()} candidates across engineering labs,
            knowledge and Vitarka. The signal below is what matters this week.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            value={globalQ}
            onChange={(e) => setGlobalQ(e.target.value)}
            placeholder="Search candidates, colleges, skills…"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-[13px] text-white placeholder-neutral-500 outline-none focus:border-white/25"
          />
          {searchHits.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
              {searchHits.map((c) => (
                <Link
                  key={c.id}
                  to="/recruiter/evaluations/$id/candidates/$candidateId"
                  params={{ id: ev.id, candidateId: c.id }}
                  className="block border-b border-white/5 px-3 py-2 last:border-b-0 hover:bg-white/5"
                >
                  <div className="text-[12px] text-white">{c.name}</div>
                  <div className="text-[11px] text-neutral-500">
                    {c.email} · ECI {c.eci}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub nav */}
      <div className="sticky top-0 z-20 -mx-8 border-b border-white/5 bg-neutral-950/85 px-8 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSection(s.id);
                document
                  .getElementById(`intel-${s.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`rounded-full px-3 py-1 text-[11px] transition ${section === s.id ? "bg-white !text-black" : "border border-white/10 text-white/70 hover:border-white/20 hover:!text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Health */}
      <Section
        id="health"
        title="Evaluation Health"
        subtitle="How this evaluation is performing overall."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HealthCard
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            delta={`${stats.completionRate - 68}%`}
            good={stats.completionRate >= 68}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Avg Engineering Capability Index"
            value={stats.avgEci}
            suffix="/100"
            delta={`${stats.avgEci - 71}`}
            good={stats.avgEci >= 71}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Avg Engineering Labs"
            value={stats.avgLabs}
            suffix="/100"
            icon={<Zap className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Avg Knowledge Assessment"
            value={stats.avgAssess}
            suffix="/100"
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Avg Vitarka"
            value={stats.avgVit}
            suffix="/100"
            icon={<Users className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Avg Completion Time"
            value={stats.avgTime}
            suffix=" min"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Drop-off Rate"
            value={`${stats.dropoff}%`}
            delta={`${stats.dropoff - 18}%`}
            good={stats.dropoff <= 18}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
          />
          <HealthCard
            label="Recruiter Recommendation"
            value={stats.topRecommendation}
            icon={<Star className="h-3.5 w-3.5" />}
          />
        </div>
      </Section>

      {/* AI Insights */}
      <Section
        id="insights"
        title="AI Hiring Insights"
        subtitle="Patterns Yuvro AI surfaced from this cohort."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {buildInsights(stats, submitted).map((ins, i) => (
            <InsightCard key={i} insight={ins} onAct={() => notify(ins.cta)} />
          ))}
        </div>
      </Section>

      {/* Funnel */}
      <Section
        id="funnel"
        title="Hiring Funnel"
        subtitle="Where candidates drop off, and where you should focus."
      >
        <FunnelChart stages={stats.funnel} onStage={(s) => notify(`Filtered to ${s.label}`)} />
      </Section>

      {/* Reports */}
      <Section id="reports" title="Recruiter Reports" subtitle="Curated shortlists, not charts.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ReportList
            title="Top Performers"
            evId={ev.id}
            rows={topN(submitted, "eci", 5)}
            metric="ECI"
          />
          <ReportList
            title="Hidden Gems"
            evId={ev.id}
            rows={hiddenGems(submitted).slice(0, 5)}
            metric="Labs"
          />
          <ReportList
            title="Candidates Requiring Review"
            evId={ev.id}
            rows={candidates
              .filter((c) => c.hiringStatus === "Pending Review" && c.eci >= 70)
              .slice(0, 5)}
            metric="ECI"
          />
          <ReportList
            title="Fastest Completion"
            evId={ev.id}
            rows={[...submitted]
              .sort((a, b) => a.completionMinutes - b.completionMinutes)
              .slice(0, 5)}
            metric="Min"
            metricKey="completionMinutes"
          />
          <ReportList
            title="Highest Engineering Labs"
            evId={ev.id}
            rows={topN(submitted, "labsScore", 5)}
            metric="Labs"
            metricKey="labsScore"
          />
          <ReportList
            title="Best SQL"
            evId={ev.id}
            rows={submitted
              .filter((c) => c.skills.includes("SQL"))
              .sort((a, b) => b.eci - a.eci)
              .slice(0, 5)}
            metric="ECI"
          />
          <ReportList
            title="Best Debugging"
            evId={ev.id}
            rows={submitted
              .filter((c) => c.labsScore >= 85)
              .sort((a, b) => b.labsScore - a.labsScore)
              .slice(0, 5)}
            metric="Labs"
            metricKey="labsScore"
          />
          <ReportList
            title="Best API Skills"
            evId={ev.id}
            rows={submitted
              .filter((c) => c.skills.includes("Node") || c.skills.includes("Spring Boot"))
              .sort((a, b) => b.eci - a.eci)
              .slice(0, 5)}
            metric="ECI"
          />
          <ReportList
            title="Strongest Communication"
            evId={ev.id}
            rows={topN(submitted, "vitarkaScore", 5)}
            metric="Vitarka"
            metricKey="vitarkaScore"
          />
        </div>
      </Section>

      {/* Question analytics */}
      <Section
        id="questions"
        title="Question Analytics"
        subtitle="Which questions actually filter signal."
      >
        <QuestionAnalytics submitted={submitted} />
      </Section>

      {/* Lab analytics */}
      <Section
        id="labs"
        title="Engineering Lab Analytics"
        subtitle="Difficulty and completion patterns per lab."
      >
        <LabAnalytics submitted={submitted} />
      </Section>

      {/* Knowledge Assessment */}
      <Section
        id="assessment"
        title="Knowledge Assessment Analytics"
        subtitle="Accuracy and time per subject."
      >
        <AssessmentAnalytics submitted={submitted} />
      </Section>

      {/* Vitarka */}
      <Section
        id="vitarka"
        title="Vitarka Analytics"
        subtitle="AI-scored engineering discussion competencies."
      >
        <VitarkaAnalytics submitted={submitted} />
      </Section>

      {/* Colleges */}
      <Section
        id="colleges"
        title="College Analytics"
        subtitle="Top performing institutions in this cohort."
      >
        <CollegeAnalytics submitted={submitted} allCount={candidates.length} />
      </Section>

      {/* Companies */}
      <Section
        id="companies"
        title="Company & Experience"
        subtitle="Where this pipeline is coming from."
      >
        <CompanyAnalytics candidates={candidates} />
      </Section>

      {/* Downloads */}
      <Section
        id="downloads"
        title="Download Center"
        subtitle="Generate polished exports for stakeholders."
      >
        <DownloadCenter ev={ev} candidates={candidates} notify={notify} />
      </Section>
    </div>
  );
}

// ============= Helpers =============

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`intel-${id}`} className="scroll-mt-24">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">{title}</div>
        {subtitle && <div className="mt-0.5 text-[12px] text-neutral-500">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function computeStats(all: Candidate[], submitted: Candidate[]) {
  const invited = all.length;
  const started = all.filter((c) => c.status !== "Not Started").length;
  const completed = submitted.length;
  const reviewed = all.filter((c) => c.hiringStatus !== "Pending Review").length;
  const interview = all.filter((c) => c.hiringStatus === "Interview Scheduled").length;
  const selected = all.filter((c) => c.hiringStatus === "Selected").length;
  const rejected = all.filter((c) => c.hiringStatus === "Rejected").length;
  const abandoned = all.filter((c) => c.status === "In Progress").length;
  const expired = all.filter((c) => c.status === "Expired").length;

  const avgEci = submitted.length ? Math.round(avg(submitted.map((c) => c.eci))) : 0;
  const avgLabs = submitted.length ? Math.round(avg(submitted.map((c) => c.labsScore))) : 0;
  const avgAssess = submitted.length ? Math.round(avg(submitted.map((c) => c.assessmentScore))) : 0;
  const avgVit = submitted.length ? Math.round(avg(submitted.map((c) => c.vitarkaScore))) : 0;
  const avgTime = submitted.length ? Math.round(avg(submitted.map((c) => c.completionMinutes))) : 0;

  const completionRate = invited ? Math.round((completed / invited) * 100) : 0;
  const dropoff = invited ? Math.round(((abandoned + expired) / invited) * 100) : 0;

  const recCounts: Record<string, number> = {};
  for (const c of submitted) recCounts[c.recommendation] = (recCounts[c.recommendation] || 0) + 1;
  const topRecommendation = Object.entries(recCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return {
    invited,
    started,
    completed,
    reviewed,
    interview,
    selected,
    rejected,
    abandoned,
    expired,
    avgEci,
    avgLabs,
    avgAssess,
    avgVit,
    avgTime,
    completionRate,
    dropoff,
    topRecommendation,
    funnel: [
      { key: "invited", label: "Invited", count: invited },
      { key: "started", label: "Started", count: started },
      { key: "completed", label: "Completed", count: completed },
      { key: "reviewed", label: "Reviewed", count: reviewed },
      { key: "interview", label: "Interview", count: interview },
      { key: "selected", label: "Selected", count: selected, tone: "good" as const },
      { key: "rejected", label: "Rejected", count: rejected, tone: "muted" as const },
    ],
  };
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const topN = (arr: Candidate[], key: keyof Candidate, n: number) =>
  [...arr].sort((a, b) => (b[key] as number) - (a[key] as number)).slice(0, n);
const hiddenGems = (arr: Candidate[]) =>
  arr.filter((c) => c.eci >= 66 && c.eci <= 78 && c.labsScore >= 80);

// ---- Health card ----
function HealthCard({
  label,
  value,
  suffix,
  delta,
  good,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  good?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[26px] font-medium text-white">
        {value}
        {suffix && <span className="text-[13px] text-neutral-500">{suffix}</span>}
      </div>
      {delta && (
        <div className={`mt-0.5 text-[11px] ${good ? "text-emerald-300" : "text-amber-300"}`}>
          {good ? "▲" : "▼"} {delta} vs benchmark
        </div>
      )}
    </div>
  );
}

// ---- Insights ----
interface Insight {
  title: string;
  body: string;
  tone: "green" | "amber" | "red";
  cta: string;
}

function buildInsights(s: ReturnType<typeof computeStats>, submitted: Candidate[]): Insight[] {
  const strong = submitted.filter((c) => c.recommendation === "Strong Hire").length;
  const backend = submitted.filter(
    (c) => c.skills.some((k) => ["Java", "Node", "Spring Boot"].includes(k)) && c.eci >= 80,
  ).length;
  const gems = hiddenGems(submitted).length;
  return [
    {
      title: "SQL Optimisation Lab is your hardest filter",
      body: `Only ${Math.max(28, Math.min(46, 40 - (s.avgLabs % 12)))}% of candidates solved it end-to-end. It's separating strong engineers from average ones.`,
      tone: "amber",
      cta: "Open SQL Lab Report",
    },
    {
      title: "Highest scoring competency: Communication",
      body: "Vitarka discussion shows this cohort articulates trade-offs clearly, especially on system design.",
      tone: "green",
      cta: "See top communicators",
    },
    {
      title: "Lowest scoring competency: Architecture",
      body: "Median Architecture score is 61/100. Consider a targeted follow-up round for shortlisted candidates.",
      tone: "red",
      cta: "Filter Architecture <70",
    },
    {
      title: "Labs are filtering better than MCQs",
      body: "Assessment scores compress around 70-78 while labs spread 45-95. Weight labs 1.5x in your hiring decision.",
      tone: "amber",
      cta: "Reweight ECI",
    },
    {
      title: `${gems} hidden gems demonstrated exceptional debugging`,
      body: "These candidates scored in labs but were pulled down by MCQs. Recommend manual review.",
      tone: "green",
      cta: "Review hidden gems",
    },
    {
      title: `${backend} candidates are excellent fits for Backend Engineer`,
      body: "Strong on Java/Node + high Vitarka technical depth. Prioritize these for interviews this week.",
      tone: "green",
      cta: "View backend shortlist",
    },
    {
      title: `${strong} Strong Hire candidates awaiting your decision`,
      body: "Average recruiter response time is 3.4 days. Faster decisions win offers.",
      tone: "amber",
      cta: "Review pending",
    },
  ];
}

function InsightCard({ insight, onAct }: { insight: Insight; onAct: () => void }) {
  const tone: Record<Insight["tone"], string> = {
    green: "border-emerald-400/25 from-emerald-500/10",
    amber: "border-amber-400/25 from-amber-500/10",
    red: "border-red-400/25 from-red-500/10",
  };
  const dot: Record<Insight["tone"], string> = {
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
  };
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${tone[insight.tone]} bg-white/[0.02] p-5`}
    >
      <div
        className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${tone[insight.tone]} to-transparent blur-2xl`}
      />
      <div className="relative">
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 inline-flex h-1.5 w-1.5 rounded-full ${dot[insight.tone]}`} />
          <div className="flex-1">
            <div className="text-[14px] font-medium text-white">{insight.title}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">{insight.body}</p>
          </div>
        </div>
        <button
          onClick={onAct}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white transition hover:bg-white/10"
        >
          {insight.cta} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ---- Funnel ----
function FunnelChart({
  stages,
  onStage,
}: {
  stages: { key: string; label: string; count: number; tone?: "good" | "muted" }[];
  onStage: (s: { label: string }) => void;
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="rounded-xl border border-white/5 p-4">
      <div className="space-y-2">
        {stages.map((s) => {
          const pct = Math.round((s.count / max) * 100);
          const bar =
            s.tone === "good"
              ? "from-emerald-400/60 to-emerald-400/20"
              : s.tone === "muted"
                ? "from-neutral-600/50 to-neutral-600/10"
                : "from-amber-400/60 to-amber-400/10";
          return (
            <button
              key={s.key}
              onClick={() => onStage(s)}
              className="group flex w-full items-center gap-3 text-left"
            >
              <div className="w-24 text-[11px] uppercase tracking-widest text-neutral-500">
                {s.label}
              </div>
              <div className="relative flex-1 overflow-hidden rounded-md bg-white/[0.03]">
                <div
                  className={`h-8 rounded-md bg-gradient-to-r ${bar} transition group-hover:brightness-125`}
                  style={{ width: `${pct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px]">
                  <span className="text-white">{s.count.toLocaleString()}</span>
                  <span className="text-neutral-500">{pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Report list ----
function ReportList({
  title,
  rows,
  metric,
  metricKey = "eci",
  evId,
}: {
  title: string;
  rows: Candidate[];
  metric: string;
  metricKey?: keyof Candidate;
  evId: string;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-white">{title}</div>
        <button
          onClick={() => setBookmarked((v) => !v)}
          title="Bookmark"
          className="text-neutral-500 hover:text-white"
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${bookmarked ? "fill-emerald-400 text-emerald-400" : ""}`}
          />
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="mt-4 text-[12px] text-neutral-500">No candidates yet.</div>
      ) : (
        <div className="mt-3 divide-y divide-white/5">
          {rows.map((c) => (
            <Link
              key={c.id}
              to="/recruiter/evaluations/$id/candidates/$candidateId"
              params={{ id: evId, candidateId: c.id }}
              className="flex items-center gap-2 py-2 hover:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-white">{c.name}</div>
                <div className="truncate text-[11px] text-neutral-500">{c.company}</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-medium text-emerald-300">
                  {c[metricKey] as number}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                  {metric}
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Question analytics ----
const DEMO_QUESTIONS = [
  {
    id: "q1",
    text: "Which Stream operation is terminal?",
    tech: "Java",
    diff: "Easy",
    accuracy: 88,
    avg: 32,
    skipped: 4,
  },
  {
    id: "q2",
    text: "Explain volatile vs synchronized",
    tech: "Java",
    diff: "Hard",
    accuracy: 41,
    avg: 78,
    skipped: 22,
  },
  {
    id: "q3",
    text: "Optimize this slow query",
    tech: "SQL",
    diff: "Hard",
    accuracy: 34,
    avg: 92,
    skipped: 28,
  },
  {
    id: "q4",
    text: "What is a window function?",
    tech: "SQL",
    diff: "Medium",
    accuracy: 62,
    avg: 54,
    skipped: 12,
  },
  {
    id: "q5",
    text: "Difference between var, let, const",
    tech: "JS",
    diff: "Easy",
    accuracy: 92,
    avg: 24,
    skipped: 2,
  },
  {
    id: "q6",
    text: "React reconciliation strategy",
    tech: "React",
    diff: "Medium",
    accuracy: 58,
    avg: 51,
    skipped: 15,
  },
  {
    id: "q7",
    text: "Python GIL contention triggers",
    tech: "Python",
    diff: "Hard",
    accuracy: 39,
    avg: 82,
    skipped: 26,
  },
];

function QuestionAnalytics({ submitted }: { submitted: Candidate[] }) {
  const [sort, setSort] = useState<"accuracy" | "skipped" | "avg">("accuracy");
  const sorted = [...DEMO_QUESTIONS].sort((a, b) =>
    sort === "accuracy"
      ? a.accuracy - b.accuracy
      : sort === "skipped"
        ? b.skipped - a.skipped
        : b.avg - a.avg,
  );
  const overallAcc = Math.round(avg(sorted.map((q) => q.accuracy)));
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Most Failed" value={sorted[0]?.text.slice(0, 22) + "…"} />
        <MetricTile
          label="Most Skipped"
          value={
            DEMO_QUESTIONS.slice()
              .sort((a, b) => b.skipped - a.skipped)[0]
              .text.slice(0, 22) + "…"
          }
        />
        <MetricTile label="Overall Accuracy" value={`${overallAcc}%`} />
        <MetricTile
          label="Avg Time / Question"
          value={`${Math.round(avg(DEMO_QUESTIONS.map((q) => q.avg)))}s`}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-[12px]">
          <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">Question</th>
              <th className="px-3 py-2 text-left">Tech</th>
              <th className="px-3 py-2 text-left">Difficulty</th>
              <SortTh active={sort === "accuracy"} onClick={() => setSort("accuracy")}>
                Accuracy
              </SortTh>
              <SortTh active={sort === "avg"} onClick={() => setSort("avg")}>
                Avg Time
              </SortTh>
              <SortTh active={sort === "skipped"} onClick={() => setSort("skipped")}>
                Skipped
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {sorted.map((q) => (
              <tr key={q.id} className="border-b border-white/5 last:border-b-0">
                <td className="px-3 py-2 text-neutral-200">{q.text}</td>
                <td className="px-3 py-2 text-neutral-400">{q.tech}</td>
                <td className="px-3 py-2">
                  <DiffBadge d={q.diff} />
                </td>
                <td className="px-3 py-2">
                  <BarInline value={q.accuracy} />
                </td>
                <td className="px-3 py-2 text-neutral-300">{q.avg}s</td>
                <td className="px-3 py-2 text-neutral-300">{q.skipped}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Lab analytics ----
const DEMO_LABS = [
  {
    id: "l1",
    name: "Payment API Broken",
    tech: "Java",
    completion: 71,
    ai: 78,
    time: 22,
    tasks: 3.4,
  },
  { id: "l2", name: "SQL Optimisation", tech: "SQL", completion: 34, ai: 64, time: 31, tasks: 2.1 },
  {
    id: "l3",
    name: "JWT Auth Failure",
    tech: "Security",
    completion: 52,
    ai: 71,
    time: 28,
    tasks: 3.0,
  },
  {
    id: "l4",
    name: "React Checkout Regression",
    tech: "React",
    completion: 68,
    ai: 74,
    time: 26,
    tasks: 3.2,
  },
  {
    id: "l5",
    name: "Order API Performance",
    tech: "Node",
    completion: 46,
    ai: 69,
    time: 33,
    tasks: 2.8,
  },
];

function LabAnalytics({ submitted }: { submitted: Candidate[] }) {
  const most = [...DEMO_LABS].sort((a, b) => a.completion - b.completion)[0];
  const best = [...DEMO_LABS].sort((a, b) => b.completion - a.completion)[0];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile
          label="Most Failed Lab"
          value={most.name}
          sub={`${most.completion}% completed`}
        />
        <MetricTile
          label="Most Successful"
          value={best.name}
          sub={`${best.completion}% completed`}
        />
        <MetricTile
          label="Avg AI Score"
          value={`${Math.round(avg(DEMO_LABS.map((l) => l.ai)))}/100`}
        />
        <MetricTile
          label="Avg Task Completion"
          value={`${avg(DEMO_LABS.map((l) => l.tasks)).toFixed(1)} / 4`}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full text-[12px]">
          <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">Lab</th>
              <th className="px-3 py-2 text-left">Tech</th>
              <th className="px-3 py-2 text-left">Completion</th>
              <th className="px-3 py-2 text-left">AI Score</th>
              <th className="px-3 py-2 text-left">Avg Time</th>
              <th className="px-3 py-2 text-left">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_LABS.map((l) => (
              <tr key={l.id} className="border-b border-white/5 last:border-b-0">
                <td className="px-3 py-2 text-neutral-200">{l.name}</td>
                <td className="px-3 py-2 text-neutral-400">{l.tech}</td>
                <td className="px-3 py-2">
                  <BarInline value={l.completion} />
                </td>
                <td className="px-3 py-2 text-neutral-300">{l.ai}</td>
                <td className="px-3 py-2 text-neutral-300">{l.time}m</td>
                <td className="px-3 py-2 text-neutral-300">{l.tasks.toFixed(1)}/4</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Assessment analytics ----
const DEMO_SUBJECTS = [
  {
    name: "Java",
    accuracy: 74,
    time: 42,
    strong: ["Streams", "Collections"],
    weak: ["Concurrency"],
  },
  { name: "SQL", accuracy: 61, time: 55, strong: ["Joins"], weak: ["Window functions", "Indexes"] },
  { name: "Python", accuracy: 68, time: 48, strong: ["Comprehensions"], weak: ["GIL", "Async"] },
  {
    name: "JavaScript",
    accuracy: 79,
    time: 38,
    strong: ["Closures", "Scoping"],
    weak: ["Event loop"],
  },
  { name: "React", accuracy: 66, time: 46, strong: ["Hooks"], weak: ["Reconciliation", "SSR"] },
];

function AssessmentAnalytics({ submitted }: { submitted: Candidate[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {DEMO_SUBJECTS.map((s) => (
        <div key={s.name} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-medium text-white">{s.name}</div>
            <div className="text-[11px] text-neutral-500">{s.time}s avg</div>
          </div>
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Accuracy</div>
            <div className="mt-1">
              <BarInline value={s.accuracy} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400">Strong</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {s.strong.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-widest text-amber-400">Weak</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {s.weak.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Vitarka ----
const VIT_COMPETENCIES = [
  "Communication",
  "Problem Solving",
  "Leadership",
  "Architecture",
  "Technical Depth",
  "Confidence",
  "Business Understanding",
];

function VitarkaAnalytics({ submitted }: { submitted: Candidate[] }) {
  const values = VIT_COMPETENCIES.map((c, i) => ({
    name: c,
    value: submitted.length
      ? Math.round(avg(submitted.map((s) => (s.vitarkaScore + i * 3) % 100)) * 0.7 + 30)
      : 0,
  }));
  const max = 100;
  const size = 300,
    cx = size / 2,
    cy = size / 2,
    r = 110;
  const angle = (i: number) => (Math.PI * 2 * i) / values.length - Math.PI / 2;
  const pt = (v: number, i: number) => [
    cx + Math.cos(angle(i)) * r * (v / max),
    cy + Math.sin(angle(i)) * r * (v / max),
  ];
  const poly = values.map((v, i) => pt(v.value, i).join(",")).join(" ");
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 lg:col-span-2 flex justify-center">
        <svg width={size} height={size}>
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <polygon
              key={s}
              points={values
                .map((_, i) =>
                  [cx + Math.cos(angle(i)) * r * s, cy + Math.sin(angle(i)) * r * s].join(","),
                )
                .join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
            />
          ))}
          <polygon
            points={poly}
            fill="rgba(52, 211, 153, 0.15)"
            stroke="rgb(52, 211, 153)"
            strokeWidth={1.5}
          />
          {values.map((v, i) => {
            const [x, y] = pt(max + 18, i);
            return (
              <text
                key={v.name}
                x={x}
                y={y}
                textAnchor="middle"
                className="fill-neutral-400"
                style={{ fontSize: 10 }}
              >
                {v.name}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {values
          .sort((a, b) => b.value - a.value)
          .map((v) => (
            <div
              key={v.name}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <div className="flex-1 text-[12px] text-neutral-200">{v.name}</div>
              <div className="w-32">
                <BarInline value={v.value} />
              </div>
              <div className="w-8 text-right text-[12px] text-white">{v.value}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---- Colleges ----
function CollegeAnalytics({ submitted, allCount }: { submitted: Candidate[]; allCount: number }) {
  const grouped: Record<string, Candidate[]> = {};
  for (const c of submitted) (grouped[c.college] ||= []).push(c);
  const rows = Object.entries(grouped)
    .map(([college, list]) => ({
      college,
      count: list.length,
      avgEci: Math.round(avg(list.map((c) => c.eci))),
      selected: list.filter((c) => c.hiringStatus === "Selected").length,
      shortlisted: list.filter((c) => c.hiringStatus === "Shortlisted").length,
      interview: list.filter((c) => c.hiringStatus === "Interview Scheduled").length,
    }))
    .sort((a, b) => b.avgEci - a.avgEci)
    .slice(0, 12);
  return (
    <div className="overflow-hidden rounded-xl border border-white/5">
      <table className="w-full text-[12px]">
        <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left">College</th>
            <th className="px-3 py-2 text-left">Candidates</th>
            <th className="px-3 py-2 text-left">Avg ECI</th>
            <th className="px-3 py-2 text-left">Interview</th>
            <th className="px-3 py-2 text-left">Shortlisted</th>
            <th className="px-3 py-2 text-left">Selected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.college} className="border-b border-white/5 last:border-b-0">
              <td className="px-3 py-2 text-neutral-200">{r.college}</td>
              <td className="px-3 py-2 text-neutral-300">{r.count}</td>
              <td className="px-3 py-2">
                <BarInline value={r.avgEci} />
              </td>
              <td className="px-3 py-2 text-amber-300">{r.interview}</td>
              <td className="px-3 py-2 text-emerald-300">{r.shortlisted}</td>
              <td className="px-3 py-2 text-emerald-300">{r.selected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Companies ----
function CompanyAnalytics({ candidates }: { candidates: Candidate[] }) {
  const byCompany: Record<string, number> = {};
  const byExp: Record<string, number> = {};
  for (const c of candidates) {
    byCompany[c.company] = (byCompany[c.company] || 0) + 1;
    byExp[experienceBucket(c.experience)] = (byExp[experienceBucket(c.experience)] || 0) + 1;
  }
  const top = Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const exp = ["Fresher", "1-3 Years", "3-5 Years", "5-8 Years", "8+"].map((k) => ({
    k,
    v: byExp[k] || 0,
  }));
  const max = Math.max(...top.map((t) => t[1]), 1);
  const emax = Math.max(...exp.map((e) => e.v), 1);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-[13px] font-medium text-white">Top Companies</div>
        <div className="mt-3 space-y-1.5">
          {top.map(([n, v]) => (
            <div key={n} className="flex items-center gap-3">
              <div className="w-40 truncate text-[12px] text-neutral-300">{n}</div>
              <div className="flex-1 rounded-md bg-white/[0.03]">
                <div
                  className="h-5 rounded-md bg-gradient-to-r from-amber-400/60 to-amber-400/10"
                  style={{ width: `${(v / max) * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-[11px] text-neutral-400">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-[13px] font-medium text-white">Experience Distribution</div>
        <div className="mt-3 space-y-1.5">
          {exp.map((e) => (
            <div key={e.k} className="flex items-center gap-3">
              <div className="w-24 text-[12px] text-neutral-300">{e.k}</div>
              <div className="flex-1 rounded-md bg-white/[0.03]">
                <div
                  className="h-5 rounded-md bg-gradient-to-r from-amber-400/60 to-amber-400/10"
                  style={{ width: `${(e.v / emax) * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-[11px] text-neutral-400">{e.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Downloads ----
function DownloadCenter({
  ev,
  candidates,
  notify,
}: {
  ev: Evaluation;
  candidates: Candidate[];
  notify: (m: string) => void;
}) {
  const [gen, setGen] = useState<string | null>(null);
  const run = async (label: string, filename: string, mime: string, build: () => string | Blob) => {
    setGen(label);
    await new Promise((r) => setTimeout(r, 450));
    const data = build();
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setGen(null);
    notify(`${label} downloaded`);
  };
  const csv = () => {
    const rows = [
      [
        "Name",
        "Email",
        "College",
        "Company",
        "ECI",
        "Labs",
        "Assess",
        "Vitarka",
        "Status",
        "Hiring",
      ],
    ].concat(
      candidates.map((c) => [
        c.name,
        c.email,
        c.college,
        c.company,
        String(c.eci),
        String(c.labsScore),
        String(c.assessmentScore),
        String(c.vitarkaScore),
        c.status,
        c.hiringStatus,
      ]),
    );
    return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  };
  const json = () =>
    JSON.stringify({ evaluation: { id: ev.id, title: ev.title }, candidates }, null, 2);
  const pdfLike = (title: string, body: string) =>
    `%PDF-1.4\n% Yuvro Labs report\n${title}\n\n${body}\n%%EOF`;

  const items: { label: string; sub: string; icon: React.ReactNode; go: () => void }[] = [
    {
      label: "Candidate Summary PDF",
      sub: "One-page hiring brief per candidate",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Candidate Summary PDF", `${ev.title}-summary.pdf`, "application/pdf", () =>
          pdfLike(
            ev.title,
            candidates
              .slice(0, 20)
              .map((c) => `${c.name} · ECI ${c.eci} · ${c.recommendation}`)
              .join("\n"),
          ),
        ),
    },
    {
      label: "Detailed Candidate Report",
      sub: "Deep dive per candidate: labs, MCQ, Vitarka",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Detailed Report", `${ev.title}-detailed.pdf`, "application/pdf", () =>
          pdfLike(ev.title, "Detailed candidate breakdown"),
        ),
    },
    {
      label: "Engineering Labs Report",
      sub: "Lab performance across the cohort",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Labs Report", `${ev.title}-labs.pdf`, "application/pdf", () =>
          pdfLike(ev.title, "Labs analytics"),
        ),
    },
    {
      label: "Knowledge Assessment Report",
      sub: "MCQ / subject accuracy report",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Assessment Report", `${ev.title}-assessment.pdf`, "application/pdf", () =>
          pdfLike(ev.title, "Assessment analytics"),
        ),
    },
    {
      label: "Vitarka Discussion Report",
      sub: "Competency scores + AI summaries",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Vitarka Report", `${ev.title}-vitarka.pdf`, "application/pdf", () =>
          pdfLike(ev.title, "Vitarka analytics"),
        ),
    },
    {
      label: "Combined Evaluation Report",
      sub: "Everything in one file",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Combined Report", `${ev.title}-combined.pdf`, "application/pdf", () =>
          pdfLike(ev.title, "Full analytics package"),
        ),
    },
    {
      label: "Export CSV",
      sub: "For spreadsheets and ATS",
      icon: <FileSpreadsheet className="h-4 w-4" />,
      go: () => run("CSV", `${ev.title}.csv`, "text/csv", csv),
    },
    {
      label: "Export Excel",
      sub: "Same data, .xls format",
      icon: <FileSpreadsheet className="h-4 w-4" />,
      go: () => run("Excel", `${ev.title}.xls`, "application/vnd.ms-excel", csv),
    },
    {
      label: "Export JSON",
      sub: "For downstream automation",
      icon: <FileJson className="h-4 w-4" />,
      go: () => run("JSON", `${ev.title}.json`, "application/json", json),
    },
    {
      label: "Resume Bundle (ZIP)",
      sub: "All candidate resumes zipped",
      icon: <FileArchive className="h-4 w-4" />,
      go: () =>
        run(
          "Resume Bundle",
          `${ev.title}-resumes.zip`,
          "application/zip",
          () => "PK\u0003\u0004 mock resume bundle",
        ),
    },
    {
      label: "Interview Notes PDF",
      sub: "Recruiter notes and next steps",
      icon: <FileText className="h-4 w-4" />,
      go: () =>
        run("Interview Notes", `${ev.title}-notes.pdf`, "application/pdf", () =>
          pdfLike(ev.title, "Recruiter notes"),
        ),
    },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => (
        <button
          key={it.label}
          disabled={!!gen}
          onClick={it.go}
          className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left transition hover:border-white/15 disabled:opacity-50"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-white">
            {it.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-white">{it.label}</div>
            <div className="truncate text-[11px] text-neutral-500">{it.sub}</div>
          </div>
          <Download
            className={`h-3.5 w-3.5 ${gen === it.label ? "animate-pulse text-emerald-400" : "text-neutral-500 group-hover:text-white"}`}
          />
        </button>
      ))}
    </div>
  );
}

// ---- shared small ----
function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 truncate text-[16px] font-medium text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div>}
    </div>
  );
}
function SortTh({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 text-left">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
      >
        {children} <ChevronDown className="h-3 w-3" />
      </button>
    </th>
  );
}
function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    Easy: "border-emerald-400/25 text-emerald-300",
    Medium: "border-amber-400/25 text-amber-300",
    Hard: "border-red-400/25 text-red-300",
  };
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${map[d] || ""}`}>{d}</span>
  );
}
function BarInline({ value }: { value: number }) {
  const t =
    value >= 80
      ? "from-emerald-400 to-emerald-400/30"
      : value >= 60
        ? "from-amber-400 to-amber-400/30"
        : value >= 40
          ? "from-amber-400 to-amber-400/30"
          : "from-red-400 to-red-400/30";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${t}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <div className="w-8 text-right text-[11px] text-neutral-300">{value}</div>
    </div>
  );
}
