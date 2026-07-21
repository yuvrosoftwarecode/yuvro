import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { ArrowRight, Sparkles, Flame, Zap, Trophy, Check, Plus, Star, Search, Github, Lock, Loader2 } from "lucide-react";
import { TIER_META } from "@/lib/labAccess";
import { useAuth } from "@/lib/auth";
import { loadLabs } from "@/lib/adminLabs";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) throw redirect({ to: "/auth", search: { tab: "signin" } });
    }
  },
  component: Hub 
});

// Original Dummy Data mappings
const FEATURED_SLUGS = ["javaspring", "systemdesign", "cybersecurity", "pydjango", "postgres", "datastructures", "qa"];

type Category = "Backend" | "Frontend" | "Database" | "DevOps" | "QA" | "AI" | "Security" | "Design";
const CATEGORIES: Category[] = ["Backend", "Frontend", "Database", "DevOps", "QA", "Security", "Design"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

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

// Extended interface to map backend data to frontend UI expectations
export interface CatalogLab {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  icon: string;
  color: string;
  total: number;
  completed: number;
  payment_tier?: string;
  hoursLeft?: number;
}

// Fallback logic for labs missing categories
const getLabCategory = (id: string, name: string): Category => {
  const match = Object.keys(LAB_CATEGORY).find(k => id.toLowerCase().includes(k) || name.toLowerCase().includes(k));
  if (match) return LAB_CATEGORY[match];
  if (name.toLowerCase().includes("data") || name.toLowerCase().includes("sql")) return "Database";
  if (name.toLowerCase().includes("react") || name.toLowerCase().includes("ui")) return "Frontend";
  return "Backend";
};

const getLabLanguages = (id: string, name: string): string[] => {
  const match = Object.keys(LAB_LANGUAGES).find(k => id.toLowerCase().includes(k) || name.toLowerCase().includes(k));
  return match ? LAB_LANGUAGES[match] : [];
};

function TierBadge({ tier }: { tier?: string }) {
  const t = (tier || "free") as "free" | "freemium" | "premium";
  const m = TIER_META[t] || TIER_META.free;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
      style={{ color: `var(--${m.tone})`, borderColor: `color-mix(in oklab, var(--${m.tone}) 40%, transparent)`, background: `color-mix(in oklab, var(--${m.tone}) 12%, transparent)` }}>
      {t === "premium" ? <Lock className="h-3 w-3" /> : t === "freemium" ? <Star className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      {m.short}
    </span>
  );
}

function Hub() {
  const { user } = useAuth();
  const displayName = user?.name?.split(" ")[0] || "Student";
  
  const [labsLoading, setLabsLoading] = useState(true);
  const [allCatalogLabs, setAllCatalogLabs] = useState<CatalogLab[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState<Record<string, boolean>>({});

  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);

  const [enrollModalLabId, setEnrollModalLabId] = useState<string | null>(null);
  const [enrollModalRepoName, setEnrollModalRepoName] = useState("");

  const toggleEnroll = async (labId: string, repoName?: string) => {
    const isEnrolled = enrolledIds.has(labId);
    setEnrollLoading((prev) => ({ ...prev, [labId]: true }));
    try {
      if (isEnrolled) {
        const data = await restApiAuthUtil.get<any[]>("/lab/enrollments/");
        const enrollment = data.find((e: any) => e.lab === labId);
        if (enrollment) {
          await restApiAuthUtil.delete(`/lab/enrollments/${enrollment.id}/`);
        }
        setEnrolledIds((prev) => {
          const s = new Set(prev);
          s.delete(labId);
          return s;
        });
      } else {
        if (!repoName) {
           const defaultName = `yuvro_lab_${labId.substring(0, 5)}`;
           setEnrollModalRepoName(defaultName);
           setEnrollModalLabId(labId);
           setEnrollLoading((prev) => ({ ...prev, [labId]: false }));
           return;
        }
        await restApiAuthUtil.post("/lab/enrollments/", { lab: labId, github_repo_name: repoName });
        setEnrolledIds((prev) => new Set([...prev, labId]));
        setEnrollModalLabId(null);
      }
    } catch (err) {
      console.error("Enrollment toggle failed", err);
    } finally {
      setEnrollLoading((prev) => ({ ...prev, [labId]: false }));
    }
  };

  // GitHub state
  const [ghState, setGhState] = useState<{ connected: boolean; username?: string }>({ connected: false });
  const [modalOpen, setModalOpen] = useState(false);

  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [diffs, setDiffs] = useState<Array<typeof DIFFICULTIES[number]>>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);

  useEffect(() => {
    loadStudentStats().then(setStudentStats).catch(console.error);

    restApiAuthUtil.get("/lab/github-integration/").then((res) => {
      if (res.data) setGhState({ connected: res.data.is_connected, username: res.data.github_username });
    }).catch(() => setGhState({ connected: false }));

    loadLabs().then(data => {
      restApiAuthUtil.get("/lab/enrollments/").then(enrollRes => {
        const enrSet = new Set<string>();
        enrollRes.data?.forEach((e: any) => enrSet.add(String(e.lab)));
        setEnrolledIds(enrSet);
        
        // Fetch ticket counts
        restApiAuthUtil.get("/lab/tickets/my-stats/").then(statsRes => {
          const statsMap = statsRes.data || {};
          const mapped: CatalogLab[] = data.map(dbLab => {
            const sid = String(dbLab.id);
            const labStats = statsMap[sid] || { total_tickets: 10, resolved_tickets: 0 };
            
            // Map backend data to frontend visuals
            let color = "ui";
            if (dbLab.name.toLowerCase().includes("java")) color = "java";
            if (dbLab.name.toLowerCase().includes("python")) color = "python";
            if (dbLab.name.toLowerCase().includes("sql") || dbLab.name.toLowerCase().includes("postgres")) color = "sql";
            if (dbLab.name.toLowerCase().includes("mongo")) color = "mongo";
            
            let icon = "💻";
            if (dbLab.name.toLowerCase().includes("java")) icon = "☕";
            if (dbLab.name.toLowerCase().includes("python")) icon = "🐍";
            if (dbLab.name.toLowerCase().includes("sql") || dbLab.name.toLowerCase().includes("postgres")) icon = "🐘";
            if (dbLab.name.toLowerCase().includes("mongo")) icon = "🍃";
            if (dbLab.name.toLowerCase().includes("cloud")) icon = "☁️";

            return {
              id: sid,
              name: dbLab.name,
              description: dbLab.description || "Learn and master concepts hands-on.",
              difficulty: dbLab.difficulty as "Beginner" | "Intermediate" | "Advanced" || "Intermediate",
              icon,
              color,
              total: labStats.total_tickets,
              completed: labStats.resolved_tickets,
              payment_tier: dbLab.payment_tier || "free",
              hoursLeft: 24, // Static for UI mock
            };
          });
          setAllCatalogLabs(mapped);
          setLabsLoading(false);
        }).catch(console.error);
      }).catch(console.error);
    }).catch(console.error);
  }, []);

  const enrolledLabs = useMemo(() => allCatalogLabs.filter(l => enrolledIds.has(l.id)), [allCatalogLabs, enrolledIds]);
  const featuredLabs = useMemo(() => allCatalogLabs.slice(0, Math.min(6, allCatalogLabs.length)), [allCatalogLabs]);
  
  const filteredAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allCatalogLabs.filter(l => {
      if (s && !l.name.toLowerCase().includes(s) && !l.description.toLowerCase().includes(s)) return false;
      if (cats.length && !cats.includes(getLabCategory(l.id, l.name))) return false;
      if (diffs.length && !diffs.includes(l.difficulty)) return false;
      if (langs.length && !(getLabLanguages(l.id, l.name) ?? []).some(x => langs.includes(x))) return false;
      if (tiers.length && !tiers.includes(l.payment_tier || "free")) return false;
      return true;
    });
  }, [q, cats, diffs, langs, tiers, allCatalogLabs]);

  const toggle = (id: string) => {
    setEnrollLoading(prev => ({ ...prev, [id]: true }));
    const isEnrolled = enrolledIds.has(id);
    
    if (isEnrolled) {
      // For safety, don't actually unenroll in the real app, but let's mimic UI
      setEnrolledIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEnrollLoading(prev => ({ ...prev, [id]: false }));
    } else {
      restApiAuthUtil.post("/lab/enrollments/", { lab_id: parseInt(id) })
        .then(() => {
          setEnrolledIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        })
        .catch(console.error)
        .finally(() => setEnrollLoading(prev => ({ ...prev, [id]: false })));
    }
  };

  const clearFilters = () => { setCats([]); setDiffs([]); setLangs([]); setTiers([]); setQ(""); };
  const hasFilters = !!(cats.length || diffs.length || langs.length || tiers.length || q);
  const toggleIn = <T,>(arr: T[], v: T) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const recentLab = enrolledLabs.length > 0 ? enrolledLabs[0] : null;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Header row: title left, quick stats right — right-aligned from sm+ */}
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
                Continue enrolled labs, explore featured tracks and dive into any lab in the catalog.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent">
                  <Github className="h-4 w-4" /> {ghState.connected ? "GitHub Connected" : "Connect GitHub"}
                </button>
                {recentLab ? (
                  <Link to="/student/lab/$slug" params={{ slug: recentLab.id }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90">
                    Continue {recentLab.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : allCatalogLabs.length > 0 ? (
                  <Link to="/student/lab/$slug" params={{ slug: allCatalogLabs[0].id }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90">
                    Start {allCatalogLabs[0].name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:min-w-[380px] md:min-w-[420px]">
              <MiniStat icon={<Flame className="h-3.5 w-3.5 text-warning" />} label="Day streak" value={`${studentStats?.day_streak ?? 0}d`} accent="warning" />
              <MiniStat icon={<Zap className="h-3.5 w-3.5 text-primary" />} label="YP" value={`${studentStats?.total_yp ?? 0}`} accent="primary" />
              <MiniStat icon={<Trophy className="h-3.5 w-3.5 text-info" />} label="Rank" value={`#${studentStats?.rank ?? 0}`} accent="info" />
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-10">
          {/* My labs — horizontal scroll */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">My labs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{enrolledLabs.length} enrolled · {enrolledLabs.reduce((a, l) => a + l.completed, 0)} tickets solved</p>
              </div>
            </div>
            {labsLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your labs...
              </div>
            ) : enrolledLabs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">You haven't enrolled in any lab yet. Pick one from the catalog below to get started.</p>
              </div>
            ) : (
              <HScroll>
                {enrolledLabs.map(lab => (
                  <div key={lab.id} className="w-[300px] shrink-0">
                    <EnrolledCard lab={lab} />
                  </div>
                ))}
              </HScroll>
            )}
          </section>

          {/* Featured labs — horizontal scroll */}
          {featuredLabs.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Featured labs</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Handpicked tracks trending this month.</p>
                </div>
              </div>
              <HScroll>
                {featuredLabs.map(lab => (
                  <div key={lab.id} className="w-[320px] shrink-0">
                    <FeaturedCard lab={lab} isEnrolled={enrolledIds.has(lab.id)} isLoading={!!enrollLoading[lab.id]} onToggle={() => toggle(lab.id)} />
                  </div>
                ))}
              </HScroll>
            </section>
          )}

          {/* All labs catalog with sidebar filters */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">All labs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{filteredAll.length} of {allCatalogLabs.length} labs</p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search labs…"
                  className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-transparent w-56 outline-none focus:border-primary" />
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
                <FilterGroup label="Access Plan">
                  <CheckRow checked={tiers.includes("free")} onChange={() => setTiers(prev => toggleIn(prev, "free"))} label="Free" />
                  <CheckRow checked={tiers.includes("freemium")} onChange={() => setTiers(prev => toggleIn(prev, "freemium"))} label="Freemium" />
                  <CheckRow checked={tiers.includes("premium")} onChange={() => setTiers(prev => toggleIn(prev, "premium"))} label="Premium" />
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
                      <CatalogCard key={lab.id} lab={lab} isEnrolled={enrolledIds.has(lab.id)} isLoading={!!enrollLoading[lab.id]} onToggle={() => toggle(lab.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>


        </div>
      </main>
      {enrollModalLabId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Initialize Lab Workspace</h2>
            <p className="text-sm text-muted-foreground mb-4">
              We will create a GitHub repository for you with the lab's starter code. You can customize the repository name below.
            </p>
            <input
              type="text"
              value={enrollModalRepoName}
              onChange={(e) => setEnrollModalRepoName(e.target.value)}
              className="input mb-4 w-full p-2 border rounded-md"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEnrollModalLabId(null)}
                className="px-4 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors"
                disabled={enrollLoading[enrollModalLabId]}
              >
                Cancel
              </button>
              <button
                onClick={() => toggleEnroll(enrollModalLabId, enrollModalRepoName)}
                disabled={!enrollModalRepoName.trim() || enrollLoading[enrollModalLabId]}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {enrollLoading[enrollModalLabId] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Lab"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Integration Modal (Rendered outside normal flow) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg relative">
            <h3 className="text-lg font-semibold">GitHub Integration</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {ghState.connected ? `Connected as @${ghState.username}. You can push code to GitHub.` : "Connect your GitHub account to sync your lab workspaces."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent">Close</button>
            </div>
          </div>
        </div>
      )}

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

function FeaturedCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-accent/20 p-5 hover:border-primary/50 transition">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30" style={{ background: `var(--${lab.color})` }} />
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
        <Star className="h-3 w-3" /> Featured
      </span>
      <div className="mt-3 flex items-start gap-3">
        <div className="text-3xl">{lab.icon}</div>
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5"><DiffBadge value={lab.difficulty} /><TierBadge tier={lab.payment_tier} /></div>
        <span className="text-muted-foreground">{lab.total} tickets</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link to="/student/lab/$slug" params={{ slug: lab.id }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
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

function EnrolledCard({ lab }: { lab: CatalogLab }) {
  const pct = lab.total > 0 ? Math.round((lab.completed / lab.total) * 100) : 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:border-primary/50 hover:ring-glow transition">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${lab.color})` }} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-2xl">{lab.icon}</div>
          <h3 className="mt-2 font-semibold truncate">{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</p>
        </div>
        <ProgressRing value={pct} color={`var(--${lab.color})`} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5"><DiffBadge value={lab.difficulty} /><TierBadge tier={lab.payment_tier} /></div>
        <span className="text-muted-foreground">{lab.completed}/{lab.total} · {lab.hoursLeft}h left</span>
      </div>
      <div className="mt-4">
        <Link to="/lab/$slug" params={{ slug: lab.id }}
          className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
          {lab.completed > 0 ? "Continue" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function CatalogCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-4 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="text-xl">{lab.icon}</div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{lab.name}</div>
            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <DiffBadge value={lab.difficulty} />
          <TierBadge tier={lab.payment_tier} />
          <span className="text-muted-foreground">{lab.total} tickets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to="/student/lab/$slug" params={{ slug: lab.id }} className="rounded-md border border-border px-2 py-1 hover:bg-accent">View</Link>
          <button onClick={onToggle} disabled={isLoading}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition disabled:opacity-60 ${isEnrolled ? "border border-success/40 bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isEnrolled ? (<><Check className="h-3 w-3" /> Enrolled</>) : (<><Plus className="h-3 w-3" /> Enroll</>)}
          </button>
        </div>
      </div>
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
