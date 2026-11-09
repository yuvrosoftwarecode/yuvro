import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { z } from "zod";
import {
  ChevronLeft,
  Plus,
  X,
  Search,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Beaker,
  BookOpen,
  MessageSquare,
  Sparkles,
  Clock,
  Award,
  Star,
  Check,
  Link as LinkIcon,
  Upload,
  Mail,
  Rocket,
  Loader2,
  Eye,
  Pencil,
  GripVertical,
  Shuffle,
  Sliders,
  AlertTriangle,
  Network,
  Layers,
  Cpu,
} from "lucide-react";
import {
  getEvaluation,
  saveEvaluation,
  getLabCalculatedStats,
  evaluationTotals,
  DOMAINS,
  TIMEZONES,
  EXPIRY_OPTIONS,
  PROGRAMMING_LANGUAGES,
  DATABASES,
  SCENARIOS,
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  FORMATS,
  newUid,
  Evaluation,
  Section,
  LabsSection,
  AssessmentSection,
  DiscussionSection,
  SystemDesignSection,
  SystemDesignChallengeItem,
  LabItem,
  QuestionItem,
  CourseItem,
  TopicItem,
  PredefinedQuestion,
  fetchLabs,
  fetchQuestions,
  fetchCourses,
  fetchTopics,
  createEvaluation,
  syncMockInterviews,
  getVitarkaDiscussionConfig,
  syncDiscussionConfig,
} from "@/lib/recruiter";
import { CreateQuestionForm } from "@/components/evaluation/CreateQuestionForm";
import { Workspace } from "@/components/evaluation/WorkspaceApp";
import { createPortal } from "react-dom";
import ProctoringSettingsCard from "@/components/evaluation/ProctoringSettingsCard";
import { questionBankService } from "@/services/questionBankService";

const search = z.object({
  view: z.enum(["edit", "preview", "publish", "publish-done"]).default("edit").catch("edit"),
});

export const Route = createFileRoute("/recruiter/evaluations/$id")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [{ title: "Evaluation Workspace — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: EvaluationWorkspace,
});

function getParentTask(task: any, allTasks: any[] = []): any | null {
  if (!task || !Array.isArray(allTasks)) return null;
  const pRef =
    task.parent_task_id ||
    task.scoring_rules?.parent_task_id ||
    task.scoring_rules?.parent_task ||
    (typeof task.parent_task === "string" ? task.parent_task : task.parent_task?.id) ||
    task.depends_on ||
    task.dependency_task_id;
  if (!pRef) return null;
  const pRefStr = String(pRef).trim();
  return (
    allTasks.find((t: any, idx: number) => {
      const tId = String(t.id ?? `task-${idx}`);
      return (
        tId === pRefStr ||
        String(t.id) === pRefStr ||
        (typeof pRef === "number" && idx === pRef) ||
        (pRefStr.startsWith("task_idx_") && idx === parseInt(pRefStr.replace("task_idx_", ""), 10)) ||
        (pRefStr.startsWith("task_") && idx === parseInt(pRefStr.replace("task_", ""), 10)) ||
        (pRefStr.startsWith("task-") && idx === parseInt(pRefStr.replace("task-", ""), 10)) ||
        (!isNaN(Number(pRefStr)) && idx === Number(pRefStr)) ||
        (t.title && t.title.trim().toLowerCase() === pRefStr.toLowerCase())
      );
    }) || null
  );
}

function getTaskDependencies(task: any, allTasks: any[] = []): any[] {
  const visited = new Set<string>();
  const dependencies: any[] = [];

  function resolve(currentTask: any) {
    if (!currentTask) return;
    const parent = getParentTask(currentTask, allTasks);
    if (parent) {
      const parentKey = String(parent.id || parent.title || Math.random());
      if (!visited.has(parentKey)) {
        visited.add(parentKey);
        resolve(parent);
        dependencies.push(parent);
      }
    }
  }

  resolve(task);
  return dependencies;
}

function TaskDependencyConfirmModal({
  isOpen,
  taskTitle,
  dependentTasks,
  onClose,
  onConfirm,
  actionText = "Remove All",
}: {
  isOpen: boolean;
  taskTitle: string;
  dependentTasks: any[];
  onClose: () => void;
  onConfirm: () => void;
  actionText?: string;
}) {
  if (!isOpen) return null;

  return (
    <Overlay onClose={onClose} zIndex="z-[70]">
      <div className="w-[500px] max-w-[94vw] rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121215] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-neutral-900 dark:text-white">
                Dependent Tasks Detected
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The following task{dependentTasks.length > 1 ? "s" : ""} depend{dependentTasks.length === 1 ? "s" : ""} on{" "}
              <span className="font-semibold text-neutral-900 dark:text-white">
                "{taskTitle}"
              </span>:
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] p-2.5 space-y-2">
          {dependentTasks.map((dep, idx) => (
            <div
              key={dep.id ?? idx}
              className="flex items-center gap-2.5 text-[13px] font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-[#18181b] px-3 py-2 rounded-lg border border-neutral-200/60 dark:border-white/5 shadow-xs"
            >
              <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">{dep.title || dep.id}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-400">
          Deselecting or removing this task will also remove {dependentTasks.length > 1 ? "all its dependent tasks" : "its dependent task"}. Do you want to proceed?
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-transparent px-4 py-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-[13px] font-medium shadow-sm transition cursor-pointer"
          >
            {actionText}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function EvaluationWorkspace() {
  const { id } = Route.useParams();
  const { view } = Route.useSearch();
  const nav = useNavigate();
  const loc = useLocation();
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [labDrawerFor, setLabDrawerFor] = useState<{ sectionId: string; labId?: string } | null>(null);
  const [qDrawerFor, setQDrawerFor] = useState<{ sectionId: string } | null>(null);
  const [sdDrawerFor, setSdDrawerFor] = useState<{ sectionId: string } | null>(null);
  const [depConfirm, setDepConfirm] = useState<{
    taskTitle: string;
    dependentTasks: any[];
    onConfirm: () => void;
    actionText?: string;
  } | null>(null);

  // Child route matched (e.g. /workspace, /candidates/...) — defer to it.
  const isChild = loc.pathname.replace(/\/$/, "") !== `/recruiter/evaluations/${id}`;

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isChild) return;
    if (id === "draft") {
      createEvaluation().then((e) => {
        syncDiscussionConfig(e);
        setEv(e);
      });
    } else {
      getEvaluation(id).then((e) => {
        if (!e) nav({ to: "/recruiter/evaluations" });
        else {
          syncDiscussionConfig(e);
          setEv(e);
        }
      });
    }
  }, [id, nav, isChild]);

  if (isChild) return <Outlet />;
  if (!ev) return null;

  const update = (fn: (e: Evaluation) => void) => {
    const c = { ...ev, sections: JSON.parse(JSON.stringify(ev.sections)) };
    fn(c);
    syncDiscussionConfig(c);
    setEv(c);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const syncedEv = await syncMockInterviews(ev);

    const saved = await saveEvaluation(syncedEv);
    if (saved) {
      if (ev.id === "draft") {
        nav({ to: "/recruiter/evaluations/$id", params: { id: saved.id }, search: { view: "edit" } as any, replace: true });
      } else {
        setEv(saved);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    }
    setIsSaving(false);
  };

  const totals = evaluationTotals(ev);

  const setView = (v: "edit" | "preview" | "publish" | "publish-done") =>
    nav({ to: "/recruiter/evaluations/$id", params: { id }, search: { view: v } });

  if (view === "publish-done") return <PublishedScreen ev={ev} onBack={() => setView("edit")} />;
  if (view === "publish")
    return (
      <PublishScreen
        ev={ev}
        onBack={() => setView("edit")}
        onPublish={async (invite) => {
          setIsSaving(true);

          const syncedEv = await syncMockInterviews(ev);

          const c = {
            ...syncedEv,
            status: "published" as const,
            publishedAt: Date.now(),
            invite,
            candidatesInvited: invite.emails.length || (invite.type === "link" ? 0 : 0),
            sections: JSON.parse(JSON.stringify(syncedEv.sections)),
          };
          const saved = await saveEvaluation(c);
          if (saved) {
            if (ev.id === "draft") {
              setEv(saved);
              nav({
                to: "/recruiter/evaluations/$id",
                params: { id: saved.id },
                search: { view: "publish-done" },
                replace: true,
              });
            } else {
              setEv(saved);
              setView("publish-done");
            }
          }
          setIsSaving(false);
        }}
      />
    );
  if (view === "preview") return <PreviewScreen ev={ev} onBack={() => setView("edit")} />;

  return (
    <div className="grid grid-cols-[1fr_320px] gap-0">
      {/* Main workspace */}
      <div className="min-h-screen p-8 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <Link
              to="/recruiter/evaluations"
              className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> All evaluations
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("preview")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-neutral-300 hover:bg-white/5"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
              >
                {isSaving ? (
                  "Saving..."
                ) : saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Saved!
                  </>
                ) : (
                  "Save Draft"
                )}
              </button>
              <button
                onClick={() => setView("publish")}
                disabled={ev.sections.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40"
              >
                <Rocket className="h-3.5 w-3.5" /> Publish
              </button>
            </div>
          </div>

          <div className="mt-8">
            <input
              value={ev.title}
              onChange={(e) =>
                update((x) => {
                  x.title = e.target.value;
                })
              }
              placeholder="Untitled Evaluation"
              className="w-full border-0 bg-transparent text-[42px] font-semibold tracking-tight text-white placeholder-neutral-600 outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <select
                value={ev.domain}
                onChange={(e) =>
                  update((x) => {
                    x.domain = e.target.value as any;
                  })
                }
                className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[12px] text-neutral-300 outline-none"
              >
                <option value="">Set domain…</option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-neutral-500">·</span>
              <span className="text-[12px] text-neutral-500">
                {ev.sections.length} sections · {totals.minutes} min · {totals.marks} marks
              </span>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {ev.sections.map((s, idx) => (
              <SectionBlock
                key={s.id}
                section={s}
                index={idx}
                total={ev.sections.length}
                allSections={ev.sections}
                onChange={(next) =>
                  update((x) => {
                    x.sections[idx] = next;
                  })
                }
                onDelete={() =>
                  update((x) => {
                    x.sections.splice(idx, 1);
                  })
                }
                onDuplicate={() =>
                  update((x) => {
                    x.sections.splice(idx + 1, 0, {
                      ...JSON.parse(JSON.stringify(s)),
                      id: newUid(),
                    });
                  })
                }
                onMove={(dir) =>
                  update((x) => {
                    const to = idx + (dir === "up" ? -1 : 1);
                    if (to < 0 || to >= x.sections.length) return;
                    const [it] = x.sections.splice(idx, 1);
                    x.sections.splice(to, 0, it);
                  })
                }
                onAddLab={() => setLabDrawerFor({ sectionId: s.id })}
                onConfigureLab={(lab) => setLabDrawerFor({ sectionId: s.id, labId: lab.id })}
                onAddQuestions={() => setQDrawerFor({ sectionId: s.id })}
                onPickSystemDesignChallenge={() => setSdDrawerFor({ sectionId: s.id })}
              />
            ))}

            <button
              onClick={() => setAddSectionOpen(true)}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-6 text-[13px] text-neutral-500 transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.03] hover:text-white"
            >
              <Plus className="h-4 w-4 transition group-hover:rotate-90" /> Add Section
            </button>
          </div>
        </div>
      </div>

      {/* Right summary */}
      <SummarySidebar
        ev={ev}
        onPublish={() => setView("publish")}
        onPreview={() => setView("preview")}
      />

      {/* Modals & drawers */}
      {addSectionOpen && (
        <AddSectionModal
          onClose={() => setAddSectionOpen(false)}
          onPick={(kind) => {
            update((x) => {
              if (kind === "labs")
                x.sections.push({
                  id: newUid(),
                  kind: "labs",
                  title: "Engineering Labs",
                  labs: [],
                  proctoring: { enableProctoring: true, enableCopyPaste: false, tabSwitchAllowed: false, tabSwitchLimit: 3 },
                });
              else if (kind === "assessment")
                x.sections.push({
                  id: newUid(),
                  kind: "assessment",
                  title: "Knowledge Assessment",
                  questions: [],
                  proctoring: { enableProctoring: true, enableCopyPaste: false, tabSwitchAllowed: false, tabSwitchLimit: 3 },
                });
              else if (kind === "system_design") {
                const defaultSDChallenge: SystemDesignChallengeItem = {
                  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "sd-url-shortener",
                  title: "URL Shortener System Design",
                  description: "Design a high-scale, low-latency URL shortener service with sub-50ms p99 redirects, caching, and analytics.",
                  system_slug: "systemdesign-url-shortener",
                  scenario_type: "Distributed System",
                  difficulty: "Medium",
                  domain: "Other",
                  duration_minutes: 45,
                  marks: 30,
                  tasks: [
                    { id: "sd_task_1", title: "Add core architectural components", description: "Place API Gateway, URL Service, relational database, Redis cache, and analytics worker on the canvas.", marks: 8 },
                    { id: "sd_task_2", title: "Connect request routing & cache-aside flow", description: "Route client requests through gateway to URL service, and configure cache read-aside in front of PostgreSQL.", marks: 8 },
                    { id: "sd_task_3", title: "Model database schema & indexing", description: "Define DBML schema for URLs table with unique short_code index, original_url, user_id, and click_count.", marks: 7 },
                    { id: "sd_task_4", title: "Define REST API contracts & architecture notes", description: "Specify POST /api/v1/urls and GET /{short_code}, and document caching trade-offs in notes.", marks: 7 },
                  ],
                  constraints: [
                    "100M new URLs shortened per month",
                    "Read to write ratio 100:1 (4,000 reads/sec)",
                    "Redirect latency p99 < 50ms"
                  ]
                };
                x.sections.push({
                  id: newUid(),
                  kind: "system_design",
                  title: "System Design",
                  duration: 45,
                  marks: 30,
                  challenges: [defaultSDChallenge],
                  questions: [defaultSDChallenge],
                  proctoring: { enableProctoring: true, enableCopyPaste: false, tabSwitchAllowed: false, tabSwitchLimit: 3 },
                });
              } else {
                const { marks, duration } = getVitarkaDiscussionConfig(x.sections);
                x.sections.push({
                  id: newUid(),
                  kind: "discussion",
                  title: "Vitarka AI Discussion",
                  duration,
                  mode: "Automatic",
                  marks,
                  max_score: marks,
                  questions: [],
                  proctoring: { enableProctoring: true, enableCopyPaste: false, tabSwitchAllowed: false, tabSwitchLimit: 3 },
                });
              }
            });
            setAddSectionOpen(false);
          }}
        />
      )}
      {labDrawerFor && (
        <LabDrawer
          sectionLabs={
            (ev.sections.find((s) => s.id === labDrawerFor.sectionId) as LabsSection | undefined)?.labs ?? []
          }
          initialExpandedLabId={labDrawerFor.labId}
          onClose={() => setLabDrawerFor(null)}
          onAddFullLab={(lab) => {
            update((x) => {
              const sec = x.sections.find((s) => s.id === labDrawerFor.sectionId) as LabsSection | undefined;
              if (sec) {
                const allTaskIds = (lab.tasks || []).map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`));
                const existingIndex = sec.labs.findIndex((l) => String(l.id) === String(lab.id));
                const baseLab = {
                  ...(existingIndex >= 0 ? sec.labs[existingIndex] : {}),
                  ...lab,
                  selected_task_ids: allTaskIds,
                  selected_task_id: undefined,
                  selected_task: undefined,
                };
                const stats = getLabCalculatedStats(baseLab);
                const labWithStats = {
                  ...baseLab,
                  duration_minutes: stats.minutes,
                  marks: stats.marks,
                };
                if (existingIndex >= 0) {
                  sec.labs[existingIndex] = labWithStats;
                } else {
                  sec.labs.push(labWithStats);
                }
              }
            });
          }}
          onToggleTask={(lab, task, select) => {
            const sec = ev.sections.find((s) => s.id === labDrawerFor.sectionId) as LabsSection | undefined;
            if (!sec) return;

            const allTasks = lab.tasks || [];
            const targetTaskId = String(task.id ?? task.task_slug ?? task.title);
            const existingIndex = sec.labs.findIndex((l) => String(l.id) === String(lab.id));

            if (select) {
              const dependencies = getTaskDependencies(task, allTasks);
              const tasksToAdd = [...dependencies, task];
              const idsToAdd: string[] = [];
              tasksToAdd.forEach((t: any) => {
                const realIdx = allTasks.findIndex(
                  (at: any) => at === t || (at.id && at.id === t.id) || (at.title && at.title === t.title)
                );
                const tId = String(t.id ?? t.task_slug ?? `task-${realIdx >= 0 ? realIdx : 0}`);
                idsToAdd.push(tId);
                if (t.id) idsToAdd.push(String(t.id));
                if (t.title) idsToAdd.push(String(t.title));
              });

              update((x) => {
                const s = x.sections.find((secItem) => secItem.id === labDrawerFor.sectionId) as LabsSection | undefined;
                if (!s) return;
                const exIdx = s.labs.findIndex((l) => String(l.id) === String(lab.id));
                if (exIdx >= 0) {
                  const existingLab = s.labs[exIdx];
                  const currentIds = new Set(
                    existingLab.selected_task_ids && existingLab.selected_task_ids.length > 0
                      ? existingLab.selected_task_ids.map(String)
                      : []
                  );
                  idsToAdd.forEach((id) => currentIds.add(id));
                  const updatedLab = {
                    ...existingLab,
                    ...lab,
                    selected_task_ids: Array.from(currentIds),
                    selected_task_id: undefined,
                    selected_task: undefined,
                  };
                  const stats = getLabCalculatedStats(updatedLab);
                  const canonicalIds = stats.selectedTasks.length > 0 && stats.selectedTasks.length < allTasks.length
                    ? stats.selectedTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`))
                    : Array.from(currentIds);
                  s.labs[exIdx] = {
                    ...updatedLab,
                    selected_task_ids: canonicalIds,
                    duration_minutes: stats.minutes,
                    marks: stats.marks,
                  };
                } else {
                  const newLab = {
                    ...lab,
                    selected_task_ids: Array.from(new Set(idsToAdd)),
                    selected_task_id: undefined,
                    selected_task: undefined,
                  };
                  const stats = getLabCalculatedStats(newLab);
                  const canonicalIds = stats.selectedTasks.length > 0 && stats.selectedTasks.length < allTasks.length
                    ? stats.selectedTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`))
                    : Array.from(new Set(idsToAdd));
                  s.labs.push({
                    ...newLab,
                    selected_task_ids: canonicalIds,
                    duration_minutes: stats.minutes,
                    marks: stats.marks,
                  });
                }
              });
            } else {
              if (existingIndex < 0) return;
              const existingLab = sec.labs[existingIndex];
              const currentIds = new Set(
                (existingLab.selected_task_ids && existingLab.selected_task_ids.length > 0)
                  ? existingLab.selected_task_ids.map(String)
                  : (allTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`)))
              );

              const dependentTasks = allTasks.filter((other: any) => {
                const otherId = String(other.id ?? other.task_slug ?? other.title);
                if (otherId === targetTaskId || !currentIds.has(otherId)) return false;
                const deps = getTaskDependencies(other, allTasks);
                return deps.some(
                  (d: any) =>
                    String(d.id || d.title) === targetTaskId ||
                    String(d.id || d.title) === String(task.title)
                );
              });

              const executeDeselect = (removeDeps: boolean) => {
                update((x) => {
                  const s = x.sections.find((secItem) => secItem.id === labDrawerFor.sectionId) as LabsSection | undefined;
                  if (!s) return;
                  const exIdx = s.labs.findIndex((l) => String(l.id) === String(lab.id));
                  if (exIdx < 0) return;
                  const curLab = s.labs[exIdx];
                  const ids = new Set(
                    (curLab.selected_task_ids && curLab.selected_task_ids.length > 0)
                      ? curLab.selected_task_ids.map(String)
                      : (allTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`)))
                  );

                  if (removeDeps) {
                    dependentTasks.forEach((d: any) => {
                      ids.delete(String(d.id ?? d.task_slug ?? d.title));
                    });
                  }

                  ids.delete(targetTaskId);
                  if (task.title) ids.delete(String(task.title));

                  if (ids.size === 0) {
                    s.labs.splice(exIdx, 1);
                  } else {
                    const updatedLab = {
                      ...curLab,
                      selected_task_ids: Array.from(ids),
                      selected_task_id: undefined,
                      selected_task: undefined,
                    };
                    const stats = getLabCalculatedStats(updatedLab);
                    const canonicalIds = stats.selectedTasks.length > 0 && stats.selectedTasks.length < allTasks.length
                      ? stats.selectedTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`))
                      : Array.from(ids);
                    s.labs[exIdx] = {
                      ...updatedLab,
                      selected_task_ids: canonicalIds,
                      duration_minutes: stats.minutes,
                      marks: stats.marks,
                    };
                  }
                });
              };

              if (dependentTasks.length > 0) {
                setDepConfirm({
                  taskTitle: task.title || task.id,
                  dependentTasks,
                  actionText: "Deselect All",
                  onConfirm: () => executeDeselect(true),
                });
                return;
              }

              executeDeselect(false);
            }
          }}
        />
      )}

      {qDrawerFor && (
        <QuestionDrawer
          existing={(
            (
              ev.sections.find((s) => s.id === qDrawerFor.sectionId) as
                AssessmentSection | undefined
            )?.questions ?? []
          ).map((q) => q.id)}
          onClose={() => setQDrawerFor(null)}
          onAdd={(q) => {
            update((x) => {
              const sec = x.sections.find((s) => s.id === qDrawerFor.sectionId) as
                AssessmentSection | undefined;
              if (sec && !sec.questions.find((qq) => qq.id === q.id)) sec.questions.push(q);
            });
          }}
          onRemove={(id) => {
            update((x) => {
              const sec = x.sections.find((s) => s.id === qDrawerFor.sectionId) as
                AssessmentSection | undefined;
              if (sec) {
                sec.questions = sec.questions.filter((qq) => qq.id !== id);
              }
            });
          }}
        />
      )}

      {sdDrawerFor && (
        <SystemDesignDrawer
          sectionId={sdDrawerFor.sectionId}
          currentChallenges={
            (
              ev.sections.find((s) => s.id === sdDrawerFor.sectionId) as
                SystemDesignSection | undefined
            )?.challenges ?? []
          }
          onClose={() => setSdDrawerFor(null)}
          onSelectChallenge={(challenge) => {
            update((x) => {
              const sec = x.sections.find((s) => s.id === sdDrawerFor.sectionId) as
                SystemDesignSection | undefined;
              if (sec) {
                sec.challenges = [challenge];
                sec.questions = [challenge];
                if (challenge.duration_minutes) sec.duration = challenge.duration_minutes;
                if (challenge.marks) sec.marks = challenge.marks;
              }
            });
            setSdDrawerFor(null);
          }}
        />
      )}

      {depConfirm && (
        <TaskDependencyConfirmModal
          isOpen={!!depConfirm}
          taskTitle={depConfirm.taskTitle}
          dependentTasks={depConfirm.dependentTasks}
          actionText={depConfirm.actionText || "Remove All"}
          onClose={() => setDepConfirm(null)}
          onConfirm={depConfirm.onConfirm}
        />
      )}
    </div>
  );
}

// ---------------- Section block ----------------

function SectionBlock({
  section,
  index,
  total,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
  onAddLab,
  onConfigureLab,
  onAddQuestions,
  onPickSystemDesignChallenge,
  allSections,
}: {
  section: Section;
  index: number;
  total: number;
  onChange: (s: Section) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: "up" | "down") => void;
  onAddLab: () => void;
  onConfigureLab?: (lab: LabItem) => void;
  onAddQuestions: () => void;
  onPickSystemDesignChallenge?: () => void;
  allSections?: Section[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const icon =
    section.kind === "labs"
      ? Beaker
      : section.kind === "assessment"
        ? BookOpen
        : section.kind === "system_design"
          ? Network
          : MessageSquare;
  const tone =
    section.kind === "labs"
      ? "from-emerald-400 to-cyan-400"
      : section.kind === "assessment"
        ? "from-violet-400 to-fuchsia-400"
        : section.kind === "system_design"
          ? "from-blue-400 to-indigo-500"
          : "from-amber-400 to-orange-400";

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <GripVertical className="h-4 w-4 cursor-grab text-neutral-600" />
        <div
          className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br ${tone} text-black`}
        >
          {(() => {
            const I = icon;
            return <I className="h-3.5 w-3.5" />;
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Section {index + 1}
          </div>
          {renaming ? (
            <input
              autoFocus
              onBlur={() => setRenaming(false)}
              value={section.title}
              onChange={(e) => onChange({ ...section, title: e.target.value } as Section)}
              className="w-full bg-transparent text-[15px] text-white outline-none"
            />
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="truncate text-left text-[15px] font-medium text-white"
            >
              {section.title}
            </button>
          )}
        </div>
        <ToolBtn title="Move up" onClick={() => onMove("up")} disabled={index === 0}>
          <ArrowUp className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Move down" onClick={() => onMove("down")} disabled={index === total - 1}>
          <ArrowDown className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Duplicate" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </ToolBtn>
        <ToolBtn title="Delete" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>
      {!collapsed && (
        <div className="p-4">
          {section.kind === "labs" && (
            <LabsSectionBody
              section={section}
              onChange={onChange}
              onAddLab={onAddLab}
              onConfigureLab={onConfigureLab}
            />
          )}
          {section.kind === "assessment" && (
            <AssessmentSectionBody
              section={section}
              onChange={onChange}
              onAddQuestions={onAddQuestions}
            />
          )}
          {section.kind === "discussion" && (
            <DiscussionSectionBody section={section} onChange={onChange} allSections={allSections} />
          )}
          {section.kind === "system_design" && (
            <SystemDesignSectionBody
              section={section}
              onChange={onChange}
              onOpenChallengePicker={onPickSystemDesignChallenge || (() => {})}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function LabsSectionBody({
  section,
  onChange,
  onAddLab,
  onConfigureLab,
}: {
  section: LabsSection;
  onChange: (s: Section) => void;
  onAddLab: () => void;
  onConfigureLab?: (l: LabItem) => void;
}) {
  const [taskDepConfirm, setTaskDepConfirm] = useState<{
    taskTitle: string;
    dependentTasks: any[];
    onConfirm: () => void;
  } | null>(null);

  const minutes = section.labs.reduce((a, l) => a + getLabCalculatedStats(l).minutes, 0);
  const marks = section.labs.reduce((a, l) => a + getLabCalculatedStats(l).marks, 0);

  const removeLabAtIndex = (index: number) => {
    onChange({ ...section, labs: section.labs.filter((_, idx) => idx !== index) });
  };

  const removeTaskFromLab = (labIndex: number, taskToRemove: any) => {
    const targetLab = section.labs[labIndex];
    if (!targetLab) return;

    const allTasks = targetLab.tasks || [];
    const stats = getLabCalculatedStats(targetLab);
    const selectedTaskIds = new Set(
      stats.selectedTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`))
    );
    const targetTaskId = String(taskToRemove.id ?? taskToRemove.task_slug ?? taskToRemove.title);

    // Check if any other selected task in this lab depends on the task being removed
    const dependentTasks = stats.selectedTasks.filter((other: any) => {
      const otherId = String(other.id ?? other.task_slug ?? other.title);
      if (otherId === targetTaskId) return false;
      const deps = getTaskDependencies(other, allTasks);
      return deps.some(
        (d: any) =>
          String(d.id || d.title) === targetTaskId ||
          String(d.id || d.title) === String(taskToRemove.title)
      );
    });

    const executeRemoval = (removeDeps: boolean) => {
      const removeIds = new Set([
        targetTaskId,
        ...(removeDeps ? dependentTasks.map((d: any) => String(d.id ?? d.task_slug ?? d.title)) : []),
      ]);

      const remainingIds = Array.from(selectedTaskIds).filter((id) => !removeIds.has(id));
      if (remainingIds.length === 0) {
        onChange({
          ...section,
          labs: section.labs.filter((_, idx) => idx !== labIndex),
        });
      } else {
        const updatedLab = {
          ...targetLab,
          selected_task_ids: remainingIds,
          selected_task_id: undefined,
          selected_task: undefined,
        };
        const stats = getLabCalculatedStats(updatedLab);
        const updatedLabs = [...section.labs];
        updatedLabs[labIndex] = {
          ...updatedLab,
          duration_minutes: stats.minutes,
          marks: stats.marks,
        };
        onChange({ ...section, labs: updatedLabs });
      }
    };

    if (dependentTasks.length > 0) {
      setTaskDepConfirm({
        taskTitle: taskToRemove.title || taskToRemove.id,
        dependentTasks,
        onConfirm: () => executeRemoval(true),
      });
      return;
    }

    executeRemoval(false);
  };

  const dupAtIndex = (index: number) => {
    const l = section.labs[index];
    if (!l) return;
    onChange({
      ...section,
      labs: [...section.labs, { ...JSON.parse(JSON.stringify(l)), id: newUid() }],
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Labs" value={section.labs.length} />
        <Stat label="Time" value={`${minutes} min`} />
        <Stat label="Marks" value={marks} />
      </div>
      {section.labs.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {section.labs.map((l, i) => {
            const stats = getLabCalculatedStats(l);
            const allTasks = l.tasks || [];
            const allTasksCount = allTasks.length;
            const hasTaskBreakdown = allTasksCount > 0;
            const selectedCount = stats.selectedTasks.length;
            const isPartial = hasTaskBreakdown && selectedCount < allTasksCount;

            return (
              <li
                key={l.id + `-${i}`}
                className="rounded-lg border border-white/5 bg-black/20 p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[10px] text-neutral-500 pt-0.5">L{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-white flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{l.title}</span>
                      {hasTaskBreakdown && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            isPartial
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isPartial
                            ? `${selectedCount} of ${allTasksCount} tasks selected`
                            : `All ${allTasksCount} tasks selected`}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-500">
                      {l.domain} · {l.programming_languages?.[0] || "Any"} · {l.scenario} ·{" "}
                      {l.difficulty} · {stats.minutes} min · {stats.marks} marks
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onConfigureLab && hasTaskBreakdown && (
                      <ToolBtn title="Configure Tasks" onClick={() => onConfigureLab(l)}>
                        <Sliders className="h-3.5 w-3.5" />
                      </ToolBtn>
                    )}
                    <ToolBtn title="Duplicate" onClick={() => dupAtIndex(i)}>
                      <Copy className="h-3.5 w-3.5" />
                    </ToolBtn>
                    <ToolBtn title="Remove Lab" onClick={() => removeLabAtIndex(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </ToolBtn>
                  </div>
                </div>

                {hasTaskBreakdown && (
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mr-1">
                      Selected Tasks:
                    </span>
                    {stats.selectedTasks.map((task: any, tIdx: number) => {
                      const parentTask = getParentTask(task, allTasks);
                      return (
                        <span
                          key={task.id || tIdx}
                          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-neutral-300"
                        >
                          <span>{task.title || `Task ${tIdx + 1}`}</span>
                          {task.marks != null && (
                            <span className="text-[9.5px] text-neutral-500 font-mono">({task.marks}m)</span>
                          )}
                          {parentTask && (
                            <span
                              title={`Depends on: ${parentTask.title || parentTask.id}`}
                              className="inline-flex items-center text-amber-400/80"
                            >
                              <LinkIcon className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <button
                            onClick={() => removeTaskFromLab(i, task)}
                            title="Remove this task"
                            className="text-neutral-500 hover:text-rose-400 transition-colors ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <button
        onClick={onAddLab}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[12px] text-neutral-400 hover:border-emerald-400/40 hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" /> Add Lab
      </button>

      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard
          proctoring={section.proctoring || {}}
          onChange={(p) => onChange({ ...section, proctoring: p })}
        />
      </div>

      {taskDepConfirm && (
        <TaskDependencyConfirmModal
          isOpen={!!taskDepConfirm}
          taskTitle={taskDepConfirm.taskTitle}
          dependentTasks={taskDepConfirm.dependentTasks}
          actionText="Remove All"
          onClose={() => setTaskDepConfirm(null)}
          onConfirm={taskDepConfirm.onConfirm}
        />
      )}
    </div>
  );
}

function LabPreview({ l }: { l: any }) {
  return (
    <div className="rounded-md bg-neutral-50 dark:bg-white/5 p-4 text-[13px] text-neutral-700 dark:text-neutral-300 space-y-4">
      {l.description ? (
        <div className="whitespace-pre-wrap">{l.description}</div>
      ) : l.text ? (
        <div className="whitespace-pre-wrap">{l.text}</div>
      ) : (
        <div className="italic text-neutral-500">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-neutral-500">Domain</div>
          <div className="text-neutral-900 dark:text-white">{l.domain || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500">Scenario</div>
          <div className="text-neutral-900 dark:text-white">{l.scenario || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500">Difficulty</div>
          <div className="text-neutral-900 dark:text-white">{l.difficulty || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500">Duration</div>
          <div className="text-neutral-900 dark:text-white">{l.duration_minutes || 0} min</div>
        </div>
        <div>
          <div className="text-neutral-500">Marks</div>
          <div className="text-neutral-900 dark:text-white">{l.marks || 0}</div>
        </div>
      </div>

      {l.programming_languages && l.programming_languages.length > 0 && (
        <div>
          <div className="text-neutral-500 mb-1 text-[12px]">Programming Languages</div>
          <div className="flex flex-wrap gap-1">
            {l.programming_languages.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {l.databases && l.databases.length > 0 && (
        <div>
          <div className="text-neutral-500 mb-1 text-[12px]">Databases</div>
          <div className="flex flex-wrap gap-1">
            {l.databases.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {l.tasks && l.tasks.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-white/5 pt-4">
          <div className="text-neutral-700 dark:text-neutral-400 font-semibold mb-3">Tasks in this Lab</div>
          <div className="space-y-2">
            {l.tasks.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded bg-neutral-100 dark:bg-black/20 p-3 text-[12px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {i + 1}. {t.title}
                  </span>
                  {t.difficulty && (
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t.difficulty}</span>
                  )}
                </div>
                {t.description && (
                  <div className="text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1 whitespace-pre-wrap">
                    {t.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Solutions */}
      {(() => {
        let solFiles: { path: string; code: string }[] = [];
        if (Array.isArray(l.solution_files) && l.solution_files.length > 0) {
          solFiles = l.solution_files.map((sf: any, idx: number) => ({
            path: typeof sf === "string" ? sf : (sf.path || sf.file || `file_${idx + 1}`),
            code: typeof sf === "string" ? "" : (sf.code || sf.content || ""),
          }));
        } else if (l.solution && typeof l.solution === "object" && !Array.isArray(l.solution)) {
          solFiles = Object.entries(l.solution).map(([path, code]) => ({
            path,
            code: typeof code === "string" ? code : JSON.stringify(code, null, 2),
          }));
        } else if (typeof l.solution === "string" && l.solution.trim()) {
          solFiles = [{ path: "solution.py", code: l.solution }];
        }

        if (solFiles.length === 0) return null;

        return (
          <div className="border-t border-neutral-200 dark:border-white/5 pt-4">
            <div className="text-neutral-700 dark:text-neutral-400 font-semibold mb-3 flex items-center justify-between">
              <span>Reference Solution</span>
              <span className="text-[11px] text-neutral-500 font-normal">
                {solFiles.length} file{solFiles.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {solFiles.map((sf, idx) => (
                <div key={idx} className="rounded border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-black/30 p-2.5 text-[11px]">
                  <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 mb-1.5 truncate">
                    {sf.path}
                  </div>
                  <pre className="font-mono text-[10px] text-neutral-700 dark:text-neutral-300 max-h-40 overflow-auto whitespace-pre p-2 bg-neutral-200/50 dark:bg-black/40 rounded custom-scrollbar">
                    <code>{sf.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function QuestionPreview({ q }: { q: any }) {
  if (!q) return null;

  const questionContent = q.content || q.description || (q.text && q.text !== q.title ? q.text : "");
  
  const options = Array.isArray(q.mcq_options) && q.mcq_options.length > 0
    ? q.mcq_options
    : Array.isArray(q.options) && q.options.length > 0
    ? q.options
    : [];

  const testCases = Array.isArray(q.test_cases_basic) && q.test_cases_basic.length > 0
    ? q.test_cases_basic
    : Array.isArray(q.test_cases) && q.test_cases.length > 0
    ? q.test_cases
    : Array.isArray(q.examples) && q.examples.length > 0
    ? q.examples
    : [];

  const rawHints = (Array.isArray(q.hints) && q.hints.length > 0)
    ? q.hints
    : [];

  const hints = rawHints.map((h: any) => {
    if (typeof h === "string") return h.trim();
    return h?.text || h?.hint || String(h);
  }).filter(Boolean);

  let solutions: any[] = [];
  if (Array.isArray(q.solutions) && q.solutions.length > 0) {
    solutions = q.solutions;
  } else if (q.solution_explanation && typeof q.solution_explanation === "string") {
    let explanationText = q.solution_explanation;
    // Just in case there is some lingering JSON string, try to parse or keep as text
    if (explanationText.trim().startsWith("{")) {
       try {
         const p = JSON.parse(explanationText);
         if (p.solutions && p.solutions.length > 0) {
           solutions = p.solutions;
           explanationText = "";
         } else if (p.hints && p.hints.length > 0) {
           explanationText = "";
         }
       } catch {}
    }
    if (explanationText) {
      solutions = [{ title: "Solution Explanation", code: explanationText, language: "text" }];
    }
  } else if (typeof q.solution === "string" && q.solution.trim()) {
    solutions = [{ title: "Solution", code: q.solution, language: "text" }];
  } else if (typeof q.solution === "object" && q.solution && Object.keys(q.solution).length > 0) {
    solutions = [{ title: "Solution", code: JSON.stringify(q.solution, null, 2), language: "json" }];
  }

  return (
    <div className="rounded-md bg-neutral-50 dark:bg-white/5 p-4 text-[13px] text-neutral-700 dark:text-neutral-300 space-y-4">
      {questionContent && (
        <div className="whitespace-pre-wrap font-medium text-neutral-900 dark:text-white">{questionContent}</div>
      )}

      {options.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Options:</div>
          {options.map((opt: any, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/5 px-3 py-2">
              <div className="mt-0.5">
                {opt?.is_correct ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-white/20" />
                )}
              </div>
              <div className="flex-1 text-neutral-900 dark:text-white">{opt?.text || (typeof opt === "string" ? opt : "")}</div>
            </div>
          ))}
        </div>
      )}

      {testCases.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Examples:</div>
          {testCases.map((ex: any, i: number) => (
            <div key={i} className="rounded bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/5 p-3 font-mono text-[11px]">
              <div className="text-neutral-900 dark:text-neutral-300">
                <span className="text-neutral-500">Input:</span> {ex?.input !== undefined ? String(ex.input) : ""}
              </div>
              <div className="mt-2 text-neutral-900 dark:text-neutral-300">
                <span className="text-neutral-500">Output:</span> {ex?.expected_output !== undefined ? String(ex.expected_output) : ex?.output !== undefined ? String(ex.output) : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Hints:</div>
          <ul className="list-inside list-disc space-y-1">
            {hints.map((hint: string, i: number) => (
              <li key={i} className="text-neutral-700 dark:text-neutral-300">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {solutions.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Solutions:</div>
          {solutions.map((sol: any, i: number) => (
            <div key={i} className="rounded border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-white">
                  {sol?.title || "Solution"}
                </span>
                {sol?.language && (
                  <span className="rounded bg-neutral-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-neutral-600 dark:text-neutral-400">
                    {sol.language}
                  </span>
                )}
                {sol?.is_primary && (
                  <span className="rounded bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase text-emerald-700 dark:text-emerald-400">
                    Primary
                  </span>
                )}
              </div>
              {sol?.code && (
                <pre className="overflow-x-auto rounded bg-neutral-100 dark:bg-black/50 p-2 font-mono text-[11px] text-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-white/5">
                  <code>{sol.code}</code>
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentQuestionItem({ q, onRemove }: { q: any; onRemove: () => void }) {
  return (
    <li className="flex flex-col rounded-md border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="line-clamp-1 flex-1 text-[12px] text-neutral-300">
          {q.text || q.content || q.title || "Untitled Question"}
        </span>
        <span className="text-[10px] text-neutral-500">
          {q.difficulty} &middot; {q.marks}m &middot;{" "}
          {q.duration_minutes || (q.seconds ? Math.ceil(q.seconds / 60) : 0)} min
        </span>
        <ToolBtn title="Remove" onClick={onRemove}>
          <X className="h-3 w-3" />
        </ToolBtn>
      </div>
    </li>
  );
}

function AssessmentSectionBody({
  section,
  onChange,
  onAddQuestions,
}: {
  section: AssessmentSection;
  onChange: (s: Section) => void;
  onAddQuestions: () => void;
}) {
  const totalQ = section.questions.length;
  const totalM = section.questions.reduce((a, q) => a + q.marks, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Questions" value={totalQ} />
        <Stat label="Marks" value={totalM} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ToolBtn
          title="Randomize"
          onClick={() => onChange({ ...section, randomize: !section.randomize })}
        >
          <Star className={`h-3.5 w-3.5 ${section.randomize ? "text-emerald-400" : ""}`} />
        </ToolBtn>
        <ToolBtn
          title="Shuffle"
          onClick={() => onChange({ ...section, shuffle: !section.shuffle })}
        >
          <Shuffle className={`h-3.5 w-3.5 ${section.shuffle ? "text-emerald-400" : ""}`} />
        </ToolBtn>
      </div>
      {section.questions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.questions.map((q) => (
            <AssessmentQuestionItem
              key={q.id}
              q={q}
              onRemove={() =>
                onChange({
                  ...section,
                  questions: section.questions.filter((qq) => qq.id !== q.id),
                })
              }
            />
          ))}
        </ul>
      )}
      <button onClick={onAddQuestions} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-[12px] text-neutral-400 hover:border-violet-400/40 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add Questions</button>
      
      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard 
          proctoring={section.proctoring || {}} 
          onChange={(p) => onChange({ ...section, proctoring: p })} 
        />
      </div>
    </div>
  );
}

function DiscussionSectionBody({
  section,
  onChange,
  allSections = [],
}: {
  section: DiscussionSection;
  onChange: (s: Section) => void;
  allSections?: Section[];
}) {
  const labSections = allSections.filter((s: any) => s.kind === "labs" || s.type === "LAB");
  const labsCount = labSections.reduce((sum: number, s: any) => sum + (s.labs?.length || s.questions?.length || 0), 0);
  const hasAssessment = allSections.some((s: any) => s.kind === "assessment" || s.type === "KNOWLEDGE_ASSESSMENT");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Mode" value={section.mode || "Automatic"} />
        <Stat label="Duration" value={`${section.duration || 0} min`} />
        <Stat label="Total Marks" value={section.marks ?? section.max_score ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">Duration</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-9 items-center rounded-md border border-amber-400/30 bg-amber-400/10 px-3 text-[13px] font-medium text-amber-300">
              {section.duration || 0} min
            </div>
            <input
              type="number"
              min={0}
              max={120}
              value={section.duration || 0}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                onChange({ ...section, duration: val });
              }}
              className="h-9 w-20 rounded-md border border-white/10 bg-black/40 px-2 text-[12px] text-white outline-none focus:border-amber-400/40 text-center"
              placeholder="Custom"
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            {labsCount} lab(s) × 10 + {hasAssessment ? "5 min (assessment)" : "0 min"}
          </p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">
            Question Mode
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {(["Automatic", "Custom", "Hybrid"] as const).map(mode => (
              <button 
                key={mode} 
                type="button"
                onClick={() => {
                  let updatedQuestions = section.questions;
                  if (mode === "Automatic") {
                    updatedQuestions = [];
                  }
                  onChange({ ...section, mode, questions: updatedQuestions });
                }}
                className={`h-9 rounded-md border px-3 text-[12px] font-medium transition ${
                  section.mode === mode || (!section.mode && mode === 'Automatic')
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            AI conducts discussion based on candidate submissions
          </p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">
            Total Marks
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-9 items-center rounded-md border border-amber-400/30 bg-amber-400/10 px-3 text-[13px] font-medium text-amber-300">
              {section.marks ?? section.max_score ?? 0}
            </div>
            <input
              type="number"
              min={0}
              max={200}
              value={section.marks ?? section.max_score ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                onChange({ ...section, marks: val, max_score: val });
              }}
              className="h-9 w-20 rounded-md border border-white/10 bg-black/40 px-2 text-[12px] text-white outline-none focus:border-amber-400/40 text-center"
              placeholder="Custom"
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            {labsCount} lab(s) × 10 + {hasAssessment ? "10 marks (assessment)" : "0 marks"}
          </p>
        </div>
      </div>
      
      {section.mode !== "Automatic" && (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <div className="text-[12px] text-neutral-300">Discussion Questions Tree</div>
          <div className="mt-4">
            <QuestionTreeBuilder questions={section.questions} onChange={(qs) => onChange({ ...section, questions: qs })} />
          </div>
        </div>
      )}
      
      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard 
          proctoring={section.proctoring || {}} 
          onChange={(p) => onChange({ ...section, proctoring: p })} 
        />
      </div>
    </div>
  );
}

function QuestionTreeBuilder({
  questions,
  onChange,
  level = 0,
}: {
  questions: PredefinedQuestion[];
  onChange: (qs: PredefinedQuestion[]) => void;
  level?: number;
}) {
  const [newText, setNewText] = useState("");

  const addNode = () => {
    if (newText.trim()) {
      onChange([...questions, { text: newText.trim(), follow_ups: [] }]);
      setNewText("");
    }
  };

  const updateNode = (index: number, updated: PredefinedQuestion) => {
    const copy = [...questions];
    copy[index] = updated;
    onChange(copy);
  };

  const removeNode = (index: number) => {
    const copy = [...questions];
    copy.splice(index, 1);
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {(questions || []).map((q, i) => (
        <div key={i} className={`rounded-md border border-white/5 bg-white/[0.02] p-3 text-[12px] text-neutral-300`}>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-[10px] text-neutral-500">
              {level === 0 ? "Q" : "↳"}
              {i + 1}
            </span>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={q.text}
                  onChange={(e) => updateNode(i, { ...q, text: e.target.value })}
                  className="flex-1 bg-transparent outline-none border-b border-white/10 focus:border-amber-400/50"
                />
                <ToolBtn title="Remove" onClick={() => removeNode(i)}>
                  <X className="h-3 w-3" />
                </ToolBtn>
              </div>
              {level < 2 && (
                <div className="pl-4 border-l border-white/5">
                  <QuestionTreeBuilder
                    questions={q.follow_ups}
                    onChange={(f) => updateNode(i, { ...q, follow_ups: f })}
                    level={level + 1}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={level === 0 ? "Add a main question..." : level === 1 ? "Add a follow-up question..." : "Add a deep follow-up question..."}
          className="flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[12px] outline-none focus:border-amber-400/50"
        />
        <button
          onClick={addNode}
          className="rounded-md bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/15"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SystemDesignSectionBody({
  section,
  onChange,
  onOpenChallengePicker,
}: {
  section: SystemDesignSection;
  onChange: (s: Section) => void;
  onOpenChallengePicker: () => void;
}) {
  const challenges = section.challenges || section.questions || [];
  const selectedChallenge = challenges[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[11px]">
        <Stat label="Duration" value={`${section.duration || 45} min`} />
        <Stat label="Total Marks" value={section.marks || 30} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">Section Duration (min)</div>
          <input
            type="number"
            min={15}
            max={180}
            value={section.duration || 45}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 0);
              onChange({ ...section, duration: val });
            }}
            className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-[13px] text-white outline-none focus:border-blue-400/50"
          />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">Section Total Marks</div>
          <input
            type="number"
            min={5}
            max={100}
            value={section.marks || 30}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 0);
              onChange({ ...section, marks: val });
            }}
            className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-[13px] text-white outline-none focus:border-blue-400/50"
          />
        </div>
      </div>

      {selectedChallenge ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-[14px]">{selectedChallenge.title}</span>
                {selectedChallenge.company && (
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-neutral-300 font-medium">
                    {selectedChallenge.company}
                  </span>
                )}
                {selectedChallenge.difficulty && (
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      selectedChallenge.difficulty === "Hard"
                        ? "bg-rose-500/20 text-rose-300"
                        : selectedChallenge.difficulty === "Medium"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {selectedChallenge.difficulty}
                  </span>
                )}
              </div>
              {selectedChallenge.description && (
                <p className="text-[12px] text-neutral-400 line-clamp-2">
                  {selectedChallenge.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenChallengePicker}
                className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                Change Challenge
              </button>
              <ToolBtn
                title="Remove Challenge"
                onClick={() =>
                  onChange({
                    ...section,
                    challenges: [],
                    questions: [],
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ToolBtn>
            </div>
          </div>

          {/* Constraints & Scale */}
          {selectedChallenge.constraints && selectedChallenge.constraints.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 font-medium">
                Scale & Requirements
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {selectedChallenge.constraints.slice(0, 4).map((c: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span className="truncate">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rubric / Tasks */}
          {selectedChallenge.tasks && selectedChallenge.tasks.length > 0 && (
            <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                Evaluation Deliverables:
              </span>
              {selectedChallenge.tasks.map((t: any, idx: number) => (
                <span
                  key={t.id || idx}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300"
                >
                  <Layers className="h-2.5 w-2.5" />
                  <span>{t.title || `Task ${idx + 1}`}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
          <Network className="mx-auto h-8 w-8 text-neutral-500" />
          <div className="mt-2 text-[13px] font-medium text-neutral-300">No System Design Challenge Selected</div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Select an architecture problem from the question bank to evaluate high-level diagrams, schemas, APIs, and sequence flows.
          </p>
          <button
            type="button"
            onClick={onOpenChallengePicker}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500 shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" /> Choose Challenge
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-white/5 pt-4">
        <ProctoringSettingsCard
          proctoring={section.proctoring || {}}
          onChange={(p) => onChange({ ...section, proctoring: p })}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-medium text-white">{value}</div>
    </div>
  );
}

// ---------------- Summary sidebar ----------------

function SummarySidebar({
  ev,
  onPublish,
  onPreview,
}: {
  ev: Evaluation;
  onPublish: () => void;
  onPreview: () => void;
}) {
  const t = evaluationTotals(ev);
  const labs = ev.sections
    .filter((s) => s.kind === "labs")
    .reduce((a, s: any) => a + s.labs.length, 0);
  const questions = ev.sections
    .filter((s) => s.kind === "assessment")
    .reduce((a, s: any) => a + (s.questions?.length || 0), 0);
  const discussion = ev.sections
    .filter((s) => s.kind === "discussion")
    .reduce((a, s: any) => a + s.duration, 0);
  const systemDesign = ev.sections
    .filter((s) => s.kind === "system_design")
    .reduce((a, s: any) => a + (s.challenges?.length || 0), 0);
  const score = Math.min(
    5,
    Math.round(
      (labs > 0 ? 2 : 0) + (questions >= 10 ? 2 : questions > 0 ? 1 : 0) + (discussion > 0 ? 1 : 0) + (systemDesign > 0 ? 1 : 0),
    ),
  );

  return (
    <aside className="sticky top-0 h-screen border-l border-white/5 bg-black/30 p-5">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">
        Evaluation Summary
      </div>
      <div className="mt-5 space-y-3">
        <SumRow label="Sections" value={t.sections} />
        <SumRow label="Labs" value={labs} />
        <SumRow label="Assessment" value={`${questions} Q`} />
        <SumRow label="Discussion" value={`${discussion} min`} />
        {systemDesign > 0 && (
          <SumRow label="System Design" value={`${systemDesign} Challenge${systemDesign > 1 ? "s" : ""}`} />
        )}
        <div className="my-3 h-px bg-white/5" />
        <SumRow label="Total Duration" value={`${t.minutes} min`} strong />
        <SumRow label="Total Marks" value={t.marks} strong />
      </div>
      {/* <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
          Estimated Candidate Experience
        </div>
        <div className="mt-2 text-[13px] text-white">
          {["—", "Basic", "Fair", "Good", "Great", "Excellent"][score]}
        </div>
        <div className="mt-1 flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < score ? "fill-current" : "text-neutral-700"}`}
            />
          ))}
        </div>
      </div> */}
      <div className="mt-6 space-y-2">
        <button
          onClick={onPreview}
          className="w-full rounded-lg border border-white/10 py-2 text-[12px] text-neutral-300 hover:bg-white/5"
        >
          Preview Candidate Experience
        </button>
        <button
          onClick={onPublish}
          disabled={ev.sections.length === 0}
          className="w-full rounded-lg bg-neutral-900 py-2 text-[12px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40"
        >
          Publish Evaluation
        </button>
      </div>
    </aside>
  );
}
function SumRow({ label, value, strong }: { label: string; value: any; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-neutral-500">{label}</span>
      <span className={strong ? "text-white" : "text-neutral-300"}>{value}</span>
    </div>
  );
}

// ---------------- Add Section modal ----------------

function AddSectionModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (k: "labs" | "assessment" | "discussion" | "system_design") => void;
}) {
  const options = [
    {
      key: "labs",
      title: "Engineering Labs",
      desc: "Real workspaces with terminal, editor and tasks.",
      icon: Beaker,
      tone: "from-emerald-400 to-cyan-400",
    },
    {
      key: "system_design",
      title: "System Design",
      desc: "Interactive canvas: HLD topology, sequence flows, DBML schema & REST APIs.",
      icon: Network,
      tone: "from-blue-400 to-indigo-500",
    },
    {
      key: "assessment",
      title: "Knowledge Assessment",
      desc: "MCQ, multi-select and scenario questions.",
      icon: BookOpen,
      tone: "from-violet-400 to-fuchsia-400",
    },
    {
      key: "discussion",
      title: "Vitarka AI Discussion",
      desc: "AI-led engineering discussion, contextual to work.",
      icon: MessageSquare,
      tone: "from-amber-400 to-orange-400",
    },
  ] as const;
  const later = ["Coding Challenge", "Take Home Assignment"];
  return (
    <Overlay onClose={onClose}>
      <div className="w-[560px] rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-950 p-6 shadow-xl dark:shadow-none">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Add section</div>
        <div className="mt-1 text-[18px] font-semibold text-neutral-900 dark:text-white">What kind of section?</div>
        <div className="mt-5 grid gap-2.5">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => onPick(o.key as any)}
              className="group flex items-center gap-4 rounded-xl border border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] p-4 text-left transition hover:border-neutral-200 dark:hover:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${o.tone} text-white dark:text-black`}
              >
                <o.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-neutral-900 dark:text-white">{o.title}</div>
                <div className="text-[11px] text-neutral-500">{o.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-600 transition group-hover:text-neutral-900 dark:group-hover:text-white" />
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-dashed border-neutral-200 dark:border-white/10 p-3 text-[11px] text-neutral-500">
          Coming soon: {later.join(" · ")}
        </div>
      </div>
    </Overlay>
  );
}

const SUBSECTION_NAMES = [
  "DSA",
  "System Design",
  "Frontend",
  "Backend",
  "Fullstack",
  "Database",
  "DevOps",
  "Security",
  "Other",
];

function SubsectionModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (n: string) => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-[520px] rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Add subsection</div>
        <div className="mt-1 text-[18px] font-semibold text-white">Pick a topic</div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {SUBSECTION_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => onPick(n)}
              className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-3 text-[13px] text-neutral-200 transition hover:border-violet-400/40 hover:text-white"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

// ---------------- Lab Drawer ----------------

function LabDrawer({
  sectionLabs,
  onClose,
  onAddFullLab,
  onToggleTask,
  initialExpandedLabId,
}: {
  sectionLabs: LabItem[];
  onClose: () => void;
  onAddFullLab: (l: LabItem) => void;
  onToggleTask: (l: LabItem, task: any, select: boolean) => void;
  initialExpandedLabId?: string | null;
}) {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string>("All");
  const [lang, setLang] = useState<string>("All");
  const [db, setDb] = useState<string>("All");
  const [scenario, setScenario] = useState<string>("All");
  const [diff, setDiff] = useState<string>("All");

  const [labs, setLabs] = useState<LabItem[]>([]);
  const [previewLab, setPreviewLab] = useState<any>(null);
  const [expandedTasksLabId, setExpandedTasksLabId] = useState<string | null>(initialExpandedLabId ?? null);

  useEffect(() => {
    fetchLabs().then(setLabs);
  }, []);

  const availableDomains = useMemo(() => {
    if (!labs.length) return [];
    const set = new Set<string>();
    DOMAINS.forEach((d) => {
      if (
        labs.some(
          (l) =>
            (l.domain || "").toUpperCase().replace(/_/g, " ") ===
            d.toUpperCase().replace(/_/g, " ")
        )
      ) {
        set.add(d);
      }
    });
    labs.forEach((l) => {
      if (l.domain) {
        const formatted = l.domain.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const match = Array.from(set).find((s) => s.toUpperCase() === formatted.toUpperCase());
        if (!match) set.add(formatted);
      }
    });
    return Array.from(set);
  }, [labs]);

  const availableLanguages = useMemo(() => {
    if (!labs.length) return [];
    const set = new Set<string>();
    PROGRAMMING_LANGUAGES.forEach((langOpt) => {
      if (
        labs.some((l) =>
          (l.programming_languages || []).some(
            (x) => x.toUpperCase() === langOpt.toUpperCase()
          )
        )
      ) {
        set.add(langOpt);
      }
    });
    labs.forEach((l) => {
      (l.programming_languages || []).forEach((langItem) => {
        if (langItem) {
          const match = Array.from(set).find((s) => s.toUpperCase() === langItem.toUpperCase());
          if (!match) set.add(langItem);
        }
      });
    });
    return Array.from(set);
  }, [labs]);

  const availableDatabases = useMemo(() => {
    if (!labs.length) return [];
    const set = new Set<string>();
    DATABASES.forEach((dbOpt) => {
      if (
        labs.some((l) =>
          (l.databases || []).some((x) => x.toUpperCase() === dbOpt.toUpperCase())
        )
      ) {
        set.add(dbOpt);
      }
    });
    labs.forEach((l) => {
      (l.databases || []).forEach((dbItem) => {
        if (dbItem) {
          const match = Array.from(set).find((s) => s.toUpperCase() === dbItem.toUpperCase());
          if (!match) set.add(dbItem);
        }
      });
    });
    return Array.from(set);
  }, [labs]);

  const availableScenarios = useMemo(() => {
    if (!labs.length) return [];
    const set = new Set<string>();
    SCENARIOS.forEach((scOpt) => {
      if (
        labs.some((l) => {
          const labSc = (l.scenario || "").toUpperCase();
          const optSc = scOpt.toUpperCase().replace(/ /g, "_");
          return labSc === optSc || labSc === scOpt.toUpperCase();
        })
      ) {
        set.add(scOpt);
      }
    });
    labs.forEach((l) => {
      if (l.scenario) {
        const scDisplay = l.scenario.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const match = Array.from(set).find(
          (s) =>
            s.toUpperCase() === scDisplay.toUpperCase() ||
            s.toUpperCase().replace(/ /g, "_") === l.scenario.toUpperCase()
        );
        if (!match) set.add(scDisplay);
      }
    });
    return Array.from(set);
  }, [labs]);

  const availableDifficulties = useMemo(() => {
    if (!labs.length) return [];
    const set = new Set<string>();
    DIFFICULTIES.forEach((dfOpt) => {
      if (labs.some((l) => (l.difficulty || "").toUpperCase() === dfOpt.toUpperCase())) {
        set.add(dfOpt);
      }
    });
    labs.forEach((l) => {
      if (l.difficulty) {
        const formatted = l.difficulty.replace(/\b\w/g, (c) => c.toUpperCase());
        const match = Array.from(set).find((s) => s.toUpperCase() === formatted.toUpperCase());
        if (!match) set.add(formatted);
      }
    });
    return Array.from(set);
  }, [labs]);

  useEffect(() => {
    if (domain !== "All" && availableDomains.length > 0 && !availableDomains.some(d => d.toUpperCase() === domain.toUpperCase())) {
      setDomain("All");
    }
    if (lang !== "All" && availableLanguages.length > 0 && !availableLanguages.some(l => l.toUpperCase() === lang.toUpperCase())) {
      setLang("All");
    }
    if (db !== "All" && availableDatabases.length > 0 && !availableDatabases.some(d => d.toUpperCase() === db.toUpperCase())) {
      setDb("All");
    }
    if (scenario !== "All" && availableScenarios.length > 0 && !availableScenarios.some(s => s.toUpperCase() === scenario.toUpperCase() || s.toUpperCase().replace(/ /g, "_") === scenario.toUpperCase())) {
      setScenario("All");
    }
    if (diff !== "All" && availableDifficulties.length > 0 && !availableDifficulties.some(d => d.toUpperCase() === diff.toUpperCase())) {
      setDiff("All");
    }
  }, [availableDomains, availableLanguages, availableDatabases, availableScenarios, availableDifficulties]);

  const filtered = useMemo(
    () =>
      labs.filter((l) => {
        const qmatch = !q || l.title.toLowerCase().includes(q.toLowerCase());
        const domatch =
          domain === "All" ||
          (l.domain || "").toUpperCase() === domain.toUpperCase() ||
          (l.domain || "").toUpperCase().replace(/_/g, " ") === domain.toUpperCase();
        const lmatch =
          lang === "All" ||
          (l.programming_languages || []).map((x) => x.toUpperCase()).includes(lang.toUpperCase());
        const dbmatch =
          db === "All" ||
          (l.databases || []).map((x) => x.toUpperCase()).includes(db.toUpperCase());
        const smatch =
          scenario === "All" ||
          (l.scenario || "").toUpperCase() === scenario.toUpperCase().replace(" ", "_") ||
          (l.scenario || "").toUpperCase().replace("_", " ") === scenario.toUpperCase();
        const dmatch = diff === "All" || (l.difficulty || "").toUpperCase() === diff.toUpperCase();
        return qmatch && domatch && lmatch && dbmatch && smatch && dmatch;
      }),
    [q, domain, lang, db, scenario, diff, labs],
  );

  return (
    <Drawer
      title="Engineering Lab Library"
      subtitle="Real labs, not textbook questions."
      onClose={onClose}
      leftPanel={
        previewLab && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 p-6">
              <div className="text-[16px] font-semibold text-neutral-900 dark:text-white">
                {previewLab.title || previewLab.text || "Preview"}
              </div>
              <button
                onClick={() => setPreviewLab(null)}
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <LabPreview l={previewLab} />
            </div>
            <div className="border-t border-neutral-200 dark:border-white/5 p-5 flex justify-end">
              <button
                disabled={sectionLabs.some((sl) => String(sl.id) === String(previewLab.id))}
                onClick={() => {
                  onAddFullLab(previewLab);
                  setPreviewLab(null);
                }}
                className="rounded-md bg-neutral-900 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {sectionLabs.some((sl) => String(sl.id) === String(previewLab.id)) ? "Added" : "Add Lab"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="grid gap-2 border-b border-neutral-200 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search labs…"
            className="w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] py-2 pl-8 pr-3 text-[12px] text-neutral-900 dark:text-white outline-none focus:border-emerald-400/60 focus:bg-white dark:focus:bg-black/30 focus:ring-2 focus:ring-emerald-400/20 dark:focus:ring-transparent placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors"
          />
        </div>
        {availableDomains.length > 0 && (
          <FilterRow
            label="Domain"
            value={domain}
            setValue={setDomain}
            options={["All", ...availableDomains]}
          />
        )}
        {availableLanguages.length > 0 && (
          <FilterRow
            label="Programming Languages"
            value={lang}
            setValue={setLang}
            options={["All", ...availableLanguages]}
          />
        )}
        {availableDatabases.length > 0 && (
          <FilterRow
            label="Databases"
            value={db}
            setValue={setDb}
            options={["All", ...availableDatabases]}
          />
        )}
        {availableScenarios.length > 0 && (
          <FilterRow
            label="Scenario"
            value={scenario}
            setValue={setScenario}
            options={["All", ...availableScenarios]}
          />
        )}
        {availableDifficulties.length > 0 && (
          <FilterRow
            label="Difficulty"
            value={diff}
            setValue={setDiff}
            options={["All", ...availableDifficulties]}
          />
        )}
      </div>
      <div className="mt-3 space-y-2">
        {filtered.map((l) => {
          const existingLab = sectionLabs.find((sl) => String(sl.id) === String(l.id));
          const isAdded = !!existingLab;
          const allTasks = l.tasks || [];
          const allTasksCount = allTasks.length;
          const supportsTaskSelection = l.allow_task_selection !== false && allTasksCount > 0;
          const isExpanded = expandedTasksLabId === l.id;

          const stats = existingLab ? getLabCalculatedStats(existingLab) : null;
          const selectedTaskIds = new Set(
            stats ? stats.selectedTasks.map((t: any, idx: number) => String(t.id ?? t.task_slug ?? `task-${idx}`)) : []
          );
          const isAllSelected = isAdded && (allTasksCount === 0 || selectedTaskIds.size >= allTasksCount);

          return (
            <div key={l.id} className="rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm dark:shadow-none hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-neutral-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>{l.title}</span>
                    {supportsTaskSelection && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Supports Task Selection ({allTasksCount})
                      </span>
                    )}
                    {isAdded && !isAllSelected && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {selectedTaskIds.size} of {allTasksCount} tasks selected
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                    <Chip>{l.domain}</Chip>
                    {l.programming_languages?.map((x) => (
                      <Chip key={x}>{x}</Chip>
                    ))}
                    <Chip>{l.scenario}</Chip>
                    <Chip>{l.difficulty}</Chip>
                  </div>
                  <div className="mt-1.5 text-[11px] text-neutral-500">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {l.duration_minutes} min · <Award className="mr-1 inline h-3 w-3" />
                    {l.marks} marks
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setPreviewLab(l)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/10 px-2 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  {supportsTaskSelection && (
                    <button
                      onClick={() => setExpandedTasksLabId(isExpanded ? null : l.id)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                        isExpanded
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      Select Tasks
                    </button>
                  )}
                  <button
                    disabled={isAllSelected}
                    onClick={() => onAddFullLab(l)}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400 dark:disabled:bg-white/10 dark:disabled:text-neutral-500"
                  >
                    {isAllSelected ? (
                      <>
                        <Check className="h-3 w-3" /> Added
                      </>
                    ) : isAdded ? (
                      <>
                        <Plus className="h-3 w-3" /> Select All ({allTasksCount})
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" /> Add Lab
                      </>
                    )}
                  </button>
                </div>
              </div>
              {supportsTaskSelection && isExpanded && (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Available Tasks ({allTasksCount})</span>
                    <span className="text-[10px] normal-case text-neutral-500 dark:text-neutral-400">
                      Pick specific tasks to include
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {allTasks.map((task: any, idx: number) => {
                      const taskId = String(task.id ?? task.task_slug ?? `task-${idx}`);
                      const isTaskSelected = isAdded && (selectedTaskIds.has(taskId) || selectedTaskIds.has(String(task.title)));
                      const parentTask = getParentTask(task, allTasks);
                      const parentIdx = parentTask
                        ? allTasks.findIndex((t: any) => (t.id || t.title) === (parentTask.id || parentTask.title))
                        : -1;
                      const dependencies = getTaskDependencies(task, allTasks);
                      return (
                        <div
                          key={taskId}
                          className={`flex items-center justify-between gap-3 rounded-md border p-2.5 text-[12px] transition-colors ${
                            isTaskSelected
                              ? "border-emerald-500/30 bg-emerald-500/[0.06] dark:bg-emerald-950/20"
                              : "border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-neutral-900 dark:text-white text-[12px] flex items-center gap-1.5 flex-wrap">
                              <span>{task.title || `Task ${idx + 1}`}</span>
                              {task.marks != null && (
                                <span className="text-[10px] text-neutral-500">({task.marks} marks)</span>
                              )}
                              {parentTask && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <LinkIcon className="h-2.5 w-2.5" />
                                  Depends on: {parentTask.title || `Task ${parentIdx >= 0 ? parentIdx + 1 : ""}`}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                                {task.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => onToggleTask(l, task, !isTaskSelected)}
                            title={
                              !isTaskSelected && dependencies.length > 0
                                ? `Will automatically include required dependency: ${dependencies
                                    .map((d) => d.title || "parent task")
                                    .join(", ")}`
                                : isTaskSelected
                                ? "Click to remove this task"
                                : undefined
                            }
                            className={`inline-flex items-center gap-1 shrink-0 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              isTaskSelected
                                ? "bg-emerald-600 text-white hover:bg-rose-600 hover:shadow-sm"
                                : "bg-emerald-600 text-white hover:bg-emerald-500"
                            }`}
                          >
                            {isTaskSelected ? (
                              <>
                                <Check className="h-3 w-3" /> Selected
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" /> Select Task
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12px] text-neutral-500">
            No labs match your filters.
          </div>
        )}
      </div>
    </Drawer>
  );
}

function QuestionDrawerItem({
  it,
  added,
  onAdd,
  onPreview,
}: {
  it: any;
  added: boolean;
  onAdd: (q: any) => void;
  onPreview: (q: any) => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm dark:shadow-none hover:border-emerald-400/50 dark:hover:border-emerald-400/50 transition-colors">
      <div className="flex-1 min-w-0" onClick={() => onPreview(it)}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-[13px] text-neutral-900 dark:text-white font-medium flex-1 truncate">{it.title || it.text || it.content}</div>
          <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 shrink-0">{it.marks}m</span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
        {it.programming_languages?.map((x: string) => (
          <Chip key={x}>{x}</Chip>
        ))}
        {it.databases?.map((x: string) => (
          <Chip key={x}>{x}</Chip>
        ))}
        <Chip>{it.difficulty}</Chip>
        <Chip>{it.experience || it.level}</Chip>
        <Chip>{it.format || it.type}</Chip>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] text-neutral-500">
          {it.marks} marks &middot;{" "}
          {it.duration_minutes || it.duration || (it.seconds ? Math.ceil(it.seconds / 60) : 0)} min
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPreview(it)}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-transparent px-2 py-1 text-[11px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
          <button
            disabled={added}
            onClick={() => onAdd(it)}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border disabled:border-neutral-200 dark:disabled:bg-white/10 dark:disabled:text-neutral-500 dark:disabled:border-transparent"
          >
            {added ? (
              <>
                <Check className="h-3 w-3" /> Added
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionDrawer({
  existing,
  onClose,
  onAdd,
  onRemove,
}: {
  existing: string[];
  onClose: () => void;
  onAdd: (q: QuestionItem) => void;
  onRemove?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [lang, setLang] = useState("All");
  const [db, setDb] = useState("All");
  const [diff, setDiff] = useState("All");
  const [exp, setExp] = useState("All");
  const [format, setFormat] = useState("All");

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [course, setCourse] = useState("All");
  const [topic, setTopic] = useState("All");

  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [previewQ, setPreviewQ] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async (q: any) => {
    setIsCreating(false);
    setLoadingPreview(true);
    const { fetchQuestionDetails } = await import("@/lib/recruiter");
    const details = await fetchQuestionDetails(q.id);
    setPreviewQ(details || q);
    setLoadingPreview(false);
  };

  const handleAdd = async (q: any) => {
    let finalQ = q;
    // If we haven't fetched the details for this question yet, fetch them before adding
    if (!q.content && !q.mcq_options) {
      const { fetchQuestionDetails } = await import("@/lib/recruiter");
      const details = await fetchQuestionDetails(q.id);
      finalQ = details || q;
    }

    const c = courses.find((c: any) => c.id === finalQ.course);
    const t = topics.find((t: any) => t.id === finalQ.topic);

    onAdd({
      ...finalQ,
      course_title: finalQ.course_name || (c ? c.name : "Other Subjects"),
      topic_title: finalQ.topic_name || (t ? t.name : "Other Topics"),
    });
  };

  const [isCreating, setIsCreating] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);

  const handleCreateSuccess = async (createdQuestion: any) => {
    setIsCreating(false);
    // Add to current assessment
    await handleAdd(createdQuestion);
    // Refresh question list
    setLoading(true);
    fetchQuestions(
      course !== "All" ? course : undefined, 
      topic !== "All" ? topic : undefined, 
      debouncedQ, diff, format
    )
      .then((res) => setQuestions(res.results))
      .finally(() => setLoading(false));
  };

  const handleEditSuccess = async (updatedQuestion: any) => {
    setEditingQ(null);
    setPreviewQ(updatedQuestion);

    // If it's currently added to the assessment, update it in place by removing then adding back, or just calling onAdd again? 
    // Wait, onAdd pushes it if not found. Let's remove and add, or since it updates in place, maybe onAdd doesn't replace.
    // Instead of full state gymnastics, we can remove it and re-add it.
    if (existing.includes(updatedQuestion.id) && onRemove) {
      onRemove(updatedQuestion.id);
      await handleAdd(updatedQuestion);
    }
    
    // Refresh question list
    setLoading(true);
    fetchQuestions(
      course !== "All" ? course : undefined, 
      topic !== "All" ? topic : undefined, 
      debouncedQ, diff, format
    )
      .then((res) => setQuestions(res.results))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (q: any) => {
    if (!window.confirm("Are you sure you want to permanently delete this question from the shared bank? This cannot be undone.")) return;
    
    setLoadingPreview(true);
    try {
      const { ycodeApiAuthUtil } = await import("@/utils/RestApiAuthUtil");
      await ycodeApiAuthUtil.delete(`/course/questions/${q.id}/`);
      
      if (existing.includes(q.id) && onRemove) {
        onRemove(q.id);
      }
      
      setPreviewQ(null);
      setEditingQ(null);
      
      // Refresh question list
      setLoading(true);
      fetchQuestions(
        course !== "All" ? course : undefined, 
        topic !== "All" ? topic : undefined, 
        debouncedQ, diff, format
      )
        .then((res) => setQuestions(res.results))
        .finally(() => setLoading(false));
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("Failed to delete question. You might not have permission.");
      setLoadingPreview(false);
    }
  };


  useEffect(() => {
    setLoading(true);
    fetchCourses().then(setCourses).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTopics([]);
    if (course !== "All") {
      fetchTopics(course).then(setTopics);
    } else {
      setTopic("All");
    }
  }, [course]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(handler);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    fetchQuestions(
      course !== "All" ? course : undefined, 
      topic !== "All" ? topic : undefined, 
      debouncedQ, diff, format
    )
      .then((res) => setQuestions(res.results))
      .finally(() => setLoading(false));
  }, [course, topic, debouncedQ, diff, format]);

  const filtered = useMemo(
    () =>
      questions.filter((it: any) => {
        const qmatch = !q || (it.text || it.content || it.title || "").toLowerCase().includes(q.toLowerCase());
        const lmatch =
          lang === "All" ||
          (it.programming_languages || []).map((x: string) => x.toUpperCase()).includes(lang.toUpperCase());
        const dmatch = diff === "All" || (it.difficulty || "").toUpperCase() === diff.toUpperCase();
        const fmatch =
          format === "All" ||
          (it.format || it.type || "").toUpperCase() === format.toUpperCase().replace(" ", "_");
        const cmatch = course === "All" || it.course === course;
        const tmatch = topic === "All" || it.topic === topic;
        return qmatch && lmatch && dmatch && fmatch && cmatch && tmatch;
      }),
    [q, lang, diff, format, course, topic, questions],
  );

  return (
    <Drawer
      title="Assessment Question Bank"
      subtitle="Curated by topic and experience level."
      onClose={onClose}
      leftPanel={
        previewQ ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 p-6 shrink-0">
              <div className="text-[16px] font-semibold text-neutral-900 dark:text-white truncate mr-4">
                {previewQ.title || previewQ.text || previewQ.content || "Preview"}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setPreviewQ(null)}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  title="Close Preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <QuestionPreview q={previewQ} />
            </div>
            <div className="border-t border-neutral-200 dark:border-white/5 p-5 flex justify-end">
              <button
                disabled={existing.includes(previewQ.id)}
                onClick={() => {
                  handleAdd(previewQ);
                  setPreviewQ(null);
                }}
                className="rounded-md bg-neutral-900 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                {existing.includes(previewQ.id) ? "Added" : "Add Question"}
              </button>
            </div>
          </div>
        ) : null
      }
    >
      <div className="grid gap-2 border-b border-neutral-200 dark:border-white/5 pb-4">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              placeholder="Search questions..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] py-2 pl-9 pr-3 text-[13px] text-neutral-900 dark:text-white outline-none focus:bg-white dark:focus:bg-black/30 placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors"
            />
          </div>
        </div>
        <FilterRow
          label="Programming Languages"
          value={lang}
          setValue={setLang}
          options={["All", ...PROGRAMMING_LANGUAGES]}
        />
        <FilterRow
          label="Difficulty"
          value={diff}
          setValue={setDiff}
          options={["All", ...DIFFICULTIES]}
        />
        <FilterRow
          label="Format"
          value={format}
          setValue={setFormat}
          options={["All", ...FORMATS]}
        />
        <FilterRowObj
          label="Courses"
          value={course}
          setValue={(v) => {
            setCourse(v);
            setTopic("All");
          }}
          options={[
            { value: "All", label: "All Courses" },
            ...courses.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        {course !== "All" && (
          <FilterRowObj
            label="Topics"
            value={topic}
            setValue={setTopic}
            options={[
              { value: "All", label: "All Topics" },
              ...topics.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        )}
      </div>
      <div className="mt-3 space-y-2">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}
        {!loading &&
          filtered.map((it) => (
            <QuestionDrawerItem
              key={it.id}
              it={it}
              added={existing.includes(it.id)}
              onAdd={handleAdd}
              onPreview={handlePreview}
            />
          ))}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12px] text-neutral-500">
            No questions match your filters.
          </div>
        )}
      </div>
    </Drawer>
  );
}

function FilterRow({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => setValue(o)}
            className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
              value === o
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-transparent"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterRowObj({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setValue(o.value)}
            className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
              value === o.value
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-transparent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-neutral-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
      {children}
    </span>
  );
}

// ---------------- Overlay / Drawer primitives ----------------

function Overlay({
  children,
  onClose,
  zIndex = "z-50",
}: {
  children: React.ReactNode;
  onClose: () => void;
  zIndex?: string;
}) {
  const content = (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-xs p-4`}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

function Drawer({
  children,
  onClose,
  title,
  subtitle,
  leftPanel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leftPanel?: React.ReactNode;
}) {
  const content = (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/50"
      onClick={onClose}
    >
      {leftPanel && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 justify-end p-8 pb-10 max-h-screen"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-950 shadow-2xl flex flex-col">
            {leftPanel}
          </div>
        </div>
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[480px] flex-col border-l border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-950 shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-200 dark:border-white/10 p-5">
          <div>
            <div className="text-[14px] font-medium text-neutral-900 dark:text-white">{title}</div>
            {subtitle && <div className="mt-0.5 text-[11px] text-neutral-500">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar p-5">{children}</div>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

const BUILTIN_SYSTEM_DESIGN_CHALLENGES: SystemDesignChallengeItem[] = [
  {
    id: "builtin-sd-url-shortener",
    title: "Design a High-Throughput URL Shortener (TinyURL)",
    description:
      "Architect a resilient, distributed URL shortening service capable of creating billions of aliases and serving high-frequency redirects with sub-millisecond response times, low latency CDN caching, and custom analytics tracking.",
    company: "Uber",
    scenario_type: "Distributed Storage & Routing",
    difficulty: "Medium",
    domain: "FINANCE",
    duration_minutes: 45,
    marks: 30,
    system_slug: "systemdesign-url-shortener",
    constraints: [
      "100M new URLs shortened per month (10:1 read-to-write ratio)",
      "URL redirects must respond in < 15ms at p99",
      "99.999% availability for resolution endpoints",
      "Shortened keys must be 7-8 base62 alphanumeric characters",
      "Protect against malicious redirects and rate-limit abusive IP ranges",
    ],
    tasks: [
      {
        id: "t1",
        title: "HLD Architecture Canvas",
        description:
          "Design client DNS, API Gateway, Key Generation Service (KGS), cache layer, and database cluster with replication.",
      },
      {
        id: "t2",
        title: "Database Schema (DBML)",
        description:
          "Define relational or NoSQL schema for URLs, users, expiration timestamps, and analytics telemetry.",
      },
      {
        id: "t3",
        title: "REST API Contracts",
        description:
          "Specify endpoints for POST /api/v1/shorten, GET /{shortCode}, and GET /api/v1/analytics.",
      },
      {
        id: "t4",
        title: "Sequence Diagrams",
        description:
          "Model the end-to-end request lifecycle for URL creation and cached redirection lookup.",
      },
    ],
  },
  {
    id: "builtin-sd-ecommerce",
    title: "Design a Flash-Sale E-Commerce Platform",
    description:
      "Design an ultra-high concurrency e-commerce checkout and inventory system capable of handling surges of 100,000+ orders per second during limited-time flash sales without double bookings or overselling.",
    company: "Amazon",
    scenario_type: "High Concurrency & Transactions",
    difficulty: "Hard",
    domain: "FINANCE",
    duration_minutes: 60,
    marks: 40,
    system_slug: "systemdesign",
    constraints: [
      "Peak throughput: 100k requests/sec during drop window",
      "Zero overselling: strict inventory reservation guarantees",
      "Eventual consistency for order fulfillment and payment webhook processing",
      "Cart reservations expire after 10 minutes if unpurchased",
    ],
    tasks: [
      {
        id: "t1",
        title: "HLD Architecture Canvas",
        description:
          "Draw CDN, Edge Rate Limiter, Inventory Cache with Redis Lua scripts, Kafka Order Queue, and Payment Orchestrator.",
      },
      {
        id: "t2",
        title: "Database Schema (DBML)",
        description:
          "Model inventory balances, lock states, order records, and idempotent transaction logs.",
      },
      {
        id: "t3",
        title: "REST API Contracts",
        description:
          "Define endpoints for product catalog, inventory lock, and order placement.",
      },
      {
        id: "t4",
        title: "Sequence Diagrams",
        description:
          "Trace the distributed lock acquisition, payment confirmation, and async inventory reconciliation flow.",
      },
    ],
  },
  {
    id: "builtin-sd-bookmyshow",
    title: "Design a Real-Time Ticket & Seat Booking Engine",
    description:
      "Build a distributed movie and concert seat reservation platform with interactive venue seat maps, pessimistic seat locking, and live websocket seat availability updates.",
    company: "BookMyShow",
    scenario_type: "Real-time Event Streaming & Locking",
    difficulty: "Hard",
    domain: "FINANCE",
    duration_minutes: 60,
    marks: 40,
    system_slug: "systemdesign-bookmysystem",
    constraints: [
      "Concurrent seat locking by tens of thousands of users per showtime",
      "Seat held for max 8 minutes during checkout before releasing back to the pool",
      "Real-time websocket broadcast of seat occupancy status to active viewers",
      "Multi-region data isolation per theatre/cinema chain",
    ],
    tasks: [
      {
        id: "t1",
        title: "HLD Architecture Canvas",
        description:
          "Diagram load balancers, WebSocket gateways, Distributed Locking Service, and Show Booking Workers.",
      },
      {
        id: "t2",
        title: "Database Schema (DBML)",
        description:
          "Design theatres, screens, shows, seats, seat reservations, and booking tickets tables.",
      },
      {
        id: "t3",
        title: "REST API Contracts",
        description:
          "Create contracts for seat map queries, seat reservation requests, and payment settlement.",
      },
      {
        id: "t4",
        title: "Sequence Diagrams",
        description:
          "Illustrate concurrent seat conflict handling and automatic release on timeout.",
      },
    ],
  },
];

function SystemDesignDrawer({
  sectionId,
  currentChallenges,
  onClose,
  onSelectChallenge,
}: {
  sectionId: string;
  currentChallenges: SystemDesignChallengeItem[];
  onClose: () => void;
  onSelectChallenge: (challenge: SystemDesignChallengeItem) => void;
}) {
  const [challenges, setChallenges] = useState<SystemDesignChallengeItem[]>(
    BUILTIN_SYSTEM_DESIGN_CHALLENGES
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [previewChallenge, setPreviewChallenge] = useState<SystemDesignChallengeItem | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await questionBankService.getSystemDesignQuestions();
        if (mounted && Array.isArray(data) && data.length > 0) {
          const normalized: SystemDesignChallengeItem[] = data.map((item: any) => ({
            id: String(item.id),
            title: item.title || item.name || "Untitled System Design Challenge",
            description: item.description || item.content || "",
            company: item.company || "General",
            scenario_type: item.scenario_type || "Distributed Systems",
            difficulty: item.difficulty || "Medium",
            domain: item.domain || "FINANCE",
            duration_minutes: item.duration_minutes || 45,
            marks: item.marks || 30,
            system_slug: item.system_slug || "systemdesign-url-shortener",
            tasks: Array.isArray(item.tasks) ? item.tasks : [],
            constraints: Array.isArray(item.constraints) ? item.constraints : [],
            starter_design: item.starter_design || {},
            solution_design: item.solution_design || {},
          }));
          setChallenges(normalized);
          if (normalized.length > 0) {
            setPreviewChallenge(normalized[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch system design questions:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (difficultyFilter !== "ALL" && c.difficulty?.toUpperCase() !== difficultyFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesCompany = c.company?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCompany) return false;
      }
      return true;
    });
  }, [challenges, search, difficultyFilter]);

  const activePreview = previewChallenge || filteredChallenges[0] || challenges[0] || null;
  const isSelected = (c: SystemDesignChallengeItem) =>
    currentChallenges.some(
      (cc) => String(cc.id) === String(c.id) || (cc.system_slug && cc.system_slug === c.system_slug)
    );

  const leftPanel = activePreview ? (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              {activePreview.company || "General"}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                activePreview.difficulty === "Hard"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : activePreview.difficulty === "Medium"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {activePreview.difficulty || "Medium"}
            </span>
            <span className="text-[11px] text-neutral-500">
              {activePreview.duration_minutes || 45} min &middot; {activePreview.marks || 30} marks
            </span>
          </div>
          <button
            onClick={() => onSelectChallenge(activePreview)}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500 transition shadow"
          >
            {isSelected(activePreview) ? "Selected" : "Select Challenge"}
          </button>
        </div>
        <h3 className="mt-2 text-[16px] font-semibold text-neutral-900 dark:text-white">
          {activePreview.title}
        </h3>
        {activePreview.scenario_type && (
          <p className="text-[11px] text-neutral-500 mt-0.5">{activePreview.scenario_type}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-[13px]">
        {activePreview.description && (
          <div>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1 text-[12px] uppercase tracking-wider">
              Problem Overview
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
              {activePreview.description}
            </p>
          </div>
        )}

        {activePreview.constraints && activePreview.constraints.length > 0 && (
          <div>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2 text-[12px] uppercase tracking-wider">
              Scale & Constraints
            </div>
            <ul className="space-y-1.5">
              {activePreview.constraints.map((c: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-md bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-2 text-[12px] text-neutral-700 dark:text-neutral-300"
                >
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activePreview.tasks && activePreview.tasks.length > 0 && (
          <div>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2 text-[12px] uppercase tracking-wider">
              Evaluation Deliverables ({activePreview.tasks.length})
            </div>
            <div className="space-y-2">
              {activePreview.tasks.map((task: any, idx: number) => (
                <div
                  key={task.id || idx}
                  className="rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between text-[12px] font-medium text-neutral-900 dark:text-white">
                    <span>
                      {idx + 1}. {task.title}
                    </span>
                    {task.marks && (
                      <span className="text-[11px] text-blue-500 font-mono">{task.marks}m</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Studio Tabs Indicator */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
            4-Tab Studio Environment Included
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>1. Architecture Canvas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>2. Sequence Diagrams</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>3. Database Schema (DBML)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>4. REST API Contracts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <Drawer
      title="System Design Challenges"
      subtitle="Select a distributed system architecture problem for candidate evaluation"
      onClose={onClose}
      leftPanel={leftPanel}
    >
      <div className="flex flex-col h-full">
        {/* Filters and search */}
        <div className="border-b border-neutral-200 dark:border-white/10 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search challenges, systems, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-black/40 pl-9 pr-4 py-2 text-[12px] text-neutral-900 dark:text-white placeholder:text-neutral-500 outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  difficultyFilter === diff
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10"
                }`}
              >
                {diff === "ALL" ? "All Levels" : diff.charAt(0) + diff.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Challenges list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-10 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-[12px]">Loading challenges...</span>
            </div>
          )}
          {!loading && filteredChallenges.length === 0 && (
            <div className="py-12 text-center text-[12px] text-neutral-500">
              No matching challenges found.
            </div>
          )}
          {!loading &&
            filteredChallenges.map((c) => {
              const selected = isSelected(c);
              const isCurrentPreview = activePreview?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setPreviewChallenge(c)}
                  className={`group relative cursor-pointer rounded-xl border p-3.5 transition ${
                    isCurrentPreview
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-neutral-900 dark:text-white group-hover:text-blue-500 transition-colors">
                          {c.title}
                        </span>
                        {selected && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Check className="h-2.5 w-2.5" /> Added
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        {c.company && <span>{c.company}</span>}
                        <span>&middot;</span>
                        <span>{c.difficulty}</span>
                        <span>&middot;</span>
                        <span>{c.duration_minutes || 45} min</span>
                        <span>&middot;</span>
                        <span>{c.marks || 30} marks</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChallenge(c);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition shrink-0 ${
                        selected
                          ? "border border-neutral-300 text-neutral-600 dark:border-white/10 dark:text-neutral-400"
                          : "bg-blue-600 text-white hover:bg-blue-500"
                      }`}
                    >
                      {selected ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </Drawer>
  );
}

// ---------------- Preview / Publish screens ----------------

function PreviewScreen({ ev, onBack }: { ev: Evaluation; onBack: () => void }) {
  const previewData = useMemo(() => {
    return {
      id: ev.id,
      sections: ev.sections
        .map((s) => {
          if (s.kind === "labs") {
            return {
              type: "LAB",
              id: s.id,
              title: s.title,
              questions: (s as any).labs, // Workspace expects questions array for labs
              proctoring_config: s.proctoring || {},
            };
          } else if (s.kind === "assessment") {
            return {
              type: "KNOWLEDGE_ASSESSMENT",
              id: s.id,
              title: s.title,
              questions: (s as any).questions,
              proctoring_config: s.proctoring || {},
            };
          } else if (s.kind === "discussion") {
            return {
              type: "VITARKA_AI_INTERVIEW",
              id: s.id,
              title: s.title,
              proctoring_config: s.proctoring || {},
            };
          } else if (s.kind === "system_design") {
            return {
              type: "SYSTEM_DESIGN",
              id: s.id,
              title: s.title,
              questions: (s as any).challenges || (s as any).questions || [],
              duration_minutes: (s as any).duration || 45,
              marks: (s as any).marks || 30,
              proctoring_config: s.proctoring || {},
            };
          }
          return null;
        })
        .filter(Boolean),
    };
  }, [ev]);

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-12 items-center justify-between border-b border-white/10 bg-neutral-950 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
            STUDENT PREVIEW
          </div>
          <div className="text-[13px] font-medium text-neutral-300">{ev.title}</div>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/20"
        >
          <X className="h-3.5 w-3.5" /> Close Preview
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <Workspace previewData={previewData} evaluationId={ev.id} />
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

function parseCSVLine(text: string) {
  const ret = [];
  let state = 0; // 0 = unquoted, 1 = quoted
  let val = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (state === 0) {
      if (c === '"') {
        state = 1;
      } else if (c === ",") {
        ret.push(val);
        val = "";
      } else {
        val += c;
      }
    } else {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          val += '"';
          i++;
        } // escaped quote
        else {
          state = 0;
        }
      } else {
        val += c;
      }
    }
  }
  ret.push(val);
  return ret;
}

function PublishScreen({
  ev,
  onBack,
  onPublish,
}: {
  ev: Evaluation;
  onBack: () => void;
  onPublish: (invite: NonNullable<Evaluation["invite"]>) => Promise<void> | void;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [type, setType] = useState<"email" | "link" | "csv">("email");
  const [recipients, setRecipients] = useState<Array<{name: string, email: string}>>([]);
  const [nameInput, setNameInput] = useState("");
  const [emailsInput, setEmailsInput] = useState("");
  const [subject, setSubject] = useState(`Invitation: ${ev.title}`);
  const [body, setBody] = useState(`Hi {{name}},\n\nYou've been invited to take the {{evaluation}} assessment by {{company}}.\n\nClick the button below to get started:\n\n{{link}}\n\nGood luck!\n{{company}} Team`);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [scheduleType, setScheduleType] = useState<"none" | "scheduled">(ev.start_datetime || ev.expiry_datetime ? "scheduled" : "none");
  const [startDate, setStartDate] = useState(() => {
    if (!ev.start_datetime) return "";
    const d = new Date(ev.start_datetime);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [startTime, setStartTime] = useState(() => {
    if (!ev.start_datetime) return "";
    const d = new Date(ev.start_datetime);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [expiryDate, setExpiryDate] = useState(() => {
    if (!ev.expiry_datetime) return "";
    const d = new Date(ev.expiry_datetime);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [expiryTime, setExpiryTime] = useState(() => {
    if (!ev.expiry_datetime) return "";
    const d = new Date(ev.expiry_datetime);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const link = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : ""}/evaluation?e=${ev.id}`,
    [ev.id],
  );
  const [copied, setCopied] = useState(false);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError("");
    setCsvSuccess("");
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const arrayBuffer = await f.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any>(worksheet);

      if (data.length === 0) {
        setCsvError("File is empty.");
        return;
      }

      const emailKey = Object.keys(data[0]).find((h) => h.toLowerCase().trim() === "email" || h.toLowerCase().trim() === "email address");
      const nameKey = Object.keys(data[0]).find((h) => h.toLowerCase().trim() === "name" || h.toLowerCase().trim() === "full name" || h.toLowerCase().trim() === "first name");

      if (!emailKey) {
        setCsvError("Invalid format. Missing 'email' column header.");
        return;
      }

      const parsedEmails = new Map<string, string>();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let invalidCount = 0;

      data.forEach((row) => {
        const email = row[emailKey]?.toString().trim();
        const name = nameKey ? row[nameKey]?.toString().trim() || "" : "";
        
        if (email) {
          if (emailRegex.test(email)) {
            parsedEmails.set(email.toLowerCase(), name);
          } else {
            invalidCount++;
          }
        }
      });

      if (parsedEmails.size === 0) {
        setCsvError(`No valid emails found. ${invalidCount} invalid entries.`);
        return;
      }

      const newRecipients = Array.from(parsedEmails.entries()).map(([email, name]) => ({ email, name }));
      setRecipients(newRecipients);
      setCsvSuccess(`Successfully loaded ${parsedEmails.size} valid emails.` + (invalidCount > 0 ? ` Ignored ${invalidCount} invalid.` : ""));
    } catch (err) {
      setCsvError("Failed to parse file.");
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const addRecipients = () => {
    const raw = emailsInput;
    if (!raw.trim()) return;
    const list = raw.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean);
    const valid = list.filter(e => emailRegex.test(e));
    if (valid.length > 0) {
      setRecipients(prev => {
        let next = [...prev];
        valid.forEach((e, idx) => {
            const lowerE = e.toLowerCase();
            const existingIdx = next.findIndex(r => r.email.toLowerCase() === lowerE);
            const newName = idx === 0 && valid.length === 1 ? nameInput.trim() : "";
            if (existingIdx !== -1) {
                if (newName) next[existingIdx].name = newName;
            } else {
                next.push({ email: e, name: newName });
            }
        });
        return next;
      });
      setEmailsInput("");
      setNameInput("");
    }
  };

  const handleEmailInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addRecipients();
    } else if (e.key === "Backspace" && !emailsInput && recipients.length > 0) {
      setRecipients(prev => prev.slice(0, -1));
    }
  };

  const removeRecipient = (r: string) => setRecipients(prev => prev.filter(x => x.email !== r));

  const insertPlaceholder = (ph: string) => {
    if (bodyRef.current) {
      const start = bodyRef.current.selectionStart;
      const end = bodyRef.current.selectionEnd;
      const newBody = body.substring(0, start) + ph + body.substring(end);
      setBody(newBody);
      setTimeout(() => {
        if (bodyRef.current) {
          bodyRef.current.focus();
          bodyRef.current.setSelectionRange(start + ph.length, start + ph.length);
        }
      }, 0);
    } else {
      setBody(body + ph);
    }
  };

  const submit = async () => {
    if (isPublishing) return;
    const pendingInputEmails = emailsInput ? emailsInput.split(/[,\n\s]+/).map(s => s.trim()).filter(e => emailRegex.test(e)) : [];
    
    let finalRecipients = [...recipients];
    if (pendingInputEmails.length > 0) {
        pendingInputEmails.forEach((e, idx) => {
            const lowerE = e.toLowerCase();
            const existingIdx = finalRecipients.findIndex(r => r.email.toLowerCase() === lowerE);
            const newName = idx === 0 && pendingInputEmails.length === 1 ? nameInput.trim() : "";
            if (existingIdx !== -1) {
                // Update name if new name is provided
                if (newName) finalRecipients[existingIdx].name = newName;
            } else {
                finalRecipients.push({ email: e, name: newName });
            }
        });
    }
    
    if (type === "csv" && finalRecipients.length === 0) {
      alert("Please upload a valid CSV/Excel file first.");
      return;
    }
    if ((type === "email" || type === "csv") && finalRecipients.length === 0) {
      alert("Please provide at least one valid email.");
      return;
    }
    const publishType = type === "csv" ? "email" : type;
    setIsPublishing(true);
    try {
      let start_datetime: string | undefined;
      let expiry_datetime: string | undefined;
      
      if (scheduleType === "scheduled") {
        if (startDate) {
          const d = new Date(`${startDate}T${startTime || "00:00"}:00`);
          start_datetime = d.toISOString();
        }
        if (expiryDate) {
          const d = new Date(`${expiryDate}T${expiryTime || "23:59"}:00`);
          expiry_datetime = d.toISOString();
        }
      }
      
      ev.start_datetime = start_datetime;
      ev.expiry_datetime = expiry_datetime;

      await onPublish({ type: publishType, emails: finalRecipients as any, subject, body });
    } catch (err) {
      console.error(err);
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen p-10">
      <button
        onClick={onBack}
        disabled={isPublishing}
        className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="text-[10px] uppercase tracking-widest text-emerald-400">
          Ready to publish
        </div>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{ev.title}</h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          Choose how candidates receive this evaluation.
        </p>

        <div className="mt-8 grid grid-cols-4 gap-2">
          {[
            { k: "email", label: "Email", icon: Mail },
            { k: "link", label: "Public Link", icon: LinkIcon },
            { k: "csv", label: "Bulk CSV", icon: Upload },
            { k: "ats", label: "ATS", icon: Sparkles, soon: true },
          ].map((o: any) => (
            <button
              key={o.k}
              disabled={o.soon || isPublishing}
              onClick={() => setType(o.k)}
              className={`rounded-xl border p-4 text-left transition ${o.soon ? "border-white/5 opacity-40" : type === o.k ? "border-emerald-400/40 bg-emerald-400/5" : "border-white/10 hover:bg-white/[0.02]"}`}
            >
              <o.icon className="h-4 w-4 text-neutral-300" />
              <div className="mt-2 text-[12px] text-white">{o.label}</div>
              {o.soon && <div className="text-[10px] text-neutral-500">Coming soon</div>}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          {type === "email" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                Candidate Emails
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    disabled={isPublishing}
                    placeholder="Name (Optional)"
                    className="w-1/3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60 placeholder:text-neutral-500 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={emailsInput}
                    onChange={(e) => setEmailsInput(e.target.value)}
                    onKeyDown={handleEmailInput}
                    disabled={isPublishing}
                    placeholder="candidate@example.com"
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60 placeholder:text-neutral-500 disabled:opacity-50"
                  />
                  <button onClick={() => addRecipients()} disabled={isPublishing || !emailsInput.trim()} className="rounded-lg bg-emerald-500/20 px-4 py-2 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors">
                    Add
                  </button>
                </div>
                
                {recipients.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-2">
                    {recipients.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-md border border-white/5 bg-white/5 px-3 py-2">
                        <div className="flex flex-col">
                           {r.name && <span className="text-[12px] font-medium text-neutral-200">{r.name}</span>}
                           <span className="text-[11px] text-neutral-400">{r.email}</span>
                        </div>
                        <button onClick={() => removeRecipient(r.email)} disabled={isPublishing} className="p-1 text-neutral-400 hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {type === "link" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">
                Public Link
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] text-neutral-300">
                {ev.id === "draft" ? (
                  <span className="flex-1 truncate font-mono text-neutral-500">
                    Link will be generated upon publish
                  </span>
                ) : (
                  <>
                    <span className="flex-1 truncate font-mono">{link}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(link);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {type === "csv" && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">
                Upload CSV
              </div>
              <label className={`mt-2 flex items-center justify-between rounded-lg border border-dashed border-white/10 p-4 text-[12px] text-neutral-400 ${isPublishing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-emerald-400/40 hover:text-white"}`}>
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Drop CSV or browse (email,name,role)
                </span>
                <input type="file" accept=".csv" disabled={isPublishing} className="sr-only" onChange={handleCsvUpload} />
              </label>
              <div className="mt-2 flex justify-between items-center text-[11px]">
                <a
                  href={`data:text/csv;charset=utf-8,email\ncandidate1@example.com\ncandidate2@example.com\ncandidate3@example.com`}
                  download="sample_template.csv"
                  className="text-emerald-400 hover:underline"
                >
                  Download Sample CSV
                </a>
              </div>
              {csvError && <div className="mt-2 text-[12px] text-red-400">{csvError}</div>}
              {csvSuccess && <div className="mt-2 text-[12px] text-emerald-400">{csvSuccess}</div>}
            </div>
          )}
        </div>

        {(type === "email" || type === "csv") && (
            <div className="mt-6 space-y-4 pt-6 border-t border-white/5">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                  Email Subject
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isPublishing}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] outline-none focus:border-emerald-400/60 disabled:opacity-50 text-white"
                />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2 flex items-center justify-between">
                  <span>Email Body</span>
                  <div className="flex gap-2">
                    <button onClick={() => insertPlaceholder('{{name}}')} disabled={isPublishing} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400 hover:bg-white/10">+ Name</button>
                    <button onClick={() => insertPlaceholder('{{evaluation}}')} disabled={isPublishing} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400 hover:bg-white/10">+ Evaluation</button>
                    <button onClick={() => insertPlaceholder('{{company}}')} disabled={isPublishing} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400 hover:bg-white/10">+ Company</button>
                    <button onClick={() => insertPlaceholder('{{link}}')} disabled={isPublishing} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400 hover:bg-white/10">+ Link</button>
                  </div>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={isPublishing}
                  rows={8}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] outline-none focus:border-emerald-400/60 disabled:opacity-50 text-white font-mono leading-relaxed resize-none"
                />
              </div>
            </div>
          )}

        <div className="mt-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Schedule</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setScheduleType("none")}
                  disabled={isPublishing}
                  className={`rounded-md border px-2.5 py-1 text-[11px] ${scheduleType === "none" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400"} disabled:opacity-50`}
                >
                  No time limit
                </button>
                <button
                  onClick={() => setScheduleType("scheduled")}
                  disabled={isPublishing}
                  className={`rounded-md border px-2.5 py-1 text-[11px] ${scheduleType === "scheduled" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400"} disabled:opacity-50`}
                >
                  Set dates
                </button>
              </div>
            </div>

            {scheduleType === "scheduled" && (
              <div className="grid grid-cols-2 gap-6 mt-4 border-t border-white/5 pt-4">
                <div>
                  <label className="mb-2 block text-[11px] font-medium text-neutral-300">Start Date & Time (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isPublishing}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60 disabled:opacity-50"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isPublishing}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60 disabled:opacity-50"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-neutral-500">Leave blank to make it immediately accessible.</p>
                </div>
                
                <div>
                  <label className="mb-2 block text-[11px] font-medium text-neutral-300">Expiry Date & Time (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      disabled={isPublishing}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60 disabled:opacity-50"
                    />
                    <input
                      type="time"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      disabled={isPublishing}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60 disabled:opacity-50"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-neutral-500">Leave blank to never expire.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-2">
          <button
            onClick={onBack}
            disabled={isPublishing}
            className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-neutral-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2 text-[13px] font-medium text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" /> Publish Evaluation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishedScreen({ ev, onBack }: { ev: Evaluation; onBack: () => void }) {
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/evaluation?e=${ev.id}` : "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid min-h-screen place-items-center p-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-400">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight">Evaluation published</h1>
        <p className="mt-1 text-[13px] text-neutral-400">{ev.title} is now live.</p>

        {ev.invite?.type === "email" ? (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
            <div className="text-[14px] text-emerald-400">
              Emails have been successfully sent to all invited candidates.
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Shareable link
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="truncate font-mono text-[12px] text-neutral-300">{link}</div>
              <button
                onClick={handleCopy}
                className="ml-2 rounded-md bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/20"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={onBack}
            className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-neutral-300 hover:bg-white/5"
          >
            Back to workspace
          </button>
          <Link
            to="/recruiter/evaluations"
            className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-[12px] font-medium text-black"
          >
            View all evaluations
          </Link>
        </div>
      </div>
    </div>
  );
}
