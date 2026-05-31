import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useCollab } from "@/lib/collab/store";
import { ALL_DOMAINS, DOMAIN_COLORS, type Domain } from "@/lib/collab/data";
import { Search, Inbox, CheckCircle2, Circle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/collaboration/browse")({ component: Browse });

function Browse() {
  const { sprints } = useCollab();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<Domain | "All">("All");
  const filtered = useMemo(() => sprints.filter(s =>
    (domain === "All" || s.domain === domain) &&
    (!q || s.title.toLowerCase().includes(q.toLowerCase()))
  ), [sprints, q, domain]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Browse Sprints</h1>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search sprint name..." className="pl-8 pr-3 py-2 text-sm rounded-md border bg-background w-full sm:w-72" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {(["All", ...ALL_DOMAINS] as const).map(d => (
          <button key={d} onClick={() => setDomain(d as any)}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${domain === d ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{d}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-16 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No sprints found in this domain yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const joined = s.members.filter(m => m.status === "joined" || m.status === "ai").length;
            const total = s.requiredRoles.length;
            const statusColors = { Open: "bg-success/15 text-success", "In Progress": "bg-warning/15 text-warning", Completed: "bg-muted text-muted-foreground" } as const;
            const statusLabel = s.status === "Open" ? "Open for Joining" : s.status;
            return (
              <div key={s.id} className="rounded-xl border bg-card p-5 hover:border-primary/40 transition flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold leading-tight">{s.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${DOMAIN_COLORS[s.domain]}`}>{s.domain}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.description}</p>

                <div className="space-y-1.5 mb-3 text-xs">
                  {s.requiredRoles.map(r => {
                    const filled = s.members.some(m => m.role === r && (m.status === "joined" || m.status === "ai"));
                    return (
                      <div key={r} className="flex items-center gap-2">
                        {filled ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Circle className="h-3.5 w-3.5 text-warning" />}
                        <span className={filled ? "text-foreground" : "text-muted-foreground"}>{r}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] mb-3 mt-auto">
                  <span className="text-muted-foreground">{joined} / {total} joined</span>
                  <div className="flex gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded ${statusColors[s.status]}`}>{statusLabel}</span>
                    <span className="px-1.5 py-0.5 rounded bg-accent">{s.durationDays}-Day</span>
                  </div>
                </div>

                <Link to="/collaboration/sprint/$id" params={{ id: s.id }} className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">
                  View Sprint <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
