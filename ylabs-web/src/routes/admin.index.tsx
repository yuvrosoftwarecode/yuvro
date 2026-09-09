import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import {
  Users,
  FlaskConical,
  GitPullRequest,
  Activity,
  Cpu,
  HardDrive,
  DollarSign,
  Timer,
  ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

const kpis = [
  {
    label: "Active Users (today)",
    value: "48,127",
    delta: "+12.4%",
    color: "primary",
    icon: Users,
  },
  { label: "Active Courses", value: "127", delta: "+5.2%", color: "success", icon: FlaskConical },
  {
    label: "Active Sessions",
    value: "2,891",
    delta: "+18.3%",
    color: "ui",
    icon: Activity,
  },
];

function AdminIndex() {
  return (
    <AdminShell
      title="Yuvro Labs Admin"
      breadcrumb={["Admin"]}
      right={
        <div className="flex items-center gap-2">
          <Badge tone="success">All systems operational</Badge>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel
            title="Platform activity (14d)"
            action={
              <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1">
                <option>Last 14 days</option>
                <option>Last 30 days</option>
              </select>
            }
          >
            <div className="h-56 flex items-end gap-1.5">
              {[40, 65, 50, 80, 60, 95, 72, 88, 70, 92, 78, 100, 85, 96].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-ui/60 hover:from-primary hover:to-ui transition"
                  style={{ height: `${h}%` }}
                  title={`${h * 120} events`}
                />
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="Platform health" action={<Badge tone="success">healthy</Badge>}>
          <div className="space-y-3 text-sm">
            {[
              { l: "Running containers", v: "4,128", i: Cpu, c: "primary" },
              { l: "Failed executions (1h)", v: "12", i: ListChecks, c: "warning" },
              { l: "CPU usage", v: "62%", i: Cpu, c: "ui" },
              { l: "Memory usage", v: "71%", i: HardDrive, c: "ui" },
              { l: "AI cost today", v: "$1,284.42", i: DollarSign, c: "success" },
              { l: "Avg exec time", v: "342ms", i: Timer, c: "primary" },
            ].map((x) => (
              <div key={x.l} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                  <x.i className="h-3.5 w-3.5" style={{ color: `var(--${x.c})` }} /> {x.l}
                </span>
                <span className="text-xs font-mono">{x.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
