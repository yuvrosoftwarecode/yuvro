import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { createLab, CATEGORIES, DIFFS, type AdminLab } from "@/lib/adminLabs";
import { saveSprints, type LabSprint } from "@/lib/labSprints";
import { SprintBuilder } from "@/components/admin/SprintBuilder";

export const Route = createFileRoute("/admin/labs/new")({ component: LabBuilder });

const STEPS = ["Basic info", "Sprints"];

const diffToDifficulty: Record<"Easy" | "Medium" | "Hard", AdminLab["difficulty"]> = {
  Easy: "Beginner", Medium: "Intermediate", Hard: "Advanced",
};

function LabBuilder() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [sprints, setSprints] = useState<LabSprint[]>([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    icon: "🧪",
    cat: "Java Backend",
    diff: "Medium" as "Easy" | "Medium" | "Hard",
    tickets: 12,
    duration: 6,
    skills: "",
    tags: "",
    description: "",
    repoUrl: "",
    repoBranch: "main",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(s => ({ ...s, [k]: v }));

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const publish = () => {
    if (!form.name.trim()) { setError("Lab name is required."); setStep(0); return; }
    if (!form.description.trim()) { setError("Description is required."); setStep(0); return; }
    setError(null);
    const created = createLab({
      name: form.name.trim(),
      slug: form.slug,
      icon: form.icon || "🧪",
      cat: form.cat,
      color: "custom",
      diff: form.diff,
      difficulty: diffToDifficulty[form.diff],
      users: 0,
      tickets: form.tickets,
      sprints: sprints.length,
      comp: 0,
      rating: 0,
      description: form.description.trim(),
      duration: form.duration,
      skills: form.skills,
      tags: form.tags,
      repoUrl: form.repoUrl,
      repoBranch: form.repoBranch,
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
                <Field label="Lab name *"><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Kotlin Coroutines Bootcamp" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Slug (URL)"><input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="auto-generated from name" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Icon (emoji)"><input value={form.icon} onChange={e => set("icon", e.target.value)} maxLength={2} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Category">
                  <select value={form.cat} onChange={e => set("cat", e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select value={form.diff} onChange={e => set("diff", e.target.value as any)} className="w-full bg-transparent border border-border rounded-md px-3 py-2">
                    {DIFFS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Estimated duration (hrs)"><input type="number" value={form.duration} onChange={e => set("duration", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Tickets"><input type="number" value={form.tickets} onChange={e => set("tickets", Number(e.target.value))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Skills covered" full><input value={form.skills} onChange={e => set("skills", e.target.value)} placeholder="Coroutines, Flow, Channels…" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Industry tags" full><input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="Fintech, Mobile, Backend" className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="Description *" full><textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What learners will build and master in this lab." className="w-full bg-transparent border border-border rounded-md px-3 py-2" /></Field>
                <Field label="GitHub starter repo URL" full><input value={form.repoUrl} onChange={e => set("repoUrl", e.target.value)} placeholder="https://github.com/org/lab-starter" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" /></Field>
                <Field label="Default branch"><input value={form.repoBranch} onChange={e => set("repoBranch", e.target.value)} placeholder="main" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs" /></Field>
              </div>
            </Panel>
          )}
          {step === 1 && (
            <Panel title="Sprints & tasks">
              <SprintBuilder sprints={sprints} setSprints={setSprints} labName={form.name || "New lab"} />
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
            <div className="flex items-center gap-2"><Badge tone={form.name ? "success" : "destructive"}>{form.name ? "ready" : "missing"}</Badge> {form.name || "Name required"}</div>
            <div className="flex items-center gap-2"><Badge tone={form.description ? "success" : "destructive"}>{form.description ? "ready" : "missing"}</Badge> Description</div>
            <div className="flex items-center gap-2"><Badge tone={sprints.length ? "success" : "warning"}>{sprints.length} sprints</Badge> {sprints.reduce((a, s) => a + s.tasks.length, 0)} tasks</div>
            <div className="text-muted-foreground pt-2 border-t border-border/60">{form.cat} · {form.diff} · {form.duration}h</div>
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
