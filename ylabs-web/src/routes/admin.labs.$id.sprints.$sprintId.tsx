import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { getLab, type AdminLab } from "@/lib/adminLabs";
import {
  EDITORS, LANGUAGES, loadSprintsWithSeed, newTask, saveSprints,
  type EditorKind, type LabSprint, type LabTask, type Language,
} from "@/lib/labSprints";

export const Route = createFileRoute("/admin/labs/$id/sprints/$sprintId")({
  component: SprintTasksPage,
});

function SprintTasksPage() {
  const { id, sprintId } = Route.useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<AdminLab | null>(null);
  const [sprints, setSprints] = useState<LabSprint[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const found = getLab(id);
    if (!found) { nav({ to: "/admin/labs" }); return; }
    setLab(found);
    setSprints(loadSprintsWithSeed(found.id, found.slug));
  }, [id, nav]);

  if (!lab) return null;
  const sprint = sprints.find(s => s.id === sprintId);
  if (!sprint) {
    return (
      <AdminShell title="Sprint not found" breadcrumb={["Engineering", "Labs", lab.name, "Sprints"]}>
        <Panel title="Missing sprint">
          <div className="text-sm">This sprint no longer exists.</div>
          <Link to="/admin/labs/$id/edit" params={{ id: lab.id }} className="mt-3 inline-block text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">← Back to lab</Link>
        </Panel>
      </AdminShell>
    );
  }

  const editingTask = sprint.tasks.find(t => t.id === activeTask) ?? null;

  const updateTask = (tid: string, patch: Partial<LabTask>) =>
    setSprints(s => s.map(sp => sp.id === sprint.id ? { ...sp, tasks: sp.tasks.map(t => t.id === tid ? { ...t, ...patch } : t) } : sp));
  const addTask = () => {
    const t = newTask();
    setSprints(s => s.map(sp => sp.id === sprint.id ? { ...sp, tasks: [...sp.tasks, t] } : sp));
    setActiveTask(t.id);
  };
  const removeTask = (tid: string) => {
    setSprints(s => s.map(sp => sp.id === sprint.id ? { ...sp, tasks: sp.tasks.filter(t => t.id !== tid) } : sp));
    if (activeTask === tid) setActiveTask(null);
  };

  const save = () => {
    saveSprints(lab.id, sprints);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1500);
  };

  return (
    <AdminShell
      title={`Sprint · ${sprint.name}`}
      breadcrumb={["Engineering", "Labs", lab.name, "Sprints", sprint.name]}
      right={
        <div className="flex items-center gap-2">
          <Link to="/admin/labs/$id/edit" params={{ id: lab.id }} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to lab
          </Link>
          <button onClick={save} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
            {savedAt ? "Saved ✓" : "Save sprint"}
          </button>
        </div>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Panel
            title="Tasks"
            action={
              <button onClick={addTask} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add task
              </button>
            }
          >
            {sprint.tasks.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
                No tasks yet. Add a task and configure its editor, language and starter code.
              </div>
            ) : (
              <div className="space-y-1">
                {sprint.tasks.map(t => {
                  const isActive = activeTask === t.id;
                  return (
                    <div key={t.id} className={`flex items-center gap-2 px-2 py-2 rounded-md border ${isActive ? "border-primary bg-primary/5" : "border-border"}`}>
                      <button onClick={() => setActiveTask(t.id)} className="flex-1 text-left text-xs">
                        <div className="font-medium">{t.title}</div>
                        <div className="text-muted-foreground mt-0.5">{t.editor === "none" ? "no editor" : `${t.editor} · ${t.language}`} · {t.difficulty} · {t.xp} XP · {t.estMin} min</div>
                      </button>
                      <button onClick={() => removeTask(t.id)} className="text-xs p-1 text-destructive hover:bg-destructive/10 rounded" title="Delete task"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {editingTask && (
            <Panel title={`Configure · ${editingTask.title}`}>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <Field label="Title"><input value={editingTask.title} onChange={e => updateTask(editingTask.id, { title: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5" /></Field>
                <Field label="Difficulty">
                  <select value={editingTask.difficulty} onChange={e => updateTask(editingTask.id, { difficulty: e.target.value as LabTask["difficulty"] })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5">
                    {["Beginner", "Intermediate", "Advanced"].map(d => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Editor">
                  <select value={editingTask.editor} onChange={e => updateTask(editingTask.id, { editor: e.target.value as EditorKind })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5">
                    {EDITORS.map(ed => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
                  </select>
                </Field>
                <Field label="Language">
                  <select value={editingTask.language} onChange={e => updateTask(editingTask.id, { language: e.target.value as Language })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5" disabled={editingTask.editor === "none"}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="XP"><input type="number" value={editingTask.xp} onChange={e => updateTask(editingTask.id, { xp: Number(e.target.value) })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5" /></Field>
                <Field label="Est. minutes"><input type="number" value={editingTask.estMin} onChange={e => updateTask(editingTask.id, { estMin: Number(e.target.value) })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5" /></Field>
                <Field label="Description" full><textarea rows={3} value={editingTask.description} onChange={e => updateTask(editingTask.id, { description: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5 text-xs" /></Field>
                {editingTask.editor !== "none" && (
                  <Field label="Starter code" full><textarea rows={8} value={editingTask.starterCode} onChange={e => updateTask(editingTask.id, { starterCode: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-2 py-1.5 font-mono text-xs" /></Field>
                )}
              </div>
            </Panel>
          )}
        </div>

        <Panel title="Sprint summary">
          <div className="space-y-2 text-xs">
            <div><span className="text-muted-foreground">Sprint:</span> {sprint.name}</div>
            <div className="text-muted-foreground">{sprint.description || "No description yet."}</div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <Badge tone="primary">{sprint.tasks.length} tasks</Badge>
              <Badge tone="success">{sprint.tasks.reduce((a, t) => a + t.xp, 0)} XP</Badge>
            </div>
            <div className="text-muted-foreground">Lab: <Link to="/admin/labs/$id/edit" params={{ id: lab.id }} className="text-primary hover:underline">{lab.name}</Link></div>
          </div>
        </Panel>
      </div>
    </AdminShell>
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
