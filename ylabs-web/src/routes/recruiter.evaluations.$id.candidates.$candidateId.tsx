import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Phone,
  Mail,
  Download,
  Share2,
  MoreHorizontal,
  MessageSquare,
  CalendarPlus,
  Star,
  XCircle,
  PauseCircle,
  StickyNote,
  FileText,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  GitCommit,
  Terminal,
  Sparkles,
  CheckCircle2,
  XCircle as XC,
  AlertCircle,
  User as UserIcon,
  Briefcase,
  GraduationCap,
  MapPin,
  Copy as CopyIcon,
  ArrowUpRight,
  BadgeCheck,
  Zap,
  Layers,
  MessageCircle,
  Send,
  Trash2,
  Users,
  Eye,
  Video,
  ScrollText,
  FileDown,
  Maximize2,
  Loader2,
  RefreshCw,
  ArrowLeft,
  X,
  Network,
  Database,
  FileCode,
  Check,
} from "lucide-react";
import { DiagramBoard, type SDNode, type SDEdge } from "@/components/sysdesign/DesignCanvas";
import { ErdBoard, parseDbml } from "@/components/sysdesign/ErdBoard";
import { ApiDocs, type ApiEndpoint } from "@/components/sysdesign/ApiDesigner";
import { MarkdownPreview } from "@/components/sysdesign/MarkdownNotes";
import { MermaidPreview } from "@/components/sysdesign/MermaidPreview";
import { getCandidates, type Recommendation } from "@/lib/recruiterCandidates";
import { buildEvaluationSummary } from "@/lib/evaluationSummary";
import { CandidateAnalyticsViewer } from "@/components/evaluation/CandidateAnalyticsViewer";
import { LabCodeExplorer } from "@/components/recruiter/LabCodeExplorer";
import { LabSubmissionViewer } from "@/components/evaluation/LabSubmissionViewer";
import { 
  getEvaluation, 
  getEvaluationSubmissions,
  generateSharedReportLink,
  getLabCalculatedStats,
  countDistinctSelectedTasks,
} from "@/lib/recruiter";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import {
  getCandidateDetail,
  loadNotes,
  addNote,
  deleteNote,
  loadActivity,
  pushActivity,
  loadDecision,
  saveDecision,
  markViewed,
  type Note,
  type HiringDecision,
  type LabAttempt,
  loadTimelineEvents,
  type TimelineEvent,
  createTimelineEvent,
  type ActivityEvent,
} from "@/lib/recruiterCandidateDetail";
import React from "react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/50 text-red-200 border border-red-500 rounded font-mono text-xs whitespace-pre-wrap">
          <strong>Error in LabSubmissionViewer:</strong>
          {"\n"}{this.state.error?.message}
          {"\n"}{this.state.error?.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

export function formatDurationSecs(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.round(Math.max(0, totalSeconds) % 60);
  return `${m}m ${s}s`;
}

export function parseLabDurationSecs(sub: any): number {
  if (!sub) return 0;
  if (typeof sub.time_taken === "string" && sub.time_taken.trim()) {
    const str = sub.time_taken.trim();
    const mMatch = str.match(/(\d+)\s*m/);
    const sMatch = str.match(/(\d+)\s*s/);
    if (mMatch || sMatch) {
      const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
      const secs = sMatch ? parseInt(sMatch[1], 10) : 0;
      return mins * 60 + secs;
    }
  }
  let sec = Number(sub.seconds_solved ?? 0);
  if (sec === 0 && sub.started_at && sub.submitted_at) {
    const start = new Date(sub.started_at).getTime();
    const end = new Date(sub.submitted_at).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      sec = Math.round((end - start) / 1000);
    }
  }
  if (sec === 0 && sub.created_at && sub.updated_at) {
    const start = new Date(sub.created_at).getTime();
    const end = new Date(sub.updated_at).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      sec = Math.round((end - start) / 1000);
    }
  }
  if (sec === 0 && Number(sub.minutes_solved ?? 0) > 0) {
    sec = Number(sub.minutes_solved) * 60;
  }
  return sec;
}

export function MissingVitarkaSessionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121418] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-amber-400 font-medium text-base">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>No Vitarka Session Found</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-900 dark:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="py-5 text-sm text-neutral-300 leading-relaxed">
          No active or completed Vitarka AI engineering discussion session was found for this candidate. The candidate must start and attempt the Vitarka discussion section before an interview session or evaluation report can be generated.
        </div>
        <div className="flex justify-end pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-neutral-900 dark:text-white hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import LoadingSkeleton from "@/components/common/LoadingSkeleton";

export const Route = createFileRoute("/recruiter/evaluations/$id/candidates/$candidateId")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      view: search.view as string | undefined,
      tab: search.tab as string | undefined,
    }
  },
  head: () => ({
    meta: [{ title: "Candidate — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: CandidateWorkspace,
});

type Tab =
  | "overview"
  | "labs"
  | "assessment"
  | "vitarka"
  | "system_design"
  | "resume"
  | "timeline"
  | "notes"
  | "activity"
  | "proctoring";

function CandidateWorkspace() {
  const { id, candidateId } = Route.useParams();
  const nav = useNavigate();
  
  const [ev, setEv] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEvaluation(id),
      getEvaluationSubmissions(id)
    ]).then(([e, subs]) => {
      if (!e) {
        nav({ to: "/recruiter/evaluations" });
        return;
      }
      setEv(e);
      const cands = getCandidates(e.id, subs || [], [], e);
      const cand = cands.find((x) => x.id === candidateId);
      setCandidate(cand || null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [id, candidateId, nav]);

  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab") as Tab;
      if (t) return t;
    }
    return "overview";
  });
  const [toast, setToast] = useState<string | null>(null);
  const [decision, setDecision] = useState<HiringDecision>(() =>
    loadDecision(id, candidateId, candidate?.hiringStatus ?? "Pending Review"),
  );
  const [openLab, setOpenLab] = useState<{ section: any, labSub: any, candidate: any, labsReport?: any } | null>(null);
  const [openSystemDesign, setOpenSystemDesign] = useState<{ challenge: any; userSub: any; candidate: any; sdMaxScore: number } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [vitarkaSubmission, setVitarkaSubmission] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showMissingSessionModal, setShowMissingSessionModal] = useState(false);

  useEffect(() => {
    if (!ev || !candidate) return;
    const discSec = ev.sections?.find(
      (s: any) => s.type === "VITARKA_AI_INTERVIEW" || s.kind === "discussion" || s.kind === "vitarka"
    );
    if (!discSec) return;

    const rawSub = candidate.rawSubmission;
    if (rawSub?.vitarka_submission) {
      setVitarkaSubmission(rawSub.vitarka_submission);
      return;
    }

    let mockInterviewId = discSec?.mockInterviewId;
    if (!mockInterviewId && discSec?.description) {
      try {
        mockInterviewId = JSON.parse(discSec.description).mockInterviewId;
      } catch {}
    }
    const userId = candidate.realUserId || candidate.rawSubmission?.user?.id;
    const email = candidate.email;

    const params = new URLSearchParams();
    if (mockInterviewId) params.append("mock_interview", mockInterviewId);
    if (email) params.append("email", email);
    else if (userId) params.append("user", userId);
    params.append("ordering", "-created_at");

    if (params.toString()) {
      yhubApiAuthUtil
        .get<any[]>(`/interview/submissions/?${params.toString()}`)
        .then((res) => {
          if (res && res.length > 0) {
            setVitarkaSubmission(res[0]);
          }
        })
        .catch(console.error);
    }
  }, [id, candidateId, ev, candidate?.email]);

  const handleGenerateReport = async () => {
    const discSec = ev?.sections?.find(
      (s: any) => s.type === "VITARKA_AI_INTERVIEW" || s.kind === "discussion" || s.kind === "vitarka"
    );
    if (!discSec) {
      notify("This evaluation does not include Vitarka AI Discussion. No AI report will be generated.");
      return;
    }

    let sub = vitarkaSubmission;
    if (!sub?.id) {
      let mockInterviewId = discSec?.mockInterviewId;
      if (!mockInterviewId && discSec?.description) {
        try {
          mockInterviewId = JSON.parse(discSec.description).mockInterviewId;
        } catch {}
      }
      const userId = candidate?.realUserId || candidate?.rawSubmission?.user?.id;
      const email = candidate?.email;

      const params = new URLSearchParams();
      if (mockInterviewId) params.append("mock_interview", mockInterviewId);
      if (email) params.append("email", email);
      else if (userId) params.append("user", userId);
      params.append("ordering", "-created_at");

      try {
        const res = await yhubApiAuthUtil.get<any[]>(`/interview/submissions/?${params.toString()}`);
        if (res && res.length > 0) {
          sub = res[0];
          setVitarkaSubmission(res[0]);
        }
      } catch (err) {
        console.error("Failed to query submission", err);
      }
    }

    if (!sub?.id) {
      setShowMissingSessionModal(true);
      return;
    }

    setGeneratingReport(true);
    try {
      const res = await yhubApiAuthUtil.post<any>(
        `/interview/submissions/${sub.id}/generate_report/`,
        {}
      );
      setVitarkaSubmission((prev: any) => ({
        ...(prev || {}),
        ...res,
        report_bundle: res.report_bundle || res,
        report: res.vitarka_report || res.report || res,
        marks: res.scaled_score ?? res.marks ?? ((res.overall_report?.overall_score || res.overall_score || 0) * 10),
        status: "completed",
      }));
      notify("Evaluation report generated successfully");
    } catch (err: any) {
      console.error("Failed to generate report", err);
      notify(err?.response?.data?.error || err?.message || "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    markViewed(id, candidateId);
    if (candidate?.email) {
      pushActivity(id, candidate.email, "view", "Recruiter viewed the profile").then(() => {
        setActivity((prev) => [
          {
            type: "view",
            text: "Recruiter viewed the profile",
            time: "Just now",
            timeAgo: "Just now",
            iconColor: "text-blue-400",
          },
          ...prev,
        ]);
      });
    }
  }, [id, candidateId, candidate?.email]);

  useEffect(() => {
    if (candidate?.email) {
      let mounted = true;
      loadNotes(id, candidate.email).then(notes => {
        if (mounted) setNotes(notes);
      });
      loadTimelineEvents(id, candidate.email).then(events => {
        if (!mounted) return;
        setTimelineEvents(events);
        
        // Auto-trigger "Recruiter viewed profile" if it hasn't happened yet
        if (!events.some(e => e.label === "Recruiter viewed profile" && e.done)) {
          createTimelineEvent(id, candidate.email, "Recruiter viewed profile").then(() => {
            if (mounted) loadTimelineEvents(id, candidate.email).then(setTimelineEvents);
          });
        }
      });
      
      const intervalId = setInterval(() => {
        if (mounted) loadTimelineEvents(id, candidate.email).then(setTimelineEvents);
      }, 5000);
      
      return () => {
        mounted = false;
        clearInterval(intervalId);
      };
    }
  }, [id, candidate?.email]);
  
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton type="metrics" />
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-neutral-400">Candidate not found.</p>
        <Link
          to="/recruiter/evaluations/$id"
          params={{ id }}
          className="mt-4 inline-flex items-center gap-2 text-[13px] text-neutral-300 hover:text-neutral-900 dark:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to evaluation
        </Link>
      </div>
    );
  }

  const hasSections = Array.isArray(ev?.sections) && ev.sections.length > 0;
  const hasLabs = hasSections ? ev.sections.some((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS") : false;
  const hasAssessment = hasSections ? ev.sections.some((s: any) => s.kind === "assessment" || s.kind === "knowledge" || s.type === "KNOWLEDGE_ASSESSMENT") : false;
  const hasVitarka = hasSections ? ev.sections.some((s: any) => s.kind === "discussion" || s.kind === "vitarka" || s.type === "VITARKA_AI_INTERVIEW") : false;
  const hasSystemDesign = hasSections ? ev.sections.some((s: any) => s.kind === "system_design" || s.type === "SYSTEM_DESIGN") : false;

  const labsSec = ev?.sections?.find((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS");
  const labsMaxScore = hasLabs
    ? ((labsSec?.labs && labsSec.labs.length > 0)
        ? labsSec.labs.reduce((sum: number, l: any) => sum + (getLabCalculatedStats(l).marks || Number(l.marks) || 0), 0)
        : (labsSec?.questions && labsSec.questions.length > 0)
          ? labsSec.questions.reduce((sum: number, l: any) => sum + (getLabCalculatedStats(l).marks || Number(l.marks) || 0), 0)
          : (labsSec?.marks ?? 100))
    : 0;

  const assessSec = ev?.sections?.find((s: any) => s.kind === "assessment" || s.kind === "knowledge" || s.type === "KNOWLEDGE_ASSESSMENT");
  const assessmentMaxScore = hasAssessment
    ? ((assessSec?.questions && assessSec.questions.length > 0)
        ? assessSec.questions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0)
        : (assessSec?.marks ?? 30))
    : 0;

  const discSec = ev?.sections?.find(
    (s: any) => s.type === "VITARKA_AI_INTERVIEW" || s.kind === "discussion" || s.kind === "vitarka"
  );
  let discMetaMarks: number | undefined;
  if (discSec?.description) {
    try {
      const parsed = JSON.parse(discSec.description);
      discMetaMarks = parsed.marks ?? parsed.max_score ?? parsed.discussionMaxScore;
    } catch {}
  }
  const discussionMaxScore = hasVitarka ? (discSec?.marks ?? discSec?.max_score ?? discMetaMarks ?? 25) : 0;

  const sdSec = ev?.sections?.find((s: any) => s.kind === "system_design" || s.type === "SYSTEM_DESIGN");
  const systemDesignMaxScore = hasSystemDesign ? (sdSec?.marks ?? 30) : 0;
  const liveSystemDesignScore = hasSystemDesign ? (candidate?.systemDesignScore || 0) : 0;

  const liveBundle = hasVitarka ? (vitarkaSubmission?.report_bundle || vitarkaSubmission?.session_state?.report_bundle) : null;
  const liveVitarkaReport = hasVitarka ? (liveBundle?.vitarka_report || vitarkaSubmission?.report || vitarkaSubmission?.session_state?.report) : null;
  const liveOverallReport = hasVitarka ? liveBundle?.overall_report : null;
  const liveLabsReport = liveBundle?.engineering_labs_report;
  const liveKnowledgeReport = liveBundle?.knowledge_assessment_report;
  const sectionScoresMap: Record<string, number> = {};
  if (liveOverallReport?.section_scores && Array.isArray(liveOverallReport.section_scores)) {
    liveOverallReport.section_scores.forEach((s: any) => {
      if (s.score != null) {
        sectionScoresMap[s.section] = s.score;
      }
    });
  }

  const rawLabSubs = candidate?.rawSubmission?.lab_submissions || [];
  const labSectionsForScore = ev?.sections?.filter((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS") || [];
  const allLabsForScore = labSectionsForScore.flatMap((s: any) => (s.labs && s.labs.length > 0 ? s.labs : (s.questions || [])));
  const totalLabCountForScore = Math.max(1, allLabsForScore.length || rawLabSubs.length);

  const totalLabMarksEarned = rawLabSubs.length > 0
    ? rawLabSubs.reduce((acc: number, cur: any) => {
        let score = Number(cur.score || 0);
        if (cur.solution_output) {
          try {
            const parsed = typeof cur.solution_output === "string" ? JSON.parse(cur.solution_output) : cur.solution_output;
            if (parsed?.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
              let activeTasks = parsed.tasks;
              const matchingLab = allLabsForScore.find((l: any) => {
                const targetId = String(l.id ?? l.lab_id ?? l.question_id ?? "");
                const sLabId = String(cur.lab_question?.id ?? cur.lab_question ?? cur.lab_id ?? "");
                return sLabId === targetId || (sLabId && targetId && (sLabId.includes(targetId) || targetId.includes(sLabId)));
              });
              const matchingCalc = matchingLab ? getLabCalculatedStats(matchingLab) : null;
              const matchingCount = matchingCalc && matchingCalc.selectedTasks.length > 0 ? matchingCalc.selectedTasks.length : 0;
              if (matchingLab?.selected_task_ids && Array.isArray(matchingLab.selected_task_ids) && matchingLab.selected_task_ids.length > 0) {
                const selectedSet = new Set(matchingLab.selected_task_ids.map(String));
                const filtered = parsed.tasks.filter((t: any, idx: number) => {
                  const tid = String(t.id ?? t.key ?? t.task_slug ?? `task-${idx}`);
                  return selectedSet.has(tid) || selectedSet.has(String(t.name)) || selectedSet.has(String(t.title));
                });
                activeTasks = filtered.length > 0 ? filtered : (matchingCount > 0 ? parsed.tasks.slice(0, matchingCount) : parsed.tasks);
              } else if (matchingCount > 0 && parsed.tasks.length > matchingCount) {
                activeTasks = parsed.tasks.slice(0, matchingCount);
              }
              const passedTasks = activeTasks.filter((t: any) => t.passed === true || t.result === "passed" || t.status === "passed").length;
              score = (passedTasks / activeTasks.length) * 100;
            } else if (parsed?.percentage != null) {
              score = Number(parsed.percentage);
            } else if (parsed?.total_score != null) {
              score = Number(parsed.total_score);
            }
          } catch {}
        }
        if (score === 0 && cur.solution && typeof cur.solution === "string") {
          if (cur.solution.includes("HTTP_201_CREATED") || cur.solution.includes("201_CREATED")) {
            score = 2;
          }
        }
        const matchingLab = allLabsForScore.find((l: any) => {
          const targetId = String(l.id ?? l.lab_id ?? l.question_id ?? "");
          const sLabId = String(cur.lab_question?.id ?? cur.lab_question ?? cur.lab_id ?? "");
          return sLabId === targetId || (sLabId && targetId && (sLabId.includes(targetId) || targetId.includes(sLabId)));
        });
        const labMaxMarks = (matchingLab ? getLabCalculatedStats(matchingLab).marks : 0) || Number(matchingLab?.marks) || (labsMaxScore / totalLabCountForScore);

        let earned = 0;
        if (score > 10 && score <= 100) {
          earned = (score / 100) * labMaxMarks;
        } else if (score > 0 && score <= 10) {
          earned = (score / 10) * labMaxMarks;
        } else {
          earned = score;
        }
        if (Math.abs(Math.round(earned) - earned) < 0.15) {
          earned = Math.round(earned);
        } else {
          earned = Math.round(earned * 10) / 10;
        }
        return acc + earned;
      }, 0)
    : (candidate?.labsScore != null ? candidate.labsScore : 0);

  const roundedLabMarksEarned = Math.abs(Math.round(totalLabMarksEarned) - totalLabMarksEarned) < 0.15
    ? Math.round(totalLabMarksEarned)
    : Math.round(totalLabMarksEarned * 10) / 10;

  const liveLabsHasNoAttempts = (
    roundedLabMarksEarned === 0 && (
      (liveLabsReport?.tests_total && liveLabsReport.tests_total > 0 && (!liveLabsReport.tests_passed || liveLabsReport.tests_passed === 0)) ||
      (liveLabsReport?.risks?.some((r: string) => r.includes("No lab tests were executed")) && liveLabsReport?.risks?.some((r: string) => r.includes("No verified implementation code")))
    )
  );

  const liveLabsScore = roundedLabMarksEarned > 0
    ? Math.round(Math.min(roundedLabMarksEarned, labsMaxScore) * 10) / 10
    : (liveLabsHasNoAttempts
        ? 0
        : (candidate?.labsScore != null && candidate.labsScore > 0
            ? Math.round(Math.min(candidate.labsScore, labsMaxScore) * 10) / 10
            : (liveLabsReport?.overall_score != null
                ? Math.round((liveLabsReport.overall_score / 10) * labsMaxScore)
                : (liveLabsReport?.tests_total && liveLabsReport.tests_total > 0
                    ? Math.round((liveLabsReport.tests_passed / liveLabsReport.tests_total) * labsMaxScore)
                    : 0))));

  const rawKnowledgeSubs = candidate?.rawSubmission?.knowledge_submissions || [];
  let computedKnowledgeMarks = 0;
  rawKnowledgeSubs.forEach((sub: any) => {
    if (sub.score) {
      computedKnowledgeMarks += Number(sub.score);
    } else if (sub.answers && Array.isArray(sub.answers)) {
      const sec = ev?.sections?.find((s: any) => (s.id || s.section_id) === sub.section);
      const qMap = new Map((sec?.questions || []).map((q: any) => [String(q.id), q]));
      sub.answers.forEach((ans: any) => {
        const q: any = qMap.get(String(ans.question_id || ans.question));
        const marks = Number(q?.marks || 1);
        if (ans.is_correct) {
          computedKnowledgeMarks += marks;
        } else if (q) {
          const optsArray = q.mcq_options || q.options || [];
          let userOpt = ans.selected_option !== undefined ? ans.selected_option : ans.selected_options;
          if (userOpt !== undefined && userOpt !== null && optsArray.length > 0) {
            let uIndices = Array.isArray(userOpt) ? userOpt.map(Number) : [Number(userOpt)];
            let corrIndices = optsArray.map((o: any, i: number) => o.is_correct ? i : -1).filter((i: number) => i !== -1);
            if (corrIndices.length > 0 && uIndices.length === corrIndices.length && [...uIndices].sort().every((v, idx) => v === [...corrIndices].sort()[idx])) {
              computedKnowledgeMarks += marks;
            }
          }
        }
      });
    }
  });

  const totalKnowledgeMarksEarned = computedKnowledgeMarks > 0
    ? computedKnowledgeMarks
    : (candidate?.assessmentScore != null ? candidate.assessmentScore : 0);

  const liveAssessmentScore = (
    totalKnowledgeMarksEarned > 0
      ? Math.min(totalKnowledgeMarksEarned, assessmentMaxScore)
      : (liveKnowledgeReport?.total_score != null && liveKnowledgeReport.total_score > 0
          ? Math.min(Number(liveKnowledgeReport.total_score), assessmentMaxScore)
          : (liveKnowledgeReport?.score_percent != null
              ? Math.round((liveKnowledgeReport.score_percent / 100) * assessmentMaxScore)
              : (liveKnowledgeReport?.question_count && liveKnowledgeReport.question_count > 0
                  ? Math.round((liveKnowledgeReport.correct_count / liveKnowledgeReport.question_count) * assessmentMaxScore)
                  : (candidate?.assessmentScore != null ? Math.min(candidate.assessmentScore, assessmentMaxScore) : 0))))
  );

  const liveVitarkaScore = (
    liveVitarkaReport?.scaled_score != null
      ? liveVitarkaReport.scaled_score
      : (vitarkaSubmission?.marks != null
          ? vitarkaSubmission.marks
          : (liveVitarkaReport?.overall_score != null
              ? Math.round((liveVitarkaReport.overall_score / 10) * discussionMaxScore)
              : (candidate?.vitarkaScore != null && candidate.vitarkaScore <= discussionMaxScore
                  ? candidate.vitarkaScore
                  : Math.round(((candidate?.vitarkaScore || 0) / 100) * discussionMaxScore))))
  );

  const rawTotalEarned =
    (hasLabs ? liveLabsScore : 0) +
    (hasAssessment ? liveAssessmentScore : 0) +
    (hasVitarka ? liveVitarkaScore : 0) +
    (hasSystemDesign ? liveSystemDesignScore : 0);
  const totalEarned = Math.abs(Math.round(rawTotalEarned) - rawTotalEarned) < 0.15
    ? Math.round(rawTotalEarned)
    : Math.round(rawTotalEarned * 10) / 10;
  const totalPossible =
    (hasLabs ? labsMaxScore : 0) +
    (hasAssessment ? assessmentMaxScore : 0) +
    (hasVitarka ? discussionMaxScore : 0) +
    (hasSystemDesign ? systemDesignMaxScore : 0);
  const computedEci = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const liveOverallScore =
    liveLabsScore === 0 &&
    liveAssessmentScore === 0 &&
    liveVitarkaScore === 0 &&
    liveSystemDesignScore === 0
      ? 0
      : totalEarned;

  // Normalize AI recommendation from report or calculate from overall score
  const scorePct = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : (candidate?.eci ?? 0);
  const scoreRec: Recommendation =
    scorePct >= 75 ? "Strong Hire" : scorePct >= 60 ? "Hire" : scorePct >= 45 ? "Maybe" : "Reject";

  const normalizeRec = (raw?: string): Recommendation | null => {
    if (!raw) return null;
    const s = raw.toLowerCase().trim();
    if (s.includes("strong")) return "Strong Hire";
    if ((s.includes("proceed") || s.includes("hire")) && !s.includes("not")) return "Hire";
    if (s.includes("review") || s.includes("maybe") || s.includes("hold") || s.includes("gem")) return "Maybe";
    if (s.includes("not") || s.includes("reject")) return "Reject";
    return null;
  };

  const isOverallReportStale = Boolean(
    (liveLabsScore > 0 && liveOverallReport?.section_scores?.find((s: any) => s.section === "engineering_labs")?.score === 0) ||
    (liveOverallReport?.overall_score != null && liveOverallReport.overall_score <= 1.5) ||
    (liveLabsScore > 0 && liveOverallReport?.overall_score != null && liveOverallReport.overall_score < 4.0 && scorePct >= 50) ||
    (liveOverallReport?.overall_score != null && Math.abs((scorePct / 10) - liveOverallReport.overall_score) >= 1.5)
  );

  const canonicalRecommendation: Recommendation =
    scorePct >= 70
      ? "Strong Hire"
      : scorePct >= 50
        ? "Hire"
        : scorePct >= 35
          ? "Maybe"
          : (!isOverallReportStale && normalizeRec(liveOverallReport?.recommendation)) ||
            (!hasLabs && !hasAssessment && normalizeRec(liveVitarkaReport?.recommendation)) ||
            scoreRec;

  const displayCandidate = {
    ...candidate,
    labsScore: liveLabsScore,
    assessmentScore: liveAssessmentScore,
    vitarkaScore: liveVitarkaScore,
    totalEarned,
    totalPossible,
    labsMaxScore,
    assessmentMaxScore,
    discussionMaxScore,
    eci: totalEarned,
    recommendation: canonicalRecommendation,
  };

  const detail = getCandidateDetail(displayCandidate, {
    labsMaxScore,
    assessmentMaxScore,
    discussionMaxScore,
  });
  const notify = (m: string) => setToast(m);
  const act = async (kind: string, text: string) => {
    if (!candidate?.email) return;
    await pushActivity(id, candidate.email, kind, text);
    // logRecruiterActivity is redundant here, pushActivity is called above.
    const newAct = await loadActivity(id, candidate.email);
    setActivity(newAct);
  };
  const doDecision = async (d: HiringDecision) => {
    setDecision(d);
    if (candidate?.email) saveDecision(id, candidateId, candidate.email, d);
    act("Decision Changed", `Decision changed to ${d}`);
    notify(`Marked as ${d}`);
    
    if (candidate?.email) {
      if (d === "Shortlisted") {
        await createTimelineEvent(id, candidate.email, "Shortlisted");
      } else if (d === "Hold") {
        await createTimelineEvent(id, candidate.email, "Placed on hold");
      } else if (d === "Rejected") {
        await createTimelineEvent(id, candidate.email, "Rejected");
      } else if (d === "Interview Scheduled") {
        await createTimelineEvent(id, candidate.email, "Interview scheduled");
      } else if (d === "Selected") {
        await createTimelineEvent(id, candidate.email, "Offer sent");
      }
      loadTimelineEvents(id, candidate.email).then(setTimelineEvents);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied`);
    } catch {
      notify("Copy failed");
    }
  };
  const downloadReport = async () => {
    try {
      const { downloadCandidateReportPdf } = await import("@/lib/candidateReportPdf");
      downloadCandidateReportPdf({
        name: displayCandidate.name,
        email: displayCandidate.email,
        phone: displayCandidate.phone,
        college: displayCandidate.college,
        company: displayCandidate.company,
        experience: displayCandidate.experience,
        eci: displayCandidate.eci,
        recommendation: displayCandidate.recommendation,
        confidence: detail.confidence,
        labsScore: displayCandidate.labsScore,
        assessmentScore: displayCandidate.assessmentScore,
        vitarkaScore: displayCandidate.vitarkaScore,
        labsMaxScore,
        assessmentMaxScore,
        discussionMaxScore,
        strengths: detail.strengths,
        weaknesses: detail.weaknesses,
        aiSummary: detail.aiSummary,
        nextStep: detail.nextStep,
        evaluationTitle: ev?.title || "Evaluation Report",
        summary: buildEvaluationSummary(displayCandidate, hasLabs, hasAssessment, hasVitarka),
      });
      act("download", "Downloaded candidate report (PDF)");
      notify("Report downloaded as PDF");
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
      notify("Failed to download PDF report");
    }
  };
  const downloadResume = () => {
    const blob = new Blob([resumeText(displayCandidate, detail)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayCandidate.name.replace(/\s+/g, "-")}-resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
    act("download", "Downloaded resume");
    notify("Resume downloaded");
  };

  const tabsToDisplay: Tab[] = ["overview"];
  if (hasLabs) tabsToDisplay.push("labs");
  if (hasAssessment) tabsToDisplay.push("assessment");
  if (hasVitarka) tabsToDisplay.push("vitarka");
  if (hasSystemDesign) tabsToDisplay.push("system_design");
  tabsToDisplay.push("resume", "timeline", "notes", "activity", "proctoring");

  return (
    <div className="min-h-screen">
      {/* Top header */}
      <header className="bg-white border-b border-white/5 backdrop-blur">
        <div className="px-8 pt-6 pb-5">
          <Link
            to="/recruiter/evaluations/$id/workspace"
            params={{ id }}
            search={{ tab: "candidates", view: "edit" } as any}
            className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900 dark:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {ev.title} · Candidates
          </Link>

          <div className="mt-5 flex justify-between gap-6">
            <div className="flex flex-col min-w-0 items-start gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar name={candidate.name} hue={candidate.avatarHue} size="xl" />
                  <h1 className="text-[26px] font-medium leading-tight text-neutral-900 dark:text-white">
                    {candidate.name}
                  </h1>
                  <StatusPill s={decision} />
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-neutral-300">
                  <button
                    onClick={() => copy(candidate.email, "Email")}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-900 dark:text-white"
                  >
                    <Mail className="h-3.5 w-3.5 text-neutral-500" /> {candidate.email}
                  </button>
                  <button
                    onClick={() => copy(candidate.phone, "Phone")}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-900 dark:text-white"
                  >
                    <Phone className="h-3.5 w-3.5 text-neutral-500" /> {candidate.phone}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-end items-end gap-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <SecondaryAction
                  icon={<Star className="h-3.5 w-3.5" />}
                  onClick={() => doDecision("Shortlisted")}
                  active={decision === "Shortlisted"}
                >
                  {decision === "Shortlisted" ? "Shortlisted" : "Shortlist"}
                </SecondaryAction>
                <SecondaryAction
                  icon={<PauseCircle className="h-3.5 w-3.5" />}
                  onClick={() => doDecision("Hold")}
                  active={decision === "Hold"}
                >
                  {decision === "Hold" ? "On Hold" : "Hold"}
                </SecondaryAction>
                <SecondaryAction
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  onClick={() => doDecision("Rejected")}
                  danger
                  active={decision === "Rejected"}
                >
                  {decision === "Rejected" ? "Rejected" : "Reject"}
                </SecondaryAction>
                <SecondaryAction
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={downloadReport}
                >
                  Report
                </SecondaryAction>
                <SecondaryAction
                  icon={<Share2 className="h-3.5 w-3.5" />}
                  onClick={async () => {
                    if (!candidate?.email) { notify("Candidate email not found."); return; }
                    const result = await generateSharedReportLink(id, candidate.email, candidate.rawSubmission?.id || candidate.id);
                    if (!result) {
                      notify("Failed to generate report link");
                      return;
                    }
                    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shared/report/${result.token}`;
                    await copy(url, "Report Link");
                  }}
                >
                  Generate report link
                </SecondaryAction>
              </div>
            </div>
          </div>
        </div>
      </header>
      <nav className="mt-6 flex flex-wrap items-center gap-1 px-8 w-full">
        {(tabsToDisplay).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 px-3 py-2 text-[13px] transition ${tab === t ? "text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            {tabLabel(t)}
            {tab === t && <span className="absolute inset-x-3 -bottom-[13px] h-px bg-white" />}
          </button>
        ))}
      </nav>
      <hr className="border-neutral-200" />
      <main className="w-full px-8 py-8">
        <div className="w-full min-w-0">
          {tab === "overview" && (
            <OverviewPane
              candidate={displayCandidate}
              detail={detail}
              vitarkaReport={liveVitarkaReport}
              overallReport={liveOverallReport}
              reportBundle={liveBundle}
              onGotoLabs={() => setTab("labs")}
              onGotoVit={() => setTab("vitarka")}
              onGotoSystemDesign={() => setTab("system_design")}
              hasLabs={hasLabs}
              hasAssessment={hasAssessment}
              hasVitarka={hasVitarka}
              hasSystemDesign={hasSystemDesign}
              labsMaxScore={labsMaxScore}
              assessmentMaxScore={assessmentMaxScore}
              discussionMaxScore={discussionMaxScore}
              systemDesignMaxScore={systemDesignMaxScore}
              ev={ev}
            />
          )}
          {tab === "labs" && <LabsPane ev={ev} candidate={displayCandidate} labsReport={liveLabsReport} onOpen={setOpenLab} />}
          {tab === "assessment" && <AssessmentPane ev={ev} candidate={displayCandidate} knowledgeReport={liveKnowledgeReport} timelineEvents={timelineEvents} />}
          {tab === "vitarka" && (
            <VitarkaPane
              candidate={displayCandidate}
              detail={detail}
              report={liveVitarkaReport}
              reportBundle={liveBundle}
              submission={vitarkaSubmission}
              submissionStatus={vitarkaSubmission?.status}
              onGenerateReport={handleGenerateReport}
              generatingReport={generatingReport}
              onDownload={() => {
                act("download", "Downloaded Vitarka transcript");
                notify("Transcript downloaded");
              }}
            />
          )}
          {tab === "system_design" && (
            <SystemDesignReportPane
              ev={ev}
              candidate={displayCandidate}
              sdMaxScore={systemDesignMaxScore}
              onOpenStudio={setOpenSystemDesign}
            />
          )}
          {tab === "proctoring" && <CandidateAnalyticsViewer candidate={candidate} evaluation={ev} vitarkaSubmission={vitarkaSubmission} />}
          {tab === "resume" && (
            <ResumePane candidate={candidate} detail={detail} onDownload={downloadResume} />
          )}
          {tab === "timeline" && <TimelinePane events={timelineEvents} detail={detail} isDemo={id.startsWith("7700") || id.startsWith("demo")} hasLabs={hasLabs} hasAssessment={hasAssessment} hasVitarka={hasVitarka} />}
          {tab === "notes" && (
            <NotesPane
              notes={notes}
              onAddNote={async (draft) => {
                const created = await addNote(id, candidate.email, draft);
                if (created) {
                  setNotes((prev) => [created, ...prev]);
                  act("note", `Added a ${draft.priority}-priority note`);
                } else {
                  notify("Failed to save note");
                }
              }}
              onDeleteNote={async (noteId) => {
                const ok = await deleteNote(noteId, id, candidate.email);
                if (ok) {
                  setNotes((prev) => prev.filter(x => x.id !== noteId));
                  act("note", "Deleted a note");
                } else {
                  notify("Failed to delete note");
                }
              }}
            />
          )}

          {tab === "activity" && <ActivityPane activity={activity} />}
        </div>
      </main>

      {openLab && <LabDrawer data={openLab} evaluationId={id} onClose={() => setOpenLab(null)} />}

      {openSystemDesign && (
        <SystemDesignDrawer
          data={openSystemDesign}
          onClose={() => setOpenSystemDesign(null)}
        />
      )}

      <MissingVitarkaSessionModal
        isOpen={showMissingSessionModal}
        onClose={() => setShowMissingSessionModal(false)}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-[12px] text-neutral-900 dark:text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ============ Tabs ============

export function OverviewPane({
  candidate,
  detail,
  vitarkaReport,
  overallReport,
  reportBundle,
  onGotoLabs,
  onGotoVit,
  onGotoSystemDesign,
  hasLabs,
  hasAssessment,
  hasVitarka,
  hasSystemDesign,
  labsMaxScore = 80,
  assessmentMaxScore = 30,
  discussionMaxScore = 25,
  systemDesignMaxScore = 30,
  ev,
}: {
  candidate: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
  vitarkaReport?: any;
  overallReport?: any;
  reportBundle?: any;
  onGotoLabs: () => void;
  onGotoVit: () => void;
  onGotoSystemDesign?: () => void;
  hasLabs: boolean;
  hasAssessment: boolean;
  hasVitarka: boolean;
  hasSystemDesign?: boolean;
  labsMaxScore?: number;
  assessmentMaxScore?: number;
  discussionMaxScore?: number;
  systemDesignMaxScore?: number;
  ev?: any;
}) {
  const activeCount = [hasLabs, hasAssessment, hasVitarka, hasSystemDesign].filter(Boolean).length;
  const gridClass = activeCount === 4 ? "grid-cols-4" : activeCount === 3 ? "grid-cols-3" : activeCount === 2 ? "grid-cols-2" : "grid-cols-1";

  const rawTotalEarnedVal = candidate.totalEarned ?? candidate.eci;
  const numTotalEarned = Number(rawTotalEarnedVal);
  const displayTotalEarned = Number.isFinite(numTotalEarned)
    ? (Math.abs(Math.round(numTotalEarned) - numTotalEarned) < 0.15 ? Math.round(numTotalEarned) : Number(numTotalEarned.toFixed(1)))
    : rawTotalEarnedVal;
  const maxTotalScore = candidate.totalPossible ?? (labsMaxScore + assessmentMaxScore + discussionMaxScore + (hasSystemDesign ? systemDesignMaxScore : 0));

  return (
    <div className="space-y-6">
      {/* ECI premium card */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent">
        <div className="flex flex-wrap items-center gap-6 p-6">
          <RadialScore
            value={Number(displayTotalEarned)}
            maxScore={maxTotalScore}
          />
          <div className="min-w-[180px]">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">
              Engineering Capability
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 text-[24px] font-medium text-neutral-900 dark:text-white">
              <span>{candidate.totalEarned ?? candidate.eci}</span>
              <span className="text-[14px] text-neutral-500">
                / {maxTotalScore}
              </span>
            </div>
            <div className="mt-0.5 text-[13px] text-neutral-400">
              Recommendation: <span className="text-neutral-900 dark:text-white">{candidate.recommendation}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" /> {detail.confidence}%
              confidence in recommendation
            </div>
          </div>
          <div className="min-w-[280px] flex-1">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">
              Why this score
            </div>
            <ul className="mt-2 space-y-1.5">
              {detail.ecIBreakdown.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-neutral-300">
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${e.kind === "pos" ? "bg-emerald-400" : e.kind === "neg" ? "bg-amber-400" : "bg-neutral-500"}`}
                  />
                  <span className="text-neutral-400">{e.label}:</span>
                  <span className="text-neutral-900 dark:text-white">{e.contribution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {activeCount > 0 && (
          <div className={`grid ${gridClass} gap-px bg-white/5 divide-x divide-black/10`}>
            {hasLabs && <SubMetric label="Engineering Labs" value={candidate.labsScore} maxScore={labsMaxScore} onClick={onGotoLabs} />}
            {hasAssessment && <SubMetric label="Knowledge Assessment" value={candidate.assessmentScore} maxScore={assessmentMaxScore} />}
            {hasVitarka && <SubMetric label="Vitarka Discussion" value={candidate.vitarkaScore} maxScore={discussionMaxScore} onClick={onGotoVit} />}
            {hasSystemDesign && <SubMetric label="System Design" value={candidate.systemDesignScore} maxScore={systemDesignMaxScore} onClick={onGotoSystemDesign} />}
          </div>
        )}
      </div>

      {/* Evaluation summary */}
      <EvaluationSummary
        candidate={candidate}
        ev={ev}
        vitarkaReport={vitarkaReport}
        overallReport={overallReport}
        reportBundle={reportBundle}
        hasLabs={hasLabs}
        hasAssessment={hasAssessment}
        hasVitarka={hasVitarka}
        labsMaxScore={labsMaxScore}
        assessmentMaxScore={assessmentMaxScore}
        discussionMaxScore={discussionMaxScore}
      />
    </div>
  );
}

export function normalizeGenderNeutralPronouns(text: string): string {
  if (!text || typeof text !== "string") return text || "";
  return text
    .replace(/\bHe's\b/g, "They're")
    .replace(/\bhe's\b/g, "they're")
    .replace(/\bShe's\b/g, "They're")
    .replace(/\bshe's\b/g, "they're")
    .replace(/\bHe'd\b/g, "They'd")
    .replace(/\bhe'd\b/g, "they'd")
    .replace(/\bShe'd\b/g, "They'd")
    .replace(/\bshe'd\b/g, "they'd")
    .replace(/\bHe'll\b/g, "They'll")
    .replace(/\bhe'll\b/g, "they'll")
    .replace(/\bShe'll\b/g, "They'll")
    .replace(/\bshe'll\b/g, "they'll")
    .replace(/\bHimself\b/g, "Themselves")
    .replace(/\bhimself\b/g, "themselves")
    .replace(/\bHerself\b/g, "Themselves")
    .replace(/\bherself\b/g, "themselves")
    .replace(/\bHe has\b/g, "They have")
    .replace(/\bhe has\b/g, "they have")
    .replace(/\bShe has\b/g, "They have")
    .replace(/\bshe has\b/g, "they have")
    .replace(/\bHe is\b/g, "They are")
    .replace(/\bhe is\b/g, "they are")
    .replace(/\bShe is\b/g, "They are")
    .replace(/\bshe is\b/g, "they are")
    .replace(/\bHe was\b/g, "They were")
    .replace(/\bhe was\b/g, "they were")
    .replace(/\bShe was\b/g, "They were")
    .replace(/\bshe was\b/g, "they were")
    .replace(/\bHe does\b/g, "They do")
    .replace(/\bhe does\b/g, "they do")
    .replace(/\bShe does\b/g, "They do")
    .replace(/\bshe does\b/g, "they do")
    .replace(/\bHe\b/g, "They")
    .replace(/\bhe\b/g, "they")
    .replace(/\bShe\b/g, "They")
    .replace(/\bshe\b/g, "they")
    .replace(/\bHim\b/g, "Them")
    .replace(/\bhim\b/g, "them")
    .replace(/\bHis\b/g, "Their")
    .replace(/\bhis\b/g, "their")
    .replace(/\bHers\b/g, "Theirs")
    .replace(/\bhers\b/g, "theirs")
    .replace(/\bHer\b/g, "Their")
    .replace(/\bher\b/g, "their");
}

function stripUuids(text: string, replacement: string = "the candidate"): string {
  if (!text || typeof text !== "string") return text;
  const withoutUuids = text.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, replacement);
  return normalizeGenderNeutralPronouns(withoutUuids);
}

interface ParsedTaskResult {
  key: string;
  name: string;
  result: "passed" | "failed" | "error" | "skipped";
  score?: number;
  maxScore?: number;
  message?: string;
  details?: string;
}

interface ParsedExecutionReport {
  tasks: ParsedTaskResult[];
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  rawStdout?: string;
  rawStderr?: string;
  rawText?: string;
  hasTasks: boolean;
}

function parseExecutionOutput(rawOutput: string | null | undefined, labTasks?: any[]): ParsedExecutionReport | null {
  if (!rawOutput) return null;
  
  let root: any = null;
  if (typeof rawOutput === "object") {
    root = rawOutput;
  } else {
    try {
      root = JSON.parse(rawOutput);
    } catch {
      return {
        tasks: [],
        rawStdout: String(rawOutput),
        rawText: String(rawOutput),
        hasTasks: false,
      };
    }
  }

  let tasksDict: any = null;
  let totalScore: number | undefined = root?.total_score != null ? Number(root.total_score) : undefined;
  let maxScore: number | undefined = root?.max_possible_score != null ? Number(root.max_possible_score) : undefined;
  let percentage: number | undefined = root?.percentage != null ? Number(root.percentage) : undefined;
  let rawStdout: string = "";
  let rawStderr: string = root?.stderr ? String(root.stderr).trim() : "";

  // 1. Check parsed_data from executer
  if (root?.parsed_data?.tasks) {
    tasksDict = root.parsed_data.tasks;
    if (root.parsed_data.total_score != null) totalScore = Number(root.parsed_data.total_score);
    if (root.parsed_data.max_possible_score != null) maxScore = Number(root.parsed_data.max_possible_score);
  }

  // 2. Check stdout if it contains JSON with tasks
  if (!tasksDict && root?.stdout) {
    const s = String(root.stdout).trim();
    rawStdout = s;
    try {
      const parsedStdout = JSON.parse(s);
      if (parsedStdout?.tasks) {
        tasksDict = parsedStdout.tasks;
        if (parsedStdout.total_score != null && totalScore == null) totalScore = Number(parsedStdout.total_score);
        if (parsedStdout.max_possible_score != null && maxScore == null) maxScore = Number(parsedStdout.max_possible_score);
      }
    } catch {
      const match = s.match(/(\{[\s\S]*"tasks"[\s\S]*\})/);
      if (match) {
        try {
          const matchedJson = JSON.parse(match[1]);
          if (matchedJson?.tasks) {
            tasksDict = matchedJson.tasks;
            if (matchedJson.total_score != null && totalScore == null) totalScore = Number(matchedJson.total_score);
            if (matchedJson.max_possible_score != null && maxScore == null) maxScore = Number(matchedJson.max_possible_score);
          }
        } catch {}
      }
    }
  } else if (!rawStdout && root?.stdout) {
    rawStdout = String(root.stdout).trim();
  }

  // 3. Check root.tasks
  if (!tasksDict && root?.tasks) {
    tasksDict = root.tasks;
  }

  const tasksList: ParsedTaskResult[] = [];

  if (tasksDict) {
    if (Array.isArray(tasksDict)) {
      let activeDict = tasksDict;
      if (labTasks && Array.isArray(labTasks) && labTasks.length > 0 && tasksDict.length > labTasks.length) {
        const labTaskIds = new Set(labTasks.map((lt: any, idx: number) => String(lt.id ?? lt.task_slug ?? lt.title ?? `task-${idx}`)));
        const filtered = tasksDict.filter((t: any, idx: number) => {
          const tid = String(t.id ?? t.task_slug ?? t.key ?? `task-${idx}`);
          return labTaskIds.has(tid) || labTaskIds.has(String(t.name)) || labTaskIds.has(String(t.title));
        });
        activeDict = filtered.length === labTasks.length ? filtered : tasksDict.slice(0, labTasks.length);
      }
      activeDict.forEach((t: any, idx: number) => {
        const matchingLabTask = labTasks && labTasks[idx];
        const resStr = String(t.result || t.status || "").toLowerCase();
        const taskMax = matchingLabTask?.marks || t.max_score || 10;
        const isPassed = t.passed !== undefined
          ? Boolean(t.passed)
          : (resStr === "passed" || t.status === "passed" || (t.score != null && Number(t.score) >= (taskMax >= 10 ? taskMax : 1.0)));
        const rawScore = t.score != null ? Number(t.score) : (isPassed ? taskMax : 0);
        const taskScore = (rawScore > 0 && rawScore <= 1.0) ? Math.round(rawScore * taskMax) : rawScore;
        tasksList.push({
          key: `task_${idx + 1}`,
          name: matchingLabTask?.title || t.name || t.title || `Task ${idx + 1}`,
          result: isPassed ? "passed" : "failed",
          score: isPassed ? taskScore : 0,
          maxScore: taskMax,
          message: t.feedback || t.message || t.description || (isPassed ? "Test passed successfully" : "Condition not satisfied"),
          details: t.details || t.error || t.expected,
        });
      });
    } else if (typeof tasksDict === "object") {
      let keys = Object.keys(tasksDict);
      if (labTasks && Array.isArray(labTasks) && labTasks.length > 0 && keys.length > labTasks.length) {
        const labTaskIds = new Set(labTasks.map((lt: any, i: number) => String(lt.id ?? lt.task_slug ?? lt.title ?? `task_${i + 1}`).toLowerCase()));
        const filteredKeys = keys.filter((k) => {
          const kLower = k.toLowerCase();
          return labTaskIds.has(kLower) || labTasks.some((lt: any) => String(lt.title).toLowerCase().includes(kLower) || kLower.includes(String(lt.title).toLowerCase()));
        });
        if (filteredKeys.length === labTasks.length) {
          keys = filteredKeys;
        } else {
          keys = keys.slice(0, labTasks.length);
        }
      }
      keys.forEach((k, idx) => {
        const item = tasksDict[k];
        const matchingLabTask = labTasks && (labTasks.find((lt: any) => lt.id === k || lt.title?.toLowerCase().includes(k.toLowerCase())) || labTasks[idx]);
        const resStr = String(item.result || item.status || "").toLowerCase();
        const taskMax = item.max_score || matchingLabTask?.marks || 10;
        const isPassed = item.passed !== undefined
          ? Boolean(item.passed)
          : (resStr === "passed" || item.status === "passed" || (item.score != null && Number(item.score) >= (taskMax >= 10 ? taskMax : 1.0)));
        
        const formattedKey = k.replace(/^task_?(\d+)$/i, "Task $1");
        const displayName = matchingLabTask?.title ? `${formattedKey}: ${matchingLabTask.title}` : (item.name || item.title || formattedKey);
        const rawScore = item.score != null ? Number(item.score) : (isPassed ? taskMax : 0);
        const taskScore = (rawScore > 0 && rawScore <= 1.0) ? Math.round(rawScore * taskMax) : rawScore;

        tasksList.push({
          key: k,
          name: displayName,
          result: isPassed ? "passed" : "failed",
          score: isPassed ? taskScore : 0,
          maxScore: taskMax,
          message: item.message || item.feedback || (isPassed ? "Test passed successfully" : "Condition not satisfied"),
          details: item.details || item.output || item.error,
        });
      });

      // If there are lab tasks that were not reported in tasksDict, append them as uncompleted
      if (labTasks && Array.isArray(labTasks) && labTasks.length > keys.length) {
        for (let idx = keys.length; idx < labTasks.length; idx++) {
          const lt = labTasks[idx];
          tasksList.push({
            key: `task_${idx + 1}`,
            name: lt.title ? `Task ${idx + 1}: ${lt.title}` : `Task ${idx + 1}`,
            result: "failed",
            score: 0,
            maxScore: lt.marks || 2,
            message: "Not completed / Test failed",
          });
        }
      }
    }
  }

  if (totalScore == null && tasksList.length > 0) {
    totalScore = tasksList.reduce((acc, t) => acc + (t.score || 0), 0);
  }
  if (maxScore == null && tasksList.length > 0) {
    maxScore = tasksList.reduce((acc, t) => acc + (t.maxScore || 10), 0);
  }
  if (percentage == null && totalScore != null && maxScore != null && maxScore > 0) {
    percentage = Math.round((totalScore / maxScore) * 100);
  }

  return {
    tasks: tasksList,
    totalScore,
    maxScore,
    percentage,
    rawStdout,
    rawStderr,
    rawText: typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput, null, 2),
    hasTasks: tasksList.length > 0,
  };
}

export function computeLabTestStats(lab: any, labSub: any) {
  const calcStats = getLabCalculatedStats(lab);
  const effectiveTasks = calcStats.selectedTasks.length > 0
    ? calcStats.selectedTasks
    : (Array.isArray(lab?.tasks) ? lab.tasks : []);
  const selectedCount = calcStats.selectedTasks.length > 0
    ? calcStats.selectedTasks.length
    : (lab?.selected_task_ids && Array.isArray(lab.selected_task_ids) && lab.selected_task_ids.length > 0
        ? countDistinctSelectedTasks(lab.selected_task_ids)
        : (effectiveTasks.length > 0 ? effectiveTasks.length : (lab?.selected_task_id ? 1 : null)));

  const maxMarks = calcStats.marks || Number(lab?.marks) || 6;
  let marksEarned = Number(labSub?.score ?? 0);
  let tasksCompletedCount: number | null = null;
  let parsedTasksTotal: number | null = null;

  if (labSub?.solution_output) {
    try {
      const parsed = typeof labSub.solution_output === "string" ? JSON.parse(labSub.solution_output) : labSub.solution_output;
      if (parsed?.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
        let activeTasks = parsed.tasks;
        if (selectedCount != null && parsed.tasks.length > selectedCount) {
          if (lab?.selected_task_ids && Array.isArray(lab.selected_task_ids) && lab.selected_task_ids.length > 0) {
            const selectedSet = new Set(lab.selected_task_ids.map(String));
            const filtered = parsed.tasks.filter((t: any, idx: number) => {
              const tid = String(t.id ?? t.key ?? t.task_slug ?? `task-${idx}`);
              return (
                selectedSet.has(tid) ||
                selectedSet.has(String(t.name)) ||
                selectedSet.has(String(t.title)) ||
                selectedSet.has(`task-${idx}`)
              );
            });
            activeTasks = (filtered.length > 0 ? filtered : parsed.tasks).slice(0, selectedCount);
          } else {
            activeTasks = parsed.tasks.slice(0, selectedCount);
          }
        } else if (selectedCount != null && activeTasks.length > selectedCount) {
          activeTasks = activeTasks.slice(0, selectedCount);
        }
        parsedTasksTotal = selectedCount != null ? Math.min(selectedCount, activeTasks.length) : activeTasks.length;
        tasksCompletedCount = activeTasks.filter((t: any) => t.passed === true || t.result === "passed" || t.status === "passed").length;
        marksEarned = Math.round((tasksCompletedCount / activeTasks.length) * maxMarks);
      } else if (parsed?.total_score != null) {
        marksEarned = Number(parsed.total_score);
      } else if (parsed?.percentage != null) {
        marksEarned = Math.round((Number(parsed.percentage) / 100) * maxMarks);
      }
    } catch {}
  }

  if (marksEarned === 0 && labSub?.solution && typeof labSub.solution === "string") {
    if (labSub.solution.includes("HTTP_201_CREATED") || labSub.solution.includes("201_CREATED")) {
      marksEarned = Math.min(2, maxMarks);
    }
  }

  let scorePct = 0;
  if (marksEarned > maxMarks && marksEarned <= 100) {
    scorePct = marksEarned;
    marksEarned = Math.round((marksEarned / 100) * maxMarks);
  } else if (maxMarks > 0) {
    scorePct = Math.min(100, Math.round((marksEarned / maxMarks) * 100));
  }

  if (parsedTasksTotal == null && labSub?.solution_output) {
    const parsedExec = parseExecutionOutput(labSub.solution_output, effectiveTasks);
    if (parsedExec && parsedExec.tasks && parsedExec.tasks.length > 0) {
      const execTasks = selectedCount != null ? parsedExec.tasks.slice(0, selectedCount) : parsedExec.tasks;
      parsedTasksTotal = execTasks.length;
      tasksCompletedCount = execTasks.filter((t: any) => t.result === "passed" || t.passed === true).length;
    }
  }

  if (parsedTasksTotal == null && labSub?.tests_total) {
    parsedTasksTotal = selectedCount != null ? Math.min(selectedCount, Number(labSub.tests_total)) : Number(labSub.tests_total);
    tasksCompletedCount = selectedCount != null ? Math.min(selectedCount, Number(labSub.tests_passed || 0)) : Number(labSub.tests_passed || 0);
  }

  const tasksTotal = selectedCount != null
    ? selectedCount
    : (parsedTasksTotal ?? (effectiveTasks.length > 0 ? effectiveTasks.length : 3));

  let tasksCompleted = tasksCompletedCount != null
    ? Math.min(tasksTotal, tasksCompletedCount)
    : (labSub?.tasks_completed != null
        ? Math.min(tasksTotal, Number(labSub.tasks_completed))
        : (scorePct > 0 ? Math.max(1, Math.min(tasksTotal, Math.round((scorePct / 100) * tasksTotal))) : 0));

  if (scorePct >= 100 && tasksTotal > 0) {
    tasksCompleted = tasksTotal;
  }
  if (tasksTotal > 0 && tasksCompleted > tasksTotal) {
    tasksCompleted = tasksTotal;
  }

  return {
    tasksTotal,
    tasksCompleted,
    marksEarned,
    maxMarks,
    scorePct,
  };
}

function SectionPerformanceBlock({
  title,
  headline,
  stats,
  badge,
  tone = "emerald",
}: {
  title: string;
  headline: string;
  stats: { label: string; value: string; sub?: string }[];
  badge?: string;
  tone?: "emerald" | "blue" | "amber";
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">{title}</div>
        </div>

        {/* Headline callout box */}
        <div className="mt-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              tone === "emerald"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            }`}>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-[13px] font-medium text-neutral-900 dark:text-white truncate">
              {headline}
            </div>
          </div>
          {badge && (
            <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
              {badge}
            </span>
          )}
        </div>

        {/* Dynamic factual stats */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((st, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.015] p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 truncate">{st.label}</div>
              <div className="mt-1 text-[14px] font-medium text-neutral-900 dark:text-white">{st.value}</div>
              {st.sub && <div className="mt-0.5 text-[10px] text-neutral-400 truncate">{st.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({
  title,
  score,
  maxScore = 10,
  summary,
  strengths,
  explore,
  fullWidth = false,
  showScore = false,
}: {
  title: string;
  score?: number;
  maxScore?: number;
  summary: string;
  strengths: string[];
  explore: string;
  fullWidth?: boolean;
  showScore?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">{title}</div>
        {showScore && score != null && (
          <div className="text-[13px] font-medium text-neutral-900 dark:text-white">
            {score}
            <span className="text-neutral-500">/{maxScore}</span>
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-neutral-300">{stripUuids(summary)}</p>
      <div className={fullWidth ? "mt-4 grid grid-cols-1 gap-6 md:grid-cols-2" : "mt-4 space-y-4"}>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Strengths</div>
          {strengths.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {strengths.map((s) => (
                <li key={s} className="flex gap-2 text-[12px] text-neutral-300">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  {stripUuids(s)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12px] text-neutral-400">None identified</p>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Area to explore</div>
          <div className="mt-1.5 flex gap-2 text-[12px] text-neutral-300">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
            {stripUuids(explore)}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvaluationSummary({
  candidate,
  ev,
  vitarkaReport,
  overallReport,
  reportBundle,
  hasLabs,
  hasAssessment,
  hasVitarka,
  labsMaxScore = 80,
  assessmentMaxScore = 30,
  discussionMaxScore = 25,
}: {
  candidate: { name: string; labsScore: number; assessmentScore: number; vitarkaScore: number; eci: number; recommendation?: string; rawSubmission?: any };
  ev?: any;
  vitarkaReport?: any;
  overallReport?: any;
  reportBundle?: any;
  hasLabs: boolean;
  hasAssessment: boolean;
  hasVitarka: boolean;
  labsMaxScore?: number;
  assessmentMaxScore?: number;
  discussionMaxScore?: number;
}) {
  const data = buildEvaluationSummary(candidate, hasLabs, hasAssessment, hasVitarka);
  const overall = candidate.eci;
  const labsReport = reportBundle?.engineering_labs_report;
  const knowledgeReport = reportBundle?.knowledge_assessment_report;

  // --- Engineering Labs stats ---
  const labSections = ev?.sections?.filter((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS") || [];
  const allLabs = labSections.flatMap((s: any) => (s.labs && s.labs.length > 0 ? s.labs : (s.questions || [])));
  const totalLabsCount = allLabs.length || (candidate.rawSubmission?.lab_submissions?.length || 1);
  const rawLabSubs: any[] = candidate.rawSubmission?.lab_submissions || [];

  let totalTestsPassed = 0;
  let totalTestsCount = 0;
  let labsAttemptedCount = 0;
  let totalLabMinutes = 0;
  let totalLabSeconds = 0;

  allLabs.forEach((lab: any, idx: number) => {
    const targetId = String(lab.id ?? lab.lab_id ?? lab.question_id ?? "");
    const sub = rawLabSubs.find((s: any) => {
      const sLabId = String(s.lab_question?.id ?? s.lab_question ?? s.lab_id ?? "");
      return sLabId === targetId || (sLabId && targetId && (sLabId.includes(targetId) || targetId.includes(sLabId)));
    }) || rawLabSubs[idx] || (rawLabSubs.length === 1 ? rawLabSubs[0] : undefined);
    if (sub) {
      if (sub.solution || sub.solution_output || Number(sub.score || 0) > 0) {
        labsAttemptedCount += 1;
      }
      const sec = parseLabDurationSecs(sub);
      const m = Math.max(0, Math.round(sec / 60));
      totalLabMinutes += m;
      totalLabSeconds += sec;
    }

    const stats = computeLabTestStats(lab, sub);
    totalTestsCount += stats.tasksTotal;
    totalTestsPassed += stats.tasksCompleted;
  });

  const totalLabTasks = allLabs.reduce((sum: number, l: any) => {
    const calc = getLabCalculatedStats(l);
    if (calc.selectedTasks.length > 0) return sum + calc.selectedTasks.length;
    const sCount = (l.selected_task_ids && Array.isArray(l.selected_task_ids) && l.selected_task_ids.length > 0)
      ? countDistinctSelectedTasks(l.selected_task_ids)
      : (l.selected_task_id ? 1 : null);
    if (sCount != null) return sum + sCount;
    if (Array.isArray(l.tasks) && l.tasks.length > 0) return sum + l.tasks.length;
    if (typeof l.tasks === "number" && l.tasks > 0) return sum + l.tasks;
    return sum;
  }, 0);

  if (totalTestsCount === 0) {
    totalTestsCount = totalLabTasks > 0 ? totalLabTasks : (allLabs.length > 0 ? allLabs.length * 3 : 3);
    if (candidate.labsScore > 0) {
      totalTestsPassed = Math.max(1, Math.min(totalTestsCount, Math.round((candidate.labsScore / (labsMaxScore || 6)) * totalTestsCount)));
    } else {
      totalTestsPassed = 0;
    }
  } else if (totalLabTasks > 0 && totalTestsCount !== totalLabTasks) {
    totalTestsCount = totalLabTasks;
  }

  if (candidate.labsScore > 0 && labsMaxScore > 0 && candidate.labsScore >= labsMaxScore && totalTestsCount > 0) {
    totalTestsPassed = totalTestsCount;
  }
  if (totalTestsCount > 0 && totalTestsPassed > totalTestsCount) {
    totalTestsPassed = totalTestsCount;
  }

  const labPassRate = totalTestsCount > 0 ? Math.round((totalTestsPassed / totalTestsCount) * 100) : 0;
  const labHeadline = totalTestsCount > 0
    ? `${totalTestsPassed} tests passed out of ${totalTestsCount} across ${totalLabsCount} ${totalLabsCount === 1 ? "lab" : "labs"}`
    : `${labsAttemptedCount} of ${totalLabsCount} ${totalLabsCount === 1 ? "lab" : "labs"} attempted`;

  // --- Knowledge Assessment stats ---
  const assessmentSections = ev?.sections?.filter((s: any) =>
    s.kind === "quiz" || s.kind === "mcq" || s.kind === "assessment" || s.type === "MCQ" || s.type === "QUIZ" || s.type === "KNOWLEDGE_ASSESSMENT"
  ) || [];
  const assessmentSectionsCount = assessmentSections.length || 1;
  const allQuestions = assessmentSections.flatMap((s: any) => s.questions || []);
  const rawKnowledgeSubs: any[] = candidate.rawSubmission?.knowledge_submissions || [];

  let totalQuestionsCount = allQuestions.length;
  let totalQuestionsCorrect = 0;
  let totalQuestionsAttempted = 0;

  if (rawKnowledgeSubs.length > 0) {
    let answeredQIds = new Set<string>();
    rawKnowledgeSubs.forEach((sub: any) => {
      const sec = ev?.sections?.find((s: any) => (s.id || s.section_id) === sub.section);
      const qMap = new Map((sec?.questions || []).map((q: any) => [String(q.id), q]));
      (sub.answers || []).forEach((ans: any) => {
        const qId = String(ans.question_id || ans.question);
        answeredQIds.add(qId);
        const q: any = qMap.get(qId);
        if (ans.is_correct) {
          totalQuestionsCorrect += 1;
        } else if (q) {
          const optsArray = q.mcq_options || q.options || [];
          let userOpt = ans.selected_option !== undefined ? ans.selected_option : ans.selected_options;
          if (userOpt !== undefined && userOpt !== null && optsArray.length > 0) {
            let uIndices = Array.isArray(userOpt) ? userOpt.map(Number) : [Number(userOpt)];
            let corrIndices = optsArray.map((o: any, i: number) => o.is_correct ? i : -1).filter((i: number) => i !== -1);
            if (corrIndices.length > 0 && uIndices.length === corrIndices.length && [...uIndices].sort().every((v, idx) => v === [...corrIndices].sort()[idx])) {
              totalQuestionsCorrect += 1;
            }
          }
        }
      });
    });
    totalQuestionsAttempted = answeredQIds.size;
  }

  if (totalQuestionsCount === 0) {
    totalQuestionsCount = knowledgeReport?.question_count || totalQuestionsAttempted || (candidate.assessmentScore > 0 ? 10 : 0);
  }
  if (totalQuestionsCorrect === 0 && knowledgeReport?.correct_count) {
    totalQuestionsCorrect = knowledgeReport.correct_count;
  }
  if (totalQuestionsAttempted === 0) {
    totalQuestionsAttempted = totalQuestionsCorrect;
  }

  const assessmentAccuracyPct = totalQuestionsCount > 0 ? Math.round((totalQuestionsCorrect / totalQuestionsCount) * 100) : 0;
  const assessmentHeadline = totalQuestionsCount > 0
    ? `${totalQuestionsCorrect} questions answered correctly out of ${totalQuestionsCount} across ${assessmentSectionsCount} ${assessmentSectionsCount === 1 ? "section" : "sections"}`
    : `Knowledge assessment completed`;

  const labs10 = totalTestsCount > 0
    ? Number(((totalTestsPassed / totalTestsCount) * 10).toFixed(1))
    : (candidate.labsScore > 0 ? Number(((candidate.labsScore / (labsMaxScore || 80)) * 10).toFixed(1)) : (labsReport?.overall_score != null ? labsReport.overall_score : 0));

  const assessment10 = totalQuestionsCount > 0
    ? Number(((totalQuestionsCorrect / totalQuestionsCount) * 10).toFixed(1))
    : (knowledgeReport?.score_percent != null ? Number((knowledgeReport.score_percent / 10).toFixed(1)) : (candidate.assessmentScore > 0 ? Number(((candidate.assessmentScore / (assessmentMaxScore || 30)) * 10).toFixed(1)) : 0));

  const vitarka10 = vitarkaReport?.overall_score != null
    ? vitarkaReport.overall_score
    : (candidate.vitarkaScore > 0 ? Number(((candidate.vitarkaScore / (discussionMaxScore || 25)) * 10).toFixed(1)) : 0);

  const activeWeights = (hasLabs ? 0.35 : 0) + (hasAssessment ? 0.25 : 0) + (hasVitarka ? 0.40 : 0);
  const liveWeighted10 = activeWeights > 0
    ? Number((((hasLabs ? labs10 * 0.35 : 0) + (hasAssessment ? assessment10 * 0.25 : 0) + (hasVitarka ? vitarka10 * 0.40 : 0)) / activeWeights).toFixed(1))
    : (overall > 0 ? Number((overall / 10).toFixed(1)) : 0);

  const isOverallReportStale = Boolean(
    !overallReport?.overall_score ||
    (candidate.labsScore > 0 && overallReport.overall_score <= 1.5) ||
    (totalTestsPassed > 0 && overallReport.overall_score < 4.0 && liveWeighted10 >= 5.0) ||
    (Math.abs(liveWeighted10 - (overallReport?.overall_score || 0)) >= 1.5) ||
    (overallReport?.executive_summary && overallReport.executive_summary.includes("0/6") && totalQuestionsCorrect > 0) ||
    (overallReport?.executive_summary && overallReport.executive_summary.includes("1/5") && totalTestsPassed > 1) ||
    (overallReport?.executive_summary && overallReport.executive_summary.includes("5/10") && totalTestsPassed > 5) ||
    (overallReport?.executive_summary && totalTestsPassed === totalTestsCount && totalTestsCount > 0 && overallReport.executive_summary.includes("passed") && !overallReport.executive_summary.includes(`${totalTestsCount}/${totalTestsCount}`)) ||
    (overallReport?.executive_summary && totalTestsCount > 0 && totalTestsCount !== 5 && overallReport.executive_summary.includes("5/5")) ||
    (overallReport?.executive_summary && totalTestsCount > 0 && totalTestsCount !== 6 && overallReport.executive_summary.includes("6/6")) ||
    (!hasAssessment && overallReport?.executive_summary && (overallReport.executive_summary.includes("knowledge assessment") || overallReport.executive_summary.includes("questions correct"))) ||
    (!hasVitarka && overallReport?.executive_summary && (overallReport.executive_summary.includes("Vitarka") || overallReport.executive_summary.includes("interview") || overallReport.executive_summary.includes("discussion"))) ||
    (!hasLabs && overallReport?.executive_summary && (overallReport.executive_summary.includes("engineering lab") || overallReport.executive_summary.includes("practical performance")))
  );

  const overall10 = (!isOverallReportStale && overallReport?.overall_score != null)
    ? overallReport.overall_score
    : liveWeighted10;

  const calculatedVerdict =
    overall10 >= 7.5 ? "Strong Hire" : overall10 >= 5.0 ? "Hire" : overall10 >= 3.5 ? "Maybe" : "Reject";
  const verdict =
    overall10 >= 5.0 && candidate.recommendation === "Reject"
      ? calculatedVerdict
      : (!isOverallReportStale && candidate.recommendation ? candidate.recommendation : calculatedVerdict);
  const verdictTone =
    verdict.toLowerCase().includes("strong") || verdict.toLowerCase().includes("shortlist") || verdict.toLowerCase().includes("hire")
      ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300"
      : verdict.toLowerCase().includes("hold") || verdict.toLowerCase().includes("review") || verdict.toLowerCase().includes("maybe")
        ? "border-amber-400/25 bg-amber-400/[0.06] text-amber-300"
        : "border-red-400/25 bg-red-400/[0.06] text-red-300";

  const isAllZero = overall === 0 || (
    (!hasLabs || candidate.labsScore === 0) &&
    (!hasAssessment || candidate.assessmentScore === 0) &&
    (!hasVitarka || candidate.vitarkaScore === 0)
  );

  const candidateName = candidate.name || "the candidate";
  const sectionSummaries: string[] = [];
  if (hasLabs) {
    sectionSummaries.push(
      `${totalTestsPassed}/${totalTestsCount} tests passed across ${totalLabsCount} engineering lab(s)`
    );
  }
  if (hasAssessment) {
    sectionSummaries.push(
      `${totalQuestionsCorrect}/${totalQuestionsCount} questions correct (${assessmentAccuracyPct}%) in knowledge assessment`
    );
  }
  if (hasVitarka) {
    sectionSummaries.push(`${vitarka10}/10 in Vitarka AI discussion`);
  }

  let introPhrase = `Overall evaluation for ${candidateName} reflects overall performance`;
  if (hasVitarka && (hasLabs || hasAssessment)) {
    introPhrase = `Overall evaluation for ${candidateName} synthesizes Vitarka AI interview results with practical performance`;
  } else if (hasLabs && hasAssessment) {
    introPhrase = `Overall evaluation for ${candidateName} reflects performance across engineering labs and knowledge assessment`;
  } else if (hasLabs) {
    introPhrase = `Overall evaluation for ${candidateName} reflects practical engineering labs performance`;
  } else if (hasAssessment) {
    introPhrase = `Overall evaluation for ${candidateName} reflects knowledge assessment performance`;
  } else if (hasVitarka) {
    introPhrase = `Overall evaluation for ${candidateName} reflects Vitarka AI interview performance`;
  }

  const detailsText = sectionSummaries.length > 0 ? `: ${sectionSummaries.join("; ")}.` : ".";
  const defaultOverallText = `${introPhrase}${detailsText} Aggregate score: ${overall10}/10. Recommendation: ${verdict}.`;

  const zeroDetails: string[] = [];
  if (hasLabs) zeroDetails.push("0 passing tests and no submitted code");
  if (hasAssessment) zeroDetails.push("no correct assessment answers");
  if (hasVitarka) zeroDetails.push("no interview responses");
  const zeroDetailsText = zeroDetails.length > 0 ? zeroDetails.join(", ") : "no completed activity";

  let rawOverallText = isAllZero
    ? `Overall evaluation for ${candidateName} recorded ${zeroDetailsText}. Aggregate score: 0/10. Recommendation: Reject.`
    : (!isOverallReportStale && overallReport?.executive_summary
        ? overallReport.executive_summary
        : defaultOverallText);
  if (rawOverallText && totalTestsCount > 0) {
    if (totalTestsCount !== 5) rawOverallText = rawOverallText.replace(/\b5\/5\b/g, `${totalTestsPassed}/${totalTestsCount}`);
    if (totalTestsCount !== 6) rawOverallText = rawOverallText.replace(/\b6\/6\b/g, `${totalTestsPassed}/${totalTestsCount}`);
    rawOverallText = rawOverallText.replace(/\b\d+\/\d+\s+tests\s+passed\b/g, `${totalTestsPassed}/${totalTestsCount} tests passed`);
  }
  const overallText = stripUuids(rawOverallText, candidateName);
  const hasAiReport = Boolean(
    (overallReport?.strengths && overallReport.strengths.length > 0) ||
    (vitarkaReport?.strengths && vitarkaReport.strengths.length > 0) ||
    (overallReport?.risks && overallReport.risks.length > 0) ||
    (vitarkaReport?.risks && vitarkaReport.risks.length > 0)
  );

  let overallStrengths = isAllZero || !hasAiReport
    ? []
    : (overallReport?.strengths && overallReport.strengths.length > 0 && !isOverallReportStale)
      ? overallReport.strengths.map((s: string) => stripUuids(s, candidate.name)).filter((s: string) => !s.includes("Submitted verified code across") || candidate.labsScore > 0)
      : (vitarkaReport?.strengths && vitarkaReport.strengths.length > 0)
        ? vitarkaReport.strengths.map((s: string) => stripUuids(s, candidate.name))
        : [];

  if (hasLabs) {
    if (totalTestsCount > 0 && totalTestsPassed === totalTestsCount) {
      const sTxt = `Passed all ${totalTestsCount} automated tests across engineering labs.`;
      if (!overallStrengths.includes(sTxt)) overallStrengths = [sTxt, ...overallStrengths];
    } else if (totalTestsPassed > 0) {
      const sTxt = `Passed ${totalTestsPassed}/${totalTestsCount} automated tests across engineering labs.`;
      if (!overallStrengths.includes(sTxt)) overallStrengths = [sTxt, ...overallStrengths];
    }
  }

  if (hasAssessment && totalQuestionsCorrect > 0 && !overallStrengths.some((s: string) => s.includes("knowledge assessment"))) {
    overallStrengths.push(`Answered ${totalQuestionsCorrect}/${totalQuestionsCount} knowledge assessment questions correctly (${assessmentAccuracyPct}%).`);
  }

  if (!hasAssessment) {
    overallStrengths = overallStrengths.filter((s: string) => !s.toLowerCase().includes("assessment") && !s.toLowerCase().includes("knowledge"));
  }
  if (!hasVitarka) {
    overallStrengths = overallStrengths.filter((s: string) => !s.toLowerCase().includes("vitarka") && !s.toLowerCase().includes("interview") && !s.toLowerCase().includes("discussion"));
  }
  if (!hasLabs) {
    overallStrengths = overallStrengths.filter((s: string) => !s.toLowerCase().includes("lab") && !s.toLowerCase().includes("automated test"));
  }

  const rawRisks = isAllZero || !hasAiReport
    ? []
    : (overallReport?.risks && overallReport.risks.length > 0 && !isOverallReportStale)
      ? overallReport.risks.map((s: string) => stripUuids(s, candidate.name))
      : (vitarkaReport?.risks && vitarkaReport.risks.length > 0)
        ? vitarkaReport.risks.map((s: string) => stripUuids(s, candidate.name))
        : [];

  const overallExplore = rawRisks.filter((r: string) => {
    const lower = r.toLowerCase();
    if (totalTestsPassed === totalTestsCount && (lower.includes("failed") || lower.includes("test case(s)"))) return false;
    if (totalQuestionsCorrect > 0 && lower.includes("0.0%")) return false;
    if (candidate.labsScore > 0 && (lower.includes("no lab tests were executed") || lower.includes("no verified implementation code"))) return false;
    if (!hasAssessment && (lower.includes("assessment") || lower.includes("knowledge"))) return false;
    if (!hasVitarka && (lower.includes("vitarka") || lower.includes("interview") || lower.includes("discussion"))) return false;
    if (!hasLabs && (lower.includes("lab") || lower.includes("code"))) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <SectionHeading>Evaluation summary</SectionHeading>

      {/* Row 1: Engineering Labs and Assessment in one row */}
      {(hasLabs || hasAssessment) && (
        <div className={`grid grid-cols-1 gap-4 ${hasLabs && hasAssessment ? "md:grid-cols-2" : "grid-cols-1"}`}>
          {hasLabs && (
            <SectionPerformanceBlock
              title="Engineering Labs"
              headline={labHeadline}
              badge={labPassRate > 0 ? `${labPassRate}% Pass Rate` : undefined}
              tone="emerald"
              stats={[
                { label: "Tests Passed", value: `${totalTestsPassed}/${totalTestsCount}`, sub: "test cases" },
                { label: "Pass Rate", value: `${labPassRate}%`, sub: `${totalTestsPassed} passed` },
                { label: "Labs Attempted", value: `${labsAttemptedCount}/${totalLabsCount}`, sub: "completed" },
                { label: "Time Taken", value: formatDurationSecs(totalLabSeconds), sub: "solving duration" },
              ]}
            />
          )}
          {hasAssessment && (
            <SectionPerformanceBlock
              title="Assessment"
              headline={assessmentHeadline}
              badge={assessmentAccuracyPct > 0 ? `${assessmentAccuracyPct}% Accuracy` : undefined}
              tone="blue"
              stats={[
                { label: "Questions Correct", value: `${totalQuestionsCorrect}/${totalQuestionsCount}`, sub: "verified answers" },
                { label: "Accuracy", value: `${assessmentAccuracyPct}%`, sub: "correct rate" },
                { label: "Attempted", value: `${totalQuestionsAttempted}/${totalQuestionsCount}`, sub: "questions answered" },
                { label: "Completion", value: `${totalQuestionsCount > 0 ? Math.round((totalQuestionsAttempted / totalQuestionsCount) * 100) : 0}%`, sub: "completed" },
              ]}
            />
          )}
        </div>
      )}

      {/* Row 2: Below that, Vitarka AI */}
      {hasVitarka && (
        <div className="grid grid-cols-1 gap-4">
          <SummaryBlock
            title="Vitarka AI"
            score={vitarka10}
            maxScore={10}
            summary={vitarkaReport?.executive_summary || (candidate.vitarkaScore === 0 ? "Candidate did not provide responses during the Vitarka AI technical discussion." : data.blocks[data.blocks.length - 1]?.summary || "AI technical discussion evaluation.")}
            strengths={vitarkaReport ? (vitarkaReport.strengths || []) : (candidate.vitarkaScore === 0 ? [] : data.blocks[data.blocks.length - 1]?.strengths || [])}
            explore={vitarkaReport?.risks?.[0] || data.blocks[data.blocks.length - 1]?.explore || "Detailed technical probing"}
            fullWidth
          />
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-widest text-neutral-400">Overall recommendation</div>
          <div className="flex items-center gap-3">
            <div className="text-[13px] font-medium text-neutral-900 dark:text-white">
              {overall10}
              <span className="text-neutral-500">/10</span>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-widest ${verdictTone}`}>
              {verdict}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-200">{overallText}</p>
        {hasAiReport && (overallStrengths.length > 0 || overallExplore.length > 0) && (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Strengths</div>
              {overallStrengths.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {overallStrengths.map((s: string) => (
                    <li key={s} className="flex gap-2 text-[12px] text-neutral-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[12px] text-neutral-400">None identified</p>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Areas to explore</div>
              {overallExplore.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {overallExplore.map((s: string) => (
                    <li key={s} className="flex gap-2 text-[12px] text-neutral-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[12px] text-neutral-400">None identified</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodingAnswerViewer({ q, userId, evaluationId }: { q: any, userId: string, evaluationId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchCode() {
       try {
          const { fetchFileTree, fetchFile } = await import("@/services/workspaceService");
          const treeRes = await fetchFileTree(userId, "knowledge", q.id, undefined, undefined, evaluationId);
          let mainFile: any = null;
          const findFile = (node: any) => {
             if (node.type === "file" && node.name !== "README.md" && !node.name.startsWith(".")) {
                 if (!mainFile) mainFile = node;
             }
             if (node.children) node.children.forEach(findFile);
          };
          findFile(treeRes.tree);
          if (mainFile) {
             const content = await fetchFile(userId, "knowledge", q.id, mainFile.path, evaluationId);
             if (mounted) setCode(content);
          } else {
             if (mounted) setCode(q.candidateAnswer || "No code submitted.");
          }
       } catch (err) {
          if (mounted) setCode(q.candidateAnswer || "Not answered");
       } finally {
          if (mounted) setLoading(false);
       }
    }
    fetchCode();
    return () => { mounted = false; };
  }, [userId, q.id, evaluationId]);

  if (loading) return <span className="text-neutral-500 italic">Loading code...</span>;
  return <pre className="whitespace-pre-wrap font-mono text-[11px] overflow-x-auto">{code}</pre>;
}

export function LabsPane({
  ev,
  candidate,
  labsReport,
  onOpen,
}: {
  ev: any;
  candidate: any;
  labsReport?: any;
  onOpen: (data: { section: any, labSub: any, candidate: any, labsReport?: any }) => void;
}) {

  const labSections = ev?.sections?.filter((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS") || [];
  const allLabs = labSections.flatMap((s: any) => (s.labs && s.labs.length > 0 ? s.labs : (s.questions || [])));
  const labsMax = allLabs.reduce((sum: number, l: any) => sum + (Number(l.marks) || 0), 0) || 80;

  const totalLabTasks = allLabs.reduce((sum: number, l: any) => {
    const calc = getLabCalculatedStats(l);
    if (calc.selectedTasks.length > 0) return sum + calc.selectedTasks.length;
    const sCount = (l.selected_task_ids && Array.isArray(l.selected_task_ids) && l.selected_task_ids.length > 0)
      ? countDistinctSelectedTasks(l.selected_task_ids)
      : (l.selected_task_id ? 1 : null);
    if (sCount != null) return sum + sCount;
    if (Array.isArray(l.tasks) && l.tasks.length > 0) return sum + l.tasks.length;
    if (typeof l.tasks === "number" && l.tasks > 0) return sum + l.tasks;
    return sum;
  }, 0);
  const totalLabTasksCount = totalLabTasks > 0 ? totalLabTasks : (allLabs.length > 0 ? allLabs.length * 3 : 3);

  const rawLabSubs: any[] = candidate.rawSubmission?.lab_submissions || [];

  let actualTotalPassedTests = 0;
  let actualTotalTestsCount = 0;

  allLabs.forEach((lab: any, idx: number) => {
    const targetId = String(lab.id ?? lab.lab_id ?? lab.question_id ?? "");
    const sub = rawLabSubs.find((s: any) => {
      const sLabId = String(s.lab_question?.id ?? s.lab_question ?? s.lab_id ?? "");
      return sLabId === targetId || (sLabId && targetId && (sLabId.includes(targetId) || targetId.includes(sLabId)));
    }) || rawLabSubs[idx] || (rawLabSubs.length === 1 ? rawLabSubs[0] : undefined);
    const stats = computeLabTestStats(lab, sub);
    actualTotalTestsCount += stats.tasksTotal;
    actualTotalPassedTests += stats.tasksCompleted;
  });

  if (actualTotalTestsCount === 0) {
    actualTotalTestsCount = totalLabTasksCount;
  } else if (totalLabTasks > 0 && actualTotalTestsCount !== totalLabTasks) {
    actualTotalTestsCount = totalLabTasks;
  }

  if (candidate.labsScore > 0 && labsMax > 0 && candidate.labsScore >= labsMax && actualTotalTestsCount > 0) {
    actualTotalPassedTests = actualTotalTestsCount;
  }
  if (actualTotalTestsCount > 0 && actualTotalPassedTests > actualTotalTestsCount) {
    actualTotalPassedTests = actualTotalTestsCount;
  }

  const displayTestsPassed = actualTotalTestsCount > 0 ? actualTotalPassedTests : (labsReport?.tests_passed ?? (candidate.labsScore > 0 ? 1 : 0));
  const displayTestsTotal = actualTotalTestsCount > 0 ? actualTotalTestsCount : (labsReport?.tests_total || totalLabTasksCount);

  const strengthText = (() => {
    const first = labsReport?.strengths?.[0];
    if (!first || /passed\s+\d+(\/\d+)?/i.test(first) || /\d+\/\d+\s+lab\s+tests/i.test(first)) {
      if (displayTestsTotal > 0 && displayTestsPassed === displayTestsTotal) {
        return `Passed all ${displayTestsTotal} lab tests.`;
      }
      return `Passed ${displayTestsPassed}/${displayTestsTotal} lab tests.`;
    }
    return first;
  })();

  const totalLabSeconds = allLabs.reduce((sum: number, lab: any, i: number) => {
    const targetId = String(lab.id ?? lab.lab_id ?? lab.question_id ?? "");
    const sub = rawLabSubs.find((s: any) => {
      const sLabId = String(s.lab_question?.id ?? s.lab_question ?? s.lab_id ?? "");
      return sLabId === targetId || (sLabId && targetId && (sLabId.includes(targetId) || targetId.includes(sLabId)));
    }) || rawLabSubs.find(
      (s: any) => s.lab_question === lab.id || s.lab_question === lab.lab_id
    ) || rawLabSubs[i];
    return sum + parseLabDurationSecs(sub);
  }, 0);

  const displayTotalTime = (labsReport?.total_time_seconds != null && labsReport.total_time_seconds > 0)
    ? formatDurationSecs(labsReport.total_time_seconds)
    : formatDurationSecs(totalLabSeconds);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading>Engineering Labs</SectionHeading>
        <span className="text-[12px] font-medium text-emerald-400">
          Section Score: {Number.isFinite(Number(candidate.labsScore)) ? Number(Number(candidate.labsScore).toFixed(1)) : candidate.labsScore}/{labsMax}
        </span>
      </div>

      {labsReport && (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-4 text-neutral-300">
              <span>Tests Passed: <strong className="text-neutral-900 dark:text-white">
                {displayTestsPassed}/{displayTestsTotal}
              </strong></span>
              {displayTotalTime !== "0m 0s" && (
                <span>Time: <strong className="text-neutral-900 dark:text-white">{displayTotalTime}</strong></span>
              )}
            </div>
            {candidate.labsScore > 0 && (
              <span className="text-emerald-400 text-[11px]">✓ {strengthText}</span>
            )}
          </div>
          {(() => {
            if (!labsReport.risks || labsReport.risks.length === 0) return null;
            const filteredRisks = labsReport.risks
              .filter((r: string) => {
                if (candidate.labsScore > 0) {
                  const low = r.toLowerCase();
                  if (low.includes("no lab tests were executed") || low.includes("no verified implementation code")) {
                    return false;
                  }
                }
                return candidate.labsScore > 0 || (!r.toLowerCase().includes("sensitive") && !r.toLowerCase().includes("framework") && !r.toLowerCase().includes("performance"));
              })
              .filter(Boolean);
            if (filteredRisks.length === 0) return null;
            return (
              <div className="text-[11px] text-amber-400/90 border-t border-white/5 pt-2">
                Note: {filteredRisks.join(" · ")}
              </div>
            );
          })()}
        </div>
      )}

      {allLabs.map((lab: any, i: number) => {
        const targetId = String(lab.id ?? lab.lab_id ?? lab.question_id ?? "");
        const labSub = rawLabSubs.find((s: any) => {
          const sLabId = String(s.lab_question?.id ?? s.lab_question ?? s.lab_id ?? "");
          return sLabId === targetId || (sLabId && targetId && (sLabId.includes(targetId) || targetId.includes(sLabId)));
        }) || rawLabSubs[i] || (rawLabSubs.length === 1 ? rawLabSubs[0] : undefined);

        const stats = computeLabTestStats(lab, labSub);
        const marksEarned = stats.marksEarned;
        const maxMarks = stats.maxMarks;
        const scorePct = stats.scorePct;

        const sec = parseLabDurationSecs(labSub);
        const labTimeFormatted = labSub?.time_taken || formatDurationSecs(sec);
        const timeLimit = lab.duration_minutes ?? lab.duration ?? 0;

        return (
          <button
            key={lab.id || i}
            onClick={() => onOpen({ section: lab, labSub, candidate, labsReport })}
            className="group block w-full rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-[11px] text-neutral-400">
                  L{i + 1}
                </div>
                <div>
                  <div className="text-[15px] font-medium text-neutral-900 dark:text-white">{lab.title || lab.name || 'Engineering Lab'}</div>
                  <div className="mt-0.5 text-[12px] text-neutral-500">
                    {lab.domain || 'Backend'} · {labTimeFormatted} of {timeLimit}m
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-[24px] font-medium leading-none ${eciColor(scorePct)}`}>
                    {scorePct}
                    <span className="text-[12px] text-neutral-500">%</span>
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-400 font-mono">
                    {marksEarned}/{maxMarks} marks
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:text-white" />
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
              <div
                className={`h-full ${scorePct >= 70 ? "bg-emerald-400" : scorePct >= 55 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function AssessmentPane({ ev, candidate, knowledgeReport, timelineEvents }: { ev: any; candidate: any; knowledgeReport?: any; timelineEvents?: TimelineEvent[] }) {
  const assessmentSections = ev.sections.filter((s: any) => s.kind === "knowledge" || s.kind === "assessment");
  const [open, setOpen] = useState<string | null>(assessmentSections[0]?.name ?? null);

  // Pre-calculate live section question stats across all assessment sections
  let totalEvaluatedCorrect = 0;
  let totalEvaluatedQuestions = 0;
  let totalEvaluatedMarks = 0;
  let totalPossibleMarks = 0;

  assessmentSections.forEach((sub: any) => {
    const subId = sub.id || sub.section_id;
    const knSub = candidate.rawSubmission?.knowledge_submissions?.find(
      (s: any) => s.section === subId
    );
    (sub.questions || []).forEach((q: any) => {
      totalEvaluatedQuestions++;
      const qMarks = Number(q.marks || 1);
      totalPossibleMarks += qMarks;

      const answerRecord = knSub?.answers?.find((a: any) => a.question === q.id || a.question_id === q.id);
      let isCorr = answerRecord?.is_correct ?? false;
      if (!isCorr && answerRecord) {
        if (q.format === "Description" || q.format === "Coding") {
          // Keep as is
        } else {
          const optsArray = q.mcq_options || q.options || [];
          let selectedOpts = answerRecord.selected_option !== undefined ? answerRecord.selected_option : answerRecord.selected_options;
          if (selectedOpts !== undefined && selectedOpts !== null && selectedOpts !== "" && optsArray.length > 0) {
            if (!Array.isArray(selectedOpts)) selectedOpts = [selectedOpts];
            const selectedTexts = selectedOpts.map((optVal: any) => {
              if (typeof optVal === "number" && optsArray[optVal]) {
                return typeof optsArray[optVal] === "string" ? optsArray[optVal] : optsArray[optVal].text;
              }
              const foundOpt = optsArray.find((o: any) => o.id === optVal);
              return foundOpt ? foundOpt.text : String(optVal);
            });
            let correctTexts: string[] = [];
            if (typeof optsArray[0] === "string") {
              const correctOpts = Array.isArray(q.correct) ? q.correct : (q.correct !== undefined && q.correct !== null ? [q.correct] : []);
              correctTexts = correctOpts.map((idx: number) => optsArray[idx]).filter(Boolean);
            } else {
              const correctOptions = optsArray.filter((o: any) => o.is_correct);
              correctTexts = correctOptions.map((o: any) => o.text);
            }
            if (selectedTexts.length > 0 && correctTexts.length > 0) {
              const selectedSet = new Set(selectedTexts);
              const correctSet = new Set(correctTexts);
              isCorr = selectedSet.size === correctSet.size && [...selectedSet].every(x => correctSet.has(x));
            }
          }
        }
      }
      if (isCorr) {
        totalEvaluatedCorrect++;
        totalEvaluatedMarks += qMarks;
      }
    });
  });

  const correctCount = totalEvaluatedQuestions > 0 ? totalEvaluatedCorrect : (knowledgeReport?.correct_count || 0);
  const questionCount = totalEvaluatedQuestions > 0 ? totalEvaluatedQuestions : (knowledgeReport?.question_count || 0);
  const totalMarks = totalPossibleMarks > 0 ? totalEvaluatedMarks : (knowledgeReport?.total_score ?? 0);
  const maxMarks = totalPossibleMarks > 0 ? totalPossibleMarks : (knowledgeReport?.max_score ?? 0);
  const scorePercent = questionCount > 0
    ? Math.round((correctCount / questionCount) * 100)
    : (knowledgeReport?.score_percent != null ? Math.round(knowledgeReport.score_percent) : 0);

  const displayRisks = (knowledgeReport?.risks || []).filter((r: string) => {
    if (correctCount > 0 && (r.toLowerCase().includes("0 knowledge questions") || r.toLowerCase().includes("below the expected threshold"))) {
      return false;
    }
    return true;
  });

  const displayStrengths = (knowledgeReport?.strengths && knowledgeReport.strengths.length > 0)
    ? knowledgeReport.strengths
    : (correctCount > 0 ? [`Answered ${correctCount}/${questionCount} questions correctly.`] : []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading>Knowledge Assessment</SectionHeading>
        {questionCount > 0 && (
          <div className="flex items-center gap-4 text-[12px]">
            <span className="text-neutral-500">Correct Questions: <strong className="text-neutral-900">{correctCount}/{questionCount}</strong></span>
            {maxMarks > 0 && (
              <span className="text-neutral-500">Marks: <strong className="text-neutral-900">{totalMarks}/{maxMarks}</strong></span>
            )}
            <span className="font-medium text-emerald-600">
              Section Score: {scorePercent}%
            </span>
          </div>
        )}
      </div>

      {(displayStrengths.length > 0 || displayRisks.length > 0) && (
        <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 space-y-3">
          {displayStrengths.length > 0 && (
            <span className="text-emerald-600 text-[12px]">💡 {displayStrengths[0]}</span>
          )}
          {displayRisks.length > 0 && (
            <div className="text-[12px] text-amber-600/90 border-t border-black/5 pt-2 mt-2">
              Note: {displayRisks.join(" • ")}
            </div>
          )}
        </div>
      )}

      {assessmentSections.map((sub: any) => {
        const isOpen = open === sub.name || open === sub.title;
        const subId = sub.id || sub.section_id;
        const knSub = candidate.rawSubmission?.knowledge_submissions?.find(
          (s: any) => s.section === subId
        );
        
        let score = 0;
        let total = sub.questions?.length || 0;
        
        const mappedQuestions = (sub.questions || []).map((q: any) => {
          const answerRecord = knSub?.answers?.find((a: any) => a.question === q.id || a.question_id === q.id);
          let isCorrect = answerRecord?.is_correct ?? false;
          
          let candidateAnswerText = "Not answered";
          let correctAnswerText = "Unknown";
          
          if (q.format === "Description" || q.format === "Coding") {
             candidateAnswerText = answerRecord?.selected_option || answerRecord?.selected_options?.[0] || "Not answered";
             
             let solText = "";
             if (q.solutions && q.solutions.length > 0) {
               solText = q.solutions.map((s: any) => s.code || s.title || "").filter(Boolean).join("\n---\n");
             }
             correctAnswerText = solText || q.correct_answer || q.solution || "Manual review required";
             if (isCorrect) score++;
          } else {
             const optsArray = q.mcq_options || q.options || [];
             
             // Extract text for selected options
             let selectedOpts = answerRecord?.selected_option !== undefined ? answerRecord.selected_option : answerRecord?.selected_options;
             let selectedTexts: string[] = [];
             if (selectedOpts !== undefined && selectedOpts !== null && selectedOpts !== "") {
               if (!Array.isArray(selectedOpts)) selectedOpts = [selectedOpts];
               
               if (selectedOpts.length) {
                 selectedTexts = selectedOpts.map((optVal: any) => {
                   if (typeof optVal === 'number') {
                     if (optsArray[optVal]) {
                       return typeof optsArray[optVal] === 'string' ? optsArray[optVal] : optsArray[optVal].text;
                     }
                     return String(optVal);
                   }
                   const foundOpt = optsArray.find((o: any) => o.id === optVal);
                   return foundOpt ? foundOpt.text : String(optVal);
                 });
                 candidateAnswerText = selectedTexts.join(", ");
               }
             }
             
             // Extract text for correct options
             let correctTexts: string[] = [];
             if (optsArray.length > 0) {
                 if (typeof optsArray[0] === 'string') {
                    const correctOpts = Array.isArray(q.correct) ? q.correct : (q.correct !== undefined && q.correct !== null ? [q.correct] : []);
                    if (correctOpts.length) {
                       correctTexts = correctOpts.map((idx: number) => optsArray[idx]);
                    }
                 } else {
                     const correctOptions = optsArray.filter((o: any) => o.is_correct);
                     if (correctOptions.length) {
                       correctTexts = correctOptions.map((o: any) => o.text);
                     }
                 }
                 if (correctTexts.length) {
                   correctAnswerText = correctTexts.join(", ");
                 }
             }
             
             if (selectedTexts.length > 0 && correctTexts.length > 0) {
                 const selectedSet = new Set(selectedTexts);
                 const correctSet = new Set(correctTexts);
                 isCorrect = selectedSet.size === correctSet.size && [...selectedSet].every(x => correctSet.has(x));
             } else if (answerRecord) {
                 isCorrect = false;
             }
             
             if (isCorrect) score++;
          }
          
          let secondsSpent = Number(answerRecord?.seconds_spent) || Number(answerRecord?.seconds) || 0;
          if (secondsSpent === 0) {
            const knEvent = (timelineEvents || []).find(e => (e.label === "Knowledge Assessment submitted" || e.label === "ASSESSMENT_SUBMITTED") && e.occurred_at);
            const prevEvent = (timelineEvents || []).find(e => (e.label === "Engineering Labs submitted" || e.label === "Candidate started evaluation" || e.label === "Evaluation started" || e.label === "STARTED" || e.label === "LABS_SUBMITTED") && e.occurred_at);
            if (knEvent?.occurred_at && prevEvent?.occurred_at) {
              const diffSecs = Math.max(1, Math.round((new Date(knEvent.occurred_at).getTime() - new Date(prevEvent.occurred_at).getTime()) / 1000));
              const numQ = Math.max(1, sub.questions?.length || 1);
              secondsSpent = Math.max(30, Math.round(diffSecs / numQ));
            } else if (knSub?.created_at && candidate.rawSubmission?.created_at) {
              const diffSecs = Math.max(1, Math.round((new Date(knSub.created_at).getTime() - new Date(candidate.rawSubmission.created_at).getTime()) / 1000));
              const numQ = Math.max(1, sub.questions?.length || 1);
              secondsSpent = Math.max(30, Math.round(diffSecs / numQ));
            } else {
              secondsSpent = 35;
            }
          }

          return {
             ...q,
             correct: isCorrect,
             candidateAnswer: candidateAnswerText,
             correctAnswer: correctAnswerText,
             seconds: secondsSpent
          };
        });

        const pct = total > 0 ? Math.round((score / total) * 100) : 0;

        return (
          <div
            key={subId}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none"
          >
            <button
              onClick={() => setOpen(isOpen ? null : (sub.name || sub.title))}
              className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[0.03]"
            >
              <div className="flex-1">
                <div className="text-[15px] font-medium text-neutral-900 dark:text-white">{sub.title || sub.name}</div>
                <div className="mt-0.5 text-[12px] text-neutral-500">
                  {score}/{total} correct · {pct}%
                </div>
              </div>
              <div className="hidden w-40 sm:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                  <div
                    className={`h-full ${pct >= 70 ? "bg-emerald-400" : pct >= 55 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-neutral-500 transition ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="divide-y divide-white/5 border-t border-white/5">
                {mappedQuestions.map((q: any, i: number) => (
                  <div key={i} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] uppercase tracking-widest text-neutral-500">
                          Question {i + 1} · {q.difficulty || 'Medium'}
                        </div>
                        <div className="mt-1 text-[14px] text-neutral-900 dark:text-white">{q.text || q.q}</div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${q.correct ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}
                      >
                        {q.correct ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XC className="h-3 w-3" />
                        )}{" "}
                        {q.correct ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div
                        className={`rounded-lg border p-3 text-[13px] ${q.correct ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-red-400/20 bg-red-400/[0.04]"}`}
                      >
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                          Candidate answer
                        </div>
                        <div className="mt-1 text-neutral-900 dark:text-white">
                          {q.format === "Coding" ? (
                            <CodingAnswerViewer q={q} userId={candidate.rawSubmission?.user?.id || candidate.id} evaluationId={ev.id} />
                          ) : (
                            q.candidateAnswer
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[13px]">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                          Correct answer
                        </div>
                        <div className="mt-1 text-neutral-900 dark:text-white">
                          {q.format === "Coding" ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs">{q.correctAnswer}</pre>
                          ) : (
                            q.correctAnswer
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] leading-relaxed text-neutral-400">
                      <span className="text-neutral-500">Explanation — </span>
                      {q.explanation}
                    </p>
                    <div className="mt-2 text-[11px] text-neutral-500">
                      <Clock className="mr-1 inline h-3 w-3" /> {q.seconds >= 60 ? `${Math.floor(q.seconds / 60)}m ${q.seconds % 60}s` : `${q.seconds}s`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SystemDesignStudioViewer({
  design,
  onOpenStudio,
  isExpanded = false,
}: {
  design: any;
  onOpenStudio?: () => void;
  isExpanded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"canvas" | "sequence" | "schema" | "api" | "notes">("canvas");
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [copiedCode, setCopiedCode] = useState(false);

  const canvasNodes = Array.isArray(design?.nodes)
    ? design.nodes
    : Array.isArray(design?.canvas?.nodes)
    ? design.canvas.nodes
    : [];

  const canvasEdges = Array.isArray(design?.edges)
    ? design.edges
    : Array.isArray(design?.canvas?.edges)
    ? design.canvas.edges
    : [];

  const normalizedNodes: SDNode[] = useMemo(() => {
    return canvasNodes.map((n: any, idx: number) => ({
      id: String(n.id || `node-${idx}`),
      kind: String(n.kind || n.type || "component"),
      label: String(n.label || n.name || `Component ${idx + 1}`),
      icon: String(n.icon || (n.type ? n.type.toLowerCase() : "server")),
      tag: n.tag || n.type || undefined,
      x: typeof n.x === "number" && !isNaN(n.x) ? n.x : 60 + (idx % 4) * 200,
      y: typeof n.y === "number" && !isNaN(n.y) ? n.y : 80 + Math.floor(idx / 4) * 120,
    }));
  }, [canvasNodes]);

  const normalizedEdges: SDEdge[] = useMemo(() => {
    return canvasEdges.map((e: any, idx: number) => ({
      id: String(e.id || `edge-${idx}`),
      from: String(e.from || e.source || ""),
      to: String(e.to || e.target || ""),
      label: e.label || undefined,
    }));
  }, [canvasEdges]);

  const sequenceCode =
    typeof design?.seq === "string" && design.seq.trim()
      ? design.seq
      : typeof design?.sequence === "string" && design.sequence.trim()
      ? design.sequence
      : (design?.sequence?.code || "");

  const schemaCode =
    typeof design?.schema === "string" && design.schema.trim()
      ? design.schema
      : (design?.schema?.code || "");

  const parsedTablesCount = useMemo(() => {
    if (!schemaCode.trim()) return 0;
    try {
      const parsed = parseDbml(schemaCode);
      return parsed.tables?.length || 0;
    } catch {
      return 0;
    }
  }, [schemaCode]);

  const rawApis = Array.isArray(design?.apis)
    ? design.apis
    : Array.isArray(design?.api)
    ? design.api
    : [];

  const normalizedApis: ApiEndpoint[] = useMemo(() => {
    return rawApis.map((ep: any, idx: number) => ({
      id: String(ep.id || `api-${idx}`),
      method: String(ep.method || "GET").toUpperCase(),
      path: String(ep.path || "/api"),
      summary: ep.summary || ep.description || "",
      request: ep.request || ep.req || "",
      response: ep.response || ep.res || "",
      status: ep.status || (String(ep.method || "").toUpperCase() === "POST" ? "201 Created" : "200 OK"),
    }));
  }, [rawApis]);

  const candidateNotes =
    typeof design?.notes === "string" && design.notes.trim()
      ? design.notes
      : typeof design?.notes === "object" && design?.notes
      ? Object.entries(design.notes)
          .filter(([_, v]) => typeof v === "string" && (v as string).trim())
          .map(([k, v]) => `### ${k.toUpperCase()}\n${v}`)
          .join("\n\n")
      : "";

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none overflow-hidden ${isExpanded ? "flex flex-col h-[740px]" : ""}`}>
      {/* Studio Header & Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 dark:border-white/10 px-4 py-2 bg-neutral-50/80 dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab("canvas")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              activeTab === "canvas"
                ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Network className="h-3.5 w-3.5 text-blue-500" />
            <span>HLD Architecture</span>
            <span className="rounded-full bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
              {normalizedNodes.length} nodes
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sequence")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              activeTab === "sequence"
                ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-purple-500" />
            <span>Sequence Diagram</span>
            <span className="rounded-full bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
              Mermaid
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schema")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              activeTab === "schema"
                ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            <span>DB Schema</span>
            <span className="rounded-full bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
              DBML · {parsedTablesCount} tables
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("api")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              activeTab === "api"
                ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <FileCode className="h-3.5 w-3.5 text-amber-500" />
            <span>REST APIs</span>
            <span className="rounded-full bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
              {normalizedApis.length} endpoints
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              activeTab === "notes"
                ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-neutral-500" />
            <span>Architecture Notes</span>
            <span className="rounded-full bg-neutral-200 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
              Markdown
            </span>
          </button>
        </div>

        {/* Studio Actions */}
        <div className="flex items-center gap-2 py-1">
          {(activeTab === "sequence" || activeTab === "schema") && (
            <div className="inline-flex rounded-lg border border-neutral-200 dark:border-white/10 p-0.5 bg-neutral-100 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                  viewMode === "visual"
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                Visual Diagram
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                  viewMode === "code"
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                Source Code
              </button>
            </div>
          )}

          {(activeTab === "sequence" || activeTab === "schema") && (
            <button
              type="button"
              onClick={() => handleCopy(activeTab === "sequence" ? sequenceCode : schemaCode)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10 transition"
            >
              {copiedCode ? <Check className="h-3 w-3 text-emerald-500" /> : <CopyIcon className="h-3 w-3" />}
              <span>{copiedCode ? "Copied" : "Copy Source"}</span>
            </button>
          )}

          {onOpenStudio && !isExpanded && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              title="Expand Studio to Full Screen"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Expand</span>
            </button>
          )}
        </div>
      </div>

      {/* Studio Body */}
      <div className={`relative ${isExpanded ? "flex-1 min-h-0" : "min-h-[560px]"}`}>
        {/* Tab 1: HLD Architecture */}
        {activeTab === "canvas" && (
          <div className={`${isExpanded ? "h-full" : "h-[560px]"} w-full flex flex-col`}>
            <div className="flex-1 w-full relative overflow-hidden bg-background">
              <DiagramBoard
                nodes={normalizedNodes}
                edges={normalizedEdges}
                readOnly={true}
                emptyHint={
                  <div>
                    <Network className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No architecture components placed</p>
                    <p className="mt-1 text-xs text-muted-foreground">The candidate did not place components on the canvas.</p>
                  </div>
                }
              />
            </div>
            {normalizedNodes.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-neutral-900/40 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Architectural Topology Components ({normalizedNodes.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {normalizedNodes.map((node, i) => (
                    <div
                      key={node.id || i}
                      className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800/80 px-2.5 py-1 text-[11px]"
                    >
                      <span className="text-neutral-400 font-mono">#{i + 1}</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{node.label}</span>
                      {node.tag && (
                        <span className="rounded bg-neutral-100 dark:bg-white/10 px-1 py-0.2 text-[9px] uppercase tracking-wider text-neutral-500">
                          {node.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sequence Diagrams */}
        {activeTab === "sequence" && (
          <div className={`${isExpanded ? "h-full" : "h-[560px]"} w-full flex flex-col`}>
            {!sequenceCode.trim() ? (
              <div className="grid h-full place-items-center p-12 text-center text-neutral-500">
                <div>
                  <Layers className="h-8 w-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                  <p className="text-[14px] font-medium text-neutral-700 dark:text-neutral-300">No sequence diagrams provided</p>
                  <p className="text-[12px] mt-1 text-neutral-400">The candidate did not submit any Mermaid sequence flow diagrams.</p>
                </div>
              </div>
            ) : viewMode === "visual" ? (
              <div className="flex-1 w-full overflow-auto bg-background p-6">
                <MermaidPreview code={sequenceCode} />
              </div>
            ) : (
              <div className="flex-1 w-full overflow-auto bg-neutral-900 p-4 font-mono text-[12px] text-neutral-200">
                <pre className="whitespace-pre leading-relaxed">
                  <code>{sequenceCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Database Schema (DBML) */}
        {activeTab === "schema" && (
          <div className={`${isExpanded ? "h-full" : "h-[560px]"} w-full flex flex-col`}>
            {!schemaCode.trim() ? (
              <div className="grid h-full place-items-center p-12 text-center text-neutral-500">
                <div>
                  <Database className="h-8 w-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                  <p className="text-[14px] font-medium text-neutral-700 dark:text-neutral-300">No database schema defined</p>
                  <p className="text-[12px] mt-1 text-neutral-400">The candidate did not submit a DBML entity-relationship schema.</p>
                </div>
              </div>
            ) : viewMode === "visual" ? (
              <div className="flex-1 w-full relative overflow-hidden bg-background">
                <ErdBoard src={schemaCode} />
              </div>
            ) : (
              <div className="flex-1 w-full overflow-auto bg-neutral-900 p-4 font-mono text-[12px] text-neutral-200">
                <pre className="whitespace-pre leading-relaxed">
                  <code>{schemaCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: REST API Contracts */}
        {activeTab === "api" && (
          <div className={`${isExpanded ? "h-full" : "h-[560px]"} w-full overflow-y-auto p-4 bg-background`}>
            {normalizedApis.length === 0 ? (
              <div className="grid h-full place-items-center p-12 text-center text-neutral-500">
                <div>
                  <FileCode className="h-8 w-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                  <p className="text-[14px] font-medium text-neutral-700 dark:text-neutral-300">No REST API contracts defined</p>
                  <p className="text-[12px] mt-1 text-neutral-400">The candidate did not specify any HTTP API endpoints or request/response payloads.</p>
                </div>
              </div>
            ) : (
              <ApiDocs apis={normalizedApis} />
            )}
          </div>
        )}

        {/* Tab 5: Architecture Notes */}
        {activeTab === "notes" && (
          <div className={`${isExpanded ? "h-full" : "h-[560px]"} w-full overflow-y-auto p-6 bg-background`}>
            {!candidateNotes.trim() ? (
              <div className="grid h-full place-items-center p-12 text-center text-neutral-500">
                <div>
                  <FileText className="h-8 w-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                  <p className="text-[14px] font-medium text-neutral-700 dark:text-neutral-300">No architecture notes written</p>
                  <p className="text-[12px] mt-1 text-neutral-400">The candidate did not document architectural trade-offs or rationale.</p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto prose dark:prose-invert text-[13px] leading-relaxed">
                <MarkdownPreview src={candidateNotes} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SystemDesignReportPane({
  ev,
  candidate,
  sdMaxScore = 30,
  onOpenStudio,
}: {
  ev: any;
  candidate: any;
  sdMaxScore?: number;
  onOpenStudio?: (data: { challenge: any; userSub: any; candidate: any; sdMaxScore: number }) => void;
}) {
  const sdSections = ev?.sections?.filter(
    (s: any) => s.kind === "system_design" || s.type === "SYSTEM_DESIGN"
  ) || [];
  const activeSection = sdSections[0];
  const challenge =
    activeSection?.challenges?.[0] ||
    activeSection?.questions?.[0] ||
    (candidate?.rawSubmission?.system_design_submissions?.[0]?.system_design_question) ||
    {
      title: "Distributed System Design Challenge",
      description: "Candidate architecture submission for distributed system challenge.",
      constraints: [
        "High availability and fault tolerance guarantees",
        "Sub-100ms response latency requirements",
        "Horizontal scaling across multiple availability zones",
      ],
      tasks: [
        { title: "HLD Architecture Canvas", marks: 10 },
        { title: "Sequence Diagrams", marks: 8 },
        { title: "Database Schema (DBML)", marks: 6 },
        { title: "REST API Contracts", marks: 6 },
      ],
    };

  const rawSubmissions: any[] = candidate?.rawSubmission?.system_design_submissions || [];
  const userSub = rawSubmissions[0] || candidate?.rawSubmission?.system_design_submission || null;
  const design = userSub?.design || {};

  const canvasNodes = Array.isArray(design.nodes)
    ? design.nodes
    : Array.isArray(design.canvas?.nodes)
    ? design.canvas.nodes
    : [];

  const sequenceCode =
    typeof design.seq === "string" && design.seq.trim()
      ? design.seq
      : typeof design.sequence === "string" && design.sequence.trim()
      ? design.sequence
      : (design.sequence?.code || "");

  const schemaCode =
    typeof design.schema === "string" && design.schema.trim()
      ? design.schema
      : (design.schema?.code || "");

  const parsedTablesCount = useMemo(() => {
    if (!schemaCode.trim()) return 0;
    try {
      return parseDbml(schemaCode).tables?.length || 0;
    } catch {
      return 0;
    }
  }, [schemaCode]);

  const rawApis = Array.isArray(design.apis)
    ? design.apis
    : Array.isArray(design.api)
    ? design.api
    : [];

  const candidateNotes =
    typeof design.notes === "string" && design.notes.trim()
      ? design.notes
      : typeof design.notes === "object" && design.notes
      ? Object.entries(design.notes)
          .filter(([_, v]) => typeof v === "string" && (v as string).trim())
          .map(([k, v]) => `### ${k.toUpperCase()}\n${v}`)
          .join("\n\n")
      : "";

  const hasAttempted = Boolean(
    userSub && (
      canvasNodes.length > 0 ||
      Boolean(sequenceCode.trim()) ||
      Boolean(schemaCode.trim()) ||
      rawApis.length > 0 ||
      Boolean(candidateNotes.trim())
    )
  );

  const scoreEarned =
    userSub?.score != null
      ? Number(userSub.score)
      : candidate.systemDesignScore != null
      ? Number(candidate.systemDesignScore)
      : 0;

  const scorePct = sdMaxScore > 0 ? Math.round((scoreEarned / sdMaxScore) * 100) : 0;

  const evaluationOutput = userSub?.solution_output || {};
  const aiFeedback =
    evaluationOutput.ai_feedback ||
    (Array.isArray(evaluationOutput.summary) ? evaluationOutput.summary.join(" ") : null) ||
    (!hasAttempted
      ? "The candidate did not submit an architectural design or solutions for this section."
      : "System design submission recorded and reviewed.");

  const rawTasks = Array.isArray(evaluationOutput.tasks) ? evaluationOutput.tasks : [];
  const rawBreakdown = Array.isArray(evaluationOutput.breakdown) ? evaluationOutput.breakdown : [];

  const breakdown =
    rawBreakdown.length > 0
      ? rawBreakdown
      : rawTasks.length > 0
      ? rawTasks.map((t: any) => ({
          task: t.title || t.id,
          score: t.score ?? 0,
          max_score: t.max_score ?? 0,
          feedback: t.feedback || "",
        }))
      : (challenge.tasks || []).map((t: any) => ({
          task: t.title || t.description || "Task",
          score: hasAttempted ? Math.round((t.marks || 10) * (scorePct / 100)) : 0,
          max_score: t.marks || 10,
          feedback: hasAttempted ? "" : "Not attempted.",
        }));

  const timeTakenDisplay = typeof userSub?.time_taken === "string"
    ? userSub.time_taken
    : typeof userSub?.time_taken === "number"
    ? formatDurationSecs(userSub.time_taken)
    : userSub?.started_at && userSub?.submitted_at
    ? formatDurationSecs(Math.round((new Date(userSub.submitted_at).getTime() - new Date(userSub.started_at).getTime()) / 1000))
    : null;

  return (
    <div className="space-y-4">
      {/* Top Header matching LabsPane */}
      <div className="flex items-center justify-between">
        <SectionHeading>System Design</SectionHeading>
        <span className="text-[12px] font-medium text-emerald-400 font-mono">
          Section Score: {scoreEarned}/{sdMaxScore}
        </span>
      </div>

      {/* Summary Metrics Bar matching LabsPane */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-4 text-neutral-600 dark:text-neutral-300">
            <span>
              HLD Nodes: <strong className="text-neutral-900 dark:text-white">{canvasNodes.length}</strong>
            </span>
            <span>
              Sequence Diagram: <strong className="text-neutral-900 dark:text-white">{sequenceCode.trim() ? "Provided" : "None"}</strong>
            </span>
            <span>
              DB Tables: <strong className="text-neutral-900 dark:text-white">{parsedTablesCount}</strong>
            </span>
            <span>
              REST APIs: <strong className="text-neutral-900 dark:text-white">{rawApis.length}</strong>
            </span>
            {timeTakenDisplay && (
              <span>
                Time: <strong className="text-neutral-900 dark:text-white">{timeTakenDisplay}</strong>
              </span>
            )}
          </div>
          {scoreEarned > 0 && (
            <span className="text-emerald-400 text-[11px]">
              ✓ {scorePct >= 75 ? "Production-grade distributed design" : "System design evaluation complete"}
            </span>
          )}
        </div>
      </div>

      {/* Challenge Card matching Labs card style */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 dark:border-white/10 text-[11px] font-mono font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-white/5">
              SD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-neutral-900 dark:text-white">
                  {challenge.title}
                </span>
                {challenge.difficulty && (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {challenge.difficulty}
                  </span>
                )}
                {challenge.domain && (
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    {challenge.domain}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-500">
                {challenge.domain || "Distributed Systems"} · {timeTakenDisplay || `${challenge.duration_minutes || 45}m allowed`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-[24px] font-semibold leading-none ${eciColor(scorePct)}`}>
                {scorePct}
                <span className="text-[12px] text-neutral-500">%</span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-400 font-mono">
                {scoreEarned}/{sdMaxScore} marks
              </div>
            </div>
            {onOpenStudio && (
              <button
                type="button"
                onClick={() => onOpenStudio({ challenge, userSub, candidate, sdMaxScore })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-[12px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-white/10 transition"
                title="Open Full System Design Studio"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Open Full Studio</span>
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
          <div
            className={`h-full ${scorePct >= 70 ? "bg-emerald-400" : scorePct >= 55 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>
        {challenge.description && (
          <p className="mt-3 text-[12.5px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {challenge.description}
          </p>
        )}
      </div>

      {/* AI Architectural Evaluation */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5 space-y-4">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" /> AI Architectural Evaluation
        </div>
        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {aiFeedback}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {breakdown.map((item: any, idx: number) => {
            const pct = item.max_score > 0 ? Math.round((item.score / item.max_score) * 100) : 100;
            return (
              <div
                key={idx}
                className="rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] p-3.5"
              >
                <div className="flex items-center justify-between text-[12px] font-medium">
                  <span className="text-neutral-900 dark:text-white">{item.task}</span>
                  <span className="font-mono text-neutral-500 dark:text-neutral-400">
                    {item.score} / {item.max_score}m
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-white/5 overflow-hidden">
                  <div
                    className={`h-full ${item.score >= item.max_score ? "bg-emerald-400" : item.score > 0 ? "bg-blue-400" : "bg-neutral-400/40"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                {item.feedback && (
                  <p className="mt-2 text-[11px] text-neutral-500 leading-normal">{item.feedback}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The System Design Studio Viewer */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <SectionHeading>Candidate System Design Studio Deliverables</SectionHeading>
          <span className="text-[11px] text-neutral-500">Interactive Visual Architecture</span>
        </div>
        <SystemDesignStudioViewer
          design={design}
          onOpenStudio={onOpenStudio ? () => onOpenStudio({ challenge, userSub, candidate, sdMaxScore }) : undefined}
        />
      </div>
    </div>
  );
}

export function SystemDesignDrawer({
  data,
  onClose,
}: {
  data: { challenge: any; userSub: any; candidate: any; sdMaxScore: number };
  onClose: () => void;
}) {
  const { challenge, userSub, candidate, sdMaxScore } = data;
  const design = userSub?.design || {};
  const scoreEarned =
    userSub?.score != null
      ? Number(userSub.score)
      : candidate?.systemDesignScore != null
      ? Number(candidate.systemDesignScore)
      : 0;
  const scorePct = sdMaxScore > 0 ? Math.round((scoreEarned / sdMaxScore) * 100) : 0;
  const evaluationOutput = userSub?.solution_output || {};
  const aiFeedback =
    evaluationOutput.ai_feedback ||
    (Array.isArray(evaluationOutput.summary) ? evaluationOutput.summary.join(" ") : null) ||
    "System design submission recorded.";

  const timeTaken = typeof userSub?.time_taken === "string"
    ? userSub.time_taken
    : typeof userSub?.time_taken === "number"
    ? formatDurationSecs(userSub.time_taken)
    : userSub?.started_at && userSub?.submitted_at
    ? formatDurationSecs(Math.round((new Date(userSub.submitted_at).getTime() - new Date(userSub.started_at).getTime()) / 1000))
    : `${challenge?.duration_minutes || 45}m allowed`;

  const rawTasks = Array.isArray(evaluationOutput.tasks) ? evaluationOutput.tasks : [];
  const rawBreakdown = Array.isArray(evaluationOutput.breakdown) ? evaluationOutput.breakdown : [];
  const breakdown =
    rawBreakdown.length > 0
      ? rawBreakdown
      : rawTasks.length > 0
      ? rawTasks.map((t: any) => ({
          task: t.title || t.id,
          score: t.score ?? 0,
          max_score: t.max_score ?? 0,
          feedback: t.feedback || "",
        }))
      : (challenge.tasks || []).map((t: any) => ({
          task: t.title || t.description || "Task",
          score: Math.round((t.marks || 10) * (scorePct / 100)),
          max_score: t.marks || 10,
          feedback: "",
        }));

  const canvasNodes = Array.isArray(design.nodes)
    ? design.nodes
    : Array.isArray(design.canvas?.nodes)
    ? design.canvas.nodes
    : [];

  const schemaCode =
    typeof design.schema === "string" && design.schema.trim()
      ? design.schema
      : (design.schema?.code || "");

  const parsedTablesCount = useMemo(() => {
    if (!schemaCode.trim()) return 0;
    try {
      return parseDbml(schemaCode).tables?.length || 0;
    } catch {
      return 0;
    }
  }, [schemaCode]);

  const rawApis = Array.isArray(design.apis)
    ? design.apis
    : Array.isArray(design.api)
    ? design.api
    : [];

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Sticky top bar matching LabDrawer */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-neutral-950/95 px-6 py-4 backdrop-blur shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
              {challenge.domain || "Distributed Systems"} · System Design Studio
            </div>
            <div className="mt-1 text-[20px] font-semibold text-neutral-900 dark:text-white">
              {challenge.title}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-[26px] font-semibold leading-none ${eciColor(scorePct)}`}>
                {scorePct}
                <span className="text-[12px] text-neutral-500">%</span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-neutral-500">
                {scoreEarned}/{sdMaxScore} marks
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-200 dark:border-white/10 p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white transition"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6 max-w-7xl mx-auto">
        {/* Problem Statement */}
        {challenge.description && (
          <Block title="Problem statement">
            <p className="text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {challenge.description}
            </p>
          </Block>
        )}

        {/* Quick stats metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini
            label="Time Taken"
            value={timeTaken}
            sub={challenge.duration_minutes ? `of ${challenge.duration_minutes}m` : undefined}
          />
          <StatMini
            label="HLD Components"
            value={String(canvasNodes.length)}
            sub={canvasNodes.length === 1 ? "1 node placed" : `${canvasNodes.length} nodes placed`}
          />
          <StatMini
            label="DB Tables (DBML)"
            value={String(parsedTablesCount)}
            sub={parsedTablesCount === 1 ? "1 table modeled" : `${parsedTablesCount} tables modeled`}
          />
          <StatMini
            label="REST Endpoints"
            value={String(rawApis.length)}
            sub={rawApis.length === 1 ? "1 endpoint defined" : `${rawApis.length} endpoints defined`}
          />
        </div>

        {/* AI Review & Feedback */}
        <Block title="AI Architectural Review & Rubric" icon={<Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}>
          <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02] p-4 space-y-3">
            <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {aiFeedback}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {breakdown.map((item: any, idx: number) => {
                const pct = item.max_score > 0 ? Math.round((item.score / item.max_score) * 100) : 100;
                return (
                  <div key={idx} className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between text-[12px] font-medium">
                      <span>{item.task}</span>
                      <span className="font-mono text-neutral-500">
                        {item.score} / {item.max_score}m
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${item.score >= item.max_score ? "bg-emerald-400" : item.score > 0 ? "bg-blue-400" : "bg-neutral-400/40"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Block>

        {/* The System Design Studio */}
        <Block title="Candidate System Design Studio Deliverables" icon={<Network className="h-3.5 w-3.5 text-blue-500" />}>
          <SystemDesignStudioViewer design={design} isExpanded={true} />
        </Block>

        {/* Final Score Card */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-semibold">
            Final System Design Score
          </div>
          <div className={`mt-1 text-[36px] font-semibold ${eciColor(scorePct)}`}>
            {scoreEarned}
            <span className="text-[16px] text-neutral-500">/{sdMaxScore} marks</span>
            <span className="ml-2 text-[14px] text-neutral-500">({scorePct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VitarkaPane({
  candidate,
  detail,
  report,
  reportBundle,
  submission,
  submissionStatus,
  onGenerateReport,
  generatingReport,
  onDownload,
}: {
  candidate?: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
  report?: any;
  reportBundle?: any;
  submission?: any;
  submissionStatus?: string;
  onGenerateReport?: () => void;
  generatingReport?: boolean;
  onDownload: () => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);

  let rawTurnsSource = submission?.transcript?.length ? submission.transcript : (submission?.session_state?.turns?.length ? submission.session_state.turns : submission?.turns);
  if ((!rawTurnsSource || rawTurnsSource.length === 0) && submission?.session_state?.questions) {
    rawTurnsSource = submission.session_state.questions.map((q: any, i: number) => [
      { role: "assistant", content: q.prompt || q.question, timestamp: q.asked_at },
      submission.session_state.answers && submission.session_state.answers[i] ? { role: "user", content: submission.session_state.answers[i].answer || submission.session_state.answers[i].content, timestamp: submission.session_state.answers[i].answered_at } : null
    ]).flat().filter(Boolean);
  }
  const rawTurns: any[] = rawTurnsSource || [];
  const normalizedSessionTurns = rawTurns.map((t: any, idx: number) => {
    const isAi = t.speaker === "assistant" || t.role === "assistant" || t.speaker === "AI" || t.role === "system" || t.message_type === "assistant";
    return {
      speaker: isAi ? "AI" : "Candidate",
      text: t.text || t.content || t.message || "",
      time: t.timestamp || t.created_at ? new Date(t.timestamp || t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : `${t.seconds_from_start || (idx * 30)}s`,
    };
  });

  // Check whether any transcript content exists
  const hasTranscript =
    (report?.transcript && Array.isArray(report.transcript) && report.transcript.length > 0) ||
    (normalizedSessionTurns && normalizedSessionTurns.length > 0) ||
    (detail?.vitarka?.transcript && detail.vitarka.transcript.length > 0);

  // Determine actual Vitarka session lifecycle state
  const effStatus = submissionStatus || submission?.status;
  const effStatusStr = String(effStatus || "").toLowerCase();
  const isCompleted = ["completed", "submitted", "done", "in_review", "evaluated"].includes(effStatusStr);

  const vitarkaState: "not_attempted" | "in_progress" | "completed" | "evaluation_generated" = report
    ? "evaluation_generated"
    : (isCompleted || (hasTranscript && effStatusStr === "completed"))
    ? "completed"
    : (effStatusStr === "in_progress" || normalizedSessionTurns.length > 0 || hasTranscript)
    ? "in_progress"
    : (!submission || !submission.id || effStatusStr === "not_attempted")
    ? "not_attempted"
    : "not_attempted";

  const downloadTranscript = () => {
    if (!hasTranscript) return;
    onDownload();

    let text = `# Vitarka Interview Transcript\n`;
    text += `Candidate: ${candidate?.name || "Candidate"}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n---\n\n`;

    if (report?.transcript && Array.isArray(report.transcript) && report.transcript.length > 0) {
      report.transcript.forEach((t: any, idx: number) => {
        if (t.question) {
          text += `### Question ${idx + 1} (${t.question_kind || "Discussion"})\n`;
          text += `**AI:** ${t.question}\n\n`;
          text += `**Candidate:** ${t.answer || "No response recorded."}\n\n---\n\n`;
        } else {
          text += `**${t.speaker || t.role || "Speaker"}:** ${t.text || t.content || ""}\n\n`;
        }
      });
    } else if (normalizedSessionTurns.length > 0) {
      normalizedSessionTurns.forEach((t) => {
        text += `**${t.speaker}** (${t.time}):\n${t.text}\n\n`;
      });
    } else if (detail?.vitarka?.transcript && detail.vitarka.transcript.length > 0) {
      detail.vitarka.transcript.forEach((t) => {
        text += `**${t.speaker}** (${t.time}):\n${t.text}\n\n`;
      });
    }

    const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `vitarka-transcript-${candidate?.name ? candidate.name.toLowerCase().replace(/\s+/g, "-") : "candidate"}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge formatting helper
  const getStatusBadge = () => {
    switch (vitarkaState) {
      case "evaluation_generated":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Evaluation Generated
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Completed (Pending Analysis)
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" /> Session In Progress
          </span>
        );
      case "not_attempted":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm dark:shadow-none text-neutral-700 dark:text-neutral-300 px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" /> Not Attempted
          </span>
        );
    }
  };

  // 1. Vitarka Not Attempted View (Items 70, 71, 72)
  if (vitarkaState === "not_attempted") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <SectionHeading>Vitarka Engineering Discussion</SectionHeading>
                {getStatusBadge()}
              </div>
              <p className="mt-1 text-[13px] text-neutral-400">
                AI-driven dynamic technical conversation and competency evaluation.
              </p>
            </div>

            {onGenerateReport && (
              <button
                onClick={onGenerateReport}
                disabled={generatingReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm dark:shadow-none text-neutral-700 dark:text-neutral-300 px-3.5 py-1.5 text-[12px] font-medium text-neutral-300 transition hover:bg-white/10 hover:text-neutral-900 dark:text-white disabled:opacity-50"
              >
                {generatingReport ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                )}
                {generatingReport ? "Checking Session..." : "Generate AI Evaluation Report"}
              </button>
            )}
          </div>
        </div>

        {/* Empty State Card */}
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm dark:shadow-none text-neutral-700 dark:text-neutral-300 text-neutral-400">
            <Sparkles className="h-6 w-6 text-neutral-400" />
          </div>
          <h3 className="mt-4 text-[16px] font-medium text-neutral-900 dark:text-white">Vitarka Interview Not Attempted</h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-neutral-400">
            The candidate has not initiated or attempted the Vitarka AI discussion session for this evaluation yet. No scores or AI analysis are available.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              disabled={!hasTranscript}
              onClick={downloadTranscript}
              title={hasTranscript ? "Download transcript" : "No transcript available"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm dark:shadow-none text-neutral-700 dark:text-neutral-300 px-3.5 py-2 text-[12px] font-medium text-neutral-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="h-3.5 w-3.5" />
              Download Transcript
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Vitarka Report Available View (evaluation_generated)
  if (report) {
    const overallScore100 = report.overall_score != null ? Math.round(report.overall_score * 10) : detail?.vitarka?.overall || 0;
    const recommendation = report.recommendation || (overallScore100 >= 80 ? "Strong proceed" : overallScore100 >= 60 ? "Proceed" : overallScore100 >= 40 ? "Needs review" : "Do not proceed");
    
    const isStrong = recommendation.toLowerCase().includes("strong");
    const isProceed = recommendation.toLowerCase().includes("proceed") || recommendation.toLowerCase().includes("hire");
    const isReview = recommendation.toLowerCase().includes("review") || recommendation.toLowerCase().includes("maybe");
    const recColor = isStrong || isProceed
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20"
      : isReview
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20"
        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-400/10 dark:text-red-400 dark:border-red-400/20";

    const downloadMarkdownReport = () => {
      const mdContent = report.markdown || `# Vitarka Interview Report\n\nScore: ${overallScore100}/100\nRecommendation: ${recommendation}\n\n${report.executive_summary || ""}`;
      const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vitarka-report-${candidate?.name ? candidate.name.toLowerCase().replace(/\s+/g, "-") : "candidate"}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6">
        {/* Header Overview Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 max-w-[80%]">
              <div className="flex items-center gap-2">
                <SectionHeading>Vitarka Engineering Discussion</SectionHeading>
                {getStatusBadge()}
                {report.mode && (
                  <span className="rounded-md border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {report.mode} Mode
                  </span>
                )}
                {report.rubric_version && (
                  <span className="rounded-md border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-white/5 px-2 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    Rubric {report.rubric_version}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-start gap-4">
                <span className="mt-0.5 text-[12px] uppercase tracking-widest text-neutral-500 shrink-0">Hiring Signal:</span>
                <div className={`flex-1 rounded-xl border px-4 py-3 text-[13px] leading-relaxed font-medium ${recColor}`}>
                  {recommendation}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {onGenerateReport && (
                <button
                  onClick={onGenerateReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm dark:shadow-none text-neutral-700 dark:text-neutral-300 px-3 py-1.5 text-[11px] font-medium text-neutral-300 transition hover:bg-white/10 hover:text-neutral-900 dark:text-white disabled:opacity-50"
                  title="Re-run evaluation prompt and narrative generation"
                >
                  {generatingReport ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {generatingReport ? "Regenerating..." : "Regenerate Analysis"}
                </button>
              )}
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500">Discussion Score</div>
                <div className={`text-[32px] font-medium leading-none ${eciColor(overallScore100)}`}>
                  {report.scaled_score != null ? report.scaled_score : (report.overall_score != null ? report.overall_score : overallScore100)}
                  <span className="text-[13px] text-neutral-500">/{report.max_score || (report.overall_score != null ? 10 : 100)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Competency Matrix */}
          {report.competency_summaries && report.competency_summaries.length > 0 && (
            <div className="mt-6 border-t border-white/5 pt-5">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Competency Matrix</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.competency_summaries.map((c: any, i: number) => {
                  const score100 = (c.score || 0) * 10;
                  const label = (c.competency || "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
                  return (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="text-[12px] font-medium text-neutral-900 dark:text-white">{label}</div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-[16px] font-semibold ${eciColor(score100)}`}>{c.score}</span>
                            <span className="text-[10px] text-neutral-500">/10</span>
                          </div>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">{c.guidance}</p>
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                        <div
                          className={`h-full transition-all duration-500 ${score100 >= 70 ? "bg-emerald-400" : score100 >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${Math.min(100, Math.max(5, score100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Executive Summary & AI Narrative */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Executive Narrative
          </div>
          {report.executive_summary && (
            <p className="mt-3 text-[14px] leading-relaxed text-neutral-200">
              {stripUuids(report.executive_summary, candidate?.name || "the candidate")}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 border-t border-white/5 pt-5">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-emerald-400">Key Strengths</div>
              <ul className="mt-2.5 space-y-2">
                {(report.strengths || []).map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-[13px] text-neutral-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{stripUuids(s, candidate?.name)}</span>
                  </li>
                ))}
                {(!report.strengths || report.strengths.length === 0) && (
                  <li className="text-[12px] text-neutral-500">No dominant strengths recorded.</li>
                )}
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-amber-400">Risks & Gaps</div>
              <ul className="mt-2.5 space-y-2">
                {(report.risks || []).map((r: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-[13px] text-neutral-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{stripUuids(r, candidate?.name)}</span>
                  </li>
                ))}
                {(!report.risks || report.risks.length === 0) && (
                  <li className="text-[12px] text-neutral-500">No major evidence risks recorded.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-white/5">
            <SecondaryAction
              icon={<ScrollText className="h-3.5 w-3.5" />}
              onClick={() => setShowTranscript((v) => !v)}
              disabled={!hasTranscript}
            >
              {showTranscript ? "Hide" : "View"} Transcript
            </SecondaryAction>
            {report.markdown && (
              <SecondaryAction
                icon={<FileText className="h-3.5 w-3.5" />}
                onClick={() => setShowMarkdown((v) => !v)}
              >
                {showMarkdown ? "Hide" : "View"} Markdown Report
              </SecondaryAction>
            )}
            <SecondaryAction
              icon={<FileDown className="h-3.5 w-3.5" />}
              onClick={downloadTranscript}
              disabled={!hasTranscript}
            >
              Download Transcript (.md)
            </SecondaryAction>
            <SecondaryAction icon={<FileDown className="h-3.5 w-3.5" />} onClick={downloadMarkdownReport}>
              Download Full Report (.md)
            </SecondaryAction>
          </div>
        </div>

        {/* Evidence Highlights */}
        {report.evidence_highlights && report.evidence_highlights.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Observed Telemetry & Evidence Highlights</div>
            <div className="mt-4 space-y-2.5">
              {report.evidence_highlights.map((evItem: any, i: number) => {
                const isUuid = evItem.reference_id && /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}/.test(evItem.reference_id);
                const refDisplay = isUuid ? (evItem.source === 'turn' ? `Turn ${i + 1}` : `Evidence ${i + 1}`) : evItem.reference_id;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3 text-[12px]">
                    <span className="mt-0.5 rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono text-neutral-300">
                      {evItem.source}:{refDisplay}
                    </span>
                    <div className="flex-1 text-neutral-300 leading-relaxed">
                      {stripUuids(evItem.note, candidate?.name || "the candidate")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Markdown Report Viewer */}
        {showMarkdown && report.markdown && (
          <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="text-[11px] uppercase tracking-widest text-neutral-400">Formatted Markdown Report</div>
              <button onClick={downloadMarkdownReport} className="text-[11px] text-emerald-400 hover:underline">
                Download file
              </button>
            </div>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-neutral-300">
              {report.markdown}
            </pre>
          </div>
        )}

        {/* Dynamic Transcript View */}
        {showTranscript && hasTranscript && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Interview Transcript</div>
              <button onClick={downloadTranscript} className="text-[11px] text-emerald-400 hover:underline">
                Download (.md)
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {report.transcript && Array.isArray(report.transcript) && report.transcript.length > 0 ? (
                report.transcript.map((item: any, i: number) => (
                  <div key={i} className="space-y-2 rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    {item.question ? (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-[10px] font-medium text-emerald-300">
                            AI
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Question {i + 1}</span>
                              {item.question_kind && (
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-neutral-400">
                                  {item.question_kind}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[13px] text-neutral-200">{item.question}</div>
                          </div>
                        </div>
                        <div className="ml-9 flex items-start gap-3 border-t border-white/5 pt-2">
                          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400/15 text-[10px] font-medium text-amber-300">
                            You
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Candidate Response</div>
                            <div className="mt-0.5 text-[13px] text-neutral-300 italic">
                              {item.answer || "No voice response recorded."}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-[10px] font-medium ${(item.speaker === "AI" || item.role === "assistant") ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                          {(item.speaker === "AI" || item.role === "assistant") ? "AI" : "You"}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] text-neutral-500">
                            {(item.speaker === "AI" || item.role === "assistant") ? "AI Interviewer" : "Candidate"}
                          </div>
                          <div className="mt-0.5 text-[13px] text-neutral-200">{item.text || item.content}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : normalizedSessionTurns.length > 0 ? (
                normalizedSessionTurns.map((l, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3">
                    <div
                      className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[10px] font-medium ${l.speaker === "AI" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}
                    >
                      {l.speaker === "AI" ? "AI" : "You"}
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-neutral-500">
                        {l.speaker} · {l.time}
                      </div>
                      <div className="mt-0.5 text-[13px] text-neutral-200">{l.text}</div>
                    </div>
                  </div>
                ))
              ) : (
                (detail?.vitarka?.transcript || []).map((l, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[10px] font-medium ${l.speaker === "AI" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}
                    >
                      {l.speaker === "AI" ? "AI" : "You"}
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-neutral-500">
                        {l.speaker} · {l.time}
                      </div>
                      <div className="mt-0.5 text-[13px] text-neutral-200">{l.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Vitarka In Progress or Completed Session (Pending Report Generation) View
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <SectionHeading>Vitarka Engineering Discussion</SectionHeading>
              {getStatusBadge()}
            </div>
            <p className="mt-1 text-[13px] text-neutral-400">
              {vitarkaState === "completed"
                ? "Candidate has completed the session. Click 'Generate AI Evaluation Report' to summarize."
                : "Candidate is currently in an active Vitarka session or has un-synthesized transcript turns."}
            </p>
          </div>

          {onGenerateReport && (
            <button
              onClick={onGenerateReport}
              disabled={generatingReport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {generatingReport ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : (
                <Sparkles className="h-4 w-4 text-black" />
              )}
              {generatingReport ? "Generating Analysis..." : "Generate AI Evaluation Report"}
            </button>
          )}
        </div>

        {detail?.vitarka?.signals && detail.vitarka.signals.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 border-t border-white/5 pt-5">
            {detail.vitarka.signals.map((s) => (
              <div key={s.label} className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-3">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                  {s.label}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <div className={`text-[20px] font-medium ${eciColor(s.score)}`}>{s.score}</div>
                  <div className="text-[11px] text-neutral-500">/100</div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                  <div
                    className={`h-full ${s.score >= 70 ? "bg-emerald-400" : s.score >= 55 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Recorded Session Activity
          </div>
          <div className="text-[12px] text-neutral-400">
            {normalizedSessionTurns.length} turns recorded
          </div>
        </div>
        
        {!hasTranscript ? (
          <div className="mt-4 text-[13px] text-neutral-500 italic">
            Candidate did not attempt this section or no transcript is available.
          </div>
        ) : (
          <ul className="mt-3 space-y-2 text-[14px] text-neutral-200">
            {(detail?.vitarka?.summary || []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 rounded-full bg-emerald-400" /> {s}
              </li>
            ))}
          </ul>
        )}
        
        <div className="mt-6 flex flex-wrap gap-2">
          {!hasTranscript ? (
            <>
              <button disabled className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-[12px] font-medium text-neutral-400 bg-black/5 opacity-50 cursor-not-allowed">
                <ScrollText className="h-3.5 w-3.5" />
                View Transcript
              </button>
              <button disabled className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-[12px] font-medium text-neutral-400 bg-black/5 opacity-50 cursor-not-allowed">
                <FileDown className="h-3.5 w-3.5" />
                Download Transcript
              </button>
            </>
          ) : (
            <>
              <SecondaryAction
                icon={<ScrollText className="h-3.5 w-3.5" />}
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? "Hide" : "View"} Transcript
              </SecondaryAction>
              <SecondaryAction icon={<FileDown className="h-3.5 w-3.5" />} onClick={downloadTranscript}>
                Download Transcript
              </SecondaryAction>
            </>
          )}
        </div>
      </div>

      {showTranscript && hasTranscript && (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Transcript</div>
            <button
              onClick={downloadTranscript}
              disabled={!hasTranscript}
              className="text-[11px] text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              Download (.md)
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {normalizedSessionTurns.length > 0 ? (
              normalizedSessionTurns.map((l, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3">
                  <div
                    className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[10px] font-medium ${l.speaker === "AI" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}
                  >
                    {l.speaker === "AI" ? "AI" : "You"}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-neutral-500">
                      {l.speaker} · {l.time}
                    </div>
                    <div className="mt-0.5 text-[13px] text-neutral-200">{l.text}</div>
                  </div>
                </div>
              ))
            ) : (
              (detail?.vitarka?.transcript || []).map((l, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[10px] font-medium ${l.speaker === "AI" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}
                  >
                    {l.speaker === "AI" ? "AI" : "You"}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-neutral-500">
                      {l.speaker} · {l.time}
                    </div>
                    <div className="mt-0.5 text-[13px] text-neutral-200">{l.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResumePane({
  candidate,
  detail,
  onDownload,
}: {
  candidate: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
  onDownload: () => void;
}) {
  const [full, setFull] = useState(false);
  const resumeUrl = candidate.resumeUrl;

  const handleDownload = () => {
    if (resumeUrl) {
      window.open(resumeUrl, "_blank");
    } else {
      onDownload(); // Fallback for fake data
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeading>Resume</SectionHeading>
        <div className="flex gap-2">
          {resumeUrl && (
            <SecondaryAction
              icon={<Maximize2 className="h-3.5 w-3.5" />}
              onClick={() => setFull(true)}
            >
              Open Full Screen
            </SecondaryAction>
          )}
          {resumeUrl ? (
            <SecondaryAction icon={<Download className="h-3.5 w-3.5" />} onClick={handleDownload}>
              Download
            </SecondaryAction>
          ) : (
            <button disabled className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-[12px] font-medium text-neutral-400 bg-black/5 opacity-50 cursor-not-allowed">
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          )}
        </div>
      </div>

      {resumeUrl && (
        <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> AI Resume Summary
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-800">{detail.resume.summary}</p>
        </div>
      )}

      {resumeUrl ? (
        <div className="h-[800px] w-full rounded-2xl border border-black/5 bg-white overflow-hidden relative shadow-sm">
          <iframe 
            src={resumeUrl} 
            className="w-full h-full border-none"
            title="Candidate Resume"
          />
        </div>
      ) : (
        <EmptyBlock 
          icon={<FileText className="h-6 w-6" />}
          title="No Resume Available"
          desc="This candidate has not uploaded a resume to their profile."
        />
      )}

      {full && resumeUrl && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-6 flex flex-col"
          onClick={() => setFull(false)}
        >
          <div className="mx-auto w-full max-w-5xl h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-[12px] text-neutral-400">
              <span>Resume · {candidate.name}</span>
              <button
                onClick={() => setFull(false)}
                className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <div className="flex-1 rounded-xl bg-white overflow-hidden">
               <iframe 
                 src={resumeUrl} 
                 className="w-full h-full border-none"
                 title="Candidate Resume Full"
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



export function TimelinePane({ events, detail, isDemo, hasLabs, hasAssessment, hasVitarka }: { events: TimelineEvent[], detail: ReturnType<typeof getCandidateDetail>, isDemo: boolean, hasLabs: boolean, hasAssessment: boolean, hasVitarka: boolean }) {
  const allEvents = events.length > 0 ? events : detail.timeline;
  
  const displayEvents = allEvents.filter(t => {
    if (t.label.includes("Engineering Labs") && !hasLabs) return false;
    if (t.label.includes("Knowledge Assessment") && !hasAssessment) return false;
    if (t.label.includes("Vitarka") && !hasVitarka) return false;
    return true;
  });
  
  if (displayEvents.length === 0) {
    return (
      <div>
        <SectionHeading>Timeline</SectionHeading>
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6 text-sm text-neutral-500">
          No timeline events yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading>Timeline</SectionHeading>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-6">
        <ol className="relative space-y-5 border-l border-white/10 pl-6">
          {displayEvents.map((t, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[27px] mt-1 grid h-3.5 w-3.5 place-items-center rounded-full border ${t.done ? (t.tone === "warn" ? "border-amber-400 bg-amber-400" : "border-emerald-400 bg-emerald-400") : "border-white/20 bg-neutral-900"}`}
              />
              <div className={`text-[13px] ${t.done ? "text-neutral-900 dark:text-white" : "text-neutral-500"}`}>
                {t.label}
              </div>
              <div className="text-[11px] text-neutral-500">
                {t.time}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function NotesPane({
  notes,
  onAddNote,
  onDeleteNote,
}: {
  notes: Note[];
  onAddNote: (n: Partial<Note>) => void;
  onDeleteNote: (id: string | number) => void;
}) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Note["priority"]>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [internal, setInternal] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!text) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      /* autosave draft — noop */
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [text]);

  const add = () => {
    if (!text.trim()) return;
    onAddNote({
      text: text.trim(),
      priority,
      tags,
      internal,
    });
    setText("");
    setTags([]);
    setPriority("medium");
    setInternal(true);
  };
  const remove = (id: string | number) => {
    onDeleteNote(id);
  };

  return (
    <div className="space-y-5">
      <SectionHeading>Recruiter Notes</SectionHeading>
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note. Mention teammates with @, add tags below…"
          className="min-h-[110px] w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-[13px] text-neutral-900 dark:text-white placeholder-neutral-500 outline-none focus:border-white/25"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={add}
            disabled={!text.trim()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-1.5 text-[12px] font-medium text-neutral-900 dark:text-white disabled:bg-neutral-100 disabled:text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            <Send className="h-3.5 w-3.5" /> Save note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyBlock
          icon={<StickyNote className="h-5 w-5" />}
          title="No notes yet"
          desc="Notes save automatically and are visible to your recruiting team."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-4">
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <span
                  className={`inline-flex h-1.5 w-1.5 rounded-full ${n.priority === "high" ? "bg-red-400" : n.priority === "medium" ? "bg-amber-400" : "bg-neutral-500"}`}
                />
                <span className="text-neutral-300">{n.author}</span>
                <span>·</span>
                <span>{new Date(n.time).toLocaleString()}</span>
                <button
                  onClick={() => remove(n.id)}
                  className="ml-auto text-neutral-500 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-[13px] text-neutral-200">{n.text}</div>
              {n.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-neutral-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityPane({ activity }: { activity: ActivityEvent[] }) {
  return (
    <div>
      <SectionHeading>Activity</SectionHeading>
      {activity.length === 0 ? (
        <div className="mt-4">
          <EmptyBlock
            icon={<Eye className="h-5 w-5" />}
            title="No activity yet"
            desc="Every recruiter action on this candidate will appear here."
          />
        </div>
      ) : (
        <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5">
          {activity.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <div className="flex-1 text-[13px] text-neutral-200">{a.text}</div>
              <div className="text-[11px] text-neutral-500">
                {new Date(a.time).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Sticky sidebar ============

export function StickySidebar({
  candidate,
  detail,
  decision,
  onDecision,
  onAction,
  onCompare,
}: {
  candidate: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
  decision: HiringDecision;
  onDecision: (d: HiringDecision) => void;
  onAction: (l: string) => void;
  onCompare: () => void;
}) {
  return (
    <aside className="lg:sticky lg:top-6 lg:h-fit">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-4">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Engineering Capability
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <div className={`text-[30px] font-medium ${eciColor((candidate.totalPossible ?? 100) > 0 ? Math.round(((candidate.totalEarned ?? candidate.eci) / (candidate.totalPossible ?? 100)) * 100) : 0)}`}>
              {candidate.totalEarned ?? candidate.eci}
            </div>
            <div className="text-[12px] text-neutral-500">/{candidate.totalPossible ?? 100}</div>
            <div className="ml-auto">
              <RecBadge r={candidate.recommendation} />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <MiniBar label="Labs" v={candidate.labsScore} max={candidate.labsMaxScore ?? 200} />
            <MiniBar label="Assessment" v={candidate.assessmentScore} max={candidate.assessmentMaxScore ?? 6} />
            <MiniBar label="Vitarka" v={candidate.vitarkaScore} max={candidate.discussionMaxScore ?? 25} />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-4">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Overall status
          </div>
          <div className="mt-2">
            <StatusPill s={decision} />
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-widest text-neutral-500">
            Next suggested action
          </div>
          <div className="mt-1.5 text-[13px] text-neutral-900 dark:text-white">{detail.nextStep}</div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-4">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Suggested actions
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1.5">
            <SideAction
              icon={<CalendarPlus className="h-3.5 w-3.5" />}
              onClick={() => onDecision("Interview Scheduled")}
            >
              Schedule Interview
            </SideAction>
            <SideAction
              icon={<Layers className="h-3.5 w-3.5" />}
              onClick={() => {
                onDecision("Interview Scheduled");
                onAction("Moved to L2 interview");
              }}
            >
              Move to L2
            </SideAction>
            <SideAction
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              onClick={() => onAction("Flagged for manual review")}
            >
              Need Manual Review
            </SideAction>
            <SideAction
              icon={<XCircle className="h-3.5 w-3.5" />}
              onClick={() => onDecision("Rejected")}
              danger
            >
              Reject
            </SideAction>
            <SideAction
              icon={<StickyNote className="h-3.5 w-3.5" />}
              onClick={() => onAction("Note capture opened")}
            >
              Add Notes
            </SideAction>
            <SideAction icon={<Users className="h-3.5 w-3.5" />} onClick={onCompare}>
              Compare Candidate
            </SideAction>
          </div>
        </div>
      </div>
    </aside>
  );
}

function FormattedExecutionOutput({
  rawOutput,
  labTasks,
}: {
  rawOutput: string | null | undefined;
  labTasks?: any[];
}) {
  const [showRaw, setShowRaw] = useState(false);
  const parsed = useMemo(() => parseExecutionOutput(rawOutput, labTasks), [rawOutput, labTasks]);

  if (!rawOutput && !parsed) return null;

  const passedCount = parsed?.tasks.filter(t => t.result === "passed").length ?? 0;
  const totalCount = parsed?.tasks.length ?? 0;

  return (
    <Block title="Execution & Test Output" icon={<Terminal className="h-3.5 w-3.5 text-emerald-400" />}>
      <div className="space-y-3">
        {/* Top Summary Bar */}
        {parsed?.hasTasks && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12px]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{passedCount} of {totalCount} tasks passed</span>
              </span>
              {parsed.totalScore != null && parsed.maxScore != null && (
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300 border border-emerald-500/20">
                  {parsed.totalScore}/{parsed.maxScore} marks
                  {parsed.percentage != null ? ` (${parsed.percentage}%)` : ""}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowRaw(!showRaw)}
              className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-900 dark:text-white transition"
            >
              <ScrollText className="h-3 w-3" />
              {showRaw ? "Hide raw logs" : "View raw logs"}
            </button>
          </div>
        )}

        {/* Formatted Task Cards */}
        {parsed?.hasTasks ? (
          <div className="space-y-2">
            {parsed.tasks.map((task) => {
              const isPass = task.result === "passed";
              return (
                <div
                  key={task.key}
                  className={`rounded-xl border p-3.5 transition ${
                    isPass
                      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                      : "border-white/5 bg-white/[0.01]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {isPass ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/80" />
                      )}
                      <div>
                        <div className="text-[13px] font-medium text-neutral-900 dark:text-white">
                          {task.name}
                        </div>
                        {task.message && (
                          <div className={`mt-1 text-[12px] leading-relaxed font-mono ${isPass ? "text-emerald-200/90" : "text-neutral-400"}`}>
                            {task.message}
                          </div>
                        )}
                        {task.details && (
                          <pre className="mt-2 overflow-x-auto rounded bg-black/60 p-2 font-mono text-[11px] text-neutral-300">
                            {typeof task.details === "string" ? task.details : JSON.stringify(task.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                          isPass
                            ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                            : "bg-red-400/10 text-red-300 border border-red-400/20"
                        }`}
                      >
                        {isPass ? "Passed" : "Failed"}
                      </span>
                      {task.score != null && (
                        <div className="mt-1 text-[11px] font-mono text-neutral-400">
                          {isPass ? `+${task.score}` : "0"}{task.maxScore ? `/${task.maxScore}` : ""} marks
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Clean Terminal View */}
        {(!parsed?.hasTasks || showRaw) && (
          <div className="rounded-xl border border-white/10 bg-black/80 overflow-hidden font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-neutral-400" /> Raw Console Output
              </span>
            </div>
            <pre className="overflow-x-auto p-3.5 leading-relaxed text-emerald-200 whitespace-pre-wrap max-h-72">
              {parsed?.rawStdout || parsed?.rawText || "No console output recorded."}
            </pre>
            {parsed?.rawStderr && (
              <div className="border-t border-red-500/20 bg-red-950/20 p-3 text-red-300">
                <div className="text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-1">Standard Error</div>
                <pre className="overflow-x-auto leading-relaxed whitespace-pre-wrap">{parsed.rawStderr}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Block>
  );
}

// ============ Lab drawer ============

export function generateMockLabAttempt(lab: any, labSub: any, labsReport?: any) {
  const stats = computeLabTestStats(lab, labSub);
  const marksEarned = stats.marksEarned;
  const maxMarks = stats.maxMarks;
  const scorePct = stats.scorePct;
  const tasksTotal = stats.tasksTotal;
  const tasksCompleted = stats.tasksCompleted;

  const totalSeconds = parseLabDurationSecs(labSub);
  const timeTaken = Math.max(1, Math.round(totalSeconds / 60));
  const timeTakenFormatted = labSub?.time_taken || formatDurationSecs(totalSeconds);
  const timeLimit = lab.duration_minutes ?? lab.duration ?? 0;

  const changedFiles: string[] = [];
  const solutionStr = labSub?.solution || "";
  if (typeof solutionStr === "string") {
    const lines = solutionStr.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git ")) {
        const parts = line.split(" ");
        if (parts.length >= 4) {
          const bPath = parts.slice(3).join(" ");
          const cleanPath = bPath.startsWith("b/") ? bPath.substring(2) : bPath;
          const noise = [".cache", "__pycache__", "node_modules", ".npm", ".config", ".local", ".bash_history", ".python_history"];
          if (!noise.some(p => cleanPath.startsWith(p + "/") || cleanPath.includes("/" + p + "/") || cleanPath === p || cleanPath.endsWith(p))) {
            if (!changedFiles.includes(cleanPath)) {
              changedFiles.push(cleanPath);
            }
          }
        }
      }
    }
  } else if (typeof solutionStr === "object" && solutionStr !== null) {
    changedFiles.push(...Object.keys(solutionStr));
  }

  const realGitCommits = Array.isArray(labSub?.git_commits) ? labSub.git_commits : [];

  const rawProblem = lab.description || lab.problem_statement || lab.scenario_description || "";
  const problemStatement = rawProblem.trim();

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (labsReport?.strengths && Array.isArray(labsReport.strengths)) {
    strengths.push(...labsReport.strengths);
  }
  if (labsReport?.risks && Array.isArray(labsReport.risks)) {
    const cleanRisks = labsReport.risks.filter((r: string) => {
      const low = r.toLowerCase();
      if (scorePct > 0) {
        if (low.includes("no lab tests were executed") || low.includes("no verified implementation code") || low.includes("no lab tests were run")) {
          return false;
        }
      }
      return true;
    });
    weaknesses.push(...cleanRisks);
  }
  if (labsReport?.suggestions && Array.isArray(labsReport.suggestions)) {
    suggestions.push(...labsReport.suggestions);
  } else if (labsReport?.recommendations && Array.isArray(labsReport.recommendations)) {
    suggestions.push(...labsReport.recommendations);
  }

  const aiVerdict = scorePct >= 70 ? "Strong" : scorePct >= 40 ? "Moderate" : scorePct > 0 ? "Needs Review" : "Needs Work";

  const timeline: { time: string; label: string }[] = [];
  const startRaw = labSub?.started_at || labSub?.created_at;
  const endRaw = labSub?.submitted_at || labSub?.updated_at;

  let startD = startRaw ? new Date(startRaw) : null;
  let endD = endRaw ? new Date(endRaw) : null;

  if (startD && isNaN(startD.getTime())) startD = null;
  if (endD && isNaN(endD.getTime())) endD = null;

  if (endD && (!startD || Math.abs(endD.getTime() - startD.getTime()) < 2000) && totalSeconds > 0) {
    startD = new Date(endD.getTime() - totalSeconds * 1000);
  }

  const formatWithSeconds = (d: Date | null, fallback: string) => {
    if (!d || isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (startD) {
    timeline.push({
      time: formatWithSeconds(startD, "t+0m"),
      label: "Started lab session"
    });
  } else {
    timeline.push({ time: "t+0m", label: "Started lab session" });
  }

  if (labSub?.status === 'done' || labSub?.status === 'in_review' || labSub?.status === 'SUBMITTED' || labSub?.solution || endD) {
    if (endD) {
      timeline.push({
        time: formatWithSeconds(endD, `t+${timeTakenFormatted}`),
        label: "Submitted lab solution"
      });
    } else {
      timeline.push({ time: `t+${timeTakenFormatted}`, label: "Submitted lab solution" });
    }
  }

  return {
    id: lab.id || "lab",
    title: lab.title || lab.name || "Engineering Lab",
    domain: lab.domain || "Backend",
    scorePct,
    marksEarned,
    maxMarks,
    timeTaken,
    timeTakenSeconds: totalSeconds,
    timeTakenFormatted,
    timeLimit,
    tasksCompleted,
    tasksTotal,
    files: changedFiles,
    gitCommits: realGitCommits,
    output: labSub?.solution_output && labSub.solution_output.trim() ? labSub.solution_output.trim() : null,
    problemStatement: problemStatement.length > 0 ? problemStatement : null,
    strengths,
    weaknesses,
    suggestions,
    aiVerdict,
    timeline,
    feedback: labSub?.feedback && labSub.feedback.trim() ? labSub.feedback.trim() : null,
  };
}

export function LabDrawer({
  data,
  evaluationId,
  onClose,
}: {
  data: { section: any; labSub: any; candidate: any; labsReport?: any };
  evaluationId: string;
  onClose: () => void;
}) {
  const { section, labSub, candidate, labsReport } = data;
  const lab = generateMockLabAttempt(section, labSub, labsReport);

  const hasAIReview = lab.strengths.length > 0 || lab.weaknesses.length > 0 || lab.suggestions.length > 0 || Boolean(lab.feedback);

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-white text-neutral-900">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
              {lab.domain} · Engineering lab
            </div>
            <div className="mt-1 text-[20px] font-semibold text-neutral-900">
              {lab.title}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-[26px] font-semibold leading-none ${eciColor(lab.scorePct)}`}>
                {lab.scorePct}
                <span className="text-[12px] text-neutral-500">%</span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-neutral-500">
                {lab.marksEarned}/{lab.maxMarks} marks
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {/* Problem statement (only if data exists) */}
        {lab.problemStatement && (
          <Block title="Problem statement">
            <p className="text-[13px] leading-relaxed text-neutral-700 whitespace-pre-wrap">{lab.problemStatement}</p>
          </Block>
        )}

        {/* Quick stats metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatMini
            label="Time taken"
            value={lab.timeTakenFormatted}
            sub={lab.timeLimit > 0 ? `of ${lab.timeLimit}m allowed` : undefined}
          />
          {lab.tasksTotal > 0 && (
            <StatMini
              label="Tasks completed"
              value={`${lab.tasksCompleted}/${lab.tasksTotal}`}
              sub={lab.tasksCompleted === lab.tasksTotal ? "All done" : `${lab.tasksTotal - lab.tasksCompleted} missed`}
            />
          )}
          <StatMini
            label="Files changed"
            value={String(lab.files.length)}
            sub={lab.files.length === 1 ? "1 file modified" : `${lab.files.length} files modified`}
          />
        </div>

        {/* Execution timeline (only if entries exist) */}
        {lab.timeline.length > 0 && (
          <Block title="Execution timeline">
            <ol className="relative space-y-3 border-l border-neutral-200 pl-5">
              {lab.timeline.map((t: any, i: number) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] mt-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="text-[12px] font-medium text-neutral-800">{t.label}</div>
                  <div className="text-[10px] text-neutral-500">{t.time}</div>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {/* Submitted code */}
        <Block title="Submitted code" icon={<FileText className="h-3.5 w-3.5 text-neutral-500" />}>
          <div className="h-[600px] border border-neutral-200 rounded-xl overflow-hidden relative shadow-sm">
            <ErrorBoundary>
              <LabCodeExplorer
                userId={labSub?.user || candidate.rawSubmission?.user?.id?.toString() || candidate.rawSubmission?.user || candidate.id}
                evaluationId={evaluationId}
                lab={section}
                labSub={labSub}
              />
            </ErrorBoundary>
          </div>
        </Block>

        {/* Real Git commits (only if real commits exist) */}
        {lab.gitCommits.length > 0 && (
          <Block title="Git commits" icon={<GitCommit className="h-3.5 w-3.5 text-neutral-500" />}>
            <div className="space-y-2">
              {lab.gitCommits.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[12px]"
                >
                  <span className="font-mono text-[10px] font-medium text-emerald-600">{c.sha || c.hash}</span>
                  <div className="flex-1">
                    <div className="text-neutral-800">{c.message}</div>
                    {c.time && <div className="text-[10px] text-neutral-500">{c.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Execution & test output (only if real output exists) */}
        {lab.output && (() => {
          const drawerStats = getLabCalculatedStats(section);
          const drawerTasks = drawerStats.selectedTasks.length > 0
            ? drawerStats.selectedTasks
            : section?.tasks;
          return <FormattedExecutionOutput rawOutput={lab.output} labTasks={drawerTasks} />;
        })()}

        {/* AI review (only if real strengths/weaknesses/suggestions/feedback exist) */}
        {hasAIReview && (
          <Block title="AI Review & Feedback" icon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}>
            {lab.feedback && (
              <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[13px] text-neutral-700 leading-relaxed">
                {lab.feedback}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {lab.strengths.length > 0 && (
                <ListBlock title="Strengths" items={lab.strengths} tone="good" />
              )}
              {lab.weaknesses.length > 0 && (
                <ListBlock title="Weaknesses" items={lab.weaknesses} tone="warn" />
              )}
            </div>
            {lab.suggestions.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Suggestions</div>
                <ul className="mt-2 space-y-1 text-[12px] text-neutral-700">
                  {lab.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>
        )}

        {/* Final lab score */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold">Final lab score</div>
          <div className={`mt-1 text-[36px] font-semibold ${eciColor(lab.scorePct)}`}>
            {lab.marksEarned}
            <span className="text-[16px] text-neutral-500">/{lab.maxMarks} marks</span>
            <span className="ml-2 text-[14px] text-neutral-500">({lab.scorePct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Small pieces ============

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">{children}</h2>;
}
function PrimaryAction({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-medium text-black transition hover:bg-white/90"
    >
      {icon}
      {children}
    </button>
  );
}
function SecondaryAction({
  children,
  onClick,
  icon,
  danger,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  let colorClasses = "border-white/10 text-neutral-200 hover:bg-white/5 hover:border-white/20";
  if (danger) {
    colorClasses = active 
      ? "border-red-400/50 bg-red-400/10 text-red-300"
      : "border-red-400/25 text-red-300 hover:border-red-400/40 hover:bg-red-400/[0.06]";
  } else if (active) {
    colorClasses = "border-emerald-400/50 bg-emerald-400/10 text-emerald-300";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition ${colorClasses} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
    >
      {icon}
      {children}
    </button>
  );
}
function SideAction({
  children,
  onClick,
  icon,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition ${danger ? "border-red-400/20 text-red-300 hover:bg-red-400/[0.06]" : "border-white/10 text-neutral-200 hover:bg-white/5"}`}
    >
      {icon}
      {children}
    </button>
  );
}
function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-500">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 truncate text-[14px] text-neutral-900 dark:text-white">{value}</div>
    </div>
  );
}
function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "warn";
}) {
  const dot = tone === "good" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">{title}</div>
      <ul className="mt-2 space-y-1.5 text-[13px] text-neutral-800">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-2 h-1 w-1 rounded-full shrink-0 ${dot}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
export function SubMetric({
  label,
  value,
  maxScore = 100,
  onClick,
}: {
  label: string;
  value: number;
  maxScore?: number;
  onClick?: () => void;
}) {
  const numVal = Number(value);
  const roundedVal = Number.isFinite(numVal) ? Number(numVal.toFixed(1)) : value;
  const pct = maxScore > 0 ? Math.min(100, Math.round((Number(roundedVal) / maxScore) * 100)) : 0;
  return (
    <button onClick={onClick} className="w-full px-5 py-4 text-left transition hover:bg-white/[0.02]">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className={`text-[22px] font-medium leading-none ${eciColor(pct)}`}>
          {pct}%
        </span>
        <span className="text-[13px] font-mono text-neutral-400">
          {roundedVal}/{maxScore}
        </span>
      </div>
    </button>
  );
}
export function RadialScore({ value, maxScore = 100 }: { value: number; maxScore?: number }) {
  const c = 2 * Math.PI * 42;
  const pct = maxScore > 0 ? Math.min(100, Math.max(0, (value / maxScore) * 100)) : 0;
  const off = c - (pct / 100) * c;
  const stroke = pct >= 70 ? "#34d399" : pct >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative grid h-[112px] w-[112px] shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="transition-[stroke-dashoffset]"
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-[24px] font-medium leading-none ${eciColor(pct)}`}>
          {Math.round(pct)}%
        </div>
      </div>
    </div>
  );
}
function MiniBar({ label, v, max }: { label: string; v: number; max?: number }) {
  const pct = max && max > 0 ? Math.min(100, Math.round((v / max) * 100)) : v;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span>{label}</span>
        <span className={eciColor(pct)}>{max ? `${v}/${max}` : v}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
        <div
          className={`h-full ${pct >= 70 ? "bg-emerald-400" : pct >= 55 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
function StatMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">{label}</div>
      <div className="mt-1 text-[18px] font-semibold text-neutral-900">{value}</div>
      {sub && <div className="text-[10px] text-neutral-500">{sub}</div>}
    </div>
  );
}
function Block({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-500">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
function EmptyBlock({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-white/10 text-neutral-500">
        {icon}
      </div>
      <div className="mt-3 text-[14px] text-neutral-900 dark:text-white">{title}</div>
      <div className="mt-1 text-[12px] text-neutral-500">{desc}</div>
    </div>
  );
}
function RecBadge({ r }: { r: string }) {
  const map: Record<string, string> = {
    "Strong Hire": "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    Hire: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    Maybe: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    Reject: "border-red-400/30 bg-red-400/10 text-red-300",
    "Hidden Gem": "border-amber-400/30 bg-amber-400/10 text-amber-300",
    "Needs Review": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${map[r] ?? "border-white/10 text-neutral-300"}`}
    >
      {r}
    </span>
  );
}
export function StatusPill({ s }: { s: HiringDecision }) {
  const map: Record<HiringDecision, string> = {
    "Pending Review": "border-amber-400/30 bg-amber-400/10 text-amber-300",
    Shortlisted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    "Interview Scheduled": "border-amber-400/30 bg-amber-400/10 text-amber-300",
    Selected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    Rejected: "border-red-400/30 bg-red-400/10 text-red-300",
    Hold: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${map[s]}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" /> {s}
    </span>
  );
}
export function Avatar({
  name,
  hue,
  size = "md",
}: {
  name: string;
  hue: number;
  size?: "md" | "lg" | "xl";
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const cls =
    size === "xl"
      ? "h-16 w-16 text-[20px]"
      : size === "lg"
        ? "h-9 w-9 text-[13px]"
        : "h-7 w-7 text-[11px]";
  return (
    <span
      className={`grid ${cls} shrink-0 place-items-center rounded-full font-medium text-neutral-900 dark:text-white`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 60% 40%), hsl(${(hue + 60) % 360} 55% 30%))`,
      }}
    >
      {initials}
    </span>
  );
}

export function tabLabel(t: Tab) {
  return t === "labs"
    ? "Engineering Labs"
    : t === "assessment"
      ? "Knowledge Assessment"
      : t === "vitarka"
        ? "Vitarka Discussion"
        : t === "system_design"
          ? "System Design"
          : t === "proctoring"
            ? "Proctoring Analytics"
            : t[0].toUpperCase() + t.slice(1);
}
function eciColor(v: number) {
  return v >= 70 ? "text-emerald-300" : v >= 55 ? "text-amber-300" : "text-red-300";
}
export function ecIVerdict(v: number) {
  return v >= 85 ? "Excellent" : v >= 70 ? "Strong" : v >= 55 ? "Average" : "Below bar";
}

function resumeText(
  c: ReturnType<typeof getCandidates>[number],
  d: ReturnType<typeof getCandidateDetail>,
) {
  return [
    c.name,
    `${c.email} · ${c.phone} · ${d.location}`,
    "",
    "SUMMARY",
    d.resume.summary,
    "",
    "EXPERIENCE",
    ...d.resume.experience.flatMap((e) => [
      `${e.role} — ${e.company} (${e.period})`,
      ...e.bullets.map((b) => `  - ${b}`),
      "",
    ]),
    "EDUCATION",
    ...d.resume.education.map((e) => `${e.school} — ${e.degree} (${e.period})`),
    "",
    "SKILLS",
    c.skills.join(", "),
  ].join("\n");
}
