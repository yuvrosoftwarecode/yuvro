import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { labs, me } from "@/lib/dummy";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import { loadSprints } from "@/lib/labSprints";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";
import { useAuth } from "@/lib/auth";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import {
  ArrowRight,
  Sparkles,
  Flame,
  Zap,
  Trophy,
  Check,
  Plus,
  Star,
  Search,
  Github,
  Loader2,
  X,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) throw redirect({ to: "/auth", search: { tab: "signin" } });
      const userStr = localStorage.getItem("user");
      if (userStr) {
        let u: any;
        try {
          u = JSON.parse(userStr);
        } catch {}
        if (u) {
          const role = u.roles?.ylabs || u.role;
          if (role === "admin") throw redirect({ to: "/admin" });
        }
      } else {
        throw redirect({ to: "/auth", search: { tab: "signin" } as any });
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
}

type Category = "Backend" | "Frontend" | "Database" | "DevOps" | "QA" | "Security";
const CATEGORIES: Category[] = ["Backend", "Frontend", "Database", "DevOps", "QA", "Security"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
const FEATURED_SLUGS = ["javaspring", "systemdesign", "pydjango", "postgres", "datastructures", "qa", "mongo"];

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
const RECENT_LAB_KEY = "ylabs-recent-lab";

function getRecentLab(): { id: string; name: string } | null {
  try {
    const s = localStorage.getItem(RECENT_LAB_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function resolveIcon(lab: AdminLab) {
  const iconStr = lab.icon?.toLowerCase() || "";
  const isLinux = lab.title.toLowerCase().includes("linux");
  if (!lab.icon || iconStr === "linux" || iconStr === "linux lab") {
    return isLinux ? "🐧" : "💻";
  }
  return lab.icon;
}

function diffLabel(d: string): "Beginner" | "Intermediate" | "Advanced" {
  if (d === "HARD") return "Advanced";
  if (d === "MEDIUM") return "Intermediate";
  return "Beginner";
}

function realLabCompleted(labId: string): number {
  try {
    const saved = localStorage.getItem(`ylabs-ticket-status-${labId}`);
    if (saved) return Object.values(JSON.parse(saved)).filter((v) => v === "Completed").length;
  } catch {}
  return 0;
}

type GitHubState = {
  connected: boolean;
  github_username?: string;
  github_repo?: string;
};

function GitHubCard() {
  const [ghState, setGhState] = useState<GitHubState>({ connected: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [repo, setRepo] = useState("");
  const [pat, setPat] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    restApiAuthUtil
      .get<GitHubState>("/lab/github-integration/")
      .then(setGhState)
      .catch(() => {});
  }, []);

  function openModal() {
    setUsername(ghState.github_username ?? "");
    setRepo(ghState.github_repo ?? "");
    setPat("");
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !repo.trim() || !pat.trim()) {
      setSaveError("All fields are required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await restApiAuthUtil.post<GitHubState>("/lab/github-integration/", {
        github_username: username.trim(),
        github_repo: repo.trim(),
        pat: pat.trim(),
      });
      setGhState(res);
      setModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message ?? "Failed to connect GitHub");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect GitHub? git push will no longer route to your repo.")) return;
    try {
      await restApiAuthUtil.delete("/lab/github-integration/");
      setGhState({ connected: false });
    } catch {}
  }

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl border p-5 transition ${ghState.connected ? "border-success/40 bg-success/5" : "bg-card hover:border-primary/40"}`}>
        {ghState.connected && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-success/20 blur-2xl" />}
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl border ${ghState.connected ? "border-success/40 bg-success/10" : "bg-accent"}`}>
              <Github className={`h-5 w-5 ${ghState.connected ? "text-success" : "text-muted-foreground"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">GitHub</span>
                {ghState.connected && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    <Check className="h-2.5 w-2.5" /> Connected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ghState.connected
                  ? `${ghState.github_username} / ${ghState.github_repo} -- git push routes to your GitHub`
                  : "Connect your GitHub so git push in the terminal goes to your own repo"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ghState.connected && (
              <>
                <a href={`https://github.com/${ghState.github_username}/${ghState.github_repo}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                  <ExternalLink className="h-3 w-3" /> View repo
                </a>
                <button onClick={handleDisconnect} className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                  <X className="h-3 w-3" /> Disconnect
                </button>
              </>
            )}
            <button onClick={openModal} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Github className="h-3 w-3" />
              {ghState.connected ? "Update" : "Connect GitHub"}
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border bg-accent">
                <Github className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold">Connect GitHub</h3>
                <p className="text-xs text-muted-foreground">PAT is encrypted and stored securely</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="gh-username" className="mb-1 block text-xs font-medium">GitHub Username</label>
                <input id="gh-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. johndoe" autoComplete="off" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="gh-repo" className="mb-1 block text-xs font-medium">Repository Name</label>
                <input id="gh-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="e.g. yuvro-labs" autoComplete="off" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <p className="mt-1 text-[10px] text-muted-foreground">Must exist at github.com/{username || "username"}/{repo || "repo"}</p>
              </div>
              <div>
                <label htmlFor="gh-pat" className="mb-1 block text-xs font-medium">Personal Access Token (PAT)</label>
                <div className="relative">
                  <input id="gh-pat" type={showPat ? "text" : "password"} value={pat} onChange={(e) => setPat(e.target.value)} placeholder="ghp_xxxxxxxxxxxxxxxx" autoComplete="new-password" className="w-full rounded-md border bg-background px-3 py-2 pr-10 font-mono text-sm outline-none focus:border-primary" />
                  <button type="button" onClick={() => setShowPat((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPat ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Needs <code className="rounded bg-accent px-1">repo</code> scope. <a href="https://github.com/settings/tokens/new?scopes=repo&description=Yuvro+Labs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Create one</a>
                </p>
              </div>

              {saveError && <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">{saveError}</div>}

              <div className="rounded-md border border-info/30 bg-info/5 px-3 py-2 text-[11px] text-info">
                Tip: after connecting, run <code className="font-mono">git remote -v</code> to confirm routing.
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {saving ? "Saving..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Hub() {
  const { user } = useAuth();
  const [realLabs, setRealLabs] = useState<AdminLab[]>([]);
  const [labTicketCounts, setLabTicketCounts] = useState<Record<string, number>>({});
  const [labsLoading, setLabsLoading] = useState(true);

  useEffect(() => {
    setLabsLoading(true);
    loadLabs()
      .then((fetched) => {
        setRealLabs(fetched);
        return Promise.all(
          fetched.map(async (lab) => {
            const sprints = await loadSprints(lab.id);
            const count = sprints.reduce((acc, s) => acc + s.tasks.length, 0);
            return [lab.id, count] as const;
          }),
        );
      })
      .then((entries) => setLabTicketCounts(Object.fromEntries(entries)))
      .catch(console.error)
      .finally(() => setLabsLoading(false));
  }, []);

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    restApiAuthUtil
      .get<any[]>("/lab/enrollments/")
      .then((data) => {
        setEnrolledIds(new Set(data.map((e: any) => e.lab)));
      })
      .catch(console.error);
  }, []);

  const [enrollModalLabId, setEnrollModalLabId] = useState<string | null>(null);
  const [enrollModalRepoName, setEnrollModalRepoName] = useState("");

  const toggleEnroll = useCallback(async (labId: string, repoName?: string) => {
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
           const lab = realLabs.find((l) => l.id === labId);
           const defaultName = lab ? `yuvro_${lab.title.replace(/\\s+/g, '_').toLowerCase()}` : `yuvro_lab_${labId.substring(0, 5)}`;
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
  }, [enrolledIds]);

  const allCatalogLabs = useMemo((): CatalogLab[] => {
    const realEntries: CatalogLab[] = realLabs.map((lab) => ({
      id: lab.id,
      name: lab.title,
      icon: resolveIcon(lab),
      description: lab.description,
      difficulty: diffLabel(lab.difficulty),
      total: labTicketCounts[lab.id] || 0,
      completed: realLabCompleted(lab.id),
      isReal: true,
      color: "prog",
    }));

    const realNames = new Set(realLabs.map((l) => l.title.toLowerCase()));
    const dummyEntries: CatalogLab[] = labs
      .filter((l) => !realNames.has(l.name.toLowerCase()))
      .map((l) => ({
        id: l.slug,
        name: l.name,
        icon: l.icon,
        description: l.description,
        difficulty: l.difficulty,
        total: l.total,
        completed: l.completed,
        isReal: false,
        color: l.color,
      }));

    return [...realEntries, ...dummyEntries];
  }, [realLabs, labTicketCounts]);

  const myLabs = useMemo(() => allCatalogLabs.filter((l) => enrolledIds.has(l.id)), [allCatalogLabs, enrolledIds]);
  const featuredLabs = useMemo(() => FEATURED_SLUGS.map((s) => allCatalogLabs.find((l) => l.id === s)).filter(Boolean) as CatalogLab[], [allCatalogLabs]);

  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [diffs, setDiffs] = useState<Array<typeof DIFFICULTIES[number]>>([]);
  const [langs, setLangs] = useState<string[]>([]);

  const filteredAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allCatalogLabs.filter((l) => {
      if (s && !l.name.toLowerCase().includes(s) && !l.description.toLowerCase().includes(s)) return false;
      if (cats.length && !cats.includes(LAB_CATEGORY[l.id] as Category)) return false;
      if (diffs.length && !diffs.includes(l.difficulty)) return false;
      if (langs.length && !(LAB_LANGUAGES[l.id] ?? []).some((x) => langs.includes(x))) return false;
      return true;
    });
  }, [allCatalogLabs, q, cats, diffs, langs]);

  const clearFilters = () => {
    setCats([]);
    setDiffs([]);
    setLangs([]);
    setQ("");
  };
  const hasFilters = !!(cats.length || diffs.length || langs.length || q);
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
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
              <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                Your <span className="text-primary">Individual Hub</span>
              </h1>
              <p className="mt-2 hidden max-w-xl text-sm text-muted-foreground sm:block">
                Solve Jira-style tickets in a full in-browser IDE. Get progressive hints, run tests, and ship code that recruiters actually read.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {recentLab ? (
                  <Link to="/lab/$slug" params={{ slug: recentLab.id }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 sm:text-sm">
                    Continue {recentLab.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : myLabs.length > 0 ? (
                  <Link to="/lab/$slug" params={{ slug: myLabs[0].id }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 sm:text-sm">
                    Start {myLabs[0].name} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link to="/lab/$slug" params={{ slug: "java" }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 sm:text-sm">
                    Explore Java Lab <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-2 sm:min-w-[380px] sm:grid-cols-3 md:min-w-[420px]">
              <MiniStat icon={<Flame className="h-3.5 w-3.5 text-warning" />} label="Day streak" value={`${streak}d`} accent="warning" />
              <MiniStat icon={<Zap className="h-3.5 w-3.5 text-primary" />} label="YP" value={xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : `${xp}`} accent="primary" />
              <MiniStat icon={<Trophy className="h-3.5 w-3.5 text-info" />} label="Rank" value={`#${rank}`} accent="info" />
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-10">
          <section>
            <h2 className="mb-3 text-xl font-semibold">Integrations</h2>
            <GitHubCard />
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">My labs</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{myLabs.length} enrolled · {myLabs.reduce((a, l) => a + l.completed, 0)} tickets solved</p>
              </div>
            </div>
            {labsLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your labs...
              </div>
            ) : myLabs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">You have not enrolled in any lab yet. Pick one from the catalog below to get started.</p>
              </div>
            ) : (
              <HScroll>
                {myLabs.map((lab) => (
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
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Star className="h-4 w-4 text-warning" /> Featured labs
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Handpicked tracks trending this month.</p>
                </div>
              </div>
              <HScroll>
                {featuredLabs.map((lab) => (
                  <div key={lab.id} className="w-[320px] shrink-0">
                    <FeaturedCard lab={lab} isEnrolled={enrolledIds.has(lab.id)} isLoading={!!enrollLoading[lab.id]} onToggle={() => toggleEnroll(lab.id)} />
                  </div>
                ))}
              </HScroll>
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">All labs</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{filteredAll.length} of {allCatalogLabs.length} labs</p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search labs..." className="w-56 rounded-md border border-border bg-transparent py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="space-y-5 rounded-xl border bg-card/40 p-4 md:sticky md:top-20 md:self-start">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Filters</span>
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-[10px] text-muted-foreground underline hover:text-foreground">
                      Clear
                    </button>
                  )}
                </div>
                <FilterGroup label="Category">
                  {CATEGORIES.map((c) => (
                    <CheckRow key={c} checked={cats.includes(c)} onChange={() => setCats((prev) => toggleIn(prev, c))} label={c} />
                  ))}
                </FilterGroup>
                <FilterGroup label="Difficulty">
                  {DIFFICULTIES.map((d) => (
                    <CheckRow key={d} checked={diffs.includes(d)} onChange={() => setDiffs((prev) => toggleIn(prev, d))} label={d} />
                  ))}
                </FilterGroup>
                <FilterGroup label="Language">
                  {ALL_LANGUAGES.map((l) => (
                    <CheckRow key={l} checked={langs.includes(l)} onChange={() => setLangs((prev) => toggleIn(prev, l))} label={l} />
                  ))}
                </FilterGroup>
              </aside>

              <div className="min-w-0">
                {filteredAll.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">No labs match these filters.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredAll.map((lab) => (
                      <CatalogCard key={lab.id} lab={lab} isEnrolled={enrolledIds.has(lab.id)} isLoading={!!enrollLoading[lab.id]} onToggle={() => toggleEnroll(lab.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-semibold">Example labs</h2>
              <span className="text-sm text-muted-foreground">{labs.reduce((a, l) => a + l.completed, 0)} / {labs.reduce((a, l) => a + l.total, 0)} tickets solved</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {labs.map((lab) => {
                const pct = Math.round((lab.completed / lab.total) * 100);
                return (
                  <Link key={lab.slug} to="/lab/$slug" params={{ slug: lab.slug }} className="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:ring-glow">
                    <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${lab.color})` }} />
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-3xl">{lab.icon}</div>
                        <h3 className="mt-3 font-semibold">{lab.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lab.description}</p>
                      </div>
                      <ProgressRing value={pct} color={`var(--${lab.color})`} />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <DiffBadge value={lab.difficulty} />
                      <span className="text-muted-foreground">{lab.hoursLeft}h left</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{lab.completed}/{lab.total} tickets</span>
                      <span className="inline-flex items-center gap-1 text-sm text-primary opacity-0 transition group-hover:opacity-100">
                        {lab.completed > 0 ? "Continue" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Featured challenges</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "48h SQL Sprint", sub: "Window functions deep dive", tag: "Limited", color: "sql" },
                { title: "UI Pixel Battle", sub: "Recreate a Figma in <60min", tag: "Community", color: "ui" },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border bg-card p-5 transition hover:border-primary/40">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border px-2 py-0.5 text-xs" style={{ color: `var(--${c.color})`, borderColor: `color-mix(in oklab, var(--${c.color}) 40%, transparent)` }}>
                      {c.tag}
                    </span>
                    <span className="text-xs text-muted-foreground">Ends in 2d 4h</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.sub}</p>
                  <button className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                    Join challenge <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
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
    </div>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-thin">
      <div className="flex gap-4 pb-2">{children}</div>
    </div>
  );
}

function MiniStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card/70 px-3 py-2.5 backdrop-blur">
      <div className="absolute -right-4 -top-4 h-10 w-10 rounded-full blur-2xl opacity-30" style={{ background: `var(--${accent})` }} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}

function EnrolledCard({ lab }: { lab: CatalogLab }) {
  const pct = lab.total > 0 ? Math.round((lab.completed / lab.total) * 100) : 0;
  return (
    <Link to="/lab/$slug" params={{ slug: lab.id }} className="group relative block overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:ring-glow">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${lab.color})` }} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-2xl">{lab.icon}</div>
          <h3 className="mt-2 truncate font-semibold">{lab.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{lab.description}</p>
        </div>
        <ProgressRing value={pct} color={`var(--${lab.color})`} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <DiffBadge value={lab.difficulty} />
        <span className="text-muted-foreground">{lab.completed}/{lab.total} tickets</span>
      </div>
      <div className="mt-4">
        <span className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition group-hover:opacity-90">
          {lab.completed > 0 ? "Continue" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function FeaturedCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card via-card to-accent/20 p-5 transition hover:border-primary/50">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30" style={{ background: `var(--${lab.color})` }} />
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
        <Star className="h-3 w-3" /> Featured
      </span>
      <div className="mt-3 flex items-start gap-3">
        <div className="text-3xl">{lab.icon}</div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{lab.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{lab.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <DiffBadge value={lab.difficulty} />
        <span className="text-muted-foreground">{lab.total} tickets</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link to="/lab/$slug" params={{ slug: lab.id }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
          View
        </Link>
        <button onClick={onToggle} disabled={isLoading} className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${isEnrolled ? "border border-success/40 bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEnrolled ? (<><Check className="h-3.5 w-3.5" /> Enrolled</>) : (<><Plus className="h-3.5 w-3.5" /> Enroll</>)}
        </button>
      </div>
    </div>
  );
}

function CatalogCard({ lab, isEnrolled, isLoading, onToggle }: { lab: CatalogLab; isEnrolled: boolean; isLoading: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-4 transition hover:border-primary/40">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="shrink-0 text-xl">{lab.icon}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{lab.name}</div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{lab.description}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <DiffBadge value={lab.difficulty} />
          <span className="text-muted-foreground">{lab.total} tickets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to="/lab/$slug" params={{ slug: lab.id }} className="rounded-md border border-border px-2 py-1 hover:bg-accent">View</Link>
          <button onClick={onToggle} disabled={isLoading} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition disabled:opacity-60 ${isEnrolled ? "border border-success/40 bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
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
      <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-border accent-primary" />
      <span className={checked ? "text-foreground" : ""}>{label}</span>
    </label>
  );
}
