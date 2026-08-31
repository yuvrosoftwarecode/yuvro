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
} from "lucide-react";
import { getCandidates } from "@/lib/recruiterCandidates";
import { CandidateAnalyticsViewer } from "@/components/evaluation/CandidateAnalyticsViewer";
import { LabCodeExplorer } from "@/components/recruiter/LabCodeExplorer";
import { getEvaluation, getEvaluationSubmissions } from "@/lib/recruiter";
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

export const Route = createFileRoute("/recruiter/evaluations/$id/candidates/$candidateId")({
  head: () => ({
    meta: [{ title: "Candidate — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: CandidateWorkspace,
});

type Tab =
  "overview" | "labs" | "assessment" | "vitarka" | "resume" | "timeline" | "notes" | "activity" | "proctoring";

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
      const cands = getCandidates(e.id, subs || []);
      const cand = cands.find((x) => x.id === candidateId);
      setCandidate(cand || null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [id, candidateId, nav]);

  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [decision, setDecision] = useState<HiringDecision>(() =>
    loadDecision(id, candidateId, candidate?.hiringStatus ?? "Pending Review"),
  );
  const [openLab, setOpenLab] = useState<{ section: any, labSub: any, candidate: any } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    markViewed(id, candidateId);
    if (candidate?.email) {
      pushActivity(id, candidate.email, "view", "Recruiter viewed the profile").then(() => {
        loadActivity(id, candidate.email).then(setActivity);
      });
      createTimelineEvent(id, candidate.email, "Recruiter viewed profile");
    }
    // logRecruiterActivity is redundant here, pushActivity is called above.
  }, [id, candidateId, candidate?.email]);

  useEffect(() => {
    if (candidate?.email) {
      loadNotes(id, candidate.email).then(setNotes);
      loadTimelineEvents(id, candidate.email).then(setTimelineEvents);
      
      const intervalId = setInterval(() => {
        loadTimelineEvents(id, candidate.email).then(setTimelineEvents);
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [id, candidate?.email]);
  
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading) return <div className="p-16 text-center text-neutral-400">Loading...</div>;

  if (!candidate || !ev) {
    return (
      <div className="p-16 text-center text-neutral-400">
        Candidate not found.{" "}
        <Link
          to="/recruiter/evaluations/$id/workspace"
          params={{ id }}
          search={{ tab: "candidates" }}
          className="text-emerald-400 hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }
  const detail = getCandidateDetail(candidate);
  const notify = (m: string) => setToast(m);
  const act = async (kind: string, text: string) => {
    if (!candidate?.email) return;
    await pushActivity(id, candidate.email, kind, text);
    // logRecruiterActivity is redundant here, pushActivity is called above.
    const newAct = await loadActivity(id, candidate.email);
    setActivity(newAct);
  };
  const doDecision = (d: HiringDecision) => {
    setDecision(d);
    if (candidate?.email) saveDecision(id, candidateId, candidate.email, d);
    act("Decision Changed", `Decision changed to ${d}`);
    notify(`Marked as ${d}`);
    
    if (candidate?.email) {
      if (d === "Shortlisted") {
        createTimelineEvent(id, candidate.email, "Shortlisted");
      } else if (d === "Hold") {
        createTimelineEvent(id, candidate.email, "Placed on hold");
      } else if (d === "Rejected") {
        createTimelineEvent(id, candidate.email, "Rejected");
      } else if (d === "Interview Scheduled") {
        createTimelineEvent(id, candidate.email, "Interview scheduled");
      } else if (d === "Selected") {
        createTimelineEvent(id, candidate.email, "Offer sent");
      }
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
  const downloadReport = () => {
    const rows: string[] = [
      `Yuvro Labs — Candidate Report`,
      `Name: ${candidate.name}`,
      `Email: ${candidate.email}`,
      `Phone: ${candidate.phone}`,
      `College: ${candidate.college}`,
      `Company: ${candidate.company}`,
      `Experience: ${candidate.experience}y`,
      ``,
      `Engineering Capability Index: ${candidate.eci}/100`,
      `Recommendation: ${candidate.recommendation}`,
      `Confidence: ${detail.confidence}%`,
      ``,
      `Labs: ${candidate.labsScore}`,
      `Assessment: ${candidate.assessmentScore}`,
      `Vitarka: ${candidate.vitarkaScore}`,
      ``,
      `Strengths:`,
      ...detail.strengths.map((s) => `  - ${s}`),
      ``,
      `Weaknesses:`,
      ...detail.weaknesses.map((s) => `  - ${s}`),
      ``,
      `AI Summary:`,
      detail.aiSummary,
      ``,
      `Recommended Next Step: ${detail.nextStep}`,
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${candidate.name.replace(/\s+/g, "-")}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    act("download", "Downloaded candidate report");
    notify("Report downloaded");
  };
  const downloadResume = () => {
    const blob = new Blob([resumeText(candidate, detail)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${candidate.name.replace(/\s+/g, "-")}-resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
    act("download", "Downloaded resume");
    notify("Resume downloaded");
  };

  return (
    <div className="min-h-screen">
      {/* Top header */}
      <header className="bg-white border-b border-white/5 backdrop-blur">
        <div className="px-8 pt-6 pb-5">
          <Link
            to="/recruiter/evaluations/$id/workspace"
            params={{ id }}
            search={{ tab: "candidates" }}
            className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {ev.title} · Candidates
          </Link>

          <div className="mt-5 flex justify-between gap-6">
            <div className="flex flex-col min-w-0 items-start gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar name={candidate.name} hue={candidate.avatarHue} size="xl" />
                  <h1 className="text-[26px] font-medium leading-tight text-white">
                    {candidate.name}
                  </h1>
                  <StatusPill s={decision} />
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-neutral-300">
                  <button
                    onClick={() => copy(candidate.email, "Email")}
                    className="inline-flex items-center gap-1.5 hover:text-white"
                  >
                    <Mail className="h-3.5 w-3.5 text-neutral-500" /> {candidate.email}
                  </button>
                  <button
                    onClick={() => copy(candidate.phone, "Phone")}
                    className="inline-flex items-center gap-1.5 hover:text-white"
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
                  icon={<StickyNote className="h-3.5 w-3.5" />}
                  onClick={() => setTab("notes")}
                >
                  Add Note
                </SecondaryAction>
              </div>
            </div>
          </div>
        </div>
      </header>
      <nav className="mt-6 flex flex-wrap items-center gap-1 px-8 max-w-[1440px] mx-auto">
        {(
          [
            "overview",
            "labs",
            "assessment",
            "vitarka",
            "resume",
            "timeline",
            "notes",
            "activity",
            "proctoring",
          ] as Tab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 px-3 py-2 text-[13px] transition ${tab === t ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            {tabLabel(t)}
            {tab === t && <span className="absolute inset-x-3 -bottom-[13px] h-px bg-white" />}
          </button>
        ))}
      </nav>
      <hr className="border-neutral-200" />
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {tab === "overview" && (
            <OverviewPane
              candidate={candidate}
              detail={detail}
              onGotoLabs={() => setTab("labs")}
              onGotoVit={() => setTab("vitarka")}
            />
          )}
          {tab === "labs" && <LabsPane ev={ev} candidate={candidate} onOpen={setOpenLab} />}
          {tab === "assessment" && <AssessmentPane ev={ev} candidate={candidate} />}
          {tab === "vitarka" && (
            <VitarkaPane
              detail={detail}
              onDownload={() => {
                act("download", "Downloaded Vitarka transcript");
                notify("Transcript downloaded");
              }}
            />
          )}
          {tab === "proctoring" && <CandidateAnalyticsViewer candidate={candidate} evaluation={ev} />}
          {tab === "resume" && (
            <ResumePane candidate={candidate} detail={detail} onDownload={downloadResume} />
          )}
          {tab === "timeline" && <TimelinePane events={timelineEvents} detail={detail} isDemo={id.startsWith("7700") || id.startsWith("demo")} />}
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

        <StickySidebar
          candidate={candidate}
          detail={detail}
          decision={decision}
          onDecision={doDecision}
          onAction={(l) => {
            act("action", l);
            notify(l);
          }}
          onCompare={() => notify("Compare workspace coming next")}
        />
      </main>

      {openLab && <LabDrawer data={openLab} evaluationId={id} onClose={() => setOpenLab(null)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-[12px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ============ Tabs ============

function OverviewPane({
  candidate,
  detail,
  onGotoLabs,
  onGotoVit,
}: {
  candidate: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
  onGotoLabs: () => void;
  onGotoVit: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* ECI premium card */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent">
        <div className="flex flex-wrap items-center gap-6 p-6">
          <RadialScore value={candidate.eci} />
          <div className="min-w-[180px]">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">
              Engineering Capability
            </div>
            <div className="mt-1 text-[24px] font-medium text-white">
              {ecIVerdict(candidate.eci)}
            </div>
            <div className="mt-0.5 text-[13px] text-neutral-400">
              Recommendation: <span className="text-white">{candidate.recommendation}</span>
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
                  <span className="text-white">{e.contribution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/5 divide-x divide-black/10">
          <SubMetric label="Engineering Labs" value={candidate.labsScore} onClick={onGotoLabs} />
          <SubMetric label="Knowledge Assessment" value={candidate.assessmentScore} />
          <SubMetric
            label="Vitarka Discussion"
            value={candidate.vitarkaScore}
            onClick={onGotoVit}
          />
        </div>
      </div>

      {/* Executive summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetaCard
          icon={<UserIcon className="h-3.5 w-3.5" />}
          label="Experience"
          value={candidate.experience === 0 ? "Fresher" : `${candidate.experience} years`}
        />
        <MetaCard
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          label="College"
          value={candidate.college}
        />
        <MetaCard
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Current company"
          value={candidate.company}
        />
        <MetaCard
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Location"
          value={detail.location}
        />
        <MetaCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Completion time"
          value={`${candidate.completionMinutes} minutes`}
        />
        <MetaCard
          icon={<CalendarPlus className="h-3.5 w-3.5" />}
          label="Submitted"
          value={new Date(candidate.submittedAt).toLocaleString()}
        />
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> AI Summary
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-neutral-200">{detail.aiSummary}</p>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ListBlock title="Strengths" items={detail.strengths} tone="good" />
          <ListBlock title="Weaknesses" items={detail.weaknesses} tone="warn" />
        </div>
        <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-widest text-emerald-300/80">
            Recommended next step
          </div>
          <div className="mt-1 text-[14px] text-white">{detail.nextStep}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">
          Skills identified
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.skills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[12px] text-neutral-200"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LabsPane({
  ev,
  candidate,
  onOpen,
}: {
  ev: any;
  candidate: any;
  onOpen: (data: { section: any, labSub: any, candidate: any }) => void;
}) {
  const labSections = ev.sections.filter((s: any) => s.kind === "labs" || s.kind === "lab");
  const allLabs = labSections.flatMap((s: any) => s.labs || []);

  return (
    <div className="space-y-3">
      <SectionHeading>Engineering Labs</SectionHeading>
      {allLabs.map((lab: any, i: number) => {
        const labSub = candidate.rawSubmission?.lab_submissions?.find(
          (s: any) => s.lab_question === lab.id || s.lab_question === lab.lab_id
        );
        const score = labSub?.score ?? 0;
        const timeTaken = labSub?.minutes_solved ?? 0;
        const timeLimit = lab.duration_minutes ?? lab.duration ?? 0;

        return (
          <button
            key={lab.id || i}
            onClick={() => onOpen({ section: lab, labSub, candidate })}
            className="group block w-full rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-[11px] text-neutral-400">
                  L{i + 1}
                </div>
                <div>
                  <div className="text-[15px] font-medium text-white">{lab.title || lab.name || 'Engineering Lab'}</div>
                  <div className="mt-0.5 text-[12px] text-neutral-500">
                    {lab.domain || 'Backend'} · {timeTaken}m of {timeLimit}m
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-[24px] font-medium leading-none ${eciColor(score)}`}>
                    {score}
                    <span className="text-[12px] text-neutral-500">%</span>
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">
                    {labSub?.status === 'in_review' ? 'Needs Review' : (score > 70 ? 'Excellent' : 'Needs Work')}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full ${score >= 70 ? "bg-emerald-400" : score >= 55 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AssessmentPane({ ev, candidate }: { ev: any; candidate: any }) {
  const assessmentSections = ev.sections.filter((s: any) => s.kind === "knowledge" || s.kind === "assessment");
  const [open, setOpen] = useState<string | null>(assessmentSections[0]?.name ?? null);

  return (
    <div className="space-y-3">
      <SectionHeading>Knowledge Assessment</SectionHeading>
      {assessmentSections.map((sub: any) => {
        const isOpen = open === sub.name || open === sub.title;
        const subId = sub.id || sub.section_id;
        const knSub = candidate.rawSubmission?.knowledge_submissions?.find(
          (s: any) => s.section === subId
        );
        
        let score = 0;
        let total = sub.questions?.length || 0;
        
        const mappedQuestions = (sub.questions || []).map((q: any) => {
          const answerRecord = knSub?.answers?.find((a: any) => a.question === q.id);
          const isCorrect = answerRecord?.is_correct ?? false;
          if (isCorrect) score++;
          
          let candidateAnswerText = "Not answered";
          let correctAnswerText = "Unknown";
          
          if (q.format === "Description") {
             candidateAnswerText = answerRecord?.selected_options?.[0] || "Not answered";
             correctAnswerText = "Manual review required";
          } else {
             // Extract text for selected options
             if (answerRecord?.selected_options?.length) {
               candidateAnswerText = answerRecord.selected_options.map((optId: string) => {
                 const foundOpt = q.options?.find((o: any) => o.id === optId);
                 return foundOpt ? foundOpt.text : optId;
               }).join(", ");
             }
             
             // Extract text for correct options
             const correctOptions = q.options?.filter((o: any) => o.is_correct) || [];
             if (correctOptions.length) {
               correctAnswerText = correctOptions.map((o: any) => o.text).join(", ");
             }
          }
          
          return {
             ...q,
             correct: isCorrect,
             candidateAnswer: candidateAnswerText,
             correctAnswer: correctAnswerText,
             seconds: answerRecord?.seconds_spent || 0
          };
        });

        const pct = total > 0 ? Math.round((score / total) * 100) : 0;

        return (
          <div
            key={subId}
            className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]"
          >
            <button
              onClick={() => setOpen(isOpen ? null : (sub.name || sub.title))}
              className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[0.03]"
            >
              <div className="flex-1">
                <div className="text-[15px] font-medium text-white">{sub.title || sub.name}</div>
                <div className="mt-0.5 text-[12px] text-neutral-500">
                  {score}/{total} correct · {pct}%
                </div>
              </div>
              <div className="hidden w-40 sm:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
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
                        <div className="mt-1 text-[14px] text-white">{q.text || q.q}</div>
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
                        <div className="mt-1 text-white">{q.candidateAnswer}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[13px]">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                          Correct answer
                        </div>
                        <div className="mt-1 text-white">{q.correctAnswer}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] leading-relaxed text-neutral-400">
                      <span className="text-neutral-500">Explanation — </span>
                      {q.explanation}
                    </p>
                    <div className="mt-2 text-[11px] text-neutral-500">
                      <Clock className="mr-1 inline h-3 w-3" /> {q.seconds}s
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

function VitarkaPane({
  detail,
  onDownload,
}: {
  detail: ReturnType<typeof getCandidateDetail>;
  onDownload: () => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showRecording, setShowRecording] = useState(false);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-baseline justify-between">
          <SectionHeading>Vitarka Engineering Discussion</SectionHeading>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Overall</div>
            <div
              className={`text-[32px] font-medium leading-none ${eciColor(detail.vitarka.overall)}`}
            >
              {detail.vitarka.overall}
              <span className="text-[13px] text-neutral-500">/100</span>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {detail.vitarka.signals.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                {s.label}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <div className={`text-[20px] font-medium ${eciColor(s.score)}`}>{s.score}</div>
                <div className="text-[11px] text-neutral-500">/100</div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full ${s.score >= 70 ? "bg-emerald-400" : s.score >= 55 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> AI summary
        </div>
        <ul className="mt-3 space-y-2 text-[14px] text-neutral-200">
          {detail.vitarka.summary.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 rounded-full bg-emerald-400" /> {s}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <SecondaryAction
            icon={<ScrollText className="h-3.5 w-3.5" />}
            onClick={() => setShowTranscript((v) => !v)}
          >
            {showTranscript ? "Hide" : "View"} Transcript
          </SecondaryAction>
          <SecondaryAction
            icon={<Video className="h-3.5 w-3.5" />}
            onClick={() => setShowRecording((v) => !v)}
          >
            {showRecording ? "Hide" : "View"} Recording
          </SecondaryAction>
          <SecondaryAction icon={<FileDown className="h-3.5 w-3.5" />} onClick={onDownload}>
            Download Transcript
          </SecondaryAction>
          <SecondaryAction icon={<Download className="h-3.5 w-3.5" />} onClick={onDownload}>
            Download Summary
          </SecondaryAction>
        </div>
      </div>

      {showRecording && (
        <div className="rounded-2xl border border-white/5 bg-black/60 p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/10 text-neutral-400">
            <Play className="h-5 w-5" />
          </div>
          <div className="mt-3 text-[13px] text-white">Discussion recording · 14:32</div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Video playback is disabled in demo mode.
          </div>
        </div>
      )}

      {showTranscript && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500">Transcript</div>
          <div className="mt-4 space-y-4">
            {detail.vitarka.transcript.map((l, i) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResumePane({
  candidate,
  detail,
  onDownload,
}: {
  candidate: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
  onDownload: () => void;
}) {
  const [full, setFull] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeading>Resume</SectionHeading>
        <div className="flex gap-2">
          <SecondaryAction
            icon={<Maximize2 className="h-3.5 w-3.5" />}
            onClick={() => setFull(true)}
          >
            Open Full Screen
          </SecondaryAction>
          <SecondaryAction icon={<Download className="h-3.5 w-3.5" />} onClick={onDownload}>
            Download
          </SecondaryAction>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> AI Resume Summary
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-neutral-200">{detail.resume.summary}</p>
      </div>

      <ResumeDoc candidate={candidate} detail={detail} />

      {full && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-6"
          onClick={() => setFull(false)}
        >
          <div className="mx-auto max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-[12px] text-neutral-400">
              <span>Resume · {candidate.name}</span>
              <button
                onClick={() => setFull(false)}
                className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <ResumeDoc candidate={candidate} detail={detail} />
          </div>
        </div>
      )}
    </div>
  );
}

function ResumeDoc({
  candidate,
  detail,
}: {
  candidate: ReturnType<typeof getCandidates>[number];
  detail: ReturnType<typeof getCandidateDetail>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white p-8 text-neutral-800 shadow-2xl">
      <div className="border-b border-neutral-200 pb-4">
        <div className="text-[22px] font-semibold text-neutral-900">{candidate.name}</div>
        <div className="mt-1 text-[12px] text-neutral-500">
          {candidate.email} · {candidate.phone} · {detail.location}
        </div>
      </div>
      <div className="mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Summary
        </div>
        <p className="mt-1 text-[13px] leading-relaxed">{detail.resume.summary}</p>
      </div>
      <div className="mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Experience
        </div>
        <div className="mt-2 space-y-4">
          {detail.resume.experience.map((e, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between">
                <div className="text-[13px] font-medium text-neutral-900">
                  {e.role} · {e.company}
                </div>
                <div className="text-[11px] text-neutral-500">{e.period}</div>
              </div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12px] text-neutral-700">
                {e.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Education
        </div>
        {detail.resume.education.map((ed, i) => (
          <div key={i} className="mt-1 flex items-baseline justify-between text-[12px]">
            <div>
              <span className="font-medium text-neutral-900">{ed.school}</span> — {ed.degree}
            </div>
            <div className="text-neutral-500">{ed.period}</div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Skills
        </div>
        <div className="mt-1 text-[12px] text-neutral-700">{candidate.skills.join(" · ")}</div>
      </div>
    </div>
  );
}

function TimelinePane({ events, detail, isDemo }: { events: TimelineEvent[], detail: ReturnType<typeof getCandidateDetail>, isDemo: boolean }) {
  const displayEvents = events.length > 0 ? events : detail.timeline;
  
  if (displayEvents.length === 0) {
    return (
      <div>
        <SectionHeading>Timeline</SectionHeading>
        <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-sm text-neutral-500">
          No timeline events yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading>Timeline</SectionHeading>
      <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <ol className="relative space-y-5 border-l border-white/10 pl-6">
          {displayEvents.map((t, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[27px] mt-1 grid h-3.5 w-3.5 place-items-center rounded-full border ${t.done ? (t.tone === "warn" ? "border-amber-400 bg-amber-400" : "border-emerald-400 bg-emerald-400") : "border-white/20 bg-neutral-900"}`}
              />
              <div className={`text-[13px] ${t.done ? "text-white" : "text-neutral-500"}`}>
                {t.label}
              </div>
              <div className="text-[11px] text-neutral-500">
                {t.done ? t.time : "pending"}
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
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note. Mention teammates with @, add tags below…"
          className="min-h-[110px] w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-[13px] text-white placeholder-neutral-500 outline-none focus:border-white/25"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={add}
            disabled={!text.trim()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-1.5 text-[12px] font-medium text-white disabled:bg-neutral-100 disabled:text-neutral-400 hover:bg-neutral-800 transition-colors"
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
            <div key={n.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
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

function ActivityPane({ activity }: { activity: ActivityEvent[] }) {
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

function StickySidebar({
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
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Engineering Capability
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <div className={`text-[30px] font-medium ${eciColor(candidate.eci)}`}>
              {candidate.eci}
            </div>
            <div className="text-[12px] text-neutral-500">/100</div>
            <div className="ml-auto">
              <RecBadge r={candidate.recommendation} />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <MiniBar label="Labs" v={candidate.labsScore} />
            <MiniBar label="Assessment" v={candidate.assessmentScore} />
            <MiniBar label="Vitarka" v={candidate.vitarkaScore} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Overall status
          </div>
          <div className="mt-2">
            <StatusPill s={decision} />
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-widest text-neutral-500">
            Next suggested action
          </div>
          <div className="mt-1.5 text-[13px] text-white">{detail.nextStep}</div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
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

// ============ Lab drawer ============

function generateMockLabAttempt(lab: any, labSub: any) {
  return {
    id: lab.id || "mock-id",
    title: lab.title || lab.name || "Engineering Lab",
    domain: lab.domain || "Backend",
    score: labSub?.score ?? 85,
    timeTaken: labSub?.minutes_solved ?? 45,
    timeLimit: lab.duration_minutes ?? lab.duration ?? 60,
    tasksCompleted: 4,
    tasksTotal: 5,
    files: [
      { path: "src/index.ts", changes: 12, kind: "modified" },
      { path: "src/utils.ts", changes: 5, kind: "created" }
    ],
    gitCommits: [
      { sha: "a1b2c3d", message: "Initial commit", time: "10:00 AM" },
      { sha: "e4f5g6h", message: "Fix bug", time: "10:30 AM" }
    ],
    consoleLogs: ["[INFO] Starting app...", "[INFO] App running on port 3000"],
    execOutput: ["Tests passed: 4/5", "Coverage: 80%"],
    problemStatement: lab.description || "Implement a backend service...",
    strengths: ["Good use of types", "Clean architecture"],
    weaknesses: ["Missing some edge case handling"],
    suggestions: ["Add more unit tests"],
    aiVerdict: "Strong",
    timeline: [
      { t: 0, label: "Started" },
      { t: 15, label: "First commit" },
      { t: 45, label: "Submitted" }
    ]
  } as any;
}

function LabDrawer({ data, evaluationId, onClose }: { data: { section: any, labSub: any, candidate: any }; evaluationId: string; onClose: () => void }) {
  const { section, labSub, candidate } = data;
  const lab = generateMockLabAttempt(section, labSub);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-5xl overflow-y-auto border-l border-white/10 bg-neutral-950">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-neutral-950/95 px-6 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">
                {lab.domain} · Engineering lab
              </div>
              <div className="mt-0.5 text-[18px] font-medium text-white">{lab.title}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-[26px] font-medium leading-none ${eciColor(lab.score)}`}>
                  {lab.score}
                  <span className="text-[12px] text-neutral-500">%</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">{lab.aiVerdict}</div>
              </div>
              <button onClick={onClose} className="rounded p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white">
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <Block title="Problem statement">
            <p className="text-[13px] leading-relaxed text-neutral-300">{lab.problemStatement}</p>
          </Block>

          <div className="grid grid-cols-3 gap-2">
            <StatMini label="Time taken" value={`${lab.timeTaken}m`} sub={`of ${lab.timeLimit}m`} />
            <StatMini
              label="Tasks completed"
              value={`${lab.tasksCompleted}/${lab.tasksTotal}`}
              sub={lab.tasksCompleted === lab.tasksTotal ? "All done" : `${lab.tasksTotal - lab.tasksCompleted} missed`}
            />
            <StatMini label="Files changed" value={String(lab.files.length)} sub={`${lab.gitCommits.length} commits`} />
          </div>

          <Block title="Execution timeline">
            <ol className="relative space-y-3 border-l border-white/10 pl-5">
              {lab.timeline.map((t: any, i: number) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="text-[12px] text-white">{t.label}</div>
                  <div className="text-[10px] text-neutral-500">t+{t.t}m</div>
                </li>
              ))}
            </ol>
          </Block>

          <Block title="Submitted code" icon={<FileText className="h-3.5 w-3.5" />}>
            <div className="h-[600px] border border-white/10 rounded-xl overflow-hidden relative">
              <LabSubmissionViewer
                userId={labSub?.user || candidate.rawSubmission?.user?.id?.toString() || candidate.rawSubmission?.user || candidate.id}
                evaluationId={evaluationId}
                lab={section}
                labSub={labSub}
                candidate={candidate}
                onClose={onClose}
              />
            </div>
          </Block>

          <Block title="Git commits" icon={<GitCommit className="h-3.5 w-3.5" />}>
            <div className="space-y-2">
              {lab.gitCommits.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-[12px]"
                >
                  <span className="font-mono text-[10px] text-emerald-300">{c.sha}</span>
                  <div className="flex-1">
                    <div className="text-neutral-200">{c.message}</div>
                    <div className="text-[10px] text-neutral-500">{c.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Console logs" icon={<Terminal className="h-3.5 w-3.5" />}>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-neutral-300">
              {lab.consoleLogs.join("\n")}
            </pre>
          </Block>

          <Block title="Execution output">
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-emerald-200">
              {lab.execOutput.join("\n")}
            </pre>
          </Block>

          <Block title="AI review" icon={<Sparkles className="h-3.5 w-3.5 text-emerald-400" />}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ListBlock title="Strengths" items={lab.strengths} tone="good" />
              <ListBlock title="Weaknesses" items={lab.weaknesses} tone="warn" />
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Suggestions</div>
              <ul className="mt-2 space-y-1 text-[12px] text-neutral-300">
                {lab.suggestions.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </Block>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300/80">Final lab score</div>
            <div className={`mt-1 text-[36px] font-medium ${eciColor(lab.score)}`}>
              {lab.score}
              <span className="text-[14px] text-neutral-500">/100</span>
            </div>
          </div>
        </div>
      </aside>
    </>
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  active?: boolean;
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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition ${colorClasses}`}
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
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-500">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 truncate text-[14px] text-white">{value}</div>
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
  const dot = tone === "good" ? "bg-emerald-400" : "bg-amber-400";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{title}</div>
      <ul className="mt-2 space-y-1.5 text-[13px] text-neutral-200">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-2 h-1 w-1 rounded-full ${dot}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
function SubMetric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="px-4 py-4 text-left transition">
      <div className="text-[10px] uppercase tracking-widest text-black-500">{label}</div>
      <div className="mt-1 text-[22px] font-medium text-black-300">
        {value}
        <span className="text-[11px] text-neutral-500">/100</span>
      </div>
    </button>
  );
}
function RadialScore({ value }: { value: number }) {
  const c = 2 * Math.PI * 42;
  const off = c - (value / 100) * c;
  const stroke = value >= 70 ? "#34d399" : value >= 55 ? "#f59e0b" : "#ef4444";
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
        <div className={`text-[26px] font-medium leading-none ${eciColor(value)}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">of 100</div>
      </div>
    </div>
  );
}
function MiniBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span>{label}</span>
        <span className={eciColor(v)}>{v}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full ${v >= 70 ? "bg-emerald-400" : v >= 55 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
function StatMini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 text-[18px] font-medium text-white">{value}</div>
      <div className="text-[10px] text-neutral-500">{sub}</div>
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
      <div className="mt-3 text-[14px] text-white">{title}</div>
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
function StatusPill({ s }: { s: HiringDecision }) {
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
function Avatar({
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
      className={`grid ${cls} shrink-0 place-items-center rounded-full font-medium text-white`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 60% 40%), hsl(${(hue + 60) % 360} 55% 30%))`,
      }}
    >
      {initials}
    </span>
  );
}

function tabLabel(t: Tab) {
  return t === "labs"
    ? "Engineering Labs"
    : t === "assessment"
      ? "Knowledge Assessment"
      : t === "vitarka"
        ? "Vitarka Discussion"
        : t === "proctoring"
          ? "Proctoring Analytics"
          : t[0].toUpperCase() + t.slice(1);
}
function eciColor(v: number) {
  return v >= 70 ? "text-emerald-300" : v >= 55 ? "text-amber-300" : "text-red-300";
}
function ecIVerdict(v: number) {
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
