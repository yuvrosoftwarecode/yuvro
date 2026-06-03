import { createFileRoute, Link } from "@tanstack/react-router";
import { useCollab, fmtCountdown } from "@/lib/collab/store";
import { Avatar, LevelBadge, RoleBadge } from "@/components/collab/Avatar";
import { DOMAIN_COLORS, ME_ID } from "@/lib/collab/data";
import { Rocket, Search, Users, Plus, Trophy, ArrowRight, Inbox } from "lucide-react";

export const Route = createFileRoute("/collaboration/")({ component: CollabHome });

function CollabHome() {
  const { sprints, tickets, squads, connections, users, me } = useCollab();
  const meUser = me();
  const myActive = sprints.filter(s => s.status === "In Progress" && s.members.some(m => m.userId === ME_ID));
  const leaderboard = [...users].filter(u => u.id !== "u-ai").sort((a, b) => b.points - a.points).slice(0, 5);

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Welcome back, {meUser.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Build with real teams. Ship real sprints.</p>
        </div>
        <div className="flex items-center gap-3">
          <LevelBadge level={meUser.level} title={meUser.title} />
          <div className="rounded-lg border bg-card px-4 py-2">
            <div className="text-xs text-muted-foreground">Collab points</div>
            <div className="text-xl font-semibold text-primary">{meUser.points.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* My Active Sprints */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Active Sprints</h2>
          <Link to="/collaboration/browse" className="text-xs text-primary hover:underline">Browse all →</Link>
        </div>
        {myActive.length === 0 ? (
          <EmptyState icon={Rocket} title="No active sprints yet" cta={<Link to="/collaboration/browse" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 inline-flex items-center gap-1">Browse Sprints <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {myActive.map(s => {
              const myMember = s.members.find(m => m.userId === ME_ID);
              const sTickets = tickets[s.id] ?? [];
              const done = sTickets.filter(t => t.status === "Completed").length;
              const pct = sTickets.length ? Math.round(done * 100 / sTickets.length) : 0;
              const cd = fmtCountdown(s.deadlineAt);
              return (
                <div key={s.id} className="min-w-[320px] max-w-[340px] rounded-xl border bg-card p-4 hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">{s.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[s.domain]}`}>{s.domain}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <RoleBadge role={myMember?.role ?? "—"} />
                    <span className={`text-[11px] font-mono ${cd.tone === "destructive" ? "text-destructive" : cd.tone === "warning" ? "text-warning" : "text-muted-foreground"}`}>{cd.text}</span>
                  </div>
                  <div className="mt-3 flex -space-x-1.5">
                    {s.members.slice(0, 5).map((m, i) => <Avatar key={i} userId={m.userId} ai={m.status === "ai"} size={24} />)}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Progress</span><span>{done}/{sTickets.length}</span></div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <Link to="/collaboration/sprint/$id/workspace" params={{ id: s.id }} className="mt-3 w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">Open Sprint</Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Browse banner */}
      <section className="rounded-2xl border bg-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Search className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-semibold">Find your next sprint</h2>
            <p className="text-sm text-muted-foreground">Join a team, pick a role, and ship something real.</p>
          </div>
        </div>
        <Link to="/collaboration/browse" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 inline-flex items-center gap-1">Browse All Sprints <ArrowRight className="h-3.5 w-3.5" /></Link>
      </section>

      {/* My Squads */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Squads</h2>
          <Link to="/collaboration/squads" className="text-xs text-primary hover:underline">Manage all →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {squads.map(sq => (
            <div key={sq.id} className="min-w-[240px] rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">{sq.name}</h3><span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">{sq.memberIds.length}</span></div>
              <div className="mt-2 flex -space-x-1.5">{sq.memberIds.slice(0, 5).map(id => <Avatar key={id} userId={id} size={24} />)}</div>
              <Link to="/collaboration/squads" className="mt-3 inline-block text-xs rounded-md border px-3 py-1 hover:bg-accent w-full text-center">Manage</Link>
            </div>
          ))}
          <Link to="/collaboration/squads" className="min-w-[180px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 grid place-items-center text-sm text-muted-foreground p-4">
            <div className="text-center"><Plus className="h-5 w-5 mx-auto mb-1" /> Create Squad</div>
          </Link>
        </div>
      </section>

      {/* My Connections */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Connections</h2>
          <Link to="/collaboration/connections" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {connections.length === 0 ? (
          <EmptyState icon={Users} title="No connections yet" />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {connections.map(id => {
              const u = users.find(x => x.id === id);
              if (!u) return null;
              return (
                <div key={id} className="min-w-[140px] rounded-xl border bg-card p-4 text-center">
                  <div className="grid place-items-center"><Avatar userId={id} size={48} showStatus /></div>
                  <p className="mt-2 text-sm font-medium truncate">{u.name}</p>
                  <div className="mt-1 flex justify-center"><LevelBadge level={u.level} /></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard snapshot */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Leaderboard</h2>
          <Link to="/leaderboard" className="text-xs text-primary hover:underline">View full leaderboard →</Link>
        </div>
        <div className="rounded-xl border bg-card divide-y">
          {leaderboard.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-warning/20 text-warning" : "bg-accent text-foreground"}`}>{i + 1}</span>
              <Avatar userId={u.id} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-[11px] text-muted-foreground">{u.title}</p>
              </div>
              <LevelBadge level={u.level} />
              <span className="text-sm font-semibold text-primary">{u.points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function EmptyState({ icon: Icon, title, cta }: { icon: any; title: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{title}</p>
      {cta}
    </div>
  );
}
