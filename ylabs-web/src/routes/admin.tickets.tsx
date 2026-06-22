import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard, Panel } from "@/components/admin/AdminShell";
import { Ticket, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/tickets")({ component: TicketsPage });

const TYPES = ["Feature","Bug Fix","Refactor","Optimization","Security Patch","DB Migration","Incident","Code Review","Deployment"];

const TICKETS = [
  { id: "TCK-4201", title: "Add idempotency keys to checkout API", type: "Feature", prio: "P1", diff: "Hard", role: "BE", est: "4h", status: "open" },
  { id: "TCK-4202", title: "Fix payment retry exception swallow", type: "Bug Fix", prio: "P0", diff: "Medium", role: "BE", est: "2h", status: "in-progress" },
  { id: "TCK-4203", title: "Refactor user service into hex arch", type: "Refactor", prio: "P2", diff: "Hard", role: "BE", est: "8h", status: "review" },
  { id: "TCK-4204", title: "Optimize product search query", type: "Optimization", prio: "P1", diff: "Medium", role: "DBA", est: "3h", status: "open" },
  { id: "TCK-4205", title: "Patch JWT validation CVE", type: "Security Patch", prio: "P0", diff: "Hard", role: "Security", est: "2h", status: "open" },
  { id: "TCK-4206", title: "Migrate orders table to partitioned schema", type: "DB Migration", prio: "P1", diff: "Hard", role: "DBA", est: "6h", status: "in-progress" },
  { id: "TCK-4207", title: "Resolve cart-service 5xx spike", type: "Incident", prio: "P0", diff: "Hard", role: "SRE", est: "—", status: "open" },
  { id: "TCK-4208", title: "Review pagination PR", type: "Code Review", prio: "P3", diff: "Easy", role: "FE", est: "1h", status: "done" },
];

function TicketsPage() {
  return (
    <AdminShell title="Tickets" breadcrumb={["Engineering","Tickets"]} right={
      <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New ticket</button>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total tickets" value="14,892" color="primary" icon={Ticket} />
        <KpiCard label="In progress" value="612" color="warning" />
        <KpiCard label="Solved (24h)" value="8,941" delta="+18%" color="success" />
        <KpiCard label="Avg resolution" value="3.4h" color="ui" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map(t => <button key={t} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent">{t}</button>)}
      </div>

      <Panel title="Ticket queue">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["ID","Title","Type","Priority","Difficulty","Role","ETA","Status"].map(h => <th key={h} className="text-left font-medium px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {TICKETS.map(t => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.id}</td>
                  <td className="px-3 py-2.5 font-medium">{t.title}</td>
                  <td className="px-3 py-2.5"><Badge tone="ui">{t.type}</Badge></td>
                  <td className="px-3 py-2.5"><Badge tone={t.prio === "P0" ? "destructive" : t.prio === "P1" ? "warning" : "muted"}>{t.prio}</Badge></td>
                  <td className="px-3 py-2.5"><Badge tone={t.diff === "Hard" ? "destructive" : t.diff === "Medium" ? "warning" : "success"}>{t.diff}</Badge></td>
                  <td className="px-3 py-2.5 text-xs">{t.role}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{t.est}</td>
                  <td className="px-3 py-2.5"><Badge tone={t.status === "done" ? "success" : t.status === "open" ? "primary" : t.status === "review" ? "ui" : "warning"}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
