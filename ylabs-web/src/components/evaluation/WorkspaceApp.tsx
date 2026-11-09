import { createFileRoute, useNavigate, useSearch, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { evaluationService } from "@/services/evaluationService";
import { yhubApiAuthUtil, restApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { VitarkaInterviewScreen, type VitarkaInterviewScreenRef } from "@/components/discussion/VitarkaInterviewScreen";
import { ChevronDown, ChevronRight, Sun, Moon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { TicketIDE } from "@/routes/student.lab.$slug.ticket.$ticketId";
import ProctoringGate, { ProctoringData } from "@/components/evaluation/ProctoringGate";
import { useProctoring } from "@/hooks/useProctoring";
import { getGlobalProctoringData, setGlobalProctoringData, clearGlobalProctoringData } from "@/utils/proctoringStore";
import { EvaluationSystemDesignSection } from "@/components/evaluation/EvaluationSystemDesignSection";
// Extracted from route file to fix code-split warning


type LabId = string;
type SectionId = string;

interface KnowledgeQuestion {
  id: string;
  q: string;
  format: string;
  options: string[];
  correct: number;
  marks: number;
}

type AppSection = 
  | { type: "LAB", id: string, title: string, labs: RealLab[], proctoring: any }
  | { type: "KNOWLEDGE_ASSESSMENT", id: string, title: string, questions: KnowledgeQuestion[], proctoring: any }
  | { type: "SYSTEM_DESIGN", id: string, title: string, description?: string, duration_minutes?: number, marks?: number, challenge: any, questions?: any[], proctoring: any }
  | { type: "VITARKA_AI_INTERVIEW", id: string, title: string, description?: string, proctoring: any };

interface RealLab {
  id: string;
  title: string;
  sub: string;
  tag: string;
  type?: string;
  ticket_type?: string;
  minutes: number;
  problem: string;
  tasks: { id: string; title: string; description: string; original_index?: number; marks?: number; duration_minutes?: number; parent_task_id?: string; scoring_rules?: any; solution?: any; expected_output?: any }[];
  file: string;
  code: string;
  terminal: string[];
  startup_command?: string;
  test_command?: string;
  connection_url?: string;
  marks?: number;
  points?: number;
  max_score?: number;
  selected_task_ids?: string[];
  selected_task_id?: string;
  solution?: any;
  solution_files?: any[];
  solutions?: any[];
}



const DISCUSSION_QUESTIONS = [
  "Walk me through the regression you identified in the payments queue. Why do you think it was introduced?",
  "You chose exponential backoff for retries — how would you decide the max attempts and the ceiling?",
  "For the SQL rollup, what led you to your index choice, and what does it cost on the write path?",
  "Imagine the events table grows 10× next quarter. What breaks first?",
  "If you had another 30 minutes, what would you improve about either solution?",
];

const TOTAL_SECONDS = 60 * 60;
const DISCUSSION_LOCK_SECONDS = 15 * 60;


export function Workspace({ previewData, evaluationId: propEvaluationId }: { previewData?: any; evaluationId?: string } = {}) {
  const nav = useNavigate({ from: undefined as any });
  const search: any = useRouterState({ select: (s) => s.location.search });
  const evaluationId = propEvaluationId || previewData?.id || previewData?.evaluation_id || (search?.e || '');
  const isRecruiterPreview = !!previewData;
  const isPreviewMode = search?.preview === "true" || !!previewData;

  const [appSections, setAppSections] = useState<AppSection[]>([]);
  const [labsData, setLabsData] = useState<RealLab[]>([]);
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>(DISCUSSION_QUESTIONS);
  const [debugData, setDebugData] = useState<any>(null);  
  
  useEffect(() => {
    if (previewData) {
      processWorkspaceData(previewData);
    } else if (evaluationId) {
      evaluationService.getWorkspaceData(evaluationId)
        .then(res => processWorkspaceData(res))
        .catch(err => setDebugData({ error: err.message || err.toString() }));
    }
  }, [evaluationId, previewData]);

  const processWorkspaceData = (res: any) => {
    setDebugData(res);
    const mappedSections: AppSection[] = [];
    let durationMinutes = 0;
    
    let dQs: string[] = [];
    let mappedLabs: RealLab[] = [];
    const extractQuestions = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.text) dQs.push(n.text);
        if (n.follow_ups && n.follow_ups.length > 0) extractQuestions(n.follow_ups);
      }
    };

    (res.sections || []).forEach((sec: any) => {
          let pc: any = {};
          try { pc = typeof sec.proctoring_config === 'string' ? JSON.parse(sec.proctoring_config) : (sec.proctoring_config || {}); } catch {}

          if (sec.type === "LAB") {
            const rawQuestions = sec.questions || [];
            const unifiedQuestions: any[] = [];
            const seenQIds = new Map<string, any>();

            rawQuestions.forEach((q: any) => {
              const qId = String(typeof q === 'object' ? (q.id || q.lab_id || "") : q);
              if (!qId) return;
              if (!seenQIds.has(qId)) {
                const copy = typeof q === 'object' ? { ...q } : { id: qId };
                if (copy.selected_task_id && (!copy.selected_task_ids || copy.selected_task_ids.length === 0)) {
                  copy.selected_task_ids = [String(copy.selected_task_id)];
                }
                seenQIds.set(qId, copy);
                unifiedQuestions.push(copy);
              } else {
                const existing = seenQIds.get(qId);
                const currentSet = new Set((existing.selected_task_ids || []).map(String));
                if (q.selected_task_ids) {
                  q.selected_task_ids.forEach((tid: string) => currentSet.add(String(tid)));
                }
                if (q.selected_task_id) {
                  currentSet.add(String(q.selected_task_id));
                }
                existing.selected_task_ids = Array.from(currentSet);
              }
            });

            unifiedQuestions.forEach((q: any) => {
              const isDbOnly = q.type === "DATABASE" || q.ticket_type === "database";
              const detectedTag = (
                (isDbOnly && q.databases && q.databases.length > 0 ? q.databases[0] : null) ||
                (q.backend_frameworks && q.backend_frameworks.length > 0 ? q.backend_frameworks[0] : null) ||
                (q.programming_languages && q.programming_languages.length > 0 ? q.programming_languages[0] : null) ||
                (q.databases && q.databases.length > 0 ? q.databases[0] : null) ||
                "bash"
              ).toLowerCase();

              const allTasks = Array.isArray(q.tasks) 
                ? q.tasks.map((t: any, idx: number) => ({ ...t, original_index: idx }))
                : typeof q.tasks === 'number'
                ? Array.from({ length: q.tasks }).map((_, i) => ({ id: `task-${i}`, title: `Task ${i + 1}`, description: "Fulfill the specified objective.", original_index: i }))
                : [{ id: "main-task", title: "Main Task", description: "Complete the scenario requirements.", original_index: 0 }];

              let rawTasks = allTasks;

              if (q.selected_task_ids && Array.isArray(q.selected_task_ids) && q.selected_task_ids.length > 0) {
                const selectedSet = new Set(q.selected_task_ids.map(String));
                const filtered = allTasks.filter((t: any, idx: number) => {
                  const tId = String(t.id ?? t.task_slug ?? `task-${idx}`);
                  return (
                    selectedSet.has(tId) ||
                    (t.id != null && selectedSet.has(String(t.id))) ||
                    (t.task_slug != null && selectedSet.has(String(t.task_slug))) ||
                    selectedSet.has(`task-${idx}`) ||
                    selectedSet.has(`task-${t.order_index ?? idx}`) ||
                    selectedSet.has(String(idx)) ||
                    selectedSet.has(String(t.title))
                  );
                });
                if (filtered.length > 0) {
                  rawTasks = filtered;
                }
              } else if (q.selected_task_id) {
                const filtered = allTasks.filter((t: any, idx: number) => {
                  const tId = String(t.id ?? t.task_slug ?? `task-${idx}`);
                  return tId === String(q.selected_task_id) || String(t.title) === String(q.selected_task_id);
                });
                if (filtered.length > 0) {
                  rawTasks = filtered;
                }
              } else if (q.selected_task && typeof q.selected_task === "object") {
                rawTasks = [q.selected_task];
              }

              const taskMin = rawTasks.reduce((sum: number, t: any) => sum + (Number(t.duration_minutes ?? t.duration) || 0), 0);
              const calcDuration = taskMin > 0 ? taskMin : (Number(q.duration_minutes) || 30);
              const taskMarks = rawTasks.reduce((sum: number, t: any) => sum + (Number(t.marks ?? t.score) || 0), 0);
              const calcMarks = (taskMarks > 0 || rawTasks.length === 0) ? taskMarks : (Number(q.marks) || Number(q.points) || Number(q.max_score) || 10);

              mappedLabs.push({
                id: q.id || Math.random().toString(),
                title: q.title || "Untitled Lab",
                tag: detectedTag,
                type: q.type,
                ticket_type: q.ticket_type || q.type,
                backend_frameworks: q.backend_frameworks || [],
                programming_languages: q.programming_languages || [],
                databases: q.databases || [],
                minutes: calcDuration,
                problem: q.description || q.scenario || "Complete the lab objectives.",
                startup_command: q.startup_command || undefined,
                test_command: q.test_command || undefined,
                connection_url: q.connection_url || undefined,
                marks: calcMarks,
                points: calcMarks,
                max_score: calcMarks,
                selected_task_ids: q.selected_task_ids,
                selected_task_id: q.selected_task_id,
                solution: q.solution,
                solution_files: q.solution_files,
                solutions: q.solutions,
                tasks: rawTasks.map((t: any) => ({
                  id: t.id || "",
                  title: t.title || "Task",
                  description: t.description || "",
                  original_index: t.original_index,
                  marks: t.marks,
                  duration_minutes: t.duration_minutes,
                  parent_task_id: t.parent_task_id || (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id),
                  scoring_rules: t.scoring_rules,
                  solution: t.solution,
                  expected_output: t.expected_output
                })),
                file: (q as any).starter_path || (q as any).starterPath || q.file || (q.programming_languages?.includes("PYTHON") ? "main.py" : q.programming_languages?.includes("JAVA") ? "Main.java" : "index.js"),
                code: (q as any).starter_code || (q as any).starterCode || q.code || "// Code editor initialized.",
                terminal: []
              });
              durationMinutes += calcDuration;
            });
            mappedSections.push({ type: "LAB", id: sec.id, title: sec.title || "Engineering Labs", labs: mappedLabs, proctoring: pc });
          } else if (sec.type === "KNOWLEDGE_ASSESSMENT") {
            let totalQMinutes = 0;
            (sec.questions || []).forEach((q: any) => {
              const qDur = Number(q.duration_minutes || (q.seconds ? Math.ceil(q.seconds / 60) : 0) || (q.duration ? Number(q.duration) : 0) || 0);
              totalQMinutes += qDur;
            });
            const sectionDuration = totalQMinutes > 0
              ? totalQMinutes
              : (sec.duration_minutes || sec.duration || (sec.questions?.length ? sec.questions.length * 1 : 10));

            mappedSections.push({
              type: "KNOWLEDGE_ASSESSMENT",
              id: sec.id,
              title: sec.title || "Knowledge Assessment",
              proctoring: pc,
              duration_minutes: sectionDuration,
              questions: (sec.questions || []).map((q: any) => {
                const isMcq = Array.isArray(q.mcq_options) && q.mcq_options.length > 0;
                let mappedOptions = q.options || [];
                let mappedCorrect: any = q.correct_answer ?? 0;
                
                if (q.format === "Coding" || q.format === "CODING") {
                  let solText = "";
                  if (q.solutions && q.solutions.length > 0) {
                    solText = q.solutions.map((s: any) => s.code || s.title || "").filter(Boolean).join("\n---\n");
                  }
                  mappedCorrect = solText || q.correct_answer || q.solution || "";
                }
                
                if (isMcq) {
                  mappedOptions = q.mcq_options.map((opt: any) => opt.text || "");
                  const correctIdx = q.mcq_options.findIndex((opt: any) => opt.is_correct === true);
                  if (correctIdx !== -1) mappedCorrect = correctIdx;
                }

                return {
                  ...q,
                  id: q.id,
                  q: q.title || q.text || q.content || "Untitled Question",
                  description: q.content || q.description || q.text || "",
                  format: q.format || (isMcq ? "MCQ" : "Description"),
                  options: mappedOptions,
                  correct: mappedCorrect,
                  correct_answer: mappedCorrect,
                  marks: q.marks || 1,
                  examples: Array.isArray(q.test_cases_basic) ? q.test_cases_basic : []
                };
              })
            } as any);
          } else if (sec.type === "SYSTEM_DESIGN") {
            const qList = sec.questions || [];
            const primaryChallenge = qList.length > 0 && typeof qList[0] === 'object' ? qList[0] : null;
            const challengeMarks = primaryChallenge?.marks || sec.marks || 100;
            const challengeDuration = primaryChallenge?.duration_minutes || sec.duration_minutes || 45;

            mappedSections.push({
              type: "SYSTEM_DESIGN",
              id: sec.id,
              title: sec.title || (primaryChallenge?.title ? `System Design: ${primaryChallenge.title}` : "System Design Challenge"),
              description: sec.description || primaryChallenge?.description || "",
              duration_minutes: challengeDuration,
              marks: challengeMarks,
              challenge: primaryChallenge || {
                id: sec.id,
                title: sec.title || "System Design Challenge",
                description: sec.description || "",
                tasks: [],
                constraints: [],
                starter_design: null,
              },
              questions: qList,
              proctoring: pc,
            });
            durationMinutes += challengeDuration;
          } else if (sec.type === "VITARKA_AI_INTERVIEW") {
            mappedSections.push({ type: "VITARKA_AI_INTERVIEW", id: sec.id, title: sec.title || "Engineering Discussion", description: sec.description, proctoring: pc });
            if (sec.questions && Array.isArray(sec.questions) && sec.questions.length > 0) {
              extractQuestions(sec.questions);
            } else {
              let meta: any = {};
              try { meta = JSON.parse(sec.description || "{}"); } catch {}
              if (meta.mockInterviewId) {
                yhubApiAuthUtil.get<any>(`/mock-interviews/${meta.mockInterviewId}/`)
                  .then(yhubRes => {
                    if (yhubRes.predefined_tree && Array.isArray(yhubRes.predefined_tree)) {
                      let asyncDQs: string[] = [];
                      const extractAsync = (nodes: any[]) => {
                        for (const n of nodes) {
                          if (n.text) asyncDQs.push(n.text);
                          if (n.follow_ups && n.follow_ups.length > 0) extractAsync(n.follow_ups);
                        }
                      };
                      extractAsync(yhubRes.predefined_tree);
                      if (asyncDQs.length > 0) setDiscussionQuestions(asyncDQs);
                    }
                  })
                  .catch(err => console.error("Failed to fetch mock interview from yhub", err));
              }
            }
          }
        });
      setAppSections(mappedSections);
      if (mappedSections.length > 0) {
        setSection(mappedSections[0].id);
      }
      
      if (dQs.length > 0) setDiscussionQuestions(dQs);

      setLabsData(mappedLabs);
  };

  const evalPrefix = evaluationId || (previewData ? 'preview' : 'default');

  const [section, setSection] = useState<string | null>(null);
  const [openLab, setOpenLab] = useState<LabId | null>(null);
  const [submittedLabs, setSubmittedLabs] = useState<Set<LabId>>(new Set());
  const [taskState, setTaskState] = useState<Record<string, Set<number>>>({});
  
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeDiscussionQuestion, setActiveDiscussionQuestion] = useState<string | null>(null);
  const [labSubmissionsData, setLabSubmissionsData] = useState<any[]>([]);

  useEffect(() => {
    if (evaluationId) {
      restApiAuthUtil.get(`/skill_evaluation/lab-submissions/`)
        .then((res: any) => {
          if (Array.isArray(res)) {
            setLabSubmissionsData(res.filter(s => s.evaluation === parseInt(evaluationId) || s.evaluation === evaluationId || s.evaluation?.id === evaluationId));
          } else if (res && Array.isArray(res.results)) {
            setLabSubmissionsData(res.results.filter((s: any) => s.evaluation === parseInt(evaluationId) || s.evaluation === evaluationId || s.evaluation?.id === evaluationId));
          }
        })
        .catch(console.error);
    }
  }, [evaluationId, submittedLabs]); // re-fetch when a lab is submitted

  const [answers, setAnswers] = useState<Record<string, any>>({}); // Maps question id to its answer
  const [marked, setMarked] = useState<Record<string, Set<string>>>({}); // Maps section id to set of marked question ids
  const [qIndex, setQIndex] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`eval_${evalPrefix}_qtimes`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [labTimes, setLabTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`eval_${evalPrefix}_lab_times`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [labStartTimes, setLabStartTimes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`eval_${evalPrefix}_lab_starts`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [submittedSections, setSubmittedSections] = useState<Set<string>>(new Set());
  
  const [codingCode, setCodingCode] = useState<Record<string, string>>({});
  const [codingResults, setCodingResults] = useState<Record<string, { name: string; pass: boolean }[] | null>>({});

  const [discussionIndex, setDiscussionIndex] = useState(0);
  const [discussionResponses, setDiscussionResponses] = useState<string[]>([]);
  const [discussionDraft, setDiscussionDraft] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const vitarkaRef = useRef<VitarkaInterviewScreenRef>(null);
  const [modal, setModal] = useState<null | { kind: "submit-lab"; id: LabId } | { kind: "submit-section"; id: string } | { kind: "end-discussion" } | { kind: "submit-evaluation" } | { kind: "submitting-evaluation" } | { kind: "exit" } | { kind: "tab-warning" } | { kind: "discussion-starting" } | { kind: "fullscreen" } | { kind: "proctoring-violation"; message: string }>(null);
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved">("saved");
  const [online, setOnline] = useState(true);
  const tabSwitches = useRef(0);

  const [proctoringData, setProctoringData] = useState<ProctoringData | null>(getGlobalProctoringData());
  const [mediaDisabled, setMediaDisabled] = useState(false);
  const isSubmittingRef = useRef(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  
    const activeSection = useMemo(() => appSections.find(s => s.id === section), [appSections, section]);
    const proctoringConfig = activeSection?.proctoring || {};
    
    const anySectionNeedsProctoring = useMemo(() => !isPreviewMode && appSections.some(s => s.proctoring?.enableProctoring), [appSections, isPreviewMode]);

  // Section completion & unlocking helper
  const isSectionCompleted = (sec: AppSection): boolean => {
    if (submittedSections.has(sec.id)) return true;
    if (sec.type === "LAB") {
      return sec.labs.length > 0 && sec.labs.every(l => submittedLabs.has(l.id));
    }
    return false;
  };

  const isSectionUnlocked = (secIdx: number): boolean => {
    if (secIdx <= 0) return true;
    for (let i = 0; i < secIdx; i++) {
      if (!isSectionCompleted(appSections[i])) {
        return false;
      }
    }
    return true;
  };

  // Active Timer Resolution (Per-Lab & Per-Section)
  interface ActiveTimerInfo {
    key: string;
    title: string;
    subTitle?: string;
    durationSeconds: number;
    isSubmitted: boolean;
    type: "LAB_ITEM" | "LAB_SECTION" | "KNOWLEDGE_ASSESSMENT" | "SYSTEM_DESIGN" | "VITARKA_AI_INTERVIEW" | "UNKNOWN";
    labId?: string;
    sectionId?: string;
  }

  const activeTimerInfo = useMemo<ActiveTimerInfo | null>(() => {
    if (!activeSection) return null;

    if (activeSection.type === "LAB") {
      const isSub = isSectionCompleted(activeSection);
      const totalSecs = activeSection.labs.reduce((acc, l) => acc + (l.minutes || 30) * 60, 0) || 30 * 60;
      const activeLab = openLab ? activeSection.labs.find(l => l.id === openLab) : null;
      return {
        key: `eval_${evalPrefix}_timer_sec_${activeSection.id}`,
        title: activeSection.title || "Engineering Labs",
        subTitle: activeLab ? activeLab.title : "Overview",
        durationSeconds: totalSecs,
        isSubmitted: isSub,
        type: "LAB_SECTION",
        sectionId: activeSection.id,
      };
    }

    if (activeSection.type === "KNOWLEDGE_ASSESSMENT") {
      const isSub = submittedSections.has(activeSection.id);
      let totalQMinutes = 0;
      (activeSection.questions || []).forEach((q: any) => {
        const qDur = Number(q.duration_minutes || (q.seconds ? Math.ceil(q.seconds / 60) : 0) || (q.duration ? Number(q.duration) : 0) || 0);
        totalQMinutes += qDur;
      });
      const durationMinutes = (activeSection as any).duration_minutes || (totalQMinutes > 0 ? totalQMinutes : (activeSection.questions?.length ? activeSection.questions.length * 1 : 10));
      return {
        key: `eval_${evalPrefix}_timer_sec_${activeSection.id}`,
        title: activeSection.title || "Knowledge Assessment",
        durationSeconds: durationMinutes * 60,
        isSubmitted: isSub,
        type: "KNOWLEDGE_ASSESSMENT",
        sectionId: activeSection.id,
      };
    }

    if (activeSection.type === "SYSTEM_DESIGN") {
      const isSub = submittedSections.has(activeSection.id);
      const durationMinutes = (activeSection as any).duration_minutes || (activeSection as any).challenge?.duration_minutes || 45;
      return {
        key: `eval_${evalPrefix}_timer_sec_${activeSection.id}`,
        title: activeSection.title || "System Design",
        durationSeconds: durationMinutes * 60,
        isSubmitted: isSub,
        type: "SYSTEM_DESIGN",
        sectionId: activeSection.id,
      };
    }

    if (activeSection.type === "VITARKA_AI_INTERVIEW") {
      const isSub = submittedSections.has(activeSection.id);
      let meta: any = {};
      try { meta = JSON.parse(activeSection.description || "{}"); } catch {}
      const durationMinutes = meta.duration ?? meta.duration_minutes ?? (activeSection as any).duration_minutes ?? (activeSection as any).duration ?? 15;
      return {
        key: `eval_${evalPrefix}_timer_sec_${activeSection.id}`,
        title: activeSection.title || "Engineering Discussion",
        durationSeconds: durationMinutes * 60,
        isSubmitted: isSub,
        type: "VITARKA_AI_INTERVIEW",
        sectionId: activeSection.id,
      };
    }

    return null;
  }, [activeSection, openLab, submittedLabs, submittedSections, evalPrefix]);

  const previewStorageRef = useRef(new Map<string, string>());

  const getStorageItem = (key: string) => {
    if (isPreviewMode) return previewStorageRef.current.get(key) || null;
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const setStorageItem = (key: string, val: string) => {
    if (isPreviewMode) {
      previewStorageRef.current.set(key, val);
      return;
    }
    try { localStorage.setItem(key, val); } catch {}
    try { sessionStorage.setItem(key, val); } catch {}
  };

  const computeRemaining = (info: ActiveTimerInfo | null): number => {
    if (!info) return 0;
    if (info.isSubmitted) return 0;
    try {
      let startedAt = getStorageItem(info.key);
      // If this is a lab item and its timer hasn't been set, inherit from section timer if available
      if (!startedAt && info.type === "LAB_ITEM" && info.sectionId) {
        startedAt = getStorageItem(`eval_${evalPrefix}_timer_sec_${info.sectionId}`);
      }
      // Vitarka AI Interview timer only starts when candidate explicitly starts the interview
      if (!startedAt && info.type === "VITARKA_AI_INTERVIEW") {
        return info.durationSeconds;
      }
      // If still not started, start now and persist across localStorage & sessionStorage
      if (!startedAt) {
        startedAt = new Date().toISOString();
        setStorageItem(info.key, startedAt);
        if (info.sectionId) {
          setStorageItem(`eval_${evalPrefix}_timer_sec_${info.sectionId}`, startedAt);
        }
      } else {
        setStorageItem(info.key, startedAt);
      }
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      return Math.max(0, info.durationSeconds - elapsed);
    } catch {
      return info.durationSeconds;
    }
  };

  const [remaining, setRemaining] = useState<number>(() => computeRemaining(activeTimerInfo));

  // Timer interval updates for the active item
  useEffect(() => {
    if (!activeTimerInfo) return;
    const initialRem = computeRemaining(activeTimerInfo);
    setRemaining(initialRem);

    if (activeTimerInfo.isSubmitted) return;

    const t = setInterval(() => {
      const currentRem = computeRemaining(activeTimerInfo);
      setRemaining(currentRem);
      if (currentRem <= 0) {
        clearInterval(t);
        if (activeTimerInfo.type === "LAB_ITEM" && activeTimerInfo.labId) {
          confirmSubmitLab(activeTimerInfo.labId);
        } else if (activeTimerInfo.type === "LAB_SECTION" && activeTimerInfo.sectionId) {
          const sec = appSections.find(s => s.id === activeTimerInfo.sectionId);
          if (sec && sec.type === "LAB") {
            sec.labs.forEach(l => confirmSubmitLab(l.id));
          }
          const idx = appSections.findIndex(s => s.id === activeTimerInfo.sectionId);
          if (idx !== -1 && idx + 1 === appSections.length) {
            submitEvaluation(false);
          }
        } else if (activeTimerInfo.type === "KNOWLEDGE_ASSESSMENT" && activeTimerInfo.sectionId) {
          const idx = appSections.findIndex(s => s.id === activeTimerInfo.sectionId);
          if (idx !== -1 && idx + 1 === appSections.length) {
            submitEvaluation(false);
          } else {
            confirmSubmitSection(activeTimerInfo.sectionId);
          }
        } else if (activeTimerInfo.type === "SYSTEM_DESIGN" && activeTimerInfo.sectionId) {
          const idx = appSections.findIndex(s => s.id === activeTimerInfo.sectionId);
          if (idx !== -1 && idx + 1 === appSections.length) {
            submitEvaluation(false);
          } else {
            confirmSubmitSection(activeTimerInfo.sectionId);
          }
        } else if (activeTimerInfo.type === "VITARKA_AI_INTERVIEW") {
          submitEvaluation(false);
        }
      }
    }, 1000);

    return () => clearInterval(t);
  }, [activeTimerInfo?.key, activeTimerInfo?.isSubmitted]);

  const devToolsAttempts = useRef<number>(0);
  // Initialize initial value once evaluationId is available
  useEffect(() => {
    if (evaluationId) {
      try {
        const stored = parseInt(sessionStorage.getItem(`__devToolsAttempts_${evaluationId}`) || "0", 10) || 0;
        devToolsAttempts.current = stored;
      } catch {}
    }
  }, [evaluationId]);
  const lastDevToolsTime = useRef<number>(0);

  // Track active question time in Knowledge Assessment
  useEffect(() => {
    if (activeSection?.type !== "KNOWLEDGE_ASSESSMENT" || !activeSection.questions) return;
    const currentQ = activeSection.questions[qIndex];
    if (!currentQ || !currentQ.id) return;
    const qId = String(currentQ.id);

    const interval = setInterval(() => {
      setQuestionTimes(prev => {
        const next = { ...prev, [qId]: (prev[qId] || 0) + 1 };
        try {
          localStorage.setItem(`eval_${evalPrefix}_qtimes`, JSON.stringify(next));
        } catch {}
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSection?.id, activeSection?.type, qIndex, evalPrefix]);

  // Track active lab time in Engineering Labs
  useEffect(() => {
    if (!openLab) return;
    const labKey = String(openLab);

    setLabStartTimes(prev => {
      if (!prev[labKey]) {
        const nowIso = new Date().toISOString();
        const next = { ...prev, [labKey]: nowIso };
        try { localStorage.setItem(`eval_${evalPrefix}_lab_starts`, JSON.stringify(next)); } catch {}
        return next;
      }
      return prev;
    });

    const interval = setInterval(() => {
      setLabTimes(prev => {
        const next = { ...prev, [labKey]: (prev[labKey] || 0) + 1 };
        try {
          localStorage.setItem(`eval_${evalPrefix}_lab_times`, JSON.stringify(next));
        } catch {}
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [openLab, evalPrefix]);

  const { logActivity } = useProctoring({
    assessmentId: evaluationId,
    assessmentType: "skill_evaluation",
    enabled: (!!anySectionNeedsProctoring || !!proctoringConfig.enableProctoring || !!proctoringData) && !isPreviewMode,
    questionId: (activeSection?.type === "KNOWLEDGE_ASSESSMENT" ? activeSection.questions?.[qIndex]?.id : null) || activeQuestionId || openLab || section || undefined,
    questionTitle: activeDiscussionQuestion || undefined,
    mediaStream: proctoringData?.cameraStream,
    screenStream: proctoringData?.screenStream,
    tabSwitchThreshold: proctoringConfig.tabSwitchLimit || 3,
    enableCopyPaste: proctoringConfig.enableCopyPaste,
    tabSwitchAllowed: proctoringConfig.tabSwitchAllowed,
    onViolation: (type, data) => {
      console.warn("Proctoring violation:", type, data);
      if (type === "devtools_opened") {
        const now = Date.now();
        // Cooldown debounce of 1200ms to prevent single long keypress from counting as 2 strikes
        if (now - lastDevToolsTime.current < 1200) return;
        lastDevToolsTime.current = now;

        const isProctoringActive = (!!anySectionNeedsProctoring || !!proctoringConfig.enableProctoring || !!proctoringData) && !isPreviewMode;
        if (!isProctoringActive) return;

        const currentAttempts = (typeof devToolsAttempts.current === "number" ? devToolsAttempts.current : 0) + 1;
        devToolsAttempts.current = currentAttempts;
        try {
          sessionStorage.setItem(`__devToolsAttempts_${evaluationId}`, String(currentAttempts));
        } catch {}

        if (currentAttempts === 1) {
          setModal({
            kind: "proctoring-violation",
            message: "Developer tools and inspection shortcuts are strictly prohibited. This is your final warning: if you try to open developer tools again, your evaluation will be automatically submitted immediately.",
          });
        } else {
          setModal({
            kind: "proctoring-violation",
            message: "You have attempted to open developer tools again after being warned. Your evaluation is now being automatically submitted.",
          });
          isSubmittingRef.current = true;
          setMediaDisabled(false);
          setTimeout(() => {
            submitEvaluation(true);
          }, 1800);
        }
      }
    },
    onAutoSubmit: () => {
      isSubmittingRef.current = true;
      setMediaDisabled(false);
      submitEvaluation(true);
    }
  });

  const initialImagesLogged = useRef(false);
  useEffect(() => {
    if (proctoringData && evaluationId && !initialImagesLogged.current) {
      initialImagesLogged.current = true;
      const uploadInitialBlobs = async () => {
        if (proctoringData.photoBlob) {
          await logActivity('passport_photo_captured', { source: 'proctoring_gate' }, proctoringData.photoBlob);
        }
        if (proctoringData.screenshotBlob) {
          await logActivity('initial_screenshot_captured', { source: 'proctoring_gate' }, proctoringData.screenshotBlob);
        }
      };
      uploadInitialBlobs();
    }
  }, [proctoringData, evaluationId, logActivity]);

  useEffect(() => {
    if (!anySectionNeedsProctoring || isPreviewMode) return;
    
    let isCancelled = false;
    const stream = proctoringData?.cameraStream;

    const isStreamValid = (s: MediaStream | null | undefined): boolean => {
      if (!s) return false;
      const vTracks = s.getVideoTracks();
      if (vTracks.length === 0 || vTracks.some(t => t.readyState === 'ended' || !t.enabled)) return false;
      const aTracks = s.getAudioTracks();
      if (aTracks.length > 0 && aTracks.some(t => t.readyState === 'ended' || !t.enabled)) return false;
      return true;
    };

    if (!isStreamValid(stream)) {
      if (isSubmittingRef.current) return;
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((newStream) => {
          if (isCancelled || isSubmittingRef.current) return;
          const currentData = getGlobalProctoringData();
          const existingScreenStream = currentData?.screenStream || proctoringData?.screenStream || null;
          const newData = {
            cameraStream: newStream,
            screenStream: existingScreenStream,
            photoBlob: currentData?.photoBlob || proctoringData?.photoBlob || null,
            screenshotBlob: currentData?.screenshotBlob || proctoringData?.screenshotBlob || null,
          };
          setGlobalProctoringData(newData);
          setProctoringData(newData);
          setMediaDisabled(false);
        })
        .catch(() => {
          if (!isCancelled && !isSubmittingRef.current) setMediaDisabled(true);
        });
      return () => { isCancelled = true; };
    }

    const checkMedia = () => {
      if (isSubmittingRef.current) {
        setMediaDisabled(false);
        return;
      }
      if (!isStreamValid(proctoringData?.cameraStream)) {
        setMediaDisabled(true);
      } else {
        setMediaDisabled(false);
      }
    };

    const intervalId = setInterval(checkMedia, 1500);
    checkMedia();
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [anySectionNeedsProctoring, proctoringData, isPreviewMode]);

  // Auto-submit after 1 minute of disabled media
  useEffect(() => {
    if (mediaDisabled) {
      const timeoutId = setTimeout(() => {
        submitEvaluation(true);
      }, 60000);
      return () => clearTimeout(timeoutId);
    }
  }, [mediaDisabled]);

  // Tab-switch warning, Copy/Paste prevention & Fullscreen warning
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (proctoringConfig?.enableProctoring && proctoringConfig?.tabSwitchAllowed === false && !isPreviewMode) {
          tabSwitches.current += 1;
          const limit = proctoringConfig.tabSwitchLimit ?? 1;
          if (tabSwitches.current > limit) {
             setModal({ kind: "proctoring-violation", message: `You have exceeded the maximum allowed tab switches (${limit}). Your evaluation is being terminated.` });
             isSubmittingRef.current = true;
             setMediaDisabled(false);
             setTimeout(() => {
               submitEvaluation(true);
             }, 3000);
          } else {
             setModal({ kind: "tab-warning" });
          }
        }
      }
    };

    const onCopyPaste = (e: ClipboardEvent) => {
      if (proctoringConfig?.enableProctoring && proctoringConfig?.enableCopyPaste === false && !isPreviewMode) {
        e.preventDefault();
        setModal(m => m ?? { kind: "proctoring-violation", message: "Copying and pasting is disabled for this evaluation." });
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && proctoringConfig?.enableProctoring && !isPreviewMode) {
        setModal({ kind: "fullscreen" });
      }
    };

    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("copy", onCopyPaste, { capture: true });
    document.addEventListener("paste", onCopyPaste, { capture: true });
    document.addEventListener("cut", onCopyPaste, { capture: true });
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("copy", onCopyPaste, { capture: true });
      document.removeEventListener("paste", onCopyPaste, { capture: true });
      document.removeEventListener("cut", onCopyPaste, { capture: true });
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [proctoringConfig, nav]);

  // Online status
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Listen for lab submission from iframe
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (e.data?.type === "LAB_SAVED" && e.data?.labId) {
        setOpenLab(null);
        setModal(null);
        return;
      }
      if (e.data?.type === "LAB_SUBMITTED" && e.data?.labId) {
        const activeSection = appSections.find(s => s.id === section);
        if (activeSection?.type === "KNOWLEDGE_ASSESSMENT") {
          const qList = activeSection.questions || [];
          const isCodingQuestion = qList.some((q: any) => q.id === e.data.labId);
          if (isCodingQuestion) {
            if (qIndex < qList.length - 1) {
              setQIndex(qIndex + 1);
            } else {
              setModal({ kind: "submit-section", id: activeSection.id });
            }
            return;
          }
        }

        const labKey = String(e.data.labId);
        const secSolved = Number(e.data.seconds_solved || labTimes[labKey] || 0);
        const minSolved = Number(e.data.minutes_solved || (secSolved > 0 ? Math.max(1, Math.round(secSolved / 60)) : 1));
        const startedAt = e.data.started_at || labStartTimes[labKey] || (secSolved > 0 ? new Date(Date.now() - secSolved * 1000).toISOString() : new Date().toISOString());
        const submittedAt = e.data.submitted_at || new Date().toISOString();

        if (evaluationId) {
          evaluationService.submitLab?.(evaluationId, e.data.labId, {
            status: "done",
            score: e.data.score,
            seconds_solved: secSolved,
            minutes_solved: minSolved,
            started_at: startedAt,
            submitted_at: submittedAt
          }).catch(console.error);
        }

        setSubmittedLabs(prev => {
          const nextLabs = new Set(prev).add(e.data.labId);
          const activeLabSec = appSections.find(s => s.type === "LAB" && s.labs.some(l => l.id === e.data.labId));
          if (activeLabSec && activeLabSec.labs.every(l => nextLabs.has(l.id))) {
            setSubmittedSections(sPrev => new Set(sPrev).add(activeLabSec.id));
          }
          return nextLabs;
        });
        setOpenLab(null);
        setModal(null);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [evaluationId, appSections, section, qIndex, labTimes, labStartTimes]);

  // Autosave feel
  const touchAutosave = () => {
    setAutosave("saving");
    window.clearTimeout((touchAutosave as any)._t);
    (touchAutosave as any)._t = window.setTimeout(() => setAutosave("saved"), 600);
  };

  const submitEvaluation = async (autoSubmit: boolean | any = false) => {
    isSubmittingRef.current = true;
    setMediaDisabled(false);
    if (typeof autoSubmit !== "boolean") autoSubmit = false;
    try {
      const pfx = `eval_${evalPrefix}_timer_`;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(pfx)) toRemove.push(k);
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(pfx) && !toRemove.includes(k)) toRemove.push(k);
      }
      toRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
        try { sessionStorage.removeItem(k); } catch {}
      });
      for (const sec of appSections) {
        if (sec.type === "KNOWLEDGE_ASSESSMENT" && !submittedSections.has(sec.id)) {
          try {
            const richAnswers: any[] = [];
            let secElapsed = 0;
            try {
              const startedAtStr = getStorageItem(`eval_${evalPrefix}_timer_sec_${sec.id}`);
              if (startedAtStr) {
                secElapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAtStr).getTime()) / 1000));
              }
            } catch {}
            const totalQCount = sec.questions?.length || 1;
            const fallbackPerQ = secElapsed > 0 ? Math.max(1, Math.round(secElapsed / totalQCount)) : 0;
            (sec.questions || []).forEach((q: any) => {
              if (answers[q.id] !== undefined) {
                let isCorrect = false;
                if (q.mcq_options && Array.isArray(q.mcq_options) && q.mcq_options.length > 0) {
                  const correctIndices = q.mcq_options
                    .map((opt: any, idx: number) => opt.is_correct ? idx : -1)
                    .filter((idx: number) => idx !== -1);
                  const userAns = answers[q.id];
                  const userIndices = Array.isArray(userAns)
                    ? userAns.map(Number)
                    : (userAns !== undefined && userAns !== null ? [Number(userAns)] : []);
                  isCorrect = correctIndices.length > 0 &&
                    userIndices.length === correctIndices.length &&
                    [...userIndices].sort().every((val, i) => val === [...correctIndices].sort()[i]);
                } else if (typeof answers[q.id] === "string" && typeof q.correct === "string") {
                  if (q.format?.toUpperCase() === "CODING") {
                    const normUser = answers[q.id].replace(/\s+/g, "").replace(/'/g, '"');
                    const normCorrect = q.correct.replace(/\s+/g, "").replace(/'/g, '"');
                    isCorrect = normUser === normCorrect;
                  } else {
                    isCorrect = answers[q.id].trim() === q.correct.trim();
                  }
                } else {
                  isCorrect = answers[q.id] === q.correct;
                }
                const recordedSecs = questionTimes[String(q.id)] || 0;
                const finalSecs = recordedSecs > 0 ? recordedSecs : (fallbackPerQ > 0 ? fallbackPerQ : 35);
                richAnswers.push({
                  question_id: q.id,
                  selected_option: answers[q.id],
                  is_correct: isCorrect,
                  seconds_spent: finalSecs
                });
              }
            });
            if (richAnswers.length > 0) {
              await evaluationService.submitKnowledgeAnswers?.(evaluationId, sec.id, richAnswers);
            }
          } catch (e) {
            console.error("Auto submitting knowledge section error:", e);
          }
        }
        if (sec.type === "SYSTEM_DESIGN" && !submittedSections.has(sec.id)) {
          try {
            const rawSaved = getStorageItem(`eval_${evalPrefix}_system_design_${sec.id}`);
            if (rawSaved) {
              const parsed = JSON.parse(rawSaved);
              await restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/submit_system_design/`, {
                section_id: sec.id,
                question_id: (sec as any).challenge?.id,
                design: parsed,
                action: "submit",
                status: "submitted",
              });
            }
          } catch (e) {
            console.error("Auto submitting system design section error:", e);
          }
        }
      }
      await evaluationService.finishEvaluation?.(evaluationId, autoSubmit);
    } catch (e) {
      console.error(e);
    }
    try { document.exitFullscreen?.(); } catch {}
    try { clearGlobalProctoringData(); } catch {}
    window.location.href = "/evaluation/complete?e=" + evaluationId;
  };

  const getSectionStatus = (secId: string): Status => {
    const idx = appSections.findIndex(s => s.id === secId);
    if (idx !== -1 && !isSectionUnlocked(idx)) return "locked";
    if (submittedSections.has(secId)) return "complete";
    if (section === secId) return "current";
    return "not-started";
  };
  const getLabStatus = (secId: string, labs: RealLab[]): Status => {
    const idx = appSections.findIndex(s => s.id === secId);
    if (idx !== -1 && !isSectionUnlocked(idx)) return "locked";
    const submittedCount = labs.filter(l => submittedLabs.has(l.id)).length;
    if (submittedSections.has(secId) || (submittedCount === labs.length && labs.length > 0)) return "complete";
    if (submittedCount > 0) return "in-progress";
    if (section === secId) return "current";
    return "not-started";
  };
  const discussionIdx = appSections.findIndex(x => x.type === "VITARKA_AI_INTERVIEW");
  const isDiscussionUnlocked = discussionIdx !== -1 ? isSectionUnlocked(discussionIdx) : false;
  const discussionStatus: Status = !isDiscussionUnlocked 
    ? "locked" 
    : (discussionIdx !== -1 && submittedSections.has(appSections[discussionIdx]?.id) 
        ? "complete" 
        : (discussionIdx !== -1 && section === appSections[discussionIdx]?.id ? "current" : "not-started"));

  const goSection = (s: string) => {
    const targetIdx = appSections.findIndex(x => x.id === s);
    if (targetIdx === -1) return;
    if (isSectionCompleted(appSections[targetIdx])) {
      return; // Cannot navigate back to already submitted sections
    }
    if (!isSectionUnlocked(targetIdx)) {
      return; // Locked section: cannot navigate until earlier sections are submitted
    }
    setSection(s);
    setOpenLab(null);
    setActiveQuestionId(null);
    setQIndex(0);
  };

  const toggleTask = (labId: LabId, i: number) => {
    setTaskState(prev => {
      const s = new Set(prev[labId] ?? []);
      if (s.has(i)) s.delete(i); else s.add(i);
      return { ...prev, [labId]: s };
    });
    touchAutosave();
  };
  const confirmSubmitLab = async (labId: LabId) => {
    const labKey = String(labId);
    const secSolved = Number(labTimes[labKey] || 0);
    const minSolved = secSolved > 0 ? Math.max(1, Math.round(secSolved / 60)) : 1;
    const startedAt = labStartTimes[labKey] || (secSolved > 0 ? new Date(Date.now() - secSolved * 1000).toISOString() : new Date().toISOString());
    const submittedAt = new Date().toISOString();
    try {
      if (evaluationId) await evaluationService.submitLab?.(evaluationId, labId, {
        status: "done",
        seconds_solved: secSolved,
        minutes_solved: minSolved,
        started_at: startedAt,
        submitted_at: submittedAt
      });
    } catch (e) {
      console.error(e);
    }
    setSubmittedLabs(prev => {
      const nextLabs = new Set(prev).add(labId);
      const activeLabSec = appSections.find(s => s.type === "LAB" && s.labs.some(l => l.id === labId));
      if (activeLabSec && activeLabSec.labs.every(l => nextLabs.has(l.id))) {
        setSubmittedSections(sPrev => new Set(sPrev).add(activeLabSec.id));
        const idx = appSections.findIndex(s => s.id === activeLabSec.id);
        if (idx !== -1 && idx + 1 < appSections.length) {
          setSection(appSections[idx + 1].id);
          setOpenLab(null);
          setQIndex(0);
        }
      }
      return nextLabs;
    });
    setOpenLab(null);
    setModal(null);
  };
  const confirmSubmitSection = async (secId: string) => {
    setModal({ kind: "submitting-evaluation" });
    try {
      const sec = appSections.find(s => s.id === secId);
      const richAnswers: any[] = [];
      if (sec && sec.type === "KNOWLEDGE_ASSESSMENT" && sec.questions) {
        let secElapsed = 0;
        try {
          const startedAtStr = getStorageItem(`eval_${evalPrefix}_timer_sec_${sec.id}`);
          if (startedAtStr) {
            secElapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAtStr).getTime()) / 1000));
          }
        } catch {}
        const totalQCount = sec.questions.length || 1;
        const fallbackPerQ = secElapsed > 0 ? Math.max(1, Math.round(secElapsed / totalQCount)) : 0;

        sec.questions.forEach((q: any) => {
          if (answers[q.id] !== undefined) {
            let isCorrect = false;
            if (q.mcq_options && Array.isArray(q.mcq_options) && q.mcq_options.length > 0) {
              const correctIndices = q.mcq_options
                .map((opt: any, idx: number) => opt.is_correct ? idx : -1)
                .filter((idx: number) => idx !== -1);
              const userAns = answers[q.id];
              const userIndices = Array.isArray(userAns)
                ? userAns.map(Number)
                : (userAns !== undefined && userAns !== null ? [Number(userAns)] : []);
              isCorrect = correctIndices.length > 0 &&
                userIndices.length === correctIndices.length &&
                [...userIndices].sort().every((val, i) => val === [...correctIndices].sort()[i]);
            } else if (typeof answers[q.id] === "string" && typeof q.correct === "string") {
              if (q.format?.toUpperCase() === "CODING") {
                const normUser = answers[q.id].replace(/\s+/g, "").replace(/'/g, '"');
                const normCorrect = q.correct.replace(/\s+/g, "").replace(/'/g, '"');
                isCorrect = normUser === normCorrect;
              } else {
                isCorrect = answers[q.id].trim() === q.correct.trim();
              }
            } else {
              isCorrect = answers[q.id] === q.correct;
            }

            const recordedSecs = questionTimes[String(q.id)] || 0;
            const finalSecs = recordedSecs > 0 ? recordedSecs : (fallbackPerQ > 0 ? fallbackPerQ : 35);

            richAnswers.push({
              question_id: q.id,
              selected_option: answers[q.id],
              is_correct: isCorrect,
              seconds_spent: finalSecs
            });
          }
        });
        await evaluationService.submitKnowledgeAnswers?.(evaluationId, secId, richAnswers);
      } else if (sec && sec.type === "SYSTEM_DESIGN") {
        try {
          const rawSaved = getStorageItem(`eval_${evalPrefix}_system_design_${sec.id}`);
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved);
            await restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/submit_system_design/`, {
              section_id: sec.id,
              question_id: (sec as any).challenge?.id,
              design: parsed,
              action: "submit",
              status: "submitted",
            });
          }
        } catch (e) {
          console.error("Submitting system design section error:", e);
        }
      }
    } catch (e) {}
    setSubmittedSections(prev => new Set(prev).add(secId));
    setActiveQuestionId(null);
    const idx = appSections.findIndex(s => s.id === secId);
    if (idx !== -1 && idx + 1 < appSections.length) {
      setSection(appSections[idx + 1].id);
      setOpenLab(null);
      setQIndex(0);
      setModal(null);
    } else {
      await submitEvaluation(false);
    }
  };

  const setAnswer = (qId: string, opt: any) => {
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    touchAutosave();
  };
  const clearAnswer = (qId: string) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    touchAutosave();
  };
  const toggleMarked = (secId: string, qId: string) => {
    setMarked(prev => {
      const s = new Set(prev[secId] ?? []);
      if (s.has(qId)) s.delete(qId); else s.add(qId);
      return { ...prev, [secId]: s };
    });
  };
  const runCode = () => {
    setCodingResults(null);
    setTimeout(() => {
      setCodingResults([
        { name: "twoSum([2,7,11,15], 9)", pass: true },
        { name: "twoSum([3,2,4], 6)", pass: true },
        { name: "twoSum([3,3], 6)", pass: true },
        { name: "edge case: empty array", pass: /return \[\]/.test(codingCode) },
      ]);
    }, 500);
  };
  const confirmSubmitCoding = () => {
    setCodingSubmitted(true);
    setModal(null);
  };
  const submitDiscussionAnswer = () => {
    if (!discussionDraft.trim()) return;
    setDiscussionResponses(r => [...r, discussionDraft.trim()]);
    setDiscussionDraft("");
    setDiscussionIndex(i => i + 1);
  };

  useEffect(() => {
    if (anySectionNeedsProctoring && !proctoringData && !isPreviewMode) {
      nav({ to: "/evaluation/proctoring", search: { e: evaluationId }, replace: true });
    }
  }, [anySectionNeedsProctoring, proctoringData, isPreviewMode, nav, evaluationId]);

  const candidateContextString = useMemo(() => {
    let contextParts: string[] = [];
    for (const sec of appSections) {
      if (sec.type === "KNOWLEDGE_ASSESSMENT") {
        let correctCount = 0;
        let totalCount = 0;
        let details: string[] = [];
        for (const q of (sec.questions || [])) {
          if (answers[q.id] !== undefined) {
            totalCount++;
            const correctVal = q.correct_answer !== undefined ? q.correct_answer : (q.correct !== undefined ? q.correct : q.solution);
            const isCorrect = answers[q.id] === correctVal || Number(answers[q.id]) === Number(correctVal) || answers[q.id] === q.correct_answer;
            if (isCorrect) correctCount++;
            details.push(`- Question: ${q.q || q.title || q.text || "Question"}\n  Selected Answer Option Index: ${answers[q.id]}\n  Is Correct: ${isCorrect ? 'Yes' : 'No'}`);
          }
        }
        if (totalCount > 0) {
          contextParts.push(`Knowledge Assessment Score: ${correctCount}/${totalCount}\n` + details.join("\n"));
        }
      }
      if (sec.type === "LAB") {
        let labDetails = `Engineering Labs in section '${sec.title || "Labs"}':\n`;
        let hasSubmissions = false;
        
        for (const lab of sec.labs || []) {
          const submission = labSubmissionsData.find((s: any) => s.lab_question === lab.id || s.lab_question?.id === lab.id);
          labDetails += `\n--- Lab: ${lab.title || lab.id} ---\n`;
          
          const problemDesc = lab.problem || lab.description || lab.problem_statement || "";
          if (problemDesc) {
            labDetails += `Description: ${problemDesc}\n`;
          }

          if (Array.isArray(lab.tasks) && lab.tasks.length > 0) {
            labDetails += `Tasks:\n`;
            lab.tasks.forEach((t: any, idx: number) => {
              const taskText = typeof t === "string" ? t : (t.text || t.title || t.description || JSON.stringify(t));
              labDetails += `  ${idx + 1}. ${taskText}\n`;
            });
          }

          if (submission && (submission.solution || submission.score !== undefined)) {
            hasSubmissions = true;
            const scoreVal = Number(submission.score ?? 100);
            const labTaskCount = Array.isArray(lab.tasks) && lab.tasks.length > 0 ? lab.tasks.length : 5;
            const passedTaskCount = scoreVal === 100 ? labTaskCount : Math.round((scoreVal / 100) * labTaskCount);
            labDetails += `Score: ${scoreVal}/100\n`;
            labDetails += `Tests: ${passedTaskCount} passed out of ${labTaskCount}\n`;
            labDetails += `Time spent: ${submission.minutes_solved || 1} minutes\n`;

            const isInternal = (path: string) =>
              path.includes("yuvro_scoring_rules") ||
              path.includes("scoring_rules") ||
              path.includes("__pycache__") ||
              path.includes("node_modules") ||
              path.startsWith(".");

            if (typeof submission.solution === 'string' && submission.solution.includes('diff --git')) {
              const cleanDiff = submission.solution
                .split(/(?=diff --git)/g)
                .filter((block: string) => !isInternal(block))
                .join("")
                .trim();

              if (cleanDiff) {
                labDetails += `Code Diff:\n\`\`\`diff\n${cleanDiff}\n\`\`\`\n`;
              } else {
                labDetails += `Status: Submitted (No user code diffs).\n`;
              }
            } else if (submission.solution) {
              try {
                const parsed = typeof submission.solution === 'string' ? JSON.parse(submission.solution) : submission.solution;
                if (typeof parsed === 'object' && parsed !== null) {
                  const cleanFiles = Object.fromEntries(
                    Object.entries(parsed).filter(([p]) => !isInternal(p))
                  );
                  if (Object.keys(cleanFiles).length > 0) {
                    labDetails += `Submitted Code:\n\`\`\`json\n${JSON.stringify(cleanFiles, null, 2)}\n\`\`\`\n`;
                  } else {
                    labDetails += `Status: Submitted (No user code files).\n`;
                  }
                } else if (!isInternal(String(submission.solution))) {
                  labDetails += `Submitted Code:\n\`\`\`\n${submission.solution}\n\`\`\`\n`;
                }
              } catch {
                if (!isInternal(String(submission.solution))) {
                  labDetails += `Submitted Code:\n\`\`\`\n${submission.solution}\n\`\`\`\n`;
                }
              }
            }
          } else {
            labDetails += `Status: Not submitted or no code diff available.\n`;
          }
        }
        contextParts.push(labDetails);
      }
      if (sec.type === "SYSTEM_DESIGN") {
        let sdDetails = `System Design Challenge in section '${sec.title}':\n`;
        try {
          const rawSaved = getStorageItem(`eval_${evalPrefix}_system_design_${sec.id}`);
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved);
            const nodeCount = parsed.nodes?.length || 0;
            const nodesList = (parsed.nodes || []).map((n: any) => n.label).join(", ");
            const hasSeq = Boolean(parsed.seq?.trim());
            const hasSchema = Boolean(parsed.schema?.trim());
            const apiCount = parsed.apis?.length || 0;
            sdDetails += `- Components (${nodeCount}): ${nodesList}\n`;
            sdDetails += `- Sequence Flow: ${hasSeq ? "Provided in Mermaid" : "None"}\n`;
            sdDetails += `- DB Schema: ${hasSchema ? "Defined in DBML" : "None"}\n`;
            sdDetails += `- REST API Endpoints (${apiCount})\n`;
            if (parsed.notes) {
              const noteSummary = Object.entries(parsed.notes).filter(([_, v]) => Boolean(v)).map(([k, v]) => `${k.toUpperCase()} notes: ${String(v).slice(0, 150)}...`).join("; ");
              if (noteSummary) sdDetails += `- Architecture Notes: ${noteSummary}\n`;
            }
          }
        } catch {}
        contextParts.push(sdDetails);
      }
      if (sec.type === "VITARKA_AI_INTERVIEW") {
        let meta: any = {};
        try { meta = JSON.parse(sec.description || "{}"); } catch {}
        const discMax = meta.marks ?? meta.max_score ?? 25;
        contextParts.push(`Vitarka Discussion Max Score: ${discMax}`);
      }
    }
    return contextParts.join("\n\n");
  }, [appSections, answers, labSubmissionsData]);

  if (anySectionNeedsProctoring && !proctoringData && !isPreviewMode) {
    return null;
  }

  const handleResumeMedia = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const currentData = getGlobalProctoringData() || { photoBlob: null, screenshotBlob: null, screenStream: null, cameraStream: null };
      const newData = { ...currentData, cameraStream: newStream };
      setGlobalProctoringData(newData);
      setProctoringData(newData);
      setMediaDisabled(false);
    } catch (err) {
      alert("Failed to access camera/microphone. Please ensure permissions are granted.");
    }
  };

  if (mediaDisabled && !isSubmittingRef.current && modal?.kind !== "submitting-evaluation" && modal?.kind !== "proctoring-violation") {
    return (
      <div className="fixed inset-0 z-[9999] bg-neutral-900 flex flex-col items-center justify-center text-white">
        <div className="max-w-md text-center p-8 bg-neutral-800 rounded-xl shadow-2xl">
          <div className="text-4xl mb-4">📷</div>
          <h2 className="text-xl font-bold mb-2">Camera or Microphone Disabled</h2>
          <p className="text-neutral-300 mb-6 text-sm">
            Please turn on your camera and microphone to continue the evaluation. 
            If you have denied permissions, you may need to allow them in your browser settings.
          </p>
          <button 
            onClick={handleResumeMedia} 
            className="bg-white text-neutral-900 px-6 py-2 rounded-md font-medium text-sm hover:bg-neutral-200"
          >
            {submittedSections.size === 0 && !labSubmissionsData?.length ? "Start Evaluation" : "Resume Evaluation"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`eval-theme flex h-screen w-screen flex-col overflow-hidden bg-[#fafaf7] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 antialiased`}>
      <TopBar
        remaining={remaining}
        online={online}
        autosave={autosave}
        section={section}
        appSections={appSections}
        activeItemInfo={activeTimerInfo}
        onExit={() => setModal({ kind: "exit" })}
        proctoringActive={anySectionNeedsProctoring}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          appSections={appSections}
          section={section}
          openLab={openLab}
          activeQuestionId={String(qIndex)}
          onSelectSection={goSection}
          onSelectLab={(id) => { 
            if (submittedLabs.has(id)) return;
            const labSec = appSections.find(s => s.type === "LAB" && s.labs.some(l => l.id === id));
            if (labSec) {
              const secIdx = appSections.findIndex(s => s.id === labSec.id);
              if (isSectionUnlocked(secIdx) && !submittedSections.has(labSec.id)) {
                setSection(labSec.id);
                setOpenLab(id);
                if (evaluationId && id) {
                  evaluationService.startLab(evaluationId, id).catch((err) => {
                    console.error("Failed to start lab workspace from sidebar:", err);
                  });
                }
              }
            }
          }}
          onSelectQuestion={(secId, idxStr) => { 
            if (submittedSections.has(secId)) return;
            const targetIdx = appSections.findIndex(s => s.id === secId);
            if (isSectionUnlocked(targetIdx)) {
              setSection(secId);
              setQIndex(parseInt(idxStr));
            }
          }}
          getSectionStatus={getSectionStatus}
          getLabStatus={getLabStatus}
          discussionStatus={discussionStatus}
          submittedLabs={submittedLabs}
          submittedSections={submittedSections}
          isSectionUnlocked={isSectionUnlocked}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
        />

        <main className={`min-w-0 flex-1 ${activeSection?.type === "LAB" && openLab ? "flex flex-col h-full overflow-hidden min-h-0" : "overflow-y-auto"}`}>
          {appSections.map(sec => {
            if (sec.id !== section) return null;
            if (sec.type === "LAB") {
              return openLab ? (() => {
                const lab = sec.labs.find(l => l.id === openLab);
                if (!lab) return null;
                const mappedTicket = {
                  id: lab.id,
                  title: lab.title,
                  description: lab.problem,
                  tag: lab.tag,
                  type: lab.type,
                  ticket_type: lab.ticket_type || lab.type,
                  backend_frameworks: (lab as any).backend_frameworks || [],
                  programming_languages: (lab as any).programming_languages || [],
                  databases: (lab as any).databases || [],
                  tasks: lab.tasks.map(t => ({ 
                    id: t.id, 
                    title: t.title, 
                    description: t.description,
                    original_index: (t as any).original_index,
                    marks: (t as any).marks,
                    duration_minutes: (t as any).duration_minutes,
                    scoring_rules: t.scoring_rules,
                    solution: t.solution,
                    expected_output: t.expected_output
                  })),
                  difficulty: "Intermediate",
                  xp: 100,
                  estMin: lab.minutes,
                  sprintOrder: 1,
                  ticketOrder: 1,
                  learning_objectives: [],
                  common_mistakes: [],
                  startup_command: lab.startup_command,
                  test_command: (lab as any).test_command,
                  connection_url: lab.connection_url,
                  marks: (lab as any).marks || 10,
                  points: (lab as any).points || (lab as any).marks || 10,
                  max_score: (lab as any).max_score || (lab as any).marks || 10,
                  file: (lab as any).starterPath || (lab as any).starter_path || lab.file,
                  code: (lab as any).starterCode || (lab as any).starter_code || lab.code,
                  starterCode: (lab as any).starterCode || (lab as any).starter_code || (lab.code !== "// Code editor initialized." ? lab.code : undefined),
                  starterPath: (lab as any).starterPath || (lab as any).starter_path || lab.file,
                  solution: (lab as any).solution,
                  solution_files: (lab as any).solution_files,
                  solutions: (lab as any).solutions,
                };
                const starterCodeVal = (lab as any).starterCode || (lab as any).starter_code || ((lab.code && lab.code !== "// Code editor initialized.") ? lab.code : undefined);
                return (
                  <TicketIDE
                    key={lab.id}
                    slug={lab.id}
                    ticket={mappedTicket}
                    previewOverride={starterCodeVal ? { starterCode: starterCodeVal } : null}
                    isEvaluationMode={true}
                    isRecruiterPreview={isRecruiterPreview}
                    evaluationId={evaluationId}
                  />
                );
              })() : (
                <LabsList
                  key={sec.id}
                  labs={sec.labs}
                  submitted={submittedLabs}
                  onOpen={(id) => {
                    setOpenLab(id);
                    if (evaluationId && id) {
                      evaluationService.startLab(evaluationId, id).catch((err) => {
                        console.error("Failed to start lab workspace:", err);
                      });
                    }
                  }}
                  onFinishSection={() => {
                    setSubmittedSections(prev => new Set(prev).add(sec.id));
                    const idx = appSections.findIndex(s => s.id === sec.id);
                    if (idx + 1 < appSections.length) {
                      setSection(appSections[idx + 1].id);
                      setOpenLab(null);
                      setQIndex(0);
                    } else {
                      setModal({ kind: "submit-evaluation" });
                    }
                  }}
                />
              );
            } else if (sec.type === "KNOWLEDGE_ASSESSMENT") {
              return (
                <KnowledgeRunner evaluationId={evaluationId}
                  key={sec.id}
                  subject={sec}
                  submitted={submittedSections.has(sec.id)}
                  index={qIndex}
                  setIndex={setQIndex}
                  answers={answers}
                  setAnswer={(qId, val) => { setAnswers(prev => ({ ...prev, [qId]: val })); touchAutosave(); }}
                  clearAnswer={(qId) => { setAnswers(prev => { const next = { ...prev }; delete next[qId]; return next; }); touchAutosave(); }}
                  marked={marked[sec.id] || new Set()}
                  onMark={(qId) => {
                    setMarked(prev => {
                      const s = new Set(prev[sec.id] || []);
                      if (s.has(qId)) s.delete(qId);
                      else s.add(qId);
                      return { ...prev, [sec.id]: s };
                    });
                    touchAutosave();
                  }}
                  onBack={() => {}}
                  onSubmit={() => setModal({ kind: "submit-section", id: sec.id })}
                  onFinishSection={() => {
                    const idx = appSections.findIndex(s => s.id === sec.id);
                    if (idx + 1 < appSections.length) {
                      setSection(appSections[idx + 1].id);
                      setOpenLab(null);
                      setQIndex(0);
                    } else {
                      setModal({ kind: "submit-evaluation" });
                    }
                  }}
                  nextSectionTitle={appSections.findIndex(s => s.id === sec.id) + 1 < appSections.length ? appSections[appSections.findIndex(s => s.id === sec.id) + 1].title : undefined}
                  codingCode={codingCode}
                  setCodingCode={(qId, val) => setCodingCode(prev => ({ ...prev, [qId]: val }))}
                  codingResults={codingResults}
                  runCode={(qId) => {
                    const code = codingCode[qId] || "";
                    if (code.length > 5) {
                      setCodingResults(prev => ({ ...prev, [qId]: [{ name: "Example test", pass: true }, { name: "Edge cases", pass: Math.random() > 0.5 }] }));
                    } else {
                      setCodingResults(prev => ({ ...prev, [qId]: [{ name: "Example test", pass: false }] }));
                    }
                  }}
                  isRecruiterPreview={isRecruiterPreview}
                />
              );
            } else if (sec.type === "SYSTEM_DESIGN") {
              const nextSec = appSections.findIndex(s => s.id === sec.id) + 1 < appSections.length
                ? appSections[appSections.findIndex(s => s.id === sec.id) + 1].title
                : undefined;
              return (
                <EvaluationSystemDesignSection
                  key={sec.id}
                  evaluationId={evaluationId}
                  section={sec as any}
                  isRecruiterPreview={isRecruiterPreview}
                  isSubmitted={submittedSections.has(sec.id)}
                  nextSectionTitle={nextSec}
                  onFinishSection={() => {
                    setSubmittedSections(prev => new Set(prev).add(sec.id));
                    const idx = appSections.findIndex(s => s.id === sec.id);
                    if (idx + 1 < appSections.length) {
                      setSection(appSections[idx + 1].id);
                      setOpenLab(null);
                      setQIndex(0);
                    } else {
                      setModal({ kind: "submit-evaluation" });
                    }
                  }}
                />
              );
            } else if (sec.type === "VITARKA_AI_INTERVIEW") {
              let meta: any = {};
              try { meta = JSON.parse(sec.description || "{}"); } catch {}
              return (
                <VitarkaInterviewScreen
                  ref={vitarkaRef}
                  key={sec.id}
                  mockInterviewId={meta.mockInterviewId}
                  candidateContext={candidateContextString}
                  discussionMaxScore={meta.marks ?? meta.max_score ?? 25}
                  onEnd={() => setModal({ kind: "end-discussion" })}
                  onQuestionChange={(q) => setActiveDiscussionQuestion(q)}
                  onSessionStart={(sId) => {
                    logActivity('vitarka_session_started', { session_id: sId });
                    const timerKey = `eval_${evalPrefix}_timer_sec_${sec.id}`;
                    if (!getStorageItem(timerKey)) {
                      setStorageItem(timerKey, new Date().toISOString());
                      setRemaining(computeRemaining(activeTimerInfo));
                    }
                  }}
                />
              );
            }
            return null;
          })}
          {section === "discussion-dummy" && (
            <VitarkaInterviewScreen
              ref={vitarkaRef}
              mockInterviewId={appSections.find(s => s.type === "VITARKA_AI_INTERVIEW")?.description ? JSON.parse(appSections.find(s => s.type === "VITARKA_AI_INTERVIEW")!.description || "{}").mockInterviewId : ""}
              candidateContext={candidateContextString}
              discussionMaxScore={(() => {
                try {
                  const d = JSON.parse(appSections.find(s => s.type === "VITARKA_AI_INTERVIEW")?.description || "{}");
                  return d.marks ?? d.max_score ?? 25;
                } catch { return 25; }
              })()}
              onEnd={() => setModal({ kind: "end-discussion" })}
              onQuestionChange={(q) => setActiveDiscussionQuestion(q)}
              onSessionStart={(sId) => {
                logActivity('vitarka_session_started', { session_id: sId });
                const vSec = appSections.find(s => s.type === "VITARKA_AI_INTERVIEW");
                if (vSec) {
                  const timerKey = `eval_${evalPrefix}_timer_sec_${vSec.id}`;
                  if (!getStorageItem(timerKey)) {
                    setStorageItem(timerKey, new Date().toISOString());
                    setRemaining(computeRemaining(activeTimerInfo));
                  }
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {modal?.kind === "submit-lab" && (
        <Confirm
          title="Submit this lab?"
          body="Once submitted, you cannot reopen this lab. Your task progress and code will be locked in."
          confirm="Submit lab"
          onConfirm={() => confirmSubmitLab(modal.id)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "submit-section" && (
        <Confirm
          title={`Submit ${appSections.find(s => s.id === modal.id)?.title} section?`}
          body="Once submitted, your answers will be recorded and you will proceed to the next section. You cannot return to this section once submitted."
          confirm="Submit section"
          onConfirm={() => confirmSubmitSection(modal.id)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "end-discussion" && (
        <Confirm
          title="End the engineering discussion?"
          body="This will conclude your evaluation and generate your report."
          confirm="End and submit"
          onConfirm={async () => {
            setModal({ kind: "submitting-evaluation" });
            try {
              if (vitarkaRef.current) {
                await vitarkaRef.current.confirmEnd();
              }
            } catch (e) {
              console.error(e);
            }
            await submitEvaluation(false);
          }}
          onCancel={() => {
            setModal(null);
            vitarkaRef.current?.cancelEnd();
          }}
        />
      )}
      {modal?.kind === "submit-evaluation" && (
        <Confirm
          title="Submit the evaluation?"
          body="This will conclude your evaluation and generate your report."
          confirm="Submit evaluation"
          onConfirm={async () => {
            setModal({ kind: "submitting-evaluation" });
            try {
              if (vitarkaRef.current) {
                await vitarkaRef.current.confirmEnd();
              }
            } catch (e) {
              console.error(e);
            }
            await submitEvaluation(false);
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "exit" && (
        <Confirm
          title="Exit the evaluation?"
          body="Your progress will not be saved and you may lose access to this evaluation. Are you sure?"
          confirm="Exit evaluation"
          destructive
          onConfirm={async () => {
            setModal({ kind: "submitting-evaluation" });
            try {
              if (vitarkaRef.current) {
                await vitarkaRef.current.confirmEnd();
              }
            } catch (e) {
              console.error(e);
            }
            await submitEvaluation(false);
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "submitting-evaluation" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
              <svg className="h-6 w-6 animate-spin text-neutral-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="font-serif text-[22px] leading-tight tracking-tight text-neutral-900">
              Submitting Evaluation...
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">
              Your responses are being recorded and your final report is being generated. Please wait.
            </p>
          </div>
        </div>
      )}

      {modal?.kind === "discussion-starting" && (
        <Confirm
          title="The engineering discussion will now begin"
          body="The engineering discussion is starting. Ensure your microphone is ready."
          confirm="Begin discussion"
          onConfirm={() => setModal(null)}
        />
      )}
      {modal?.kind === "proctoring-violation" && (
        <Confirm
          title="Proctoring Warning"
          body={modal.message}
          confirm="I understand"
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "tab-warning" && (
        <Confirm
          title="Please stay on this tab"
          body="Switching tabs or windows during your evaluation is recorded. Repeated tab switches may end your evaluation."
          confirm="I understand"
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "fullscreen" && (
        <Confirm
          title="Fullscreen Required"
          body="This evaluation requires you to be in fullscreen mode. Please enter fullscreen to continue."
          confirm="Full screen"
          onConfirm={() => {
            document.documentElement.requestFullscreen().catch(console.error);
            setModal(null);
          }}
          onCancel={() => {
            submitEvaluation(true);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Top bar
// ────────────────────────────────────────────────────────────────────────────

function TopBar({ 
  remaining, 
  online, 
  autosave, 
  section, 
  appSections, 
  activeItemInfo, 
  onExit,
  proctoringActive
}: { 
  remaining: number; 
  online: boolean; 
  autosave: "idle" | "saving" | "saved"; 
  section: string | null; 
  appSections: AppSection[]; 
  activeItemInfo: any; 
  onExit: () => void;
  proctoringActive: boolean;
}) {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const isCompleted = activeItemInfo?.isSubmitted;
  const critical = !isCompleted && remaining <= 5 * 60;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0c0c0e]/80 px-5 backdrop-blur text-neutral-900 dark:text-neutral-100">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-neutral-900 dark:bg-neutral-800 text-[10px] font-mono text-white">Y</div>
        <div className="min-w-0">
          <div className="truncate text-[12px] leading-none text-neutral-500 dark:text-neutral-400">Yuvro Labs · Evaluation</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span>Section:</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
              {activeItemInfo?.title || sectionLabel(section, appSections)}
            </span>
            {activeItemInfo?.subTitle && (
              <>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                  {activeItemInfo.subTitle}
                </span>
              </>
            )}
            {isCompleted && (
              <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Completed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium">
          {isCompleted ? "Status" : "Time remaining"}:
        </span>
        <div className={`font-mono text-[15px] font-semibold tracking-wide ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : critical ? "text-red-600 dark:text-red-400 animate-pulse" : "text-neutral-800 dark:text-neutral-200"}`}>
          {isCompleted ? "Done" : fmt(remaining)}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
        <StatusDot label={online ? "Online" : "Reconnecting"} tone={online ? "ok" : "warn"} />
        <StatusDot label={proctoringActive ? "Proctoring" : "Proctoring Disabled"} tone={proctoringActive ? "ok" : "error"} />
        <button onClick={onExit} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">Exit</button>
        <ThemeToggle />
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition hover:border-neutral-900 dark:hover:border-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100 ml-1"
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}

function StatusDot({ label, tone }: { label: string; tone: "ok" | "warn" | "error" }) {
  const bg = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="hidden items-center gap-1.5 sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${bg}`} />
      {label}
    </span>
  );
}

function sectionLabel(s: string | null, appSections: AppSection[]) {
  if (!s) return "";

  if (s === "knowledge") return "Knowledge Assessment";
  const sec = appSections.find(x => x.id === s);
  return sec ? sec.title : s;
}

// ────────────────────────────────────────────────────────────────────────────
// Sidebar
// ────────────────────────────────────────────────────────────────────

type Status = "not-started" | "current" | "in-progress" | "complete" | "locked";

function Sidebar({
  appSections,
  section, openLab, activeQuestionId,
  onSelectSection, onSelectLab, onSelectQuestion,
  getSectionStatus, getLabStatus, discussionStatus,
  submittedLabs, submittedSections, isSectionUnlocked,
  collapsed, onToggleCollapse,
}: {
  appSections: AppSection[];
  section: string | null; openLab: string | null; activeQuestionId: string | null;
  onSelectSection: (s: string) => void; onSelectLab: (id: string) => void; onSelectQuestion: (secId: string, id: string) => void;
  getSectionStatus: (id: string) => Status; getLabStatus: (secId: string, labs: RealLab[]) => Status; discussionStatus: Status;
  submittedLabs: Set<string>; submittedSections: Set<string>; isSectionUnlocked: (idx: number) => boolean;
  collapsed: boolean; onToggleCollapse: () => void;
}) {
  const labSections = appSections.filter(s => s.type === "LAB");
  const knowledgeSections = appSections.filter(s => s.type === "KNOWLEDGE_ASSESSMENT");
  const systemDesignSections = appSections.filter(s => s.type === "SYSTEM_DESIGN");
  const discussionSection = appSections.find(s => s.type === "VITARKA_AI_INTERVIEW");

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hasInitializedExpand, setHasInitializedExpand] = useState(false);

  const knowledgeHierarchy = useMemo(() => {
    if (knowledgeSections.length === 0) return null;
    
    type Hierarchy = Record<string, Record<string, Record<string, any[]>>>;
    const h: Hierarchy = {};

    knowledgeSections.forEach(sec => {
      sec.questions.forEach((q, localIdx) => {
        const item = { q, parentSec: sec, localIdx };
        
        const subject = (q as any).course_title || (q as any).course_name || "Other Subjects";
        const topic = (q as any).topic_title || (q as any).topic_name || "Other Topics";
        
        let format = q.format || q.type || (Array.isArray(q.options) && q.options.length > 0 ? "MCQ" : "Description");
        if (format === "MCQ" || format === "mcq_single") format = "MCQ";
        else if (format === "Multiple Select" || format === "mcq_multiple") format = "Multiple MCQ";
        else if (format === "Coding" || format === "coding") format = "Coding";
        else format = "Other";

        if (!h[subject]) h[subject] = {};
        if (!h[subject][topic]) h[subject][topic] = {};
        if (!h[subject][topic][format]) h[subject][topic][format] = [];
        
        h[subject][topic][format].push(item);
      });
    });

    const sortedH: any[] = [];
    Object.keys(h).sort().forEach(subj => {
      const subjObj = { name: subj, topics: [] as any[] };
      Object.keys(h[subj]).sort().forEach(top => {
        const topObj = { name: top, formats: [] as any[] };
        const formatOrder = ["MCQ", "Multiple MCQ", "Coding", "Other"];
        const existingFormats = Object.keys(h[subj][top]);
        formatOrder.forEach(f => {
          if (existingFormats.includes(f)) {
            topObj.formats.push({ name: f, questions: h[subj][top][f] });
          }
        });
        existingFormats.forEach(f => {
          if (!formatOrder.includes(f)) {
            topObj.formats.push({ name: f, questions: h[subj][top][f] });
          }
        });
        subjObj.topics.push(topObj);
      });
      sortedH.push(subjObj);
    });

    return sortedH;
  }, [knowledgeSections]);

  useEffect(() => {
    if (knowledgeHierarchy && !hasInitializedExpand) {
      const initial = new Set<string>();
      knowledgeHierarchy.forEach((s: any) => {
        initial.add(`subj-${s.name}`);
        s.topics.forEach((t: any) => {
          initial.add(`top-${s.name}-${t.name}`);
        });
      });
      setExpandedNodes(initial);
      setHasInitializedExpand(true);
    }
  }, [knowledgeHierarchy, hasInitializedExpand]);

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  let sectionCount = 0;
  if (labSections.length > 0) sectionCount++;
  if (knowledgeSections.length > 0) sectionCount++;
  if (systemDesignSections.length > 0) sectionCount += systemDesignSections.length;
  if (discussionSection) sectionCount++;

  const firstKnowSec = knowledgeSections[0];
  const knowIdx = firstKnowSec ? appSections.findIndex(s => s.id === firstKnowSec.id) : -1;
  const isKnowUnlocked = knowIdx !== -1 ? isSectionUnlocked(knowIdx) : true;
  const knowStatus: Status = !isKnowUnlocked
    ? "locked"
    : (knowledgeSections.every(s => submittedSections.has(s.id)) && knowledgeSections.length > 0
        ? "complete"
        : (knowledgeSections.some(s => section === s.id) ? "current" : "not-started"));

  let counter = 1;
  const getNum = () => String(counter++).padStart(2, "0");

  if (collapsed) {
    return (
      <aside className="hidden w-12 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-[#0c0c0e]/60 md:flex flex-col items-center py-4">
        <button onClick={onToggleCollapse} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition" title="Expand Sidebar">
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-[#0c0c0e]/60 md:flex flex-col h-full overflow-y-auto">
      <div className="border-b border-neutral-200 dark:border-neutral-800 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Evaluation</div>
          <div className="mt-1 font-serif text-[16px] tracking-tight text-neutral-900 dark:text-neutral-100">{sectionCount} sections</div>
        </div>
        <button onClick={onToggleCollapse} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition" title="Collapse Sidebar">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2 py-3 text-[13px]">
        {labSections.map((sec) => {
          const labStatus = getLabStatus(sec.id, sec.labs);
          return (
            <SectionItem
              key={sec.id}
              n={getNum()} label={sec.title} status={labStatus}
              onClick={() => onSelectSection(sec.id)}
              disabled={labStatus === "locked" || labStatus === "complete"}
            >
              {labStatus !== "locked" && labStatus !== "complete" && (
                <div className="mt-2 flex flex-col gap-0.5 pl-8">
                  {sec.labs.map(l => {
                    const isLabDone = submittedLabs.has(l.id);
                    return (
                      <button
                        key={l.id}
                        disabled={isLabDone}
                        onClick={() => onSelectLab(l.id)}
                        className={`flex items-center justify-between rounded-md px-2 py-1 text-left transition ${openLab === l.id && section === sec.id ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium" : isLabDone ? "text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-60" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-850 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
                      >
                        <span className="truncate text-[12px]">{l.title}</span>
                        {isLabDone && <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Done</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionItem>
          );
        })}

        {knowledgeSections.length > 0 && knowledgeHierarchy && (
          <SectionItem
            n={getNum()} label="Knowledge Assessment" status={knowStatus}
            onClick={() => onSelectQuestion(knowledgeSections[0].id, "0")}
            disabled={knowStatus === "locked" || knowStatus === "complete"}
          >
            {knowStatus !== "locked" && knowStatus !== "complete" && (
              <div className="mt-2 flex flex-col pl-3">
                {knowledgeHierarchy.map((subj: any) => {
                  const subjId = `subj-${subj.name}`;
                  const isSubjExpanded = expandedNodes.has(subjId);
                  return (
                    <div key={subjId} className="flex flex-col">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleNode(subjId); }} 
                        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        {isSubjExpanded ? <ChevronDown className="h-3 w-3 text-neutral-400" /> : <ChevronRight className="h-3 w-3 text-neutral-400" />}
                        <span className="truncate">{subj.name}</span>
                      </button>
                      {isSubjExpanded && (
                        <div className="flex flex-col pl-4 border-l border-neutral-100 ml-3">
                          {subj.topics.map((top: any) => {
                            const topId = `top-${subj.name}-${top.name}`;
                            const isTopExpanded = expandedNodes.has(topId);
                            return (
                              <div key={topId} className="flex flex-col mt-0.5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleNode(topId); }} 
                                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition"
                                >
                                  {isTopExpanded ? <ChevronDown className="h-3 w-3 text-neutral-400" /> : <ChevronRight className="h-3 w-3 text-neutral-400" />}
                                  <span className="truncate">{top.name}</span>
                                </button>
                                {isTopExpanded && (
                                  <div className="flex flex-col pl-4 border-l border-neutral-100 ml-3">
                                    {top.formats.map((fmt: any) => (
                                      <div key={fmt.name} className="flex flex-col mt-1 mb-1">
                                        <div className="flex items-center px-2 py-0.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                          {fmt.name}
                                        </div>
                                        <div className="flex flex-col mt-0.5 ml-1">
                                          {fmt.questions.map((item: any) => {
                                            const isCurrent = section === item.parentSec.id && activeQuestionId === String(item.localIdx);
                                            const isQuestionSecDone = submittedSections.has(item.parentSec.id);
                                            return (
                                              <button
                                                key={item.q.id}
                                                disabled={isQuestionSecDone}
                                                onClick={(e) => { e.stopPropagation(); onSelectQuestion(item.parentSec.id, String(item.localIdx)); }}
                                                className={`flex items-center justify-between rounded-md px-2 py-1 text-left transition ${isCurrent ? "bg-neutral-100 text-neutral-900 font-medium" : isQuestionSecDone ? "text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-60" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"}`}
                                              >
                                                <span className="truncate text-[11px]">{item.q.q}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionItem>
        )}

        {systemDesignSections.map((sec) => {
          const secIdx = appSections.findIndex(s => s.id === sec.id);
          const isUnlocked = isSectionUnlocked(secIdx);
          const isDone = submittedSections.has(sec.id);
          const status: Status = !isUnlocked
            ? "locked"
            : isDone
            ? "complete"
            : section === sec.id
            ? "current"
            : "not-started";

          return (
            <SectionItem
              key={sec.id}
              n={getNum()}
              label={sec.title}
              status={status}
              hint={status === "locked" ? "Unlock by completing prior sections" : isDone ? "Submitted" : `${(sec as any).duration_minutes || 45} min · ${(sec as any).marks || 100} marks`}
              onClick={() => onSelectSection(sec.id)}
              disabled={status === "locked" || status === "complete"}
            />
          );
        })}

        {discussionSection && (
          <SectionItem
            n={getNum()} label={discussionSection.title} status={discussionStatus}
            hint={discussionStatus === "locked" ? "Unlock by completing prior sections" : discussionStatus === "complete" ? "Completed" : "Engineering discussion"}
            onClick={() => onSelectSection(discussionSection.id)}
            disabled={discussionStatus === "locked" || discussionStatus === "complete"}
          />
        )}
      </nav>
    </aside>
  );
}

function SectionItem({ n, label, status, hint, onClick, disabled, children }: { n: string; label: string; status: Status; hint?: string; onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <div>
      <button
        disabled={disabled}
        onClick={onClick}
        className={`group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${status === "current" ? "bg-neutral-100 dark:bg-neutral-850" : status === "locked" || status === "complete" ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"} disabled:cursor-not-allowed`}
      >
        <span className="mt-0.5 font-mono text-[10px] tracking-widest text-neutral-400 dark:text-neutral-500">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`text-[13px] ${status === "current" ? "text-neutral-900 dark:text-neutral-100 font-medium" : status === "locked" || status === "complete" ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-700 dark:text-neutral-300"}`}>{label}</span>
            <StatusChip status={status} />
          </span>
          {hint && <span className="mt-0.5 block text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</span>}
        </span>
      </button>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    "not-started": { label: "", cls: "" },
    "current": { label: "Current", cls: "text-neutral-900 dark:text-neutral-100 font-medium" },
    "in-progress": { label: "In progress", cls: "text-amber-600 dark:text-amber-500 font-medium" },
    "complete": { label: "Done", cls: "text-neutral-400 dark:text-neutral-500 font-medium" },
    "locked": { label: "Locked", cls: "text-neutral-400 dark:text-neutral-600" },
  };
  const { label, cls } = map[status];
  if (!label) return null;
  return <span className={`text-[10px] uppercase tracking-wider ${cls}`}>· {label}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Labs
// ────────────────────────────────────────────────────────────────────────────

function LabsList({ labs, submitted, onOpen, onFinishSection, nextSectionTitle }: { labs: RealLab[]; submitted: Set<LabId>; onOpen: (id: LabId) => void; onFinishSection: () => void; nextSectionTitle?: string }) {
  const allDone = submitted.size === labs.length;
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <SectionHeader eyebrow="Section 01" title="Engineering Labs" body="Two labs. Pick one to start. You can submit each independently." />
      <div className="mt-10 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {labs.map((l, i) => {
          const done = submitted.has(l.id);
          return (
            <div key={l.id} className="flex items-center justify-between gap-6 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] tracking-widest text-neutral-400 dark:text-neutral-500">L0{i + 1}</span>
                  <div className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">{l.title}</div>
                  {done && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">· Submitted</span>}
                </div>
                <div className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">{l.sub} · ~{l.minutes} min</div>
              </div>
              {done ? (
                <span className="rounded-lg border border-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-[13px] text-neutral-400 dark:text-neutral-500 font-medium cursor-not-allowed">
                  Submitted
                </span>
              ) : (
                <button
                  onClick={() => onOpen(l.id)}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-[13px] text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                >
                  Open lab
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{submitted.size} of {labs.length} submitted</span>
        <button onClick={onFinishSection} disabled={!allDone} className="rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-[13px] font-medium text-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600">
          {nextSectionTitle ? `Continue to ${nextSectionTitle} →` : "Submit Evaluation"}
        </button>
      </div>
    </div>
  );
}

function DummyEditor({
  file, code, terminal,
  onCodeChange, disabled,
  runCode, codingResults
}: {
  file: string; code: string; terminal: string[];
  onCodeChange?: (val: string) => void; disabled?: boolean;
  runCode?: () => void; codingResults?: { name: string; pass: boolean }[] | null;
}) {
  const [tab, setTab] = useState<"code" | "terminal" | "db" | "preview" | "docs">("code");
  return (
    <div className="flex min-h-0 flex-col h-full bg-[#fafaf7]">
      <div className="flex items-center gap-1 border-b border-neutral-200 bg-white/80 px-3">
        {(["code", "terminal", "db", "preview", "docs"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-[12px] transition ${tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}
          >
            {t === "code" ? "VS Code" : t === "terminal" ? "Terminal" : t === "db" ? "Database" : t === "preview" ? "Browser" : "Docs"}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "code" && (
          <div className="flex h-full flex-col">
            <div className="border-b border-neutral-200 bg-neutral-50/60 px-4 py-1.5 font-mono text-[11px] text-neutral-500">{file}</div>
            {onCodeChange ? (
              <div className="flex-1 flex flex-col min-h-0 relative">
                <textarea
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  spellCheck={false}
                  disabled={disabled}
                  className="flex-1 w-full resize-none bg-[#0b0b0c] p-5 font-mono text-[12px] leading-relaxed text-[#e4e4e7] outline-none disabled:opacity-70"
                  placeholder="Write your code here..."
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0b0b0c] to-transparent flex items-end justify-between pointer-events-none">
                  <div className="pointer-events-auto">
                    <button onClick={runCode} disabled={disabled} className="rounded-md border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-[12px] text-white hover:border-neutral-500 disabled:opacity-50">Run Test Cases</button>
                  </div>
                  <div className="pointer-events-auto flex gap-3 text-[12px] font-mono bg-[#0b0b0c] p-2 rounded-md">
                    {codingResults && codingResults.map((r, i) => (
                      <span key={i} className={r.pass ? "text-emerald-500" : "text-red-500"}>{r.name}: {r.pass ? "pass" : "fail"}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <pre className="flex-1 overflow-auto bg-[#0b0b0c] p-5 font-mono text-[12px] leading-relaxed text-[#e4e4e7]">
                {code.split("\n").map((line, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="w-6 select-none text-right text-[#555]">{i + 1}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </pre>
            )}
          </div>
        )}
        {tab === "terminal" && (
          <pre className="h-full overflow-auto bg-[#0b0b0c] p-5 font-mono text-[12px] leading-relaxed text-[#e4e4e7]">
            {terminal.join("\n")}
          </pre>
        )}
        {tab === "db" && (
          <div className="p-6 text-[13px] text-neutral-600">
            <div className="text-neutral-900">Connected to <span className="font-mono">yuvro_lab_db</span></div>
            <div className="mt-2 text-neutral-500">7 tables · 14,204,881 rows · seeded for this lab.</div>
          </div>
        )}
        {tab === "preview" && (
          <div className="grid h-full place-items-center bg-neutral-50/60 text-[12px] text-neutral-500">Browser preview attached to <span className="mx-1 font-mono text-neutral-900">http://localhost:3000</span></div>
        )}
        {tab === "docs" && (
          <div className="p-6 text-[13px] text-neutral-600">
            <div className="text-neutral-900">Reference</div>
            <ul className="mt-2 list-disc pl-4 text-neutral-500">
              <li>Internal runbook — retry policies</li>
              <li>Postgres query planner cheatsheet</li>
              <li>Swagger / API reference</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function LabDetail({ lab, tasks, submitted, onToggleTask, onBack, onSubmit }: { lab: RealLab; tasks: Set<number>; submitted: boolean; onToggleTask: (i: number) => void; onBack: () => void; onSubmit: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-6 py-3 text-[12px]">
        <button onClick={onBack} className="text-neutral-500 hover:text-neutral-900">← All labs</button>
        <div className="text-neutral-500">Lab · <span className="text-neutral-900">{lab.title}</span></div>
        <button onClick={onSubmit} disabled={submitted} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
          {submitted ? "Submitted" : "Submit lab"}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
        <div className="min-h-0 overflow-y-auto border-r border-neutral-200 bg-white/60 p-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Problem</div>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-700">{lab.problem}</p>

          <div className="mt-8 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Tasks</div>
          <ol className="mt-3 space-y-2">
            {lab.tasks.map((t, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-neutral-100">
                  <input type="checkbox" checked={tasks.has(i)} onChange={() => onToggleTask(i)} disabled={submitted} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
                  <span className={`text-[13px] flex-1 ${tasks.has(i) ? "text-neutral-400" : "text-neutral-800"}`}>
                    <div className={tasks.has(i) ? "line-through" : "font-medium"}>{t.title}</div>
                    {t.description && <div className="mt-0.5 text-[12px] text-neutral-500 line-clamp-2">{t.description}</div>}
                  </span>
                </label>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-[11px] text-neutral-500">
            {tasks.size} of {lab.tasks.length} tasks marked complete. This is only your local tracker.
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <DummyEditor
            file={lab.file}
            code={lab.code}
            terminal={lab.terminal}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Knowledge Assessment
// ────────────────────────────────────────────────────────────────────────────

function KnowledgeList({ sections, submitted, onOpen, onFinishSection, nextSectionTitle }: { sections: any[]; submitted: Set<string>; onOpen: (id: string) => void; onFinishSection: () => void; nextSectionTitle?: string }) {
  const allDone = sections.length > 0 && sections.every(s => submitted.has(s.id));
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <SectionHeader eyebrow="Section 02" title="Knowledge Assessment" body={`${sections.length} subjects. Submit each independently — you'll only see the summary at the end.`} />
      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map(s => {
          const done = submitted.has(s.id);
          return (
            <button 
              key={s.id} 
              disabled={done}
              onClick={() => onOpen(s.id)} 
              className={`group rounded-xl border p-5 text-left transition ${done ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 cursor-not-allowed opacity-75" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-neutral-600"}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-serif text-[20px] tracking-tight text-neutral-900 dark:text-neutral-100">{s.title}</div>
                {done && <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">Submitted</span>}
              </div>
              <div className="mt-1 text-[12px] text-neutral-500">{s.questions?.length || 0} questions</div>
              <div className="mt-6 text-[12px] text-neutral-400 dark:text-neutral-500">{done ? "Submitted" : "Start subject →"}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">{Array.from(submitted).filter(id => sections.some(s => s.id === id)).length} of {sections.length} submitted</span>
        <button onClick={onFinishSection} disabled={!allDone} className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600">
          {nextSectionTitle ? `Continue to ${nextSectionTitle} →` : "Submit Evaluation"}
        </button>
      </div>
    </div>
  );
}

function KnowledgeRunner({
  subject, submitted, index, setIndex, answers, marked,
  setAnswer, clearAnswer, onMark, onBack, onSubmit, onFinishSection, nextSectionTitle,
  codingCode, setCodingCode, codingResults, runCode, evaluationId, isRecruiterPreview
}: {
  subject: any; submitted: boolean; index: number; setIndex: (i: number) => void;
  answers: Record<string, any>; marked: Set<string>;
  setAnswer: (qId: string, val: any) => void; clearAnswer: (qId: string) => void; onMark: (qId: string) => void;
  onBack: () => void; onSubmit: () => void; onFinishSection?: () => void; nextSectionTitle?: string;
  codingCode: Record<string, string>; setCodingCode: (qId: string, val: string) => void;
  codingResults: Record<string, { name: string; pass: boolean }[] | null>; runCode: (qId: string) => void; evaluationId?: string;
  isRecruiterPreview?: boolean;
}) {
  const q = subject.questions[index];
  const disabled = submitted;
  if (!q) return null;

  if (q.format === "Coding" || q.type === "coding") {
    const mappedTicket = {
      id: q.id,
      title: q.q,
      description: q.description || q.q,
      tag: q.programming_languages?.[0]?.toLowerCase() || "javascript",
      ticket_type: "algo",
      tasks: (q.test_cases_basic || []).map((tc: any, i: number) => ({
        id: `tc-${i}`,
        title: `Test Case ${i + 1}`,
        description: "",
        input: tc.input,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden || false
      })),
      hints: q.hints || [],
      solutions: q.solutions || [],
      difficulty: q.difficulty || "Intermediate",
      xp: 10,
      estMin: 15,
      sprintOrder: index + 1,
      ticketOrder: 1,
      learning_objectives: [],
      common_mistakes: [],
    };

    return (
      <div className="flex h-full flex-col bg-[#0B0D11] overflow-hidden">
        <div className="min-h-0 flex-1">
          <TicketIDE
            key={mappedTicket.id}
            slug="knowledge"
            ticket={mappedTicket}
            previewOverride={answers[q.id] ? { starterCode: answers[q.id] } : null}
            initialFiles={codingCode[q.id] ? JSON.parse(codingCode[q.id]) : undefined}
            isEvaluationMode={true}
            isRecruiterPreview={isRecruiterPreview}
            evaluationId={evaluationId}
            onCodeChange={(files) => {
              setCodingCode(q.id, JSON.stringify(files));
              setAnswer(q.id, Object.values(files).join('\n\n'));
            }}
            headerActions={
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => setIndex(Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
                >
                  Previous
                </button>
                {index < subject.questions.length - 1 ? (
                  <button
                    onClick={() => setIndex(index + 1)}
                    className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
                  >
                    Next
                  </button>
                ) : submitted ? (
                  <button
                    onClick={onFinishSection}
                    className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
                  >
                    {nextSectionTitle ? `Continue to ${nextSectionTitle}` : "Submit Evaluation"}
                  </button>
                ) : (
                  <button
                    onClick={onSubmit}
                    className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
                  >
                    Submit {subject.title}
                  </button>
                )}
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-12 flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between text-[12px] text-neutral-500 dark:text-neutral-400 shrink-0">
        <button onClick={onBack} className="hover:text-neutral-900 dark:hover:text-white transition-colors">← All subjects</button>
        <span>{subject.title} · Question {index + 1} of {subject.questions.length}</span>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#13151A] p-8 flex-1 min-h-0 flex flex-col shadow-sm dark:shadow-xl">
        <div className="font-serif text-[22px] leading-snug tracking-tight text-neutral-900 dark:text-white shrink-0">{q.q}</div>
        {q.description && <div className="mt-3 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400 shrink-0 whitespace-pre-wrap">{q.description}</div>}
        
        <div className="mt-6 flex-1 overflow-y-auto pr-2">
          {q.format === "MCQ" || q.format === "Multiple Select" ? (
            <div className="space-y-2">
              {q.options.map((opt: string, i: number) => {
                const isMulti = q.format === "Multiple Select";
                const ansArray = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] !== undefined ? [answers[q.id]] : []);
                const active = isMulti ? ansArray.includes(i) : answers[q.id] === i;
                return (
                  <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-[13px] transition ${active ? "border-amber-500/50 bg-amber-50 text-neutral-900 dark:bg-amber-500/10 dark:text-white" : "border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/5"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
                    <input 
                      type={isMulti ? "checkbox" : "radio"}
                      disabled={disabled}
                      checked={active}
                      onChange={() => {
                        if (isMulti) {
                          if (active) setAnswer(q.id, ansArray.filter((x: number) => x !== i));
                          else setAnswer(q.id, [...ansArray, i]);
                        } else {
                          setAnswer(q.id, i);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 leading-relaxed">{opt}</div>
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              disabled={disabled}
              rows={8}
              placeholder="Type your answer here..."
              className="w-full resize-none rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/20 p-4 text-[14px] leading-relaxed text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/30 disabled:opacity-70 transition-colors"
            />
          )}
        </div>
        
        <div className="mt-6 flex items-center justify-between text-[12px] shrink-0 pt-4 border-t border-neutral-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
            <button onClick={() => onMark(q.id)} disabled={disabled} className="rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white disabled:opacity-50 transition-colors">
              {marked.has(q.id) ? "Unmark" : "Mark for review"}
            </button>
            <button onClick={() => clearAnswer(q.id)} disabled={disabled} className="hover:text-neutral-900 dark:hover:text-white disabled:opacity-50 transition-colors">Clear answer</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white disabled:opacity-40 transition-colors">Previous</button>
            {index < subject.questions.length - 1 ? (
              <button onClick={() => setIndex(index + 1)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors">Next</button>
            ) : submitted ? (
              <button onClick={onFinishSection} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors">
                {nextSectionTitle ? `Continue to ${nextSectionTitle}` : "Submit Evaluation"}
              </button>
            ) : (
              <button onClick={onSubmit} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors">
                Submit {subject.title}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#13151A] p-4 shrink-0 shadow-sm dark:shadow-none">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Question navigator</div>
        <div className="flex flex-wrap gap-2">
          {subject.questions.map((_: any, i: number) => {
            const answered = answers[subject.questions[i].id] !== undefined && answers[subject.questions[i].id] !== null && answers[subject.questions[i].id] !== "";
            const isCurrent = i === index;
            const isMarked = marked.has(subject.questions[i].id);
            return (
              <button key={i} onClick={() => setIndex(i)} className={`h-9 w-9 rounded-md border text-[12px] font-mono transition ${isCurrent ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : answered ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : isMarked ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-white/30"}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}





function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{eyebrow}</div>
      <h2 className="mt-2 font-serif text-[34px] leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h2>
      {body && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>}
    </div>
  );
}

function Confirm({ title, body, confirm, onConfirm, onCancel, destructive }: { title: string; body: string; confirm: string; onConfirm: () => void; onCancel?: () => void; destructive?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="font-serif text-[22px] leading-tight tracking-tight text-neutral-900">{title}</div>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">{body}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          {onCancel && <button onClick={onCancel} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[13px] text-neutral-700 hover:border-neutral-900 hover:text-neutral-900">Cancel</button>}
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-[13px] text-white ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-800"}`}>{confirm}</button>
        </div>
      </div>
    </div>
  );
}
