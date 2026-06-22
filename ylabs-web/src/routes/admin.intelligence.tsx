import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Panel, KpiCard, Badge } from "@/components/admin/AdminShell";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/admin/intelligence")({ component: IntelligencePage });

function IntelligencePage() {
  return (
    <AdminShell title="Engineering Intelligence Center" breadcrumb={["Operations","Intelligence"]}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Signals tracked" value="248" color="primary" icon={Brain} />
        <KpiCard label="Weak skills surfaced" value="14" color="warning" />
        <KpiCard label="Drop-off points" value="22" color="destructive" />
        <KpiCard label="Top trend" value="Caching ↑" color="ui" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Most failed tickets">
          <div className="space-y-2">
            {[
              { t: "Fix payment retry failure", r: 412, s: 38 },
              { t: "Optimize report SQL", r: 284, s: 34 },
              { t: "Patch JWT verification", r: 158, s: 42 },
              { t: "Circuit breaker REST client", r: 248, s: 51 },
            ].map(x => (
              <div key={x.t} className="flex items-center justify-between text-sm border-b border-border/40 last:border-0 py-2">
                <span>{x.t}</span>
                <span className="text-xs"><Badge tone="destructive">{x.s}%</Badge> <span className="text-muted-foreground ml-2 font-mono">{x.r} attempts</span></span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Most difficult skills">
          <div className="space-y-2 text-sm">
            {[
              { l: "SQL Optimization", v: 34 },
              { l: "Caching", v: 38 },
              { l: "API Security", v: 42 },
              { l: "Distributed Tracing", v: 46 },
              { l: "Concurrency", v: 49 },
            ].map(x => (
              <div key={x.l}>
                <div className="flex justify-between text-xs mb-1"><span>{x.l}</span><span className="font-mono">{x.v}% success</span></div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden"><div className="h-full rounded-full bg-destructive" style={{ width: `${x.v}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Top performing labs">
          <ul className="text-sm space-y-2">
            {["Java Spring Boot","React E-Commerce","System Design: Chat","DevOps CI/CD","SQL Optimization"].map(l => <li key={l} className="flex items-center justify-between border-b border-border/40 last:border-0 py-1.5"><span>{l}</span><Badge tone="success">↑</Badge></li>)}
          </ul>
        </Panel>
        <Panel title="Drop-off points">
          <ul className="text-sm space-y-2">
            {[
              "Sprint 3 / Ticket #4 (Banking)",
              "Sprint 2 / Ticket #6 (Healthcare)",
              "Sprint 5 / Ticket #2 (Checkout)",
              "Sprint 1 / Ticket #8 (Outage)",
            ].map(l => <li key={l} className="border-b border-border/40 last:border-0 py-1.5">{l}</li>)}
          </ul>
        </Panel>
        <Panel title="Learning trends">
          <ul className="text-sm space-y-2">
            {["Caching ↑ 18%","Distributed systems ↑ 14%","Security ↑ 9%","Frontend perf ↓ 4%","Manual QA ↓ 11%"].map(l => <li key={l} className="border-b border-border/40 last:border-0 py-1.5">{l}</li>)}
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}
