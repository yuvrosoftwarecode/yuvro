import { createFileRoute, useNavigate, useSearch, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { evaluationService } from "@/services/evaluationService";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { VitarkaInterviewScreen } from "@/components/discussion/VitarkaInterviewScreen";
import { ChevronDown, ChevronRight, Sun, Moon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { TicketIDE } from "@/routes/student.lab.$slug.ticket.$ticketId";
import ProctoringGate, { ProctoringData } from "@/components/evaluation/ProctoringGate";
import { useProctoring } from "@/hooks/useProctoring";
import { getGlobalProctoringData } from "@/utils/proctoringStore";
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
  | { type: "VITARKA_AI_INTERVIEW", id: string, title: string, description?: string, proctoring: any };

interface RealLab {
  id: string;
  title: string;
  sub: string;
  tag: string;
  minutes: number;
  problem: string;
  tasks: { id: string; title: string; description: string }[];
  file: string;
  code: string;
  terminal: string[];
  startup_command?: string;
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


export function Workspace({ previewData }: { previewData?: any } = {}) {
  const nav = useNavigate({ from: undefined as any });
  const search: any = useRouterState({ select: (s) => s.location.search });
  const evaluationId = previewData ? '' : (search.e || '');

  const [appSections, setAppSections] = useState<AppSection[]>([]);
  const [labsData, setLabsData] = useState<RealLab[]>([]);
  const [discussionQuestions, setDiscussionQuestions] = useState<string[]>(DISCUSSION_QUESTIONS);
  const [debugData, setDebugData] = useState<any>(null);  
  
  useEffect(() => {
    if (previewData) {
      processWorkspaceData(previewData);
      return;
    }
    if (!evaluationId) return;
    evaluationService.getWorkspaceData(evaluationId)
      .then(res => processWorkspaceData(res))
      .catch(err => setDebugData({ error: err.message || err.toString() }));
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
            (sec.questions || []).forEach((q: any) => {
              mappedLabs.push({
                id: q.id || Math.random().toString(),
                title: q.title || "Untitled Lab",
                sub: `${(q.programming_languages || []).join(', ')} · ${(q.databases || []).join(', ')}`,
                tag: (q.programming_languages?.[0] || q.databases?.[0] || "bash").toLowerCase(),
                minutes: q.duration_minutes || 30,
                problem: q.description || q.scenario || "Complete the lab objectives.",
                startup_command: q.startup_command || undefined,
                tasks: Array.isArray(q.tasks) 
                  ? q.tasks.map((t: any) => ({
                      id: t.id || "",
                      title: t.title || "Task",
                      description: t.description || ""
                    }))
                  : typeof q.tasks === 'number'
                  ? Array.from({ length: q.tasks }).map((_, i) => ({
                      id: "",
                      title: `Task ${i + 1}`,
                      description: "Fulfill the specified objective."
                    }))
                  : [
                      { id: "", title: "Main Task", description: "Complete the scenario requirements." }
                    ],
                file: q.programming_languages?.includes("PYTHON") ? "main.py" : q.programming_languages?.includes("JAVA") ? "Main.java" : "index.js",
                code: "// Code editor initialized.",
                terminal: []
              });
              durationMinutes += (q.duration_minutes || 30);
            });
            mappedSections.push({ type: "LAB", id: sec.id, title: sec.title || "Engineering Labs", labs: mappedLabs, proctoring: pc });
          } else if (sec.type === "KNOWLEDGE_ASSESSMENT") {
            mappedSections.push({
              type: "KNOWLEDGE_ASSESSMENT",
              id: sec.id,
              title: sec.title || "Knowledge Assessment",
              proctoring: pc,
              questions: (sec.questions || []).map((q: any) => {
                const isMcq = Array.isArray(q.mcq_options) && q.mcq_options.length > 0;
                let mappedOptions = q.options || [];
                let mappedCorrect = q.correct_answer ?? 0;
                
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
                  marks: q.marks || 1,
                  examples: Array.isArray(q.test_cases_basic) ? q.test_cases_basic : []
                };
              })
            });
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
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [section, setSection] = useState<string | null>(null);
  const [openLab, setOpenLab] = useState<LabId | null>(null);
  const [submittedLabs, setSubmittedLabs] = useState<Set<LabId>>(new Set());
  const [taskState, setTaskState] = useState<Record<string, Set<number>>>({});
  
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({}); // Maps question id to its answer
  const [marked, setMarked] = useState<Record<string, Set<string>>>({}); // Maps section id to set of marked question ids
  const [submittedSections, setSubmittedSections] = useState<Set<string>>(new Set());
  
  const [codingCode, setCodingCode] = useState<Record<string, string>>({});
  const [codingResults, setCodingResults] = useState<Record<string, { name: string; pass: boolean }[] | null>>({});

  const [discussionIndex, setDiscussionIndex] = useState(0);
  const [discussionResponses, setDiscussionResponses] = useState<string[]>([]);
  const [discussionDraft, setDiscussionDraft] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState<null | { kind: "submit-lab"; id: LabId } | { kind: "submit-section"; id: string } | { kind: "end-discussion" } | { kind: "exit" } | { kind: "tab-warning" } | { kind: "discussion-starting" } | { kind: "fullscreen" } | { kind: "proctoring-violation"; message: string }>(null);
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved">("saved");
  const [online, setOnline] = useState(true);
  const discussionTriggered = useRef(false);
  const tabSwitches = useRef(0);

  const [proctoringData, setProctoringData] = useState<ProctoringData | null>(getGlobalProctoringData());
  
  const activeSection = useMemo(() => appSections.find(s => s.id === section), [appSections, section]);
  const proctoringConfig = activeSection?.proctoring || {};
  
  const anySectionNeedsProctoring = useMemo(() => appSections.some(s => s.proctoring?.enableProctoring), [appSections]);

  const { logActivity } = useProctoring({
    assessmentId: evaluationId,
    assessmentType: "skill_evaluation",
    enabled: !!proctoringConfig.enableProctoring,
    questionId: activeQuestionId || openLab || section || undefined,
    mediaStream: proctoringData?.cameraStream,
    screenStream: proctoringData?.screenStream,
    tabSwitchThreshold: proctoringConfig.tabSwitchLimit || 3,
    enableCopyPaste: proctoringConfig.enableCopyPaste,
    tabSwitchAllowed: proctoringConfig.tabSwitchAllowed,
    onViolation: (type, data) => {
      // Handle violation
      console.warn("Proctoring violation:", type, data);
      // We rely on our custom useEffect for tab switch and copy/paste modals & enforcement
    },
    onAutoSubmit: () => {
      submitEvaluation();
    }
  });

  const initialImagesLogged = useRef(false);
  useEffect(() => {
    if (proctoringData && !initialImagesLogged.current) {
      initialImagesLogged.current = true;
      if (proctoringData.photoBlob) {
        logActivity('passport_photo_captured', { source: 'proctoring_gate' }, proctoringData.photoBlob);
      }
      if (proctoringData.screenshotBlob) {
        logActivity('initial_screenshot_captured', { source: 'proctoring_gate' }, proctoringData.screenshotBlob);
      }
    }
  }, [proctoringData, logActivity]);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(t); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining <= DISCUSSION_LOCK_SECONDS && !discussionTriggered.current && remaining > 0) {
      discussionTriggered.current = true;
      const discussionSection = appSections.find(s => s.type === "VITARKA_AI_INTERVIEW");
      if (discussionSection) {
        setSection(discussionSection.id);
      } else {
        setSection("discussion-dummy"); 
      }
      setOpenLab(null);
      setActiveQuestionId(null);
      setModal({ kind: "discussion-starting" });
    }
    if (remaining === 0) submitEvaluation();
  }, [remaining]);

  // Tab-switch warning & Copy/Paste prevention
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (proctoringConfig?.enableProctoring && proctoringConfig?.tabSwitchAllowed === false) {
          tabSwitches.current += 1;
          const limit = proctoringConfig.tabSwitchLimit ?? 1;
          if (tabSwitches.current > limit) {
             setModal({ kind: "proctoring-violation", message: `You have exceeded the maximum allowed tab switches (${limit}). Your evaluation is being terminated.` });
             setTimeout(() => {
               try { document.exitFullscreen?.(); } catch {}
               nav({ to: "/evaluation/complete" });
             }, 3000);
          } else {
             setModal({ kind: "tab-warning" });
          }
        }
      }
    };

    const onCopyPaste = (e: ClipboardEvent) => {
      if (proctoringConfig?.enableProctoring && proctoringConfig?.enableCopyPaste === false) {
        e.preventDefault();
        setModal(m => m ?? { kind: "proctoring-violation", message: "Copying and pasting is disabled for this evaluation." });
      }
    };

    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("copy", onCopyPaste, { capture: true });
    document.addEventListener("paste", onCopyPaste, { capture: true });
    document.addEventListener("cut", onCopyPaste, { capture: true });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("copy", onCopyPaste, { capture: true });
      document.removeEventListener("paste", onCopyPaste, { capture: true });
      document.removeEventListener("cut", onCopyPaste, { capture: true });
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
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "LAB_SUBMITTED" && e.data?.labId) {
        setSubmittedLabs(prev => new Set(prev).add(e.data.labId));
        setOpenLab(null);
        setModal(null);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Autosave feel
  const touchAutosave = () => {
    setAutosave("saving");
    window.clearTimeout((touchAutosave as any)._t);
    (touchAutosave as any)._t = window.setTimeout(() => setAutosave("saved"), 600);
  };

  const locked = discussionTriggered.current;

  const submitEvaluation = async () => {
    try {
      await evaluationService.finishEvaluation?.(evaluationId);
    } catch (e) {
      console.error(e);
    }
    try { document.exitFullscreen?.(); } catch {}
    nav({ to: "/evaluation/complete" });
  };

  const getSectionStatus = (secId: string): Status => {
    if (submittedSections.has(secId)) return "complete";
    if (section === secId) return "current";
    return "not-started";
  };
  const getLabStatus = (secId: string, labs: RealLab[]): Status => {
    const submittedCount = labs.filter(l => submittedLabs.has(l.id)).length;
    if (submittedCount === labs.length && labs.length > 0) return "complete";
    if (submittedCount > 0) return "in-progress";
    if (section === secId) return "current";
    return "not-started";
  };
  const isDiscussionSection = appSections.find(x => x.id === section)?.type === "VITARKA_AI_INTERVIEW" || section === "discussion-dummy";
  const discussionStatus = isDiscussionSection ? "current" : "not-started";

  const [qIndex, setQIndex] = useState(0);

  const goSection = (s: string) => {
    const isDiscussion = appSections.find(x => x.id === s)?.type === "VITARKA_AI_INTERVIEW" || s === "discussion-dummy";
    if (locked && !isDiscussion) return;
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
  const confirmSubmitLab = (labId: LabId) => {
    setSubmittedLabs(prev => new Set(prev).add(labId));
    setOpenLab(null);
    setModal(null);
  };
  const confirmSubmitSection = async (secId: string) => {
    try {
      const sec = appSections.find(s => s.id === secId);
      const richAnswers: any[] = [];
      if (sec && sec.type === "KNOWLEDGE_ASSESSMENT" && sec.questions) {
        sec.questions.forEach((q: any) => {
          if (answers[q.id] !== undefined) {
            richAnswers.push({
              question_id: q.id,
              selected_option: answers[q.id],
              is_correct: answers[q.id] === q.correct
            });
          }
        });
      }
      await evaluationService.submitKnowledgeAnswers?.(evaluationId, secId, richAnswers);
    } catch (e) {}
    setSubmittedSections(prev => new Set(prev).add(secId));
    setActiveQuestionId(null);
    setModal(null);
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
    if (anySectionNeedsProctoring && !proctoringData && !previewData) {
      nav({ to: "/evaluation/proctoring", search: { e: evaluationId }, replace: true });
    }
  }, [anySectionNeedsProctoring, proctoringData, previewData, nav, evaluationId]);

  if (anySectionNeedsProctoring && !proctoringData && !previewData) {
    return null;
  }

  return (
    <div className="eval-theme flex h-screen w-screen flex-col overflow-hidden bg-[#fafaf7] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 antialiased">
      <TopBar
        remaining={remaining}
        online={online}
        autosave={autosave}
        section={section}
        appSections={appSections}
        onExit={() => setModal({ kind: "exit" })}
        onJumpToDiscussion={() => setRemaining(DISCUSSION_LOCK_SECONDS + 5)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          appSections={appSections}
          section={section}
          openLab={openLab}
          activeQuestionId={String(qIndex)}
          onSelectSection={goSection}
          onSelectLab={(id) => { setSection(appSections.find(s => s.type === "LAB")?.id || ""); setOpenLab(id); }}
          onSelectQuestion={(secId, idxStr) => { setSection(secId); setQIndex(parseInt(idxStr)); }}
          getSectionStatus={getSectionStatus}
          getLabStatus={getLabStatus}
          discussionStatus={discussionStatus}
          submittedLabs={submittedLabs}
          submittedSections={submittedSections}
          locked={locked}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(c => !c)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {appSections.map(sec => {
            if (sec.id !== section) return null;
            if (sec.type === "LAB") {
              return openLab ? (() => {
                const lab = sec.labs.find(l => l.id === openLab)!;
                const mappedTicket = {
                  id: lab.id,
                  title: lab.title,
                  description: lab.problem,
                  tag: lab.tag,
                  tasks: lab.tasks.map(t => ({ id: t.id, title: t.title, description: t.description })),
                  difficulty: "Intermediate",
                  xp: 100,
                  estMin: lab.minutes,
                  sprintOrder: 1,
                  ticketOrder: 1,
                  learning_objectives: [],
                  common_mistakes: [],
                  startup_command: lab.startup_command,
                };
                return (
                  <TicketIDE
                    key={sec.id}
                    slug={lab.id}
                    ticket={mappedTicket}
                    previewOverride={null}
                    isEvaluationMode={true}
                    evaluationId={evaluationId}
                  />
                );
              })() : (
                <LabsList
                  key={sec.id}
                  labs={sec.labs}
                  submitted={submittedLabs}
                  onOpen={(id) => setOpenLab(id)}
                  onFinishSection={() => {
                    const idx = appSections.findIndex(s => s.id === sec.id);
                    if (idx + 1 < appSections.length) goSection(appSections[idx + 1].id);
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
                />
              );
            } else if (sec.type === "VITARKA_AI_INTERVIEW") {
              let meta: any = {};
              try { meta = JSON.parse(sec.description || "{}"); } catch {}
              return (
                <VitarkaInterviewScreen
                  key={sec.id}
                  mockInterviewId={meta.mockInterviewId}
                  onEnd={() => setModal({ kind: "end-discussion" })}
                />
              );
            }
            return null;
          })}
          {section === "discussion-dummy" && (
            <VitarkaInterviewScreen
              mockInterviewId={appSections.find(s => s.type === "VITARKA_AI_INTERVIEW")?.description ? JSON.parse(appSections.find(s => s.type === "VITARKA_AI_INTERVIEW")!.description || "{}").mockInterviewId : ""}
              onEnd={() => setModal({ kind: "end-discussion" })}
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
          body="You cannot return to these questions once submitted."
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
          onConfirm={submitEvaluation}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "exit" && (
        <Confirm
          title="Exit the evaluation?"
          body="Your progress will not be saved and you may lose access to this evaluation. Are you sure?"
          confirm="Exit evaluation"
          destructive
          onConfirm={() => { try { document.exitFullscreen?.(); } catch {}; nav({ to: "/" }); }}
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
      {modal?.kind === "discussion-starting" && (
        <Confirm
          title="The engineering discussion will now begin"
          body="The remaining 15 minutes are reserved for your discussion. Labs, assessment and the coding challenge are now locked."
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Top bar
// ────────────────────────────────────────────────────────────────────────────

function TopBar({ remaining, online, autosave, section, appSections, onExit, onJumpToDiscussion }: { remaining: number; online: boolean; autosave: "idle" | "saving" | "saved"; section: string | null; appSections: AppSection[]; onExit: () => void; onJumpToDiscussion: () => void }) {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const critical = remaining <= 15 * 60;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0c0c0e]/80 px-5 backdrop-blur text-neutral-900 dark:text-neutral-100">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-neutral-900 dark:bg-neutral-800 text-[10px] font-mono text-white">Y</div>
        <div className="min-w-0">
          <div className="truncate text-[12px] leading-none text-neutral-500 dark:text-neutral-400">Yuvro Labs · Backend Engineer Evaluation</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span>Section</span>
            <span className="text-neutral-900 dark:text-neutral-100">{sectionLabel(section, appSections)}</span>
          </div>
        </div>
      </div>

      <div className={`font-mono text-[15px] tracking-wide ${critical ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"}`}>
        {fmt(remaining)}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
        <StatusDot label={online ? "Online" : "Reconnecting"} tone={online ? "ok" : "warn"} />
        <StatusDot label="Camera" tone="ok" />
        <StatusDot label="Fullscreen" tone="ok" />
        <span className="hidden md:inline">
          {autosave === "saving" ? "Saving…" : autosave === "saved" ? "Saved" : ""}
        </span>
        <span className="hidden text-neutral-300 dark:text-neutral-700 md:inline">·</span>
        <button onClick={onJumpToDiscussion} title="Demo: jump to 15:00 remaining" className="hidden rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400 hover:border-neutral-900 dark:hover:border-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100 md:inline">
          demo · jump to 15:00
        </button>
        <button className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">Help</button>
        <button onClick={onExit} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">Exit</button>
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

function StatusDot({ label, tone }: { label: string; tone: "ok" | "warn" }) {
  return (
    <span className="hidden items-center gap-1.5 sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

function sectionLabel(s: string | null, appSections: AppSection[]) {
  if (!s) return "";
  if (s === "discussion-dummy") return "Engineering Discussion";
  if (s === "knowledge") return "Knowledge Assessment";
  const sec = appSections.find(x => x.id === s);
  return sec ? sec.title : s;
}

// ────────────────────────────────────────────────────────────────────────────
// Sidebar
// ────────────────────────────────────────────────────────────────────────────

type Status = "not-started" | "current" | "in-progress" | "complete" | "locked";

function Sidebar({
  appSections,
  section, openLab, activeQuestionId,
  onSelectSection, onSelectLab, onSelectQuestion,
  getSectionStatus, getLabStatus, discussionStatus,
  submittedLabs, submittedSections, locked,
  collapsed, onToggleCollapse,
}: {
  appSections: AppSection[];
  section: string | null; openLab: string | null; activeQuestionId: string | null;
  onSelectSection: (s: string) => void; onSelectLab: (id: string) => void; onSelectQuestion: (secId: string, id: string) => void;
  getSectionStatus: (id: string) => Status; getLabStatus: (secId: string, labs: RealLab[]) => Status; discussionStatus: Status;
  submittedLabs: Set<string>; submittedSections: Set<string>; locked: boolean;
  collapsed: boolean; onToggleCollapse: () => void;
}) {
  const labSections = appSections.filter(s => s.type === "LAB");
  const knowledgeSections = appSections.filter(s => s.type === "KNOWLEDGE_ASSESSMENT");
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
        
        let format = q.format || (Array.isArray(q.options) && q.options.length > 0 ? "MCQ" : "Description");
        if (format === "MCQ") format = "MCQ";
        else if (format === "Multiple Select") format = "Multiple MCQ";
        else if (format === "Coding") format = "Coding";
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
  sectionCount++; // discussion

  const knowStatus: Status = knowledgeSections.every(s => submittedSections.has(s.id)) && knowledgeSections.length > 0 ? "complete" : knowledgeSections.some(s => getSectionStatus(s.id) === "in-progress" || section === s.id) ? "in-progress" : section === "knowledge" ? "current" : "not-started";

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
        {labSections.map((sec) => (
          <SectionItem
            key={sec.id}
            n={getNum()} label={sec.title} status={getLabStatus(sec.id, sec.labs)}
            onClick={() => onSelectSection(sec.id)}
            disabled={locked && sec.type !== "VITARKA_AI_INTERVIEW"}
          >
            <div className="mt-2 flex flex-col gap-0.5 pl-8">
              {sec.labs.map(l => (
                <button
                  key={l.id}
                  disabled={locked && !submittedLabs.has(l.id)}
                  onClick={() => onSelectLab(l.id)}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-left transition ${openLab === l.id && section === sec.id ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-850 hover:text-neutral-900 dark:hover:text-neutral-100"} disabled:cursor-not-allowed disabled:text-neutral-300 dark:disabled:text-neutral-700`}
                >
                  <span className="truncate text-[12px]">{l.title}</span>
                  {submittedLabs.has(l.id) && <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Done</span>}
                </button>
              ))}
            </div>
          </SectionItem>
        ))}

        {knowledgeSections.length > 0 && knowledgeHierarchy && (
          <SectionItem
            n={getNum()} label="Knowledge Assessment" status={knowledgeSections.some(s => s.id === section) ? "current" : knowStatus}
            onClick={() => onSelectQuestion(knowledgeSections[0].id, "0")}
            disabled={locked}
          >
            <div className="mt-2 flex flex-col pl-3">
              {knowledgeHierarchy.map((subj: any) => {
                const subjId = `subj-${subj.name}`;
                const isSubjExpanded = expandedNodes.has(subjId);
                return (
                  <div key={subjId} className="flex flex-col">
                    <button 
                      disabled={locked}
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
                                disabled={locked}
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
                                          return (
                                            <button
                                              key={item.q.id}
                                              disabled={locked}
                                              onClick={(e) => { e.stopPropagation(); onSelectQuestion(item.parentSec.id, String(item.localIdx)); }}
                                              className={`flex items-center justify-between rounded-md px-2 py-1 text-left transition ${isCurrent ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"} disabled:cursor-not-allowed disabled:text-neutral-300`}
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
          </SectionItem>
        )}

        {discussionSection ? (
          <SectionItem
            n={getNum()} label={discussionSection.title} status={discussionStatus}
            hint="Last 15 minutes"
            onClick={() => onSelectSection(discussionSection.id)}
            disabled={discussionStatus === "locked"}
          />
        ) : (
          <SectionItem
            key="discussion-dummy"
            n={getNum()} label="Engineering Discussion" status={discussionStatus}
            hint="Last 15 minutes"
            onClick={() => onSelectSection("discussion-dummy")}
            disabled={discussionStatus === "locked"}
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
        className={`group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${status === "current" ? "bg-neutral-100 dark:bg-neutral-850" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="mt-0.5 font-mono text-[10px] tracking-widest text-neutral-400 dark:text-neutral-500">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`text-[13px] ${status === "current" ? "text-neutral-900 dark:text-neutral-100 font-medium" : "text-neutral-700 dark:text-neutral-300"}`}>{label}</span>
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
    "current": { label: "Current", cls: "text-neutral-900 dark:text-neutral-100" },
    "in-progress": { label: "In progress", cls: "text-amber-600 dark:text-amber-500" },
    "complete": { label: "Done", cls: "text-emerald-600 dark:text-emerald-500" },
    "locked": { label: "Locked", cls: "text-neutral-400 dark:text-neutral-600" },
  };
  const { label, cls } = map[status];
  if (!label) return null;
  return <span className={`text-[10px] uppercase tracking-wider ${cls}`}>· {label}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Labs
// ────────────────────────────────────────────────────────────────────────────

function LabsList({ labs, submitted, onOpen, onFinishSection }: { labs: RealLab[]; submitted: Set<LabId>; onOpen: (id: LabId) => void; onFinishSection: () => void }) {
  const allDone = submitted.size === labs.length;
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <SectionHeader eyebrow="Section 01" title="Engineering Labs" body="Two labs. Pick one to start. You can submit each independently." />
      <div className="mt-10 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {labs.map((l, i) => {
          const done = submitted.has(l.id);
          return (
            <div key={l.id} className="flex items-center justify-between gap-6 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] tracking-widest text-neutral-400">L0{i + 1}</span>
                  <div className="text-[15px] text-neutral-900">{l.title}</div>
                  {done && <span className="text-[11px] text-emerald-600">· Submitted</span>}
                </div>
                <div className="mt-1 text-[12px] text-neutral-500">{l.sub} · ~{l.minutes} min</div>
              </div>
              <button
                onClick={() => onOpen(l.id)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[13px] text-neutral-800 hover:border-neutral-900 hover:text-neutral-900"
              >
                {done ? "Review" : "Open lab"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-[12px] text-neutral-500">{submitted.size} of {labs.length} submitted</span>
        <button onClick={onFinishSection} disabled={!allDone} className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
          Continue to Knowledge Assessment →
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

function KnowledgeList({ sections, submitted, onOpen, onFinishSection }: { sections: any[]; submitted: Set<string>; onOpen: (id: string) => void; onFinishSection: () => void }) {
  const allDone = sections.length > 0 && sections.every(s => submitted.has(s.id));
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <SectionHeader eyebrow="Section 02" title="Knowledge Assessment" body={`${sections.length} subjects. Submit each independently — you'll only see the summary at the end.`} />
      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map(s => {
          const done = submitted.has(s.id);
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-900">
              <div className="flex items-center justify-between">
                <div className="font-serif text-[20px] tracking-tight text-neutral-900">{s.title}</div>
                {done && <span className="text-[11px] text-emerald-600">Submitted</span>}
              </div>
              <div className="mt-1 text-[12px] text-neutral-500">{s.questions?.length || 0} questions</div>
              <div className="mt-6 text-[12px] text-neutral-500 group-hover:text-neutral-900">{done ? "Review submitted" : "Start subject →"}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-[12px] text-neutral-500">{Array.from(submitted).filter(id => sections.some(s => s.id === id)).length} of {sections.length} submitted</span>
        <button onClick={onFinishSection} disabled={!allDone} className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
          Continue to Engineering Discussion →
        </button>
      </div>
    </div>
  );
}

function KnowledgeRunner({
  subject, submitted, index, setIndex, answers, marked,
  setAnswer, clearAnswer, onMark, onBack, onSubmit,
  codingCode, setCodingCode, codingResults, runCode, evaluationId
}: {
  subject: any; submitted: boolean; index: number; setIndex: (i: number) => void;
  answers: Record<string, any>; marked: Set<string>;
  setAnswer: (qId: string, val: any) => void; clearAnswer: (qId: string) => void; onMark: (qId: string) => void;
  onBack: () => void; onSubmit: () => void;
  codingCode: Record<string, string>; setCodingCode: (qId: string, val: string) => void;
  codingResults: Record<string, { name: string; pass: boolean }[] | null>; runCode: (qId: string) => void; evaluationId?: string;
}) {
  const q = subject.questions[index];
  const disabled = submitted;
  if (!q) return null;

  if (q.format === "Coding") {
    const mappedTicket = {
      id: q.id,
      title: q.q,
      description: q.description || q.q,
      tag: q.programming_languages?.[0]?.toLowerCase() || "javascript",
      tasks: [],
      difficulty: "Intermediate",
      xp: 10,
      estMin: 15,
      sprintOrder: index + 1,
      ticketOrder: 1,
      learning_objectives: [],
      common_mistakes: [],
    };

    return (
      <div className="flex h-full flex-col bg-[#fafaf7] overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-6 py-3 text-[12px] shrink-0">
          <div className="text-neutral-500">Assessment · <span className="text-neutral-900">{subject.title}</span></div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 hover:border-neutral-900 disabled:opacity-40">Previous</button>
             {index < subject.questions.length - 1 ? (
               <button onClick={() => setIndex(index + 1)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800">Next</button>
             ) : (
               <button onClick={onSubmit} disabled={submitted} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
                 {submitted ? "Submitted" : `Submit ${subject.title}`}
               </button>
             )}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <TicketIDE slug="knowledge" ticket={mappedTicket} previewOverride={null} isEvaluationMode={true}
                    evaluationId={evaluationId} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-12 flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between text-[12px] text-neutral-500 shrink-0">
        <button onClick={onBack} className="hover:text-neutral-900">← All subjects</button>
        <span>{subject.title} · Question {index + 1} of {subject.questions.length}</span>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 flex-1 min-h-0 flex flex-col">
        <div className="font-serif text-[22px] leading-snug tracking-tight text-neutral-900 shrink-0">{q.q}</div>
        {q.description && <div className="mt-3 text-[14px] leading-relaxed text-neutral-700 shrink-0 whitespace-pre-wrap">{q.description}</div>}
        
        <div className="mt-6 flex-1 overflow-y-auto">
          {q.format === "MCQ" || q.format === "Multiple Select" ? (
            <div className="space-y-2">
              {q.options.map((opt: string, i: number) => {
                const isMulti = q.format === "Multiple Select";
                const ansArray = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] !== undefined ? [answers[q.id]] : []);
                const active = isMulti ? ansArray.includes(i) : answers[q.id] === i;
                return (
                  <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-[13px] transition ${active ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
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
                      className={`mt-0.5 h-4 w-4 ${isMulti ? "rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" : ""}`}
                    />
                    <span className="text-neutral-800">{opt}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              disabled={submitted}
              rows={8}
              placeholder="Type your answer here..."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-4 text-[14px] leading-relaxed text-neutral-900 outline-none focus:border-neutral-900 disabled:opacity-70"
            />
          )}
        </div>
        
        <div className="mt-6 flex items-center justify-between text-[12px] shrink-0 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 text-neutral-500">
            <button onClick={() => onMark(q.id)} disabled={disabled} className="rounded-md border border-neutral-200 px-3 py-1.5 hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50">
              {marked.has(q.id) ? "Unmark" : "Mark for review"}
            </button>
            <button onClick={() => clearAnswer(q.id)} disabled={disabled} className="hover:text-neutral-900 disabled:opacity-50">Clear answer</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="rounded-md border border-neutral-200 px-3 py-1.5 hover:border-neutral-900 disabled:opacity-40">Previous</button>
            {index < subject.questions.length - 1 ? (
              <button onClick={() => setIndex(index + 1)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800">Next</button>
            ) : (
              <button onClick={onSubmit} disabled={submitted} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
                {submitted ? "Submitted" : `Submit ${subject.title}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shrink-0">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Question navigator</div>
        <div className="flex flex-wrap gap-2">
          {subject.questions.map((_: any, i: number) => {
            const answered = answers[subject.questions[i].id] !== undefined && answers[subject.questions[i].id] !== null && answers[subject.questions[i].id] !== "";
            const isCurrent = i === index;
            const isMarked = marked.has(subject.questions[i].id);
            return (
              <button key={i} onClick={() => setIndex(i)} className={`h-9 w-9 rounded-md border text-[12px] font-mono transition ${isCurrent ? "border-neutral-900 bg-neutral-900 text-white" : answered ? "border-emerald-500/40 bg-emerald-50 text-emerald-700" : isMarked ? "border-amber-400 bg-amber-50 text-amber-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-400"}`}>
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
      <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{eyebrow}</div>
      <h2 className="mt-2 font-serif text-[34px] leading-tight tracking-tight text-neutral-900">{title}</h2>
      {body && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-neutral-600">{body}</p>}
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