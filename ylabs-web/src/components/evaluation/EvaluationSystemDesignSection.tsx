import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Boxes,
  GitBranch,
  Database,
  FileText,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  BookOpen,
  ListChecks,
  ShieldAlert,
  Send,
  Loader2,
  Check,
  HelpCircle,
  Maximize2,
  Layers,
  Cpu,
  Clock,
  Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HldEditor, DiagramBoard, type SDNode, type SDEdge } from "@/components/sysdesign/DesignCanvas";
import { ErdBoard } from "@/components/sysdesign/ErdBoard";
import { ApiDesigner, ApiDocs, type ApiEndpoint } from "@/components/sysdesign/ApiDesigner";
import { NotesPanel, MarkdownPreview } from "@/components/sysdesign/MarkdownNotes";
import { MermaidPreview } from "@/components/sysdesign/MermaidPreview";
import { evaluationService } from "@/services/evaluationService";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export type SystemDesignTab = "hld" | "sequence" | "schema" | "api" | "notes";

interface SystemDesignChallenge {
  id?: string;
  title?: string;
  description?: string;
  problem?: string;
  tasks?: { id?: string; title: string; description?: string; marks?: number }[];
  constraints?: string[];
  deliverables?: string[];
  starter_design?: any;
  solution_design?: any;
  marks?: number;
  duration_minutes?: number;
  difficulty?: string;
  xp?: number;
}

export interface EvaluationSystemDesignSectionProps {
  evaluationId: string;
  section: {
    id: string;
    title: string;
    description?: string;
    marks?: number;
    duration_minutes?: number;
    challenge?: SystemDesignChallenge;
    questions?: any[];
    proctoring?: any;
  };
  isRecruiterPreview?: boolean;
  isSubmitted?: boolean;
  onFinishSection: () => void;
  nextSectionTitle?: string;
}



function SplitEditor({
  value,
  onChange,
  preview,
  hint,
  placeholder = "// Type your code or definitions here...",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  preview: React.ReactNode;
  hint: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(320px,40%)_1fr]">
      <div className="flex min-h-0 flex-col border-r border-border">
        <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground font-mono">
          {hint}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[260px] flex-1 resize-none bg-[#18181b] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#f4f4f5] outline-none disabled:opacity-70 selection:bg-primary/30"
        />
      </div>
      <div className="min-h-0 bg-background overflow-hidden">{preview}</div>
    </div>
  );
}

const DEFAULT_NODES: SDNode[] = [];
const DEFAULT_EDGES: SDEdge[] = [];
const DEFAULT_SEQ = "";
const DEFAULT_SCHEMA = "";
const DEFAULT_APIS: ApiEndpoint[] = [];
const DEFAULT_NOTES: Record<string, string> = {
  hld: "",
  sequence: "",
  schema: "",
  api: "",
};

export function EvaluationSystemDesignSection({
  evaluationId,
  section,
  isRecruiterPreview = false,
  isSubmitted = false,
  onFinishSection,
  nextSectionTitle,
}: EvaluationSystemDesignSectionProps) {
  const challenge = section.challenge || (section.questions && section.questions.length > 0 && typeof section.questions[0] === "object" ? section.questions[0] : null);
  const challengeId = challenge?.id || section.id;
  const storageKey = `eval_${evaluationId}_system_design_${section.id}`;

  const [tab, setTab] = useState<SystemDesignTab>("hld");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(380);

  // Design Canvas State
  const [nodes, setNodes] = useState<SDNode[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) return parsed.nodes;
        }
      } catch {}
    }
    if (challenge?.starter_design?.nodes && Array.isArray(challenge.starter_design.nodes)) {
      return challenge.starter_design.nodes;
    }
    return DEFAULT_NODES;
  });

  const [edges, setEdges] = useState<SDEdge[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.edges)) return parsed.edges;
        }
      } catch {}
    }
    if (challenge?.starter_design?.edges && Array.isArray(challenge.starter_design.edges)) {
      return challenge.starter_design.edges;
    }
    return DEFAULT_EDGES;
  });

  const [seq, setSeq] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.seq === "string") return parsed.seq;
        }
      } catch {}
    }
    if (challenge?.starter_design?.seq && typeof challenge.starter_design.seq === "string") {
      return challenge.starter_design.seq;
    }
    return DEFAULT_SEQ;
  });

  const [schema, setSchema] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.schema === "string") return parsed.schema;
        }
      } catch {}
    }
    if (challenge?.starter_design?.schema && typeof challenge.starter_design.schema === "string") {
      return challenge.starter_design.schema;
    }
    return DEFAULT_SCHEMA;
  });

  const [apis, setApis] = useState<ApiEndpoint[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.apis) && parsed.apis.length > 0) return parsed.apis;
        }
      } catch {}
    }
    if (challenge?.starter_design?.apis && Array.isArray(challenge.starter_design.apis)) {
      return challenge.starter_design.apis;
    }
    return DEFAULT_APIS;
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.notes && typeof parsed.notes === "object") return parsed.notes;
        }
      } catch {}
    }
    if (challenge?.starter_design?.notes && typeof challenge.starter_design.notes === "object") {
      return challenge.starter_design.notes;
    }
    return DEFAULT_NOTES;
  });

  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const [savedAt, setSavedAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSyntaxModal, setShowSyntaxModal] = useState(false);
  const hasInitialized = useRef(false);

  // Resize handler for left problem panel
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMouseMove = (ev: MouseEvent) => {
      const newW = Math.max(280, Math.min(window.innerWidth * 0.45, startW + (ev.clientX - startX)));
      setLeftWidth(newW);
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Debounced Local Autosave (800ms)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    if (isSubmitted) return;

    setAutosaveStatus("saving");
    const t = setTimeout(() => {
      const payload = { nodes, edges, seq, schema, apis, notes };
      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {}

      const now = new Date();
      setSavedAt(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setAutosaveStatus("saved");
    }, 800);

    return () => clearTimeout(t);
  }, [nodes, edges, seq, schema, apis, notes, isSubmitted, storageKey]);

  // Section Submit Handler
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    const payload = { nodes, edges, seq, schema, apis, notes };

    try {
      if (evaluationId && !isRecruiterPreview) {
        await restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/submit_system_design/`, {
          section_id: section.id,
          question_id: challengeId,
          design: payload,
          action: "submit",
          status: "submitted",
        });
      }
      toast.success("System Design submitted successfully!");
      setShowSubmitModal(false);
      onFinishSection();
    } catch (e: any) {
      console.error("Submission failed:", e);
      toast.error(e?.response?.data?.error || "Failed to submit system design. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tasksList = challenge?.tasks || [];
  const constraintsList = challenge?.constraints || [];
  const marks = challenge?.marks || section.marks || 100;
  const duration = challenge?.duration_minutes || section.duration_minutes || 45;

  const tabsConfig = [
    { id: "hld" as const, label: "HLD Architecture", icon: <Boxes className="h-3.5 w-3.5" />, sub: `${nodes.length} nodes` },
    { id: "sequence" as const, label: "Sequence Diagram", icon: <GitBranch className="h-3.5 w-3.5" />, sub: "Mermaid" },
    { id: "schema" as const, label: "DB Schema", icon: <Database className="h-3.5 w-3.5" />, sub: "DBML" },
    { id: "api" as const, label: "REST APIs", icon: <FileText className="h-3.5 w-3.5" />, sub: `${apis.length} endpoints` },
    { id: "notes" as const, label: "Architecture Notes", icon: <FileCode2 className="h-3.5 w-3.5" />, sub: "Markdown" },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Studio Top Control Strip */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-2 shrink-0 backdrop-blur-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title={leftCollapsed ? "Show Problem Requirements" : "Collapse Problem Requirements"}
          >
            {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-xs text-foreground truncate max-w-[280px]">
              {challenge?.title || section.title || "System Design Challenge"}
            </span>
            <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium font-mono text-primary">
              {marks} Marks
            </span>
          </div>

          {isSubmitted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Submitted
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 ml-2">
              {autosaveStatus === "saving" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Autosaving…</span>
                </>
              ) : savedAt ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>Saved at {savedAt}</span>
                </>
              ) : (
                <span>Autosave active</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyntaxModal(true)}
            className="h-7 text-xs border border-border inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Mermaid & DBML syntax guide"
          >
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Syntax Help</span>
          </Button>

          {!isSubmitted && (
            <Button
              size="sm"
              onClick={() => setShowSubmitModal(true)}
              disabled={isSubmitting}
              className="h-7 text-xs bg-primary text-primary-foreground font-medium shadow-xs inline-flex items-center gap-1 hover:bg-primary/90"
              title="Submit your system design and complete section"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Submit Section
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Main Workspace Area: Left Requirements Panel + Right 4-Tab Studio */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Side: Problem Statement, Tasks & Constraints */}
        {!leftCollapsed && (
          <>
            <aside
              style={{ width: `${leftWidth}px` }}
              className="flex flex-col border-r border-border bg-card/40 shrink-0 min-w-[280px] max-w-[45vw] overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* Challenge Header Card */}
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Deliverables Checklist
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary" />
                      ~{duration} min
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {challenge?.title || section.title}
                  </h3>
                  {challenge?.difficulty && (
                    <div className="inline-flex items-center gap-1 rounded bg-accent/60 px-2 py-0.5 text-[10px] font-medium text-foreground">
                      <Award className="h-3 w-3 text-amber-500" />
                      {challenge.difficulty} Difficulty
                    </div>
                  )}
                </div>

                {/* Problem Description */}
                {(challenge?.problem || challenge?.description || section.description) && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Scenario & Requirements
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-foreground prose-sm max-w-none">
                      <MarkdownPreview src={challenge?.problem || challenge?.description || section.description || ""} />
                    </div>
                  </div>
                )}

                {/* Tasks & Deliverables */}
                {tasksList.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ListChecks className="h-3.5 w-3.5 text-emerald-500" />
                      Key Objectives ({tasksList.length})
                    </div>
                    <div className="space-y-2">
                      {tasksList.map((task, idx) => (
                        <div key={task.id || idx} className="rounded-lg border border-border bg-card p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-1 text-xs font-medium text-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="grid h-4 w-4 place-items-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              {task.title}
                            </span>
                            {task.marks && (
                              <span className="text-[10px] font-mono font-semibold text-primary shrink-0">
                                {task.marks} pts
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed pl-5.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-Functional Constraints */}
                {constraintsList.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      Constraints & Scale
                    </div>
                    <ul className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs text-foreground">
                      {constraintsList.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>

            {/* Drag Handle to Resize Sidebar */}
            <div
              onMouseDown={startResize}
              className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0 z-10"
              title="Drag to resize panel"
            />
          </>
        )}

        {/* Right Side: Active Studio Tabs & Canvas */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Studio Navigation Tabs */}
          <nav className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-3 shrink-0">
            {tabsConfig.map((t) => (
              <Button
                variant="ghost"
                size="sm"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px inline-flex items-center gap-1.5 rounded-none border-b-2 px-3.5 py-2 text-xs transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground font-semibold bg-muted/20"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span className="text-[10px] text-muted-foreground font-normal">· {t.sub}</span>
              </Button>
            ))}
          </nav>

          {/* Active Canvas / Editor Content */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              {tab === "hld" && (
                <div className="h-full w-full">
                  <HldEditor
                    nodes={nodes}
                    edges={edges}
                    setNodes={setNodes}
                    setEdges={setEdges}
                  />
                </div>
              )}

              {tab === "sequence" && (
                <SplitEditor
                  value={seq}
                  onChange={setSeq}
                  disabled={isSubmitted}
                  hint="Mermaid sequenceDiagram — Live architectural flow preview"
                  placeholder={`// Write your Mermaid sequence diagram here...\n// Example:\nsequenceDiagram\n  autonumber\n  actor User as Client\n  participant GW as API Gateway\n  participant S as Core Service\n  participant DB as Database\n\n  User->>GW: Request\n  GW->>S: Forward\n  S->>DB: Query\n  DB-->>S: Data\n  S-->>GW: Response\n  GW-->>User: 200 OK`}
                  preview={<MermaidPreview code={seq} />}
                />
              )}

              {tab === "schema" && (
                <SplitEditor
                  value={schema}
                  onChange={setSchema}
                  disabled={isSubmitted}
                  hint="dbdiagram.io-style DBML: Table users { id bigint [pk] email varchar [unique] }"
                  placeholder={`// Define your DBML tables and relations here...\n// Example:\nTable users {\n  id bigint [pk]\n  email varchar [unique]\n  created_at timestamp\n}\n\nTable items {\n  id bigint [pk]\n  user_id bigint [ref: > users.id]\n  title varchar\n  status varchar\n  created_at timestamp\n}`}
                  preview={
                    schema.trim() ? (
                      <ErdBoard src={schema} />
                    ) : (
                      <div className="grid h-full place-items-center p-6 text-center text-xs text-muted-foreground">
                        <div>
                          <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                          <p className="font-medium text-foreground">No schema defined yet.</p>
                          <p className="mt-1">Write DBML tables on the left to see the interactive ERD diagram.</p>
                        </div>
                      </div>
                    )
                  }
                />
              )}

              {tab === "api" && (
                <div className="h-full overflow-y-auto p-4 bg-background">
                  <ApiDesigner
                    apis={apis}
                    setApis={setApis}
                  />
                </div>
              )}

              {tab === "notes" && (
                <div className="grid h-full grid-cols-1 md:grid-cols-2">
                  <div className="flex min-h-0 flex-col border-r border-border">
                    <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground font-mono">
                      Markdown Architecture Notes & Justifications
                    </div>
                    <textarea
                      value={notes.hld || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, hld: e.target.value }))}
                      disabled={isSubmitted}
                      placeholder="Write your architectural decisions, scalability trade-offs, and failure mode analysis..."
                      className="flex-1 resize-none bg-[#18181b] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#f4f4f5] outline-none disabled:opacity-70"
                    />
                  </div>
                  <div className="min-h-0 bg-background p-5 overflow-y-auto">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Rendered Preview
                    </div>
                    <div className="prose dark:prose-invert text-xs max-w-none">
                      <MarkdownPreview src={notes.hld || "_No architecture notes written yet._"} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Collapsible Notes Drawer for HLD / Sequence / Schema / API */}
            {tab !== "notes" && (
              <NotesPanel
                key={tab}
                value={notes[tab] ?? ""}
                onChange={(v) => setNotes((prev) => ({ ...prev, [tab]: v }))}
                title={`${tabsConfig.find((t) => t.id === tab)?.label || tab} Notes & Trade-offs`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Submit System Design?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-3 pt-2">
              <p>
                You are about to submit your System Design for <strong>{challenge?.title || section.title}</strong>. Once submitted, you cannot edit your architecture diagrams or contracts.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-foreground">
                  <span>• HLD Architecture Canvas:</span>
                  <span className="font-semibold">{nodes.length} nodes, {edges.length} edges</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span>• Sequence Flow:</span>
                  <span className="font-semibold">{seq.trim() ? "Completed" : "Empty"}</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span>• DBML Schema:</span>
                  <span className="font-semibold">{schema.trim() ? "Defined" : "Empty"}</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span>• REST API Endpoints:</span>
                  <span className="font-semibold">{apis.length} endpoints</span>
                </div>
              </div>
              {nextSectionTitle && (
                <p className="text-foreground font-medium">
                  Next section: <span className="text-primary">{nextSectionTitle}</span>
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Review Design</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Submitting…
                </>
              ) : (
                "Confirm & Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Syntax Guide Modal */}
      <Dialog open={showSyntaxModal} onOpenChange={setShowSyntaxModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Syntax Reference & Cheatsheet
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quick syntax references for Mermaid Sequence Diagrams and DBML Relational Schemas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Mermaid Sequence Reference */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-blue-500" />
                Mermaid Sequence Diagram Syntax
              </h4>
              <pre className="rounded-lg bg-[#18181b] p-3 font-mono text-[11px] leading-relaxed text-[#f4f4f5] overflow-x-auto">
{`sequenceDiagram
  autonumber
  actor Client as Web Client
  participant GW as API Gateway
  participant S as Order Service
  participant DB as PostgreSQL
  participant Q as RabbitMQ

  Client->>GW: POST /api/v1/orders
  GW->>S: Forward Request
  S->>DB: INSERT order (status=pending)
  DB-->>S: OK (order_id)
  S->>Q: Publish order.created
  S-->>Client: 201 Created`}
              </pre>
            </div>

            {/* DBML Reference */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-500" />
                DBML Database Schema Syntax
              </h4>
              <pre className="rounded-lg bg-[#18181b] p-3 font-mono text-[11px] leading-relaxed text-[#f4f4f5] overflow-x-auto">
{`Table users {
  id bigint [pk]
  email varchar [unique]
  created_at timestamp
}

Table orders {
  id bigint [pk]
  user_id bigint [ref: > users.id]
  total_amount decimal
  status varchar
  created_at timestamp
}`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setShowSyntaxModal(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
