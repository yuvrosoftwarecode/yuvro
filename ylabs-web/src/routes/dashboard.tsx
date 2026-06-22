import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { DiffBadge } from "@/components/Badges";
import { labs, me } from "@/lib/dummy";
import { ArrowRight, Sparkles, Flame, Zap, Trophy } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Hub });

function Hub() {
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
              Master practical skills through <span className="text-primary">real-world projects</span>
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

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Your Labs</h2>
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
