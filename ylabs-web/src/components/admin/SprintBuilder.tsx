import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, FileCode, Layers, Eye } from "lucide-react";
import {
  newSprint, newTask, EDITORS, LANGUAGES,
  type LabSprint, type LabTask, type EditorKind, type Language,
} from "@/lib/labSprints";
import { TaskPreview } from "./TaskPreview";

type Selection = { sprintId: string; taskId?: string } | null;

export function SprintBuilder({ sprints, setSprints, labName = "Lab", labSlug }: {
  sprints: LabSprint[];
  setSprints: (s: LabSprint[]) => void;
  labName?: string;
  labSlug?: string;
  onConfigureTasks?: (sprintId: string) => void; // kept for API compat
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenMap(m => {
      const next = { ...m };
      sprints.forEach(s => { if (next[s.id] === undefined) next[s.id] = true; });
      return next;
    });
  }, [sprints]);

  const updateSprint = (id: string, patch: Partial<LabSprint>) =>
    setSprints(sprints.map(sp => sp.id === id ? { ...sp, ...patch } : sp));
  const removeSprint = (id: string) => {
    setSprints(sprints.filter(sp => sp.id !== id));
    if (selection?.sprintId === id) setSelection(null);
  };
  const addSprint = () => {
    const s = newSprint();
    setSprints([...sprints, s]);
    setOpenMap(m => ({ ...m, [s.id]: true }));
    setSelection({ sprintId: s.id });
  };

  const addTask = (sprintId: string) => {
    const t = newTask();
    setSprints(sprints.map(sp => sp.id === sprintId ? { ...sp, tasks: [...sp.tasks, t] } : sp));
    setOpenMap(m => ({ ...m, [sprintId]: true }));
    setSelection({ sprintId, taskId: t.id });
  };
  const updateTask = (sprintId: string, taskId: string, patch: Partial<LabTask>) =>
    setSprints(sprints.map(sp => sp.id === sprintId
      ? { ...sp, tasks: sp.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) }
      : sp));
  const removeTask = (sprintId: string, taskId: string) => {
    setSprints(sprints.map(sp => sp.id === sprintId
      ? { ...sp, tasks: sp.tasks.filter(t => t.id !== taskId) }
      : sp));
    if (selection?.taskId === taskId) setSelection({ sprintId });
  };

  const activeSprint = selection ? sprints.find(s => s.id === selection.sprintId) ?? null : null;
  const activeTask = activeSprint && selection?.taskId
    ? activeSprint.tasks.find(t => t.id === selection.taskId) ?? null
    : null;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      {/* LEFT — sprints + tasks tree */}
      <div className="rounded-lg border border-border bg-card/40">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold"><Layers className="h-3.5 w-3.5" /> Sprints</div>
          <button onClick={addSprint} className="text-[11px] px-2 py-1 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add sprint
          </button>
        </div>

        <div className="p-2 max-h-[640px] overflow-auto">
          {sprints.length === 0 ? (
            <div className="text-[11px] text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
              No sprints yet. Click <b>Add sprint</b> to start.
            </div>
          ) : (
            <ul className="space-y-1">
              {sprints.map((sp, i) => {
                const open = openMap[sp.id] ?? true;
                const sprintActive = selection?.sprintId === sp.id && !selection.taskId;
                return (
                  <li key={sp.id} className="rounded-md">
                    <div className={`group flex items-center gap-1 px-1.5 py-1 rounded-md ${sprintActive ? "bg-primary/10 border border-primary/40" : "hover:bg-accent border border-transparent"}`}>
                      <button onClick={() => setOpenMap(m => ({ ...m, [sp.id]: !open }))} className="text-muted-foreground p-0.5">
                        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                      <button onClick={() => setSelection({ sprintId: sp.id })} className="flex-1 text-left text-xs truncate">
                        <span className="text-muted-foreground font-mono mr-1">{i + 1}.</span>{sp.name || "Untitled sprint"}
                      </button>
                      <span className="text-[10px] text-muted-foreground">{sp.tasks.length}</span>
                      <button onClick={() => removeSprint(sp.id)} className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded" title="Delete sprint"><Trash2 className="h-3 w-3" /></button>
                    </div>
                    {open && (
                      <ul className="ml-5 mt-1 space-y-0.5 border-l border-border/60 pl-2">
                        {sp.tasks.map(t => {
                          const taskActive = selection?.taskId === t.id;
                          return (
                            <li key={t.id} className={`group flex items-center gap-1 px-1.5 py-1 rounded-md ${taskActive ? "bg-primary/10 border border-primary/40" : "hover:bg-accent border border-transparent"}`}>
                              <FileCode className="h-3 w-3 text-muted-foreground" />
                              <button onClick={() => setSelection({ sprintId: sp.id, taskId: t.id })} className="flex-1 text-left text-[11px] truncate">
                                {t.title || "Untitled ticket"}
                              </button>
                              <button onClick={() => removeTask(sp.id, t.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-destructive hover:bg-destructive/10 rounded" title="Delete ticket"><Trash2 className="h-3 w-3" /></button>
                            </li>
                          );
                        })}
                        <li>
                          <button onClick={() => addTask(sp.id)} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 px-1.5 py-1"><Plus className="h-3 w-3" /> Add ticket</button>
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* RIGHT — config panel */}
      <div className="rounded-lg border border-border bg-card/40 min-h-[420px]">
        {!activeSprint ? (
          <EmptyState message="Select a sprint or ticket on the left, or add a new one to configure it here." />
        ) : activeTask ? (
          <TaskConfig
            task={activeTask}
            sprintName={activeSprint.name}
            labName={labName}
            labSlug={labSlug}
            onChange={(patch) => updateTask(activeSprint.id, activeTask.id, patch)}
            onDelete={() => removeTask(activeSprint.id, activeTask.id)}
          />
        ) : (
          <SprintConfig
            sprint={activeSprint}
            onChange={(patch) => updateSprint(activeSprint.id, patch)}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full grid place-items-center p-10 text-center">
      <div className="max-w-sm text-xs text-muted-foreground">{message}</div>
    </div>
  );
}

function SprintConfig({ sprint, onChange }: {
  sprint: LabSprint;
  onChange: (p: Partial<LabSprint>) => void;
}) {
  return (
    <div className="p-5 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sprint</div>
        <h3 className="text-lg font-semibold mt-0.5">Configure sprint</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Manage tickets from the sprint tree on the left.
        </p>
      </div>
      <Field label="Sprint title">
        <input value={sprint.name} onChange={e => onChange({ name: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
      </Field>
      <Field label="Description / goal">
        <textarea rows={4} value={sprint.description} onChange={e => onChange({ description: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
      </Field>
    </div>
  );
}

function TaskConfig({ task, sprintName, labName, labSlug, onChange, onDelete }: {
  task: LabTask;
  sprintName: string;
  labName: string;
  labSlug?: string;
  onChange: (p: Partial<LabTask>) => void;
  onDelete: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <>
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{sprintName} · Ticket</div>
            <h3 className="text-lg font-semibold mt-0.5">Configure ticket</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewOpen(true)} className="text-[11px] px-2 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> Preview
            </button>
            <button onClick={onDelete} className="text-[11px] px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" full>
            <input value={task.title} onChange={e => onChange({ title: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Editor">
            <select value={task.editor} onChange={e => onChange({ editor: e.target.value as EditorKind })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm">
              {EDITORS.map(ed => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
            </select>
          </Field>
          <Field label="Default language">
            <select value={task.language} onChange={e => onChange({ language: e.target.value as Language })} disabled={task.editor === "none"} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm disabled:opacity-50">
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={task.difficulty} onChange={e => onChange({ difficulty: e.target.value as LabTask["difficulty"] })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm">
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </Field>
          <Field label="XP">
            <input type="number" value={task.xp} onChange={e => onChange({ xp: Number(e.target.value) })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Est. minutes">
            <input type="number" value={task.estMin} onChange={e => onChange({ estMin: Number(e.target.value) })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          {task.editor !== "none" && (
            <Field label="Allowed languages (learners can switch)" full>
              <div className="flex flex-wrap gap-1.5 rounded-md border border-border p-2">
                {LANGUAGES.map(l => {
                  const selected = (task.allowedLanguages ?? []).includes(l);
                  return (
                    <button
                      type="button"
                      key={l}
                      onClick={() => {
                        const cur = new Set(task.allowedLanguages ?? []);
                        selected ? cur.delete(l) : cur.add(l);
                        onChange({ allowedLanguages: Array.from(cur) });
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Leave empty to lock to the default language.</p>
            </Field>
          )}
          <Field label="Starter path in repo (optional)" full>
            <input value={task.starterPath ?? ""} onChange={e => onChange({ starterPath: e.target.value })} placeholder="e.g. sprints/01-foundations/ticket-01" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" />
          </Field>
          <Field label="Problem description / brief" full>
            <textarea rows={3} value={task.description} onChange={e => onChange({ description: e.target.value })} className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Hints (shown in preview under the Hints tab)" full>
            <textarea rows={3} value={task.hints ?? ""} onChange={e => onChange({ hints: e.target.value })} placeholder="Nudges that unblock learners without spoiling the answer." className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm" />
          </Field>
          {task.editor !== "none" && (
            <Field label="Starter code" full>
              <textarea rows={10} value={task.starterCode} onChange={e => onChange({ starterCode: e.target.value })} spellCheck={false} className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-xs leading-5" />
            </Field>
          )}
          {task.editor !== "none" && (
            <Field label="Reference solution" full>
              <textarea rows={8} value={task.solution ?? ""} onChange={e => onChange({ solution: e.target.value })} spellCheck={false} placeholder="Model solution shown in the preview's Solution tab." className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-xs leading-5" />
            </Field>
          )}
        </div>
      </div>

      {previewOpen && (
        <TaskPreview task={task} sprintName={sprintName} labName={labName} labSlug={labSlug} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}



function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
