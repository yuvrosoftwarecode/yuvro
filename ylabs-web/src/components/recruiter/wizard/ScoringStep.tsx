import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useWizard } from "./WizardContext";
import { useTheme } from "@/hooks/use-theme";
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

export const ScoringStep: React.FC<{ isIDE?: boolean }> = ({ isIDE = true }) => {
  const { state, setState, tsum } = useWizard();
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

  // File explorer states
  const [searchQuery, setSearchQuery] = useState("");
  const [rulesOpen, setRulesOpen] = useState(true);
  const [starterOpen, setStarterOpen] = useState(true);
  const [solutionOpen, setSolutionOpen] = useState(true);

  // Active file selection & Diff mode
  const [activeFile, setActiveFile] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<"rules" | "starter" | "solution">("rules");
  const [diffMode, setDiffMode] = useState<boolean>(true);

  // Terminal & Console states
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"terminal" | "breakdown">("terminal");
  const [activeStageTab, setActiveStageTab] = useState<number>(0);

  // Keyboard shortcut: Ctrl+J / Cmd+J to toggle terminal logs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setConsoleOpen((prev) => !prev);
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
      const repoStr = state.f.repo || state.f.url || "";
      const m =
        repoStr.match(/github\.com\/([^\/]+)\/([^\/\.]+)/) ||
        repoStr.match(/^([^\/]+)\/([^\/\.]+)/);
      if (!m) return;
      const owner = m[1];
      const repo = m[2].replace(/\.git$/, "");
      const branch = state.f.branch || "main";
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

      setLoadingFile(true);
      try {
        const res = await fetch(rawUrl);
        if (res.ok) {
          const text = await res.text();
          setState((prev) => ({
            ...prev,
            scan: {
              ...prev.scan,
              keyFiles: {
                ...prev.scan.keyFiles,
                [filePath]: text,
              },
            },
          }));
        }
      } catch (e) {
        console.warn("Could not fetch raw starter file:", e);
      } finally {
        setLoadingFile(false);
      }
    },
    [state.f.repo, state.f.url, state.f.branch, setState]
  );

  const handleSelectFile = useCallback(
    (path: string, category: "rules" | "starter" | "solution") => {
      setActiveFile(path);
      setActiveCategory(category);
      if (category === "solution") {
        setDiffMode(true);
      } else if (category === "rules") {
        setDiffMode(false);
      }
      if (category === "starter" && (!keyFiles[path] || !keyFiles[path].trim())) {
        fetchRawFile(path);
      }
    },
    [keyFiles, fetchRawFile]
  );

  // Automatically select initial active file if none selected
  useEffect(() => {
    if (!activeFile) {
      if (ruleFileNames.length > 0) {
        // Prefer main_test.py or first rule file
        const main = ruleFileNames.find((f) => f.includes("main_test")) || ruleFileNames[0];
        setActiveFile(main);
        setActiveCategory("rules");
      } else if (starterFiles.length > 0) {
        setActiveFile(starterFiles[0]);
        setActiveCategory("starter");
      }
    }
  }, [ruleFileNames, starterFiles, activeFile]);

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

  // Active file content in CodeMirror
  const activeContent = useMemo(() => {
    if (!activeFile) return "";
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
  }, [activeFile, activeCategory, ruleFilesMap, solutionFilesMap, keyFiles, state.f.url, state.f.repo, state.f.branch]);

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

  // Auto-generate startup and test commands with AI on mount if empty
  const hasAutoGeneratedCmdsRef = useRef(false);
  useEffect(() => {
    if (
      (!state.sc.startup.trim() || !state.sc.test.trim()) &&
      !hasAutoGeneratedCmdsRef.current &&
      state.t.tasks.length > 0
    ) {
      hasAutoGeneratedCmdsRef.current = true;
      handleGenerateCommands();
    }
  }, [state.sc.startup, state.sc.test, state.t.tasks.length]);

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
      setState((prev) => ({
        ...prev,
        sc: {
          ...prev.sc,
          startup: res.startup,
          test: res.test,
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

  // Generate Scoring Rules with AI (progressively adding files to left bar as they synthesize)
  const handleGenerateRules = async () => {
    setIsGeneratingRules(true);
    setRulesOpen(true);

    // Identify file extension from stack
    const langList = state.stack.languages || [];
    const isPy =
      langList.some((l) => l.toLowerCase().includes("python")) ||
      !langList.some((l) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const ext = isPy ? "py" : "js";

    // Expected files to dynamically inject
    const expectedFiles = [
      `yuvro_scoring_rules/main_test.${ext}`,
      "yuvro_scoring_rules/readme.md",
      ...state.t.tasks.map((_, i) => `yuvro_scoring_rules/test${i + 1}.${ext}`),
    ];

    // Immediately inject the first file
    setState((prev) => ({
      ...prev,
      sc: {
        ...prev.sc,
        rules: {
          files: {
            [expectedFiles[0]]: `# Synthesizing main entry test harness and environment configuration...\n`,
          },
          fileRules: [],
          timestamp: new Date().toISOString(),
        },
      },
    }));
    setActiveFile(expectedFiles[0]);
    setActiveCategory("rules");

    // Progressively inject remaining files with small interval
    const timers: NodeJS.Timeout[] = [];
    expectedFiles.slice(1).forEach((fname, i) => {
      const t = setTimeout(() => {
        setState((prev) => {
          const currentFiles = prev.sc.rules?.files || {};
          const isReadme = fname.endsWith(".md");
          const note = isReadme
            ? `# Documenting scoring test suite instructions and candidate expectations...\n`
            : `# Generating grading assertions and test checks for Task ${i + 1}...\n`;
          return {
            ...prev,
            sc: {
              ...prev.sc,
              rules: {
                files: {
                  ...currentFiles,
                  [fname]: note,
                },
                fileRules: prev.sc.rules?.fileRules || [],
                timestamp: prev.sc.rules?.timestamp || new Date().toISOString(),
              },
            },
          };
        });
      }, (i + 1) * 350);
      timers.push(t);
    });

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

      timers.forEach((t) => clearTimeout(t));

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
            prev.sc.test ||
            (isPy ? `python yuvro_scoring_rules/main_test.${ext}` : `node yuvro_scoring_rules/main_test.${ext}`),
          rulesOutOfDate: false,
          pushed: null,
          ver: { ...prev.sc.ver, st: "idle", p: -1, done: {} },
        },
      }));

      if (defaultFile) {
        setActiveFile(defaultFile);
        setActiveCategory("rules");
      }
      toast.success("Scoring rules generated");
    } catch (err: any) {
      timers.forEach((t) => clearTimeout(t));
      toast.error(err?.message || "Failed to generate scoring rules");
    } finally {
      setIsGeneratingRules(false);
    }
  };

  // Push Scoring Rules to Repository (Redoes solution, rechecks verification, and pushes)
  const handlePushRules = async () => {
    if (!state.sc.rules?.files) return;
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

      const verResult = await runVerificationStages({
        repoUrl: state.f.url,
        branch: state.f.branch || "main",
        testCommand: state.sc.test,
        tasks: state.t.tasks,
        scoringFiles: state.sc.rules.files,
        totalMarks: Number(state.f.marks) || 10,
        solutionFiles: freshSolutionFiles,
        labContext: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          stack: state.stack,
          repoUrl: state.f.url,
          branch: state.f.branch,
          startup_command: state.sc.startup,
          test_command: state.sc.test,
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
        return;
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
      } else {
        toast.error("Failed to push scoring rules to repository");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to push scoring rules");
    } finally {
      setIsPushingRules(false);
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

    try {
      const result = await runVerificationStages({
        repoUrl: state.f.url,
        branch: state.f.branch || "main",
        testCommand: state.sc.test || "",
        tasks: state.t.tasks,
        scoringFiles: state.sc.rules.files,
        totalMarks: Number(state.f.marks) || 10,
        solutionFiles: state.sc.solutionFiles,
        labContext: {
          title: state.f.title,
          description: state.f.desc,
          role: state.f.role,
          git_repo_starter_url: state.f.url,
          git_repo_starter_branch: state.f.branch,
          startup_command: state.sc.startup,
          test_command: state.sc.test,
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

  return (
    <div className="ide-container">
      {/* 1. TOP RIBBON: Commands & Guided Actions */}
      <div className="ide-ribbon">
        <div className="ide-ribbon-left">
          <div className="ide-cmd-input">
            <label htmlFor="ide-startup">Startup:</label>
            <input
              id="ide-startup"
              type="text"
              value={state.sc.startup}
              onChange={(e) => handleStartupChange(e.target.value)}
              placeholder="e.g. python manage.py runserver"
            />
          </div>

          <div className="ide-cmd-input">
            <label htmlFor="ide-test">Test:</label>
            <input
              id="ide-test"
              type="text"
              value={state.sc.test}
              onChange={(e) => handleTestChange(e.target.value)}
              placeholder="e.g. python yuvro_scoring_rules/main_test.py"
            />
          </div>

          <button
            type="button"
            className="lk sm"
            onClick={handleGenerateCommands}
            disabled={isGeneratingCmds}
            style={{ textDecoration: "underline" }}
          >
            {isGeneratingCmds ? "Generating…" : "Generate with AI"}
          </button>
        </div>

        <div className="ide-ribbon-right">
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

          <button
            type="button"
            className="btn sm"
            onClick={handleRunVerification}
            disabled={isVerifying || !hasRules}
          >
            {isVerifying ? "Verifying…" : "Run full verification"}
          </button>

          {isPushed ? (
            <span className="mut sm">Pushed at {state.sc.pushed}</span>
          ) : (
            <button
              type="button"
              className={isVerified ? "btn sm" : "lk sm"}
              onClick={handlePushRules}
              disabled={isPushingRules || !hasRules}
              style={{ textDecoration: isVerified ? "none" : "underline" }}
            >
              {isPushingRules ? "Verifying & pushing…" : "Push to repository"}
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN SPLIT: File Tree Explorer (Left) & Code Editor (Center) */}
      <div className="ide-split">
        {/* Left Column: File Explorer */}
        <div className="ide-explorer">
          <div className="ide-exp-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files…"
            />
          </div>

          <div className="ide-tree-scroll">
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
        </div>

        {/* Center Column: Code Editor */}
        <div className="ide-editor-area">
          <div className="ide-tab-bar">
            <div className="ide-active-tab">
              <span style={{ fontWeight: 600 }}>
                {activeFile ? activeFile.split("/").pop() : "No file selected"}
              </span>
              {activeFile && (
                <span className="mut sm" style={{ fontSize: "11px", opacity: 0.8 }}>
                  ({activeFile})
                </span>
              )}
              <span className="ide-tab-badge">
                {activeCategory === "rules"
                  ? "· Editable (Scoring Rule)"
                  : activeCategory === "solution"
                  ? "· Editable (Pass Solution)"
                  : loadingFile
                  ? "· Fetching from repository…"
                  : "· Starter Repository (Read-only)"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {hasSolutionDiff && (
                <div
                  style={{
                    display: "flex",
                    gap: "2px",
                    alignItems: "center",
                    background: "var(--gh)",
                    padding: "2px",
                    borderRadius: "4px",
                    border: "1px solid var(--bd)",
                  }}
                >
                  <button
                    type="button"
                    className={`lk sm ${diffMode ? "strong" : ""}`}
                    onClick={() => setDiffMode(true)}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      background: diffMode ? "var(--gs)" : "transparent",
                      textDecoration: "none",
                      fontWeight: diffMode ? 600 : 400,
                    }}
                  >
                    Diff View
                  </button>
                  <button
                    type="button"
                    className={`lk sm ${!diffMode ? "strong" : ""}`}
                    onClick={() => setDiffMode(false)}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      background: !diffMode ? "var(--gs)" : "transparent",
                      textDecoration: "none",
                      fontWeight: !diffMode ? 600 : 400,
                    }}
                  >
                    Code
                  </button>
                </div>
              )}
              {isRulesOutOfDate && activeCategory === "rules" && (
                <span style={{ color: "var(--red)", fontSize: "11.5px" }}>
                  Rules modified · re-verify
                </span>
              )}
              <button
                type="button"
                className="lk sm"
                onClick={handleCopyCode}
                style={{ textDecoration: "underline" }}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="ide-editor-canvas">
            {diffMode && hasSolutionDiff ? (
              <DiffViewer
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
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM DRAWER: Verification Terminal & Output */}
      <div className="ide-console" style={{ height: consoleOpen ? "250px" : "36px" }}>
        <div className="ide-console-hdr">
          <div className="ide-console-tabs">
            <button
              type="button"
              className={`ide-console-tab ${activeConsoleTab === "terminal" ? "active" : ""}`}
              onClick={() => {
                setActiveConsoleTab("terminal");
                if (!consoleOpen) setConsoleOpen(true);
              }}
            >
              Terminal Logs
            </button>
            <button
              type="button"
              className={`ide-console-tab ${activeConsoleTab === "breakdown" ? "active" : ""}`}
              onClick={() => {
                setActiveConsoleTab("breakdown");
                if (!consoleOpen) setConsoleOpen(true);
              }}
            >
              Per-Task Breakdown
            </button>
          </div>

          <div className="ide-console-acts">
            <span
              className="sm"
              style={{
                color:
                  state.sc.ver.st === "passed"
                    ? "#16a34a"
                    : state.sc.ver.st === "failed"
                    ? "#dc2626"
                    : "var(--mut)",
                fontWeight: 500,
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
              className="lk sm"
              onClick={() => setConsoleOpen((prev) => !prev)}
              style={{ textDecoration: "underline" }}
              title="Toggle with Ctrl+J"
            >
              {consoleOpen ? "Minimize (Ctrl+J)" : "Expand (Ctrl+J)"}
            </button>
          </div>
        </div>

        {consoleOpen && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {activeConsoleTab === "terminal" ? (
              <>
                {/* Stage Tabs (0, 1, 2) */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    padding: "6px 14px",
                    borderBottom: "1px solid var(--hl)",
                    background: "var(--bg)",
                    fontSize: "12px",
                  }}
                >
                  {stageTitles.map((title, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="lk sm"
                      onClick={() => setActiveStageTab(idx)}
                      style={{
                        fontWeight: activeStageTab === idx ? 600 : 400,
                        color: activeStageTab === idx ? "var(--fg)" : "var(--mut)",
                        textDecoration: activeStageTab === idx ? "underline" : "none",
                      }}
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
              /* Per-Task Breakdown View */
              <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
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
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 12px",
                      background: "var(--trk)",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
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
    </div>
  );
};
