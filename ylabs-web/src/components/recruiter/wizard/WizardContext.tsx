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
  const [state, setState] = useState<WizardState>(() => {
    const base = getDefaultWizardState();
    if (initialCategory) {
      if (initialCategory === "SYSTEM_DESIGN") base.type = "design";
      else if (initialCategory === "KNOWLEDGE") base.type = "know";
      else base.type = "lab";
    }

    // Try restoring draft from localStorage if not editing an existing persisted question
    if (!editingId && typeof window !== "undefined") {
      try {
        // Clear any legacy draft containing dummy data
        localStorage.removeItem("yuvro_wizard_draft_new");
        const saved = localStorage.getItem("yuvro_wizard_draft_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            // Discard draft if it contains legacy dummy title
            if (parsed.f?.title === "Build a payment webhook retry service") {
              localStorage.removeItem("yuvro_wizard_draft_v2");
            } else {
              return {
                ...base,
                ...parsed,
                f: { ...base.f, ...parsed.f },
                scan: { ...base.scan, ...parsed.scan, scanning: false },
                t: { ...base.t, ...parsed.t, busy: false, ed: null },
                sc: {
                  ...base.sc,
                  ...parsed.sc,
                  genCmd: false,
                  genRules: false,
                  pushing: false,
                  ver: { ...base.sc.ver, ...parsed.sc?.ver, st: "idle" },
                },
              };
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // If editing existing question, populate with initialData
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
        base.reached = Math.max(base.reached, 4);
      }
    }

    return base;
  });

  // Auto-persist draft to localStorage (when not editing an existing DB question)
  useEffect(() => {
    if (editingId) return;
    try {
      if (typeof window !== "undefined") {
        const toSave = {
          type: state.type,
          step: state.step,
          reached: state.reached,
          f: state.f,
          stack: state.stack,
          custom: state.custom,
          scan: { files: state.scan.files, fileCount: state.scan.fileCount },
          t: { tasks: state.t.tasks, runs: state.t.runs, msgs: state.t.msgs, chats: state.t.chats },
          sc: {
            startup: state.sc.startup,
            test: state.sc.test,
            allow: state.sc.allow,
            rules: state.sc.rules,
            pushed: state.sc.pushed,
            ver: state.sc.ver,
          },
        };
        localStorage.setItem("yuvro_wizard_draft_v2", JSON.stringify(toSave));
      }
    } catch {
      // ignore
    }
  }, [state, editingId]);

  const setType = useCallback((type: QuestionCategory) => {
    setState((prev) => ({ ...prev, type }));
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

  const selectRepo = useCallback((repo: { o: string; n: string; v: string; b: string; id: string }) => {
    setState((prev) => ({
      ...prev,
      f: {
        ...prev.f,
        repo: repo.id,
        url: `https://github.com/${repo.id}`,
        branch: repo.b || "main",
      },
      rp: { ...prev.rp, open: false, q: "" },
      scan: { ...prev.scan, files: null, fileCount: 0 },
    }));
  }, []);

  // Totals
  const tsum = useMemo(() => {
    return state.t.tasks.reduce((a, x) => a + (Number(x.marks) || 0), 0);
  }, [state.t.tasks]);

  const tmin = useMemo(() => {
    return state.t.tasks.reduce((a, x) => a + (Number(x.min) || 0), 0);
  }, [state.t.tasks]);

  // Publish validation check
  const publishBlockReason = useMemo(() => {
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
  }, [state.t.tasks.length, state.sc.test, state.sc.rules, state.sc.ver, state.sc.pushed]);

  const canPublish = useMemo(() => {
    return !publishBlockReason;
  }, [publishBlockReason]);

  // Step lock message
  const lockMsg = useMemo(() => {
    if (state.step === 3 && !(state.scan && state.scan.files)) {
      return "Scan the repository to continue";
    }
    if (state.step === 4) {
      if (state.t.busy) return "The architect is working…";
      if (state.t.ed) return "Save or cancel your edit to continue";
      if (!state.t.tasks.length) return "Add tasks to continue";
    }
    if (state.step === 5) {
      return publishBlockReason;
    }
    return "";
  }, [state.step, state.scan, state.t.busy, state.t.ed, state.t.tasks.length, publishBlockReason]);

  const warnMsg = useMemo(() => {
    if (state.step !== 4 || !state.t.tasks.length) return "";
    if (tsum !== Number(state.f.marks)) {
      return `Marks add up to ${tsum} of ${state.f.marks}`;
    }
    return "";
  }, [state.step, state.t.tasks.length, tsum, state.f.marks]);

  const nextStep = useCallback(() => {
    if (state.step === 1) {
      // Validate step 1
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
    } else if (state.step === 2) {
      // Validate step 2
      const e: Record<string, string> = {};
      if (!state.f.url.trim()) e.url = "Starter repository URL is required";
      if (!state.f.branch.trim()) e.branch = "Branch is required";
      if (Object.keys(e).length > 0) {
        setState((prev) => ({ ...prev, e }));
        return;
      }
      setStep(3);
    } else if (state.step === 3) {
      if (!state.scan.files) return;
      setStep(4);
    } else if (state.step === 4) {
      if (!state.t.tasks.length || state.t.busy || state.t.ed) return;
      setStep(5);
    }
  }, [state.step, state.f, state.scan.files, state.t, setStep]);

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
