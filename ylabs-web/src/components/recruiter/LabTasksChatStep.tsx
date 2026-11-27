import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  labTaskAIService,
  type LabContext,
  type InspectRepoResponse,
  type TaskChatNextAction,
  type TaskChatProposedAction,
} from "@/services/labTaskAIService";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposedAction?: TaskChatProposedAction;
  nextActions?: TaskChatNextAction[];
  applied?: boolean;
}

interface LabTasksChatStepProps {
  labFormData: any;
  repoInspection: InspectRepoResponse | null;
  getLabContext: () => LabContext;
  onTasksChange: (tasks: any[], meta?: { marks?: number; duration_minutes?: number }) => void;
  onAddManualTask: () => void;
  onUpdateTask: (index: number, field: string, val: any) => void;
  onRemoveTask: (index: number) => void;
  onStandardizeTask: (index: number) => Promise<void>;
  onEstimateDuration: (index: number) => Promise<void>;
  standardizingIndex: number | null;
  estimatingIndex: number | null;
  onProceedToScoring: () => void;
  getSolutionString: (solution: any) => string;
}

export function LabTasksChatStep({
  labFormData,
  repoInspection,
  getLabContext,
  onTasksChange,
  onAddManualTask,
  onUpdateTask,
  onRemoveTask,
  onStandardizeTask,
  onEstimateDuration,
  standardizingIndex,
  estimatingIndex,
  onProceedToScoring,
  getSolutionString,
}: LabTasksChatStepProps) {
  const [messages, setMessages] = useState<ChatTurn[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Tell me what you want candidates to build, debug, or optimize—or pick a quick action below. I can generate progressive tasks grounded in your repository, standardize rough recruiter notes, and calibrate marks and durations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [expandedTaskIdx, setExpandedTaskIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const tasks: any[] = labFormData.tasks || [];
  const totalMarks = useMemo(
    () => tasks.reduce((sum, t) => sum + (Number(t.marks) || 0), 0),
    [tasks]
  );
  const totalDuration = useMemo(
    () => tasks.reduce((sum, t) => sum + (Number(t.duration_minutes) || 0), 0),
    [tasks]
  );

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Compute context-aware next action suggestions
  const activeNextActions: TaskChatNextAction[] = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant?.nextActions && lastAssistant.nextActions.length > 0) {
      return lastAssistant.nextActions;
    }

    if (tasks.length === 0) {
      return [
        {
          label: "Generate 3 progressive tasks",
          prompt: "Generate 3 progressive tasks (setup/core, business logic, optimization/edge cases) grounded in the lab description and repository.",
        },
        {
          label: "Suggest 1 starter task",
          prompt: "Suggest 1 realistic starter task based on the repository and lab description.",
        },
        {
          label: "Generate 2 tasks",
          prompt: "Generate 2 focused tasks covering core implementation and validation/error handling.",
        },
        {
          label: "Generate 4 tasks",
          prompt: "Generate 4 progressive tasks covering baseline, core logic, optimization, and resilience.",
        },
      ];
    }

    return [
      {
        label: "Standardize all tasks",
        prompt: "Standardize all current tasks with crisp Objectives, Requirements, Edge Cases, and Reference Solutions.",
      },
      {
        label: "Estimate durations",
        prompt: "Estimate realistic completion durations in minutes for every current task.",
      },
      {
        label: "Add 1 more task",
        prompt: "Suggest 1 additional non-duplicate task that complements the existing tasks.",
      },
      {
        label: "Proceed to Scoring & Testing →",
        action: "next_step",
      },
    ];
  }, [messages, tasks.length]);

  const applyProposedAction = (turnId: string, action: TaskChatProposedAction) => {
    if (!action || action.type === "none" || !action.tasks || action.tasks.length === 0) return;

    const now = Date.now();
    if (action.type === "replace_tasks") {
      const mapped = action.tasks.map((t, idx) => ({
        id: `task_${now}_${idx}`,
        title: t.title || `Task ${idx + 1}`,
        description: t.description || "",
        solution: t.solution || "",
        difficulty: t.difficulty || (idx === 0 ? "EASY" : idx === action.tasks.length - 1 ? "HARD" : "MEDIUM"),
        marks: Number(t.marks) || Math.round((labFormData.marks || 100) / action.tasks.length),
        duration_minutes: Number(t.duration_minutes) || 15,
        order_index: idx,
        parent_task_id: idx > 0 ? `task_${now}_${idx - 1}` : null,
      }));
      const marksSum = mapped.reduce((s, x) => s + x.marks, 0);
      const durSum = mapped.reduce((s, x) => s + x.duration_minutes, 0);
      onTasksChange(mapped, { marks: marksSum, duration_minutes: durSum });
      toast.success(`Applied ${mapped.length} tasks to lab`);
    } else if (action.type === "append_task") {
      const additions = action.tasks.map((t, idx) => ({
        id: `task_${now}_${idx}`,
        title: t.title || `Task ${tasks.length + idx + 1}`,
        description: t.description || "",
        solution: t.solution || "",
        difficulty: t.difficulty || "MEDIUM",
        marks: Number(t.marks) || 20,
        duration_minutes: Number(t.duration_minutes) || 15,
        order_index: tasks.length + idx,
        parent_task_id: null,
      }));
      const nextTasks = [...tasks, ...additions];
      onTasksChange(nextTasks);
      toast.success(`Added ${additions.length} task${additions.length > 1 ? "s" : ""} to lab`);
    } else if (action.type === "update_task") {
      const targetIdx =
        typeof action.task_index === "number" && action.task_index >= 0 && action.task_index < tasks.length
          ? action.task_index
          : 0;
      const incoming = action.tasks[0];
      if (incoming && tasks[targetIdx]) {
        const nextTasks = [...tasks];
        nextTasks[targetIdx] = {
          ...nextTasks[targetIdx],
          title: incoming.title || nextTasks[targetIdx].title,
          description: incoming.description || nextTasks[targetIdx].description,
          solution: incoming.solution || nextTasks[targetIdx].solution,
          difficulty: incoming.difficulty || nextTasks[targetIdx].difficulty,
          marks: Number(incoming.marks) || nextTasks[targetIdx].marks,
          duration_minutes: Number(incoming.duration_minutes) || nextTasks[targetIdx].duration_minutes,
        };
        onTasksChange(nextTasks);
        toast.success(`Updated Task ${targetIdx + 1}`);
      }
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === turnId ? { ...m, applied: true } : m))
    );
  };

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || isSending) return;

    const userTurn: ChatTurn = {
      id: `user_${Date.now()}`,
      role: "user",
      content,
    };

    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    if (!textOverride) setInput("");
    setIsSending(true);

    try {
      const historyPayload = nextHistory
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await labTaskAIService.taskChat({
        lab_context: getLabContext(),
        current_tasks: tasks,
        messages: historyPayload.slice(0, -1),
        user_message: content,
        provider: "deepseek",
      });

      const assistantTurn: ChatTurn = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: res.reply,
        proposedAction: res.proposed_action,
        nextActions: res.next_actions,
        applied: false,
      };

      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err: any) {
      console.error("Task chat error", err);
      const errMsg = err?.response?.data?.error || err?.message || "Failed to reach AI Task Architect.";
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `I couldn't process that request (${errMsg}). Please try again.`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNextActionClick = (action: TaskChatNextAction) => {
    if (action.action === "next_step") {
      onProceedToScoring();
      return;
    }
    if (action.prompt) {
      sendMessage(action.prompt);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Chat reset. Tell me what tasks you'd like to design or refine, or select a suggested action below.",
      },
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT: CONVERSATIONAL AI TASK ARCHITECT */}
      <div className="lg:col-span-7 rounded-xl border border-border bg-card flex flex-col h-[640px] overflow-hidden">
        {/* Chat Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Task Architect</h3>
            <p className="text-xs text-muted-foreground">
              {repoInspection
                ? `Grounded in ${repoInspection.full_name} (${repoInspection.file_count} files scanned)`
                : labFormData.git_repo_starter_url
                ? `Using lab spec and repository context`
                : `Using lab title, description, and tech stack`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearChat}
            className="qb-action text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Reset chat
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((turn) => {
            const isUser = turn.role === "user";
            const hasProposal =
              !isUser &&
              turn.proposedAction &&
              turn.proposedAction.type !== "none" &&
              turn.proposedAction.tasks &&
              turn.proposedAction.tasks.length > 0;

            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-muted text-foreground"
                      : "border border-border bg-background text-foreground"
                  }`}
                >
                  <div className="text-[11px] font-medium text-muted-foreground mb-1">
                    {isUser ? "You" : "AI Architect"}
                  </div>
                  <div className="whitespace-pre-wrap">{turn.content}</div>

                  {/* Structured Proposed Tasks Preview Card */}
                  {hasProposal && turn.proposedAction && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          Proposed{" "}
                          {turn.proposedAction.type === "replace_tasks"
                            ? `${turn.proposedAction.tasks.length} tasks`
                            : turn.proposedAction.type === "append_task"
                            ? "new task"
                            : `update to Task ${(turn.proposedAction.task_index ?? 0) + 1}`}
                        </span>
                        <Button
                          type="button"
                          onClick={() => applyProposedAction(turn.id, turn.proposedAction!)}
                          className={
                            turn.applied
                              ? "h-8 px-3 text-xs border border-border bg-muted text-foreground hover:bg-muted/80"
                              : "rec-btn h-8 px-3 text-xs"
                          }
                        >
                          {turn.applied
                            ? "Applied (re-apply)"
                            : turn.proposedAction.label || "Apply to lab"}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {turn.proposedAction.tasks.map((t, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border bg-card/70 p-2.5 text-xs space-y-1"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-foreground">
                                {idx + 1}. {t.title}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {t.difficulty || "MEDIUM"} · {t.marks || 10} marks ·{" "}
                                {t.duration_minutes || 15} min
                              </span>
                            </div>
                            {t.description && (
                              <p className="text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                                {t.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-start">
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                Analyzing lab context and drafting recommendation…
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Next Action Suggestions Strip */}
        <div className="px-5 py-2.5 border-t border-border bg-background/60 space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">
            Suggested next actions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeNextActions.map((act, i) => (
              <button
                key={`${act.label}-${i}`}
                type="button"
                disabled={isSending}
                onClick={() => handleNextActionClick(act)}
                className={`rounded-full border px-3 py-1 text-xs transition cursor-pointer disabled:opacity-50 ${
                  act.action === "next_step"
                    ? "border-primary/60 bg-primary/10 text-foreground font-medium hover:bg-primary/20"
                    : "border-border bg-card text-foreground hover:border-foreground/40"
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Composer */}
        <div className="p-3.5 border-t border-border bg-card">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask AI to suggest tasks, standardize rough notes, adjust difficulty, or rebalance marks…"
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              onClick={() => sendMessage()}
              disabled={isSending || !input.trim()}
              className="rec-btn h-10 px-4 text-sm shrink-0"
            >
              {isSending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT: LIVE EDITABLE LAB TASKS PANEL */}
      <div className="lg:col-span-5 rounded-xl border border-border bg-card flex flex-col h-[640px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Lab Tasks ({tasks.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              {totalMarks} marks total · {totalDuration} min total
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onAddManualTask();
              setExpandedTaskIdx(tasks.length);
            }}
            className="qb-action text-xs font-medium text-foreground cursor-pointer"
          >
            + Add task
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">No tasks configured yet</p>
              <p className="text-xs text-muted-foreground">
                Use the AI Task Architect chat on the left to generate or draft tasks, or click{" "}
                <button
                  type="button"
                  onClick={() => {
                    onAddManualTask();
                    setExpandedTaskIdx(0);
                  }}
                  className="underline text-foreground cursor-pointer"
                >
                  + Add task
                </button>{" "}
                to write one manually.
              </p>
            </div>
          ) : (
            tasks.map((task: any, index: number) => {
              const isExpanded = expandedTaskIdx === index;
              return (
                <div
                  key={task.id || index}
                  className="rounded-lg border border-border bg-background p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => setExpandedTaskIdx(isExpanded ? null : index)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-foreground truncate">
                        Task {index + 1}: {task.title || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {task.difficulty || "EASY"} · {task.marks || 0} marks ·{" "}
                        {task.duration_minutes || 0} min
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedTaskIdx(isExpanded ? null : index)}
                        className="qb-action text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isExpanded ? "Done" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveTask(index)}
                        className="qb-action text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {!isExpanded && task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}

                  {/* Per-task AI shortcuts */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60 text-xs">
                    <button
                      type="button"
                      disabled={standardizingIndex === index}
                      onClick={() => onStandardizeTask(index)}
                      className="qb-action text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                    >
                      {standardizingIndex === index ? "Standardizing…" : "Standardize with AI"}
                    </button>
                    <button
                      type="button"
                      disabled={estimatingIndex === index}
                      onClick={() => onEstimateDuration(index)}
                      className="qb-action text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                    >
                      {estimatingIndex === index ? "Estimating…" : "Estimate duration"}
                    </button>
                  </div>

                  {/* Expanded Inline Editor */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Title *</label>
                        <input
                          value={task.title}
                          onChange={(e) => onUpdateTask(index, "title", e.target.value)}
                          placeholder="e.g. Implement GET /api/orders endpoint"
                          className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                        <textarea
                          rows={3}
                          value={task.description}
                          onChange={(e) => onUpdateTask(index, "description", e.target.value)}
                          placeholder="Task instructions and requirements..."
                          className="mt-1 w-full rounded-lg border border-input bg-card p-2.5 text-xs text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Reference Solution / Query
                        </label>
                        <textarea
                          rows={3}
                          value={getSolutionString(task.solution)}
                          onChange={(e) => onUpdateTask(index, "solution", e.target.value)}
                          placeholder="Code snippet or SQL query"
                          className="mt-1 w-full rounded-lg border border-input bg-card p-2.5 text-xs font-mono text-foreground"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                          <select
                            value={task.difficulty}
                            onChange={(e) => onUpdateTask(index, "difficulty", e.target.value)}
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Marks</label>
                          <input
                            type="number"
                            value={task.marks}
                            onChange={(e) =>
                              onUpdateTask(index, "marks", parseInt(e.target.value) || 0)
                            }
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Duration (min)
                          </label>
                          <input
                            type="number"
                            value={task.duration_minutes}
                            onChange={(e) =>
                              onUpdateTask(index, "duration_minutes", parseInt(e.target.value) || 0)
                            }
                            className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Linked Task / Dependency
                        </label>
                        <select
                          value={task.parent_task_id || task.parent_task || ""}
                          onChange={(e) =>
                            onUpdateTask(index, "parent_task_id", e.target.value || null)
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground"
                        >
                          <option value="">None (Independent task)</option>
                          {tasks.map((otherTask: any, otherIdx: number) => {
                            if (otherIdx === index) return null;
                            const otherId = otherTask.id || `task_idx_${otherIdx}`;
                            return (
                              <option key={otherId} value={otherId}>
                                Task {otherIdx + 1}: {otherTask.title || `Task ${otherIdx + 1}`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom quick CTA */}
        {tasks.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-background/60 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Ready to synthesize & test grading rules?
            </span>
            <button
              type="button"
              onClick={onProceedToScoring}
              className="qb-action text-xs font-medium text-foreground cursor-pointer"
            >
              Go to Step 5 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LabTasksChatStep;
