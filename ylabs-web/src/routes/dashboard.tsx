import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge, TierBadge } from "@/components/Badges";
import { labs, me, type Lab } from "@/lib/dummy";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import { loadSprints } from "@/lib/labSprints";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";
import { useAuth } from "@/lib/auth";
import { LabIcon } from "@/components/LabIcon";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import {
  ArrowRight, Sparkles, Flame, Zap, Trophy, Check,
  Plus, Star, Search, Github, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) throw redirect({ to: "/auth", search: { tab: "signin" } });
      const userStr = localStorage.getItem("user");
      if (userStr) {
        let u: any;
        try { u = JSON.parse(userStr); } catch {}
        if (u) {
          const role = u.roles?.ylabs || u.role;
          if (role === "admin") throw redirect({ to: "/admin" });
        }
      }
    }
  },
  component: Hub,
});

interface CatalogLab {
  id: string;            
  name: string;
  icon: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  total: number;
  completed: number;
  isReal: boolean;       
  color: string;
  payment_tier: "free" | "freemium" | "premium";
  payment_amount: number;
  hoursLeft?: number;
}

type Category = "Backend" | "Frontend" | "Database" | "DevOps" | "QA" | "Security";
const CATEGORIES: Category[] = ["Backend", "Frontend", "Database", "DevOps", "QA", "Security"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
const FEATURED_SLUGS = ["javaspring", "systemdesign", "pydjango", "postgres", "datastructures", "qa", "mongo"];

const LAB_CATEGORY: Record<string, Category> = {
  java: "Backend", javaspring: "Backend", python: "Backend", pydjango: "Backend", pyflask: "Backend",
  programming: "Backend", datastructures: "Backend", systemdesign: "Backend",
  ui: "Frontend",
  sql: "Database", postgres: "Database", mongo: "Database",
  git: "DevOps", linux: "DevOps",
  qa: "QA",
  cybersecurity: "Security",
};
const LAB_LANGUAGES: Record<string, string[]> = {
  java: ["Java"], javaspring: ["Java"],
  python: ["Python"], pydjango: ["Python"], pyflask: ["Python"],
  programming: ["Python", "JavaScript"], datastructures: ["Python", "Java", "C++"],
  systemdesign: [],
  ui: ["HTML", "CSS", "JavaScript"],
  sql: ["SQL"], postgres: ["SQL"], mongo: ["JavaScript"],
  git: ["Bash"], linux: ["Bash"],
  qa: ["JavaScript"],
  cybersecurity: ["Python", "Bash"],
};
const ALL_LANGUAGES = Array.from(new Set(Object.values(LAB_LANGUAGES).flat())).sort();

const RECENT_LAB_KEY = "ylabs-recent-lab";

function getRecentLab(): { id: string; name: string } | null {
  try {
    const s = localStorage.getItem(RECENT_LAB_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function resolveIcon(lab: AdminLab) {
  return lab.icon ?? "";
}

function diffLabel(d: string): "Beginner" | "Intermediate" | "Advanced" {
  if (d === "HARD") return "Advanced";
  if (d === "MEDIUM") return "Intermediate";
  return "Beginner";
}

function realLabCompleted(labId: string): number {
  try {
    const saved = localStorage.getItem(`ylabs-ticket-status-${labId}`);
    if (saved) return Object.values(JSON.parse(saved)).filter(v => v === "Completed").length;
  } catch {}
  return 0;
}

function Hub() {
  const { user } = useAuth();

  const [realLabs, setRealLabs] = useState<AdminLab[]>([]);
  const [labTicketCounts, setLabTicketCounts] = useState<Record<string, number>>({});
  const [labsLoading, setLabsLoading] = useState(true);

  useEffect(() => {
    setLabsLoading(true);
    loadLabs()
      .then(fetched => {
        setRealLabs(fetched);
        fetched.forEach(lab => {
          loadSprints(lab.id).then(sprints => {
            const count = sprints.reduce((acc, s) => acc + s.tasks.length, 0);
            setLabTicketCounts(prev => ({ ...prev, [lab.id]: count }));
          });
        });
      })
      .catch(console.error)
      .finally(() => setLabsLoading(false));
  }, []);

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    restApiAuthUtil.get<any[]>("/lab/enrollments/")
      .then(data => {
        setEnrolledIds(new Set(data.map((e: any) => e.lab)));
      })
      .catch(console.error);
  }, []);

  const toggleEnroll = useCallback(async (labId: string) => {
    const isEnrolled = enrolledIds.has(labId);
    setEnrollLoading(prev => ({ ...prev, [labId]: true }));
    try {
      if (isEnrolled) {
        const data = await restApiAuthUtil.get<any[]>("/lab/enrollments/");
        const enrollment = data.find((e: any) => e.lab === labId);
        if (enrollment) {
          await restApiAuthUtil.delete(`/lab/enrollments/${enrollment.id}/`);
        }
        setEnrolledIds(prev => { const s = new Set(prev); s.delete(labId); return s; });
      } else {
        await restApiAuthUtil.post("/lab/enrollments/", { lab: labId });
        setEnrolledIds(prev => new Set([...prev, labId]));
      }
    } catch (err) {
      console.error("Enrollment toggle failed", err);
    } finally {
      setEnrollLoading(prev => ({ ...prev, [labId]: false }));
    }
  }, [enrolledIds]);

  const allCatalogLabs = useMemo((): CatalogLab[] => {
    const realEntries: CatalogLab[] = realLabs.map(lab => ({
      id: lab.id,
      name: lab.title,
      icon: resolveIcon(lab),
      description: lab.description,
      difficulty: diffLabel(lab.difficulty),
      total: labTicketCounts[lab.id] || 0,
      completed: realLabCompleted(lab.id),
      isReal: true,
      color: "prog",
      payment_tier: lab.payment_tier ?? "free",
      payment_amount: Number(lab.payment_amount ?? 0),
      hoursLeft: 0,
    }));

    const realNames = new Set(realLabs.map(l => l.title.toLowerCase()));
    const dummyEntries: CatalogLab[] = labs
      .filter(l => !realNames.has(l.name.toLowerCase()))
      .map(l => ({
        id: l.slug,
        name: l.name,
        icon: l.icon,
        description: l.description,
        difficulty: l.difficulty,
        total: l.total,
        completed: l.completed,
        isReal: false,
        color: l.color,
        payment_tier: "free" as const,
        payment_amount: 0,
        hoursLeft: (l as any).hoursLeft ?? 0,
      }));

    return [...realEntries, ...dummyEntries];
  }, [realLabs, labTicketCounts]);

  const myLabs = useMemo(
    () => allCatalogLabs.filter(l => enrolledIds.has(l.id)),
    [allCatalogLabs, enrolledIds],
  );

  const featuredLabs = useMemo(
    () => FEATURED_SLUGS.map(s => allCatalogLabs.find(l => l.id === s)).filter(Boolean) as CatalogLab[],
    [allCatalogLabs],
  );

  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [diffs, setDiffs] = useState<Array<typeof DIFFICULTIES[number]>>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [tiers, setTiers] = useState<Array<"free" | "freemium" | "premium">>([]);

  const filteredAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allCatalogLabs.filter(l => {
      if (s && !l.name.toLowerCase().includes(s) && !l.description.toLowerCase().includes(s)) return false;
      if (cats.length && !cats.includes(LAB_CATEGORY[l.id] as Category)) return false;
      if (diffs.length && !diffs.includes(l.difficulty)) return false;
      if (langs.length && !(LAB_LANGUAGES[l.id] ?? []).some(x => langs.includes(x))) return false;
      if (tiers.length && !tiers.includes(l.payment_tier)) return false;
      return true;
    });
  }, [allCatalogLabs, q, cats, diffs, langs, tiers]);

  const clearFilters = () => { setCats([]); setDiffs([]); setLangs([]); setTiers([]); setQ(""); };
  const hasFilters = !!(cats.length || diffs.length || langs.length || tiers.length || q);
  const toggleIn = <T,>(arr: T[], v: T) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const recentLab = getRecentLab();

  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  useEffect(() => {
    loadStudentStats().then(setStudentStats).catch(console.error);
  }, []);

  const userAny = user as any;
  const streak = studentStats?.day_streak ?? userAny?.streak ?? me.streak;
  const xp = studentStats?.total_yp ?? userAny?.xp ?? userAny?.yuvro_points ?? me.xp;
  const rank = userAny?.rank ?? me.rank;
  const displayName = user?.first_name || user?.username || me.name.split(" ")[0];

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
                Your <span className="text-primary">Individual Hub</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl hidden sm:block">
                Solve Jira-style tickets in a full in-browser IDE. Get progressive hints, run tests, and ship code that recruiters actually read.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent">
                  <Github className="h-4 w-4" /> Connect GitHub
                </button>
                {recentLab ? (
                  <Link
                    to="/lab/$slug" params={{ slug: recentLab.id }}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Continue {recentLab.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  myLabs.length > 0 ? (
                    <Link
                      to="/lab/$slug" params={{ slug: myLabs[0].id }}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Start {myLabs[0].name} <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      to="/lab/$slug" params={{ slug: "java" }}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Explore Java Lab <ArrowRight className="h-4 w-4" />
                    </Link>
                  )
                )}
              </div>
            </div>

            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:min-w-[380px] md:min-w-[420px]">
              <MiniStat icon={<Flame className="h-3.5 w-3.5 text-warning" />} label="Day streak" value={`${streak}d`} accent="warning" />
              <MiniStat icon={<Zap className="h-3.5 w-3.5 text-primary" />} label="YP" value={xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : `${xp}`} accent="primary" />
              <MiniStat icon={<Trophy className="h-3.5 w-3.5 text-info" />} label="Rank" value={`#${rank}`} accent="info" />
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-10">
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">My labs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {myLabs.length} enrolled · {myLabs.reduce((a, l) => a + l.completed, 0)} tickets solved
                </p>
              </div>
            </div>
            {labsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your labs…
              </div>
            ) : myLabs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">You haven't enrolled in any lab yet. Pick one from the catalog below to get started.</p>
              </div>
            ) : (
              <HScroll>
                {myLabs.map(lab => (
                  <div key={lab.id} className="w-[300px] shrink-0">
                    <EnrolledCard lab={lab} />
                  </div>
                ))}
              </HScroll>
            )}
          </section>
          {featuredLabs.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" /> Featured labs
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Handpicked tracks trending this month.</p>
                </div>
              </div>
              <HScroll>
                {featuredLabs.map(lab => (
                  <div key={lab.id} className="w-[320px] shrink-0">
                    <FeaturedCard
                      lab={lab}
                      isEnrolled={enrolledIds.has(lab.id)}
                      isLoading={!!enrollLoading[lab.id]}
                      onToggle={() => toggleEnroll(lab.id)}
                    />
                  </div>
                ))}
              </HScroll>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">All labs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{filteredAll.length} of {allCatalogLabs.length} labs</p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={q} onChange={e => setQ(e.target.value)} placeholder="Search labs…"
                  className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-transparent w-56 outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="rounded-xl border bg-card/40 p-4 md:sticky md:top-20 self-start space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Filters</span>
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-[10px] text-muted-foreground hover:text-foreground underline">Clear</button>
                  )}
                </div>
                <FilterGroup label="Labs">
                  <CheckRow checked={tiers.includes("free")} onChange={() => setTiers(prev => toggleIn(prev, "free"))} label="Free" />
                  <CheckRow checked={tiers.includes("freemium")} onChange={() => setTiers(prev => toggleIn(prev, "freemium"))} label="Freemium" />
                  <CheckRow checked={tiers.includes("premium")} onChange={() => setTiers(prev => toggleIn(prev, "premium"))} label="Premium" />
                </FilterGroup>
                <FilterGroup label="Category">
                  {CATEGORIES.map(c => (
                    <CheckRow key={c} checked={cats.includes(c)} onChange={() => setCats(prev => toggleIn(prev, c))} label={c} />
                  ))}
                </FilterGroup>
                <FilterGroup label="Difficulty">
                  {DIFFICULTIES.map(d => (
                    <CheckRow key={d} checked={diffs.includes(d)} onChange={() => setDiffs(prev => toggleIn(prev, d))} label={d} />
                  ))}
                </FilterGroup>
                <FilterGroup label="Language">
                  {ALL_LANGUAGES.map(l => (
                    <CheckRow key={l} checked={langs.includes(l)} onChange={() => setLangs(prev => toggleIn(prev, l))} label={l} />
                  ))}
                </FilterGroup>
              </aside>

              <div className="min-w-0">
                {filteredAll.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
                    No labs match these filters.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredAll.map(lab => (
                      <CatalogCard
                        key={lab.id}
                        lab={lab}
                        isEnrolled={enrolledIds.has(lab.id)}
                        isLoading={!!enrollLoading[lab.id]}
                        onToggle={() => toggleEnroll(lab.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
      <div className="flex gap-4 pb-2">{children}</div>
    </div>
  );
}

function MiniStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card/70 backdrop-blur px-3 py-2.5">
      <div className="absolute -right-4 -top-4 h-10 w-10 rounded-full blur-2xl opacity-30" style={{ background: `var(--${accent})` }} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}

function EnrolledCard({ lab }: { lab: CatalogLab }) {
  const pct = lab.total > 0 ? Math.round((lab.completed / lab.total) * 100) : 0;
  return (
    <Link
      to="/lab/$slug"
      params={{ slug: lab.id }}
      onClick={() => {

      }}
      className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:border-primary/50 hover:ring-glow transition block"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${lab.color})` }} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <LabIcon name={lab.name} icon={lab.icon} size="h-8 w-8" />
          <h3 className="mt-2 font-semibold truncate">{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</p>
        </div>
        <ProgressRing value={pct} color={`var(--${lab.color})`} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5"><DiffBadge value={lab.difficulty} /><TierBadge slug={lab.id} name={lab.name} tier={lab.payment_tier} /></div>
        <span className="text-muted-foreground">{lab.completed}/{lab.total} · {lab.hoursLeft}h left</span>
      </div>
      <div className="mt-4">
        <span className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground group-hover:opacity-90 transition">
          {lab.completed > 0 ? "Continue" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function FeaturedCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-accent/20 p-5 hover:border-primary/50 transition">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30" style={{ background: `var(--${lab.color})` }} />
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
        <Star className="h-3 w-3" /> Featured
      </span>
      <div className="mt-3 flex items-start gap-3">
        <LabIcon name={lab.name} icon={lab.icon} size="h-9 w-9" />
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5"><DiffBadge value={lab.difficulty} /><TierBadge slug={lab.id} name={lab.name} tier={lab.payment_tier} /></div>
        <span className="text-muted-foreground">{lab.total} tickets</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link to="/lab/$slug" params={{ slug: lab.id }}
          onClick={() => {

          }}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
          View
        </Link>
        <button onClick={onToggle} disabled={isLoading}
          className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${isEnrolled ? "border border-success/40 bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEnrolled ? (<><Check className="h-3.5 w-3.5" /> Enrolled</>) : (<><Plus className="h-3.5 w-3.5" /> Enroll</>)}
        </button>
      </div>
    </div>
  );
}

function CatalogCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-4 hover:border-primary/40 transition">
      <div className="flex items-start gap-2.5 min-w-0">
        <LabIcon name={lab.name} icon={lab.icon} size="h-7 w-7" />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{lab.name}</div>
          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <DiffBadge value={lab.difficulty} />
          <TierBadge slug={lab.id} name={lab.name} tier={lab.payment_tier} />
          <span className="text-muted-foreground">{lab.total} tickets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to="/lab/$slug" params={{ slug: lab.id }}
            onClick={() => {

            }}
            className="rounded-md border border-border px-2 py-1 hover:bg-accent">View</Link>
          <button onClick={onToggle} disabled={isLoading}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition disabled:opacity-60 ${isEnrolled ? "border border-success/40 bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isEnrolled ? (<><Check className="h-3 w-3" /> Enrolled</>) : (<><Plus className="h-3 w-3" /> Enroll</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground select-none">
      <input type="checkbox" checked={checked} onChange={onChange}
        className="h-3.5 w-3.5 accent-primary rounded border-border" />
      <span className={checked ? "text-foreground" : ""}>{label}</span>
    </label>
  );
}
