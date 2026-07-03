import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { createLab, LAB_TYPES, DIFFICULTIES, type LabType, type LabDifficulty } from "@/lib/adminLabs";
import { saveSprints, type LabSprint } from "@/lib/labSprints";
import { SprintBuilder } from "@/components/admin/SprintBuilder";

export const Route = createFileRoute("/admin/labs/new")({ component: LabBuilder });

const STEPS = ["Basic info", "Sprints"];

function LabBuilder() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [sprints, setSprints] = useState<LabSprint[]>([]);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    icon: "🧪",
    type: "backend" as LabType,
    difficulty: "medium" as LabDifficulty,
    description: "",
    prerequisites: "",
    skills: "",
    gitRepoStarterUrl: "",
    isActive: true,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(s => ({ ...s, [k]: v }));

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

  const publish = () => {
    if (!form.title.trim()) { setError("Lab title is required."); setStep(0); return; }
    if (!form.description.trim()) { setError("Description is required."); setStep(0); return; }
    setError(null);
    const created = createLab({
      title: form.title.trim(),
      slug: form.slug,
      icon: form.icon || "🧪",
      type: form.type,
      description: form.description.trim(),
      prerequisites: toList(form.prerequisites),
      skills: toList(form.skills),
      gitRepoStarterUrl: form.gitRepoStarterUrl.trim(),
      difficulty: form.difficulty,
      isActive: form.isActive,
    });

    if (sprints.length) saveSprints(created.id, sprints);
    setSaved(true);
    setTimeout(() => nav({ to: "/admin/labs" }), 600);
  };

  return (
    <AdminShell title="Lab Builder" breadcrumb={["Engineering", "Labs", "New"]} right={
      <Link to="/admin/labs" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">← Cancel</Link>
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {step === 0 && (
            <Panel title="Basic info">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <Field label="Title *"><input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Kotlin Coroutines Bootcamp" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Slug (URL)"><input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="auto-generated from title" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Icon (emoji)"><input value={form.icon} onChange={e => set("icon", e.target.value)} maxLength={2} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Type">
                  <select value={form.type} onChange={e => set("type", e.target.value as LabType)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {LAB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select value={form.difficulty} onChange={e => set("difficulty", e.target.value as LabDifficulty)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border">
                    <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} className="h-3.5 w-3.5" />
                    Active (visible to students)
                  </label>
                </Field>
                <Field label="Prerequisites (comma-separated)" full><input value={form.prerequisites} onChange={e => set("prerequisites", e.target.value)} placeholder="Basic Java, OOP fundamentals" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Skills covered (comma-separated)" full><input value={form.skills} onChange={e => set("skills", e.target.value)} placeholder="Coroutines, Flow, Channels" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Description *" full><textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What learners will build and master in this lab." className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Git starter repo URL" full><input value={form.gitRepoStarterUrl} onChange={e => set("gitRepoStarterUrl", e.target.value)} placeholder="https://github.com/org/lab-starter" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" /></Field>
              </div>
            </Panel>
          )}
          {step === 1 && (
            <Panel title="Sprints & tickets">
              <SprintBuilder sprints={sprints} setSprints={setSprints} labName={form.title || "New lab"} labSlug={form.slug || form.title} />
            </Panel>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button disabled={step === 0} onClick={() => setStep(s => s - 1)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40">← Back</button>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 && (
                <button onClick={() => setStep(s => s + 1)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent">Next →</button>
              )}
              <button onClick={publish} disabled={saved} className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-60">
                {saved ? "Published — redirecting…" : "Publish lab"}
              </button>
            </div>
          </div>
        </div>

        <Panel title="Summary">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><Badge tone={form.title ? "success" : "destructive"}>{form.title ? "ready" : "missing"}</Badge> {form.title || "Title required"}</div>
            <div className="flex items-center gap-2"><Badge tone={form.description ? "success" : "destructive"}>{form.description ? "ready" : "missing"}</Badge> Description</div>
            <div className="flex items-center gap-2"><Badge tone={sprints.length ? "success" : "warning"}>{sprints.length} sprints</Badge> {sprints.reduce((a, s) => a + s.tasks.length, 0)} tickets</div>
            <div className="text-muted-foreground pt-2 border-t border-border/60">{LAB_TYPES.find(t => t.value === form.type)?.label} · {DIFFICULTIES.find(d => d.value === form.difficulty)?.label} · {form.isActive ? "Active" : "Inactive"}</div>
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
