import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Save, GripVertical, X } from "lucide-react";
import { getLab, type AdminLab } from "@/lib/adminLabs";
import { loadSprintsWithSeed, saveSprints, newSprint, type LabSprint } from "@/lib/labSprints";

export const Route = createFileRoute("/admin/labs/$id/sprints")({ component: SprintsPage });

function SprintsPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<AdminLab | null>(null);
  const [sprints, setSprints] = useState<LabSprint[]>([]);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    const found = getLab(id);
    if (!found) { nav({ to: "/admin/labs" }); return; }
    setLab(found);
    setSprints(loadSprintsWithSeed(id, found.slug));
  }, [id, nav]);

  const totals = useMemo(() => ({
    sprints: sprints.length,
    tickets: sprints.reduce((a, s) => a + s.tasks.length, 0),
    xp: sprints.reduce((a, s) => a + s.tasks.reduce((b, t) => b + t.xp, 0), 0),
  }), [sprints]);

  if (!lab) return null;

  const mutate = (fn: (sp: LabSprint[]) => LabSprint[]) => {
    setSprints(prev => fn(prev));
    setDirty(true);
  };

  const confirmAdd = () => {
    if (!newName.trim()) return;
    const s = { ...newSprint(), name: newName.trim(), description: newDesc.trim() };
    mutate(prev => [...prev, s]);
    setNewName(""); setNewDesc(""); setShowAdd(false);
  };
  const removeSprint = (sid: string) => mutate(s => s.filter(x => x.id !== sid));

  const save = () => {
    saveSprints(id, sprints);
    setDirty(false);
    setSavedAt(Date.now());
  };

  return (
    <AdminShell
      title={`${lab.icon} ${lab.title} · Sprints`}
      breadcrumb={["Engineering", "Labs", lab.title, "Sprints"]}
      right={
        <div className="flex items-center gap-2">
          <Link to="/admin/labs/$id/edit" params={{ id: lab.id }} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Edit lab</Link>
          <Link to="/admin/labs" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">← All labs</Link>
          <button onClick={save} disabled={!dirty} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {dirty ? "Save changes" : savedAt ? "Saved" : "No changes"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Sprints" value={totals.sprints} />
        <Stat label="Tickets" value={totals.tickets} />
        <Stat label="Total XP" value={totals.xp.toLocaleString()} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Sprint plan</h2>
        <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add sprint</button>
      </div>

      {sprints.length === 0 && (
        <Panel title="">
          <div className="text-center py-8 text-sm text-muted-foreground">
            No sprints yet. <button onClick={() => setShowAdd(true)} className="text-primary hover:underline">Create the first sprint →</button>
          </div>
        </Panel>
      )}

      <div className="space-y-2">
        {sprints.map((sp, idx) => (
          <div key={sp.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur px-3 py-3">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground font-mono">SPRINT {idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{sp.name}</div>
              {sp.description && <div className="text-[11px] text-muted-foreground truncate">{sp.description}</div>}
            </div>
            <Badge tone="primary">{sp.tasks.length} tickets</Badge>
            <Badge tone="success">{sp.tasks.reduce((a, t) => a + t.xp, 0)} XP</Badge>
            <Link to="/admin/labs/$id/sprints/$sprintId" params={{ id: lab.id, sprintId: sp.id }} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Edit sprint
            </Link>
            <button onClick={() => removeSprint(sp.id)} className="text-xs px-2 py-1.5 rounded-md text-destructive hover:bg-destructive/10 inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-sm flex-1">Add sprint</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs text-muted-foreground mb-1">Sprint name *</span>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmAdd()}
                  placeholder="e.g. Fundamentals & Setup"
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-muted-foreground mb-1">Description (optional)</span>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What learners will accomplish in this sprint."
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Cancel</button>
              <button onClick={confirmAdd} disabled={!newName.trim()} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">Create sprint</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
