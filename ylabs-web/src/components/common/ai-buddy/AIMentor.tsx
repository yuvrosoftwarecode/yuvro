import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  Download,
  Lightbulb,
  Zap,
  Bug,
  MessageSquare,
  ArrowLeft,
  Mic,
  X,
  Clock,
  FileCode2,
  Play,
  Layers,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import useAIChat from "@/components/common/ai-buddy/useAIChat";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { WalletBalanceBadge } from "@/components/credits/WalletBalanceBadge";
import {
  applyDiffOrCode,
  parseMultiFileAgentResponse,
  isDiffContent,
  type ParsedFileChange,
} from "@/lib/diffApplier";
import { AgentReviewModal } from "@/components/common/ai-buddy/AgentReviewModal";

export type MentorMode = "ask" | "plan" | "agent" | "bugfix";

export const MENTOR_MODES: { id: MentorMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "ask", label: "Ask", icon: <MessageSquare size={11} />, desc: "General code assistance and diff patching" },
  { id: "plan", label: "Plan", icon: <Lightbulb size={11} />, desc: "Tasks & subtasks saved to .yuvro-developer/plan/" },
  { id: "agent", label: "Agent", icon: <Zap size={11} />, desc: "Auto-write code with multi-file review" },
  { id: "bugfix", label: "Bug Fix", icon: <Bug size={11} />, desc: "Diagnose & fix errors from console output" },
];

export interface PlanSubtask {
  id: string;
  number: string;
  text: string;
  done: boolean;
  status: "idle" | "running" | "completed" | "error";
  error?: string;
  sessionId?: string;
}

export interface PlanTask {
  id: string;
  number: string;
  title: string;
  done: boolean;
  status: "idle" | "running" | "completed" | "error";
  error?: string;
  sessionId?: string;
  subtasks: PlanSubtask[];
}

export function slugifyTask(text: string): string {
  return text
    .slice(0, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parsePlanStructure(content: string): PlanTask[] {
  const tasks: PlanTask[] = [];
  let currentTask: PlanTask | null = null;
  const lines = content.split("\n");

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("---") || trimmed.startsWith("# Implementation") || trimmed.startsWith("# Plan")) {
      continue;
    }

    const isIndented = rawLine.length - rawLine.trimStart().length >= 2;

    const subCheckbox = /^[-*]\s*\[([ xX])\]\s*(?:(\d+\.\d+|\w\.)\s*)?(.+)/.exec(trimmed);
    const subBullet = /^[-*]\s*(?:(\d+\.\d+|\w\.)\s*)?(.+)/.exec(trimmed);

    const taskHeader = /^#+\s+(?:Task\s*(\d+)[:.]?\s*)?(.+)/.exec(trimmed);
    const taskNum = /^(\d+)[\.:]\s+(.+)/.exec(trimmed);
    const taskCheckbox = /^[-*]\s*\[([ xX])\]\s*(?:Task\s*(\d+)[:.]?\s*)?(.+)/.exec(trimmed);

    if ((isIndented || (subCheckbox && currentTask)) && currentTask) {
      if (subCheckbox) {
        const done = subCheckbox[1].toLowerCase() === "x";
        const num = subCheckbox[2] || `${currentTask.number}.${currentTask.subtasks.length + 1}`;
        const text = subCheckbox[3].trim();
        currentTask.subtasks.push({
          id: slugifyTask(text),
          number: num,
          text,
          done,
          status: done ? "completed" : "idle",
        });
      } else if (subBullet) {
        const num = subBullet[1] || `${currentTask.number}.${currentTask.subtasks.length + 1}`;
        const text = subBullet[2].trim();
        currentTask.subtasks.push({
          id: slugifyTask(text),
          number: num,
          text,
          done: false,
          status: "idle",
        });
      }
    } else if (taskHeader) {
      const num = taskHeader[1] || `${tasks.length + 1}`;
      const title = taskHeader[2].replace(/^Task\s*\d+[:.]?\s*/i, "").trim();
      currentTask = {
        id: slugifyTask(title),
        number: num,
        title,
        done: false,
        status: "idle",
        subtasks: [],
      };
      tasks.push(currentTask);
    } else if (taskNum && !isIndented) {
      const num = taskNum[1];
      const title = taskNum[2].replace(/^Task\s*\d+[:.]?\s*/i, "").trim();
      currentTask = {
        id: slugifyTask(title),
        number: num,
        title,
        done: false,
        status: "idle",
        subtasks: [],
      };
      tasks.push(currentTask);
    } else if (taskCheckbox && !isIndented) {
      const done = taskCheckbox[1].toLowerCase() === "x";
      const num = taskCheckbox[2] || `${tasks.length + 1}`;
      const title = taskCheckbox[3].replace(/^Task\s*\d+[:.]?\s*/i, "").trim();
      currentTask = {
        id: slugifyTask(title),
        number: num,
        title,
        done,
        status: done ? "completed" : "idle",
        subtasks: [],
      };
      tasks.push(currentTask);
    }
  }

  // Fallback: If no tasks were parsed by header or structure, parse line-by-line
  if (tasks.length === 0) {
    let fallbackIdx = 1;
    for (const line of lines) {
      const t = line.trim();
      const done = /^-\s*\[x\]\s+(.+)/i.exec(t);
      const undone = /^-\s*\[\s*\]\s+(.+)/i.exec(t);
      const numbered = /^(\d+)[.)]\s+(.+)/.exec(t);
      if (done) {
        const text = done[1].trim();
        tasks.push({
          id: slugifyTask(text),
          number: `${fallbackIdx++}`,
          title: text,
          done: true,
          status: "completed",
          subtasks: [],
        });
      } else if (undone) {
        const text = undone[1].trim();
        tasks.push({
          id: slugifyTask(text),
          number: `${fallbackIdx++}`,
          title: text,
          done: false,
          status: "idle",
          subtasks: [],
        });
      } else if (numbered) {
        const text = numbered[2].trim();
        tasks.push({
          id: slugifyTask(text),
          number: numbered[1] || `${fallbackIdx++}`,
          title: text,
          done: false,
          status: "idle",
          subtasks: [],
        });
      }
    }
  }

  return tasks;
}

export function buildPlanMarkdown(title: string, tasks: PlanTask[]): string {
  const lines: string[] = [
    `# Implementation Plan: ${title}`,
    ``,
    `*Created: ${new Date().toLocaleString()}*`,
    `*Mode: Yuvro AI Mentor Plan*`,
    ``,
    `## Tasks & Subtasks`,
    ``,
  ];

  for (const task of tasks) {
    const isDone = task.done || (task.subtasks.length > 0 && task.subtasks.every((s) => s.done));
    lines.push(`- [${isDone ? "x" : " "}] Task ${task.number}: ${task.title}`);
    if (task.subtasks.length > 0) {
      for (const sub of task.subtasks) {
        lines.push(`  - [${sub.done ? "x" : " "}] ${sub.number} ${sub.text}`);
      }
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Tip: Click "Start task" or "Start subtask" to execute with AI Agent.*`);
  return lines.join("\n");
}

const STORAGE_MODE_AGENTS_KEY = "yuvro_ai_mentor_mode_models";

export interface AIMentorProps {
  contextGetter: () => string;
  chatTitle?: string;
  persistenceKey?: string;
  activeFile?: string;
  tasks?: any[];
  evalResult?: Record<string, { passed: boolean; reason: string }>;
  consoleOutput?: string;
  files?: Record<string, string>;
  onApplyCode?: (code: string, targetFile?: string) => void;
  onApplyFiles?: (files: Record<string, string>) => void;
  onSaveFile?: (filePath: string, content: string) => void;
  onOpenFile?: (filePath: string) => void;
  onClose?: () => void;
  taskStatuses?: Record<string, { status: "idle" | "running" | "completed" | "error"; sessionId?: string; message?: string }>;
  onTaskStatusesChange?: React.Dispatch<React.SetStateAction<Record<string, { status: "idle" | "running" | "completed" | "error"; sessionId?: string; message?: string }>>>;
  activeSessionId?: string | null;
}

export function AIMentor({
  contextGetter,
  chatTitle,
  persistenceKey,
  activeFile,
  tasks,
  evalResult,
  consoleOutput,
  files = {},
  onApplyCode,
  onApplyFiles,
  onSaveFile,
  onOpenFile,
  onClose,
  taskStatuses: externalTaskStatuses,
  onTaskStatusesChange: externalSetTaskStatuses,
  activeSessionId,
}: AIMentorProps) {
  const [mentorMode, setMentorMode] = useState<MentorMode>("ask");

  // Model selection per mode (Ask, Plan, Agent, Bug Fix)
  const [modeAgents, setModeAgents] = useState<Record<MentorMode, string | null>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_MODE_AGENTS_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      ask: null,
      plan: null,
      agent: null,
      bugfix: null,
    };
  });

  const handleSetModeAgent = (mode: MentorMode, agentId: string) => {
    setModeAgents((prev) => {
      const updated = { ...prev, [mode]: agentId };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_MODE_AGENTS_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const [showHistory, setShowHistory] = useState(false);
  const [planTasks, setPlanTasks] = useState<PlanTask[]>([]);
  const [internalTaskStatuses, setInternalTaskStatuses] = useState<
    Record<string, { status: "idle" | "running" | "completed" | "error"; sessionId?: string; message?: string }>
  >({});

  const taskStatuses = externalTaskStatuses || internalTaskStatuses;
  const setTaskStatuses = externalSetTaskStatuses || setInternalTaskStatuses;

  const [activePlanFilePath, setActivePlanFilePath] = useState<string | null>(null);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewChanges, setReviewChanges] = useState<ParsedFileChange[]>([]);
  const [reviewExplanation, setReviewExplanation] = useState<string>("");

  const autoAppliedRef = useRef<Set<string>>(new Set());
  const processedPlanRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [useVoice, setUseVoice] = useState(false);

  // Compute ticket task completion if running in ticket context
  const ticketTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks
      .filter((t: any) => {
        const title = typeof t === "string" ? t : (t?.title ?? "");
        return !title.toLowerCase().includes("hidden") && t?.is_hidden !== true;
      })
      .map((t: any, idx: number) => {
        const slug = t?.task_slug || `task-${idx}`;
        const result = evalResult && (evalResult[slug] || evalResult[`task${idx + 1}`] || evalResult[`task-${idx}`]);
        return { slug, title: typeof t === "string" ? t : (t?.title ?? `Task ${idx + 1}`), passed: result ? result.passed : null };
      });
  }, [tasks, evalResult]);

  const hasAnyEval = ticketTasks.some((t) => t.passed !== null);

  // Minimal tasks & subtasks prompt for Plan mode; console output ONLY for Bug Fix mode
  const getModeContext = useCallback((mode: MentorMode) => {
    const base = contextGetter ? contextGetter() : "";
    const filePaths = activeFile ? `\nCurrent active file: ${activeFile}` : "";

    const failedTasks = ticketTasks.filter((t) => t.passed === false);
    const failureContext = failedTasks.length > 0
      ? `\n\nFailed Tasks / Tests:\n` + failedTasks.map((t) => {
          const reason = evalResult && (evalResult[t.slug]?.reason || evalResult[`task${t.slug}`]?.reason);
          return `- Task: "${t.title}" (FAILED)${reason ? ` - Error: ${reason}` : ""}`;
        }).join("\n")
      : "";

    const consoleContext = consoleOutput
      ? `\n\n[EDITOR CONSOLE OUTPUT / RECENT ERRORS]:\n${consoleOutput.length > 5000 ? consoleOutput.slice(-5000) : consoleOutput}`
      : "";

    switch (mode) {
      case "plan":
        return `${base}${filePaths}\n\n[MODE: PLAN]\n` +
          `Generate a MINIMAL, tightly focused implementation plan with ONLY the essential tasks and subtasks needed to accomplish the goal.\n` +
          `Rules:\n` +
          `1. MINIMAL TASKS: Generate only 2 to 4 high-leverage main tasks (e.g. "## Task 1: ...", "## Task 2: ..."). Avoid fluff, boilerplate explanations, or excessive steps.\n` +
          `2. MINIMAL SUBTASKS: Under each task, list only 2 to 3 concise, atomic subtasks as checkboxes (e.g. "- [ ] 1.1 ...", "- [ ] 1.2 ...").\n` +
          `3. OUTPUT FORMAT: Output ONLY the tasks and subtasks markdown checklist without chatty introductions or conversational filler.\n` +
          `4. Keep each item actionable and self-contained so the developer or agent can execute it directly.\n` +
          `Do NOT write full code implementations yet.`;
      case "bugfix":
        return `${base}${filePaths}${failureContext}${consoleContext}\n\n[MODE: BUG FIX]\nYou are a debugging expert. Analyze the current code, the Editor Console Output, and any failed tasks. Identify the exact root cause of any error or test failure, explain why it happened, and provide the corrected code in markdown code blocks to fix it.`;
      case "agent":
        return `${base}${filePaths}${failureContext}\n\n[MODE: AGENT]\nImplement the COMPLETE solution. If modifying multiple files, clearly specify each file with \`\`\`python file="path/filename"\`\`\` or \`File: filename\`.\nOutput rules:\n1. Output complete file content in code blocks\n2. Implement all functionality without placeholders\n3. Write a concise 1-sentence summary before code.`;
      default:
        return `${base}${filePaths}${failureContext}\n\n[MODE: ASK]\nYou are an AI code mentor. Give Socratic hints, guide step-by-step, explain concepts, and help the user think through requirements. If providing diffs, use SEARCH/REPLACE format or clear code blocks for the active file.`;
    }
  }, [contextGetter, activeFile, ticketTasks, evalResult, consoleOutput]);

  const {
    messages,
    isLoading,
    sendMessage,
    suggestedPrompts,
    activeStream,
    startNewChat,
    sessionHistory,
    fetchHistory,
    loadSession,
    agents,
  } = useAIChat({
    getContext: () => getModeContext(mentorMode),
    chatTitle,
    persistenceKey,
  });

  // Determine current active agent for the current mentor mode
  const currentSelectedAgentId = useMemo(() => {
    if (modeAgents[mentorMode]) return modeAgents[mentorMode];
    if (agents.length === 0) return null;
    if (mentorMode === "agent" || mentorMode === "plan") {
      const best =
        agents.find((a) => a.name.toLowerCase().includes("claude") || a.name.toLowerCase().includes("sonnet")) ||
        agents.find((a) => a.provider === "deepseek" && a.model_name === "deepseek-chat") ||
        agents[0];
      return best?.id || null;
    }
    const defaultAgent =
      agents.find((a) => a.provider === "deepseek" && a.model_name === "deepseek-chat") || agents[0];
    return defaultAgent?.id || null;
  }, [modeAgents, mentorMode, agents]);

  const activeAgent = useMemo(() => {
    return agents.find((a) => a.id === currentSelectedAgentId) || agents[0] || null;
  }, [agents, currentSelectedAgentId]);

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    if (modelDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [modelDropdownOpen]);

  useEffect(() => {
    if (activeSessionId) {
      loadSession(activeSessionId);
    }
  }, [activeSessionId, loadSession]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeStream, isLoading]);

  // Autopilot: auto-apply completed code in Agent mode if single file
  useEffect(() => {
    if (mentorMode !== "agent" || (!onApplyCode && !onApplyFiles)) return;
    const done = messages.filter((m: any) => m.message_type === "assistant" && m.content?.trim());
    const latest = done[done.length - 1];
    if (!latest) return;
    if (activeStream && activeStream.id === latest.id) return;
    if (autoAppliedRef.current.has(latest.id)) return;

    const { files: parsedFiles, hasCode } = parseMultiFileAgentResponse(latest.content, activeFile, files);
    if (hasCode) {
      autoAppliedRef.current.add(latest.id);
      if (parsedFiles.length === 1 && onApplyCode) {
        onApplyCode(parsedFiles[0].code, parsedFiles[0].path);
      } else if (parsedFiles.length > 1 && onApplyFiles) {
        const fileMap: Record<string, string> = {};
        for (const f of parsedFiles) fileMap[f.path] = f.code;
        onApplyFiles(fileMap);
      }
    }
  }, [messages, activeStream, mentorMode, onApplyCode, onApplyFiles, activeFile, files]);

  // Plan Mode: Parse tasks & subtasks, and persist to .yuvro-developer/plan/plan-{title}.md
  useEffect(() => {
    if (mentorMode !== "plan") return;
    const done = messages.filter((m: any) => m.message_type === "assistant" && m.content);
    const latest = done[done.length - 1];
    if (!latest || (activeStream && activeStream.id === latest.id)) return;

    const parsed = parsePlanStructure(latest.content);
    if (parsed.length > 0) {
      setPlanTasks(parsed);

      if (!processedPlanRef.current.has(latest.id)) {
        processedPlanRef.current.add(latest.id);

        const rawTitle = chatTitle || "task";
        const slugTitle =
          rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "plan";
        const filePath = activePlanFilePath || `.yuvro-developer/plan/plan-${slugTitle}.md`;
        setActivePlanFilePath(filePath);

        const planMarkdown = buildPlanMarkdown(chatTitle || "Implementation Plan", parsed);
        if (onSaveFile) {
          onSaveFile(filePath, planMarkdown);
        }
      }
    }
  }, [messages, activeStream, mentorMode, chatTitle, activePlanFilePath, onSaveFile]);

  // View particular AI session on any task or subtask
  const handleViewSession = useCallback((sessionId?: string | null) => {
    if (sessionId) {
      loadSession(sessionId);
      setShowHistory(false);
      setMentorMode("agent");
    }
  }, [loadSession]);

  // Toggle task or subtask checkbox manually
  const handleToggleTask = (taskId: string, subtaskId?: string) => {
    setPlanTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== taskId) return t;
        if (subtaskId !== undefined) {
          const updatedSubs = t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
          const allSubsDone = updatedSubs.every((s) => s.done);
          return { ...t, subtasks: updatedSubs, done: allSubsDone };
        } else {
          const newDone = !t.done;
          return {
            ...t,
            done: newDone,
            subtasks: t.subtasks.map((s) => ({ ...s, done: newDone })),
          };
        }
      });

      if (activePlanFilePath && onSaveFile) {
        const md = buildPlanMarkdown(chatTitle || "Implementation Plan", updated);
        onSaveFile(activePlanFilePath, md);
      }
      return updated;
    });
  };

  // Start Task or Subtask:
  // - Main task: Creates NEW session named after the task.
  // - Subtask: Executes WITHIN the parent task's session unless a fresh session is created.
  const handleStartTask = async (task: PlanTask, subtask?: PlanSubtask) => {
    const targetId = subtask ? subtask.id : task.id;
    const targetTitle = subtask
      ? `${task.number}.${subtask.number}: ${subtask.text}`
      : `Task ${task.number}: ${task.title}`;

    // Mark task/subtask as running (enabling parallel execution)
    setTaskStatuses((prev) => ({
      ...prev,
      [targetId]: { status: "running" },
    }));

    try {
      let sessionId: string | null = null;
      // Subtasks execute within the parent task's session
      if (subtask && (task.sessionId || taskStatuses[task.id]?.sessionId)) {
        sessionId = task.sessionId || taskStatuses[task.id]?.sessionId || null;
      }

      if (!sessionId) {
        // Create new session: session name should be task name!
        const sessionTitle = task.title ? (task.title.startsWith("Task") ? task.title : `Task ${task.number}: ${task.title}`) : `Task ${task.number}`;
        try {
          const sessionResp = await yhubApiAuthUtil.post<{ id: string }>("/sessions/", {
            title: sessionTitle,
            ai_agent_id: currentSelectedAgentId,
            page_content: getModeContext("agent"),
          });
          if (sessionResp?.id) {
            sessionId = sessionResp.id;
            task.sessionId = sessionId;
            setTaskStatuses((prev) => {
              const prevTask = prev[task.id] || { status: "idle" as const };
              return {
                ...prev,
                [task.id]: { ...prevTask, sessionId: sessionId || prevTask.sessionId },
              };
            });
          }
        } catch (e) {
          console.warn("Could not create dedicated task session", e);
        }
      }

      const baseUrl =
        import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL ||
        import.meta.env.VITE_BACKEND_API_BASE_URL ||
        "/api";
      const endpoint = sessionId
        ? `${baseUrl}/sessions/${sessionId}/send_message/`
        : `${baseUrl}/chat/quick_chat/`;

      const token = yhubApiAuthUtil.getAuthToken();
      const promptMessage = subtask
        ? `Implement Subtask ${subtask.number}: "${subtask.text}" for Task "${task.title}".\n\nOutput complete code in code blocks.`
        : `Implement Task ${task.number}: "${task.title}".\n${task.subtasks.length > 0 ? "Subtasks:\n" + task.subtasks.map((s) => `- ${s.number}: ${s.text}`).join("\n") : ""}\n\nWrite the complete implementation. Output code in code blocks.`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: promptMessage,
          page_content: getModeContext("agent"),
          stream: true,
          ai_agent_id: currentSelectedAgentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Execution request failed: ${response.statusText}`);
      }

      // Stream SSE response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5).trim());
                const delta = data.delta || data.text || data.content || "";
                fullContent += delta;
              } catch {}
            }
          }
        }
      }

      // Parse multi-file changes and apply
      const { files: parsedFiles, hasCode } = parseMultiFileAgentResponse(fullContent, activeFile, files);
      if (hasCode) {
        if (parsedFiles.length === 1 && onApplyCode) {
          onApplyCode(parsedFiles[0].code, parsedFiles[0].path);
        } else if (onApplyFiles) {
          const fileMap: Record<string, string> = {};
          for (const f of parsedFiles) fileMap[f.path] = f.code;
          onApplyFiles(fileMap);
        }
      }

      // Mark completed with sessionId so user can "View session"
      setTaskStatuses((prev) => {
        const prevTask = prev[task.id] || { status: "idle" as const };
        return {
          ...prev,
          [targetId]: { status: "completed" as const, sessionId: sessionId || undefined },
          [task.id]: { ...prevTask, sessionId: sessionId || prevTask.sessionId },
        };
      });

      // Update plan markdown checkbox
      setPlanTasks((prevTasks) => {
        const updated = prevTasks.map((t) => {
          if (subtask && t.id === task.id) {
            const updatedSubs = t.subtasks.map((s) =>
              s.id === subtask.id ? { ...s, done: true, status: "completed" as const, sessionId: sessionId || undefined } : s
            );
            const allSubsDone = updatedSubs.every((s) => s.done);
            return {
              ...t,
              subtasks: updatedSubs,
              done: allSubsDone,
              status: (allSubsDone ? "completed" : t.status) as any,
              sessionId: sessionId || t.sessionId,
            };
          } else if (!subtask && t.id === task.id) {
            return {
              ...t,
              done: true,
              status: "completed" as const,
              sessionId: sessionId || undefined,
              subtasks: t.subtasks.map((s) => ({ ...s, done: true, status: "completed" as const, sessionId: sessionId || undefined })),
            };
          }
          return t;
        });

        if (activePlanFilePath && onSaveFile) {
          const md = buildPlanMarkdown(chatTitle || "Implementation Plan", updated);
          onSaveFile(activePlanFilePath, md);
        }
        return updated;
      });
    } catch (err: any) {
      console.error("Task execution error", err);
      setTaskStatuses((prev) => ({
        ...prev,
        [targetId]: { status: "error", message: err.message || "Execution error" },
      }));
    }
  };

  const handleStartNewChat = () => {
    setShowHistory(false);
    startNewChat();
    // User explicitly created new session: clear active plan task session linkages
    setPlanTasks((prev) =>
      prev.map((t) => ({
        ...t,
        sessionId: undefined,
        subtasks: t.subtasks.map((s) => ({ ...s, sessionId: undefined })),
      }))
    );
  };

  const send = (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || isLoading) return;
    if (!text) setInput("");
    sendMessage(msg);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Ask Mode: Apply Diff or Code
  const handleApplyDiffOrCode = (code: string, id: string, targetFile?: string) => {
    const fileToPatch = targetFile || activeFile;
    if (!fileToPatch || !onApplyCode) return;

    const originalContent = files[fileToPatch] || "";
    const patchResult = applyDiffOrCode(originalContent, code);

    onApplyCode(patchResult.result, fileToPatch);
    setAppliedId(id);
    setTimeout(() => setAppliedId(null), 2500);
  };

  const renderMessage = (m: { id: string; message_type: string; content: string }, i: number) => {
    const isUser = m.message_type === "user";
    const isStreaming = !!(activeStream && activeStream.id === m.id);
    const displayContent = isStreaming ? activeStream!.content : m.content;

    // Plan Mode: Show ONLY tasks in chat window response and show plan md file generated
    if (!isUser && mentorMode === "plan") {
      const parsed = parsePlanStructure(displayContent);
      const isCardStreaming = isStreaming;

      if (parsed.length > 0 || isCardStreaming) {
        const rawTitle = chatTitle || "task";
        const slugTitle =
          rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "plan";
        const planFilePath = activePlanFilePath || `.yuvro-developer/plan/plan-${slugTitle}.md`;

        return (
          <div key={i} className="w-full space-y-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3 text-left shadow-xs">
              {/* Header with Generated Plan File */}
              <div className="flex items-center justify-between pb-2 border-b border-primary/10">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 font-bold shrink-0">
                    <Lightbulb size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12.5px] font-semibold text-foreground">
                        Implementation Plan
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {isCardStreaming ? "Generating..." : "Saved"}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <FileCode2 size={10} className="shrink-0" />
                      <span className="truncate">{planFilePath}</span>
                    </div>
                  </div>
                </div>

                {onOpenFile && (
                  <button
                    type="button"
                    onClick={() => onOpenFile(planFilePath)}
                    className="shrink-0 px-2 py-1 rounded-md text-[10.5px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1 transition-all cursor-pointer"
                    title="Open plan in editor"
                  >
                    <span>Open file</span>
                    <ArrowLeft size={10} className="rotate-180" />
                  </button>
                )}
              </div>

              {/* Only Tasks and Subtasks shown */}
              <div className="space-y-2.5">
                {parsed.map((task) => {
                  const taskStatus = taskStatuses[task.id]?.status || (task.done ? "completed" : "idle");
                  const isTaskRunning = taskStatus === "running";
                  const isTaskDone = task.done || taskStatus === "completed";
                  const taskSessionId = taskStatuses[task.id]?.sessionId || task.sessionId;

                  return (
                    <div
                      key={task.id}
                      className="rounded-lg bg-background/80 border border-border/60 p-2 space-y-2 transition-all shadow-xs"
                    >
                      {/* Main Task Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-start gap-2 cursor-pointer flex-1 min-w-0"
                          onClick={() => handleToggleTask(task.id)}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isTaskDone ? "bg-primary border-primary" : "border-border hover:border-primary/60"}`}>
                            {isTaskDone && <Check size={9} className="text-primary-foreground" />}
                          </div>
                          <span className={`text-[12px] leading-tight ${isTaskDone ? "line-through text-muted-foreground" : "text-foreground font-semibold"}`}>
                            {task.number}. {task.title}
                          </span>
                        </div>

                        {/* Task Level Action */}
                        <div className="shrink-0 flex items-center gap-1">
                          {isTaskRunning ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 shadow-xs">
                              <Loader2 size={10} className="animate-spin" />
                              <span>Running task...</span>
                            </span>
                          ) : isTaskDone ? (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-0.5 shadow-xs">
                                <Check size={10} />
                                <span>Done</span>
                              </span>
                              {taskSessionId && (
                                <button
                                  type="button"
                                  onClick={() => handleViewSession(taskSessionId)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-0.5 cursor-pointer"
                                  title="View session"
                                >
                                  <Clock size={10} />
                                  <span>View session</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartTask(task)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Trigger start task at task level"
                            >
                              <Play size={9} />
                              <span>Start task</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subtasks (if any) */}
                      {task.subtasks.length > 0 && (
                        <div className="pl-4 space-y-1.5 border-l-2 border-muted ml-2">
                          {task.subtasks.map((sub) => {
                            const subStatus = taskStatuses[sub.id]?.status || (sub.done ? "completed" : "idle");
                            const isSubRunning = subStatus === "running";
                            const isSubDone = sub.done || subStatus === "completed";
                            const subSessionId = taskStatuses[sub.id]?.sessionId || sub.sessionId;

                            return (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between gap-2 p-1 rounded hover:bg-muted/30 transition-colors"
                              >
                                <div
                                  className="flex items-start gap-1.5 cursor-pointer flex-1 min-w-0"
                                  onClick={() => handleToggleTask(task.id, sub.id)}
                                >
                                  <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSubDone ? "bg-primary/80 border-primary" : "border-border"}`}>
                                    {isSubDone && <Check size={8} className="text-primary-foreground" />}
                                  </div>
                                  <span className={`text-[11px] leading-tight ${isSubDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    <span className="font-mono text-[10px] text-muted-foreground mr-1">{sub.number}</span>
                                    {sub.text}
                                  </span>
                                </div>

                                <div className="shrink-0 flex items-center gap-1">
                                  {isSubRunning ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                      <Loader2 size={9} className="animate-spin" />
                                      <span>Running subtask...</span>
                                    </span>
                                  ) : isSubDone ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9.5px] text-emerald-500 font-medium flex items-center gap-0.5">
                                        <Check size={9} />
                                        <span>Done</span>
                                      </span>
                                      {subSessionId && (
                                        <button
                                          type="button"
                                          onClick={() => handleViewSession(subSessionId)}
                                          className="text-[9.5px] text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-0.5 cursor-pointer"
                                          title="View session"
                                        >
                                          <Clock size={9} />
                                          <span>View session</span>
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleStartTask(task, sub)}
                                      className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-muted hover:bg-primary hover:text-primary-foreground text-foreground border border-border transition-all flex items-center gap-0.5 cursor-pointer"
                                      title="Trigger start subtask at subtask level"
                                    >
                                      <Play size={8} />
                                      <span>Start subtask</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isCardStreaming && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary pt-1">
                  <Loader2 size={11} className="animate-spin" />
                  <span>Generating minimal tasks & subtasks...</span>
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    // Agent mode: Multi-file review card
    if (!isUser && mentorMode === "agent" && !isStreaming) {
      const { files: parsedFiles, explanation, hasCode } = parseMultiFileAgentResponse(displayContent, activeFile, files);

      if (hasCode) {
        return (
          <div key={i} className="w-full space-y-2">
            <div className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-xs p-3.5 text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[12.5px] font-semibold text-foreground">
                      {parsedFiles.length === 1 ? `Updated ${parsedFiles[0].path}` : `Generated ${parsedFiles.length} Files`}
                    </span>
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Ready
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewChanges(parsedFiles);
                      setReviewExplanation(explanation);
                      setReviewModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Layers size={11} />
                    <span>Review ({parsedFiles.length})</span>
                  </button>
                </div>
              </div>

              <div className="text-[12px] text-muted-foreground leading-relaxed">
                {explanation}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedFiles.map((f) => (
                  <span
                    key={f.path}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-muted border border-border/60 text-foreground"
                  >
                    <FileCode2 size={10} className="text-muted-foreground" />
                    {f.path}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }
    }

    return (
      <div key={i} className={`flex items-end gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`max-w-[92%] text-[12.5px] leading-relaxed ${isUser ? "bg-primary text-primary-foreground px-3 py-2 rounded-xl rounded-br-sm shadow-sm" : "bg-muted/50 text-foreground px-3 py-2.5 rounded-xl rounded-bl-sm border border-border/40"}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{m.content}</div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    const codeId = `msg-${i}-${codeString.slice(0, 8)}`;
                    const isDiff = isDiffContent(codeString);

                    if (inline) {
                      return <code className="bg-primary/10 text-primary px-1 py-0.5 rounded font-mono text-[10.5px]" {...props}>{children}</code>;
                    }

                    return (
                      <div className="relative group/code rounded-md overflow-hidden my-2 border border-border/60 bg-[#1e1e1e]">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-widest">{match?.[1] || "code"}</span>
                            {isDiff && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">Diff</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopy(codeString, codeId)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 flex items-center gap-1 text-[10px] transition-all cursor-pointer"
                              title="Copy"
                            >
                              {copiedId === codeId ? <><Check size={10} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy size={10} /><span>Copy</span></>}
                            </button>
                            {onApplyCode && (
                              <button
                                onClick={() => handleApplyDiffOrCode(codeString, codeId, activeFile)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                  appliedId === codeId
                                    ? "bg-emerald-600 text-white"
                                    : "bg-primary text-primary-foreground hover:opacity-80"
                                }`}
                                title={isDiff ? "Apply Diff Changes" : `Apply to ${activeFile || "file"}`}
                              >
                                {appliedId === codeId ? (
                                  <><Check size={10} /><span>Applied ✓</span></>
                                ) : (
                                  <><Download size={10} /><span>{isDiff ? "Apply Diff" : "Apply"}</span></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-gray-100 whitespace-pre"><code>{codeString}</code></pre>
                      </div>
                    );
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentMode = MENTOR_MODES.find((m) => m.id === mentorMode)!;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[13px] font-semibold text-foreground">AI Mentor</span>
          <WalletBalanceBadge />
        </div>

        {/* Model Selector per mode */}
        <div ref={modelDropdownRef} className="relative flex-1 min-w-0 max-w-[190px]">
          <button
            type="button"
            onClick={() => setModelDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all cursor-pointer shadow-2xs"
            title={`Configured model for ${currentMode.label} mode: ${activeAgent?.name || "Auto"}`}
          >
            <div className="flex items-center gap-1 min-w-0 truncate">
              <span className="text-primary shrink-0">{currentMode.icon}</span>
              <span className="font-semibold text-muted-foreground text-[10px] shrink-0">{currentMode.label}:</span>
              <span className="truncate">{activeAgent?.name?.replace(/\(.*\)/, "") || "Model"}</span>
            </div>
            <ChevronDown size={10} className={`text-muted-foreground shrink-0 transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {modelDropdownOpen && (
            <div className="absolute right-0 mt-1 w-64 rounded-xl bg-popover/95 backdrop-blur-md border border-border shadow-2xl z-50 p-2 space-y-2 animate-in fade-in-50 zoom-in-95">
              {/* Mode Selector Tabs inside Dropdown */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Configure Model for Mode:
                </div>
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted/70 rounded-lg">
                  {MENTOR_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMentorMode(m.id)}
                      className={`py-1 px-1 rounded text-[10px] font-medium flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                        mentorMode === m.id
                          ? "bg-background text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model List for currently selected mode */}
              <div className="space-y-1 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px] px-1 text-muted-foreground">
                  <span>Available Models for <strong className="text-foreground">{currentMode.label}</strong>:</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5" style={{ scrollbarWidth: "thin" }}>
                  {agents.map((ag) => {
                    const isSelected = ag.id === (activeAgent?.id);
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => {
                          handleSetModeAgent(mentorMode, ag.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors text-left cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-1.5">
                          <div className="truncate font-medium">{ag.name}</div>
                          {(ag.provider || ag.model_name) && (
                            <div className={`text-[9.5px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {ag.provider ? `${ag.provider} · ` : ""}{ag.model_name || ""}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check size={12} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleStartNewChat}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-bold cursor-pointer"
            title="New chat"
          >
            +
          </button>
          <button
            onClick={() => {
              if (!showHistory) fetchHistory();
              setShowHistory(!showHistory);
            }}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${showHistory ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title="Chat history"
          >
            <Clock size={13} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* History or Chat Content */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {sessionHistory.length === 0 ? (
            <div className="text-[12px] text-muted-foreground italic text-center pt-6">No past chats yet.</div>
          ) : (
            sessionHistory.map((session: any) => (
              <button
                key={session.id}
                onClick={() => {
                  loadSession(session.id);
                  setShowHistory(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-accent transition-all group cursor-pointer"
              >
                <div className="text-[12px] font-medium text-foreground truncate group-hover:text-primary">
                  {session.title || "Chat"}
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                  <span>{new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="bg-muted px-1.5 py-0.5 rounded-full">{session.message_count || 0} msgs</span>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Messages container */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5" style={{ scrollBehavior: "auto" }}>
            
            {/* Task completion tracker for tickets */}
            {ticketTasks.length > 0 && hasAnyEval && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5 mb-1">
                {ticketTasks.map((t, idx) => (
                  <div key={t.slug} className="flex items-start gap-2">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${t.passed === true ? "bg-emerald-500/20 text-emerald-500" : t.passed === false ? "bg-red-400/20 text-red-400" : "bg-muted text-muted-foreground"}`}>
                      {t.passed === true ? <Check size={9} /> : t.passed === false ? <X size={9} /> : idx + 1}
                    </div>
                    <span className={`text-[11px] leading-tight ${t.passed === true ? "text-emerald-600 dark:text-emerald-400 line-through" : t.passed === false ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>{t.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state per mode */}
            {messages.length === 0 && !activeStream && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none px-4 pt-4">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{currentMode.label}</p>
                  <p className="text-[11.5px] text-muted-foreground max-w-[210px] leading-relaxed mt-1">{currentMode.desc}</p>
                </div>

                {mentorMode === "plan" && (
                  <button
                    onClick={() => send("Create a minimal, focused step-by-step implementation plan with 2-4 essential tasks and concise subtasks.")}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Lightbulb size={12} /> Generate Minimal Plan in .yuvro-developer/plan/
                  </button>
                )}

                {mentorMode === "agent" && (
                  <button
                    onClick={() => send(`Write the complete implementation for ${activeFile || "the project"} to pass all requirements.`)}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Zap size={12} /> Generate Solution & Review
                  </button>
                )}

                {mentorMode === "bugfix" && (
                  <div className="flex flex-col items-center gap-2.5 w-full">
                    {consoleOutput && (
                      <div className="w-full max-w-[290px] rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-left shadow-xs">
                        <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                          <Bug size={11} /> Editor Console Output Detected
                        </div>
                        <p className="text-[9.5px] text-muted-foreground line-clamp-3 font-mono">
                          {consoleOutput.split("\n").filter(Boolean).slice(-3).join("\n")}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => send(consoleOutput ? "Analyze the Editor console output and fix the error in my code." : "Analyze the current code and any task failures, identify all bugs, and provide the fixed code.")}
                      className="px-3.5 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Bug size={12} /> Diagnose & Fix Errors
                    </button>
                  </div>
                )}

                {mentorMode === "ask" && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {(suggestedPrompts.length > 0 ? suggestedPrompts.slice(0, 3) : ["How do I start?", "Explain requirements", "Review my approach"]).map((s: string) => (
                      <button
                        key={s}
                        onClick={() => !isLoading && sendMessage(s)}
                        disabled={isLoading}
                        className="px-2.5 py-1 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message list */}
            {messages.filter((m: any) => !(m.message_type === "assistant" && !m.content && isLoading && !(activeStream?.id === m.id))).map(renderMessage)}

            {/* Loading */}
            {isLoading && !activeStream && (
              <div className="flex items-end gap-1.5">
                <div className="bg-muted/50 text-muted-foreground px-3 py-2.5 rounded-xl rounded-bl-sm border border-border/40 flex items-center gap-2 text-[12px]">
                  <div className="flex gap-0.5">
                    {[0, 120, 240].map((d) => (
                      <span key={d} className="w-1 h-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-[11.5px] font-medium">Thinking & analyzing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="px-3 pb-3 pt-2 border-t border-border shrink-0 space-y-2">
            {messages.length > 0 && suggestedPrompts.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {suggestedPrompts.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => !isLoading && sendMessage(s)}
                    disabled={isLoading}
                    className="shrink-0 whitespace-nowrap px-2.5 py-1 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Mode selection pills */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/40">
              {MENTOR_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setMentorMode(mode.id)}
                  className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    mentorMode === mode.id
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={mode.desc}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Input box */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  mentorMode === "plan"
                    ? "Generate plan with minimal tasks..."
                    : mentorMode === "agent"
                    ? "Prompt agent to implement features..."
                    : mentorMode === "bugfix"
                    ? "Describe error or fix console issues..."
                    : "Ask AI Mentor for hints or diffs..."
                }
                className="w-full pl-3 pr-16 py-2 text-[12px] bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground/60 transition-all"
                disabled={isLoading}
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  onClick={() => setUseVoice(!useVoice)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${useVoice ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                  title="Voice input"
                >
                  <Mic size={13} />
                </button>
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  title="Send message"
                >
                  <ArrowLeft size={13} className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Multi-file Review Modal (Agent Mode) */}
      <AgentReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        changes={reviewChanges}
        explanation={reviewExplanation}
        existingFiles={files}
        onApplyAll={() => {
          if (onApplyFiles) {
            const map: Record<string, string> = {};
            for (const c of reviewChanges) map[c.path] = c.code;
            onApplyFiles(map);
          }
          setReviewModalOpen(false);
        }}
        onApplySelected={(selectedFiles: Record<string, string>) => {
          if (onApplyFiles) onApplyFiles(selectedFiles);
          setReviewModalOpen(false);
        }}
      />
    </div>
  );
}
export default AIMentor;
