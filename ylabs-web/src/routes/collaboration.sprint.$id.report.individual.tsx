import { createFileRoute, Link } from "@tanstack/react-router";
import { useCollab } from "@/lib/collab/store";
import { myReport } from "@/lib/collab/data";

export const Route = createFileRoute("/collaboration/sprint/$id/report/individual")({ component: IndividualReport });

function IndividualReport() {
  const { id } = Route.useParams();
  const { sprints } = useCollab();
  const sprint = sprints.find(s => s.id === id);
  const total = myReport.basePoints + (myReport.onTime ? myReport.bonus : 0);

  // Radar chart points
  const cx = 120, cy = 120, r = 90;
  const pts = myReport.metrics.map((m, i) => {
    const angle = (Math.PI * 2 * i) / myReport.metrics.length - Math.PI / 2;
    const dist = (m.score / 100) * r;
    return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist] as const;
  });
  const polyPoints = pts.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/collaboration" className="hover:text-foreground">Collaboration Hub</Link> › <span>Individual Report</span>
        <span className="ml-auto"><Link to="/collaboration/sprint/$id/report/team" params={{ id }} className="rounded-md border px-3 py-1 hover:bg-accent">View Team Report</Link></span>
      </div>

      <header className="rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-card p-6">
        <h1 className="text-2xl font-semibold">{sprint?.title ?? "Sprint Report"}</h1>
        <p className="text-sm text-muted-foreground mt-1">You played: <b className="text-foreground">{myReport.role}</b></p>
        <div className="mt-3 flex items-center gap-3">
          <div className="text-3xl font-bold text-primary">{total} pts</div>
          <span className={`text-xs px-2 py-0.5 rounded ${myReport.onTime ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{myReport.onTime ? "✅ On Time" : "⚠ Late"}</span>
        </div>
      </header>

      <section className="grid sm:grid-cols-5 gap-3">
        {myReport.metrics.map(m => {
          const tone = m.score > 70 ? "text-success" : m.score > 50 ? "text-warning" : "text-destructive";
          return (
            <div key={m.name} className="rounded-xl border bg-card p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.name}</p>
              <p className={`text-2xl font-bold ${tone}`}>{m.score}<span className="text-xs text-muted-foreground">/100</span></p>
              <p className="text-[11px] text-muted-foreground mt-1">{m.summary}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3">Performance shape</h2>
        <svg width="240" height="240" viewBox="0 0 240 240" className="mx-auto">
          {[0.25, 0.5, 0.75, 1].map(s => <circle key={s} cx={cx} cy={cy} r={r * s} fill="none" stroke="currentColor" className="text-border" />)}
          {myReport.metrics.map((_, i) => {
            const a = (Math.PI * 2 * i) / myReport.metrics.length - Math.PI / 2;
            return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="currentColor" className="text-border" />;
          })}
          <polygon points={polyPoints} fill="hsl(220 80% 60% / 0.3)" stroke="hsl(220 80% 60%)" strokeWidth="2" />
          {myReport.metrics.map((m, i) => {
            const a = (Math.PI * 2 * i) / myReport.metrics.length - Math.PI / 2;
            return <text key={i} x={cx + Math.cos(a) * (r + 15)} y={cy + Math.sin(a) * (r + 15)} textAnchor="middle" className="text-[9px] fill-current">{m.name}</text>;
          })}
        </svg>
      </section>

      <section className="rounded-xl border bg-card divide-y">
        {myReport.metrics.map(m => (
          <details key={m.name} className="p-4">
            <summary className="cursor-pointer text-sm font-medium flex items-center justify-between">
              <span>{m.name}</span><span className="text-primary font-semibold">{m.score}/100</span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{m.summary}.</p>
            <p className="mt-1 text-sm text-warning">💡 {m.tip}</p>
          </details>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3">Points breakdown</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b"><td className="py-2">Tickets completed</td><td className="text-right">{myReport.basePoints} pts</td></tr>
            <tr className="border-b"><td className="py-2">On-time bonus</td><td className="text-right text-success">+{myReport.onTime ? myReport.bonus : 0} pts</td></tr>
            <tr className="border-b"><td className="py-2">Inactivity penalty</td><td className="text-right">-0 pts</td></tr>
            <tr><td className="py-2 font-semibold">Total this sprint</td><td className="text-right font-bold text-primary">{total} pts</td></tr>
          </tbody>
        </table>
      </section>

      <div className="flex gap-2">
        <Link to="/collaboration/sprint/$id" params={{ id }} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Back to Sprint</Link>
        <Link to="/collaboration/sprint/$id/report/team" params={{ id }} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">View Team Report</Link>
      </div>
    </main>
  );
}
