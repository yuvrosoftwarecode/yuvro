import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  BookOpen,
  Bug,
  CheckCircle2,
  Code2,
  Columns3,
  Copy,
  FileCode2,
  FilePlus,
  FolderPlus,
  GitBranch,
  Globe,
  LayoutList,
  Maximize2,
  Minimize2,
  Package,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Play,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Square,
  Sparkles,
  Terminal as TerminalIcon,
  X,
} from "lucide-react";
import { useWizard } from "./WizardContext";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth";
import { useRecruiterSidebar } from "@/lib/recruiterSidebarContext";
import {
  generateCommandsWithAI,
  generateRulesWithAI,
  pushRulesToRepo,
} from "./adapters/scoringAdapter";
import { runVerificationStages } from "./adapters/verificationAdapter";
import { labTaskAIService } from "@/services/labTaskAIService";
import { FileTreeView } from "./FileTree";
import { DiffViewer } from "./DiffViewer";
import { AIMentor } from "@/components/common/ai-buddy/AIMentor";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { json as jsonLang } from "@codemirror/lang-json";
import { markdown as cmMarkdown } from "@codemirror/lang-markdown";

interface SolutionSubFile {
  path: string;
  name: string;
  status: "A" | "M" | "D";
  diff: string;
}

function parseSolutionSubFiles(raw: string): SolutionSubFile[] {
  const cleaned = (raw || "")
    .replace(/^```(?:diff|patch|[a-z0-9_-]+)?\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  if (!cleaned) return [];

  const lines = cleaned.split("\n");
  const sections: SolutionSubFile[] = [];
  let currentLines: string[] = [];
  let currentPath = "";
  let currentStatus: "A" | "M" | "D" = "M";

  const flush = () => {
    if (currentLines.length > 0 && currentPath) {
      sections.push({
        path: currentPath,
        name: currentPath.split("/").pop() || currentPath,
        status: currentStatus,
        diff: currentLines.join("\n"),
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (line.startsWith("diff --git ")) {
      flush();
      currentLines = [line];
      const m = line.match(/diff --git a\/.+? b\/(.+)/);
      currentPath = m ? m[1].trim() : `file_${sections.length + 1}`;
      currentStatus = "M";
      continue;
    }

    if (line.startsWith("--- ") && nextLine.startsWith("+++ ")) {
      const alreadyStartedByGit =
        currentLines.length > 0 &&
        currentLines[0].startsWith("diff --git ") &&
        !currentLines.some((l) => l.startsWith("--- "));

      if (!alreadyStartedByGit) {
        flush();
        currentLines = [];
      }

      const oldPath = line.slice(4).trim();
      const newPath = nextLine.slice(4).trim();
      if (oldPath === "/dev/null") {
        currentStatus = "A";
        currentPath = newPath.replace(/^b\//, "");
      } else if (newPath === "/dev/null") {
        currentStatus = "D";
        currentPath = oldPath.replace(/^a\//, "");
      } else {
        currentStatus = "M";
        currentPath = newPath.replace(/^b\//, "");
      }
    }

    currentLines.push(line);
  }
  flush();

  return sections;
}

const getLanguageExtension = (filename: string) => {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "py":
      return python();
    case "java":
      return java();
    case "html":
      return html();
    case "css":
      return css();
    case "sql":
      return sql();
    case "json":
      return jsonLang();
    case "md":
      return cmMarkdown();
    default:
      return python();
  }
};

export const ScoringStep: React.FC<{
  isIDE?: boolean;
  onPublish?: () => void;
  isPublishing?: boolean;
}> = ({ isIDE = true, onPublish, isPublishing = false }) => {
  const { state, setState, tsum, isCloningWorkspace } = useWizard();
  const { user } = useAuth();
  const recruiterUuid = String((user as any)?.uuid || (user as any)?.id || (user as any)?.user_id || "recruiter");
  const { theme } = useTheme();
  const { setIsStep4Workspace } = useRecruiterSidebar();
  const isDark = theme === "dark";

  // Hide sidebar into drawer while in Step 4 IDE workspace
  useEffect(() => {
    setIsStep4Workspace(true);
    return () => {
      setIsStep4Workspace(false);
    };
  }, [setIsStep4Workspace]);

  // Student IDE layout states (replicated from TicketIDE)
  type SidebarView = "problem" | "explorer" | null;
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>("problem");
  const [selectedTaskIdx, setSelectedTaskIdx] = useState<number>(0);
  const [taskSubTab, setTaskSubTab] = useState<"solution" | "rule">("solution");
  const [isRunningSingleTask, setIsRunningSingleTask] = useState<boolean>(false);
  const [sidePanel, setSidePanel] = useState<"mentor" | "preview" | null>(null);
  const [sideWidth, setSideWidth] = useState<number>(360);
  const [previewDevice, setPreviewDevice] = useState<"Mobile" | "Tablet" | "Desktop">("Desktop");
  const [sidebarWidth, setSidebarWidth] = useState<number>(270);
  const [bottomHeight, setBottomHeight] = useState<number>(230);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState<boolean>(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>("");
  const ideContainerRef = useRef<HTMLDivElement | null>(null);

  // File explorer states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInFilesQuery, setSearchInFilesQuery] = useState("");
  const [searchMatchCase, setSearchMatchCase] = useState(false);
  const [searchMatchWord, setSearchMatchWord] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [starterOpen, setStarterOpen] = useState(true);
  const [solutionOpen, setSolutionOpen] = useState(true);

  // Active file selection, Multi-tab bar & Diff / Markdown preview mode
  type EditorCategory = "rules" | "starter" | "solution" | "task-solution";
  const [activeFile, setActiveFile] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<EditorCategory>("rules");
  const [openTabs, setOpenTabs] = useState<Array<{ path: string; category: EditorCategory }>>([]);
  const [diffMode, setDiffMode] = useState<boolean>(true);
  const [mdPreviewMode, setMdPreviewMode] = useState<boolean>(true);
  const [selectedSolutionSubFile, setSelectedSolutionSubFile] = useState<string>("all");
  const [rulesViewAll, setRulesViewAll] = useState<boolean>(false);

  // Terminal & Console states
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"terminal" | "results" | "console" | "breakdown">("terminal");
  const [activeStageTab, setActiveStageTab] = useState<number>(0);

  // Resizable sidebar & bottom panel handlers (matching TicketIDE)
  const startSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const next = Math.max(220, Math.min(520, startWidth + (ev.clientX - startX)));
        setSidebarWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth]
  );

  const startBottomResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = bottomHeight;
      const onMove = (ev: MouseEvent) => {
        const next = Math.max(120, Math.min(520, startHeight - (ev.clientY - startY)));
        setBottomHeight(next);
        if (!consoleOpen) setConsoleOpen(true);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [bottomHeight, consoleOpen]
  );

  const startSidePanelResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = sideWidth;
      const onMove = (ev: MouseEvent) => {
        const next = Math.max(280, Math.min(680, startW - (ev.clientX - startX)));
        setSideWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sideWidth]
  );

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      ideContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+J (Terminal), Cmd+P (Find files), Cmd+B (Problem), Cmd+Shift+E/F/G/D/X, F1 (Shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "F1") {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      } else if (mod && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setConsoleOpen((prev) => !prev);
      } else if (mod && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setQuickSwitcherOpen((o) => !o);
      } else if (mod && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setActiveSidebarView((v) => (v === "problem" ? null : "problem"));
      } else if (mod && e.shiftKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        setActiveSidebarView((v) => (v === "explorer" ? null : "explorer"));
      } else if (mod && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setActiveSidebarView((v) => (v === "search" ? null : "search"));
      } else if (mod && e.shiftKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        setActiveSidebarView((v) => (v === "git" ? null : "git"));
      } else if (mod && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        setActiveSidebarView((v) => (v === "debug" ? null : "debug"));
      } else if (mod && e.shiftKey && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        setActiveSidebarView((v) => (v === "containers" ? null : "containers"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Async operations
  const [isGeneratingCmds, setIsGeneratingCmds] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [isPushingRules, setIsPushingRules] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isAligningSolution, setIsAligningSolution] = useState(false);
  const [generatingSolutionIdx, setGeneratingSolutionIdx] = useState<number | null>(null);
  const [repairHint, setRepairHint] = useState("");

  // Derived scoring status
  const hasCommands = Boolean(state.sc.startup.trim() && state.sc.test.trim());
  const ruleFilesMap = state.sc.rules?.files || {};
  const ruleFileNames = Object.keys(ruleFilesMap);
  const hasRules = ruleFileNames.length > 0;
  const isRulesOutOfDate = Boolean(state.sc.rulesOutOfDate);
  const isVerified = state.sc.ver.st === "passed" && Boolean(state.sc.ver.done[1]);
  const isPushed = Boolean(state.sc.pushed);

  // Starter repo files
  const starterFiles = state.scan.files || [];
  const keyFiles = state.scan.keyFiles || {};

  // Solution files
  const solutionFilesMap = state.sc.solutionFiles || {};
  const solutionFileNames = Object.keys(solutionFilesMap);

  // Loading state for on-demand starter file fetches
  const [loadingFile, setLoadingFile] = useState(false);

  const fetchRawFile = useCallback(
    async (filePath: string) => {
      if (!state.scan.workspaceId) return;
      setLoadingFile(true);
      try {
        const res = await labTaskAIService.readWorkspaceFile({
          temp_workspace_id: state.scan.workspaceId,
          path: filePath,
        });
        if (typeof res?.content === "string") {
          setState((prev) => ({
            ...prev,
            scan: {
              ...prev.scan,
              keyFiles: {
                ...prev.scan.keyFiles,
                [filePath]: res.content,
              },
            },
          }));
        }
      } catch (e) {
        console.warn("Could not read file from recruiter workspace:", e);
      } finally {
        setLoadingFile(false);
      }
    },
    [state.scan.workspaceId, setState]
  );

  const handleSelectFile = useCallback(
    (path: string, category: EditorCategory) => {
      if (category === "rules") {
        const targetPath = path === "__scoring_rules__" ? (ruleFileNames[0] || "") : path;
        if (targetPath) {
          setActiveFile(targetPath);
          if (targetPath.toLowerCase().endsWith(".md")) {
            setMdPreviewMode(true);
          }
        }
        setActiveCategory("rules");
        setDiffMode(false);
        setOpenTabs((prev) => {
          if (prev.some((t) => t.category === "rules")) return prev;
          return [...prev, { path: "__scoring_rules__", category: "rules" }];
        });
        return;
      }

      setActiveFile(path);
      setActiveCategory(category);
      setOpenTabs((prev) => {
        if (prev.some((t) => t.path === path && t.category === category)) return prev;
        return [...prev, { path, category }];
      });
      if (category === "solution") {
        setDiffMode(true);
      } else if (category === "task-solution") {
        setDiffMode(false);
      } else if (category === "starter") {
        setDiffMode(false);
      }
      if (path.toLowerCase().endsWith(".md")) {
        setMdPreviewMode(true);
      }
      if (category === "starter" && (!keyFiles[path] || !keyFiles[path].trim())) {
        fetchRawFile(path);
      }
    },
    [keyFiles, fetchRawFile, ruleFileNames]
  );

  const closeTab = useCallback(
    (path: string, category: EditorCategory, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setOpenTabs((prev) => {
        const next = prev.filter((t) => !(t.path === path && t.category === category));
        const wasActive =
          (category === "rules" && activeCategory === "rules") ||
          (activeFile === path && activeCategory === category);
        if (wasActive) {
          const fallback = next[next.length - 1];
          if (fallback) {
            if (fallback.category === "rules") {
              setActiveCategory("rules");
              setActiveFile(ruleFileNames[0] || "");
            } else {
              setActiveFile(fallback.path);
              setActiveCategory(fallback.category);
            }
          } else {
            setActiveFile("");
          }
        }
        return next;
      });
    },
    [activeFile, activeCategory, ruleFileNames]
  );

  // Ensure test command is always locked to the yuvro_scoring_rules runner harness
  useEffect(() => {
    const langList = state.stack.languages || [];
    const isPy =
      langList.some((l) => l.toLowerCase().includes("python")) ||
      !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const ext = isPy ? "py" : "js";
    const expectedTestCmd = isPy
      ? `python yuvro_scoring_rules/main_test.${ext}`
      : `node yuvro_scoring_rules/main_test.${ext}`;

    if (!state.sc.test || !state.sc.test.includes("yuvro_scoring_rules")) {
      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          test: expectedTestCmd,
        },
      }));
    }
  }, [state.stack.languages, state.sc.test, setState]);

  // Guided step status
  const guidedStep = useMemo<"commands" | "rules" | "verify" | "push" | "publish">(() => {
    if (!hasCommands) return "commands";
    if (!hasRules || isRulesOutOfDate) return "rules";
    if (!isVerified) return "verify";
    if (!isPushed) return "push";
    return "publish";
  }, [hasCommands, hasRules, isRulesOutOfDate, isVerified, isPushed]);

  // Filtered files
  const filteredRuleFiles = useMemo(() => {
    if (!searchQuery.trim()) return ruleFileNames;
    return ruleFileNames.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ruleFileNames, searchQuery]);

  const filteredStarterFiles = useMemo(() => {
    if (!searchQuery.trim()) return starterFiles;
    return starterFiles.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [starterFiles, searchQuery]);

  const filteredSolutionFiles = useMemo(() => {
    if (!searchQuery.trim()) return solutionFileNames;
    return solutionFileNames.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [solutionFileNames, searchQuery]);

  // Active file content in CodeMirror / Viewer
  const activeContent = useMemo(() => {
    if (!activeFile) return "";
    if (activeCategory === "task-solution") {
      const m = activeFile.match(/^Task (\d+) Solution/);
      if (m) {
        const idx = Number(m[1]) - 1;
        return state.t.tasks[idx]?.ref || "# No reference solution provided.";
      }
      return "";
    }
    if (activeCategory === "rules") {
      return ruleFilesMap[activeFile] || "";
    }
    if (activeCategory === "solution") {
      return solutionFilesMap[activeFile] || "";
    }
    if (activeCategory === "starter") {
      if (keyFiles[activeFile]) return keyFiles[activeFile];
      return `# File: ${activeFile}\n# Repository: ${state.f.url || state.f.repo}\n# Branch: ${state.f.branch || "main"}\n# Cloned starter codebase file`;
    }
    return "";
  }, [activeFile, activeCategory, ruleFilesMap, solutionFilesMap, keyFiles, state.f.url, state.f.repo, state.f.branch, state.t.tasks]);

  // Editor content change handler
  const handleEditorChange = useCallback(
    (val: string) => {
      if (!activeFile) return;
      if (activeCategory === "rules") {
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            rules: prev.sc.rules
              ? {
                  ...prev.sc.rules,
                  files: {
                    ...prev.sc.rules.files,
                    [activeFile]: val,
                  },
                }
              : null,
            rulesOutOfDate: true,
            pushed: null,
            ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
          },
        }));
      } else if (activeCategory === "solution") {
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            solutionFiles: {
              ...(prev.sc.solutionFiles || {}),
              [activeFile]: val,
            },
            ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
          },
        }));
      }
    },
    [activeFile, activeCategory, setState]
  );

  // Command input handlers
  const handleStartupChange = (val: string) => {
    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        startup: val,
        pushed: null,
        ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
      },
    }));
  };

  const handleTestChange = (val: string) => {
    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        test: val,
        pushed: null,
        ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
      },
    }));
  };

  // Align Task Solutions with the real starter codebase files
  const handleAlignTaskSolutionsWithCodebase = async () => {
    setIsAligningSolution(true);
    toast.info("Aligning task reference solution with starter codebase files...");
    try {
      const solRes = await labTaskAIService.generatePassSolution({
        lab_context: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        tasks: state.t.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.desc,
          solution: t.ref,
          marks: t.marks,
          difficulty: t.diff,
        })),
        scoring_files: state.sc.rules?.files || {},
        repo_files: keyFiles || {},
        provider: "deepseek",
      });

      if (solRes && solRes.solution_files && Object.keys(solRes.solution_files).length > 0) {
        const diffText = solRes.solution_diff || "";

        setState((prev) => {
          const updatedTasks = prev.t.tasks.map((task) => ({
            ...task,
            ref: diffText || task.ref,
          }));

          return {
            ...prev,
            t: {
              ...prev.t,
              tasks: updatedTasks,
            },
            sc: {
              ...prev.sc,
              solutionFiles: solRes.solution_files,
            },
          };
        });

        toast.success("Task reference solution aligned with starter codebase!");
      } else {
        toast.error("AI could not synthesize aligned solution files.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to align solutions with codebase.");
    } finally {
      setIsAligningSolution(false);
    }
  };

  // Generate reference solution for a single task on-demand when user opens it
  const handleGenerateTaskSolutionOnDemand = async (taskIdx: number) => {
    const task = state.t.tasks[taskIdx];
    if (!task) return;

    setGeneratingSolutionIdx(taskIdx);
    toast.info(`Generating reference solution for Task ${taskIdx + 1} against codebase...`);
    try {
      const solRes = await labTaskAIService.generatePassSolution({
        lab_context: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        tasks: [
          {
            id: task.id,
            title: task.title,
            description: task.desc,
            marks: task.marks,
            difficulty: task.diff,
          },
        ],
        scoring_files: state.sc.rules?.files || {},
        repo_files: keyFiles || {},
        provider: "deepseek",
      });

      const diffText = solRes?.solution_diff || "";
      if (diffText) {
        setState((prev) => ({
          ...prev,
          t: {
            ...prev.t,
            tasks: prev.t.tasks.map((t, i) => (i === taskIdx ? { ...t, ref: diffText } : t)),
          },
          sc: {
            ...prev.sc,
            solutionFiles: {
              ...(prev.sc.solutionFiles || {}),
              ...(solRes.solution_files || {}),
            },
          },
        }));
        const subs = parseSolutionSubFiles(diffText);
        setSelectedSolutionSubFile(subs[0]?.path || "all");
        toast.success(`Reference solution generated for Task ${taskIdx + 1}`);
      } else {
        toast.error(`Could not synthesize solution for Task ${taskIdx + 1}`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to generate solution for Task ${taskIdx + 1}`);
    } finally {
      setGeneratingSolutionIdx(null);
    }
  };

  const handleOpenTaskSolution = async (taskIdx: number) => {
    setTaskSubTab("solution");
    setSelectedTaskIdx(taskIdx);
    const task = state.t.tasks[taskIdx];
    if (!task) return;

    const tabTitle = `Task ${taskIdx + 1} Solution`;
    handleSelectFile(tabTitle, "task-solution");

    if (!task.ref || !task.ref.trim()) {
      await handleGenerateTaskSolutionOnDemand(taskIdx);
    } else {
      const subs = parseSolutionSubFiles(task.ref);
      setSelectedSolutionSubFile(subs[0]?.path || "all");
    }
  };

  // Generate Lifecycle Commands with AI
  const handleGenerateCommands = async () => {
    setIsGeneratingCmds(true);
    try {
      const res = await generateCommandsWithAI(
        {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        state.t.tasks
      );
      const langList = state.stack.languages || [];
      const isPy =
        langList.some((l) => l.toLowerCase().includes("python")) ||
        !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
      const ext = isPy ? "py" : "js";
      const expectedTest = isPy
        ? `python yuvro_scoring_rules/main_test.${ext}`
        : `node yuvro_scoring_rules/main_test.${ext}`;
      const resolvedTest = (res.test && res.test.includes("yuvro_scoring_rules")) ? res.test : expectedTest;

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          startup: res.startup,
          test: resolvedTest,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));
      toast.success("Lifecycle commands generated with AI");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate lifecycle commands");
    } finally {
      setIsGeneratingCmds(false);
    }
  };

  // Generate Scoring Rules for a single task only (when clicked from Problem Statement bar)
  const handleGenerateSingleTaskRule = async (taskIdx: number) => {
    const task = state.t.tasks[taskIdx];
    if (!task) return;
    setIsGeneratingRules(true);
    setRulesOpen(true);

    const langList = state.stack.languages || [];
    const isPy =
      langList.some((l) => l.toLowerCase().includes("python")) ||
      !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const ext = isPy ? "py" : "js";
    const targetTestFile = `yuvro_scoring_rules/test${taskIdx + 1}.${ext}`;

    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        rules: {
          files: {
            ...(prev.sc.rules?.files || {}),
            [targetTestFile]: `# Generating scoring rules for Task ${taskIdx + 1}: ${task.title}...\n`,
          },
          fileRules: prev.sc.rules?.fileRules || [],
          timestamp: new Date().toISOString(),
        },
      },
    }));
    setRulesViewAll(false);
    handleSelectFile(targetTestFile, "rules");

    try {
      const res = await generateRulesWithAI(
        {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        [task],
        keyFiles
      );

      const generatedFiles = res.files || {};
      const remappedFiles: Record<string, string> = {};
      Object.entries(generatedFiles).forEach(([fname, content]) => {
        if (fname.includes("test1.")) {
          remappedFiles[targetTestFile] = content;
        } else if (fname.includes("main_test.") || fname.includes("readme.md")) {
          if (!state.sc.rules?.files?.[fname]) {
            remappedFiles[fname] = content;
          }
        } else {
          remappedFiles[fname] = content;
        }
      });

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          rules: {
            files: {
              ...(prev.sc.rules?.files || {}),
              ...remappedFiles,
            },
            fileRules: [...(prev.sc.rules?.fileRules || []), ...(res.fileRules || [])],
            timestamp: res.timestamp,
          },
          test:
            res.test_command ||
            (isPy ? `python yuvro_scoring_rules/main_test.${ext}` : `node yuvro_scoring_rules/main_test.${ext}`),
          rulesOutOfDate: false,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));

      handleSelectFile(targetTestFile, "rules");
      toast.success(`Scoring rule generated for Task ${taskIdx + 1}`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to generate scoring rule for Task ${taskIdx + 1}`);
    } finally {
      setIsGeneratingRules(false);
    }
  };

  // Generate Scoring Rules with AI
  const handleGenerateRules = async () => {
    setIsGeneratingRules(true);
    setRulesOpen(true);

    // Identify file extension from stack
    const langList = state.stack.languages || [];
    const isPy =
      langList.some((l) => l.toLowerCase().includes("python")) ||
      !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const ext = isPy ? "py" : "js";

    try {
      const res = await generateRulesWithAI(
        {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
        },
        state.t.tasks,
        keyFiles
      );

      const files = res.files || {};
      const fileKeys = Object.keys(files);
      const defaultFile = fileKeys.find((f) => f.includes("main_test")) || fileKeys[0] || "";

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          rules: {
            files: res.files,
            fileRules: res.fileRules,
            timestamp: res.timestamp,
          },
          test:
            res.test_command ||
            (isPy ? `python yuvro_scoring_rules/main_test.${ext}` : `node yuvro_scoring_rules/main_test.${ext}`),
          rulesOutOfDate: false,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));

      if (defaultFile) {
        handleSelectFile(defaultFile, "rules");
      }
      toast.success("Scoring rules generated");

      // Generate startup and test commands with AI after scoring rules are created
      setIsGeneratingCmds(true);
      try {
        const cmdRes = await generateCommandsWithAI(
          {
            title: state.f.title,
            description: state.f.desc,
            role: state.f.role,
            stack: state.stack,
            repoUrl: state.f.url,
            branch: state.f.branch,
          },
          state.t.tasks
        );
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            startup: cmdRes.startup || prev.sc.startup,
            test: res.test_command || (isPy ? `python yuvro_scoring_rules/main_test.${ext}` : `node yuvro_scoring_rules/main_test.${ext}`),
          },
        }));
        toast.success("Startup and test commands generated with AI");
      } catch (cmdErr) {
        console.warn("Auto-generating commands after scoring rules failed:", cmdErr);
      } finally {
        setIsGeneratingCmds(false);
      }

      // Automatically synthesize reference solution files & aligned diffs against starter codebase
      try {
        const solRes = await labTaskAIService.generatePassSolution({
          lab_context: {
            title: state.f.title,
            description: state.f.desc,
            role: state.f.role,
            stack: state.stack,
            repoUrl: state.f.url,
            branch: state.f.branch,
          },
          tasks: state.t.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.desc,
            solution: t.ref,
            marks: t.marks,
            difficulty: t.diff,
          })),
          scoring_files: res.files,
          repo_files: keyFiles || {},
          provider: "deepseek",
        });

        if (solRes && solRes.solution_files && Object.keys(solRes.solution_files).length > 0) {
          const diffText = solRes.solution_diff || "";
          setState((prev) => ({
            ...prev,
            t: {
              ...prev.t,
              tasks: prev.t.tasks.map((t) => ({
                ...t,
                ref: diffText || t.ref,
              })),
            },
            sc: {
              ...prev.sc,
              solutionFiles: solRes.solution_files,
            },
          }));
        }
      } catch (solErr) {
        console.warn("Auto-aligning solution after scoring rules generation failed:", solErr);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate scoring rules");
    } finally {
      setIsGeneratingRules(false);
    }
  };

  // Push Scoring Rules to Repository (Redoes solution, rechecks verification, and pushes)
  const handlePushRules = async (): Promise<boolean> => {
    if (!state.sc.rules?.files) return false;
    setIsPushingRules(true);

    try {
      // 1. Redo reference solution with AI
      toast.info("Redoing reference solution...");
      let freshSolutionFiles = state.sc.solutionFiles || {};
      try {
        const gen = await labTaskAIService.generatePassSolution({
          lab_context: {
            title: state.f.title,
            description: state.f.desc,
            role: state.f.role,
            stack: state.stack,
            repoUrl: state.f.url,
            branch: state.f.branch,
          },
          tasks: state.t.tasks.map((t) => ({
            title: t.title,
            description: t.desc,
            solution: t.ref,
            marks: t.marks,
            difficulty: t.diff,
          })),
          scoring_files: state.sc.rules.files,
          repo_files: keyFiles || {},
          provider: "deepseek",
        });
        if (gen?.solution_files && Object.keys(gen.solution_files).length > 0) {
          freshSolutionFiles = gen.solution_files;
        }
      } catch (solErr) {
        console.warn("Could not regenerate solution, using existing solution files:", solErr);
      }

      // 2. Recheck verification
      toast.info("Rechecking verification against starter codebase...");
      setActiveConsoleTab("terminal");
      setConsoleOpen(true);
      setActiveStageTab(0);

      const langList = state.stack.languages || [];
      const isPy =
        langList.some((l) => l.toLowerCase().includes("python")) ||
        !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
      const ext = isPy ? "py" : "js";
      const resolvedTestCmd = (state.sc.test && state.sc.test.includes("yuvro_scoring_rules"))
        ? state.sc.test
        : (isPy ? `python yuvro_scoring_rules/main_test.${ext}` : `node yuvro_scoring_rules/main_test.${ext}`);

      const verResult = await runVerificationStages({
        repoUrl: state.f.url,
        branch: state.f.branch || "main",
        testCommand: resolvedTestCmd,
        tasks: state.t.tasks,
        scoringFiles: state.sc.rules.files,
        totalMarks: Number(state.f.marks) || 10,
        solutionFiles: freshSolutionFiles,
        workspaceId: state.scan.workspaceId,
        recruiterUuid,
        questionUuid: state.questionUuid,
        labContext: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
          startup_command: state.sc.startup,
          test_command: resolvedTestCmd,
        },
        repoFiles: keyFiles,
        onProgress: (stage, status, log) => {
          setActiveStageTab(stage);
          setState((prev) => {
            const nextDone = { ...prev.sc.ver.done, [stage]: true };
            const nextLogs = [...(prev.sc.ver.log || ["", ""])];
            nextLogs[stage] = log;
            const nextStatuses = [...(prev.sc.ver.statuses || ["", ""])];
            nextStatuses[stage] = status;
            return {
              ...prev,
              sc: {
                ...prev.sc,
                solutionFiles: freshSolutionFiles,
                ver: {
                  ...prev.sc.ver,
                  st: "running",
                  p: stage,
                  done: nextDone,
                  log: nextLogs,
                  statuses: nextStatuses,
                },
              },
            };
          });
        },
      });

      if (!verResult.success) {
        toast.error("Verification failed during recheck. Fix failing tests before pushing.");
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            ver: {
              ...prev.sc.ver,
              st: "failed",
              done: { ...prev.sc.ver.done, 1: "Verification failed" },
            },
          },
        }));
        return false;
      }

      // 3. Push to repository once verified
      toast.info("Verification passed! Pushing scoring rules to repository...");
      const repoRef = state.f.repo || state.f.url;
      const res = await pushRulesToRepo({
        repoIdentifier: repoRef,
        branch: state.f.branch || "main",
        files: state.sc.rules.files,
      });

      if (res.success) {
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            pushed: timeStr,
            solutionFiles: verResult.solutionFiles || freshSolutionFiles,
            ver: {
              ...prev.sc.ver,
              st: "passed",
              done: { 0: true, 1: true },
              statuses: verResult.statuses,
              log: verResult.logs,
            },
          },
        }));
        toast.success("Scoring rules verified and pushed to repository!");
        return true;
      } else {
        toast.error("Failed to push scoring rules to repository");
        return false;
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to push scoring rules");
      return false;
    } finally {
      setIsPushingRules(false);
    }
  };

  // Publish handler: if rules haven't been pushed yet, redo solution -> recheck -> push, then publish
  const handlePublishClick = async () => {
    if (!hasRules) {
      toast.error("Generate scoring rules before publishing.");
      return;
    }
    if (!isPushed) {
      const pushedOk = await handlePushRules();
      if (!pushedOk) return;
    }
    onPublish?.();
  };

  // Run an individual task from the Problem Statement sidebar
  const handleRunSingleTask = async (taskIdx: number) => {
    const task = state.t.tasks[taskIdx];
    if (!task) return;
    if (!hasRules || !state.sc.rules?.files) {
      toast.error("Generate scoring rules first before running a task.");
      return;
    }

    setIsRunningSingleTask(true);
    setActiveStageTab(0);
    setActiveConsoleTab("terminal");
    setConsoleOpen(true);

    const langList = state.stack.languages || [];
    const isPy =
      langList.some((l) => l.toLowerCase().includes("python")) ||
      !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const ext = isPy ? "py" : "js";
    const defaultRunnerCmd = isPy ? `python yuvro_scoring_rules/main_test.py` : `node yuvro_scoring_rules/main_test.js`;
    const resolvedTestCmd = (state.sc.test && state.sc.test.includes("yuvro_scoring_rules")) ? state.sc.test : defaultRunnerCmd;

    try {
      const result = await runVerificationStages({
        repoUrl: state.f.url,
        branch: state.f.branch || "main",
        testCommand: resolvedTestCmd,
        tasks: [task],
        scoringFiles: state.sc.rules.files,
        totalMarks: Number(task.marks) || 10,
        solutionFiles: state.sc.solutionFiles,
        workspaceId: state.scan.workspaceId,
        recruiterUuid,
        questionUuid: state.questionUuid,
        labContext: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          git_repo_starter_url: state.f.url,
          git_repo_starter_branch: state.f.branch,
          startup_command: state.sc.startup,
          test_command: resolvedTestCmd,
        },
        repoFiles: state.scan.keyFiles,
        onProgress: (stage, status, log) => {
          setActiveStageTab(stage);
          setState((prev) => {
            const nextLogs = [...(prev.sc.ver.log || ["", ""])];
            nextLogs[stage] = log;
            const nextStatuses = [...(prev.sc.ver.statuses || ["", ""])];
            nextStatuses[stage] = status;
            return {
              ...prev,
              sc: {
                ...prev.sc,
                ver: {
                  ...prev.sc.ver,
                  p: stage,
                  log: nextLogs,
                  statuses: nextStatuses,
                },
              },
            };
          });
        },
      });

      const taskKey = `task${taskIdx + 1}`;
      const taskPassInfo = result.rawResults?.passCase?.data?.tasks?.[taskKey];
      if (taskPassInfo?.result === "passed" || result.success) {
        toast.success(`Task ${taskIdx + 1} (${task.title}) passed!`);
      } else {
        toast.error(`Task ${taskIdx + 1} (${task.title}): ${taskPassInfo?.message || "Failed"}`);
      }

      if (result.solutionFiles && Object.keys(result.solutionFiles).length > 0) {
        setState((prev) => ({
          ...prev,
          sc: {
            ...prev.sc,
            solutionFiles: result.solutionFiles,
          },
        }));
      }

      // Revert workspace back to pristine starter code (buggy code)
      if (state.scan.workspaceId) {
        try {
          const resetRes = await labTaskAIService.resetTempWorkspace(state.scan.workspaceId);
          if (resetRes?.key_files) {
            setState((prev) => ({
              ...prev,
              scan: {
                ...prev.scan,
                keyFiles: {
                  ...prev.scan.keyFiles,
                  ...resetRes.key_files,
                },
              },
            }));
          }
        } catch (resetErr) {
          console.warn("Could not reset temp workspace:", resetErr);
        }
      }

      // Ensure active category and diff mode revert back to starter buggy code
      if (activeCategory === "solution") {
        setActiveCategory("starter");
        setDiffMode(false);
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to run Task ${taskIdx + 1}`);
    } finally {
      setIsRunningSingleTask(false);
    }
  };

  // Run Sandbox Verification Pipeline (2 Stages: Fail case & Pass case)
  const handleRunVerification = async () => {
    if (!hasRules || !state.sc.rules?.files) return;

    setIsVerifying(true);
    setActiveStageTab(0);
    setActiveConsoleTab("terminal");
    setConsoleOpen(true);

    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        ver: {
          st: "running",
          p: 0,
          done: {},
          log: ["", ""],
          statuses: ["", ""],
          run: prev.sc.ver.run + 1,
        },
      },
    }));

    const langList = state.stack.languages || [];
    const isPy =
      langList.some((l) => l.toLowerCase().includes("python")) ||
      !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const defaultRunnerCmd = isPy ? `python yuvro_scoring_rules/main_test.py` : `node yuvro_scoring_rules/main_test.js`;
    const resolvedTestCmd = (state.sc.test && state.sc.test.includes("yuvro_scoring_rules")) ? state.sc.test : defaultRunnerCmd;

    try {
      const result = await runVerificationStages({
        repoUrl: state.f.url,
        branch: state.f.branch || "main",
        testCommand: resolvedTestCmd,
        tasks: state.t.tasks,
        scoringFiles: state.sc.rules.files,
        totalMarks: Number(state.f.marks) || 10,
        solutionFiles: state.sc.solutionFiles,
        workspaceId: state.scan.workspaceId,
        recruiterUuid,
        questionUuid: state.questionUuid,
        labContext: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          git_repo_starter_url: state.f.url,
          git_repo_starter_branch: state.f.branch,
          startup_command: state.sc.startup,
          test_command: resolvedTestCmd,
        },
        repoFiles: state.scan.keyFiles,
        onProgress: (stage, status, log) => {
          setActiveStageTab(stage);
          setState((prev) => {
            const nextDone = { ...prev.sc.ver.done, [stage]: true };
            const nextLogs = [...(prev.sc.ver.log || ["", ""])];
            nextLogs[stage] = log;
            const nextStatuses = [...(prev.sc.ver.statuses || ["", ""])];
            nextStatuses[stage] = status;
            return {
              ...prev,
              sc: {
                ...prev.sc,
                ver: {
                  ...prev.sc.ver,
                  p: stage,
                  done: nextDone,
                  log: nextLogs,
                  statuses: nextStatuses,
                },
              },
            };
          });
        },
      });

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          solutionFiles: result.solutionFiles || prev.sc.solutionFiles,
          ver: {
            ...prev.sc.ver,
            st: result.success ? "passed" : "failed",
            p: 1,
            done: { 0: true, 1: true },
            log: result.logs,
            statuses: result.statuses,
          },
        },
      }));

      // Revert workspace back to pristine starter code (buggy code)
      if (state.scan.workspaceId) {
        try {
          const resetRes = await labTaskAIService.resetTempWorkspace(state.scan.workspaceId);
          if (resetRes?.key_files) {
            setState((prev) => ({
              ...prev,
              scan: {
                ...prev.scan,
                keyFiles: {
                  ...prev.scan.keyFiles,
                  ...resetRes.key_files,
                },
              },
            }));
          }
        } catch (resetErr) {
          console.warn("Could not reset temp workspace:", resetErr);
        }
      }

      // Ensure active category and diff mode revert back to starter buggy code
      if (activeCategory === "solution") {
        setActiveCategory("starter");
        setDiffMode(false);
      }

      if (result.solutionFiles && Object.keys(result.solutionFiles).length > 0) {
        setSolutionOpen(true);
      }

      if (result.success) {
        toast.success("Sandbox verification passed!");
      } else {
        toast.error("Verification failed on pass case or container testing");
        setActiveConsoleTab("breakdown");
      }
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          ver: {
            ...prev.sc.ver,
            st: "failed",
            done: { ...prev.sc.ver.done, 0: "Error" },
          },
        },
      }));
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-repair scoring rules with AI
  const handleRepairWithAI = async () => {
    if (!state.sc.rules?.files) return;
    setIsRepairing(true);
    try {
      const repaired = await labTaskAIService.repairScoringRules({
        lab_context: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          git_repo_starter_url: state.f.url,
          git_repo_starter_branch: state.f.branch,
          startup_command: state.sc.startup,
          test_command: state.sc.test,
        },
        tasks: state.t.tasks,
        scoring_files: state.sc.rules.files,
        repo_files: state.scan.keyFiles,
        feedback: repairHint,
        provider: "deepseek",
      });

      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          rules: {
            files: repaired.files,
            fileRules: repaired.fileRules,
            timestamp: repaired.timestamp,
            test_command: repaired.test_command || prev.sc.test,
          },
          test: repaired.test_command || prev.sc.test,
          rulesOutOfDate: false,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));

      toast.success("Scoring rules auto-repaired with AI!");
      setRepairHint("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to repair scoring rules");
    } finally {
      setIsRepairing(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (activeContent) {
      navigator.clipboard.writeText(activeContent);
      toast.success("Code copied to clipboard");
    }
  };

  const stageTitles = [
    "1. Fail case (Starter)",
    "2. Pass case (Solution)",
  ];

  // Check if active file has a solution counterpart or is a solution file
  const hasSolutionDiff = Boolean(
    solutionFilesMap[activeFile] ||
    (activeCategory === "solution" && activeContent) ||
    (activeCategory === "starter" && solutionFilesMap[activeFile])
  );

  if (isCloningWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-background select-none">
        <div className="flex flex-col items-center gap-5 p-8 max-w-sm text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl animate-pulse" />
            <img
              src="/logo.png"
              alt="Yuvro"
              className="h-16 w-16 object-contain animate-pulse relative z-10"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Scaffolding starter codebase…
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Synthesizing project files, dependencies, and repository structure for your lab.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            <span>Configuring workspace container</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ideContainerRef}
      className="flex flex-1 flex-col min-h-0 bg-background text-foreground overflow-hidden"
    >
      {/* 1. TOP RIBBON (Exact Student IDE Top Bar + Step 4 Controls) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-editor-panel px-3 py-1.5 text-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {/* Student IDE branding */}
          <div className="flex items-center gap-2 mr-1">
            <div className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-primary">
              <Code2 className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-xs text-foreground tracking-tight whitespace-nowrap">
              Vitarka IDE
            </span>
          </div>

          {/* Find files (⌘P) */}
          <button
            type="button"
            onClick={() => {
              setQuickSearchQuery("");
              setQuickSwitcherOpen(true);
            }}
            className="hidden md:inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Quick open file (⌘P)"
          >
            <Search className="h-3 w-3" />
            <span>Find files...</span>
            <kbd className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground border">
              ⌘P
            </kbd>
          </button>

          {/* Step 4 Startup & Test Command Inputs */}
          <div className="flex items-center gap-1.5 min-w-0">
            <label htmlFor="ide-startup" className="text-[11px] font-medium text-muted-foreground shrink-0">
              Startup:
            </label>
            <input
              id="ide-startup"
              type="text"
              value={state.sc.startup}
              onChange={(e) => handleStartupChange(e.target.value)}
              placeholder="e.g. python manage.py runserver"
              className="h-7 w-44 rounded border border-border bg-background px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <label htmlFor="ide-test" className="text-[11px] font-medium text-muted-foreground shrink-0">
              Test:
            </label>
            <input
              id="ide-test"
              type="text"
              value={state.sc.test}
              onChange={(e) => handleTestChange(e.target.value)}
              placeholder="e.g. python yuvro_scoring_rules/main_test.py"
              className="h-7 w-52 rounded border border-border bg-background px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="button"
            className="lk sm shrink-0"
            onClick={handleGenerateCommands}
            disabled={isGeneratingCmds}
            style={{ textDecoration: "underline" }}
          >
            {isGeneratingCmds ? "Generating…" : "Generate with AI"}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {!hasRules ? (
            <button
              type="button"
              className={guidedStep === "rules" ? "btn sm" : "lk sm"}
              onClick={handleGenerateRules}
              disabled={isGeneratingRules || !state.t.tasks.length}
            >
              {isGeneratingRules ? "Generating…" : "Generate scoring rules"}
            </button>
          ) : (
            <button
              type="button"
              className="lk sm"
              onClick={handleGenerateRules}
              disabled={isGeneratingRules}
              style={{ textDecoration: "underline" }}
            >
              {isGeneratingRules ? "Regenerating…" : "Regenerate rules"}
            </button>
          )}

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Student IDE Buttons: Run, Preview, Publish */}
          <button
            type="button"
            onClick={handleRunVerification}
            disabled={isVerifying || !hasRules}
            className="inline-flex items-center gap-1 rounded-md bg-success/20 text-success border border-success/40 px-2.5 py-1 hover:bg-success/30 font-medium disabled:opacity-60 cursor-pointer"
          >
            <Play className="h-3 w-3" />
            {isVerifying ? "Running…" : "Run"}
            <kbd className="hidden xl:inline rounded bg-success/20 px-1 text-[10px]">⌘↵</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              if (sidePanel !== "preview") {
                setSidePanel("preview");
                setActiveSidebarView(null);
              } else {
                setSidePanel(null);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent cursor-pointer ${
              sidePanel === "preview" ? "bg-accent text-foreground border-primary/40" : "border-border"
            }`}
          >
            <Globe className="h-3 w-3" />
            Preview
          </button>

          <button
            type="button"
            onClick={handlePublishClick}
            disabled={isPushingRules || isPublishing || !hasRules}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            title="Verify, push scoring rules, and publish question"
          >
            <Send className="h-3 w-3" />
            {isPushingRules ? "Verifying & pushing…" : isPublishing ? "Publishing…" : "Publish"}
          </button>

          <div className="h-4 w-px bg-border mx-0.5" />

          {activeSidebarView === null && (
            <button
              type="button"
              onClick={() => setActiveSidebarView("problem")}
              title="Show Sidebar"
              className="inline-flex items-center gap-1 rounded border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
            >
              <PanelLeft className="h-3.5 w-3.5" />
              <span>Sidebar</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="grid h-7 w-7 place-items-center rounded-md border border-border/70 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN STUDENT IDE BODY */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Activity Bar Rail */}
        <div className="flex w-12 flex-col items-center gap-1 border-r border-border bg-editor-panel py-2 text-muted-foreground shrink-0 z-20">
          {/* Problem Statement button */}
          <button
            type="button"
            onClick={() => setActiveSidebarView((v) => (v === "problem" ? null : "problem"))}
            title={activeSidebarView === "problem" ? "Hide Problem Statement (⌘B)" : "Show Problem Statement (⌘B)"}
            className={`grid h-9 w-9 place-items-center rounded transition-colors cursor-pointer ${
              activeSidebarView === "problem"
                ? "text-foreground bg-accent"
                : "hover:text-foreground hover:bg-accent/40"
            }`}
          >
            <BookOpen className="h-4 w-4" />
          </button>

          {/* Explorer button */}
          <button
            type="button"
            onClick={() => setActiveSidebarView((v) => (v === "explorer" ? null : "explorer"))}
            title={activeSidebarView === "explorer" ? "Hide Explorer (⌘⇧E)" : "Show Explorer (⌘⇧E)"}
            className={`grid h-9 w-9 place-items-center rounded transition-colors cursor-pointer ${
              activeSidebarView === "explorer"
                ? "text-foreground bg-accent"
                : "hover:text-foreground hover:bg-accent/40"
            }`}
          >
            <FileCode2 className="h-4 w-4" />
          </button>

          {/* Search in Files */}
          <button
            type="button"
            onClick={() => setQuickSwitcherOpen(true)}
            title="Search Files (⌘P)"
            className="grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Source Control / Diff */}
          <button
            type="button"
            onClick={() => {
              setActiveSidebarView("explorer");
              setSolutionOpen(true);
              if (solutionFileNames.length > 0) {
                handleSelectFile(solutionFileNames[0], "solution");
              }
            }}
            title={`Source Control / Diff (${solutionFileNames.length} modified)`}
            className="relative grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
          >
            <GitBranch className="h-4 w-4" />
            {solutionFileNames.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {solutionFileNames.length}
              </span>
            )}
          </button>

          {/* Bug / Run Terminal */}
          <button
            type="button"
            onClick={() => {
              setConsoleOpen(true);
              setActiveConsoleTab("terminal");
            }}
            title="Run & Test Results (Terminal)"
            className="grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
          >
            <Bug className="h-4 w-4" />
          </button>

          {/* Containers / Environment */}
          <button
            type="button"
            onClick={() => {
              setConsoleOpen(true);
              setActiveConsoleTab("breakdown");
            }}
            title="Verification Breakdown"
            className="grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
          >
            <Package className="h-4 w-4" />
          </button>

          {/* Keyboard Shortcuts Settings button at bottom */}
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard Shortcuts (F1)"
            className="mt-auto grid h-9 w-9 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Single Left Sidebar Panel */}
        {activeSidebarView !== null && (
          <>
            <aside
              style={{
                width: `${activeSidebarView === "problem" ? Math.max(sidebarWidth, 340) : sidebarWidth}px`,
                flexShrink: 0,
              }}
              className="hidden md:flex flex-col border-r border-border bg-editor-panel max-w-[50vw] min-w-[240px] text-xs min-h-0"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-editor-panel shrink-0">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  {activeSidebarView === "problem" ? "Problem Statement" : "Explorer"}
                </span>
                <button
                  type="button"
                  title="Collapse Sidebar"
                  onClick={() => setActiveSidebarView(null)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Problem Statement View (Title + Description, then Task Selector + Solution + Scoring Rule + Run Bar) */}
              {activeSidebarView === "problem" && (() => {
                const safeIdx = Math.min(selectedTaskIdx, Math.max(0, state.t.tasks.length - 1));
                const activeTask = state.t.tasks[safeIdx];
                const matchingRuleKey =
                  ruleFileNames.find((f) => f.includes(`test${safeIdx + 1}.`)) ||
                  ruleFileNames.find((f) => f.includes(`test_${safeIdx + 1}`)) ||
                  "";

                return (
                  <div className="flex flex-col h-full min-h-0">
                    {/* Top: Lab Title & Rendered Markdown Description */}
                    <div className="px-3 py-2 space-y-1 border-b border-border/60 shrink-0 max-h-40 overflow-auto">
                      <div className="font-semibold text-[12.5px] text-foreground">
                        {state.f.title || "Engineering Lab"}
                      </div>
                      {state.f.desc ? (
                        <div className="md-body text-[11px] text-muted-foreground leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.f.desc}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No problem description provided.
                        </p>
                      )}
                    </div>

                    {/* Task Bar: Dropdown -> Solution -> Scoring Rule -> Run */}
                    <div className="flex items-center border-b border-border bg-background text-xs shrink-0 px-2 gap-1.5 whitespace-nowrap">
                      <select
                        aria-label="Select task"
                        value={safeIdx}
                        onChange={(e) => {
                          const nextIdx = Number(e.target.value);
                          setSelectedTaskIdx(nextIdx);
                          if (taskSubTab === "solution") {
                            handleOpenTaskSolution(nextIdx);
                          }
                        }}
                        className="h-7 flex-1 min-w-0 truncate rounded border border-border/70 bg-editor-panel px-1.5 text-[11px] font-medium text-foreground outline-none cursor-pointer"
                      >
                        {state.t.tasks.length === 0 ? (
                          <option value={0}>No tasks</option>
                        ) : (
                          state.t.tasks.map((tk, i) => (
                            <option key={tk.id} value={i}>
                              {i + 1}. {tk.title}
                            </option>
                          ))
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleOpenTaskSolution(safeIdx)}
                        className={`px-2 py-2 text-[11px] whitespace-nowrap cursor-pointer shrink-0 ${
                          taskSubTab === "solution"
                            ? "text-foreground border-b-2 border-primary font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Solution
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTaskSubTab("rule");
                          setSidePanel("mentor");
                          setRulesViewAll(false);
                          if (matchingRuleKey) {
                            handleSelectFile(matchingRuleKey, "rules");
                          } else if (activeTask) {
                            handleGenerateSingleTaskRule(safeIdx);
                          }
                        }}
                        className={`px-2 py-2 text-[11px] whitespace-nowrap cursor-pointer shrink-0 ${
                          taskSubTab === "rule"
                            ? "text-foreground border-b-2 border-primary font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Scoring rule
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunSingleTask(safeIdx)}
                        disabled={isRunningSingleTask || !activeTask || !hasRules}
                        title="Run this individual task"
                        className="inline-flex items-center gap-1 rounded bg-success/20 text-success border border-success/40 px-2 py-0.5 text-[11px] font-medium hover:bg-success/30 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        {isRunningSingleTask ? "…" : "Run"}
                      </button>
                    </div>

                    {/* Selected Task Content: ONLY description, marks, and time */}
                    <div className="flex-1 overflow-auto p-3 space-y-2.5 min-h-0">
                      {!activeTask ? (
                        <div className="text-muted-foreground text-xs">No tasks configured.</div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground text-[12px]">
                              {safeIdx + 1}. {activeTask.title}
                            </span>
                            <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">
                              {activeTask.marks} marks · {activeTask.min} min
                            </span>
                          </div>
                          {activeTask.desc ? (
                            <div className="md-body text-[11.5px] text-muted-foreground leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeTask.desc}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">
                              No task description provided.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Explorer View */}
              {activeSidebarView === "explorer" && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="p-2 border-b border-border/40">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter files…"
                      className="w-full rounded bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex-1 overflow-auto px-1 py-2 min-h-0">
                    {/* Section 1: Scoring Rules */}
                    <div>
                      <div
                        className="ide-section-hdr"
                        onClick={() => setRulesOpen((prev) => !prev)}
                      >
                        <span>Scoring rules ({ruleFileNames.length})</span>
                        <span>{rulesOpen ? "▾" : "▸"}</span>
                      </div>
                      {rulesOpen && (
                        <FileTreeView
                          files={ruleFileNames}
                          category="rules"
                          activeFile={activeFile}
                          activeCategory={activeCategory}
                          onSelectFile={handleSelectFile}
                          searchQuery={searchQuery}
                        />
                      )}
                    </div>

                    {/* Section 2: Source Control (Pass Case Diff) */}
                    {solutionFileNames.length > 0 && (
                      <div style={{ marginTop: "10px" }}>
                        <div
                          className="ide-section-hdr"
                          onClick={() => setSolutionOpen((prev) => !prev)}
                        >
                          <span>Source control ({solutionFileNames.length} changes)</span>
                          <span>{solutionOpen ? "▾" : "▸"}</span>
                        </div>
                        {solutionOpen && (
                          <FileTreeView
                            files={solutionFileNames}
                            category="solution"
                            activeFile={activeFile}
                            activeCategory={activeCategory}
                            onSelectFile={handleSelectFile}
                            searchQuery={searchQuery}
                            showStatusBadges={true}
                            modifiedFiles={keyFiles}
                          />
                        )}
                      </div>
                    )}

                    {/* Section 3: Starter Repository Codebase */}
                    <div style={{ marginTop: "10px" }}>
                      <div
                        className="ide-section-hdr"
                        onClick={() => setStarterOpen((prev) => !prev)}
                      >
                        <span>Starter codebase ({starterFiles.length})</span>
                        <span>{starterOpen ? "▾" : "▸"}</span>
                      </div>
                      {starterOpen && (
                        <FileTreeView
                          files={starterFiles}
                          category="starter"
                          activeFile={activeFile}
                          activeCategory={activeCategory}
                          onSelectFile={handleSelectFile}
                          searchQuery={searchQuery}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <GitBranch className="h-3 w-3" /> {state.f.branch || "main"}
                  </div>
                </div>
              )}
            </aside>

            <div
              role="separator"
              onMouseDown={startSidebarResize}
              className="hidden md:block w-1 cursor-col-resize bg-border hover:bg-primary transition-colors shrink-0 z-10"
              title="Drag to resize sidebar"
            />
          </>
        )}

        {/* Center Editor + Resizable Bottom Terminal */}
        <section className="flex flex-1 min-w-0 flex-col relative">
          {/* Multi-tab bar (matching TicketIDE) */}
          <div
            className="flex items-center border-b border-border bg-editor-panel text-xs overflow-x-auto no-scrollbar shrink-0"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex items-center overflow-x-auto flex-1 min-w-0">
              {openTabs.length === 0 && (
                <div className="px-3 py-2 text-muted-foreground">No file selected</div>
              )}
              {openTabs.map((tabItem) => {
                const isRulesGroup = tabItem.category === "rules";
                const isActive = isRulesGroup
                  ? activeCategory === "rules"
                  : activeFile === tabItem.path && activeCategory === tabItem.category;
                const displayLabel = isRulesGroup
                  ? `Task ${Math.min(selectedTaskIdx, Math.max(0, state.t.tasks.length - 1)) + 1} Scoring Rules`
                  : tabItem.path.split("/").pop();
                return (
                  <button
                    key={`${tabItem.category}:${tabItem.path}`}
                    type="button"
                    onClick={() => handleSelectFile(tabItem.path, tabItem.category)}
                    className={`flex items-center gap-2 border-r border-border pl-3 pr-2 py-2 whitespace-nowrap group cursor-pointer ${
                      isActive
                        ? "bg-editor-bg text-foreground font-medium"
                        : "text-muted-foreground hover:bg-editor-bg/50 hover:text-foreground"
                    }`}
                  >
                    <FileCode2 className="h-3 w-3 shrink-0" />
                    <span>{displayLabel}</span>
                    {tabItem.category === "solution" && (
                      <span className="text-[10px] font-semibold text-amber-600">M</span>
                    )}
                    <span
                      onClick={(e) => closeTab(tabItem.path, tabItem.category, e)}
                      className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 rounded-sm hover:bg-muted/50 cursor-pointer"
                      title="Close file"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 px-3 shrink-0 border-l border-border/50 bg-editor-panel py-1">
              {activeFile && (
                <span className="hidden lg:inline text-[11px] text-muted-foreground truncate max-w-[220px]" title={activeFile}>
                  {activeCategory === "rules"
                    ? "Scoring Rule"
                    : activeCategory === "task-solution"
                    ? "Task Reference Solution"
                    : activeCategory === "solution"
                    ? "Pass Solution"
                    : loadingFile
                    ? "Fetching…"
                    : "Starter (Read-only)"}
                </span>
              )}
              {activeCategory === "task-solution" && (
                <button
                  type="button"
                  onClick={handleAlignTaskSolutionsWithCodebase}
                  disabled={isAligningSolution}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-[11px] text-primary hover:bg-primary/20 font-medium cursor-pointer transition-colors"
                  title="Regenerate and align solution diff with actual starter codebase files"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isAligningSolution ? "Aligning…" : "Align with Codebase"}</span>
                </button>
              )}
              {activeFile.toLowerCase().endsWith(".md") && (
                <div className="flex items-center gap-0.5 rounded border border-border bg-background p-0.5">
                  <button
                    type="button"
                    onClick={() => setMdPreviewMode(true)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      mdPreviewMode ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setMdPreviewMode(false)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      !mdPreviewMode ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Code
                  </button>
                </div>
              )}
              {hasSolutionDiff && (
                <div className="flex items-center gap-0.5 rounded border border-border bg-background p-0.5">
                  <button
                    type="button"
                    onClick={() => setDiffMode(true)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      diffMode ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Diff View
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiffMode(false)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      !diffMode ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Code
                  </button>
                </div>
              )}
              {isRulesOutOfDate && activeCategory === "rules" && (
                <span className="text-[11px] font-medium text-destructive">
                  Modified · re-verify
                </span>
              )}
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy file content"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Code / Diff / Markdown Editor Canvas */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {isGeneratingRules ? (
              <div className="flex flex-col items-center justify-center h-full w-full gap-4 p-8 text-center bg-background select-none">
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-3 rounded-full bg-primary/10 blur-md animate-pulse" />
                  <img
                    src="/logo.png"
                    alt="Yuvro"
                    className="h-14 w-14 object-contain animate-pulse relative z-10"
                  />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Generating scoring rules with AI…
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Synthesizing automated test harnesses, per-task grading assertions, and evaluation criteria.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  <span>Analyzing codebase & tasks</span>
                </div>
              </div>
            ) : !activeFile ? (
              <div className="flex flex-col items-center justify-center h-full w-full text-center p-8 text-muted-foreground select-none bg-background">
                <FileCode2 className="h-10 w-10 mb-3 opacity-25 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No file or task opened</h3>
                <p className="text-xs max-w-sm leading-relaxed text-muted-foreground">
                  Select a file from the explorer on the left or click a task in the problem statement sidebar to view its reference solution.
                </p>
              </div>
            ) : activeCategory === "rules" && ruleFileNames.length > 0 ? (
              <div className="flex flex-col h-full bg-background overflow-hidden">
                <div className="flex items-center gap-1 border-b border-border bg-editor-panel px-2.5 py-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setRulesViewAll(true)}
                    className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                      rulesViewAll
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    All ({ruleFileNames.length} {ruleFileNames.length === 1 ? "file" : "files"})
                  </button>
                  {ruleFileNames.map((fname) => {
                    const isSel = !rulesViewAll && activeFile === fname;
                    return (
                      <button
                        key={fname}
                        type="button"
                        onClick={() => {
                          setRulesViewAll(false);
                          handleSelectFile(fname, "rules");
                        }}
                        title={fname}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                          isSel
                            ? "bg-accent text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <FileCode2 className="h-3 w-3 shrink-0" />
                        <span>{fname.split("/").pop()}</span>
                      </button>
                    );
                  })}
                </div>

                {rulesViewAll ? (
                  <div className="flex-1 overflow-auto p-3 space-y-4">
                    {ruleFileNames.map((fname) => (
                      <div key={fname} className="rounded-md border border-border overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-border bg-editor-panel font-mono text-[11px] font-medium text-foreground flex items-center justify-between">
                          <span>{fname}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRulesViewAll(false);
                              handleSelectFile(fname, "rules");
                            }}
                            className="text-[11px] text-primary hover:underline cursor-pointer"
                          >
                            Edit file
                          </button>
                        </div>
                        {fname.toLowerCase().endsWith(".md") ? (
                          <div className="p-4 bg-background md-body text-xs text-foreground leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{ruleFilesMap[fname] || ""}</ReactMarkdown>
                          </div>
                        ) : (
                          <CodeMirror
                            value={ruleFilesMap[fname] || ""}
                            extensions={[getLanguageExtension(fname)]}
                            theme={isDark ? vscodeDark : vscodeLight}
                            onChange={(val) => {
                              setState((prev) => ({
                                ...prev,
                                sc: {
                                  ...prev.sc,
                                  rules: prev.sc.rules
                                    ? {
                                        ...prev.sc.rules,
                                        files: { ...prev.sc.rules.files, [fname]: val },
                                      }
                                    : null,
                                  rulesOutOfDate: true,
                                  pushed: null,
                                  ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
                                },
                              }));
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : activeFile.toLowerCase().endsWith(".md") && mdPreviewMode ? (
                  <div className="flex-1 overflow-auto p-6 bg-background">
                    <div className="md-body max-w-3xl text-sm text-foreground leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeContent}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <CodeMirror
                      value={activeContent}
                      height="100%"
                      extensions={[getLanguageExtension(activeFile)]}
                      theme={isDark ? vscodeDark : vscodeLight}
                      readOnly={false}
                      onChange={handleEditorChange}
                      style={{ height: "100%" }}
                    />
                  </div>
                )}
              </div>
            ) : activeFile.toLowerCase().endsWith(".md") && mdPreviewMode ? (
              <div className="h-full overflow-auto p-6 bg-background">
                <div className="md-body max-w-3xl text-sm text-foreground leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeContent}</ReactMarkdown>
                </div>
              </div>
            ) : activeCategory === "task-solution" ? (() => {
              if (generatingSolutionIdx !== null) {
                return (
                  <div className="flex flex-col items-center justify-center h-full w-full gap-4 p-8 text-center bg-background select-none">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute -inset-3 rounded-full bg-primary/10 blur-md animate-pulse" />
                      <img
                        src="/logo.png"
                        alt="Yuvro"
                        className="h-14 w-14 object-contain animate-pulse relative z-10"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        Generating reference solution for Task {generatingSolutionIdx + 1}…
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                        Synthesizing code modifications and unified diffs against the starter codebase files.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                      <span>Applying solution against starter files</span>
                    </div>
                  </div>
                );
              }

              if (!activeContent || !activeContent.trim() || activeContent.includes("# No reference solution provided.")) {
                return (
                  <div className="flex flex-col items-center justify-center h-full w-full gap-3 p-8 text-center bg-background select-none">
                    <FileCode2 className="h-10 w-10 opacity-30 text-muted-foreground mb-1" />
                    <h3 className="text-sm font-semibold text-foreground">No reference solution yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-2">
                      Generate a reference solution for this task that aligns directly with your starter codebase.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenTaskSolution(safeIdx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer transition-colors shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Generate Solution with AI</span>
                    </button>
                  </div>
                );
              }

              const subFiles = parseSolutionSubFiles(activeContent);
              const activeSub = subFiles.find((sf) => sf.path === selectedSolutionSubFile);

              return (
                <div className="flex flex-col h-full bg-background overflow-hidden">
                  {subFiles.length > 0 && (
                    <div className="flex items-center gap-1 border-b border-border bg-editor-panel px-2.5 py-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedSolutionSubFile("all")}
                        className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                          selectedSolutionSubFile === "all" || !activeSub
                            ? "bg-accent text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        All ({subFiles.length} {subFiles.length === 1 ? "file" : "files"})
                      </button>
                      {subFiles.map((sf) => {
                        const isSel = selectedSolutionSubFile === sf.path;
                        return (
                          <button
                            key={sf.path}
                            type="button"
                            onClick={() => setSelectedSolutionSubFile(sf.path)}
                            title={sf.path}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                              isSel
                                ? "bg-accent text-foreground font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            }`}
                          >
                            <FileCode2 className="h-3 w-3 shrink-0" />
                            <span>{sf.name}</span>
                            <span
                              className={`text-[9.5px] font-bold px-1 rounded ${
                                sf.status === "A"
                                  ? "text-emerald-600 bg-emerald-500/15"
                                  : sf.status === "D"
                                  ? "text-red-600 bg-red-500/15"
                                  : "text-amber-600 bg-amber-500/15"
                              }`}
                            >
                              {sf.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeSub ? (
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <DiffViewer key={activeSub.path} filename={activeSub.path} patchText={activeSub.diff} />
                    </div>
                  ) : subFiles.length > 0 ? (
                    <div className="flex-1 overflow-auto divide-y divide-border">
                      {subFiles.map((sf) => (
                        <div key={sf.path} className="min-h-[160px]">
                          <DiffViewer key={sf.path} filename={sf.path} patchText={sf.diff} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <DiffViewer key={activeFile} filename={activeFile} patchText={activeContent} />
                    </div>
                  )}
                </div>
              );
            })() : diffMode && hasSolutionDiff ? (
              <DiffViewer
                key={`${activeFile}-diff`}
                filename={activeFile}
                oldContent={keyFiles[activeFile] || ""}
                newContent={activeCategory === "solution" ? activeContent : (solutionFilesMap[activeFile] || "")}
              />
            ) : (
              <CodeMirror
                value={activeContent}
                height="100%"
                extensions={[getLanguageExtension(activeFile)]}
                theme={isDark ? vscodeDark : vscodeLight}
                readOnly={activeCategory === "starter"}
                onChange={handleEditorChange}
                style={{ height: "100%" }}
              />
            )}
          </div>

          {/* Resizable Bottom Panel (matching TicketIDE) */}
          <div
            role="separator"
            onMouseDown={startBottomResize}
            className="h-1 cursor-row-resize bg-border hover:bg-primary transition-colors shrink-0 z-10"
            title="Drag to resize terminal panel"
          />
          <div
            style={{ height: consoleOpen ? `${bottomHeight}px` : "36px", flexShrink: 0 }}
            className="border-t border-border bg-editor-panel flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between border-b border-border text-xs shrink-0">
              <div className="flex items-center overflow-x-auto">
                {[
                  { k: "terminal", label: "Terminal", icon: TerminalIcon },
                  { k: "results", label: "Results", icon: CheckCircle2 },
                  { k: "console", label: "Console", icon: TerminalIcon },
                  { k: "breakdown", label: "Per-Task Breakdown", icon: LayoutList },
                ].map((tabItem) => (
                  <button
                    key={tabItem.k}
                    type="button"
                    onClick={() => {
                      setActiveConsoleTab(tabItem.k as typeof activeConsoleTab);
                      if (!consoleOpen) setConsoleOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 uppercase tracking-wide text-[11px] cursor-pointer ${
                      activeConsoleTab === tabItem.k
                        ? "text-foreground border-b-2 border-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tabItem.icon className="h-3 w-3" />
                    {tabItem.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 px-3 shrink-0">
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color:
                      state.sc.ver.st === "passed"
                        ? "#16a34a"
                        : state.sc.ver.st === "failed"
                        ? "#dc2626"
                        : "var(--mut)",
                  }}
                >
                  {state.sc.ver.st === "passed"
                    ? `Passed (Score ${tsum}/${state.f.marks})`
                    : state.sc.ver.st === "failed"
                    ? "Needs fix"
                    : isVerifying
                    ? "Running verification…"
                    : "Not run yet"}
                </span>

                <button
                  type="button"
                  onClick={() => setConsoleOpen((prev) => !prev)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  title="Toggle with Ctrl+J"
                >
                  {consoleOpen ? "Minimize (Ctrl+J)" : "Expand (Ctrl+J)"}
                </button>
              </div>
            </div>

            {consoleOpen && (
              <div className="flex flex-1 flex-col min-h-0">
                {activeConsoleTab === "terminal" || activeConsoleTab === "console" ? (
                  <>
                    <div className="flex items-center gap-4 px-3.5 py-1.5 border-b border-border/60 bg-background text-xs shrink-0">
                      {stageTitles.map((title, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveStageTab(idx)}
                          className={`text-[11.5px] cursor-pointer ${
                            activeStageTab === idx
                              ? "font-semibold text-foreground underline"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {title} {state.sc.ver.statuses?.[idx] ? `(${state.sc.ver.statuses[idx]})` : ""}
                        </button>
                      ))}
                    </div>

                    <div className="ide-console-body">
                      {state.sc.ver.log?.[activeStageTab] ||
                        "Run verification to view execution logs for this stage."}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 overflow-auto p-3">
                    <table className="ide-task-table">
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Task</th>
                          <th style={{ width: "10%" }}>Marks</th>
                          <th style={{ width: "25%" }}>Fail Case (Expect: Failed)</th>
                          <th style={{ width: "20%" }}>Pass Case (Expect: Passed)</th>
                          <th style={{ width: "10%" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.t.tasks.map((task) => {
                          const isPassed = state.sc.ver.st === "passed";
                          const isFailed = state.sc.ver.st === "failed";
                          return (
                            <tr key={task.id}>
                              <td>
                                <strong>{task.title}</strong>
                                <div className="mut sm">{task.diff} · {task.min} min</div>
                              </td>
                              <td>{task.marks}</td>
                              <td>
                                <span className="sm" style={{ color: isPassed || isFailed ? "#16a34a" : "var(--mut)" }}>
                                  {isPassed || isFailed ? "Verified (0)" : "Pending"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="sm"
                                  style={{
                                    color: isPassed ? "#16a34a" : isFailed ? "#dc2626" : "var(--mut)",
                                  }}
                                >
                                  {isPassed ? `Passed (${task.marks})` : isFailed ? "Needs fix" : "Pending"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="sm"
                                  style={{
                                    fontWeight: 500,
                                    color: isPassed ? "#16a34a" : isFailed ? "#dc2626" : "var(--mut)",
                                  }}
                                >
                                  {isPassed ? "Passed" : isFailed ? "Needs fix" : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {state.sc.ver.st === "failed" && (
                      <div className="mt-3.5 p-2.5 bg-muted/40 rounded-md flex items-center gap-3 border border-border">
                        <input
                          type="text"
                          className="ctl sm"
                          placeholder="Optional hint for AI (e.g. 'Ensure Todo model table exists')..."
                          value={repairHint}
                          onChange={(e) => setRepairHint(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn sm"
                          onClick={handleRepairWithAI}
                          disabled={isRepairing}
                        >
                          {isRepairing ? "Repairing…" : "Auto-fix scoring rules"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Side Panel (Live Preview / AI Mentor matching TicketIDE) */}
        {sidePanel && (
          <>
            <div
              role="separator"
              onMouseDown={startSidePanelResize}
              className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors shrink-0"
              title="Drag to resize"
            />
            <aside
              style={{ width: `${sideWidth}px`, flexShrink: 0 }}
              className="flex flex-col bg-editor-panel border-l border-border min-w-[280px] min-h-0 overflow-hidden"
            >
              {sidePanel === "preview" ? (
                <>
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs shrink-0">
                    <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
                      <Globe className="h-3 w-3" />
                      Live Preview
                    </span>
                    <div className="flex items-center gap-1">
                      {(["Mobile", "Tablet", "Desktop"] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setPreviewDevice(d)}
                          className={`rounded border px-2 py-0.5 text-[10px] cursor-pointer ${
                            previewDevice === d
                              ? "bg-accent text-foreground border-primary/40"
                              : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="ml-auto text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent cursor-pointer"
                      title="Close preview"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-xs text-muted-foreground space-y-2">
                    <Globe className="h-8 w-8 opacity-40" />
                    <div className="font-medium text-foreground">Candidate App Preview ({previewDevice})</div>
                    <p className="max-w-xs">
                      Startup command: <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">{state.sc.startup || "Not configured"}</code>
                    </p>
                  </div>
                </>
              ) : (
                <AIMentor
                  chatTitle={`${state.f.title || "Engineering Lab"} · Scoring Rules`}
                  persistenceKey={`recruiter-scoring-${(state.f.repo || state.f.url || "lab").replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                  activeFile={activeFile || ruleFileNames[0] || "yuvro_scoring_rules/main_test.py"}
                  disableDiffApply={true}
                  tasks={state.t.tasks.map((tk, i) => ({
                    id: tk.id,
                    number: String(i + 1),
                    title: tk.title,
                    description: tk.desc,
                    marks: tk.marks,
                    difficulty: tk.diff,
                    reference_solution: tk.ref,
                  }))}
                  files={{ ...keyFiles, ...ruleFilesMap }}
                  consoleOutput={state.sc.ver.log?.[activeStageTab] || ""}
                  onExecuteRun={handleRunVerification}
                  isExecutingRun={isVerifying}
                  onClose={() => setSidePanel(null)}
                  onOpenFile={(filePath) => {
                    if (ruleFilesMap[filePath] !== undefined) {
                      handleSelectFile(filePath, "rules");
                    } else if (solutionFilesMap[filePath] !== undefined) {
                      handleSelectFile(filePath, "solution");
                    } else {
                      handleSelectFile(filePath, "starter");
                    }
                  }}
                  onApplyCode={(newCode, targetPath) => {
                    const target = targetPath || activeFile || "yuvro_scoring_rules/main_test.py";
                    setState((prev) => ({
                      ...prev,
                      sc: {
                        ...prev.sc,
                        rules: {
                          files: {
                            ...(prev.sc.rules?.files || {}),
                            [target]: newCode,
                          },
                          fileRules: prev.sc.rules?.fileRules || [],
                          timestamp: new Date().toISOString(),
                        },
                        rulesOutOfDate: false,
                        pushed: null,
                        ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
                      },
                    }));
                    handleSelectFile(target, "rules");
                    toast.success(`Applied Vitarka AI changes to ${target}`);
                  }}
                  onApplyFiles={(updatedFiles) => {
                    setState((prev) => ({
                      ...prev,
                      sc: {
                        ...prev.sc,
                        rules: {
                          files: {
                            ...(prev.sc.rules?.files || {}),
                            ...updatedFiles,
                          },
                          fileRules: prev.sc.rules?.fileRules || [],
                          timestamp: new Date().toISOString(),
                        },
                        rulesOutOfDate: false,
                        pushed: null,
                        ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
                      },
                    }));
                    const first = Object.keys(updatedFiles)[0];
                    if (first) handleSelectFile(first, "rules");
                    toast.success(`Applied ${Object.keys(updatedFiles).length} scoring rule file(s)`);
                  }}
                  onSaveFile={(filePath, content) => {
                    setState((prev) => ({
                      ...prev,
                      sc: {
                        ...prev.sc,
                        rules: {
                          files: {
                            ...(prev.sc.rules?.files || {}),
                            [filePath]: content,
                          },
                          fileRules: prev.sc.rules?.fileRules || [],
                          timestamp: new Date().toISOString(),
                        },
                      },
                    }));
                  }}
                  contextGetter={() => {
                    const safeIdx = Math.min(selectedTaskIdx, Math.max(0, state.t.tasks.length - 1));
                    const targetTask = state.t.tasks[safeIdx];
                    const targetTaskText = targetTask
                      ? `TARGET TASK ONLY (Task ${safeIdx + 1} of ${state.t.tasks.length}): ${targetTask.title} (${targetTask.marks} marks, ${targetTask.diff})\nDescription: ${targetTask.desc}\nReference Solution:\n${targetTask.ref}`
                      : "No task selected.";
                    const rulesText = Object.entries(ruleFilesMap)
                      .map(([p, c]) => `File: ${p}\n${c}`)
                      .join("\n\n");
                    return [
                      `Role: You are helping a recruiter configure automated Yuvro scoring rules (yuvro_scoring_rules/*) for this Engineering Lab.`,
                      `IMPORTANT: Focus ONLY on the selected target task below and generate/refine its scoring rule file (yuvro_scoring_rules/test${safeIdx + 1}.py or .js).`,
                      `Lab Title: ${state.f.title}\nDescription: ${state.f.desc}`,
                      `Startup Command: ${state.sc.startup}\nTest Command: ${state.sc.test}`,
                      targetTaskText,
                      rulesText ? `Current Scoring Rule Files:\n${rulesText}` : "No scoring rule files generated yet.",
                    ]
                      .filter(Boolean)
                      .join("\n\n");
                  }}
                />
              )}
            </aside>
          </>
        )}
      </div>

      {/* Quick File Switcher Modal (⌘P) */}
      {quickSwitcherOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20 p-4"
          onClick={() => setQuickSwitcherOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2.5 border-b border-border flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Search files by name..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => setQuickSwitcherOpen(false)}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-72 overflow-auto divide-y divide-border/30">
              {[
                ...ruleFileNames.map((f) => ({ path: f, category: "rules" as const, tag: "Rule" })),
                ...solutionFileNames.map((f) => ({ path: f, category: "solution" as const, tag: "Diff" })),
                ...starterFiles.map((f) => ({ path: f, category: "starter" as const, tag: "Starter" })),
              ]
                .filter((item) => !quickSearchQuery.trim() || item.path.toLowerCase().includes(quickSearchQuery.toLowerCase()))
                .slice(0, 40)
                .map((item) => (
                  <button
                    key={`${item.category}:${item.path}`}
                    type="button"
                    onClick={() => {
                      handleSelectFile(item.path, item.category);
                      setQuickSwitcherOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer"
                  >
                    <span className="font-mono truncate text-foreground">{item.path}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{item.tag}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg text-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-sm">Keyboard Shortcuts</span>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { keys: ["Ctrl / ⌘", "J"], label: "Toggle Terminal Panel" },
                { keys: ["⌘ / Ctrl", "⇧", "E"], label: "Toggle File Explorer" },
                { keys: ["⌘ / Ctrl", "⇧", "F"], label: "Search in Files" },
                { keys: ["⌘ / Ctrl", "⇧", "G"], label: "Source Control / Diff" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{s.label}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
