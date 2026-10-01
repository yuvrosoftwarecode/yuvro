import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { ArrowRight, Sparkles, Flame, Zap, Trophy, Check, Plus, Star, Search, Github, Lock, Loader2, Network, Briefcase, Boxes } from "lucide-react";
import { TIER_META } from "@/lib/labAccess";
import { getLabIconUrl } from "@/lib/labIcons";
import { useAuth } from "@/lib/auth";
import { loadLabs } from "@/lib/adminLabs";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";
import { labs as dummyLabs } from "@/lib/dummy";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export const Route = createFileRoute("/student/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) throw redirect({ to: "/auth", search: { tab: "signin" } });
    }
  },
  component: Hub,
});

const FEATURED_SLUGS = ["javaspring", "systemdesign", "cybersecurity", "pydjango", "postgres", "datastructures", "qa"];

type Category = "Backend" | "Frontend" | "Database" | "DevOps" | "QA" | "AI" | "Security" | "Design";
const CATEGORIES: Category[] = ["Backend", "Frontend", "Database", "DevOps", "QA", "Security", "Design"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

const LAB_CATEGORY: Record<string, Category> = {
  java: "Backend",
  javaspring: "Backend",
  python: "Backend",
  pydjango: "Backend",
  pyflask: "Backend",
  programming: "Backend",
  datastructures: "Backend",
  systemdesign: "Backend",
  ui: "Frontend",
  sql: "Database",
  postgres: "Database",
  mongo: "Database",
  git: "DevOps",
  linux: "DevOps",
  qa: "QA",
  cybersecurity: "Security",
};

const LAB_LANGUAGES: Record<string, string[]> = {
  java: ["Java"],
  javaspring: ["Java"],
  python: ["Python"],
  pydjango: ["Python"],
  pyflask: ["Python"],
  programming: ["Python", "JavaScript"],
  datastructures: ["Python", "Java", "C++"],
  systemdesign: [],
  ui: ["HTML", "CSS", "JavaScript"],
  sql: ["SQL"],
  postgres: ["SQL"],
  mongo: ["JavaScript"],
  git: ["Bash"],
  linux: ["Bash"],
  qa: ["JavaScript"],
  cybersecurity: ["Python", "Bash"],
};

const ALL_LANGUAGES = Array.from(new Set(Object.values(LAB_LANGUAGES).flat())).sort();

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

const getLabCategory = (id: string, name: string): Category => {
  const match = Object.keys(LAB_CATEGORY).find(
    (k) => id.toLowerCase().includes(k) || name.toLowerCase().includes(k),
  );
  if (match) return LAB_CATEGORY[match];
  if (name.toLowerCase().includes("data") || name.toLowerCase().includes("sql")) return "Database";
  if (name.toLowerCase().includes("react") || name.toLowerCase().includes("ui")) return "Frontend";
  return "Backend";
};

const getLabLanguages = (id: string, name: string): string[] => {
  const match = Object.keys(LAB_LANGUAGES).find(
    (k) => id.toLowerCase().includes(k) || name.toLowerCase().includes(k),
  );
  return match ? LAB_LANGUAGES[match] : [];
};

function TierBadge({ tier }: { tier?: string }) {
  const t = (tier || "free") as "free" | "freemium" | "premium";
  const m = TIER_META[t] || TIER_META.free;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        color: `var(--${m.tone})`,
        borderColor: `color-mix(in oklab, var(--${m.tone}) 40%, transparent)`,
        background: `color-mix(in oklab, var(--${m.tone}) 12%, transparent)`,
      }}
    >
      {t === "premium" ? (
        <Lock className="h-3 w-3" />
      ) : t === "freemium" ? (
        <Star className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}
      {m.short}
    </span>
  );
}

function Hub() {
  const { user } = useAuth();
  const displayName = user?.first_name || user?.username || user?.name?.split(" ")[0] || "Student";

  const [labsLoading, setLabsLoading] = useState(true);
  const [allCatalogLabs, setAllCatalogLabs] = useState<CatalogLab[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState<Record<string, boolean>>({});

  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);

  const [ghState, setGhState] = useState<{ connected: boolean; username?: string }>({ connected: false });
  const [modalOpen, setModalOpen] = useState(false);

  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [diffs, setDiffs] = useState<Array<(typeof DIFFICULTIES)[number]>>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);

  useEffect(() => {
    loadStudentStats().then(setStudentStats).catch(console.error);

    restApiAuthUtil.get("/lab/github-integration/").then((res: any) => {
      if (res) setGhState({ connected: res.is_connected, username: res.github_username });
    }).catch(() => setGhState({ connected: false }));

    loadLabs().then(async data => {
      let enrSet = new Set<string>();
      let statsMap: Record<string, any> = {};
      try {
        const statsRes: any = await restApiAuthUtil.get("/lab/tickets/my-stats/");
        statsMap = statsRes || {};
      } catch (e) {}

      try {
        const enrollRes: any = await restApiAuthUtil.get("/lab/enrollments/");
        const enrollmentsList = Array.isArray(enrollRes) ? enrollRes : (enrollRes.results || []);
        enrollmentsList.forEach((e: any) => enrSet.add(String(e.lab)));
      } catch (e) {
        console.warn("Failed to fetch enrollments from API, falling back to mock");
      }
        // Always merge mock enrollments per user so UI interactions persist across refresh
        try {
          const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";
          const isFirst = user?.id ? localStorage.getItem(`is_first_login_${user.id}`) === "true" : false;
          if (!isFirst) {
            const saved = localStorage.getItem(userMockKey);
            if (saved) {
              JSON.parse(saved).forEach((id: string) => enrSet.add(id));
            }
          }
        } catch {}
        setEnrolledIds(enrSet);

        const { loadSprints } = await import("@/lib/labSprints");

        const mapped = await Promise.all(
          data.map(async (dbLab: any) => {
            const sid = String(dbLab.id);
            let total_tickets = dbLab.total_tickets || 10;
            let resolved_tickets = dbLab.resolved_tickets || 0;
            
            try {
              const sprints = await loadSprints(sid);
              total_tickets = sprints.reduce((acc, s) => acc + s.tasks.length, 0);
            } catch {}
            
            try {
               const saved = localStorage.getItem(`ylabs-ticket-status-${sid}`);
               if (saved) {
                 resolved_tickets = Object.values(JSON.parse(saved)).filter(v => v === "Completed").length;
               }
            } catch {}
            
            if (statsMap[sid]) {
               total_tickets = statsMap[sid].total_tickets || total_tickets;
               resolved_tickets = statsMap[sid].resolved_tickets || resolved_tickets;
            }
        
        let color = "ui";
        if (dbLab.title?.toLowerCase().includes("java") || dbLab.name?.toLowerCase().includes("java")) color = "java";
        if (dbLab.title?.toLowerCase().includes("python") || dbLab.name?.toLowerCase().includes("python")) color = "python";
        if (dbLab.title?.toLowerCase().includes("sql") || dbLab.title?.toLowerCase().includes("postgres") || dbLab.name?.toLowerCase().includes("sql") || dbLab.name?.toLowerCase().includes("postgres")) color = "sql";
        if (dbLab.title?.toLowerCase().includes("mongo") || dbLab.name?.toLowerCase().includes("mongo")) color = "mongo";
        
        let iconStr = dbLab.icon?.toLowerCase() || "";
        let icon = (dbLab.icon && iconStr !== "linux" && iconStr !== "linux lab") ? dbLab.icon : "💻";
        if (dbLab.title?.toLowerCase().includes("linux") || dbLab.name?.toLowerCase().includes("linux")) icon = "🐧";
        if (dbLab.title?.toLowerCase().includes("java") || dbLab.name?.toLowerCase().includes("java")) icon = "☕";
        if (dbLab.title?.toLowerCase().includes("python") || dbLab.name?.toLowerCase().includes("python")) icon = "🐍";
        if (dbLab.title?.toLowerCase().includes("sql") || dbLab.title?.toLowerCase().includes("postgres") || dbLab.name?.toLowerCase().includes("sql") || dbLab.name?.toLowerCase().includes("postgres")) icon = "🐘";
        if (dbLab.title?.toLowerCase().includes("mongo") || dbLab.name?.toLowerCase().includes("mongo")) icon = "🍃";
        if (dbLab.title?.toLowerCase().includes("cloud") || dbLab.name?.toLowerCase().includes("cloud")) icon = "☁️";

        let mappedDifficulty: "Beginner" | "Intermediate" | "Advanced" = "Intermediate";
        if (dbLab.difficulty === "EASY") mappedDifficulty = "Beginner";
        else if (dbLab.difficulty === "MEDIUM") mappedDifficulty = "Intermediate";
        else if (dbLab.difficulty === "HARD") mappedDifficulty = "Advanced";

        return {
          id: sid,
          name: dbLab.title || dbLab.name,
          description: dbLab.description || "Learn and master concepts hands-on.",
          difficulty: mappedDifficulty,
          icon,
          color,
          total: total_tickets,
          completed: resolved_tickets,
          payment_tier: dbLab.payment_tier || "free",
          hoursLeft: 24, // Static for UI mock
        };
      }));

      // Integrate only the 2 requested dummy labs (AI/ML Lab & System Design Lab) with real labs
      const realNames = new Set(mapped.map((l) => l.name.toLowerCase()));
      const requestedDummyLabs: CatalogLab[] = [
        {
          id: "aiml",
          name: "AI/ML Lab",
          description: "Artificial Intelligence & Machine Learning: neural networks, LLMs, prompt engineering and model fine-tuning.",
          difficulty: "Advanced",
          icon: "🤖",
          color: "python",
          total: 24,
          completed: 0,
          payment_tier: "free",
          hoursLeft: 36,
        },
        {
          id: "systemdesign",
          name: "System Design Lab",
          description: "Design scalable systems: load balancing, caching, sharding, queues and event-driven architectures.",
          difficulty: "Advanced",
          icon: "🏛️",
          color: "sysd",
          total: 16,
          completed: 0,
          payment_tier: "free",
          hoursLeft: 32,
        },
      ];

      const mappedDummy: CatalogLab[] = requestedDummyLabs.filter(
        (dl) => !realNames.has(dl.name.toLowerCase())
      );

      const hasDsaScenario = [...mapped, ...mappedDummy].some(
        (l) =>
          (l.name.toLowerCase().includes("dsa") || l.name.toLowerCase().includes("data structure")) &&
          l.name.toLowerCase().includes("scenario")
      );
      if (!hasDsaScenario) {
        mappedDummy.push({
          id: "dsa_scenario_lab",
          name: "Data Structures Lab Scenario",
          description: "Real-world problem solving scenarios using advanced data structures.",
          difficulty: "Advanced",
          icon: "🧩",
          color: "ds",
          total: 20,
          completed: 0,
          payment_tier: "free",
          hoursLeft: 24,
        });
      }

      // Combine real labs and the 2 added dummy labs (15 labs total)
      setAllCatalogLabs([...mapped, ...mappedDummy]);
      setLabsLoading(false);
    }).catch(console.error);
  }, []);

  const enrolledLabs = useMemo(
    () => allCatalogLabs.filter((l) => enrolledIds.has(l.id)),
    [allCatalogLabs, enrolledIds],
  );
  const featuredLabs = useMemo(() => {
    const isExcluded = (name: string) => {
      const n = (name || "").toLowerCase();
      return n.includes("mongo") || n.includes("mysql") || n.includes("taskflow");
    };

    const filtered = allCatalogLabs.filter((l) => !isExcluded(l.name));

    let dsaLab = filtered.find(
      (l) =>
        (l.name.toLowerCase().includes("dsa") || l.name.toLowerCase().includes("data structure")) &&
        !l.name.toLowerCase().includes("scenario")
    );
    if (!dsaLab) {
      dsaLab = {
        id: "dsa_lab",
        name: "Data Structures Lab",
        description: "Core data structures: arrays, linked lists, trees, graphs, heaps and hashing.",
        difficulty: "Intermediate",
        icon: "🧩",
        color: "ds",
        total: 30,
        completed: 0,
        payment_tier: "free",
        hoursLeft: 24,
      };
    }

    let dsaScenarioLab = filtered.find(
      (l) =>
        (l.name.toLowerCase().includes("dsa") || l.name.toLowerCase().includes("data structure")) &&
        l.name.toLowerCase().includes("scenario")
    );
    if (!dsaScenarioLab) {
      dsaScenarioLab = {
        id: "dsa_scenario_lab",
        name: "Data Structures Lab Scenario",
        description: "Real-world problem solving scenarios using advanced data structures.",
        difficulty: "Advanced",
        icon: "🧩",
        color: "ds",
        total: 20,
        completed: 0,
        payment_tier: "free",
        hoursLeft: 24,
      };
    }

    const featuredList: CatalogLab[] = [];
    const addedIds = new Set<string>();

    [dsaLab, dsaScenarioLab].forEach((item) => {
      if (item && !addedIds.has(item.id)) {
        featuredList.push(item);
        addedIds.add(item.id);
      }
    });

    filtered.forEach((lab) => {
      if (!addedIds.has(lab.id) && featuredList.length < 6) {
        featuredList.push(lab);
        addedIds.add(lab.id);
      }
    });

    return featuredList.slice(0, 6);
  }, [allCatalogLabs]);

  const filteredAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allCatalogLabs.filter((l) => {
      if (s && !l.name.toLowerCase().includes(s) && !l.description.toLowerCase().includes(s))
        return false;
      if (cats.length && !cats.includes(getLabCategory(l.id, l.name))) return false;
      if (diffs.length && !diffs.includes(l.difficulty)) return false;
      if (langs.length && !(getLabLanguages(l.id, l.name) ?? []).some((x) => langs.includes(x)))
        return false;
      if (tiers.length && !tiers.includes(l.payment_tier || "free")) return false;
      return true;
    });
  }, [q, cats, diffs, langs, tiers, allCatalogLabs]);

  const toggle = (id: string) => {
    setEnrollLoading((prev) => ({ ...prev, [id]: true }));
    const isEnrolled = enrolledIds.has(id);
    const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";

    if (isEnrolled) {
      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        try {
          localStorage.setItem(userMockKey, JSON.stringify([...next]));
        } catch {}
        return next;
      });
      setEnrollLoading((prev) => ({ ...prev, [id]: false }));
    } else {
      restApiAuthUtil
        .post("/lab/enrollments/", { lab_id: parseInt(id) })
        .then(() => {
          setEnrolledIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        })
        .catch((err) => {
          console.error("Enrollment API failed, using mock enrollments", err);
          setEnrolledIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            try {
              localStorage.setItem(userMockKey, JSON.stringify([...next]));
            } catch {}
            return next;
          });
        })
        .finally(() => setEnrollLoading((prev) => ({ ...prev, [id]: false })));
    }
  };

  const clearFilters = () => {
    setCats([]);
    setDiffs([]);
    setLangs([]);
    setTiers([]);
    setQ("");
  };
  const hasFilters = !!(cats.length || diffs.length || langs.length || tiers.length || q);
  const toggleIn = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const recentLab = useMemo(() => {
    try {
      const stored = localStorage.getItem("ylabs-recent-lab");
      if (stored) {
        const parsed = JSON.parse(stored);
        const match = allCatalogLabs.find((l) => l.id === parsed.id);
        if (match) return match;
      }
    } catch {}
    return enrolledLabs.length > 0 ? enrolledLabs[0] : null;
  }, [allCatalogLabs, enrolledLabs]);

  const isFirstLogin = useMemo(() => {
    if (typeof window === "undefined" || !user?.id) return false;
    return localStorage.getItem(`is_first_login_${user.id}`) === "true";
  }, [user?.id]);

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
                <Sparkles className="h-3 w-3" /> {isFirstLogin ? `Welcome, ${displayName}` : `Welcome back, ${displayName}`}
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight truncate">
                Your <span className="text-primary">Individual Hub</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl hidden sm:block">
                Continue enrolled labs, explore featured tracks and dive into any lab in the
                catalog.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent"
                >
                  <Github className="h-4 w-4" />{" "}
                  {ghState.connected ? "GitHub Connected" : "Connect GitHub"}
                </button>
                {recentLab ? (
                  <Link
                    to="/student/lab/$slug"
                    params={{ slug: recentLab.id }}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Continue {recentLab.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : allCatalogLabs.length > 0 ? (
                  <Link
                    to="/student/lab/$slug"
                    params={{ slug: allCatalogLabs[0].id }}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Start {allCatalogLabs[0].name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:min-w-[380px] md:min-w-[420px]">
              <MiniStat
                icon={<Flame className="h-3.5 w-3.5 text-warning" />}
                label="Day streak"
                value={`${studentStats?.day_streak ?? 0}d`}
                accent="warning"
              />
              <MiniStat
                icon={<Zap className="h-3.5 w-3.5 text-primary" />}
                label="YP"
                value={`${studentStats?.total_yp ?? 0}`}
                accent="primary"
              />
              <MiniStat
                icon={<Trophy className="h-3.5 w-3.5 text-info" />}
                label="Rank"
                value={`#${studentStats?.rank ?? 0}`}
                accent="info"
              />
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-10">
          {/* My labs — horizontal scroll */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">My labs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enrolledLabs.length} enrolled ·{" "}
                  {enrolledLabs.reduce((a, l) => a + l.completed, 0)} tickets solved
                </p>
              </div>
            </div>
            {labsLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your labs...
              </div>
            ) : enrolledLabs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven't enrolled in any lab yet. Pick one from the catalog below to get
                  started.
                </p>
              </div>
            ) : (
              <HScroll>
                {enrolledLabs.map((lab) => (
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
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" /> Featured labs
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Handpicked tracks trending this month.
                  </p>
                </div>
              </div>
              <HScroll>
                {featuredLabs.map((lab) => (
                  <div key={lab.id} className="w-[320px] shrink-0">
                    <FeaturedCard
                      lab={lab}
                      isEnrolled={enrolledIds.has(lab.id)}
                      isLoading={!!enrollLoading[lab.id]}
                      onToggle={() => toggle(lab.id)}
                    />
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filteredAll.length} of {allCatalogLabs.length} labs
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search labs…"
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
                      onClick={clearFilters}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <FilterGroup label="Category">
                  {CATEGORIES.map((c) => (
                    <CheckRow
                      key={c}
                      checked={cats.includes(c)}
                      onChange={() => setCats((prev) => toggleIn(prev, c))}
                      label={c}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Difficulty">
                  {DIFFICULTIES.map((d) => (
                    <CheckRow
                      key={d}
                      checked={diffs.includes(d)}
                      onChange={() => setDiffs((prev) => toggleIn(prev, d))}
                      label={d}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Language">
                  {ALL_LANGUAGES.map((l) => (
                    <CheckRow
                      key={l}
                      checked={langs.includes(l)}
                      onChange={() => setLangs((prev) => toggleIn(prev, l))}
                      label={l}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Access Plan">
                  <CheckRow
                    checked={tiers.includes("free")}
                    onChange={() => setTiers((prev) => toggleIn(prev, "free"))}
                    label="Free"
                  />
                  <CheckRow
                    checked={tiers.includes("freemium")}
                    onChange={() => setTiers((prev) => toggleIn(prev, "freemium"))}
                    label="Freemium"
                  />
                  <CheckRow
                    checked={tiers.includes("premium")}
                    onChange={() => setTiers((prev) => toggleIn(prev, "premium"))}
                    label="Premium"
                  />
                </FilterGroup>
              </aside>

              <div className="min-w-0">
                {filteredAll.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
                    No labs match these filters.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredAll.map((lab) => (
                      <CatalogCard
                        key={lab.id}
                        lab={lab}
                        isEnrolled={enrolledIds.has(lab.id)}
                        isLoading={!!enrollLoading[lab.id]}
                        onToggle={() => toggle(lab.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* GitHub Integration Modal (Rendered outside normal flow) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg relative">
            <h3 className="text-lg font-semibold">GitHub Integration</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {ghState.connected
                ? `Connected as @${ghState.username}. You can push code to GitHub.`
                : "Connect your GitHub account to sync your lab workspaces."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Close
              </button>
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

function LabIcon({ lab, sizeClass = "h-8 w-8" }: { lab: CatalogLab, sizeClass?: string }) {
  const devIconUrl = getLabIconUrl(lab.name);
  if (devIconUrl) {
    return <img src={devIconUrl} alt={lab.name} className={`${sizeClass} object-contain`} />;
  }
  if (lab.name.toLowerCase().includes("data structure") && lab.name.toLowerCase().includes("scenario")) {
    return <Boxes className={`${sizeClass} text-primary`} />;
  }
  if (lab.name.toLowerCase().includes("data structure")) {
    return <Network className={`${sizeClass} text-primary`} />;
  }
  if (lab.name === "Portfolio Lab" || lab.name.toLowerCase().includes("portfolio")) {
    return <Briefcase className={`${sizeClass} text-warning`} />;
  }
  return <span className="text-inherit">{lab.icon}</span>;
}

const isDsaLab = (name: string) => {
  const n = (name || "").toLowerCase().trim();
  return n.includes("dsa") || n.includes("data structure");
};

function FeaturedCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  const isDsa = isDsaLab(lab.name);
  return (
    <div className="group relative flex flex-col h-full overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-accent/20 p-5 hover:border-primary/50 transition">
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30"
        style={{ background: `var(--${lab.color})` }}
      />
      <div className="flex items-center justify-between w-full">
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
          <Star className="h-3 w-3" /> Featured
        </span>
        {!isDsa && (
          <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
            Upcoming
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start gap-3 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center text-3xl">
          <LabIcon lab={lab} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <DiffBadge value={lab.difficulty} />
          <TierBadge tier={lab.payment_tier} />
        </div>
        <span className="text-muted-foreground">{lab.total} tickets</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          to="/student/lab/$slug"
          params={{ slug: lab.id }}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          View
        </Link>
        <button
          onClick={onToggle}
          disabled={isLoading || !isDsa}
          title={!isDsa ? "Enrollment disabled for upcoming lab" : undefined}
          className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            isEnrolled
              ? "border border-success/40 bg-success/10 text-success"
              : !isDsa
              ? "border border-border bg-muted/60 text-muted-foreground cursor-not-allowed opacity-60"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isEnrolled ? (
            <>
              <Check className="h-3.5 w-3.5" /> Enrolled
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Enroll
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function EnrolledCard({ lab }: { lab: CatalogLab }) {
  const pct = lab.total > 0 ? Math.round((lab.completed / lab.total) * 100) : 0;
  return (
    <div className="group relative flex flex-col h-full overflow-hidden rounded-xl border bg-card p-5 hover:border-primary/50 hover:ring-glow transition">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${lab.color})` }} />
      <div className="flex items-start justify-between flex-1">
        <div className="min-w-0">
          <div className="flex h-10 w-10 items-center text-3xl">
            <LabIcon lab={lab} />
          </div>
          <h3 className="mt-2 font-semibold truncate">{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{lab.description}</p>
        </div>
        <ProgressRing value={pct} color={`var(--${lab.color})`} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <DiffBadge value={lab.difficulty} />
          <TierBadge tier={lab.payment_tier} />
        </div>
        <span className="text-muted-foreground">
          {lab.completed}/{lab.total} · {lab.hoursLeft}h left
        </span>
      </div>
      <div className="mt-4">
        <Link
          to="/student/lab/$slug"
          params={{ slug: lab.id }}
          className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          {lab.completed > 0 ? "Continue" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function CatalogCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  const isDsa = isDsaLab(lab.name);
  return (
    <div className="flex flex-col h-full rounded-xl border bg-card p-4 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-3 flex-1">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">
            <LabIcon lab={lab} sizeClass="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{lab.name}</div>
            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {lab.description}
            </div>
          </div>
        </div>
        {!isDsa && (
          <span className="shrink-0 inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
            Upcoming
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <DiffBadge value={lab.difficulty} />
          <TierBadge tier={lab.payment_tier} />
          <span className="text-muted-foreground">{lab.total} tickets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            to="/student/lab/$slug"
            params={{ slug: lab.id }}
            className="rounded-md border border-border px-2 py-1 hover:bg-accent"
          >
            View
          </Link>
          <button
            onClick={onToggle}
            disabled={isLoading || !isDsa}
            title={!isDsa ? "Enrollment disabled for upcoming lab" : undefined}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
              isEnrolled
                ? "border border-success/40 bg-success/10 text-success"
                : !isDsa
                ? "border border-border bg-muted/60 text-muted-foreground cursor-not-allowed opacity-60"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isEnrolled ? (
              <>
                <Check className="h-3 w-3" /> Enrolled
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Enroll
              </>
            )}
          </button>
        </div>
      </div>
    </div>
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
