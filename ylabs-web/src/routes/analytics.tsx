import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { labs, me } from "@/lib/dummy";
import { TrendingUp, Clock, Target, Flame } from "lucide-react";

export const Route = createFileRoute("/analytics")({ component: Analytics });

const weekly = [12, 18, 9, 22, 30, 16, 25];
const max = Math.max(...weekly);

function Analytics() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Analytics & Progress</h1>
          <p className="text-sm text-muted-foreground">A deep look at your learning velocity, skill mastery, and consistency.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi icon={<Target className="h-4 w-4 text-primary" />} label="Tickets solved" value={`${me.totalSolved}`} delta="+5 this week" />
          <Kpi icon={<Flame className="h-4 w-4 text-warning" />} label="Streak" value={`${me.streak}d`} delta="Personal best 12d" />
          <Kpi icon={<Clock className="h-4 w-4 text-info" />} label="Avg solve time" value="38m" delta="-12% MoM" />
          <Kpi icon={<TrendingUp className="h-4 w-4 text-success" />} label="Accuracy" value="86%" delta="+4 pts" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Weekly activity</div>
              <div className="text-xs text-muted-foreground">XP per day · last 7 days</div>
            </div>
            <div className="mt-6 flex items-end gap-3 h-48">
              {weekly.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-md bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${(v / max) * 100}%` }} />
                  <span className="text-[10px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="text-sm font-medium">Lab mastery</div>
            <div className="mt-4 space-y-4">
              {labs.map((l) => {
                const pct = Math.round((l.completed / l.total) * 100);
                return (
                  <div key={l.slug}>
                    <div className="flex justify-between text-xs"><span>{l.icon} {l.name}</span><span className="text-muted-foreground">{pct}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: `var(--${l.color})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <div className="text-sm font-medium">Skill radar — Java</div>
            <Radar values={[85, 65, 45, 30, 70, 55]} labels={["Syntax", "OOP", "Errors", "Collections", "Streams", "Testing"]} />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="text-sm font-medium">Heatmap (last 12 weeks)</div>
            <div className="mt-4 grid grid-cols-12 gap-1.5">
              {Array.from({ length: 7 * 12 }).map((_, i) => {
                const v = Math.floor(Math.random() * 5);
                const op = [0.08, 0.25, 0.45, 0.7, 1][v];
                return <div key={i} className="h-4 rounded-sm" style={{ background: `color-mix(in oklab, var(--primary) ${op * 100}%, transparent)` }} />;
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              less <span className="h-3 w-3 rounded-sm bg-muted" /> <span className="h-3 w-3 rounded-sm bg-primary/30" /> <span className="h-3 w-3 rounded-sm bg-primary/60" /> <span className="h-3 w-3 rounded-sm bg-primary" /> more
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-success mt-1">{delta}</div>
    </div>
  );
}

function Radar({ values, labels }: { values: number[]; labels: string[] }) {
  const size = 240, cx = size / 2, cy = size / 2, r = 95;
  const angle = (i: number) => (Math.PI * 2 * i) / values.length - Math.PI / 2;
  const point = (v: number, i: number) => [cx + Math.cos(angle(i)) * r * (v / 100), cy + Math.sin(angle(i)) * r * (v / 100)];
  const poly = values.map((v, i) => point(v, i).join(",")).join(" ");
  return (
    <svg width={size} height={size} className="mx-auto mt-2">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={values.map((_, i) => [cx + Math.cos(angle(i)) * r * s, cy + Math.sin(angle(i)) * r * s].join(",")).join(" ")}
          fill="none" stroke="var(--border)" />
      ))}
      <polygon points={poly} fill="color-mix(in oklab, var(--primary) 25%, transparent)" stroke="var(--primary)" strokeWidth={1.5} />
      {labels.map((l, i) => {
        const [x, y] = point(115, i);
        return <text key={l} x={x} y={y} textAnchor="middle" className="fill-muted-foreground text-[10px]">{l}</text>;
      })}
    </svg>
  );
}
