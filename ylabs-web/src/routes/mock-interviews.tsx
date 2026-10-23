import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";
import {
  fetchBackendMockInterviews,
  fetchUserInterviewSubmissions,
} from "@/services/mockInterviewService";
import {
  ArrowRight,
  Sparkles,
  Flame,
  Mic,
  Trophy,
  Check,
  Plus,
  Star,
  Search,
  Clock,
  Loader2,
  Bot,
  BrainCircuit,
} from "lucide-react";

export const Route = createFileRoute("/mock-interviews")({
  head: () => ({
    meta: [
      { title: "Vitarka Mock Interviews | Yuvro" },
      { name: "description", content: "Practice AI-led tech mock interviews with Vitarka." },
    ],
  }),
  component: MockHub,
});

import {
  type Category,
  type Diff,
  type Interview,
} from "@/lib/mockInterviews";

const ENROLLED_KEY = "yuvro_real_mock_interviews_enrolled";

const loadEnrolled = (): string[] => {
  try {
    const raw = localStorage.getItem(ENROLLED_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

function MockHub() {
  const { user } = useAuth();
  const displayName = user?.first_name || (user?.username ?? me.name.split(" ")[0]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([fetchBackendMockInterviews(), fetchUserInterviewSubmissions()])
      .then(([interviewData, userSubmissions]) => {
        if (!mounted) return;
        setInterviews(interviewData);
        setSubmissions(userSubmissions);

        const validIds = new Set(interviewData.map((d) => d.slug));
        const stored = loadEnrolled().filter((id) => validIds.has(id));

        if (stored.length === 0 && interviewData.length > 0) {
          const initial = [interviewData[0].slug];
          setEnrolled(initial);
          try {
            localStorage.setItem(ENROLLED_KEY, JSON.stringify(initial));
          } catch {}
        } else {
          setEnrolled(stored);
        }
      })
      .catch((err) => {
        console.error("Failed to load backend mock interview data:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const save = (v: string[]) => {
    setEnrolled(v);
    try {
      localStorage.setItem(ENROLLED_KEY, JSON.stringify(v));
    } catch {}
  };

  const toggle = (s: string) =>
    save(enrolled.includes(s) ? enrolled.filter((x) => x !== s) : [...enrolled, s]);

  const toggleIn = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const mine = useMemo(
    () => interviews.filter((i) => enrolled.includes(i.slug)),
    [interviews, enrolled]
  );

  const featured = useMemo(
    () => interviews.filter((i) => i.featured),
    [interviews]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return interviews.filter((i) => {
      const skillsStr = (i.requiredSkills || []).join(" ").toLowerCase();
      const matchesSearch =
        !s ||
        i.name.toLowerCase().includes(s) ||
        i.description.toLowerCase().includes(s) ||
        skillsStr.includes(s);

      const matchesCat = !cats.length || cats.includes(i.category);
      const matchesDiff = !diffs.length || diffs.includes(i.difficulty);
      const matchesRole = !roles.length || roles.includes(i.role);

      return matchesSearch && matchesCat && matchesDiff && matchesRole;
    });
  }, [interviews, q, cats, diffs, roles]);

  const availableCategories = useMemo(
    () => Array.from(new Set(interviews.map((i) => i.category))),
    [interviews]
  );

  const availableDifficulties = useMemo(
    () => Array.from(new Set(interviews.map((i) => i.difficulty))),
    [interviews]
  );

  const availableRoles = useMemo(
    () => Array.from(new Set(interviews.map((i) => i.role))),
    [interviews]
  );

  const hasFilters = !!(q || cats.length || diffs.length || roles.length);

  // Dynamic user performance calculation
  const totalCompletedAttempts = useMemo(() => {
    return submissions.filter((s) => s.status === "completed").length;
  }, [submissions]);

  const avgScoreDisplay = useMemo(() => {
    const validScores = submissions
      .map((s) => s.marks ?? s.report?.overall_score ?? s.report_summary?.score)
      .filter((v) => typeof v === "number" && v > 0);

    if (validScores.length === 0) return "--";
    const avg = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    return `${avg}%`;
  }, [submissions]);

  const streakDisplay = useMemo(() => {
    const s = (user as any)?.streak;
    return typeof s === "number" && s > 0 ? `${s}d` : "0d";
  }, [user]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/40 via-card to-background p-5 md:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-ui/20 blur-3xl" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:gap-6">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Welcome back, {displayName}
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight truncate">
                Vitarka <span className="text-primary">Mock Interviews</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl hidden sm:block">
                AI-led technical interviews powered by the Vitarka Dynamic Engine, offering adaptive real-time questions, skill evaluation, and actionable feedback.
              </p>
            </div>
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:min-w-[380px] md:min-w-[420px]">
              <MiniStat
                icon={<Mic className="h-3.5 w-3.5 text-primary" />}
                label="Enrolled"
                value={String(mine.length)}
                accent="primary"
              />
              <MiniStat
                icon={<Trophy className="h-3.5 w-3.5 text-info" />}
                label="Avg score"
                value={avgScoreDisplay}
                accent="info"
              />
              <MiniStat
                icon={<Flame className="h-3.5 w-3.5 text-warning" />}
                label="Day streak"
                value={streakDisplay}
                accent="warning"
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Connecting to live mock interview engine…</span>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold">My interviews</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mine.length} enrolled · {totalCompletedAttempts} completed attempts
                </p>
              </div>
              {mine.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
                  You haven't enrolled in any interview yet. Pick one from the catalog below.
                </div>
              ) : (
                <HScroll>
                  {mine.map((i) => (
                    <div key={i.slug} className="w-[320px] shrink-0">
                      <MineCard i={i} />
                    </div>
                  ))}
                </HScroll>
              )}
            </section>

            {featured.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" /> Featured interviews
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live dynamic AI interviews available right now.
                  </p>
                </div>
                <HScroll>
                  {featured.map((i) => (
                    <div key={i.slug} className="w-[330px] shrink-0">
                      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-accent/20 p-5 hover:border-primary/50 transition flex flex-col justify-between h-full">
                        <div
                          className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30"
                          style={{ background: `var(--${i.color})` }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                              <Star className="h-3 w-3" /> Featured
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              <BrainCircuit className="h-3 w-3" /> {i.interviewMode === "automatic" ? "AI Dynamic" : "Adaptive"}
                            </span>
                          </div>
                          <Link
                            to="/mock-interview/$slug"
                            params={{ slug: i.slug }}
                            className="mt-3 flex items-start gap-3"
                          >
                            <div className="text-3xl">{i.icon}</div>
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate">{i.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {i.description}
                              </p>
                            </div>
                          </Link>
                          {i.requiredSkills && i.requiredSkills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {i.requiredSkills.slice(0, 3).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {skill}
                                </span>
                              ))}
                              {i.requiredSkills.length > 3 && (
                                <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  +{i.requiredSkills.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <Meta i={i} />
                          <div className="mt-4">
                            <AddBtn
                              on={enrolled.includes(i.slug)}
                              onClick={() => toggle(i.slug)}
                              full
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </HScroll>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    All mock interviews
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filtered.length} of {interviews.length} live backend interviews
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by role or skills…"
                    className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-transparent w-56 outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
                <aside className="rounded-xl border bg-card/40 p-4 md:sticky md:top-20 self-start space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Filters</span>
                    {hasFilters && (
                      <button
                        onClick={() => {
                          setQ("");
                          setCats([]);
                          setDiffs([]);
                          setRoles([]);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {availableCategories.length > 0 && (
                    <Group label="Category">
                      {availableCategories.map((c) => (
                        <CheckRow
                          key={c}
                          label={c}
                          checked={cats.includes(c)}
                          onChange={() => setCats((p) => toggleIn(p, c))}
                        />
                      ))}
                    </Group>
                  )}
                  {availableDifficulties.length > 0 && (
                    <Group label="Difficulty">
                      {availableDifficulties.map((d) => (
                        <CheckRow
                          key={d}
                          label={d}
                          checked={diffs.includes(d)}
                          onChange={() => setDiffs((p) => toggleIn(p, d))}
                        />
                      ))}
                    </Group>
                  )}
                  {availableRoles.length > 0 && (
                    <Group label="Experience">
                      {availableRoles.map((r) => (
                        <CheckRow
                          key={r}
                          label={r}
                          checked={roles.includes(r)}
                          onChange={() => setRoles((p) => toggleIn(p, r))}
                        />
                      ))}
                    </Group>
                  )}
                </aside>
                <div className="min-w-0">
                  {filtered.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
                      No interviews match these filters.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filtered.map((i) => (
                        <div
                          key={i.slug}
                          className="rounded-xl border bg-card p-4 hover:border-primary/40 transition flex flex-col justify-between"
                        >
                          <div>
                            <Link
                              to="/mock-interview/$slug"
                              params={{ slug: i.slug }}
                              className="flex items-start gap-2.5 min-w-0"
                            >
                              <div className="text-xl">{i.icon}</div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className="font-medium text-sm truncate">{i.name}</div>
                                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium bg-primary/10 text-primary border border-primary/20">
                                    {i.interviewMode === "automatic" ? "AI Dynamic" : "Predefined Path"}
                                  </span>
                                  {i.products && i.products.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {i.products.map((p) => (
                                        <span
                                          key={p}
                                          className="rounded px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border"
                                        >
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                  {i.description}
                                </div>
                              </div>
                            </Link>
                            {i.requiredSkills && i.requiredSkills.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1">
                                {i.requiredSkills.slice(0, 3).map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {i.requiredSkills.length > 3 && (
                                  <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    +{i.requiredSkills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              <DiffBadge value={i.difficulty} />
                              <span className="text-muted-foreground">
                                {i.role} · {i.minutes}m
                              </span>
                            </div>
                            <AddBtn
                              on={enrolled.includes(i.slug)}
                              onClick={() => toggle(i.slug)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Meta({ i }: { i: Interview }) {
  return (
    <div className="mt-4 flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5">
        <DiffBadge value={i.difficulty} />
        <span className="rounded-md border px-1.5 py-0.5 text-[10px]">{i.role}</span>
      </div>
      <span className="text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {i.minutes}m · {i.questions} topics
      </span>
    </div>
  );
}

function MineCard({ i }: { i: Interview }) {
  // Mastery progress: 5 completed interviews = 100% mastery
  const progressPct = Math.min(100, Math.round(((i.completed || 0) / 5) * 100));

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 hover:border-primary/50 transition flex flex-col justify-between h-full">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${i.color})` }} />
      <div>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-2xl">{i.icon}</div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <h3 className="font-semibold truncate">{i.name}</h3>
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-medium bg-primary/10 text-primary border border-primary/20">
                {i.interviewMode === "automatic" ? "AI Dynamic" : "Adaptive"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{i.description}</p>
          </div>
          <div className="flex flex-col items-center pl-2">
            <ProgressRing value={progressPct} color={`var(--${i.color})`} />
            <span className="text-[10px] text-muted-foreground mt-1">
              {i.completed ? `${i.completed}/5 done` : "0%"}
            </span>
          </div>
        </div>
        {i.requiredSkills && i.requiredSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {i.requiredSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {skill}
              </span>
            ))}
            {i.requiredSkills.length > 3 && (
              <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{i.requiredSkills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <div>
        <Meta i={i} />
        <Link
          to="/mock-interview/$slug"
          params={{ slug: i.slug }}
          className="mt-4 w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          {i.completed > 0 ? "Retake interview" : "Start interview"}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function AddBtn({ on, onClick, full }: { on: boolean; onClick: () => void; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${full ? "w-full py-1.5 text-xs" : "px-2 py-1"} inline-flex items-center justify-center gap-1 rounded-md font-medium transition ${on ? "border border-success/40 bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"} ${full ? "" : "px-2"}`}
    >
      {on ? (
        <>
          <Check className="h-3 w-3" /> Enrolled
        </>
      ) : (
        <>
          <Plus className="h-3 w-3" /> Enroll
        </>
      )}
    </button>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
      <div className="flex gap-4 pb-2">{children}</div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-primary rounded border-border"
      />
      <span className={checked ? "text-foreground" : ""}>{label}</span>
    </label>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card/70 backdrop-blur px-3 py-2.5">
      <div
        className="absolute -right-4 -top-4 h-10 w-10 rounded-full blur-2xl opacity-30"
        style={{ background: `var(--${accent})` }}
      />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}
