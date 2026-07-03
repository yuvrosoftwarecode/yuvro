import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { Plus, FlaskConical, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadLabs, deleteLab, LAB_TYPES, labTypeLabel, difficultyLabel, type AdminLab, type LabType } from "@/lib/adminLabs";

export const Route = createFileRoute("/admin/labs/")({ component: LabsPage });

function LabsPage() {
  const [labs, setLabs] = useState<AdminLab[]>([]);
  const [type, setType] = useState<LabType | null>(null);
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { setLabs(loadLabs()); }, []);
  const refresh = () => setLabs(loadLabs());

  const filtered = useMemo(() => {
    return labs.filter(l =>
      (!type || l.type === type) &&
      (!q || l.title.toLowerCase().includes(q.toLowerCase()) || l.description.toLowerCase().includes(q.toLowerCase()))
    );
  }, [labs, type, q]);

  const remove = (id: string) => { deleteLab(id); setConfirmId(null); refresh(); };

  const activeCount = labs.filter(l => l.isActive).length;
  const typesCovered = new Set(labs.map(l => l.type)).size;
  const totalSkills = labs.reduce((a, l) => a + l.skills.length, 0);

  return (
    <AdminShell title="Labs" breadcrumb={["Engineering", "Labs"]} right={
      <Link to="/admin/labs/new" className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Create new lab</Link>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total labs" value={labs.length} color="primary" icon={FlaskConical} />
        <KpiCard label="Active labs" value={activeCount} color="success" icon={CheckCircle2} />
        <KpiCard label="Types covered" value={typesCovered} color="ui" />
        <KpiCard label="Skills catalogued" value={totalSkills} color="warning" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search labs…" className="text-xs px-3 py-1.5 rounded-md border border-border bg-transparent w-56" />
        <button onClick={() => setType(null)} className={`text-xs px-3 py-1.5 rounded-full border ${!type ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>All</button>
        {LAB_TYPES.map(t => (
          <button key={t.value} onClick={() => setType(t.value)} className={`text-xs px-3 py-1.5 rounded-full border ${type === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>{t.label}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>{["Lab","Type","Difficulty","Skills","Actions"].map(h => <th key={h} className="text-left font-medium px-4 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-xs">No labs match your filters. <Link to="/admin/labs/new" className="text-primary hover:underline">Create one →</Link></td></tr>
              )}
              {filtered.map(l => (
                <tr key={l.id} className="border-t border-border/40 hover:bg-accent/30 align-top">
                  <td className="px-4 py-2.5 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{l.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span>{l.title}</span>{l.custom && <Badge tone="success">new</Badge>}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">{l.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone="primary">{labTypeLabel(l.type)}</Badge></td>
                  <td className="px-4 py-2.5"><Badge tone={l.difficulty === "hard" ? "destructive" : l.difficulty === "medium" ? "warning" : "success"}>{difficultyLabel(l.difficulty)}</Badge></td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1 max-w-[260px]">
                      {l.skills.slice(0, 4).map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded border border-border/50 bg-muted/20">{s}</span>)}
                      {l.skills.length > 4 && <span className="text-[10px] text-muted-foreground">+{l.skills.length - 4}</span>}
                      {l.skills.length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <Link to="/admin/labs/$id/edit" params={{ id: l.id }} className="text-primary hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</Link>
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
