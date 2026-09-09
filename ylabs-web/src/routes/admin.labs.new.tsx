import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useState } from "react";
import { Check } from "lucide-react";
import {
  createLab,
  LAB_TYPES,
  DIFFICULTIES,
  type LabType,
  type LabDifficulty,
} from "@/lib/adminLabs";
import { LabIcon } from "@/components/LabIcon";

export const Route = createFileRoute("/admin/labs/new")({ component: LabBuilder });

const STEPS = ["Basic info"];

function LabBuilder() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);

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
    payment_tier: "free" as "free" | "freemium" | "premium",
    payment_amount: "0",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toList = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const publish = async () => {
    if (!form.title.trim()) {
      setError("Lab title is required.");
      setStep(0);
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required.");
      setStep(0);
      return;
    }
    if (form.payment_tier !== "free" && (parseFloat(form.payment_amount) || 0) <= 0) {
      setError(
        "Payment amount is required and must be greater than 0 for Freemium and Premium labs.",
      );
      setStep(0);
      return;
    }
    setError(null);
    setSaved(true);
    try {
      const created = await createLab({
        title: form.title.trim(),
        slug: form.slug.trim(),
        icon: form.icon || "🧪",
        type: form.type,
        description: form.description.trim(),
        prerequisites: form.prerequisites,
        skills: toList(form.skills),
        git_repo_starter_url: form.gitRepoStarterUrl.trim(),
        difficulty: form.difficulty,
        is_active: form.isActive,
        payment_tier: form.payment_tier,
        payment_amount: form.payment_tier === "free" ? 0 : parseFloat(form.payment_amount) || 0,
      });

      if (created) {
        setTimeout(() => nav({ to: "/admin/labs" }), 600);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create lab");
      setSaved(false);
    }
  };

  return (
    <AdminShell
      title="Lab Builder"
      breadcrumb={["Content", "Labs", "New"]}
      right={
        <Link
          to="/admin/labs"
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
        >
          ← Cancel
        </Link>
      }
    >
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs ${i === step ? "border-primary bg-primary/10 text-primary" : i < step ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border text-[10px]">
                {i + 1}
              </span>
              {s}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-xs px-3 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {step === 0 && (
            <Panel title="Basic info">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <Field label="Title *">
                  <input
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Kotlin Coroutines Bootcamp"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Slug (URL)">
                  <input
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder="auto-generated from title"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Icon preview">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-muted/20">
                    <LabIcon name={form.title} icon={form.icon} size="h-8 w-8" />
                    <span className="text-xs text-muted-foreground">
                      Auto-resolved from lab title
                    </span>
                  </div>
                </Field>
                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value as LabType)}
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  >
                    {LAB_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select
                    value={form.difficulty}
                    onChange={(e) => set("difficulty", e.target.value as LabDifficulty)}
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set("isActive", e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Active (visible to students)
                  </label>
                </Field>
                <Field label="Access Plan">
                  <select
                    value={form.payment_tier}
                    onChange={(e) =>
                      set("payment_tier", e.target.value as "free" | "freemium" | "premium")
                    }
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  >
                    <option value="free">Free — all sprints unlocked</option>
                    <option value="freemium">Freemium — Sprint 1 free, rest locked</option>
                    <option value="premium">Premium — all sprints locked</option>
                  </select>
                </Field>
                {form.payment_tier !== "free" && (
                  <Field label={`Payment Amount (₹) *`}>
                    <input
                      type="number"
                      min="1"
                      value={form.payment_amount}
                      onChange={(e) => set("payment_amount", e.target.value)}
                      placeholder={form.payment_tier === "freemium" ? "499" : "999"}
                      className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                    />
                  </Field>
                )}
                <Field label="Prerequisites (comma-separated)" full>
                  <input
                    value={form.prerequisites}
                    onChange={(e) => set("prerequisites", e.target.value)}
                    placeholder="Basic Java, OOP fundamentals"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Skills covered (comma-separated)" full>
                  <input
                    value={form.skills}
                    onChange={(e) => set("skills", e.target.value)}
                    placeholder="Coroutines, Flow, Channels"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Description *" full>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="What learners will build and master in this lab."
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Git starter repo URL" full>
                  <input
                    value={form.gitRepoStarterUrl}
                    onChange={(e) => set("gitRepoStarterUrl", e.target.value)}
                    placeholder="https://github.com/org/lab-starter"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs"
                  />
                </Field>
              </div>
            </Panel>
          )}

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Link
              to="/admin/labs"
              className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
            >
              ← Cancel
            </Link>
            <button
              onClick={publish}
              disabled={saved}
              className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
            >
              {saved ? "Published — redirecting…" : "Publish lab"}
            </button>
          </div>
        </div>

        <Panel title="Summary">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge tone={form.title ? "success" : "destructive"}>
                {form.title ? "ready" : "missing"}
              </Badge>
              <LabIcon name={form.title} icon={form.icon} size="h-5 w-5" />
              {form.title || "Title required"}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={form.description ? "success" : "destructive"}>
                {form.description ? "ready" : "missing"}
              </Badge>{" "}
              Description
            </div>
            <div className="text-muted-foreground pt-2 border-t border-border/60">
              {LAB_TYPES.find((t) => t.value === form.type)?.label} ·{" "}
              {DIFFICULTIES.find((d) => d.value === form.difficulty)?.label} ·{" "}
              {form.isActive ? "Active" : "Inactive"}
            </div>
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
