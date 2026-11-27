import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { labTaskAIService } from "@/services/labTaskAIService";
import {
  WizardState,
  QuestionCategory,
  StackKey,
  TaskItem,
  RunItem,
  ChatMessage,
  ScoringState,
  OPT,
  TYPES,
} from "./types";
import { splitDistribution } from "./adapters/architectAdapter";

const generateQuestionUuid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const getDefaultWizardState = (): WizardState => ({
  questionUuid: generateQuestionUuid(),
  step: 1,
  reached: 1,
  type: "lab",
  f: {
    title: "",
    desc: "",
    domain: OPT.domain[0],
    difficulty: "Easy",
    marks: 10,
    dur: 30,
    scenario: OPT.scenario[0],
    role: "Backend",
    repo: "",
    url: "",
    branch: "main",
  },
  e: {},
  stack: {
    lang: [],
    db: [],
    be: [],
    fe: [],
  },
  custom: {
    lang: [],
    db: [],
    be: [],
    fe: [],
  },
  addTagCategory: null,
  rp: {
    open: false,
    q: "",
    i: 0,
  },
  scan: {
    scanning: false,
    stageIndex: 0,
    files: null,
    fileCount: 0,
    keyFiles: {},
  },
  t: {
    busy: false,
    msgs: [],
    tasks: [],
    runs: [],
    tab: "gen",
    sel: null,
    draft: "",
    ed: null,
    run: 0,
    chats: [],
    editMsg: null,
    editDraft: "",
  },
  sc: {
    startup: "",
    test: "",
    allow: true,
    rules: null,
    pushed: null,
    ver: {
      st: "idle",
      p: -1,
      done: {},
      log: [],
      run: 0,
    },
    open: {},
    genCmd: false,
    genRules: false,
    pushing: false,
  },
  sp: {
    a2: 0.6,
    a3: 0.34,
    b3: 0.24,
  },
  menu: false,
  hmenu: false,
});

export interface WizardContextType {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  setType: (type: QuestionCategory) => void;
  setStep: (step: number) => void;
  setField: (key: keyof WizardState["f"], val: any) => void;
  toggleStackTag: (cat: StackKey, tag: string) => void;
  addCustomTag: (cat: StackKey, tag: string) => boolean;
  removeCustomTag: (cat: StackKey, tag: string) => void;
  setAddTagCategory: (cat: StackKey | null) => void;
  toggleRepoDropdown: () => void;
  setRepoFilter: (q: string) => void;
  selectRepo: (repo: { o: string; n: string; v: string; b: string; id: string }) => void;
  setRepoDropdownOpen: (open: boolean) => void;
  tsum: number;
  tmin: number;
  lockMsg: string;
  warnMsg: string;
  canPublish: boolean;
  publishBlockReason: string;
  isCloningWorkspace: boolean;
  markPublished: () => void;
  cleanupWorkspace: () => void;
  cleanupDraft: () => void;
  normalizeMarksAndTime: () => void;
  nextStep: () => void | Promise<void>;
  prevStep: () => void;
}

const WizardContext = createContext<WizardContextType | null>(null);

export function WizardProvider({
  children,
  initialCategory,
  onCategoryChange,
  editingId,
  initialData,
  initialStep,
  onStepChange,
}: {
  children: React.ReactNode;
  initialCategory?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  onCategoryChange?: (category: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE") => void;
  editingId?: string | null;
  initialData?: any;
  initialStep?: number;
  onStepChange?: (step: number) => void;
}) {
  const { user } = useAuth();
  const [isCloningWorkspace, setIsCloningWorkspace] = useState(false);
  const isPublishedRef = useRef(false);
  const workspaceIdRef = useRef<string | null>(null);

  const storageKey = useMemo(() => {
    if (editingId) return `yuvro_wizard_edit_${editingId}`;
    const cat = (initialCategory || "LAB").toLowerCase();
    return `yuvro_wizard_draft_${cat}`;
  }, [editingId, initialCategory]);

  const [state, setState] = useState<WizardState>(() => {
    const base = getDefaultWizardState();
    if (initialCategory) {
      if (initialCategory === "SYSTEM_DESIGN") base.type = "design";
      else if (initialCategory === "KNOWLEDGE") base.type = "know";
      else base.type = "lab";
    }

    // Attempt to restore saved draft from localStorage
    let savedDraft: any = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          savedDraft = JSON.parse(raw);
        }
      } catch (e) {
        console.warn("Failed to parse wizard draft from localStorage", e);
      }
    }

    if (savedDraft) {
      if (savedDraft.questionUuid) base.questionUuid = savedDraft.questionUuid;
      if (savedDraft.f) base.f = { ...base.f, ...savedDraft.f };
      if (savedDraft.stack) base.stack = { ...base.stack, ...savedDraft.stack };
      if (savedDraft.custom) base.custom = { ...base.custom, ...savedDraft.custom };
      if (savedDraft.scan) base.scan = { ...base.scan, ...savedDraft.scan };
      if (savedDraft.t) {
        base.t = {
          ...base.t,
          ...savedDraft.t,
          tasks: savedDraft.t.tasks || base.t.tasks,
          msgs: savedDraft.t.msgs || base.t.msgs,
          runs: savedDraft.t.runs || base.t.runs,
          chats: savedDraft.t.chats || base.t.chats,
        };
      }
      if (savedDraft.sc) {
        base.sc = {
          ...base.sc,
          ...savedDraft.sc,
        };
      }
      if (typeof savedDraft.reached === "number") {
        base.reached = savedDraft.reached;
      }
      if (typeof savedDraft.step === "number") {
        base.step = savedDraft.step;
      }
    }

    // If editing existing question from database, populate with initialData if not already in draft
    if (initialData && !savedDraft) {
      base.f.title = initialData.title || base.f.title;
      base.f.desc = initialData.description || base.f.desc;
      base.f.marks = initialData.marks || base.f.marks;
      base.f.dur = initialData.duration_minutes || base.f.dur;
      base.f.url = initialData.git_repo_starter_url || base.f.url;
      base.f.branch = initialData.git_repo_starter_branch || base.f.branch;
      base.f.github_repo_id = initialData.github_repo_id;
      base.f.github_installation_id = initialData.github_installation_id;
      base.f.github_app_installation = initialData.github_app_installation;
      base.sc.startup = initialData.startup_command || "";
      base.sc.test = initialData.test_command || "";
      base.sc.allow = initialData.allow_task_selection ?? true;

      if (Array.isArray(initialData.tasks) && initialData.tasks.length > 0) {
        base.t.tasks = initialData.tasks.map((t: any, idx: number) => ({
          id: t.id || `t${idx + 1}`,
          title: t.title || `Task ${idx + 1}`,
          diff: (t.difficulty === "HARD" ? "Hard" : t.difficulty === "MEDIUM" ? "Medium" : "Easy") as any,
          desc: t.description || "",
          ref: typeof t.solution === "string" ? t.solution : JSON.stringify(t.solution || {}, null, 2),
          marks: Number(t.marks) || 5,
          min: Number(t.duration_minutes || t.estimated_minutes) || 10,
          dep: t.parent_task_id || t.parent_task || "",
        }));
        base.reached = Math.max(base.reached, 3);
      }
    }

    // Determine target step: URL search param, initialStep, or savedDraft.step
    const urlStep = typeof window !== "undefined" ? (() => {
      const sp = new URLSearchParams(window.location.search).get("step");
      const n = sp ? parseInt(sp, 10) : NaN;
      return n >= 1 && n <= 4 ? n : undefined;
    })() : undefined;

    const targetStep = initialStep || urlStep || (savedDraft ? savedDraft.step : undefined);
    if (targetStep && targetStep >= 1 && targetStep <= 4) {
      base.step = targetStep;
      base.reached = Math.max(base.reached, targetStep);
    }

    return base;
  });

  // Keep URL in sync on initial render if step parameter is missing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (!url.searchParams.get("step")) {
        url.searchParams.set("step", String(state.step));
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [state.step]);

  // Sync initialStep prop if changed externally
  useEffect(() => {
    if (initialStep && initialStep !== state.step && initialStep >= 1 && initialStep <= 4) {
      setState((prev) => ({
        ...prev,
        step: initialStep,
        reached: Math.max(prev.reached, initialStep),
      }));
    }
  }, [initialStep]);

  // Listen to popstate (browser back / forward button)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search).get("step");
      const n = sp ? parseInt(sp, 10) : NaN;
      if (n >= 1 && n <= 4) {
        setState((prev) => ({
          ...prev,
          step: n,
          reached: Math.max(prev.reached, n),
        }));
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Auto-save draft to localStorage whenever relevant state changes
  useEffect(() => {
    if (typeof window === "undefined" || isPublishedRef.current) return;
    try {
      const draftData = {
        questionUuid: state.questionUuid,
        step: state.step,
        reached: state.reached,
        type: state.type,
        f: state.f,
        stack: state.stack,
        custom: state.custom,
        scan: {
          ...state.scan,
          scanning: false,
          stageIndex: 0,
        },
        t: {
          tasks: state.t.tasks,
          msgs: state.t.msgs,
          runs: state.t.runs,
          chats: state.t.chats,
          draft: state.t.draft,
          sel: state.t.sel,
          tab: state.t.tab,
        },
        sc: {
          startup: state.sc.startup,
          test: state.sc.test,
          allow: state.sc.allow,
          rules: state.sc.rules,
          open: state.sc.open,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(draftData));
    } catch (e) {
      console.warn("Failed to auto-save wizard draft to localStorage:", e);
    }
  }, [state, storageKey]);

  // Sync category changes from route/parent
  useEffect(() => {
    if (initialCategory) {
      const targetType: QuestionCategory =
        initialCategory === "SYSTEM_DESIGN" ? "design" : initialCategory === "KNOWLEDGE" ? "know" : "lab";
      setState((prev) => {
        if (prev.type === targetType) return prev;
        return {
          ...prev,
          type: targetType,
          step: 1,
          reached: 1,
        };
      });
    }
  }, [initialCategory]);

  const setType = useCallback((type: QuestionCategory) => {
    setState((prev) => ({
      ...prev,
      type,
      step: 1,
      reached: 1,
      e: {},
    }));
    if (onCategoryChange) {
      if (type === "design") onCategoryChange("SYSTEM_DESIGN");
      else if (type === "know") onCategoryChange("KNOWLEDGE");
      else onCategoryChange("LAB");
    }
  }, [onCategoryChange]);

  const setStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      step,
      reached: Math.max(prev.reached, step),
      menu: false,
    }));

    if (onStepChange) {
      onStepChange(step);
    } else if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(step));
      window.history.replaceState({}, "", url.toString());
    }
  }, [onStepChange]);

  const setField = useCallback((key: keyof WizardState["f"], val: any) => {
    setState((prev) => {
      const nextF = { ...prev.f, [key]: val };
      const nextE = { ...prev.e, [key]: "" };

      // If starter URL changes, update repo name if parseable
      if (key === "url" && typeof val === "string") {
        const m = /github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(val.trim());
        if (m) {
          nextF.repo = `${m[1]}/${m[2]}`;
          if (!prev.f.title || prev.f.title === prev.f.repo || prev.f.title === prev.f.repo.split("/")[1]) {
            nextF.title = m[2];
          }
        }
      }

      // Changing repo/url resets scan
      let nextScan = prev.scan;
      if (key === "url" || key === "branch") {
        nextScan = { ...prev.scan, files: null, fileCount: 0 };
      }

      return { ...prev, f: nextF, e: nextE, scan: nextScan };
    });
  }, []);

  const toggleStackTag = useCallback((cat: StackKey, tag: string) => {
    setState((prev) => {
      const current = prev.stack[cat] || [];
      const has = current.includes(tag);
      const updated = has ? current.filter((x) => x !== tag) : [...current, tag];
      return {
        ...prev,
        stack: { ...prev.stack, [cat]: updated },
        e: { ...prev.e, stack: "" },
      };
    });
  }, []);

  const addCustomTag = useCallback((cat: StackKey, raw: string): boolean => {
    const val = String(raw).trim().replace(/\s+/g, " ");
    if (!val) return false;

    setState((prev) => {
      const customs = prev.custom[cat] || [];
      const currentStack = prev.stack[cat] || [];

      // Check if already in custom or current
      const existsInCustom = customs.some((x) => x.toLowerCase() === val.toLowerCase());
      const nextCustoms = existsInCustom ? customs : [...customs, val];

      const existsInStack = currentStack.some((x) => x.toLowerCase() === val.toLowerCase());
      const nextStack = existsInStack ? currentStack : [...currentStack, val];

      return {
        ...prev,
        custom: { ...prev.custom, [cat]: nextCustoms },
        stack: { ...prev.stack, [cat]: nextStack },
        addTagCategory: null,
        e: { ...prev.e, stack: "" },
      };
    });
    return true;
  }, []);

  const removeCustomTag = useCallback((cat: StackKey, tag: string) => {
    setState((prev) => {
      const customs = (prev.custom[cat] || []).filter((x) => x !== tag);
      const currentStack = (prev.stack[cat] || []).filter((x) => x !== tag);
      return {
        ...prev,
        custom: { ...prev.custom, [cat]: customs },
        stack: { ...prev.stack, [cat]: currentStack },
      };
    });
  }, []);

  const setAddTagCategory = useCallback((cat: StackKey | null) => {
    setState((prev) => ({ ...prev, addTagCategory: cat }));
  }, []);

  const toggleRepoDropdown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rp: { ...prev.rp, open: !prev.rp.open },
    }));
  }, []);

  const setRepoDropdownOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      rp: { ...prev.rp, open },
    }));
  }, []);

  const setRepoFilter = useCallback((q: string) => {
    setState((prev) => ({
      ...prev,
      rp: { ...prev.rp, q, i: 0 },
    }));
  }, []);

  const selectRepo = useCallback(
    (repo: { o: string; n: string; v: string; b: string; id: string; installation_id?: string }) => {
      setState((prev) => {
        const repoName = repo.n || repo.id.split("/")[1] || repo.id;
        return {
          ...prev,
          f: {
            ...prev.f,
            repo: repo.id,
            url: `https://github.com/${repo.id}`,
            branch: repo.b || "main",
            github_installation_id: (repo as any).installation_id || prev.f.github_installation_id,
            github_app_installation: (repo as any).installation_id || prev.f.github_app_installation,
            title: repoName,
          },
          rp: { ...prev.rp, open: false, q: "" },
          scan: { ...prev.scan, files: null, fileCount: 0 },
          e: { ...prev.e, title: "", url: "", branch: "" },
        };
      });
    },
    []
  );

  // Totals
  const tsum = useMemo(() => {
    return state.t.tasks.reduce((a, x) => a + (Number(x.marks) || 0), 0);
  }, [state.t.tasks]);

  const tmin = useMemo(() => {
    return state.t.tasks.reduce((a, x) => a + (Number(x.min) || 0), 0);
  }, [state.t.tasks]);

  // Publish validation check
  const publishBlockReason = useMemo(() => {
    if (state.type === "know") {
      if (!state.f.title.trim()) return "Title is required before publishing";
      if (!state.f.desc.trim()) return "Description is required before publishing";
      return "";
    }
    if (state.type === "design") {
      if (!state.f.title.trim()) return "Title is required before publishing";
      if (!state.f.desc.trim()) return "Description is required before publishing";
      if (!state.t.tasks.length) return "Add at least one task before publishing";
      return "";
    }
    // LAB:
    if (!state.t.tasks.length) return "Add at least one task before publishing";
    if (!state.sc.test.trim()) return "Configure a test command before publishing";
    if (!state.sc.rules || !state.sc.rules.files || Object.keys(state.sc.rules.files).length === 0) {
      return "Generate scoring rules before publishing";
    }
    const ver = state.sc.ver;
    if ((ver.st !== "done" && ver.st !== "passed") || !ver.done[0] || !ver.done[1]) {
      return "Run full verification before publishing";
    }
    if (!state.sc.pushed) {
      return "Push scoring rules to repository before publishing";
    }
    return "";
  }, [state.type, state.f.title, state.f.desc, state.t.tasks.length, state.sc.test, state.sc.rules, state.sc.ver, state.sc.pushed]);

  const canPublish = useMemo(() => {
    return !publishBlockReason;
  }, [publishBlockReason]);

  // Step lock message
  const lockMsg = useMemo(() => {
    if (state.type === "lab") {
      if (state.step === 1 && !(state.scan && state.scan.files)) {
        return "Scan the repository to continue";
      }
      if (state.step === 3) {
        if (state.t.busy) return "The architect is working…";
        if (state.t.ed && (state.t.tasks.some((x) => x.id === state.t.ed!.id) || !state.t.ed.id)) {
          return "Save or cancel your edit to continue";
        }
        if (!state.t.tasks.length) return "Add tasks to continue";
      }
      if (state.step === 4) {
        return publishBlockReason;
      }
    } else if (state.type === "design") {
      if (state.step === 2) {
        if (state.t.busy) return "The architect is working…";
        if (state.t.ed) return "Save or cancel your edit to continue";
        if (!state.t.tasks.length) return "Add tasks to continue";
        return publishBlockReason;
      }
    } else if (state.type === "know") {
      if (state.step === 1) {
        return publishBlockReason;
      }
    }
    return "";
  }, [state.step, state.type, state.scan, state.t.busy, state.t.ed, state.t.tasks.length, publishBlockReason]);

  const warnMsg = useMemo(() => {
    const isTasks = (state.type === "lab" && state.step === 3) || (state.type === "design" && state.step === 2);
    if (!isTasks || !state.t.tasks.length) return "";
    if (tsum !== Number(state.f.marks)) {
      return `Marks add up to ${tsum} of ${state.f.marks}`;
    }
    return "";
  }, [state.step, state.type, state.t.tasks.length, tsum, state.f.marks]);

  const normalizeMarksAndTime = useCallback(() => {
    setState((prev) => {
      const tasks = prev.t.tasks;
      if (!tasks.length) return prev;

      const targetMarks = Number(prev.f.marks) || 10;
      const targetMin = Number(prev.f.dur) || 30;

      const marksWeights = tasks.map((t) => Number(t.marks) || 1);
      const minWeights = tasks.map((t) => Number(t.min) || 1);

      const newMarks = splitDistribution(marksWeights, targetMarks);
      const newMins = splitDistribution(minWeights, targetMin);

      const nextTasks = tasks.map((t, idx) => ({
        ...t,
        marks: newMarks[idx],
        min: newMins[idx],
      }));

      return {
        ...prev,
        t: {
          ...prev.t,
          tasks: nextTasks,
        },
      };
    });
  }, []);

  const nextStep = useCallback(async () => {
    if (state.type === "lab") {
      if (state.step === 1) {
        // Step 1: Repository and scan
        const e: Record<string, string> = {};
        if (!state.f.url.trim()) e.url = "Starter repository URL is required";
        if (!state.f.branch.trim()) e.branch = "Branch is required";
        if (!state.scan.files) {
          // Cannot proceed without scanning repository
          return;
        }
        if (Object.keys(e).length > 0) {
          setState((prev) => ({ ...prev, e }));
          return;
        }

        const targetUrl = state.f.url.trim();
        const targetBranch = state.f.branch.trim() || "main";
        const alreadyCloned =
          Boolean(state.scan.workspaceId) &&
          state.scan.clonedRepoUrl === targetUrl &&
          state.scan.clonedBranch === targetBranch;

        if (!alreadyCloned) {
          setIsCloningWorkspace(true);
          try {
            const recruiterUuid = String((user as any)?.uuid || (user as any)?.id || "recruiter");
            const questionUuid = state.questionUuid || editingId || generateQuestionUuid();
            let authToken = state.scan.cloneToken;
            if (!authToken && targetUrl) {
              try {
                const targetRepo = state.f.url || state.f.repo;
                const inspected = await labTaskAIService.inspectRepo({
                  repo_identifier: targetRepo,
                  branch: targetBranch,
                  installation_id: state.f.github_installation_id || state.f.github_app_installation || null,
                  include_clone_token: true,
                });
                authToken = inspected.clone_token;
              } catch (tokErr) {
                console.warn("Could not retrieve clone token prior to workspace clone:", tokErr);
              }
            }
            const ws = await labTaskAIService.createTempWorkspace({
              repo_url: targetUrl,
              branch: targetBranch,
              auth_token: authToken,
              recruiter_uuid: recruiterUuid,
              question_uuid: questionUuid,
              scoring_files: state.sc.rules?.files || undefined,
            });
            setState((prev) => ({
              ...prev,
              questionUuid,
              scan: {
                ...prev.scan,
                workspaceId: ws.temp_workspace_id,
                clonedRepoUrl: targetUrl,
                clonedBranch: targetBranch,
                files: prev.scan.files && prev.scan.files.length > 0 ? prev.scan.files : (ws.files || []),
                fileCount: prev.scan.fileCount > 0 ? prev.scan.fileCount : (ws.file_count || 0),
                keyFiles: { ...(ws.key_files || {}), ...(prev.scan.keyFiles || {}) },
              },
            }));
          } catch (err: any) {
            toast.error(err?.message || "Failed to clone repository into recruiter workspace");
            return;
          } finally {
            setIsCloningWorkspace(false);
          }
        }

        setStep(2);
      } else if (state.step === 2) {
        // Step 2: Basics
        const e: Record<string, string> = {};
        if (!state.f.title.trim()) e.title = "Title is required";
        if (!state.f.desc.trim()) e.desc = "Description is required";
        if (Number(state.f.marks) <= 0) e.marks = "Marks must be greater than 0";
        if (Number(state.f.dur) <= 0) e.dur = "Duration must be greater than 0";
        if (Object.keys(e).length > 0) {
          setState((prev) => ({ ...prev, e }));
          return;
        }
        setStep(3);
      } else if (state.step === 3) {
        // Step 3: Tasks
        if (!state.t.tasks.length || state.t.busy || state.t.ed) return;

        // Transition immediately to Step 4 page
        setStep(4);

        // If the starter repo was empty (0 files), auto-scaffold a real starter codebase with README & requirements
        const wsId = state.scan.workspaceId;
        const isRepoEmpty = (!state.scan.files || state.scan.files.length === 0) || state.scan.fileCount === 0;

        if (wsId && isRepoEmpty) {
          setIsCloningWorkspace(true);
          try {
            const labCtx = {
              title: state.f.title,
              description: state.f.desc,
              scenario: state.f.scenario,
              domain: state.f.domain,
              difficulty: state.f.difficulty,
              programming_languages: state.stack.lang || [],
              backend_frameworks: state.stack.be || [],
              frontend_frameworks: state.stack.fe || [],
              databases: state.stack.db || [],
            };

            const scaffold = await labTaskAIService.generateStarterCodebase({
              lab_context: labCtx,
              tasks: state.t.tasks,
            });

            if (scaffold && scaffold.files && Object.keys(scaffold.files).length > 0) {
              const writeRes = await labTaskAIService.writeWorkspaceFiles({
                temp_workspace_id: wsId,
                files: scaffold.files,
                update_baseline: true,
              });

              setState((prev) => {
                const updatedFiles = writeRes.files && writeRes.files.length > 0 ? writeRes.files : Object.keys(scaffold.files);
                const updatedKeyFiles = writeRes.key_files || scaffold.files;

                return {
                  ...prev,
                  scan: {
                    ...prev.scan,
                    files: updatedFiles,
                    fileCount: updatedFiles.length,
                    keyFiles: {
                      ...(prev.scan.keyFiles || {}),
                      ...updatedKeyFiles,
                    },
                  },
                  sc: {
                    ...prev.sc,
                    startup: prev.sc.startup || scaffold.startup_command || "",
                    test: (prev.sc.test && prev.sc.test.includes("yuvro_scoring_rules"))
                      ? prev.sc.test
                      : (scaffold.test_command || "python yuvro_scoring_rules/main_test.py"),
                  },
                };
              });
              toast.success(`Scaffolded starter codebase (${Object.keys(scaffold.files).length} files created)`);
            }
          } catch (scaffoldErr: any) {
            console.warn("Auto-scaffold starter codebase error:", scaffoldErr);
          } finally {
            setIsCloningWorkspace(false);
          }
        }
      }
    } else if (state.type === "design") {
      if (state.step === 1) {
        // Step 1: Basics
        const e: Record<string, string> = {};
        if (!state.f.title.trim()) e.title = "Title is required";
        if (!state.f.desc.trim()) e.desc = "Description is required";
        if (Number(state.f.marks) <= 0) e.marks = "Marks must be greater than 0";
        if (Number(state.f.dur) <= 0) e.dur = "Duration must be greater than 0";
        if (Object.keys(e).length > 0) {
          setState((prev) => ({ ...prev, e }));
          return;
        }
        setStep(2);
      }
    }
  }, [state.step, state.type, state.f, state.scan, state.sc.rules, state.questionUuid, state.t, user, setStep]);

  const prevStep = useCallback(() => {
    if (state.step > 1) {
      setStep(state.step - 1);
    }
  }, [state.step, setStep]);

  const markPublished = useCallback(() => {
    isPublishedRef.current = true;
  }, []);

  const cleanupDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        // ignore
      }
    }
  }, [storageKey]);

  const cleanupWorkspace = useCallback(() => {
    const wsId = workspaceIdRef.current;
    if (wsId && !isPublishedRef.current) {
      workspaceIdRef.current = null;
      labTaskAIService.deleteTempWorkspace(wsId);
    }
  }, []);

  useEffect(() => {
    workspaceIdRef.current = state.scan.workspaceId || null;
  }, [state.scan.workspaceId]);

  return (
    <WizardContext.Provider
      value={{
        state,
        setState,
        setType,
        setStep,
        setField,
        toggleStackTag,
        addCustomTag,
        removeCustomTag,
        setAddTagCategory,
        toggleRepoDropdown,
        setRepoFilter,
        selectRepo,
        setRepoDropdownOpen,
        tsum,
        tmin,
        lockMsg,
        warnMsg,
        canPublish,
        publishBlockReason,
        isCloningWorkspace,
        markPublished,
        cleanupWorkspace,
        cleanupDraft,
        normalizeMarksAndTime,
        nextStep,
        prevStep,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
}
