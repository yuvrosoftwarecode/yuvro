import React from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { labs, me } from "@/lib/dummy";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import { loadSprints } from "@/lib/labSprints";
import { ArrowRight, Sparkles, Flame, Zap, Trophy, Play } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({ 
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem('access');
      if (!token) {
        throw redirect({ to: '/auth', search: { tab: 'signin' } });
      }
      const userStr = localStorage.getItem('user');
      if (userStr) {
        let user;
        try {
          user = JSON.parse(userStr);
        } catch (e) {}
        
        if (user) {
          const role = user.roles?.ylabs || user.role;
          if (role === 'admin') {
            throw redirect({ to: '/admin' });
          }
        }
      }
    }
  },
  component: Hub 
});

function Hub() {
  const { user } = useAuth();
  const [realLabs, setRealLabs] = React.useState<AdminLab[]>([]);
  const [labTicketCounts, setLabTicketCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    loadLabs().then(labs => {
      setRealLabs(labs);
      labs.forEach(lab => {
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
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/40 via-card to-background p-8 md:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-ui/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> New season · 2026 cohort live
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
              Welcome back, <span className="text-primary">{user?.first_name || user?.username}</span>!
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl">
              Solve Jira-style tickets in a full in-browser IDE. Get progressive hints, run tests, and ship code that recruiters actually read.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/lab/$slug" params={{ slug: "java" }} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Continue Java Lab <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/analytics" className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent">
                View analytics
              </Link>
            </div>
          </div>
        </section>

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
              {realLabs.map((lab) => {
                const totalTickets = labTicketCounts[lab.id] || 0;
                let completedCount = 0;
                try {
                  const saved = localStorage.getItem(`ylabs-ticket-status-${lab.id}`);
                  if (saved) {
                    completedCount = Object.values(JSON.parse(saved)).filter(v => v === "Completed").length;
                  }
                } catch {}
                const pct = totalTickets > 0 ? Math.round((completedCount / totalTickets) * 100) : 0;
                
                const isLinux = lab.title.toLowerCase().includes("linux");
                const iconStr = lab.icon?.toLowerCase() || "";
                const icon = (lab.icon && iconStr !== "linux" && iconStr !== "linux lab") ? lab.icon : (isLinux ? "🐧" : "💻");

                return (
                  <Link key={lab.id} to="/lab/$slug" params={{ slug: lab.id }}
                    className="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:ring-glow">
                    <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--prog)` }} />
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-3xl">{icon}</div>
                        <h3 className="mt-3 font-semibold">{lab.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{lab.description}</p>
                      </div>
                      <ProgressRing value={pct} color={`var(--prog)`} />
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

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Example Labs</h2>
            <span className="text-sm text-muted-foreground">{labs.reduce((a, l) => a + l.completed, 0)} / {labs.reduce((a, l) => a + l.total, 0)} tickets solved</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {labs.map((lab) => {
              const pct = Math.round((lab.completed / lab.total) * 100);
              return (
                <Link key={lab.slug} to="/lab/$slug" params={{ slug: lab.slug }}
                  className="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:ring-glow">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${lab.color})` }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-3xl">{lab.icon}</div>
                      <h3 className="mt-3 font-semibold">{lab.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{lab.description}</p>
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

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Stat icon={<Flame className="h-4 w-4 text-warning" />} label="Day streak" value={`${me.streak} days`} hint="Keep it alive — solve 1 ticket today" />
          <Stat icon={<Zap className="h-4 w-4 text-primary" />} label="XP this week" value="+450" hint={`${me.nextLevelXp - me.xp} XP to Level ${me.level + 1}`} />
          <Stat icon={<Trophy className="h-4 w-4 text-info" />} label="Global rank" value={`#${me.rank}`} hint="Top 2% of active learners" />
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Featured challenges</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "48h SQL Sprint", sub: "Window functions deep dive", tag: "Limited", color: "sql" },
              { title: "UI Pixel Battle", sub: "Recreate a Figma in <60min", tag: "Community", color: "ui" },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border bg-card p-5 hover:border-primary/40 transition">
                <div className="flex items-center justify-between">
                  <span className="rounded-md border px-2 py-0.5 text-xs" style={{ color: `var(--${c.color})`, borderColor: `color-mix(in oklab, var(--${c.color}) 40%, transparent)` }}>{c.tag}</span>
                  <span className="text-xs text-muted-foreground">Ends in 2d 4h</span>
                </div>
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.sub}</p>
                <button className="mt-4 text-sm text-primary inline-flex items-center gap-1">Join challenge <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
