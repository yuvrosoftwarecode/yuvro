import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, Panel } from "@/components/admin/AdminShell";
import { AlertTriangle, Activity, Bell, Briefcase, GraduationCap, ShieldAlert, DollarSign, Bug } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({ component: NotificationsPage });

const N = [
  { i: AlertTriangle, t: "P0 incident — Payment Service Down", time: "2m ago", tone: "destructive" as const, cat: "Platform failure" },
  { i: ShieldAlert, t: "Abuse report: spam in Forum thread #284", time: "12m ago", tone: "warning" as const, cat: "Abuse" },
  { i: DollarSign, t: "AI cost crossed daily threshold ($1,250)", time: "18m ago", tone: "warning" as const, cat: "AI cost" },
  { i: Activity, t: "Realtime collaboration latency elevated (240→480ms)", time: "32m ago", tone: "warning" as const, cat: "Infra alert" },
  { i: Briefcase, t: "Recruiter Lina P. shortlisted 8 candidates", time: "44m ago", tone: "ui" as const, cat: "Recruiter" },
  { i: GraduationCap, t: "College ABC crossed 10,000 practical submissions", time: "1h ago", tone: "primary" as const, cat: "College" },
  { i: Bug, t: "User report: workspace freeze in Lab #221", time: "2h ago", tone: "warning" as const, cat: "User report" },
  { i: AlertTriangle, t: "Incident escalated: DB latency spike", time: "3h ago", tone: "destructive" as const, cat: "Escalation" },
];

function NotificationsPage() {
  return (
    <AdminShell title="Notifications Center" breadcrumb={["Operations","Notifications"]} right={
      <div className="flex items-center gap-2">
        <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Mark all read</button>
        <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Settings</button>
      </div>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: "Critical (24h)", v: 3, c: "destructive" },
          { l: "Warnings", v: 12, c: "warning" },
          { l: "Informational", v: 48, c: "primary" },
          { l: "Total today", v: 63, c: "ui" },
        ].map(x => (
          <div key={x.l} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{x.l}</span><Bell className="h-3.5 w-3.5" style={{ color: `var(--${x.c})` }} /></div>
            <div className="mt-2 text-2xl font-semibold">{x.v}</div>
          </div>
        ))}
      </div>

      <Panel title="Recent alerts">
        <div className="space-y-1">
          {N.map((n, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/40 last:border-0 py-2.5 text-sm">
              <n.i className="h-4 w-4" style={{ color: `var(--${n.tone})` }} />
              <div className="flex-1 min-w-0">
                <div className="truncate">{n.t}</div>
                <div className="text-[10px] text-muted-foreground">{n.cat}</div>
              </div>
              <Badge tone={n.tone}>{n.cat}</Badge>
              <span className="text-[10px] text-muted-foreground w-16 text-right">{n.time}</span>
            </div>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
