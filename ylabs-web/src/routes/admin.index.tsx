import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import {
  Users, FlaskConical, Network, GitBranch, AlertTriangle, CheckCircle2, Bot,
  GitPullRequest, ShieldCheck, Rocket, Container, Activity, Cpu, HardDrive,
  DollarSign, Timer, ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: CommandCenter });

const kpis = [
  { label: "Active Users (today)", value: "48,127", delta: "+12.4%", color: "primary", icon: Users },
  { label: "Active Labs", value: "1,284", delta: "+3.1%", color: "ui", icon: FlaskConical },
  { label: "Active Teams", value: "417", delta: "+8.0%", color: "success", icon: Network },
  { label: "Active Sprint Rooms", value: "612", delta: "+22", color: "primary", icon: GitBranch },
  { label: "Active Incidents", value: "9", delta: "+2 critical", color: "destructive", icon: AlertTriangle },
  { label: "Tickets Solved", value: "8,941", delta: "+18.2%", color: "success", icon: CheckCircle2 },
  { label: "AI Sessions", value: "23,612", delta: "+9.4%", color: "ui", icon: Bot },
  { label: "PR Reviews", value: "3,128", delta: "+6.7%", color: "primary", icon: GitPullRequest },
  { label: "QA Reviews", value: "1,902", delta: "+4.1%", color: "ui", icon: ShieldCheck },
  { label: "Deployments", value: "417", delta: "+11.3%", color: "success", icon: Rocket },
  { label: "Container Execs", value: "184,210", delta: "+15.6%", color: "primary", icon: Container },
  { label: "Platform Health", value: "99.94%", delta: "operational", color: "success", icon: Activity },
];

const activity = [
  { who: "Rohith S.", what: "completed", target: "Java Sprint #24", time: "just now", tone: "success" as const },
  { who: "Team Velocity", what: "completed", target: "Checkout Sprint", time: "2m ago", tone: "primary" as const },
  { who: "Incident Room #12", what: "resolved", target: "Auth service outage", time: "4m ago", tone: "warning" as const },
  { who: "College ABC", what: "crossed", target: "10,000 practical submissions", time: "12m ago", tone: "ui" as const },
  { who: "PR #421", what: "approved by", target: "AI Reviewer", time: "18m ago", tone: "success" as const },
  { who: "Sana A.", what: "deployed", target: "feature/payments-retry to staging", time: "21m ago", tone: "primary" as const },
  { who: "Incident Room #14", what: "escalated", target: "P1 — DB latency spike", time: "32m ago", tone: "destructive" as const },
  { who: "Recruiter Lina P.", what: "shortlisted", target: "8 candidates from SQL Lab", time: "44m ago", tone: "ui" as const },
];

function CommandCenter() {
  return (
    <AdminShell title="Yuvro Labs Operations Center" breadcrumb={["Command Center"]} right={
      <div className="flex items-center gap-2">
        <Badge tone="success">All green</Badge>
        <Link to="/admin/intelligence" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Open Intelligence →</Link>
      </div>
    }>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Platform activity (14d)" action={<select className="text-xs bg-transparent border border-border rounded-md px-2 py-1"><option>Last 14 days</option><option>Last 30 days</option></select>}>
            <div className="h-56 flex items-end gap-1.5">
              {[40, 65, 50, 80, 60, 95, 72, 88, 70, 92, 78, 100, 85, 96].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-ui/60 hover:from-primary hover:to-ui transition" style={{ height: `${h}%` }} title={`${h * 120} events`} />
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="Platform health" action={<Badge tone="success">healthy</Badge>}>
          <div className="space-y-3 text-sm">
            {[
              { l: "Running containers", v: "4,128", i: Container, c: "primary" },
              { l: "Failed executions (1h)", v: "12", i: AlertTriangle, c: "warning" },
              { l: "CPU usage", v: "62%", i: Cpu, c: "ui" },
              { l: "Memory usage", v: "71%", i: HardDrive, c: "ui" },
              { l: "AI cost today", v: "$1,284.42", i: DollarSign, c: "success" },
              { l: "Avg exec time", v: "342ms", i: Timer, c: "primary" },
              { l: "Queue status", v: "healthy", i: ListChecks, c: "success" },
            ].map((x) => (
              <div key={x.l} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground text-xs"><x.i className="h-3.5 w-3.5" style={{ color: `var(--${x.c})` }} /> {x.l}</span>
                <span className="text-xs font-mono">{x.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Live activity feed" action={<Badge tone="primary">real-time</Badge>}>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border-b border-border/40 last:border-0 py-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: `var(--${a.tone})` }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{a.who}</span>{" "}
                    <span className="text-muted-foreground">{a.what}</span>{" "}
                    <span>{a.target}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{a.time}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="Top labs (24h)">
          <div className="space-y-3 text-sm">
            {[
              { l: "Java Backend", v: 4280, c: "primary" },
              { l: "Frontend / UI", v: 3920, c: "ui" },
              { l: "SQL", v: 3110, c: "warning" },
              { l: "DevOps", v: 2540, c: "success" },
              { l: "Security", v: 1880, c: "destructive" },
              { l: "System Design", v: 1620, c: "primary" },
            ].map((x) => (
              <div key={x.l}>
                <div className="flex items-center justify-between text-xs mb-1"><span>{x.l}</span><span className="text-muted-foreground">{x.v.toLocaleString()}</span></div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(x.v / 4280) * 100}%`, background: `var(--${x.c})` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
