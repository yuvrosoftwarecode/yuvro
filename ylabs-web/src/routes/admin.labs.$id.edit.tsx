import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel } from "@/components/admin/AdminShell";
import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { getLab, updateLab, LAB_TYPES, DIFFICULTIES, type AdminLab, type LabType, type LabDifficulty } from "@/lib/adminLabs";
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
  const [prereqsText, setPrereqsText] = useState("");
  const [skillsText, setSkillsText] = useState("");

  useEffect(() => {
    const found = getLab(id);
    if (!found) { nav({ to: "/admin/labs" }); return; }
    setLab(found);
    setPrereqsText((found.prerequisites ?? []).join(", "));
    setSkillsText((found.skills ?? []).join(", "));
    setSprints(loadSprintsWithSeed(found.id, found.slug));
  }, [id, nav]);

  if (!lab) return null;

  const set = <K extends keyof AdminLab>(k: K, v: AdminLab[K]) => setLab(s => s ? { ...s, [k]: v } : s);
  const toList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

  const save = () => {
    if (!lab.title.trim()) { setError("Lab title is required."); setStep(0); return; }
    if (!lab.description.trim()) { setError("Description is required."); setStep(0); return; }
    setError(null);
    updateLab(lab.id, {
      title: lab.title,
      icon: lab.icon,
      type: lab.type,
      difficulty: lab.difficulty,
      description: lab.description,
      prerequisites: toList(prereqsText),
      skills: toList(skillsText),
      gitRepoStarterUrl: lab.gitRepoStarterUrl,
      isActive: lab.isActive,
    });
    saveSprints(lab.id, sprints);
    setSaved(true);
    setTimeout(() => nav({ to: "/admin/labs" }), 500);
  };

  return (
    <AdminShell title={`Edit · ${lab.title}`} breadcrumb={["Engineering", "Labs", "Edit"]} right={
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
                <Field label="Title *"><input value={lab.title} onChange={e => set("title", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Icon (emoji)"><input value={lab.icon} maxLength={2} onChange={e => set("icon", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Type">
                  <select value={lab.type} onChange={e => set("type", e.target.value as LabType)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {LAB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select value={lab.difficulty} onChange={e => set("difficulty", e.target.value as LabDifficulty)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border">
                    <input type="checkbox" checked={lab.isActive} onChange={e => set("isActive", e.target.checked)} className="h-3.5 w-3.5" />
                    Active (visible to students)
                  </label>
                </Field>
                <Field label="Prerequisites (comma-separated)" full><input value={prereqsText} onChange={e => setPrereqsText(e.target.value)} placeholder="Basic Java, OOP fundamentals" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Skills (comma-separated)" full><input value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="Coroutines, Flow, Channels" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Description *" full><textarea rows={4} value={lab.description} onChange={e => set("description", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Git starter repo URL" full><input value={lab.gitRepoStarterUrl ?? ""} onChange={e => set("gitRepoStarterUrl", e.target.value)} placeholder="https://github.com/org/repo" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" /></Field>
              </div>
            </Panel>
          )}
          {step === 1 && (
            <Panel title="Sprints & tasks">
              <SprintBuilder sprints={sprints} setSprints={setSprints} labName={lab.title} labSlug={lab.slug} />
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
