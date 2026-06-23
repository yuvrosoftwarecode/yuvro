import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Plus, GitBranch } from "lucide-react";

export const Route = createFileRoute("/admin/sprints")({ component: SprintsPage });

const TEMPLATES = [
  { name: "E-Commerce Checkout", dur: "2 weeks", diff: "Medium", domain: "E-Commerce", roles: ["FE","BE","QA","DevOps"], used: 312 },
  { name: "Banking Transaction", dur: "3 weeks", diff: "Hard", domain: "Fintech", roles: ["BE","DBA","Security","QA"], used: 184 },
  { name: "Food Delivery", dur: "2 weeks", diff: "Medium", domain: "Logistics", roles: ["FE","BE","Mobile","QA"], used: 221 },
  { name: "Healthcare Portal", dur: "3 weeks", diff: "Hard", domain: "Health", roles: ["FE","BE","Security","Compliance"], used: 96 },
  { name: "Social Media", dur: "2 weeks", diff: "Medium", domain: "Social", roles: ["FE","BE","ML","QA"], used: 158 },
  { name: "Startup MVP", dur: "4 weeks", diff: "Hard", domain: "Startup", roles: ["FullStack","Designer","PM"], used: 412 },
  { name: "Security Incident", dur: "1 week", diff: "Hard", domain: "Security", roles: ["SecEng","SRE","BE"], used: 78 },
  { name: "Production Outage", dur: "3 days", diff: "Hard", domain: "SRE", roles: ["SRE","BE","DBA"], used: 144 },
];

function SprintsPage() {
  return (
    <AdminShell title="Sprint Templates" breadcrumb={["Engineering","Sprint Templates"]} right={
      <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New template</button>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Templates" value="48" color="primary" icon={GitBranch} />
        <KpiCard label="Active rooms" value="612" delta="+22" color="success" />
        <KpiCard label="Roles defined" value="14" color="ui" />
        <KpiCard label="Completion rate" value="64%" color="warning" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map(t => (
          <div key={t.name} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5 hover:border-primary/40 transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{t.name}</h3>
              <Badge tone={t.diff === "Hard" ? "destructive" : "warning"}>{t.diff}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-3">{t.domain} · {t.dur}</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {t.roles.map(r => <Badge key={r} tone="primary">{r}</Badge>)}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Used <span className="font-mono text-foreground">{t.used}</span> times</span>
              <button className="text-primary hover:underline">Edit →</button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
