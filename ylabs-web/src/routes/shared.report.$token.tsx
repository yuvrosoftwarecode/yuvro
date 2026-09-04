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
  type TimelineEvent,
} from "@/lib/recruiterCandidateDetail";
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
        const cands = getCandidates(data.evaluation.id, [data.submission]);
        const hydratedCand = cands[0];
        
        setCandidate({
          ...hydratedCand,
          rawSubmission: data.submission
        });
        
        if (data.timelineEvents) {
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

  const detail = getCandidateDetail(candidate);
  const hasLabs = ev?.sections?.some((s: any) => s.kind === "labs" || s.kind === "lab");
  const hasAssessment = ev?.sections?.some((s: any) => s.kind === "assessment" || s.kind === "knowledge");
  const hasVitarka = ev?.sections?.some((s: any) => s.kind === "discussion" || s.kind === "vitarka");

  const tabsToDisplay: Tab[] = ["overview"];
  if (hasLabs) tabsToDisplay.push("labs");
  if (hasAssessment) tabsToDisplay.push("assessment");
  if (hasVitarka) tabsToDisplay.push("vitarka");
  tabsToDisplay.push("resume", "timeline");
  // Omitting proctoring, notes, and activity for the public view.

  return (
    <div className={`min-h-screen ${isLightMode ? "recruiter-theme bg-[#fdfdfb]" : "bg-[#0a0a0b] text-white"}`}>
      {/* Top header */}
      <header className={`border-b backdrop-blur ${isLightMode ? "bg-white border-black/5" : "bg-white/[0.02] border-white/5"}`}>
        <div className="px-8 pt-6 pb-5">
          <div className="mt-2 flex justify-between gap-6">
            <div className="flex flex-col min-w-0 items-start gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar name={candidate.name} hue={candidate.avatarHue} size="xl" />
                  <h1 className="text-[26px] font-medium leading-tight text-white">
                    {candidate.name}
                  </h1>
                  <StatusPill s={candidate.hiringStatus} />
                  
                  {/* Theme Toggle */}
                  <button
                    onClick={() => setIsLightMode(!isLightMode)}
                    className={`ml-3 flex items-center justify-center rounded-full p-2 transition ${isLightMode ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                    title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  >
                    {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-neutral-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-neutral-500" /> {candidate.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-neutral-500" /> {candidate.phone}
                  </span>
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
            className={`relative shrink-0 px-3 py-2 text-[13px] transition ${tab === t ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            {tabLabel(t)}
            {tab === t && <span className="absolute inset-x-3 -bottom-[13px] h-px bg-white" />}
          </button>
        ))}
      </nav>
      <hr className="border-neutral-200" />
      
      <main className="mx-auto max-w-[1440px] px-8 py-8">
        <div className="w-full">
          {tab === "overview" && (
            <OverviewPane
              candidate={candidate}
              detail={detail}
              onGotoLabs={() => setTab("labs")}
              onGotoVit={() => setTab("vitarka")}
              hasLabs={hasLabs}
              hasAssessment={hasAssessment}
              hasVitarka={hasVitarka}
            />
          )}
          {tab === "labs" && (
            <LabsPane
              ev={ev}
              candidate={candidate}
              onOpen={setOpenLab}
            />
          )}
          {tab === "assessment" && <AssessmentPane ev={ev} candidate={candidate} />}
          {tab === "vitarka" && (
            <VitarkaPane
              detail={detail}
              onDownload={() => {
                alert("Transcript downloaded");
              }}
            />
          )}
          {tab === "resume" && (
            <ResumePane candidate={candidate} detail={detail} onDownload={() => alert("Resume downloaded")} />
          )}
          {tab === "timeline" && <TimelinePane events={timelineEvents} detail={detail} isDemo={false} hasLabs={hasLabs} hasAssessment={hasAssessment} hasVitarka={hasVitarka} />}
        </div>
      </main>

      {openLab && <LabDrawer data={openLab} evaluationId={ev?.id} onClose={() => setOpenLab(null)} />}
    </div>
  );
}
