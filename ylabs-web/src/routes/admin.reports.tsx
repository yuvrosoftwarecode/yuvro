import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Panel } from "@/components/admin/AdminShell";
import { FileText, Download } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

const REPORTS = [
  { c: "User Reports", desc: "Skill progress, sprint outcomes, AI usage per learner." },
  { c: "Lab Reports", desc: "Lab health: completion, satisfaction, drop-off points." },
  { c: "Sprint Reports", desc: "Sprint velocity, role mix, ticket throughput." },
  { c: "Team Reports", desc: "Team chemistry, reliability, mentor ratings." },
  { c: "Recruiter Reports", desc: "Funnel: views → downloads → shortlists." },
  { c: "Institution Reports", desc: "Cohort outcomes by college / department." },
  { c: "AI Reports", desc: "Mentor usage, cost, top weak topics surfaced." },
];

function ReportsPage() {
  return (
    <AdminShell title="Reports Center" breadcrumb={["Platform","Reports"]}>
      <Panel title="Generate reports">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTS.map(r => (
            <div key={r.c} className="rounded-lg border border-border p-4 hover:border-primary/40 transition">
              <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">{r.c}</span></div>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <div className="flex items-center gap-2">
                <button className="text-xs px-2.5 py-1 rounded border border-border hover:bg-accent">Configure</button>
                <button className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground inline-flex items-center gap-1"><Download className="h-3 w-3" /> Run</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
