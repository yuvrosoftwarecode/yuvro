import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { Cpu, Container, HardDrive, DollarSign, Activity } from "lucide-react";

export const Route = createFileRoute("/admin/infrastructure")({ component: InfraPage });

function InfraPage() {
  return (
    <AdminShell title="Infrastructure" breadcrumb={["Operations","Infrastructure"]}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Containers running" value="4,128" color="primary" icon={Container} />
        <KpiCard label="CPU usage" value="62%" color="ui" icon={Cpu} />
        <KpiCard label="Memory usage" value="71%" color="warning" icon={HardDrive} />
        <KpiCard label="AI cost (24h)" value="$1,284" color="success" icon={DollarSign} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Execution queue">
          <div className="space-y-3 text-sm">
            {[
              { l: "Queued jobs", v: 184, c: "primary" },
              { l: "In-progress", v: 1284, c: "ui" },
              { l: "Failed (1h)", v: 12, c: "warning" },
              { l: "Avg wait time", v: "240ms", c: "success" },
            ].map(x => (
              <div key={x.l} className="flex items-center justify-between border-b border-border/40 last:border-0 py-2">
                <span className="text-muted-foreground">{x.l}</span>
                <span className="font-mono" style={{ color: `var(--${x.c})` }}>{x.v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Workspace health" action={<Badge tone="success">healthy</Badge>}>
          <div className="space-y-2 text-sm">
            {[
              { l: "API gateway", c: "success" },
              { l: "Code execution sandbox", c: "success" },
              { l: "AI Mentor service", c: "success" },
              { l: "Realtime collaboration", c: "warning" },
              { l: "Object storage", c: "success" },
              { l: "Database (primary)", c: "success" },
              { l: "Database (read replica)", c: "success" },
            ].map(x => (
              <div key={x.l} className="flex items-center justify-between">
                <span>{x.l}</span>
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: `var(--${x.c})` }}>
                  <Activity className="h-3 w-3" /> {x.c === "warning" ? "degraded" : "operational"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Storage usage">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Source code", v: "1.4 TB" },
            { l: "Container images", v: "8.2 TB" },
            { l: "Logs", v: "4.1 TB" },
            { l: "Artifacts", v: "2.6 TB" },
          ].map(x => (
            <div key={x.l} className="rounded-md border border-border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">{x.l}</div>
              <div className="font-semibold mt-1 font-mono">{x.v}</div>
            </div>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
