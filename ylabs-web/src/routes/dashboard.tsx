import React, { useState, useEffect } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { labs, me } from "@/lib/dummy";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import { loadSprints } from "@/lib/labSprints";
import {
  ArrowRight, Sparkles, Flame, Zap, Trophy,
  Github, Check, X, Eye, EyeOff, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) throw redirect({ to: "/auth", search: { tab: "signin" } });
      const userStr = localStorage.getItem("user");
      if (userStr) {
        let user: any;
        try { user = JSON.parse(userStr); } catch {}
        if (user) {
          const role = user.roles?.ylabs || user.role;
          if (role === "admin") throw redirect({ to: "/admin" });
        }
      } else {
        throw redirect({ to: "/auth", search: { tab: "signin" } as any });
      }
    }
  },
  component: Hub,
});

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
function Stat({ icon, label, value, hint }: {
  icon: React.ReactNode; label: string; value: string; hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GitHub Integration Card (defined BEFORE Hub to avoid SSR ReferenceError)
// ─────────────────────────────────────────────────────────────
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
    restApiAuthUtil.get<GitHubState>("/lab/github-integration/")
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
      <div
        className={`relative overflow-hidden rounded-xl border p-5 transition ${
          ghState.connected ? "border-success/40 bg-success/5" : "bg-card hover:border-primary/40"
        }`}
      >
        {ghState.connected && (
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-success/20 blur-2xl" />
        )}
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          {/* Left: icon + info */}
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl border ${
              ghState.connected ? "border-success/40 bg-success/10" : "bg-accent"
            }`}>
              <Github className={`h-5 w-5 ${ghState.connected ? "text-success" : "text-muted-foreground"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">GitHub</span>
                {ghState.connected && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] text-success font-medium">
                    <Check className="h-2.5 w-2.5" /> Connected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ghState.connected
                  ? `${ghState.github_username} / ${ghState.github_repo} — git push routes to your GitHub`
                  : "Connect your GitHub so git push in the terminal goes to your own repo"}
              </p>
            </div>
          </div>
          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            {ghState.connected && (
              <>
                <a
                  href={`https://github.com/${ghState.github_username}/${ghState.github_repo}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" /> View repo
                </a>
                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" /> Disconnect
                </button>
              </>
            )}
            <button
              onClick={openModal}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Github className="h-3 w-3" />
              {ghState.connected ? "Update" : "Connect GitHub"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
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
                <input id="gh-username" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. johndoe" autoComplete="off"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="gh-repo" className="mb-1 block text-xs font-medium">Repository Name</label>
                <input id="gh-repo" value={repo} onChange={e => setRepo(e.target.value)}
                  placeholder="e.g. yuvro-labs" autoComplete="off"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Must exist at github.com/{username || "username"}/{repo || "repo"}
                </p>
              </div>
              <div>
                <label htmlFor="gh-pat" className="mb-1 block text-xs font-medium">Personal Access Token (PAT)</label>
                <div className="relative">
                  <input id="gh-pat" type={showPat ? "text" : "password"}
                    value={pat} onChange={e => setPat(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxx" autoComplete="new-password"
                    className="w-full rounded-md border bg-background px-3 py-2 pr-10 font-mono text-sm outline-none focus:border-primary" />
                  <button type="button" onClick={() => setShowPat(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPat ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Needs <code className="rounded bg-accent px-1">repo</code> scope.{" "}
                  <a href="https://github.com/settings/tokens/new?scopes=repo&description=Yuvro+Labs"
                    target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Create one →
                  </a>
                </p>
              </div>

              {saveError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {saveError}
                </div>
              )}

              <div className="rounded-md border border-info/30 bg-info/5 px-3 py-2 text-[11px] text-info">
                💡 After connecting, open the Terminal tab in any ticket and run{" "}
                <code className="font-mono">git remote -v</code> to confirm.
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {saving ? "Saving…" : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Hub (main dashboard page) — all helpers defined above
// ─────────────────────────────────────────────────────────────
function Hub() {
  const { user } = useAuth();
  const [realLabs, setRealLabs] = useState<AdminLab[]>([]);
  const [labTicketCounts, setLabTicketCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadLabs().then(allLabs => {
      setRealLabs(allLabs);
      allLabs.forEach(lab => {
        loadSprints(lab.id).then(sprints => {
          const count = sprints.reduce((acc, s) => acc + s.tasks.length, 0);
          setLabTicketCounts(prev => ({ ...prev, [lab.id]: count }));
        });
      });
    }).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-10">

        {/* ── Hero banner ── */}
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/40 via-card to-background p-8 md:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-ui/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> New season · 2026 cohort live
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Welcome back, <span className="text-primary">{user?.first_name || user?.username}</span>!
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Solve Jira-style tickets in a full in-browser IDE. Get progressive hints, run tests, and ship code that recruiters actually read.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/lab/$slug" params={{ slug: "linux" }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Continue Lab <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/analytics"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent">
                View analytics
              </Link>
            </div>
          </div>
        </section>

        {/* ── Integrations (GitHub) — top priority ── */}
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Integrations</h2>
          <GitHubCard />
        </section>

        {/* ── Stats ── */}
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat icon={<Flame className="h-4 w-4 text-warning" />} label="Day streak" value={`${me.streak} days`} hint="Keep it alive — solve 1 ticket today" />
          <Stat icon={<Zap className="h-4 w-4 text-primary" />} label="XP this week" value="+450" hint={`${me.nextLevelXp - me.xp} XP to Level ${me.level + 1}`} />
          <Stat icon={<Trophy className="h-4 w-4 text-info" />} label="Global rank" value={`#${me.rank}`} hint="Top 2% of active learners" />
        </section>

        {/* ── Real Labs from API ── */}
        {realLabs.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-semibold">Your Labs</h2>
              <span className="text-sm text-muted-foreground">
                {realLabs.reduce((a, l) => {
                  try {
                    const saved = localStorage.getItem(`ylabs-ticket-status-${l.id}`);
                    if (saved) return a + Object.values(JSON.parse(saved)).filter(v => v === "Completed").length;
                  } catch {}
                  return a;
                }, 0)} / {Object.values(labTicketCounts).reduce((a, b) => a + b, 0)} tickets solved
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {realLabs.map(lab => {
                const totalTickets = labTicketCounts[lab.id] || 0;
                let completedCount = 0;
                try {
                  const saved = localStorage.getItem(`ylabs-ticket-status-${lab.id}`);
                  if (saved) completedCount = Object.values(JSON.parse(saved)).filter(v => v === "Completed").length;
                } catch {}
                const pct = totalTickets > 0 ? Math.round((completedCount / totalTickets) * 100) : 0;
                const isLinux = lab.title.toLowerCase().includes("linux");
                const iconStr = lab.icon?.toLowerCase() || "";
                const icon = (lab.icon && iconStr !== "linux" && iconStr !== "linux lab") ? lab.icon : (isLinux ? "🐧" : "💻");
                return (
                  <Link key={lab.id} to="/lab/$slug" params={{ slug: lab.id }}
                    className="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:ring-glow">
                    <div className="absolute inset-x-0 top-0 h-1" style={{ background: "var(--prog)" }} />
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-3xl">{icon}</div>
                        <h3 className="mt-3 font-semibold">{lab.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lab.description}</p>
                      </div>
                      <ProgressRing value={pct} color="var(--prog)" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <DiffBadge value={lab.difficulty === "HARD" ? "Advanced" : lab.difficulty === "MEDIUM" ? "Intermediate" : "Beginner"} />
                      <span className="text-muted-foreground">10h left</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{completedCount}/{totalTickets} tickets</span>
                      <span className="inline-flex items-center gap-1 text-sm text-primary opacity-0 transition group-hover:opacity-100">
                        Start <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Example Labs ── */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Example Labs</h2>
            <span className="text-sm text-muted-foreground">
              {labs.reduce((a, l) => a + l.completed, 0)} / {labs.reduce((a, l) => a + l.total, 0)} tickets solved
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {labs.map(lab => {
              const pct = Math.round((lab.completed / lab.total) * 100);
              return (
                <Link key={lab.slug} to="/lab/$slug" params={{ slug: lab.slug }}
                  className="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:ring-glow">
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

        {/* ── Featured challenges ── */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Featured challenges</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "48h SQL Sprint", sub: "Window functions deep dive", tag: "Limited", color: "sql" },
              { title: "UI Pixel Battle", sub: "Recreate a Figma in <60min", tag: "Community", color: "ui" },
            ].map(c => (
              <div key={c.title} className="rounded-xl border bg-card p-5 transition hover:border-primary/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-md border px-2 py-0.5 text-xs"
                    style={{ color: `var(--${c.color})`, borderColor: `color-mix(in oklab, var(--${c.color}) 40%, transparent)` }}>
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

      </main>
    </div>
  );
}
