import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Badge } from "@/components/admin/AdminShell";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowLeft, Save, Ticket as TicketIcon } from "lucide-react";
import { getLab, type AdminLab } from "@/lib/adminLabs";
import {
  EDITORS, LANGUAGES, loadSprintsWithSeed, newTask, saveSprints,
  type EditorKind, type LabSprint, type LabTask, type Language,
} from "@/lib/labSprints";

export const Route = createFileRoute("/admin/labs/$id/sprints/$sprintId")({
  component: SprintEditorPage,
});

function SprintEditorPage() {
  const { id, sprintId } = Route.useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<AdminLab | null>(null);
  const [sprints, setSprints] = useState<LabSprint[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const found = getLab(id);
    if (!found) { nav({ to: "/admin/labs" }); return; }
    setLab(found);
    const sp = loadSprintsWithSeed(found.id, found.slug);
    setSprints(sp);
    const current = sp.find(s => s.id === sprintId);
    if (current && current.tasks[0]) setActiveTicketId(current.tasks[0].id);
  }, [id, sprintId, nav]);

  const sprint = useMemo(() => sprints.find(s => s.id === sprintId) ?? null, [sprints, sprintId]);

  if (!lab) return null;
  if (!sprint) {
    return (
      <AdminShell title="Sprint not found" breadcrumb={["Engineering", "Labs", lab.title, "Sprints"]}>
        <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm">
          This sprint no longer exists.
          <Link to="/admin/labs/$id/sprints" params={{ id: lab.id }} className="ml-3 text-primary hover:underline">← Back to sprints</Link>
        </div>
      </AdminShell>
    );
  }

  const mutate = (fn: (sp: LabSprint[]) => LabSprint[]) => { setSprints(prev => fn(prev)); setDirty(true); };

  const updateSprint = (patch: Partial<LabSprint>) =>
    mutate(s => s.map(sp => sp.id === sprint.id ? { ...sp, ...patch } : sp));
  const updateTicket = (tid: string, patch: Partial<LabTask>) =>
    mutate(s => s.map(sp => sp.id === sprint.id ? { ...sp, tasks: sp.tasks.map(t => t.id === tid ? { ...t, ...patch } : t) } : sp));
  const addTicket = () => {
    const t = newTask();
    mutate(s => s.map(sp => sp.id === sprint.id ? { ...sp, tasks: [...sp.tasks, t] } : sp));
    setActiveTicketId(t.id);
  };
  const removeTicket = (tid: string) => {
    mutate(s => s.map(sp => sp.id === sprint.id ? { ...sp, tasks: sp.tasks.filter(t => t.id !== tid) } : sp));
    if (activeTicketId === tid) setActiveTicketId(null);
  };

  const save = () => {
    saveSprints(lab.id, sprints);
    setDirty(false);
    setSavedAt(Date.now());
  };

  const activeTicket = sprint.tasks.find(t => t.id === activeTicketId) ?? null;

  return (
    <AdminShell
      title={`Sprint · ${sprint.name}`}
      breadcrumb={["Engineering", "Labs", lab.title, "Sprints", sprint.name]}
      right={
        <div className="flex items-center gap-2">
          <Link to="/admin/labs/$id/sprints" params={{ id: lab.id }} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to sprints
          </Link>
          <button onClick={save} disabled={!dirty} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {dirty ? "Save sprint" : savedAt ? "Saved ✓" : "No changes"}
          </button>
        </div>
      }
    >
      {/* Sprint header edit */}
      <div className="mb-4 rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Sprint name">
            <input value={sprint.name} onChange={e => updateSprint({ name: e.target.value })}
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Total">
            <div className="flex items-center gap-2 h-[38px]">
              <Badge tone="primary">{sprint.tasks.length} tickets</Badge>
              <Badge tone="success">{sprint.tasks.reduce((a, t) => a + t.xp, 0)} XP</Badge>
              <Badge tone="warning">{sprint.tasks.reduce((a, t) => a + t.estMin, 0)} min</Badge>
            </div>
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={2} value={sprint.description} onChange={e => updateSprint({ description: e.target.value })}
            placeholder="What learners will accomplish in this sprint."
            className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
        </Field>
      </div>

      {/* Split view: tickets list + ticket editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Left: ticket list */}
        <aside className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
            <TicketIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-xs font-semibold flex-1">Tickets ({sprint.tasks.length})</div>
            <button onClick={addTicket} className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2 space-y-1">
            {sprint.tasks.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6 px-2">
                No tickets yet. Click <span className="text-primary">Add</span> to create one.
              </div>
            )}
            {sprint.tasks.map((t, i) => {
              const isActive = t.id === activeTicketId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  className={`w-full text-left group rounded-md border px-2.5 py-2 transition ${isActive ? "border-primary bg-primary/5" : "border-border/40 hover:bg-accent/40"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                    <div className="text-xs font-medium truncate flex-1">{t.title || "Untitled ticket"}</div>
                    <span
                      onClick={e => { e.stopPropagation(); removeTicket(t.id); }}
                      className="opacity-0 group-hover:opacity-100 text-destructive p-0.5 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <Badge tone={t.difficulty === "Advanced" ? "destructive" : t.difficulty === "Intermediate" ? "warning" : "success"}>{t.difficulty}</Badge>
                    <span className="text-[10px] text-muted-foreground">{t.editor === "none" ? "no editor" : `${t.editor} · ${t.language}`}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{t.xp} XP · {t.estMin} min</div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: ticket editor */}
        <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 min-h-[60vh]">
          {!activeTicket ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Select a ticket to edit, or <button onClick={addTicket} className="ml-1 text-primary hover:underline">add a new one</button>.
            </div>
          ) : (
            <TicketEditor ticket={activeTicket} onChange={patch => updateTicket(activeTicket.id, patch)} />
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function TicketEditor({ ticket, onChange }: { ticket: LabTask; onChange: (patch: Partial<LabTask>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TicketIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold flex-1">Edit ticket</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <Field label="Title" full>
          <input value={ticket.title} onChange={e => onChange({ title: e.target.value })}
            className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
        </Field>
        <Field label="Description" full>
          <textarea rows={3} value={ticket.description} onChange={e => onChange({ description: e.target.value })}
            placeholder="What should the learner build? Include acceptance criteria."
            className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-xs" />
        </Field>
        <Field label="Difficulty">
          <select value={ticket.difficulty} onChange={e => onChange({ difficulty: e.target.value as LabTask["difficulty"] })}
            className="w-full bg-transparent border border-border rounded-md px-3 py-2">
            {["Beginner", "Intermediate", "Advanced"].map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Editor type">
          <select value={ticket.editor} onChange={e => onChange({ editor: e.target.value as EditorKind })}
            className="w-full bg-transparent border border-border rounded-md px-3 py-2">
            {EDITORS.map(ed => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
          </select>
        </Field>
        <Field label="Language">
          <select value={ticket.language} onChange={e => onChange({ language: e.target.value as Language })}
            className="w-full bg-transparent border border-border rounded-md px-3 py-2 disabled:opacity-50"
            disabled={ticket.editor === "none"}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="XP">
          <input type="number" value={ticket.xp} onChange={e => onChange({ xp: Number(e.target.value) })}
            className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
        </Field>
        <Field label="Est. minutes">
          <input type="number" value={ticket.estMin} onChange={e => onChange({ estMin: Number(e.target.value) })}
            className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
        </Field>
        {ticket.editor !== "none" && (
          <Field label="Starter code" full>
            <textarea rows={12} value={ticket.starterCode} onChange={e => onChange({ starterCode: e.target.value })}
              spellCheck={false}
              className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-xs leading-5" />
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
