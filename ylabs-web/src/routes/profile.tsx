import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { me, labs } from "@/lib/dummy";
import { Github, Linkedin, Mail, Award } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-background p-6 flex flex-wrap items-center gap-6">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground text-3xl font-semibold">{me.avatar}</div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{me.name}</h1>
            <div className="text-sm text-muted-foreground">{me.handle} · Level {me.level}</div>
            <div className="mt-3 max-w-md">
              <div className="flex justify-between text-xs"><span>XP</span><span className="text-muted-foreground">{me.xp}/{me.nextLevelXp}</span></div>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(me.xp/me.nextLevelXp)*100}%` }} /></div>
            </div>
          </div>
          <div className="flex gap-2">
            <a className="rounded-md border p-2 hover:bg-accent"><Github className="h-4 w-4" /></a>
            <a className="rounded-md border p-2 hover:bg-accent"><Linkedin className="h-4 w-4" /></a>
            <a className="rounded-md border p-2 hover:bg-accent"><Mail className="h-4 w-4" /></a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat label="Tickets solved" value={`${me.totalSolved}`} />
          <Stat label="Global rank" value={`#${me.rank}`} />
          <Stat label="Streak" value={`${me.streak}d`} />
        </div>

        <section className="mt-6 rounded-xl border bg-card p-5">
          <div className="mb-3 text-sm font-medium">Labs</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {labs.map((l) => (
              <Link key={l.slug} to="/lab/$slug" params={{ slug: l.slug }} className="rounded-md border p-3 hover:border-primary/50">
                <div className="flex items-center gap-2 text-sm font-medium">{l.icon} {l.name}</div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full" style={{ width: `${(l.completed/l.total)*100}%`, background: `var(--${l.color})` }} /></div>
                <div className="mt-1 text-xs text-muted-foreground">{l.completed}/{l.total} tickets</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-card p-5">
          <div className="mb-3 text-sm font-medium">Achievements</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {["First Solve","5 Streak","Bug Hunter","Speed Demon","OOP Master","Polyglot"].map((b) => (
              <div key={b} className="rounded-md border bg-accent/30 p-3 text-center text-xs">
                <Award className="mx-auto h-5 w-5 text-warning" />
                <div className="mt-1">{b}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div></div>;
}
