import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel } from "@/components/admin/AdminShell";
import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { getLab, updateLab, CATEGORIES, DIFFS, type AdminLab } from "@/lib/adminLabs";
import { loadSprintsWithSeed, saveSprints, type LabSprint } from "@/lib/labSprints";
import { SprintBuilder } from "@/components/admin/SprintBuilder";

export const Route = createFileRoute("/admin/labs/$id/edit")({ component: EditLab });

const STEPS = ["Basic info", "Sprints"];

function EditLab() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<AdminLab | null>(null);
  const [sprints, setSprints] = useState<LabSprint[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const found = getLab(id);
    if (!found) { nav({ to: "/admin/labs" }); return; }
    setLab(found);
    setSprints(loadSprintsWithSeed(found.id, found.slug));
  }, [id, nav]);

  if (!lab) return null;

  const set = <K extends keyof AdminLab>(k: K, v: AdminLab[K]) => setLab(s => s ? { ...s, [k]: v } : s);

  const save = () => {
    if (!lab.name.trim()) { setError("Lab name is required."); setStep(0); return; }
    if (!lab.description.trim()) { setError("Description is required."); setStep(0); return; }
    setError(null);
    updateLab(lab.id, {
      name: lab.name, icon: lab.icon, cat: lab.cat, diff: lab.diff,
      tickets: lab.tickets, sprints: sprints.length || lab.sprints, users: lab.users,
      comp: lab.comp, rating: lab.rating, description: lab.description,
      repoUrl: lab.repoUrl, repoBranch: lab.repoBranch,
    });
    saveSprints(lab.id, sprints);
    setSaved(true);
    setTimeout(() => nav({ to: "/admin/labs" }), 500);
  };

  return (
    <AdminShell title={`Edit · ${lab.name}`} breadcrumb={["Engineering", "Labs", "Edit"]} right={
      <div className="flex items-center gap-2">
        <Link to="/admin/labs" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">← Back</Link>
      </div>
    }>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs ${i === step ? "border-primary bg-primary/10 text-primary" : i < step ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}>
              <span className="grid h-5 w-5 place-items-center rounded-full border text-[10px]">{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
              {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 text-xs px-3 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/30">{error}</div>}

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          {step === 0 && (
            <Panel title="Basic info">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <Field label="Lab name *"><input value={lab.name} onChange={e => set("name", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Icon (emoji)"><input value={lab.icon} maxLength={2} onChange={e => set("icon", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Category">
                  <select value={lab.cat} onChange={e => set("cat", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select value={lab.diff} onChange={e => set("diff", e.target.value as any)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {DIFFS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Tickets"><input type="number" value={lab.tickets} onChange={e => set("tickets", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Active users"><input type="number" value={lab.users} onChange={e => set("users", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Completion %"><input type="number" min={0} max={100} value={lab.comp} onChange={e => set("comp", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Rating"><input type="number" step={0.1} min={0} max={5} value={lab.rating} onChange={e => set("rating", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Description *" full><textarea rows={4} value={lab.description} onChange={e => set("description", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="GitHub starter repo URL" full><input value={lab.repoUrl ?? ""} onChange={e => set("repoUrl", e.target.value)} placeholder="https://github.com/org/repo" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" /></Field>
                <Field label="Default branch"><input value={lab.repoBranch ?? ""} onChange={e => set("repoBranch", e.target.value)} placeholder="main" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" /></Field>
              </div>
            </Panel>
          )}
          {step === 1 && (
            <Panel title="Sprints & tasks">
              <SprintBuilder sprints={sprints} setSprints={setSprints} labName={lab.name} />
            </Panel>
          )}


          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button disabled={step === 0} onClick={() => setStep(s => s - 1)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40">← Back</button>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 && (
                <button onClick={() => setStep(s => s + 1)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Next →</button>
              )}
              <button onClick={save} disabled={saved} className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-60">
                {saved ? "Saved — redirecting…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
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
