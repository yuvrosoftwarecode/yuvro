import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  MapPin,
  Download,
  Sun,
  Moon,
} from "lucide-react";
import { getSharedReportByToken } from "@/lib/recruiter";
import { getCandidates } from "@/lib/recruiterCandidates";
import {
  getCandidateDetail,
  loadTimelineEvents,
  type TimelineEvent,
} from "@/lib/recruiterCandidateDetail";
import { buildEvaluationSummary } from "@/lib/evaluationSummary";
import {
  OverviewPane,
  LabsPane,
  AssessmentPane,
  VitarkaPane,
  ResumePane,
  TimelinePane,
  Avatar,
  tabLabel,
  StatusPill,
  RadialScore,
  ecIVerdict,
  SubMetric,
  LabDrawer,
} from "./recruiter.evaluations.$id.candidates.$candidateId";

export const Route = createFileRoute("/shared/report/$token")({
  head: () => ({
    meta: [{ title: "Candidate Report — Shared View" }, { name: "robots", content: "noindex" }],
  }),
  component: SharedReportWorkspace,
});

type Tab =
  | "overview"
  | "labs"
  | "assessment"
  | "vitarka"
  | "resume"
  | "timeline"
  | "proctoring";

function SharedReportWorkspace() {
  const { token } = Route.useParams();
  const nav = useNavigate();
  
  const [ev, setEv] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [openLab, setOpenLab] = useState<any | null>(null);
  const [isLightMode, setIsLightMode] = useState(true); // Default to light mode (recruiter theme)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getSharedReportByToken(token);
        if (!data) {
          setError("Invalid or expired report link.");
          setLoading(false);
          return;
        }

        setEv(data.evaluation);
        
        // Pass the single submission into getCandidates to perfectly hydrate scores, names, and logic
        const cands = getCandidates(data.evaluation.id, [data.submission], [], data.evaluation);
        const hydratedCand = cands[0] || {
          id: data.submission.id,
          name: data.submission.full_name || data.submission.name || data.submission.user?.full_name || data.submission.user?.username || data.submission.email?.split('@')[0] || "Candidate",
          email: data.submission.email || data.submission.user?.email || "",
          phone: data.submission.phone || data.submission.user?.phone || "",
          hiringStatus: data.submission.hiring_status || "Pending Review",
          eci: 0,
          labsScore: 0,
          assessmentScore: 0,
          vitarkaScore: 0,
          recommendation: "Reject",
        };
        
        setCandidate({
          ...hydratedCand,
          rawSubmission: data.submission
        });
        
        if (data.evaluation?.id && hydratedCand.email) {
          const realTimeline = await loadTimelineEvents(data.evaluation.id, hydratedCand.email);
          if (realTimeline && realTimeline.length > 0) {
            setTimelineEvents(realTimeline);
          } else if (data.timelineEvents && data.timelineEvents.length > 0) {
            setTimelineEvents(data.timelineEvents);
          }
        } else if (data.timelineEvents) {
          setTimelineEvents(data.timelineEvents);
        }
        setLoading(false);
      } catch (err) {
        setError(`Failed to load report data: ${err}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, [token]);

  if (loading) return <div className="p-16 text-center text-neutral-400">Loading report...</div>;
  if (error) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black">
      <div className="p-16 text-center text-neutral-400 max-w-md rounded-xl border border-white/10 bg-neutral-900 shadow-xl">
        <h2 className="mb-4 text-xl text-red-400">Access Denied / Error</h2>
        <p className="mb-6 text-sm text-white">{error}</p>
        <div className="text-xs text-neutral-500 mb-4">This link may have expired (links expire after 30 days) or the token is incorrect.</div>
        <div className="text-[10px] text-neutral-600 font-mono">Debug Token: {token}</div>
      </div>
    </div>
  );

  const hasSections = Array.isArray(ev?.sections) && ev.sections.length > 0;
  const hasLabs = hasSections ? ev.sections.some((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS") : false;
  const hasAssessment = hasSections ? ev.sections.some((s: any) => s.kind === "assessment" || s.kind === "knowledge" || s.type === "KNOWLEDGE_ASSESSMENT") : false;
  const hasVitarka = hasSections ? ev.sections.some((s: any) => s.kind === "discussion" || s.kind === "vitarka" || s.type === "VITARKA_AI_INTERVIEW") : false;

  const labsMaxScore = (ev?.sections || []).filter((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS").reduce((acc: number, sec: any) => {
    const secSum = (sec.labs || sec.questions || []).reduce((subAcc: number, item: any) => subAcc + (Number(item.marks) || 0), 0);
    return acc + (secSum > 0 ? secSum : 10);
  }, 0) || (hasLabs ? 10 : 0);

  const assessmentMaxScore = (ev?.sections || []).filter((s: any) => s.kind === "assessment" || s.kind === "knowledge" || s.type === "KNOWLEDGE_ASSESSMENT").reduce((acc: number, sec: any) => {
    const secSum = (sec.questions || []).reduce((subAcc: number, item: any) => subAcc + (Number(item.marks) || 1), 0);
    return acc + (secSum > 0 ? secSum : 30);
  }, 0) || (hasAssessment ? 30 : 0);

  const discussionMaxScore = (ev?.sections || []).filter((s: any) => s.kind === "discussion" || s.kind === "vitarka" || s.type === "VITARKA_AI_INTERVIEW").reduce((acc: number, sec: any) => {
    return acc + (Number(sec.marks) || 25);
  }, 0) || (hasVitarka ? 25 : 0);

  const rawLabSubs = candidate?.rawSubmission?.lab_submissions || [];
  const vitarkaSubmission = candidate?.rawSubmission?.vitarka_submission;
  const liveBundle = hasVitarka ? (vitarkaSubmission?.report_bundle || vitarkaSubmission?.session_state?.report_bundle) : null;
  const liveVitarkaReport = hasVitarka ? (liveBundle?.vitarka_report || vitarkaSubmission?.report || vitarkaSubmission?.session_state?.report) : null;
  const liveOverallReport = hasVitarka ? liveBundle?.overall_report : null;
  const liveLabsReport = liveBundle?.engineering_labs_report;
  const liveKnowledgeReport = liveBundle?.knowledge_assessment_report;

  const totalLabMarksEarned = rawLabSubs.length > 0
    ? rawLabSubs.reduce((acc: number, cur: any) => {
        let score = Number(cur.score || cur.marks_earned || 0);
        if (score === 0 && cur.test_results && Array.isArray(cur.test_results)) {
          const passed = cur.test_results.filter((t: any) => t.passed || t.status === "passed" || t.status === "PASS").length;
          const total = cur.test_results.length;
          if (total > 0) score = Math.round((passed / total) * 10);
        }
        if (score === 0 && cur.solution && typeof cur.solution === "string") {
          if (cur.solution.includes("HTTP_201_CREATED") || cur.solution.includes("201_CREATED")) {
            score = 2;
          }
        }
        if (score > 10 && score <= 100) {
          score = (score / 100) * 10;
        }
        return acc + score;
      }, 0)
    : (candidate?.labsScore != null ? candidate.labsScore : 0);

  const liveLabsHasNoAttempts = (
    totalLabMarksEarned === 0 && (
      (liveLabsReport?.tests_total && liveLabsReport.tests_total > 0 && (!liveLabsReport.tests_passed || liveLabsReport.tests_passed === 0)) ||
      (liveLabsReport?.risks?.some((r: string) => r.includes("No lab tests were executed")) && liveLabsReport?.risks?.some((r: string) => r.includes("No verified implementation code")))
    )
  );

  const liveLabsScore = totalLabMarksEarned > 0
    ? Math.min(totalLabMarksEarned, labsMaxScore)
    : (liveLabsHasNoAttempts
        ? 0
        : (candidate?.labsScore != null && candidate.labsScore > 0
            ? Math.min(candidate.labsScore, labsMaxScore)
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
          : (candidate?.assessmentScore != null ? Math.min(candidate.assessmentScore, assessmentMaxScore) : 0))
  );

  const liveVitarkaScore = (
    liveVitarkaReport?.scaled_score != null
      ? liveVitarkaReport.scaled_score
      : (vitarkaSubmission?.marks != null
          ? vitarkaSubmission.marks
          : (candidate?.vitarkaScore != null && candidate.vitarkaScore <= discussionMaxScore
              ? candidate.vitarkaScore
              : 0))
  );

  const totalEarned = (hasLabs ? liveLabsScore : 0) + (hasAssessment ? liveAssessmentScore : 0) + (hasVitarka ? liveVitarkaScore : 0);
  const totalPossible = (hasLabs ? labsMaxScore : 0) + (hasAssessment ? assessmentMaxScore : 0) + (hasVitarka ? discussionMaxScore : 0);

  const scorePct = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : (candidate?.eci ?? 0);
  const scoreRec = scorePct >= 75 ? "Strong Hire" : scorePct >= 60 ? "Hire" : scorePct >= 45 ? "Maybe" : "Reject";

  const normalizeRec = (raw?: string) => {
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

  const canonicalRecommendation =
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
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
    }
  };

  const tabsToDisplay: Tab[] = ["overview"];
  if (hasLabs) tabsToDisplay.push("labs");
  if (hasAssessment) tabsToDisplay.push("assessment");
  if (hasVitarka) tabsToDisplay.push("vitarka");
  tabsToDisplay.push("resume", "timeline");

  return (
    <div className={`min-h-screen ${isLightMode ? "recruiter-theme bg-[#fdfdfb]" : "bg-[#0a0a0b] text-white"}`}>
      {/* Top header */}
      <header className={`border-b backdrop-blur ${isLightMode ? "bg-white border-neutral-200" : "bg-white/[0.02] border-white/5"}`}>
        <div className="px-8 pt-6 pb-5">
          <div className="mt-2 flex justify-between gap-6">
            <div className="flex flex-col min-w-0 items-start gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar name={candidate.name} hue={candidate.avatarHue} size="xl" />
                  <h1 className={`text-[26px] font-medium leading-tight ${isLightMode ? "text-neutral-900" : "text-white"}`}>
                    {candidate.name}
                  </h1>
                  <StatusPill s={candidate.hiringStatus} />
                  
                  {/* Export PDF Button */}
                  <button
                    onClick={downloadReport}
                    className={`ml-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium border transition ${isLightMode ? 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    title="Export PDF Report"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export PDF
                  </button>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => setIsLightMode(!isLightMode)}
                    className={`ml-2 flex items-center justify-center rounded-full p-2 transition ${isLightMode ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                    title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  >
                    {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </button>
                </div>
                <div className={`mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] ${isLightMode ? "text-neutral-600" : "text-neutral-300"}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-neutral-500" /> {candidate.email}
                  </span>
                  {candidate.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-neutral-500" /> {candidate.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <nav className="mt-6 flex flex-wrap items-center gap-1 px-8 max-w-[1440px] mx-auto">
        {tabsToDisplay.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 px-3 py-2 text-[13px] transition ${
              isLightMode
                ? tab === t
                  ? "font-semibold text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900"
                : tab === t
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tabLabel(t)}
            {tab === t && (
              <span className={`absolute inset-x-3 -bottom-[13px] h-0.5 ${isLightMode ? "bg-neutral-900" : "bg-white"}`} />
            )}
          </button>
        ))}
      </nav>
      <hr className="border-neutral-200" />
      
      <main className="mx-auto max-w-[1440px] px-8 py-8">
        <div className="w-full">
          {tab === "overview" && (
            <OverviewPane
              candidate={displayCandidate}
              detail={detail}
              vitarkaReport={liveVitarkaReport}
              overallReport={liveOverallReport}
              reportBundle={liveBundle}
              onGotoLabs={() => setTab("labs")}
              onGotoVit={() => setTab("vitarka")}
              hasLabs={hasLabs}
              hasAssessment={hasAssessment}
              hasVitarka={hasVitarka}
              labsMaxScore={labsMaxScore}
              assessmentMaxScore={assessmentMaxScore}
              discussionMaxScore={discussionMaxScore}
              ev={ev}
            />
          )}
          {tab === "labs" && (
            <LabsPane
              ev={ev}
              candidate={displayCandidate}
              onOpen={setOpenLab}
            />
          )}
          {tab === "assessment" && <AssessmentPane ev={ev} candidate={displayCandidate} />}
          {tab === "vitarka" && (
            <VitarkaPane
              candidate={displayCandidate}
              detail={detail}
              report={liveVitarkaReport}
              reportBundle={liveBundle}
              submission={vitarkaSubmission}
              submissionStatus={vitarkaSubmission?.status}
              onDownload={() => {
                alert("Transcript downloaded");
              }}
            />
          )}
          {tab === "resume" && (
            <ResumePane candidate={displayCandidate} detail={detail} onDownload={() => alert("Resume downloaded")} />
          )}
          {tab === "timeline" && <TimelinePane events={timelineEvents} detail={detail} isDemo={false} hasLabs={hasLabs} hasAssessment={hasAssessment} hasVitarka={hasVitarka} />}
        </div>
      </main>

      {openLab && <LabDrawer data={openLab} evaluationId={ev?.id} onClose={() => setOpenLab(null)} />}
    </div>
  );
}
