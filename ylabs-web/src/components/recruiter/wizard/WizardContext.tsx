import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
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

export const getDefaultWizardState = (): WizardState => ({
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
  normalizeMarksAndTime: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const WizardContext = createContext<WizardContextType | null>(null);

export function WizardProvider({
  children,
  initialCategory,
  onCategoryChange,
  editingId,
  initialData,
}: {
  children: React.ReactNode;
  initialCategory?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  onCategoryChange?: (category: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE") => void;
  editingId?: string | null;
  initialData?: any;
}) {
  // Purge any stale wizard drafts from localStorage so creating questions always starts fresh
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("yuvro_wizard_draft_v2");
      localStorage.removeItem("yuvro_wizard_draft_new");
      localStorage.removeItem("yuvro_wizard_draft");
    } catch {
      // ignore
    }
  }

  const [state, setState] = useState<WizardState>(() => {
    const base = getDefaultWizardState();
    if (initialCategory) {
      if (initialCategory === "SYSTEM_DESIGN") base.type = "design";
      else if (initialCategory === "KNOWLEDGE") base.type = "know";
      else base.type = "lab";
    }

    // If editing existing question from database, populate with initialData
    if (initialData) {
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

    return base;
  });

  // Ensure localStorage is kept clean of any wizard drafts
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("yuvro_wizard_draft_v2");
        localStorage.removeItem("yuvro_wizard_draft_new");
        localStorage.removeItem("yuvro_wizard_draft");
      } catch {
        // ignore
      }
    }
  }, []);

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
  }, []);

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
    if ((ver.st !== "done" && ver.st !== "passed") || !ver.done[1] || !ver.done[2]) {
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
        if (state.t.ed) return "Save or cancel your edit to continue";
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

  const nextStep = useCallback(() => {
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
        setStep(4);
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
  }, [state.step, state.type, state.f, state.scan.files, state.t, setStep]);

  const prevStep = useCallback(() => {
    if (state.step > 1) {
      setStep(state.step - 1);
    }
  }, [state.step, setStep]);

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
