import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, X, Save, GripVertical } from "lucide-react";
import { getLab, type AdminLab } from "@/lib/adminLabs";
import {
  loadSprintsWithSeed, saveSprints, newSprint, newTask,
  EDITORS, LANGUAGES, type LabSprint, type LabTask, type EditorKind, type Language,
} from "@/lib/labSprints";

export const Route = createFileRoute("/admin/labs/$id/sprints")({ component: SprintsPage });

const SQL_LANGS: Language[] = ["sql"];
const CODE_LANGS: Language[] = LANGUAGES.filter(l => l !== "sql") as Language[];

function languagesFor(editor: EditorKind): Language[] {
  if (editor === "sql") return SQL_LANGS;
  if (editor === "code") return CODE_LANGS;
  return [];
}

function starterFor(lang: Language): string {
  switch (lang) {
    case "python": return "# Write your solution here\n\ndef solve():\n    pass\n";
    case "javascript":
    case "typescript": return "// Write your solution here\nfunction solve() {\n  \n}\n";
    case "java": return "public class Main {\n  public static void main(String[] args) {\n    \n  }\n}\n";
    case "c": return "#include <stdio.h>\n\nint main() {\n  return 0;\n}\n";
    case "cpp": return "#include <iostream>\nusing namespace std;\n\nint main() {\n  return 0;\n}\n";
    case "sql": return "-- Write your SQL query\nSELECT 1;\n";
    case "html": return "<!doctype html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>\n";
    case "css": return "/* styles */\n";
    case "bash": return "#!/usr/bin/env bash\necho hello\n";
    default: return "";
  }
}

function SprintsPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<AdminLab | null>(null);
  const [sprints, setSprints] = useState<LabSprint[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ sprintId: string; task: LabTask } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const found = getLab(id);
    if (!found) { nav({ to: "/admin/labs" }); return; }
    setLab(found);
    const sp = loadSprintsWithSeed(id, found.slug);
    setSprints(sp);
    setOpen(Object.fromEntries(sp.map(s => [s.id, true])));
  }, [id, nav]);

  const totals = useMemo(() => ({
    sprints: sprints.length,
    tasks: sprints.reduce((a, s) => a + s.tasks.length, 0),
    xp: sprints.reduce((a, s) => a + s.tasks.reduce((b, t) => b + t.xp, 0), 0),
  }), [sprints]);

  if (!lab) return null;

  const mutate = (fn: (sp: LabSprint[]) => LabSprint[]) => {
    setSprints(prev => { const next = fn(prev); return next; });
    setDirty(true);
  };

  const addSprint = () => mutate(s => [...s, newSprint()]);
  const removeSprint = (sid: string) => mutate(s => s.filter(x => x.id !== sid));
  const updateSprint = (sid: string, patch: Partial<LabSprint>) => mutate(s => s.map(x => x.id === sid ? { ...x, ...patch } : x));
  const addTask = (sid: string) => {
    const t = newTask();
    mutate(s => s.map(x => x.id === sid ? { ...x, tasks: [...x.tasks, t] } : x));
    setEditing({ sprintId: sid, task: t });
  };
  const removeTask = (sid: string, tid: string) => mutate(s => s.map(x => x.id === sid ? { ...x, tasks: x.tasks.filter(t => t.id !== tid) } : x));
  const upsertTask = (sid: string, task: LabTask) => mutate(s => s.map(x => x.id === sid ? { ...x, tasks: x.tasks.map(t => t.id === task.id ? task : t) } : x));

  const save = () => {
    saveSprints(id, sprints);
    setDirty(false);
    setSavedAt(Date.now());
  };

  return (
    <AdminShell
      title={`${lab.icon} ${lab.name} · Sprints`}
      breadcrumb={["Engineering", "Labs", lab.name, "Sprints"]}
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
        <Stat label="Tasks" value={totals.tasks} />
        <Stat label="Total XP" value={totals.xp.toLocaleString()} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Sprint plan</h2>
        <button onClick={addSprint} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add sprint</button>
      </div>

      {sprints.length === 0 && (
        <Panel title="">
          <div className="text-center py-8 text-sm text-muted-foreground">
            No sprints yet. <button onClick={addSprint} className="text-primary hover:underline">Create the first sprint →</button>
          </div>
        </Panel>
      )}

      <div className="space-y-3">
        {sprints.map((sp, idx) => (
          <div key={sp.id} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur">
            <div className="flex items-center gap-2 p-3 border-b border-border/40">
              <button onClick={() => setOpen(o => ({ ...o, [sp.id]: !o[sp.id] }))} className="text-muted-foreground hover:text-foreground">
                {open[sp.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span className="text-[10px] text-muted-foreground font-mono">SPRINT {idx + 1}</span>
              <input
                value={sp.name}
                onChange={e => updateSprint(sp.id, { name: e.target.value })}
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold focus:bg-accent rounded px-2 py-1"
              />
              <Badge tone="primary">{sp.tasks.length} tasks</Badge>
              <button onClick={() => addTask(sp.id)} className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Task</button>
              <button onClick={() => removeSprint(sp.id)} className="text-xs px-2 py-1 rounded-md text-destructive hover:bg-destructive/10 inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /></button>
            </div>
            {open[sp.id] && (
              <div className="p-3 space-y-3">
                <input
                  placeholder="Sprint description…"
                  value={sp.description}
                  onChange={e => updateSprint(sp.id, { description: e.target.value })}
                  className="w-full bg-transparent border border-border/60 rounded-md px-3 py-2 text-xs"
                />
                {sp.tasks.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border/60 rounded-md">
                    No tasks. <button onClick={() => addTask(sp.id)} className="text-primary hover:underline">Add a task →</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sp.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2 text-sm hover:bg-accent/30">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Badge tone={t.difficulty === "Advanced" ? "destructive" : t.difficulty === "Intermediate" ? "warning" : "success"}>{t.difficulty}</Badge>
                            <span>{EDITORS.find(e => e.value === t.editor)?.label}</span>
                            {t.editor !== "none" && <span className="font-mono">· {t.language}</span>}
                            <span>· {t.estMin}min</span>
                            <span>· {t.xp} XP</span>
                          </div>
                        </div>
                        <button onClick={() => setEditing({ sprintId: sp.id, task: t })} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</button>
                        <button onClick={() => removeTask(sp.id, t.id)} className="text-xs text-destructive hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <TaskEditor
          task={editing.task}
          onClose={() => setEditing(null)}
          onSave={t => { upsertTask(editing.sprintId, t); setEditing(null); }}
        />
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

function TaskEditor({ task, onClose, onSave }: { task: LabTask; onClose: () => void; onSave: (t: LabTask) => void }) {
  const [t, setT] = useState<LabTask>(task);
  const set = <K extends keyof LabTask>(k: K, v: LabTask[K]) => setT(s => ({ ...s, [k]: v }));

  const changeEditor = (editor: EditorKind) => {
    const langs = languagesFor(editor);
    const language = langs.includes(t.language) ? t.language : (langs[0] ?? "python");
    setT(s => ({ ...s, editor, language, starterCode: starterFor(language) }));
  };
  const changeLang = (language: Language) => setT(s => ({ ...s, language, starterCode: starterFor(language) }));

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl h-full bg-card border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center gap-3 z-10">
          <h3 className="font-semibold text-sm flex-1">Edit task</h3>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Cancel</button>
          <button onClick={() => onSave(t)} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground">Save task</button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <Field label="Title">
            <input value={t.title} onChange={e => set("title", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
          </Field>
          <Field label="Description">
            <textarea rows={4} value={t.description} onChange={e => set("description", e.target.value)} placeholder="What should the learner build? Include acceptance criteria." className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Difficulty">
              <select value={t.difficulty} onChange={e => set("difficulty", e.target.value as any)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </select>
            </Field>
            <Field label="Est. minutes">
              <input type="number" value={t.estMin} onChange={e => set("estMin", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
            </Field>
            <Field label="XP">
              <input type="number" value={t.xp} onChange={e => set("xp", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Editor type">
              <select value={t.editor} onChange={e => changeEditor(e.target.value as EditorKind)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                {EDITORS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select value={t.language} onChange={e => changeLang(e.target.value as Language)} disabled={t.editor === "none"} className="w-full bg-transparent border border-border rounded-md px-3 py-2 disabled:opacity-50">
                {(t.editor === "none" ? ["—"] : languagesFor(t.editor)).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          {t.editor !== "none" && (
            <Field label="Starter code">
              <textarea
                rows={12}
                value={t.starterCode}
                onChange={e => set("starterCode", e.target.value)}
                spellCheck={false}
                className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-xs leading-5"
              />
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
