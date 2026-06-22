import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Database, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/admin/questions")({ component: QuestionsPage });

const CATS = ["Java","Python","React","SQL","DevOps","Security","System Design","Testing","Debugging","Code Reviews"];
const TYPES = ["Coding Task","Bug Scenario","Debugging Case","Security Vuln","Optimization","Database Issue","API Problem","Deployment Failure"];

const ITEMS = [
  { id: "Q-001", title: "Fix payment retry failure", skills: ["Exception Handling","API Reliability","Retry Logic"], cat: "Java", type: "Bug Scenario", diff: "Medium", usage: 412, success: 64 },
  { id: "Q-002", title: "SQL: optimize multi-join report query", skills: ["Indexes","Query Plan","Joins"], cat: "SQL", type: "Optimization", diff: "Hard", success: 38, usage: 284 },
  { id: "Q-003", title: "Patch JWT verification bypass", skills: ["JWT","OAuth","Crypto"], cat: "Security", type: "Security Vuln", diff: "Hard", success: 42, usage: 158 },
  { id: "Q-004", title: "Debug React infinite re-render", skills: ["React","Hooks","Memoization"], cat: "React", type: "Debugging Case", diff: "Medium", success: 71, usage: 322 },
  { id: "Q-005", title: "Migrate orders to partitioned schema", skills: ["DDL","Migrations","Postgres"], cat: "SQL", type: "Database Issue", diff: "Hard", success: 49, usage: 96 },
  { id: "Q-006", title: "Implement circuit breaker in REST client", skills: ["Resilience","Patterns","HTTP"], cat: "Java", type: "Coding Task", diff: "Medium", success: 58, usage: 248 },
];

function QuestionsPage() {
  return (
    <AdminShell title="Question Bank" breadcrumb={["Engineering","Question Bank"]} right={
      <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New item</button>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total items" value="4,812" color="primary" icon={Database} />
        <KpiCard label="Avg success rate" value="56%" color="warning" />
        <KpiCard label="Attached to sprints" value="3,148" color="ui" />
        <KpiCard label="Items added (7d)" value="124" delta="+18" color="success" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input placeholder="Search question bank…" className="bg-transparent outline-none flex-1" />
          </div>
          <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5"><option>All categories</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5"><option>All types</option>{TYPES.map(c => <option key={c}>{c}</option>)}</select>
          <select className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5"><option>All difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {ITEMS.map(q => (
          <div key={q.id} className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/40 transition">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-muted-foreground">{q.id}</span>
              <Badge tone={q.diff === "Hard" ? "destructive" : "warning"}>{q.diff}</Badge>
            </div>
            <h3 className="font-semibold mb-2">{q.title}</h3>
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge tone="primary">{q.cat}</Badge>
              <Badge tone="ui">{q.type}</Badge>
              {q.skills.map(s => <Badge key={s} tone="muted">{s}</Badge>)}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Usage <span className="font-mono text-foreground">{q.usage}</span></span>
              <span className="text-muted-foreground">Success <span className="font-mono text-foreground">{q.success}%</span></span>
              <button className="text-primary hover:underline">Edit →</button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
