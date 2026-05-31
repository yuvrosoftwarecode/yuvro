import { createFileRoute, Link } from "@tanstack/react-router";
import { useCollab } from "@/lib/collab/store";
import { teamReport } from "@/lib/collab/data";
import { Avatar } from "@/components/collab/Avatar";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#eab308", "#ef4444"];

export const Route = createFileRoute("/collaboration/sprint/$id/report/team")({ component: TeamReport });

function TeamReport() {
  const { id } = Route.useParams();
  const { sprints, user } = useCollab();
  const sprint = sprints.find(s => s.id === id);

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/collaboration/sprint/$id/report/individual" params={{ id }} className="rounded-md border px-3 py-1 hover:bg-accent">My Report</Link>
        <span className="rounded-md bg-primary text-primary-foreground px-3 py-1">Team Report</span>
      </div>

      <div className={`rounded-2xl p-6 ${teamReport.onTime ? "bg-success/15" : "bg-warning/15"}`}>
        <h1 className="text-2xl font-semibold">{sprint?.title ?? "Sprint"}</h1>
        <p className={`mt-1 text-lg font-semibold ${teamReport.onTime ? "text-success" : "text-warning"}`}>
          {teamReport.onTime ? "✅ Completed On Time" : "⚠ Completed Late"}
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3">Contribution split</h2>
        <div className="flex h-6 rounded-full overflow-hidden border">
          {teamReport.contributions.map((c, i) => (
            <div key={c.userId} style={{ width: `${c.pct}%`, background: COLORS[i % COLORS.length] }} title={`${c.role} ${c.pct}%`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {teamReport.contributions.map((c, i) => {
            const u = user(c.userId);
            return (
              <div key={c.userId} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1">{u?.name} · {c.ticketsDone} tix</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Contribution table</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="text-left p-2">Member</th><th className="text-left p-2">Role</th><th className="text-right p-2">Tickets</th><th className="text-right p-2">PRs</th><th className="text-right p-2">Reviews</th><th className="text-right p-2">Activity</th></tr></thead>
          <tbody>
            {teamReport.contributions.map(c => {
              const u = user(c.userId);
              return (
                <tr key={c.userId} className="border-t">
                  <td className="p-2 flex items-center gap-2"><Avatar userId={c.userId} size={24} /> {u?.name}</td>
                  <td className="p-2">{c.role}</td>
                  <td className="p-2 text-right">{c.ticketsDone}</td>
                  <td className="p-2 text-right">{c.prsRaised}</td>
                  <td className="p-2 text-right">{c.prsReviewed}</td>
                  <td className="p-2 text-right text-primary font-semibold">{c.activityScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3">Dependency handling</h2>
        <div className="space-y-2">
          {teamReport.dependencies.map(d => (
            <div key={d.label} className="flex items-center gap-3 text-sm">
              <span className={`h-2 w-2 rounded-full ${d.onTime ? "bg-success" : "bg-warning"}`} />
              <span className="flex-1">{d.label}</span>
              <span className="text-muted-foreground">{d.time}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${d.onTime ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{d.onTime ? "On Time" : "Delayed"}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
