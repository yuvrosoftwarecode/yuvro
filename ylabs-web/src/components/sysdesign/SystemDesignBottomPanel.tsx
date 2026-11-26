import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  LayoutList,
  FileText,
  Play,
  CheckCircle2,
  Loader2,
  Sparkles,
  Code2,
  ListTodo,
} from "lucide-react";
import { MarkdownPreview } from "./MarkdownNotes";
import { parsePlanStructure, type PlanTask } from "@/components/common/ai-buddy/AIMentor";

export interface SystemDesignBottomPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  notes: Record<string, string>;
  onNotesChange: (tab: string, value: string) => void;
  planContent?: string;
  onPlanContentChange?: (content: string) => void;
  onStartPlanTask?: (task: PlanTask, subtask?: any) => void;
  taskStatuses?: Record<string, { status: "idle" | "running" | "completed" | "error"; sessionId?: string }>;
  onTogglePlanCheckbox?: (taskNum: string, subNum?: string) => void;
  onRequestGeneratePlan?: () => void;
  planFiles?: Record<string, string>;
  activePlanFile?: string;
  onSelectPlanFile?: (path: string) => void;
  defaultSubTab?: "plan" | "notes";
  showTabsInPlanOrder?: boolean;
}

export function SystemDesignBottomPanel({
  isOpen,
  onToggle,
  activeTab,
  notes,
  onNotesChange,
  planContent = "",
  onPlanContentChange,
  onStartPlanTask,
  taskStatuses = {},
  onTogglePlanCheckbox,
  onRequestGeneratePlan,
  planFiles,
  activePlanFile,
  onSelectPlanFile,
  defaultSubTab = "notes",
  showTabsInPlanOrder = false,
}: SystemDesignBottomPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"notes" | "plan">(defaultSubTab);
  const [notesMode, setNotesMode] = useState<"write" | "preview">("write");
  const [planViewMode, setPlanViewMode] = useState<"ui" | "markdown">("ui");
  const [panelHeight, setPanelHeight] = useState<number>(260);

  const startBottomResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelHeight;
    const onMove = (ev: MouseEvent) => {
      const next = startH - (ev.clientY - startY);
      setPanelHeight(Math.max(100, next));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const currentNote = notes[activeTab] ?? "";
  const allParsedPlanTasks = useMemo(() => parsePlanStructure(planContent), [planContent]);

  // Filter tasks based on activeTab
  const filteredTasks = useMemo(() => {
    if (!allParsedPlanTasks.length) return [];
    const tabKeywords: Record<string, string[]> = {
      hld: ["hld", "architecture", "high level", "component", "diagram"],
      sequence: ["sequence", "flow", "mermaid", "redirect", "request"],
      schema: ["schema", "dbml", "database", "table", "sql", "model", "data"],
      api: ["api", "rest", "endpoint", "contract", "http"],
    };
    const tabNumbers: Record<string, string> = {
      hld: "1",
      sequence: "2",
      schema: "3",
      api: "4",
    };
    const targetNum = tabNumbers[activeTab];
    const keywords = tabKeywords[activeTab] || [];

    const matched = allParsedPlanTasks.filter(
      (t) =>
        t.number === targetNum ||
        keywords.some((k) => t.title.toLowerCase().includes(k))
    );
    return matched.length > 0 ? matched : allParsedPlanTasks;
  }, [allParsedPlanTasks, activeTab]);

  const insertSolutionTemplate = () => {
    const template = `## Approach
- High-level architecture and request flow.
- Scalability & reliability strategy.

## Assumptions
- Daily active users (DAU) & Peak QPS.
- Read-to-write ratio & data retention period.

## Trade-offs
- **Option A** vs **Option B** (e.g., SQL relational consistency vs NoSQL scale).
- Latency vs strong consistency considerations.`;
    onNotesChange(activeTab, currentNote ? `${currentNote}\n\n${template}` : template);
  };

  const renderNotesTabBtn = () => (
    <button
      key="notes"
      onClick={() => {
        setActiveSubTab("notes");
        if (!isOpen) onToggle();
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
        activeSubTab === "notes"
          ? "bg-[#f7931e] text-white shadow-xs font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-[#f7931e]/10"
      }`}
    >
      <FileText className="h-3 w-3" />
      <span>User Solution (Approach, Assumptions, Trade-offs)</span>
    </button>
  );

  const renderPlanTabBtn = () => (
    <button
      key="plan"
      onClick={() => {
        setActiveSubTab("plan");
        if (!isOpen) onToggle();
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
        activeSubTab === "plan"
          ? "bg-[#f7931e] text-white shadow-xs font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-[#f7931e]/10"
      }`}
    >
      <LayoutList className="h-3 w-3" />
      <span>AI Mentor Plan</span>
      {filteredTasks.length > 0 && (
        <span className="rounded-full bg-white/20 text-white px-1.5 py-0.2 text-[9.5px]">
          {filteredTasks.length}
        </span>
      )}
    </button>
  );

  return (
    <div
      style={{ height: isOpen ? `${panelHeight}px` : "36px" }}
      className="flex flex-col border-t-2 border-border shadow-md bg-card shrink-0 transition-none relative"
    >
      {/* Resizer Handle */}
      {isOpen && (
        <div
          role="separator"
          onMouseDown={startBottomResize}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize bg-transparent hover:bg-[#f7931e] transition-colors z-20 -translate-y-1/2"
          title="Drag to resize bottom panel"
        />
      )}

      {/* Top Header / Bar */}
      <div className="flex items-center justify-between border-b px-3 h-9 select-none bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
            aria-label="Toggle Bottom Panel"
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          {/* Sub-tabs: User Solution / AI Mentor Plan */}
          <div className="flex items-center gap-1.5 ml-1 border-l border-border/60 pl-2.5">
            {showTabsInPlanOrder
              ? [renderPlanTabBtn(), renderNotesTabBtn()]
              : [renderNotesTabBtn(), renderPlanTabBtn()]}
          </div>
        </div>

        {/* Right side of header: quick stats & mode controls */}
        <div className="flex items-center gap-2 text-xs">
          {activeSubTab === "notes" && isOpen && (
            <div className="flex items-center gap-1.5">
              {!currentNote.trim() && (
                <button
                  onClick={insertSolutionTemplate}
                  className="text-[10.5px] text-[#f7931e] hover:underline inline-flex items-center gap-1 font-medium mr-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  Insert Template
                </button>
              )}
              <div className="inline-flex rounded-md border p-0.5 bg-background">
                <button
                  onClick={() => setNotesMode("write")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] cursor-pointer ${
                    notesMode === "write" ? "bg-[#f7931e] text-white font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Pencil className="h-3 w-3" />
                  Write
                </button>
                <button
                  onClick={() => setNotesMode("preview")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] cursor-pointer ${
                    notesMode === "preview" ? "bg-[#f7931e] text-white font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
              </div>
            </div>
          )}

          {activeSubTab === "plan" && isOpen && (
            <div className="flex items-center gap-2">
              

              {/* Mode switch: Tasks UI vs Markdown Source */}
              <div className="inline-flex rounded-md border p-0.5 bg-background">
                <button
                  onClick={() => setPlanViewMode("ui")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] cursor-pointer ${
                    planViewMode === "ui" ? "bg-[#f7931e] text-white font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tasks Checklist UI"
                >
                  <ListTodo className="h-3 w-3" />
                  Tasks
                </button>
                <button
                  onClick={() => setPlanViewMode("markdown")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] cursor-pointer ${
                    planViewMode === "markdown" ? "bg-[#f7931e] text-white font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Markdown Source"
                >
                  <Code2 className="h-3 w-3" />
                  Markdown
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Body (Full Width - Component Inspector Removed) */}
      {isOpen && (
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-background/50">
          {activeSubTab === "notes" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {notesMode === "write" ? (
                <textarea
                  value={currentNote}
                  onChange={(e) => onNotesChange(activeTab, e.target.value)}
                  spellCheck={false}
                  placeholder={`## Approach\n- High-level architecture and request flow.\n\n## Assumptions\n- Peak QPS: 10,000, 99.99% availability.\n\n## Trade-offs\n- Relational DB vs NoSQL, Async queues vs Sync HTTP.`}
                  className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-xs outline-none"
                />
              ) : (
                <div className="min-h-0 flex-1 overflow-auto p-3 text-xs">
                  <MarkdownPreview
                    src={currentNote}
                    empty="No solution notes written yet. Switch to Write tab to add your Approach, Assumptions & Trade-offs."
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Plan Files sidebar filtered strictly for the currently selected tab (hld, schema, sequence, api) */}
              {(() => {
                if (!planFiles) return null;
                const tabLower = (activeTab || "").toLowerCase();
                const relevantEntries = Object.entries(planFiles).filter(([fPath]) => {
                  const pLower = fPath.toLowerCase();
                  if (tabLower === "hld") return pLower.includes("/hld/") || pLower.includes("hld") || pLower.includes("architecture");
                  if (tabLower === "schema") return pLower.includes("/db-schema/") || pLower.includes("schema") || pLower.includes("dbml");
                  if (tabLower === "sequence") return pLower.includes("/sequence-diagram/") || pLower.includes("sequence");
                  if (tabLower === "api") return pLower.includes("/rest-api/") || pLower.includes("api");
                  return pLower.includes(tabLower);
                });

                if (relevantEntries.length === 0) return null;

                return (
                  <div className="w-52 border-r bg-muted/10 shrink-0 flex flex-col min-h-0 overflow-y-auto p-1.5 space-y-0.5 text-xs">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {activeTab.toUpperCase()} Plans ({relevantEntries.length})
                    </div>
                    {relevantEntries.map(([fPath]) => {
                      const fName = fPath.split("/").pop() || fPath;
                      const isSelected = activePlanFile === fPath;
                      return (
                        <button
                          key={fPath}
                          type="button"
                          onClick={() => onSelectPlanFile?.(fPath)}
                          className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#f7931e]/15 text-[#f7931e] font-semibold"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                          title={fPath}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{fName}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {planViewMode === "markdown" ? (
                /* Markdown Source View */
                <div className="flex-1 min-h-0 flex flex-col">
                  <textarea
                    value={planContent}
                    onChange={(e) => onPlanContentChange?.(e.target.value)}
                    spellCheck={false}
                    placeholder="# Implementation Plan&#10;&#10;## Tasks&#10;- [ ] Task 1: ..."
                    className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-xs outline-none border-0"
                  />
                </div>
              ) : (
                /* AI Mentor Plan Tasks View (Filtered by Active Tab) */
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg space-y-2">
                  <LayoutList className="h-6 w-6 text-muted-foreground/60" />
                  <div>
                    <div className="font-semibold text-foreground">
                      No Tasks for {activeTab.toUpperCase()} Yet
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm">
                      Ask AI Mentor to generate a plan or add tasks for this section in the Markdown view.
                    </p>
                  </div>
                  {onRequestGeneratePlan && (
                    <button
                      onClick={onRequestGeneratePlan}
                      className="px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 mt-1 bg-[#f7931e] text-white hover:bg-[#e5820f] transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate Plan
                    </button>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const taskStatus = taskStatuses[task.id]?.status || (task.done ? "completed" : "idle");
                  const isTaskRunning = taskStatus === "running";
                  const isTaskDone = task.done || taskStatus === "completed";

                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border/80 bg-card p-2.5 space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                          onClick={() => onTogglePlanCheckbox?.(task.number)}
                        >
                          <div className="text-primary mt-0.5">
                            {isTaskDone ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded border border-muted-foreground/40 hover:border-primary transition-colors" />
                            )}
                          </div>
                          <span
                            className={`text-[12px] font-medium leading-tight ${
                              isTaskDone ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            Task {task.number}: {task.title}
                          </span>
                        </div>

                        {onStartPlanTask && (
                          <button
                            onClick={() => onStartPlanTask(task)}
                            disabled={isTaskRunning}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              isTaskDone
                                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                : isTaskRunning
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                : "bg-[#f7931e] text-white hover:bg-[#e5820f] active:bg-[#d6750d] shadow-xs"
                            }`}
                          >
                            {isTaskRunning ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Running...</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-2.5 w-2.5" fill="currentColor" />
                                <span>{isTaskDone ? "Re-run task" : "Start task"}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Subtasks */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="pl-5 space-y-1.5 border-l border-border/60 ml-2">
                          {task.subtasks.map((sub) => {
                            const subStatus = taskStatuses[sub.id]?.status || (sub.done ? "completed" : "idle");
                            const isSubRunning = subStatus === "running";
                            const isSubDone = sub.done || subStatus === "completed";

                            return (
                              <div key={sub.id} className="flex items-center justify-between gap-2 text-xs">
                                <div
                                  className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                                  onClick={() => onTogglePlanCheckbox?.(task.number, sub.number)}
                                >
                                  <div className="text-primary">
                                    {isSubDone ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                      <div className="h-3 w-3 rounded border border-muted-foreground/40 hover:border-primary transition-colors" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[11px] truncate ${
                                      isSubDone ? "line-through text-muted-foreground" : "text-foreground"
                                    }`}
                                  >
                                    {sub.number} {sub.text}
                                  </span>
                                </div>

                                {onStartPlanTask && (
                                  <button
                                    onClick={() => onStartPlanTask(task, sub)}
                                    disabled={isSubRunning}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                      isSubDone
                                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                        : isSubRunning
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                        : "bg-[#f7931e]/15 text-[#f7931e] border border-[#f7931e]/30 hover:bg-[#f7931e] hover:text-white"
                                    }`}
                                  >
                                    {isSubRunning ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <Play className="h-2 w-2" fill="currentColor" />
                                    )}
                                    <span>Run sub task</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
