import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { useState } from "react";

export const Route = createFileRoute("/admin/users/$id")({ component: UserProfile });

const TABS = ["Overview", "Labs", "Sprint History", "Collaboration", "Achievements", "Reports", "AI Usage"] as const;

function UserProfile() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <AdminShell title="User profile" breadcrumb={["People", "Users", id]} right={
      <div className="flex items-center gap-2">
        <Link to="/admin/users" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">← Back</Link>
        <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Reset password</button>
        <button className="text-xs px-3 py-1.5 rounded-md border border-warning/40 text-warning hover:bg-warning/10">Suspend</button>
      </div>
    }>
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-ui text-primary-foreground text-xl font-semibold">P</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Priya Sharma</h2>
              <Badge tone="success">active</Badge>
              <Badge tone="muted">Student</Badge>
            </div>
            <div className="text-sm text-muted-foreground">priya@yuvrolabs.com · BITS Pilani · ID {id}</div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span><span className="text-muted-foreground">Skill</span> <span className="font-mono font-semibold">87</span></span>
              <span><span className="text-muted-foreground">Collab</span> <span className="font-mono font-semibold">91</span></span>
              <span><span className="text-muted-foreground">Reliability</span> <span className="font-mono font-semibold">94</span></span>
              <span><span className="text-muted-foreground">Joined</span> 14 Mar 2025</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Tickets solved" value="248" color="primary" />
        <KpiCard label="Sprints completed" value="32" color="ui" />
        <KpiCard label="Reviews given" value="118" color="success" />
        <KpiCard label="Support score" value="9.4 / 10" color="success" />
        <KpiCard label="Incidents joined" value="14" color="warning" />
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border/60">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>

      <Panel title={tab}>
        {tab === "Overview" && (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Strengths</div>
              {["Java Spring Boot","REST API design","SQL Optimization"].map(s => <Badge key={s} tone="success">{s}</Badge>)}
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Growth areas</div>
              {["System Design","Caching","Distributed Tracing"].map(s => <Badge key={s} tone="warning">{s}</Badge>)}
            </div>
          </div>
        )}
        {tab !== "Overview" && <div className="text-sm text-muted-foreground">Detailed {tab.toLowerCase()} timeline rendered here from production data.</div>}
      </Panel>
    </AdminShell>
  );
}
