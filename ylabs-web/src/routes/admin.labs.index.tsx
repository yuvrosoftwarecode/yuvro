import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Plus, FlaskConical, Trash2, Pencil, ExternalLink, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadLabs, deleteLab, CATEGORIES, type AdminLab } from "@/lib/adminLabs";

export const Route = createFileRoute("/admin/labs/")({ component: LabsPage });

function LabsPage() {
  const [labs, setLabs] = useState<AdminLab[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { setLabs(loadLabs()); }, []);

  const refresh = () => setLabs(loadLabs());

  const filtered = useMemo(() => {
    return labs.filter(l =>
      (!cat || l.cat === cat) &&
      (!q || l.name.toLowerCase().includes(q.toLowerCase()) || l.description.toLowerCase().includes(q.toLowerCase()))
    );
  }, [labs, cat, q]);

  const remove = (id: string) => { deleteLab(id); setConfirmId(null); refresh(); };

  return (
    <AdminShell title="Labs" breadcrumb={["Engineering", "Labs"]} right={
      <Link to="/admin/labs/new" className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Create new lab</Link>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total labs" value={labs.length} color="primary" icon={FlaskConical} />
        <KpiCard label="Active learners" value={labs.reduce((a, l) => a + l.users, 0).toLocaleString()} color="success" />
        <KpiCard label="Total tickets" value={labs.reduce((a, l) => a + l.tickets, 0)} color="ui" />
        <KpiCard label="Avg completion" value={`${Math.round(labs.reduce((a,l)=>a+l.comp,0) / Math.max(labs.length,1))}%`} color="warning" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search labs…" className="text-xs px-3 py-1.5 rounded-md border border-border bg-transparent w-56" />
        <button onClick={() => setCat(null)} className={`text-xs px-3 py-1.5 rounded-full border ${!cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`text-xs px-3 py-1.5 rounded-full border ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>{c}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["Lab","Category","Active","Tickets","Sprints","Difficulty","Completion","Rating","Actions"].map(h => <th key={h} className="text-left font-medium px-4 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-xs">No labs match your filters. <Link to="/admin/labs/new" className="text-primary hover:underline">Create one →</Link></td></tr>
              )}
              {filtered.map(l => (
                <tr key={l.id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-4 py-2.5 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{l.icon}</span>
                      <span>{l.name}</span>
                      {l.custom && <Badge tone="success">new</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone="primary">{l.cat}</Badge></td>
                  <td className="px-4 py-2.5 font-mono">{l.users.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono">{l.tickets}</td>
                  <td className="px-4 py-2.5 font-mono">{l.sprints}</td>
                  <td className="px-4 py-2.5"><Badge tone={l.diff === "Hard" ? "destructive" : l.diff === "Medium" ? "warning" : "success"}>{l.diff}</Badge></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-muted/40 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${l.comp}%` }} /></div>
                      <span className="text-xs">{l.comp}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono">{l.rating}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <Link to="/admin/labs/$id/sprints" params={{ id: l.id }} className="text-ui hover:underline inline-flex items-center gap-1"><ListChecks className="h-3 w-3" /> Sprints</Link>
                      <Link to="/admin/labs/$id/edit" params={{ id: l.id }} className="text-primary hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</Link>
                      <Link to="/lab/$slug" params={{ slug: l.slug }} target="_blank" className="text-muted-foreground hover:underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View</Link>
                      <button onClick={() => setConfirmId(l.id)} className="text-destructive hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setConfirmId(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm">Delete this lab?</h3>
            <p className="mt-1 text-xs text-muted-foreground">This removes it from the student catalog. You can re-create it later.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Cancel</button>
              <button onClick={() => remove(confirmId)} className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
