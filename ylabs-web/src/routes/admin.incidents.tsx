import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard, Panel } from "@/components/admin/AdminShell";
import { AlertTriangle, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/incidents")({ component: IncidentsPage });

const INC = [
  { id: "INC-014", title: "Payment Service Down", sev: "P0", services: ["payments","cart"], status: "active" },
  { id: "INC-013", title: "Database Latency Spike", sev: "P1", services: ["orders-db"], status: "investigating" },
  { id: "INC-012", title: "Authentication Failure", sev: "P0", services: ["auth"], status: "resolved" },
  { id: "INC-011", title: "Server Memory Leak", sev: "P2", services: ["catalog"], status: "monitoring" },
];

function IncidentsPage() {
  return (
    <AdminShell title="Incident Rooms" breadcrumb={["Engineering","Incidents"]} right={
      <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Create incident</button>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Active incidents" value="9" color="destructive" icon={AlertTriangle} />
        <KpiCard label="P0 / P1" value="3 / 4" color="warning" />
        <KpiCard label="MTTR" value="48m" color="ui" />
        <KpiCard label="Resolved (7d)" value="42" color="success" />
      </div>

      <Panel title="Incident queue">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["ID","Title","Severity","Services","Status","Actions"].map(h => <th key={h} className="text-left font-medium px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {INC.map(i => (
                <tr key={i.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{i.id}</td>
                  <td className="px-3 py-2.5 font-medium">{i.title}</td>
                  <td className="px-3 py-2.5"><Badge tone={i.sev === "P0" ? "destructive" : i.sev === "P1" ? "warning" : "muted"}>{i.sev}</Badge></td>
                  <td className="px-3 py-2.5 space-x-1">{i.services.map(s => <Badge key={s} tone="ui">{s}</Badge>)}</td>
                  <td className="px-3 py-2.5"><Badge tone={i.status === "resolved" ? "success" : i.status === "active" ? "destructive" : "warning"}>{i.status}</Badge></td>
                  <td className="px-3 py-2.5 text-xs space-x-2"><button className="text-primary hover:underline">Open room</button><button className="text-muted-foreground hover:underline">Logs</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
