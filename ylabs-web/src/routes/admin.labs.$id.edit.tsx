import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell, Panel, Badge } from "@/components/admin/AdminShell";
import { useEffect, useState } from "react";
import { Check, ChevronRight, Ticket, Layers, ExternalLink, Plus } from "lucide-react";
import {
  getLab,
  updateLab,
  LAB_TYPES,
  DIFFICULTIES,
  type AdminLab,
  type LabType,
  type LabDifficulty,
  type LabStatus,
  LAB_STATUSES,
} from "@/lib/adminLabs";
import { loadSprintsWithSeed, saveSprints, type LabSprint } from "@/lib/labSprints";
import { SprintBuilder } from "@/components/admin/SprintBuilder";
import { LabIcon } from "@/components/LabIcon";
import { AVAILABLE_LAB_ICONS } from "@/lib/labIcons";

export const Route = createFileRoute("/admin/labs/$id/edit")({ component: EditLab });

const STEPS = ["Basic info", "Sprints & tickets"];

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
    let active = true;
    const fetchLab = async () => {
      const found = await getLab(id);
      if (!active) return;
      if (!found) {
        nav({ to: "/admin/labs" });
        return;
      }
      setLab(found);
      setPrereqsText(
        typeof found.prerequisites === "string"
          ? found.prerequisites
          : (found.prerequisites ?? []).join(", "),
      );
      setSkillsText((found.skills ?? []).join(", "));

      const sprintData = await loadSprintsWithSeed(
        found.id,
        (found as any).slug || found.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      );
      if (active) setSprints(sprintData);
    };
    fetchLab();
    return () => {
      active = false;
    };
  }, [id, nav]);

  if (!lab) return null;

  const set = <K extends keyof AdminLab>(k: K, v: AdminLab[K]) =>
    setLab((s) => (s ? { ...s, [k]: v } : s));
  const toList = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const save = async () => {
    if (!lab.title.trim()) {
      setError("Lab title is required.");
      setStep(0);
      return;
    }
    if (!lab.description.trim()) {
      setError("Description is required.");
      setStep(0);
      return;
    }
    const tier = lab.payment_tier ?? "free";
    const amount = parseFloat(String(lab.payment_amount ?? 0)) || 0;
    if (tier !== "free" && amount <= 0) {
      setError(
        "Payment amount is required and must be greater than 0 for Freemium and Premium labs.",
      );
      setStep(0);
      return;
    }
    setError(null);
    setSaved(true);
    try {
      await updateLab(lab.id, {
        title: lab.title,
        icon: lab.icon,
        type: lab.type,
        difficulty: lab.difficulty,
        description: lab.description,
        prerequisites: prereqsText,
        skills: toList(skillsText),
        git_repo_starter_url: lab.gitRepoStarterUrl || (lab as any).git_repo_starter_url,
        status: lab.status || (lab.is_active === false ? "inactive" : "active"),
        is_active: (lab.status ? lab.status === "active" : lab.is_active ?? true),
        payment_tier: lab.payment_tier ?? "free",
        payment_amount:
          (lab.payment_tier ?? "free") === "free"
            ? 0
            : parseFloat(String(lab.payment_amount ?? 0)) || 0,
      });

      await saveSprints(lab.id, sprints);
      setTimeout(() => nav({ to: "/admin/labs" }), 500);
    } catch (e: any) {
      const fieldMsg = e?.data && typeof e.data === "object"
        ? Object.entries(e.data)
            .map(([k, v]) => `${k !== "detail" && k !== "error" ? `${k}: ` : ""}${Array.isArray(v) ? v.join(", ") : v}`)
            .join("; ")
        : "";
      setError(fieldMsg || e.message || "Failed to save lab");
      setSaved(false);
    }
  };

  return (
    <AdminShell
      title={`Edit · ${lab.title}`}
      breadcrumb={["Engineering", "Labs", "Edit"]}
      right={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/labs/$id/sprints"
            params={{ id: lab.id }}
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1.5"
          >
            <Ticket className="h-3.5 w-3.5" /> Standalone Sprints Manager →
          </Link>
          <Link
            to="/admin/labs"
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
          >
            ← Back
          </Link>
        </div>
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
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-xs px-3 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          {step === 0 && (
            <Panel title="Basic info">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <Field label="Title *">
                  <input
                    value={lab.title}
                    onChange={(e) => set("title", e.target.value)}
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Icon">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-md border border-border bg-muted/20 shrink-0">
                      <LabIcon name={lab.title} icon={lab.icon} size="h-6 w-6" />
                    </div>
                    <select
                      value={lab.icon || ""}
                      onChange={(e) => set("icon", e.target.value)}
                      className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-xs"
                    >
                      {AVAILABLE_LAB_ICONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="Type">
                  <select
                    value={lab.type}
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
                    value={lab.difficulty}
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
                  <select
                    value={lab.status || (lab.is_active === false ? "inactive" : "active")}
                    onChange={(e) => set("status", e.target.value as LabStatus)}
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-xs"
                  >
                    {LAB_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Access Plan">
                  <select
                    value={lab.payment_tier ?? "free"}
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
                {(lab.payment_tier ?? "free") !== "free" && (
                  <Field label="Payment Amount (₹) *">
                    <input
                      type="number"
                      min="1"
                      value={lab.payment_amount ?? ""}
                      onChange={(e) => set("payment_amount", parseFloat(e.target.value) || 0)}
                      placeholder={lab.payment_tier === "freemium" ? "499" : "999"}
                      className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                    />
                  </Field>
                )}
                <Field label="Prerequisites (comma-separated)" full>
                  <input
                    value={prereqsText}
                    onChange={(e) => setPrereqsText(e.target.value)}
                    placeholder="Basic Java, OOP fundamentals"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Skills (comma-separated)" full>
                  <input
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="Coroutines, Flow, Channels"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Description *" full>
                  <textarea
                    rows={4}
                    value={lab.description}
                    onChange={(e) => set("description", e.target.value)}
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  />
                </Field>
                <Field label="Git starter repo URL" full>
                  <input
                    value={lab.git_repo_starter_url ?? lab.gitRepoStarterUrl ?? ""}
                    onChange={(e) => set("git_repo_starter_url", e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono text-xs"
                  />
                </Field>
              </div>
            </Panel>
          )}

          {step === 1 && (
            <Panel title="Sprints & tasks">
              <SprintBuilder
                sprints={sprints}
                setSprints={setSprints}
                labName={lab.title}
                labSlug={(lab as any).slug}
                labTier={lab.payment_tier}
              />
            </Panel>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
                >
                  Next →
                </button>
              )}
              <button
                onClick={save}
                disabled={saved}
                className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
              >
                {saved ? "Saved — redirecting…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
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
