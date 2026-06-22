import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/admin/recruiters")({ component: RecruitersPage });

const REC = [
  { name: "Lina Park", company: "Acme Bank", viewed: 412, downloaded: 184, shortlisted: 62 },
  { name: "Marco Diaz", company: "FinTrust", viewed: 318, downloaded: 142, shortlisted: 41 },
  { name: "Ana Yu", company: "DataCorp", viewed: 284, downloaded: 96, shortlisted: 33 },
  { name: "Kenji Tanaka", company: "Stripe Labs", viewed: 248, downloaded: 88, shortlisted: 28 },
  { name: "Rita Okafor", company: "HealthGrid", viewed: 192, downloaded: 71, shortlisted: 22 },
];

function RecruitersPage() {
  return (
    <AdminShell title="Recruiters" breadcrumb={["People","Recruiters"]}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Active recruiters" value="284" color="primary" icon={Briefcase} />
        <KpiCard label="Profiles viewed (7d)" value="14,892" color="ui" />
        <KpiCard label="Reports downloaded" value="3,182" color="success" />
        <KpiCard label="Shortlists created" value="612" color="warning" />
      </div>

      <Panel title="Recruiter activity">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["Recruiter","Company","Profiles viewed","Reports downloaded","Shortlists","Status"].map(h => <th key={h} className="text-left font-medium px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {REC.map(r => (
                <tr key={r.name} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-medium">{r.name}</td>
                  <td className="px-3 py-2.5">{r.company}</td>
                  <td className="px-3 py-2.5 font-mono">{r.viewed}</td>
                  <td className="px-3 py-2.5 font-mono">{r.downloaded}</td>
                  <td className="px-3 py-2.5 font-mono">{r.shortlisted}</td>
                  <td className="px-3 py-2.5"><Badge tone="success">verified</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
