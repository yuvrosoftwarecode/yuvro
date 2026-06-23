import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/admin/ai-mentor")({ component: AIMentorPage });

function AIMentorPage() {
  return (
    <AdminShell title="AI Mentor" breadcrumb={["Platform","AI Mentor"]}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Hints generated (24h)" value="48,217" color="primary" icon={Bot} />
        <KpiCard label="Reviews generated" value="9,184" color="ui" />
        <KpiCard label="Avg helpfulness" value="4.6 / 5" color="success" />
        <KpiCard label="AI cost (24h)" value="$1,284.42" color="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Rule configuration">
          {["Hint rules","Debug rules","Review rules","Learning paths","Weak skill detection"].map(r => (
            <div key={r} className="flex items-center justify-between border-b border-border/40 last:border-0 py-2.5">
              <span className="text-sm">{r}</span>
              <button className="text-xs px-2 py-1 rounded border border-border hover:bg-accent">Edit</button>
            </div>
          ))}
        </Panel>
        <Panel title="Most asked topics">
          <div className="space-y-2 text-sm">
            {[
              { l: "Caching strategies", v: 1820, c: "primary" },
              { l: "SQL optimization", v: 1640, c: "warning" },
              { l: "API retry / idempotency", v: 1418, c: "ui" },
              { l: "React state management", v: 1290, c: "success" },
              { l: "JWT / OAuth flows", v: 1102, c: "destructive" },
            ].map(x => (
              <div key={x.l}>
                <div className="flex justify-between text-xs mb-1"><span>{x.l}</span><span className="font-mono">{x.v}</span></div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(x.v/1820)*100}%`, background: `var(--${x.c})` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Weak skills across platform">
        <div className="flex flex-wrap gap-2">
          {["Caching","SQL Optimization","API Security","Distributed Tracing","Concurrency","System Design","Memory Profiling","Idempotency"].map(s => (
            <Badge key={s} tone="warning">{s}</Badge>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
