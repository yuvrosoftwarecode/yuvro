import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/admin/institutions")({ component: InstitutionsPage });

const C = [
  { n: "IIT Bombay", s: 4218, a: 3284, p: 92, c: 88, r: 94 },
  { n: "BITS Pilani", s: 3920, a: 3018, p: 90, c: 85, r: 91 },
  { n: "VIT", s: 5210, a: 3812, p: 86, c: 82, r: 88 },
  { n: "NIT Trichy", s: 2814, a: 2018, p: 88, c: 84, r: 89 },
  { n: "Anna University", s: 6120, a: 4218, p: 81, c: 78, r: 84 },
];

function InstitutionsPage() {
  return (
    <AdminShell title="Institutions" breadcrumb={["People","Institutions"]}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Partner colleges" value="148" color="primary" icon={GraduationCap} />
        <KpiCard label="Students enrolled" value="284,128" color="ui" />
        <KpiCard label="Active learners" value="48,127" color="success" />
        <KpiCard label="Placement readiness" value="86%" color="warning" />
      </div>

      <Panel title="College performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["College","Students","Active","Practical","Collab","Placement"].map(h => <th key={h} className="text-left font-medium px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {C.map(r => (
                <tr key={r.n} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-medium">{r.n}</td>
                  <td className="px-3 py-2.5 font-mono">{r.s.toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-mono">{r.a.toLocaleString()}</td>
                  <td className="px-3 py-2.5"><Badge tone="primary">{r.p}</Badge></td>
                  <td className="px-3 py-2.5"><Badge tone="ui">{r.c}</Badge></td>
                  <td className="px-3 py-2.5"><Badge tone="success">{r.r}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
