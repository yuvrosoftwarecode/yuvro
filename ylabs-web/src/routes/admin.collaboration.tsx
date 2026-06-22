import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { Network } from "lucide-react";

export const Route = createFileRoute("/admin/collaboration")({ component: CollabAdmin });

function CollabAdmin() {
  return (
    <AdminShell title="Collaboration Hub" breadcrumb={["Platform","Collaboration"]}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Active teams" value="417" color="primary" icon={Network} />
        <KpiCard label="Active sprints" value="612" color="ui" />
        <KpiCard label="Pair sessions" value="184" color="success" />
        <KpiCard label="Open requests" value="92" color="warning" />
        <KpiCard label="Incident rooms" value="9" color="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Top teams">
          <div className="space-y-2 text-sm">
            {[
              { n: "Velocity Squad", v: "98", t: "score" },
              { n: "Async Avengers", v: "96", t: "score" },
              { n: "Build Cats", v: "94", t: "score" },
              { n: "DebugDuo", v: "93", t: "score" },
              { n: "Ship Daily", v: "91", t: "score" },
            ].map(r => (
              <div key={r.n} className="flex items-center justify-between border-b border-border/40 last:border-0 py-2">
                <span className="font-medium">{r.n}</span>
                <span className="font-mono text-xs">{r.v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top contributors">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { c: "Best reviewers", n: "Sana A.", v: "412 reviews" },
              { c: "Best mentors", n: "Marcus K.", v: "298 mentees" },
              { c: "Highest reliability", n: "Priya S.", v: "99.2%" },
              { c: "Most helpful", n: "Diego R.", v: "841 thanks" },
            ].map(x => (
              <div key={x.c} className="rounded-md border border-border p-3">
                <div className="text-[10px] uppercase text-muted-foreground">{x.c}</div>
                <div className="font-semibold mt-1">{x.n}</div>
                <div className="text-xs text-muted-foreground">{x.v}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Team management" >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["Team","Owner","Members","Sprint","Status","Reports","Actions"].map(h => <th key={h} className="text-left font-medium px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {[
                ["Velocity Squad","Priya S.",5,"Checkout","active",0],
                ["Async Avengers","Marcus K.",4,"Banking","active",1],
                ["Build Cats","Sana A.",6,"Healthcare","review",0],
                ["DebugDuo","Diego R.",2,"Incident","active",0],
                ["Ship Daily","Aarav P.",5,"Startup MVP","active",2],
              ].map(r => (
                <tr key={r[0] as string} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-medium">{r[0]}</td>
                  <td className="px-3 py-2.5">{r[1]}</td>
                  <td className="px-3 py-2.5">{r[2]}</td>
                  <td className="px-3 py-2.5"><Badge tone="primary">{r[3]}</Badge></td>
                  <td className="px-3 py-2.5"><Badge tone={r[4] === "review" ? "warning" : "success"}>{r[4]}</Badge></td>
                  <td className="px-3 py-2.5">{r[5]}</td>
                  <td className="px-3 py-2.5 text-xs space-x-2">
                    <button className="text-primary hover:underline">View</button>
                    <button className="text-muted-foreground hover:underline">Transfer</button>
                    <button className="text-warning hover:underline">Resolve</button>
                    <button className="text-destructive hover:underline">Terminate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
