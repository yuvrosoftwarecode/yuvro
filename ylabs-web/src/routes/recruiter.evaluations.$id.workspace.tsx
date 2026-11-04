import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { z } from "zod";
import {
  ChevronLeft,
  ArrowLeft,
  Copy as CopyIcon,
  Mail,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  Eye,
  Users,
  Clock,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  X,
  Check,
  Star,
  TrendingUp,
  Activity,
  ArrowUpRight,
  CircleDot,
  Plus,
  Bookmark,
  ArrowUpDown,
  Filter,
  Sparkles,
  GitCompare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  getEvaluation,
  evaluationTotals,
  saveEvaluation,
  duplicateEvaluation,
  deleteEvaluation,
  Evaluation,
  getEvaluationSubmissions,
  inviteCandidates,
  generateSharedReportLink,
  forceFinishSubmissions,
} from "@/lib/recruiter";
import {
  getCandidates,
  applyFilters,
  emptyFilters,
  activeFilterCount,
  vitarkaLabel,
  experienceBucket,
  completionBucket,
  Candidate,
  CandidateFilters,
  SortKey,
  CandStatus,
  HiringStatus,
  Recommendation,
  VitarkaLabel,
} from "@/lib/recruiterCandidates";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import {
  computeAttentionGroups,
  loadViewed,
  loadNotedSet,
  pushActivity,
  saveDecision,
  type AttentionGroup,
  type HiringDecision,
} from "@/lib/recruiterCandidateDetail";
import { IntelligenceTab } from "@/components/recruiter/IntelligenceTab";
import { SettingsTab } from "@/components/recruiter/SettingsTab";
import { FollowUpsTab } from "@/components/recruiter/FollowUpsTab";
import { CandidateRecordsTab } from "@/components/recruiter/CandidateRecordsTab";
import { FeedbackTab } from "@/components/recruiter/FeedbackTab";
import { CandidateAnalyticsViewer } from "@/components/evaluation/CandidateAnalyticsViewer";

const searchSchema = z.object({
  tab: z
    .enum(["overview", "candidates", "followups", "records", "feedback", "intelligence", "settings"])
    .default("overview")
    .catch("overview"),
  view: z
    .enum(["edit", "preview", "publish", "publish-done"])
    .optional()
    .default("edit")
    .catch("edit"),
});

const TAB_LABELS: Record<
  "overview" | "candidates" | "followups" | "records" | "feedback" | "intelligence" | "settings",
  string
> = {
  overview: "Overview",
  candidates: "Submissions",
  followups: "Follow-ups",
  records: "Candidate Records",
  feedback: "Feedback",
  intelligence: "Hiring Intelligence",
  settings: "Settings",
};

export const Route = createFileRoute("/recruiter/evaluations/$id/workspace")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Evaluation Workspace — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: Workspace,
});

function getMockInterviewId(evaluation: Evaluation | null) {
  const discSec: any = evaluation?.sections?.find(
    (s: any) => s.type === "VITARKA_AI_INTERVIEW" || s.kind === "discussion" || s.kind === "vitarka"
  );
  let mockInterviewId = discSec?.mockInterviewId;
  if (!mockInterviewId && discSec?.description) {
    try {
      mockInterviewId = JSON.parse(discSec.description).mockInterviewId;
    } catch {}
  }
  return mockInterviewId;
}

function Workspace() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const nav = useNavigate();
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [submissions, setSubmissions] = useState<any[] | null>(null);
  const [vitarkaSubmissions, setVitarkaSubmissions] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getEvaluation(id).then((e) => {
      if (!e) nav({ to: "/recruiter/evaluations" });
      else {
        setEv(e);
        getEvaluationSubmissions(e.id).then(setSubmissions).catch(() => setSubmissions([]));

        const mockInterviewId = getMockInterviewId(e);
        if (mockInterviewId) {
          yhubApiAuthUtil
            .get<any[]>(`/interview/submissions/?mock_interview=${mockInterviewId}&ordering=-created_at`)
            .then((res) => {
              if (Array.isArray(res)) setVitarkaSubmissions(res);
            })
            .catch(console.error);
        }
      }
    });
  }, [id, nav]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!ev || submissions === null) return null;

  const candidates = getCandidates(ev.id, submissions, vitarkaSubmissions, ev);
  const totals = evaluationTotals(ev);
  const goto = (t: typeof tab) =>
    nav({ to: "/recruiter/evaluations/$id/workspace", params: { id }, search: { tab: t, view: "edit" } as any });

  const notify = (m: string) => setToast(m);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/evaluation?e=${ev.id}`);
      notify("Public link copied");
    } catch {
      notify("Copy failed");
    }
  };
  const download = (kind: "csv" | "xlsx" | "reports") => {
    const rows = [
      [
        "Candidate",
        "Email",
        "Phone",
        "Total",
        "Labs",
        "Assessment",
        "Vitarka",
        "Status",
        "Hiring",
        "Submitted",
      ],
    ].concat(
      candidates.map((c) => [
        c.name,
        c.email,
        c.phone,
        String(c.totalEarned != null ? c.totalEarned : c.eci),
        String(c.labsScore),
        String(c.assessmentScore),
        String(c.vitarkaScore),
        c.status,
        c.hiringStatus,
        new Date(c.submittedAt).toISOString(),
      ]),
    );
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], {
      type: kind === "xlsx" ? "application/vnd.ms-excel" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.title.replace(/\s+/g, "-")}-${kind}.${kind === "xlsx" ? "xls" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Downloaded ${kind.toUpperCase()}`);
  };
  const emailAll = () => notify("Email queued to invited candidates");
  const onDuplicate = async () => {
    const c = await duplicateEvaluation(ev.id);
    if (c) {
      notify("Evaluation duplicated");
      nav({ to: "/recruiter/evaluations/$id/workspace", params: { id: c.id }, search: { tab: "overview", view: "edit" } as any });
    }
  };
  const onArchive = async () => {
    const c = { ...ev, status: "draft" as const };
    await saveEvaluation(c);
    setEv(c);
    notify("Evaluation archived");
  };
  const onDelete = async () => {
    if (confirm("Delete this evaluation? This cannot be undone.")) {
      await deleteEvaluation(ev.id);
      nav({ to: "/recruiter/evaluations" });
    }
  };


  const refreshSubmissions = async () => {
    if (!ev) return;
    try {
      const subs = await getEvaluationSubmissions(ev.id);
      setSubmissions(subs);
    } catch {
      setSubmissions([]);
    }

    const mockInterviewId = getMockInterviewId(ev);
    if (mockInterviewId) {
      try {
        const vSubs = await yhubApiAuthUtil.get<any[]>(
          `/interview/submissions/?mock_interview=${mockInterviewId}&ordering=-created_at`
        );
        if (Array.isArray(vSubs)) {
          setVitarkaSubmissions(vSubs);
        }
      } catch (err) {
        console.error("Failed to refresh vitarka submissions:", err);
      }
    }
  };

  const handleGenerateReports = async () => {
    if (!ev) return;
    const now = Date.now();
    const evaluationMinutes = totals.minutes;
    const mockInterviewId = getMockInterviewId(ev);

    // 1. Identify all candidates whose start time has exceeded the evaluation duration
    const timeElapsedCandidates = candidates.filter((c) => {
      const startMs = c.startedAt || (c.rawSubmission?.created_at ? new Date(c.rawSubmission.created_at).getTime() : c.submittedAt);
      const elapsedMinutes = (now - startMs) / (1000 * 60);
      return elapsedMinutes > evaluationMinutes;
    });

    if (timeElapsedCandidates.length === 0) {
      const inProgressNotExpired = candidates.filter((c) => {
        const startMs = c.startedAt || (c.rawSubmission?.created_at ? new Date(c.rawSubmission.created_at).getTime() : c.submittedAt);
        const elapsedMinutes = (now - startMs) / (1000 * 60);
        return (!c.rawSubmission?.completed_at || c.status === "In Progress") && elapsedMinutes <= evaluationMinutes;
      });

      if (inProgressNotExpired.length > 0) {
        notify(`${inProgressNotExpired.length} candidate(s) are currently in progress within the time limit (${evaluationMinutes} min).`);
      } else {
        notify("No candidates have exceeded the time limit.");
      }
      return;
    }

    // 2. Out of the candidates who exceeded the time limit, find who needs report generation:
    // Either their main evaluation submission is incomplete OR their Vitarka AI analysis was not generated yet
    const candidatesToProcess = timeElapsedCandidates.filter((c) => {
      const isSubmissionIncomplete = !c.rawSubmission?.completed_at || c.status === "In Progress";
      
      const vSub = c.rawSubmission?.vitarka_submission || vitarkaSubmissions.find((vs: any) =>
        (c.email && (vs.user?.email === c.email || vs.user_email === c.email || vs.candidate_email === c.email)) ||
        (c.realUserId && (vs.user === c.realUserId || vs.user?.id === c.realUserId)) ||
        (c.id && (vs.candidate_id === c.id || vs.candidate_id === String(c.realUserId)))
      );

      const hasVitarkaPendingReport = Boolean(
        vSub && !(vSub.report_bundle || vSub.report || vSub.session_state?.report_bundle || vSub.session_state?.report)
      );

      return isSubmissionIncomplete || hasVitarkaPendingReport;
    });

    if (candidatesToProcess.length === 0) {
      notify("All candidates exceeding the time limit already have reports generated.");
      return;
    }

    setGenerating(true);

    try {
      // Step A: Force finish main evaluation submissions for incomplete ones
      const emailsToFinish = candidatesToProcess
        .filter((c) => !c.rawSubmission?.completed_at || c.status === "In Progress")
        .map((c) => c.email);

      if (emailsToFinish.length > 0) {
        await forceFinishSubmissions(ev.id, emailsToFinish);
      }

      // Step B: For each candidate, if Vitarka session exists and report is pending, trigger generate_report
      if (mockInterviewId) {
        for (const c of candidatesToProcess) {
          let vSub = c.rawSubmission?.vitarka_submission || vitarkaSubmissions.find((vs: any) =>
            (c.email && (vs.user?.email === c.email || vs.user_email === c.email || vs.candidate_email === c.email)) ||
            (c.realUserId && (vs.user === c.realUserId || vs.user?.id === c.realUserId)) ||
            (c.id && (vs.candidate_id === c.id || vs.candidate_id === String(c.realUserId)))
          );

          if (!vSub?.id) {
            try {
              const params = new URLSearchParams();
              params.append("mock_interview", mockInterviewId);
              if (c.email) params.append("email", c.email);
              else if (c.realUserId) params.append("user", c.realUserId);
              params.append("ordering", "-created_at");
              const res = await yhubApiAuthUtil.get<any[]>(`/interview/submissions/?${params.toString()}`);
              if (res && res.length > 0) {
                vSub = res[0];
              }
            } catch (err) {
              console.error("Failed to query Vitarka submission for", c.email, err);
            }
          }

          if (vSub?.id) {
            const hasReport = Boolean(
              vSub.report_bundle || vSub.report || vSub.session_state?.report_bundle || vSub.session_state?.report
            );

            if (!hasReport) {
              const sessionId = vSub.session_id || vSub.interview_session_id;
              if (sessionId) {
                try {
                  await yhubApiAuthUtil.post(`/interviews/${sessionId}/end_interview/`, {});
                } catch {}
              }

              try {
                await yhubApiAuthUtil.post(`/interview/submissions/${vSub.id}/generate_report/`, {});
              } catch (err) {
                console.error("Failed to generate Vitarka report for submission", vSub.id, err);
              }
            }
          }
        }
      }

      // Step C: Refresh both evaluation submissions and Vitarka submissions
      await refreshSubmissions();
      notify(`Generated reports for ${candidatesToProcess.length} candidate(s).`);
    } catch (err) {
      console.error("Failed to generate reports", err);
      notify("Failed to generate reports.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-white backdrop-blur">
        <div className="w-full px-8 pt-6 pb-4">
          <Link
            to="/recruiter/evaluations"
            className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> All evaluations
          </Link>
          <div className="mt-4 flex flex-nowrap items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusBadge status={ev.status} />
                <span className="text-[11px] uppercase tracking-widest text-neutral-500">
                  {ev.domain || "Uncategorized"} · Domain
                </span>
              </div>
              <h1 className="mt-2 text-[32px] font-medium leading-tight tracking-tight text-white">
                {ev.title}
              </h1>
              <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-neutral-500">
                <span>
                  Created <b className="font-normal text-neutral-300">{fmtDate(ev.createdAt)}</b>
                </span>
                <span>
                  Last modified{" "}
                  <b className="font-normal text-neutral-300">{fmtRel(ev.createdAt)}</b>
                </span>
                <span>
                  Created by <b className="font-normal text-neutral-300">{ev.createdBy || "Recruiter"}</b>
                </span>
                <span>
                  Duration <b className="font-normal text-neutral-300">{totals.minutes} min</b>
                </span>
                <span>
                  Marks <b className="font-normal text-neutral-300">{totals.marks}</b>
                </span>

              </dl>
            </div>
          </div>

          {/* Tabs & Actions */}
          <div className="mt-6 flex items-center justify-between">
            <nav className="flex items-center gap-1">
              {(["overview", "candidates", "followups", "records", "feedback"] as const).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => goto(t)}
                    className={`relative whitespace-nowrap px-3 py-2 text-[13px] transition ${tab === t ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    {TAB_LABELS[t]}
                    {tab === t && (
                      <span className="absolute inset-x-3 -bottom-[13px] h-px bg-white" />
                    )}
                  </button>
                ),
              )}
            </nav>
            <div className="flex flex-shrink-0 flex-nowrap items-center gap-2 pb-2">
              <HeaderBtn
                onClick={() => setInviteOpen(true)}
                icon={<Mail className="h-3.5 w-3.5" />}
              >
                Invite Candidates
              </HeaderBtn>
              <HeaderBtn onClick={copyLink} icon={<CopyIcon className="h-3.5 w-3.5" />}>
                Copy Link
              </HeaderBtn>
              <HeaderBtn 
                onClick={handleGenerateReports} 
                icon={<FileText className={`h-3.5 w-3.5 ${generating ? "animate-pulse" : ""}`} />}
              >
                {generating ? "Generating..." : "Generate Reports"}
              </HeaderBtn>

            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-8 py-8">
        {tab === "overview" && (
          <OverviewTab ev={ev} candidates={candidates} onGoto={goto} notify={notify} />
        )}
        {tab === "candidates" && (
          <CandidatesTab evId={ev.id} ev={ev} candidates={candidates} notify={notify} onRefresh={refreshSubmissions} />
        )}
        {tab === "followups" && <FollowUpsTab ev={ev} notify={notify} />}
        {tab === "records" && <CandidateRecordsTab ev={ev} notify={notify} onGotoFollowUps={() => goto("followups")} candidates={candidates} />}
        {tab === "feedback" && <FeedbackTab ev={ev} />}

        {tab === "intelligence" && (
          <IntelligenceTab ev={ev} candidates={candidates} notify={notify} />
        )}
        {tab === "settings" && <SettingsTab ev={ev} notify={notify} onSave={(updatedEv) => setEv(updatedEv)} />}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-[12px] text-white shadow-xl">
          {toast}
        </div>
      )}

      {inviteOpen && (
        <InviteDialog
          evId={ev.id}
          evTitle={ev.title}
          onClose={() => setInviteOpen(false)}
          notify={notify}
        />
      )}
    </div>
  );
}

function InviteDialog({ evId, evTitle, onClose, notify }: { evId: string; evTitle: string; onClose: () => void; notify: (m: string) => void }) {
  const [emailsInput, setEmailsInput] = useState("");
  const [recipients, setRecipients] = useState<Array<{name: string, email: string}>>([]);
  const [nameInput, setNameInput] = useState("");
  const [subject, setSubject] = useState("Invitation to Complete Evaluation");
  const [body, setBody] = useState("Hi {{name}},\n\nYou've been invited to complete the {{evaluation}} evaluation for {{company}}.\n\nGood luck,\nThe hiring team\n\n{{link}}");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleEmailInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();
      addRecipients(emailsInput);
    }
  };

  const addRecipients = (text: string) => {
    const list = text.split(/[\s,]+/).map(e => e.trim()).filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    
    list.forEach(email => {
      if (emailRegex.test(email)) {
        if (!recipients.includes(email)) valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    if (valid.length > 0) {
      setRecipients([...recipients, ...valid]);
    }
    
    if (invalid.length > 0) {
      setError(`Invalid email(s): ${invalid[0]}${invalid.length > 1 ? ` and ${invalid.length - 1} more` : ''}`);
    } else {
      setError("");
    }
    
    setEmailsInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const onSubmit = async () => {
    if (emailsInput.trim()) {
      addRecipients(emailsInput);
    }
    const finalRecipients = emailsInput.trim() && emailRegex.test(emailsInput.trim()) 
      ? Array.from(new Set([...recipients, emailsInput.trim()]))
      : recipients;

    if (!finalRecipients.length) {
      notify("Please enter at least one valid email");
      return;
    }
    setSending(true);
    const res = await inviteCandidates(evId, finalRecipients, subject, body);
    setSending(false);
    if (res) {
      notify(`Invited ${finalRecipients.length} candidate(s)`);
      onClose();
    } else {
      notify("Failed to invite candidates");
    }
  };

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = (ph: string) => {
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      setBody(prev => prev.substring(0, start) + ph + prev.substring(end));
      
      // Move cursor after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + ph.length, start + ph.length);
      }, 0);
    } else {
      setBody(prev => prev + ph);
    }
  };

  const parseTemplateText = (text: string) => {
    return text
      .replace(/{{name}}/g, "Candidate Name")
      .replace(/{{evaluation}}/g, evTitle || "Evaluation")
      .replace(/{{company}}/g, "Yuvro");
  };

  const renderPreviewBody = () => {
    const parsed = parseTemplateText(body);
    const parts = parsed.split(/({{link}})/);
    return (
      <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-300">
        {parts.map((part, i) => {
          if (part === "{{link}}") {
            return (
              <div key={i} className="my-4">
                <a
                  href={`${typeof window !== "undefined" ? window.location.origin : ""}/evaluation/${evId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-[#F5A623] px-6 py-2.5 text-[13px] font-semibold !text-white transition hover:bg-opacity-90 shadow-sm"
                  style={{ color: "#ffffff" }}
                >
                  Start Evaluation
                </a>
              </div>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  const isValid = recipients.length > 0 || (emailsInput.trim() && emailRegex.test(emailsInput.trim()));
  const allEmailsToPreview = [...recipients.map(r => r.email)];
  if (emailsInput.trim() && emailRegex.test(emailsInput.trim()) && !allEmailsToPreview.includes(emailsInput.trim().toLowerCase())) {
    allEmailsToPreview.push(emailsInput.trim());
  }
  const totalCount = allEmailsToPreview.length;
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white text-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5">
        <div>
          <h2 className="text-[20px] font-semibold text-neutral-900">Invite Candidates</h2>
          <p className="mt-1 text-[13px] text-neutral-500">Send personalized evaluation invitations to candidates.</p>
        </div>
        <button onClick={onClose} className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Editor Side */}
        <div className="flex w-full flex-col p-8 md:w-1/2 md:border-r md:border-neutral-200">
          <div className="flex flex-col h-full space-y-6">
            {/* Emails */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-neutral-700">Candidate Emails</label>
              
              <div className="flex gap-2 items-center mb-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Name (Optional)"
                    className="w-1/3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
                  />
                  <input
                    type="text"
                    value={emailsInput}
                    onChange={(e) => setEmailsInput(e.target.value)}
                    onKeyDown={handleEmailInput}
                    placeholder="candidate@example.com"
                    className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
                  />
                  <button onClick={() => addRecipients(emailsInput)} disabled={!emailsInput.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
                    Add
                  </button>
              </div>

              {recipients.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-2">
                    {recipients.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                        <div className="flex flex-col">
                           {r.name && <span className="text-[13px] font-medium text-neutral-900">{r.name}</span>}
                           <span className="text-[12px] text-neutral-500">{r.email}</span>
                        </div>
                        <button onClick={() => removeRecipient(r.email)} className="p-1 text-neutral-400 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
              )}

              <div className="flex items-center justify-between mt-1">
                <div className="text-[12px] text-neutral-500">You can also paste multiple email addresses separated by commas.</div>
                {error && <div className="text-[12px] text-red-500">{error}</div>}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-neutral-700">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 transition-colors"
              />
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col space-y-1.5">
              <label className="text-[13px] font-medium text-neutral-700">Email Body</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={() => insertPlaceholder('{{name}}')} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">+ Name</button>
                <button onClick={() => insertPlaceholder('{{evaluation}}')} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">+ Evaluation</button>
                <button onClick={() => insertPlaceholder('{{company}}')} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">+ Company</button>
                <button onClick={() => insertPlaceholder('{{link}}')} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">+ Link</button>
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full flex-1 resize-none rounded-lg border border-neutral-200 bg-white p-3.5 text-[13px] leading-relaxed text-neutral-900 outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between md:hidden">
            <button onClick={() => setShowPreview(!showPreview)} className="text-[13px] font-medium text-amber-500">
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>
        </div>

        {/* Preview Side */}
        <div className={`w-full flex-col bg-neutral-50 p-8 md:flex md:w-1/2 ${showPreview ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-neutral-500 uppercase tracking-wider">Live Preview</h3>
          </div>
          
          <div className="mt-8 flex-1 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
              <div className="mb-2 flex items-start text-[13px]">
                <span className="w-16 font-medium text-neutral-500 pt-0.5">To:</span>
                <div className="flex-1 text-neutral-700">
                  {showAllRecipients ? (
                    <div className="flex flex-wrap gap-1">
                      {allEmailsToPreview.length > 0 ? allEmailsToPreview.map((r, i) => <span key={i} className="bg-neutral-200/50 px-1.5 py-0.5 rounded text-[12px]">{r}</span>) : "candidate@example.com"}
                      {allEmailsToPreview.length > 1 && (
                        <button onClick={() => setShowAllRecipients(false)} className="text-amber-600 hover:underline text-[12px] px-1 ml-1 font-medium bg-amber-50 rounded">
                          (collapse)
                        </button>
                      )}
                    </div>
                  ) : (
                    <span>
                      {allEmailsToPreview[0] || "candidate@example.com"}
                      {totalCount > 1 && (
                        <button onClick={() => setShowAllRecipients(true)} className="text-amber-600 hover:underline ml-1 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[12px]">
                          (+{totalCount - 1} more)
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center text-[13px]">
                <span className="w-16 font-medium text-neutral-500">Subject:</span>
                <span className="font-semibold text-neutral-900">{parseTemplateText(subject)}</span>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-700">
                {parseTemplateText(body).split(/({{link}})/).map((part, i) => {
                  if (part === "{{link}}") {
                    return (
                      <div key={i} className="my-4">
                        <a
                          href={`${typeof window !== "undefined" ? window.location.origin : ""}/evaluation/${evId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-lg bg-[#F5A623] px-6 py-2.5 text-[13px] font-semibold !text-white transition hover:bg-opacity-90 shadow-sm"
                          style={{ color: "#ffffff" }}
                        >
                          Start Evaluation
                        </a>
                      </div>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-5 bg-white border-t border-neutral-200">
        <button onClick={onClose} className="rounded-lg px-6 py-2.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
          Cancel
        </button>
        <button 
          onClick={onSubmit} 
          disabled={sending || !isValid} 
          className="inline-flex items-center justify-center rounded-lg bg-[#F5A623] px-8 py-2.5 text-[13px] font-semibold !text-white transition-all hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          style={{ color: "#ffffff" }}
        >
          {sending ? "Sending..." : `Send Invites ${totalCount > 0 ? `(${totalCount})` : ''}`}
        </button>
      </div>
    </div>
  );
}

// ============================ OVERVIEW ============================

function OverviewTab({
  ev,
  candidates,
  onGoto,
  notify,
}: {
  ev: Evaluation;
  candidates: Candidate[];
  onGoto: (t: "overview" | "candidates" | "followups" | "records" | "feedback" | "intelligence" | "settings") => void;
  notify: (m: string) => void;
}) {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    import("@/lib/candidateRecords").then((m) => {
      m.fetchCandidateRecords(ev.id).then((res) => {
        if (mounted) setRecords(res);
      });
    });
    return () => { mounted = false; };
  }, [ev.id]);

  const stats = useMemo(() => {
    // 1. Funnel
    const invited = ev.candidatesTotal; 
    const submitted = candidates.filter((c) => c.status === "Submitted").length;
    const completed = candidates.filter((c) => c.status === "Completed").length;
    const inProgress = candidates.filter((c) => c.status === "In Progress").length;
    const expired = candidates.filter((c) => c.status === "Expired").length;
    const notStarted = Math.max(0, invited - (submitted + completed + inProgress + expired));

    // 2. Hiring Status from candidates (from submissions)
    const pending = candidates.filter((c) => c.hiringStatus === "Pending Review").length;
    const shortlisted = candidates.filter((c) => c.hiringStatus === "Shortlisted").length;
    const interview = candidates.filter((c) => c.hiringStatus === "Interview Scheduled").length;
    const selected = candidates.filter((c) => c.hiringStatus === "Selected").length;
    const rejected = candidates.filter((c) => c.hiringStatus === "Rejected").length;
    
    const submittedList = candidates.filter(
      (c) => c.status === "Submitted" || c.status === "Completed",
    );
    const avgEci = submittedList.length
      ? Math.round(submittedList.reduce((a, c) => a + c.eci, 0) / submittedList.length)
      : 0;
    const avgTime = submittedList.length
      ? Math.round(
          submittedList.reduce((a, c) => a + c.completionMinutes, 0) / submittedList.length,
        )
      : 0;
    return {
      invited,
      submitted,
      completed,
      inProgress,
      notStarted,
      expired,
      pending,
      shortlisted,
      interview,
      selected,
      rejected,
      avgEci,
      avgTime,
    };
  }, [candidates, ev.candidatesTotal]);

  const activity = useMemo(() => buildActivity(candidates), [candidates]);

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Funnel</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label="Invited" value={stats.invited} />
          <MiniStat label="Submitted" value={stats.submitted} />
          <MiniStat label="Completed" value={stats.completed} />
          <MiniStat label="In progress" value={stats.inProgress} />
          <MiniStat label="Not started" value={stats.notStarted} />
          <MiniStat label="Expired" value={stats.expired} tone="muted" />
        </div>
      </section>

      <section>
        <SectionTitle>Hiring status</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:grid-cols-3 lg:grid-cols-5">
          <MiniStat label="Pending review" value={stats.pending} />
          <MiniStat label="Shortlisted" value={stats.shortlisted} />
          <MiniStat label="Interview" value={stats.interview} />
          <MiniStat label="Selected" value={stats.selected} tone="good" />
          <MiniStat label="Rejected" value={stats.rejected} tone="muted" />
        </div>
      </section>

      <section>
        <SectionTitle>Signal</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <BigStat
            label="Avg Engineering Capability Index"
            value={stats.avgEci}
            suffix="/100"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <BigStat
            label="Avg Completion Time"
            value={stats.avgTime}
            suffix=" min"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <BigStat
            label="Avg Evaluation Duration"
            value={evaluationTotals(ev).minutes}
            suffix=" min"
            icon={<Activity className="h-3.5 w-3.5" />}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Recent activity</SectionTitle>
          <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
            {activity.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <CircleDot
                  className={`h-3 w-3 ${a.tone === "good" ? "text-emerald-400" : a.tone === "warn" ? "text-amber-400" : a.tone === "bad" ? "text-red-400" : "text-neutral-500"}`}
                />
                <div className="flex-1 text-[13px] text-neutral-200">{a.text}</div>
                <div className="text-[11px] text-neutral-500">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Next best action</SectionTitle>
          <div className="mt-3 rounded-xl border border-white/5 p-4">
            <div className="text-[13px] text-white">{stats.pending} candidates pending review</div>
            <p className="mt-1 text-[12px] text-neutral-500">
              Review high-signal submissions first to shorten your time to shortlist.
            </p>
            <button
              onClick={() => onGoto("candidates")}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-emerald-400 hover:underline"
            >
              Review candidates <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================ CANDIDATES ============================

const VIEW_KEY = "yuvro-cand-view";
const SAVED_VIEWS_KEY = "yuvro-cand-saved-views";

interface SavedView {
  id: string;
  name: string;
  filters: SerializedFilters;
}
interface SerializedFilters {
  search: string;
  status: string[];
  hiring: string[];
  recommendation: string[];
  eciMin: number | null;
  labsMin: number | null;
  assessMin: number | null;
  vitarka: string[];
  dateRange: string;
  completion: string[];
  experience: string[];
  colleges: string[];
  companies: string[];
  skills: string[];
  tags: string[];
  domains: string[];
}

const DEFAULT_VIEWS: { id: string; name: string; build: () => CandidateFilters }[] = [
  { id: "default", name: "Default", build: () => emptyFilters() },
  {
    id: "needs-review",
    name: "Needs Review",
    build: () => ({ ...emptyFilters(), hiring: new Set(["Pending Review" as HiringStatus]) }),
  },
  {
    id: "strong",
    name: "Strong Candidates",
    build: () => ({
      ...emptyFilters(),
      recommendation: new Set(["Strong Hire", "Hire"] as Recommendation[]),
    }),
  },
  {
    id: "pending",
    name: "Pending",
    build: () => ({
      ...emptyFilters(),
      status: new Set(["In Progress", "Not Started"] as CandStatus[]),
    }),
  },
  {
    id: "selected",
    name: "Selected",
    build: () => ({ ...emptyFilters(), hiring: new Set(["Selected" as HiringStatus]) }),
  },
  {
    id: "rejected",
    name: "Rejected",
    build: () => ({ ...emptyFilters(), hiring: new Set(["Rejected" as HiringStatus]) }),
  },
  {
    id: "interview",
    name: "Interview",
    build: () => ({ ...emptyFilters(), hiring: new Set(["Interview Scheduled" as HiringStatus]) }),
  },
];

// ------- Pipeline definition (Level 1) -------
type PipelineId = "all" | "pending" | "shortlisted" | "rejected" | "hold";
const PIPELINE: { id: PipelineId; label: string; match: (c: Candidate) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  {
    id: "pending",
    label: "Pending Review",
    match: (c) =>
      c.hiringStatus === "Pending Review" && (c.status === "Submitted" || c.status === "Completed"),
  },
  { id: "shortlisted", label: "Shortlisted", match: (c) => c.hiringStatus === "Shortlisted" },
  { id: "rejected", label: "Rejected", match: (c) => c.hiringStatus === "Rejected" },
  { id: "hold", label: "Hold", match: (c) => c.hiringStatus === "Hold" },
];

// ------- Column definitions -------
type ColKey =
  | "candidate"
  | "email"
  | "phone"
  | "labs"
  | "assessment"
  | "vitarka"
  | "system_design"
  | "eci"
  | "recommendation"
  | "submitted"
  | "status";
const ALL_COLS: { key: ColKey; label: string; always?: boolean }[] = [
  { key: "candidate", label: "Candidate", always: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "labs", label: "Engineering Labs", always: true },
  { key: "assessment", label: "Knowledge Assessment", always: true },
  { key: "vitarka", label: "Vitarka", always: true },
  { key: "system_design", label: "System Design", always: true },
  { key: "eci", label: "Total Score", always: true },
  { key: "recommendation", label: "AI Recommendation", always: true },
  { key: "submitted", label: "Submitted On", always: true },
  { key: "status", label: "Review Status", always: true },
];
const DEFAULT_COLS: ColKey[] = [
  "candidate",
  "labs",
  "assessment",
  "vitarka",
  "eci",
  "recommendation",
  "submitted",
  "status",
];
const COLS_KEY = "yuvro-cand-cols-v2";

function CandidatesTab({
  evId,
  ev,
  candidates,
  notify,
  onRefresh,
}: {
  evId: string;
  ev?: Evaluation;
  candidates: Candidate[];
  notify: (m: string) => void;
  onRefresh: () => void;
}) {
  const nav = useNavigate();
  const [filters, setFilters] = useState<CandidateFilters>(emptyFilters());
  const [pipeline, setPipeline] = useState<PipelineId>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"card" | "table">(() =>
    typeof window !== "undefined" ? (localStorage.getItem(VIEW_KEY) as any) || "table" : "table",
  );
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Candidate | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeSavedView, setActiveSavedView] = useState<string | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [noted, setNoted] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sections = ev?.sections || [];
  const hasSections = sections.length > 0;
  const hasLabs = hasSections ? sections.some((s: any) => s.kind === "labs" || s.kind === "lab" || s.type === "LAB" || s.type === "ENGINEERING_LABS") : false;
  const hasAssessment = hasSections ? sections.some((s: any) => s.kind === "assessment" || s.kind === "knowledge" || s.type === "KNOWLEDGE_ASSESSMENT") : false;
  const hasVitarka = hasSections ? sections.some((s: any) => s.kind === "discussion" || s.kind === "vitarka" || s.type === "VITARKA_AI_INTERVIEW") : false;
  const hasSystemDesign = hasSections ? sections.some((s: any) => s.kind === "system_design" || s.type === "SYSTEM_DESIGN") : false;

  const defaultColsSet = useMemo(() => {
    const list: ColKey[] = ["candidate"];
    if (hasLabs) list.push("labs");
    if (hasAssessment) list.push("assessment");
    if (hasVitarka) list.push("vitarka");
    if (hasSystemDesign) list.push("system_design");
    list.push("eci", "recommendation", "submitted", "status");
    return new Set(list);
  }, [hasLabs, hasAssessment, hasVitarka, hasSystemDesign]);

  const [cols, setCols] = useState<Set<ColKey>>(defaultColsSet);

  useEffect(() => {
    setCols(defaultColsSet);
  }, [defaultColsSet]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);
  useEffect(() => {
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify([...cols]));
    } catch {}
  }, [cols]);
  useEffect(() => {
    setViewed(loadViewed(evId));
    setNoted(
      loadNotedSet(
        evId,
        candidates.map((c) => c.id),
      ),
    );
  }, [evId, candidates]);

  // Apply pipeline first (as a lens over the full set), then filters + sort
  const pipelineFn = PIPELINE.find((p) => p.id === pipeline)!.match;
  const pipelineBase = useMemo(() => candidates.filter(pipelineFn), [candidates, pipeline]);
  const filtered = useMemo(
    () => applyFilters(pipelineBase, filters, sort),
    [pipelineBase, filters, sort],
  );

  const pipelineCounts = useMemo(() => {
    const withFilters = (c: Candidate) => applyFilters([c], filters, sort).length === 1;
    return Object.fromEntries(
      PIPELINE.map((p) => [p.id, candidates.filter((c) => p.match(c) && withFilters(c)).length]),
    ) as Record<PipelineId, number>;
  }, [candidates, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  useEffect(() => {
    setPage(1);
  }, [filters, sort, perPage, pipeline]);

  const applySavedView = (id: string) => {
    const saved = savedViews.find((v) => v.id === id);
    if (saved) {
      setFilters(deserializeFilters(saved.filters));
      setActiveSavedView(id);
    }
  };
  const saveCurrentView = () => {
    const name = prompt("Name this view");
    if (!name) return;
    const v: SavedView = {
      id: "u-" + Math.random().toString(36).slice(2, 8),
      name,
      filters: serializeFilters(filters),
    };
    const next = [...savedViews, v];
    setSavedViews(next);
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
    } catch {}
    setActiveSavedView(v.id);
    notify("View saved");
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => (s.size === paged.length ? new Set() : new Set(paged.map((c) => c.id))));
  const openDetails = (c: Candidate) =>
    nav({
      to: "/recruiter/evaluations/$id/candidates/$candidateId",
      params: { id: evId, candidateId: c.id },
      search: { view: "edit" } as any,
    });
    
  const bulk = async (label: string, decision?: HiringDecision) => {
    for (const c of selected) {
      const candidateObj = candidates.find(cand => cand.id === c);
      if (candidateObj?.email) {
        if (decision) {
          await saveDecision(evId, candidateObj.id, candidateObj.email, decision);
        }
        await pushActivity(evId, candidateObj.email, label, `Bulk applied ${label}`);
      }
    }
    notify(`${label} applied to ${selected.size} candidate${selected.size === 1 ? "" : "s"}`);
    setSelected(new Set());
    if (decision) {
      onRefresh();
    }
  };

  const handleRowAction = async (c: Candidate, label: string, decision?: HiringDecision) => {
    if (decision && c.email) {
      await saveDecision(evId, c.id, c.email, decision);
      notify(`${label} applied to ${c.name}`);
      onRefresh();
    } else if (label === "Resume opened") {
      nav({
        to: "/recruiter/evaluations/$id/candidates/$candidateId",
        params: { id: evId, candidateId: c.id },
        search: { view: "edit", tab: "resume" } as any,
      });
    } else if (label === "Note added") {
      nav({
        to: "/recruiter/evaluations/$id/candidates/$candidateId",
        params: { id: evId, candidateId: c.id },
        search: { view: "edit", tab: "notes" } as any,
      });
    } else if (label === "Report downloaded") {
      try {
        notify("Generating report PDF...");
        const { getCandidateDetail } = await import("@/lib/recruiterCandidateDetail");
        const { buildEvaluationSummary } = await import("@/lib/evaluationSummary");
        const { downloadCandidateReportPdf } = await import("@/lib/candidateReportPdf");
        
        const detail = getCandidateDetail(c, {
          labsMaxScore: c.labsMaxScore ?? 80,
          assessmentMaxScore: c.assessmentMaxScore ?? 30,
          discussionMaxScore: c.discussionMaxScore ?? 25,
        });
        
        downloadCandidateReportPdf({
          name: c.name,
          email: c.email,
          phone: c.phone,
          college: c.college,
          company: c.company,
          experience: c.experience,
          eci: c.eci,
          recommendation: c.recommendation,
          confidence: detail.confidence,
          labsScore: c.labsScore,
          assessmentScore: c.assessmentScore,
          vitarkaScore: c.vitarkaScore,
          labsMaxScore: c.labsMaxScore ?? 80,
          assessmentMaxScore: c.assessmentMaxScore ?? 30,
          discussionMaxScore: c.discussionMaxScore ?? 25,
          systemDesignScore: c.systemDesignScore,
          systemDesignMaxScore: c.systemDesignMaxScore,
          strengths: detail.strengths,
          weaknesses: detail.weaknesses,
          aiSummary: detail.aiSummary,
          nextStep: detail.nextStep,
          evaluationTitle: ev?.title || "Evaluation Report",
          summary: buildEvaluationSummary(c, hasLabs, hasAssessment, hasVitarka, hasSystemDesign),
        });
        notify("Report downloaded");
      } catch (err) {
        console.error(err);
        notify("Failed to download PDF report");
      }
    } else if (label === "Link copied") {
      try {
        const result = await generateSharedReportLink(evId, c.email, c.rawSubmission?.id || c.id);
        if (result && result.token) {
          const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shared/report/${result.token}`;
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
          } else {
            // Fallback for non-secure contexts
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
          }
          notify("Candidate report link copied");
        } else {
          notify("Failed to generate link");
        }
      } catch (e) {
        console.error(e);
        notify("Failed to copy link");
      }
    } else {
      notify(label);
    }
  };
  const colleges = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.college))).sort(),
    [candidates],
  );
  const companies = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.company))).sort(),
    [candidates],
  );

  const activeChips = useMemo(() => buildActiveChips(filters), [filters]);
  const attention = useMemo(
    () => computeAttentionGroups(candidates, viewed, noted).slice(0, 4),
    [candidates, viewed, noted],
  );

  return (
    <div className="space-y-3">
      {/* Row 1 — Full-width search */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
        <input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search candidates by name, email, phone, company, college or candidate ID..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-9 text-[13px] text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400"
        />
        {filters.search && (
          <button
            onClick={() => setFilters((f) => ({ ...f, search: "" }))}
            className="absolute right-2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Row 2 — Pipeline nav (left) + toolbar actions (right) on a single row */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto">
        <nav className="flex items-center gap-1">
          {PIPELINE.map((p) => {
            const active = pipeline === p.id;
            const count = pipelineCounts[p.id] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => setPipeline(p.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12.5px] transition ${active ? "bg-neutral-900 !text-white dark:bg-white dark:!text-neutral-900 font-medium" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"}`}
              >
                <span>{p.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${active ? "bg-white/20 !text-white dark:bg-black/10 dark:!text-neutral-900" : "bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"}`}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ToolbarBtn
            onClick={() => setDrawerOpen(true)}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            count={activeFilterCount(filters)}
          >
            Advanced Filters
          </ToolbarBtn>
          <SortMenu value={sort} onChange={setSort} />
          <ExportMenu
            candidates={filtered}
            selected={candidates.filter((c) => selected.has(c.id))}
            notify={notify}
          />
        </div>
      </div>

      {/* Active filter chips (only when applied) */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-widest text-neutral-500">Applied</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] text-neutral-800"
            >
              <span className="text-neutral-500">{chip.group}</span>
              <span className="font-medium">{chip.value}</span>
              <button
                onClick={() => setFilters((f) => chip.remove(f))}
                className="ml-0.5 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => {
              setFilters(emptyFilters());
              setActiveSavedView(null);
            }}
            className="text-[11px] font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Subtle divider before table */}
      <div className="border-t border-neutral-200" />

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
          <div className="text-[12px] font-medium text-neutral-900">{selected.size} selected</div>
          <div className="mx-2 h-4 w-px bg-neutral-200" />
          <BulkBtn onClick={() => bulk("Moved to Hold", "Hold")}>Hold</BulkBtn>
          <BulkBtn onClick={() => bulk("Shortlisted", "Shortlisted")}>Shortlist</BulkBtn>
          <BulkBtn onClick={() => bulk("Rejected", "Rejected")}>Reject</BulkBtn>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[11px] text-neutral-500 hover:text-neutral-900"
          >
            Clear
          </button>
        </div>
      )}

      {/* ═════════ LEVEL 5 — Results ═════════ */}
      <div>
        {filtered.length === 0 ? (
          <EmptyState
            hasFilters={activeFilterCount(filters) > 0 || pipeline !== "all"}
            onReset={() => {
              setFilters(emptyFilters());
              setPipeline("all");
            }}
          />
        ) : view === "table" ? (
          <CandidateTable
            rows={paged}
            cols={cols}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleAll}
            allChecked={paged.length > 0 && paged.every((r) => selected.has(r.id))}
            onOpen={openDetails}
            onPreview={setPreview}
            onAction={handleRowAction}
            highlight={filters.search}
            hasLabs={hasLabs}
            hasAssessment={hasAssessment}
            hasVitarka={hasVitarka}
            hasSystemDesign={hasSystemDesign}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((c) => (
              <CandidateCard
                key={c.id}
                c={c}
                selected={selected.has(c.id)}
                onToggle={() => toggleSelect(c.id)}
                onOpen={() => openDetails(c)}
                onPreview={() => setPreview(c)}
                onAction={(l, d) => handleRowAction(c, l, d)}
                hasLabs={hasLabs}
                hasAssessment={hasAssessment}
                hasVitarka={hasVitarka}
                hasSystemDesign={hasSystemDesign}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] text-neutral-600">
          <div>
            Showing <b className="text-neutral-900 tabular-nums">{(page - 1) * perPage + 1}</b>–
            <b className="text-neutral-900 tabular-nums">
              {Math.min(page * perPage, filtered.length)}
            </b>{" "}
            of <b className="text-neutral-900 tabular-nums">{filtered.length.toLocaleString()}</b>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Per page</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(parseInt(e.target.value))}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-neutral-800 outline-none focus:border-neutral-400"
              >
                {[25, 50, 100, 250, 500].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-neutral-800 disabled:opacity-30 hover:bg-neutral-50"
              >
                Prev
              </button>
              <div className="px-2 tabular-nums">
                Page {page} / {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-neutral-800 disabled:opacity-30 hover:bg-neutral-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <PreviewPanel
          c={preview}
          onClose={() => setPreview(null)}
          onOpen={() => openDetails(preview)}
        />
      )}

      {/* Advanced Filters drawer */}
      <AdvancedFiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        setFilters={setFilters}
        candidates={pipelineBase}
        colleges={colleges}
        companies={companies}
      />
    </div>
  );
}

// -------------- Toolbar building blocks --------------

function ToolbarBtn({
  children,
  onClick,
  icon,
  count,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
    >
      {icon}
      {children}
      {count != null && count > 0 && (
        <span className="ml-0.5 rounded-full bg-neutral-900 px-1.5 py-[1px] text-[10px] font-medium text-white tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

function ColumnsMenu({ cols, setCols }: { cols: Set<ColKey>; setCols: (s: Set<ColKey>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolbarBtn onClick={() => setOpen((v) => !v)} icon={<TableIcon className="h-3.5 w-3.5" />}>
        Columns
      </ToolbarBtn>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
            <div className="border-b border-neutral-100 px-3 py-2 text-[11px] uppercase tracking-widest text-neutral-500">
              Visible columns
            </div>
            <div className="max-h-80 overflow-auto py-1">
              {ALL_COLS.map((c) => {
                const on = cols.has(c.key);
                return (
                  <button
                    key={c.key}
                    disabled={c.always}
                    onClick={() => {
                      const n = new Set(cols);
                      on ? n.delete(c.key) : n.add(c.key);
                      setCols(n);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] ${c.always ? "text-neutral-400" : "text-neutral-800 hover:bg-neutral-50"}`}
                  >
                    <span
                      className={`grid h-4 w-4 place-items-center rounded border ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span>{c.label}</span>
                    {c.always && (
                      <span className="ml-auto text-[10px] text-neutral-400">required</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2 text-[11px]">
              <button
                onClick={() => setCols(new Set(DEFAULT_COLS))}
                className="text-neutral-600 hover:text-neutral-900"
              >
                Reset
              </button>
              <button onClick={() => setOpen(false)} className="font-medium text-neutral-900">
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenu({
  candidates,
  selected,
  notify,
}: {
  candidates: Candidate[];
  selected: Candidate[];
  notify: (m: string) => void;
}) {
  const scope = selected.length > 0 ? selected : candidates;
  const label =
    selected.length > 0
      ? `${selected.length} selected`
      : `${candidates.length.toLocaleString()} in view`;

  const doCsv = async (kind: "csv" | "xlsx") => {
    const rows = [
      [
        "Candidate",
        "Email",
        "Phone",
        "Total",
        "Labs",
        "Assessment",
        "Vitarka",
        "Status",
        "Hiring",
        "Submitted",
      ],
    ].concat(
      scope.map((c) => [
        c.name,
        c.email,
        c.phone,
        String(c.totalEarned != null ? c.totalEarned : c.eci),
        String(c.labsScore),
        String(c.assessmentScore),
        String(c.vitarkaScore),
        c.status,
        c.hiringStatus,
        new Date(c.submittedAt).toISOString(),
      ]),
    );
    
    if (kind === "xlsx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Candidates");
      XLSX.writeFile(wb, "candidates.xlsx");
    } else {
      const csv = rows
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "candidates.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
    notify(`Exported ${scope.length} candidates (${kind.toUpperCase()})`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
        <DropdownMenuItem
          onClick={() => doCsv("csv")}
          className="block w-full cursor-pointer px-3 py-2 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50 focus:bg-neutral-50 focus:text-neutral-900 rounded-none border-none outline-none"
        >
          Export as CSV ({label})
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => doCsv("xlsx")}
          className="block w-full cursor-pointer px-3 py-2 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50 focus:bg-neutral-50 focus:text-neutral-900 rounded-none border-none outline-none"
        >
          Export as Excel ({label})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// -------------- Candidate Table (light theme, column-aware) --------------

function highlightText(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-100 px-0.5 text-neutral-900">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function CandidateTable({
  rows,
  cols,
  selected,
  onToggle,
  onToggleAll,
  allChecked,
  onOpen,
  onPreview,
  onAction,
  highlight,
  hasLabs = true,
  hasAssessment = true,
  hasVitarka = true,
  hasSystemDesign = true,
}: {
  rows: Candidate[];
  cols: Set<ColKey>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allChecked: boolean;
  onOpen: (c: Candidate) => void;
  onPreview: (c: Candidate) => void;
  onAction: (c: Candidate, label: string, decision?: HiringDecision) => void;
  highlight?: string;
  hasLabs?: boolean;
  hasAssessment?: boolean;
  hasVitarka?: boolean;
  hasSystemDesign?: boolean;
}) {
  const show = (k: ColKey) => {
    if (k === "labs" && !hasLabs) return false;
    if (k === "assessment" && !hasAssessment) return false;
    if (k === "vitarka" && !hasVitarka) return false;
    if (k === "system_design" && !hasSystemDesign) return false;
    return cols.has(k);
  };

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left text-[12.5px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-neutral-200 text-[10.5px] uppercase tracking-widest text-neutral-500">
            <Th className="w-8">
              <input type="checkbox" checked={allChecked} onChange={onToggleAll} />
            </Th>
            {show("candidate") && <Th className="min-w-[280px]">Candidate</Th>}
            {show("email") && <Th>Email</Th>}
            {show("phone") && <Th>Phone</Th>}
            {show("labs") && <Th className="w-[84px] text-right">Eng. Labs</Th>}
            {show("assessment") && <Th className="w-[104px] text-right">Knowledge</Th>}
            {show("vitarka") && <Th className="w-[84px] text-right">Vitarka</Th>}
            {show("system_design") && <Th className="w-[96px] text-right">Sys. Design</Th>}
            {show("eci") && <Th className="w-[84px] text-right">Total</Th>}
            {show("recommendation") && <Th className="w-[150px]">AI Recommendation</Th>}
            {show("submitted") && <Th className="w-[120px]">Submitted</Th>}
            {show("status") && <Th className="w-[130px]">Review Status</Th>}
            <Th className="w-8"></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              onClick={() => onOpen(c)}
              className={`cursor-pointer border-b border-neutral-100 dark:border-white/5 text-neutral-900 dark:text-neutral-100 transition hover:bg-neutral-50 dark:hover:bg-white/5 ${selected.has(c.id) ? "bg-neutral-50 dark:bg-white/[0.04]" : ""}`}
            >
              <Td onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => onToggle(c.id)}
                />
              </Td>
              {show("candidate") && (
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} hue={c.avatarHue} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-neutral-900">
                        {highlightText(c.name, highlight || "")}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500">
                        {highlightText(c.email, highlight || "")}
                      </div>
                    </div>
                  </div>
                </Td>
              )}
              {show("email") && (
                <Td className="text-neutral-700">{highlightText(c.email, highlight || "")}</Td>
              )}
              {show("phone") && <Td className="text-neutral-700">{c.phone || "—"}</Td>}
              {show("labs") && (
                <Td className="text-right tabular-nums text-neutral-900">
                  <div className="font-medium">{c.labsScore}</div>
                  <div className="text-[10.5px] text-neutral-500">
                    {c.labsMaxScore ? `of ${c.labsMaxScore}` : ""}
                  </div>
                </Td>
              )}
              {show("assessment") && (
                <Td className="text-right tabular-nums text-neutral-900">
                  <div className="font-medium">{c.assessmentScore}</div>
                  <div className="text-[10.5px] text-neutral-500">
                    {c.assessmentMaxScore ? `of ${c.assessmentMaxScore}` : ""}
                  </div>
                </Td>
              )}
              {show("vitarka") && (
                <Td className="text-right tabular-nums text-neutral-900">
                  <div className="font-medium">{c.vitarkaScore}</div>
                  <div className="text-[10.5px] text-neutral-500">
                    {c.discussionMaxScore ? `of ${c.discussionMaxScore}` : ""}
                  </div>
                </Td>
              )}
              {show("system_design") && (
                <Td className="text-right tabular-nums text-neutral-900">
                  <div className="font-medium">{c.systemDesignScore || 0}</div>
                  <div className="text-[10.5px] text-neutral-500">
                    {c.systemDesignMaxScore ? `of ${c.systemDesignMaxScore}` : ""}
                  </div>
                </Td>
              )}
              {show("eci") && (
                <Td className="text-right tabular-nums text-neutral-900">
                  <div className="font-medium">{c.totalEarned != null ? c.totalEarned : c.eci}</div>
                  <div className="text-[10.5px] text-neutral-500">
                    {c.totalPossible ? `of ${c.totalPossible}` : eciLabel(c.eci)}
                  </div>
                </Td>
              )}
              {show("recommendation") && (
                <Td>
                  <NeutralBadge>{c.recommendation}</NeutralBadge>
                </Td>
              )}
              {show("submitted") && <Td className="text-neutral-700">{fmtRel(c.submittedAt)}</Td>}
              {show("status") && (
                <Td>
                  <NeutralBadge>
                    {c.hiringStatus === "Interview Scheduled" ? "Pending Review" : c.hiringStatus}
                  </NeutralBadge>
                </Td>
              )}
              <Td onClick={(e) => e.stopPropagation()}>
                <RowMenu onOpen={() => onOpen(c)} onAction={(l, d) => onAction(c, l, d)} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowMenu({ onOpen, onAction }: { onOpen: () => void; onAction: (l: string, d?: HiringDecision) => void }) {
  const items = [
    { label: "View Candidate", fn: onOpen },
    { label: "Open Resume", fn: () => onAction("Resume opened") },
    { label: "Download Report", fn: () => onAction("Report downloaded") },
    { label: "Shortlist", fn: () => onAction("Shortlisted", "Shortlisted") },
    { label: "Reject", fn: () => onAction("Rejected", "Rejected") },
    { label: "Hold", fn: () => onAction("Moved to Hold", "Hold") },
    { label: "Copy Candidate Link", fn: () => onAction("Link copied") },
    { label: "Add Notes", fn: () => onAction("Note added") },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg">
        {items.map((it) => (
          <DropdownMenuItem
            key={it.label}
            onClick={(e) => {
              e.stopPropagation();
              it.fn();
            }}
            className="block w-full cursor-pointer px-3 py-2 text-left text-[12.5px] text-neutral-800 hover:bg-neutral-50 focus:bg-neutral-50 focus:text-neutral-900 rounded-none border-none outline-none"
          >
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CandidateCard({
  c,
  selected,
  onToggle,
  onOpen,
  onPreview,
  onAction,
  hasLabs = true,
  hasAssessment = true,
  hasVitarka = true,
  hasSystemDesign = true,
}: {
  c: Candidate;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onPreview: () => void;
  onAction: (l: string, d?: HiringDecision) => void;
  hasLabs?: boolean;
  hasAssessment?: boolean;
  hasVitarka?: boolean;
  hasSystemDesign?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white transition ${selected ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-300"}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1" />
          <button onClick={onPreview} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2.5">
              <Avatar name={c.name} hue={c.avatarHue} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-neutral-900">{c.name}</div>
                <div className="truncate text-[11px] text-neutral-500">
                  {c.company} · {experienceBucket(c.experience)}
                </div>
              </div>
            </div>
          </button>
          <RecBadge r={c.recommendation} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-1 text-[11px] text-neutral-600">
          <span className="truncate">{c.email}</span>
          <span className="truncate text-right">{c.phone || "—"}</span>
        </dl>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {hasLabs && <MiniScore label="Labs" v={c.labsScore} />}
          {hasAssessment && <MiniScore label="Assess" v={c.assessmentScore} />}
          {hasVitarka && <MiniScore label="Vitarka" v={c.vitarkaScore} />}
          {hasSystemDesign && <MiniScore label="Sys Design" v={c.systemDesignScore || 0} />}
          <MiniScore label="Total" v={c.totalEarned != null ? c.totalEarned : c.eci} highlight />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-600">
          <span>{fmtRel(c.submittedAt)}</span>
          <StatusChip h={c.hiringStatus} compact />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-3 py-2 text-[11px]">
        <button
          onClick={() => onAction("Resume opened")}
          className="text-neutral-700 hover:text-neutral-900 hover:underline"
        >
          Resume
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPreview}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-neutral-800 hover:bg-neutral-100"
          >
            Preview
          </button>
          <button
            onClick={onOpen}
            className="rounded-md bg-neutral-900 px-2 py-1 text-white hover:bg-neutral-800"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniScore({ label, v, highlight }: { label: string; v: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-2 ${highlight ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-neutral-50"}`}
    >
      <div
        className={`text-[9px] uppercase tracking-widest ${highlight ? "text-white/70" : "text-neutral-500"}`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 text-[14px] font-medium tabular-nums ${highlight ? "text-white" : "text-neutral-900"}`}
      >
        {v}
      </div>
    </div>
  );
}

type SectionId = "status" | "hiring" | "rec" | "perf" | "background" | "dates" | "tags";
const DRAWER_OPEN_KEY = "yuvro-drawer-open-section";

function AdvancedFiltersDrawer({
  open,
  onClose,
  filters,
  setFilters,
  candidates,
  colleges,
  companies,
}: {
  open: boolean;
  onClose: () => void;
  filters: CandidateFilters;
  setFilters: (f: CandidateFilters | ((p: CandidateFilters) => CandidateFilters)) => void;
  candidates: Candidate[];
  colleges: string[];
  companies: string[];
}) {
  const [openSection, setOpenSection] = useState<SectionId>(() => {
    if (typeof window === "undefined") return "status";
    try {
      return (localStorage.getItem(DRAWER_OPEN_KEY) as SectionId) || "status";
    } catch {
      return "status";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DRAWER_OPEN_KEY, openSection);
    } catch {}
  }, [openSection]);

  // Local staged copy for calm interaction; applies on Apply
  const [local, setLocal] = useState<CandidateFilters>(filters);
  useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const setL = (patch: Partial<CandidateFilters> | ((p: CandidateFilters) => CandidateFilters)) => {
    setLocal((prev) =>
      typeof patch === "function" ? (patch as any)(prev) : { ...prev, ...patch },
    );
  };

  const reset = () => setLocal(emptyFilters());
  const apply = () => {
    setFilters(local);
    onClose();
  };

  const localMatchCount = useMemo(() => applyFilters(candidates, local, "newest").length, [candidates, local]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-neutral-900/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Refine</div>
            <div className="text-[16px] font-medium text-neutral-900">Advanced filters</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <DrawerSection
            id="status"
            title="Candidate Status"
            open={openSection === "status"}
            onToggle={setOpenSection}
            count={local.status.size}
          >
            <CheckGrid
              options={["Submitted", "Completed", "In Progress", "Not Started", "Expired"]}
              value={local.status}
              onChange={(v) => setL({ status: v as any })}
            />
          </DrawerSection>
          <DrawerSection
            id="hiring"
            title="Hiring Pipeline"
            open={openSection === "hiring"}
            onToggle={setOpenSection}
            count={local.hiring.size}
          >
            <CheckGrid
              options={[
                "Pending Review",
                "Shortlisted",
                "Interview Scheduled",
                "Selected",
                "Rejected",
                "Hold",
              ]}
              value={local.hiring}
              onChange={(v) => setL({ hiring: v as any })}
            />
          </DrawerSection>
          <DrawerSection
            id="rec"
            title="AI Recommendation"
            open={openSection === "rec"}
            onToggle={setOpenSection}
            count={local.recommendation.size}
          >
            <CheckGrid
              options={["Strong Hire", "Hire", "Maybe", "Reject"]}
              value={local.recommendation}
              onChange={(v) => setL({ recommendation: v as any })}
            />
          </DrawerSection>
          <DrawerSection
            id="perf"
            title="Performance"
            open={openSection === "perf"}
            onToggle={setOpenSection}
            count={
              (local.eciMin != null ? 1 : 0) +
              (local.labsMin != null ? 1 : 0) +
              (local.assessMin != null ? 1 : 0) +
              local.vitarka.size
            }
          >
            <ScoreRow
              label="Total Score"
              value={local.eciMin}
              onChange={(v) => setL({ eciMin: v })}
            />
            <ScoreRow
              label="Engineering Labs"
              value={local.labsMin}
              onChange={(v) => setL({ labsMin: v })}
            />
            <ScoreRow
              label="Knowledge Assessment"
              value={local.assessMin}
              onChange={(v) => setL({ assessMin: v })}
            />
            <div className="mt-3 text-[11px] uppercase tracking-widest text-neutral-500">
              Vitarka Discussion
            </div>
            <div className="mt-1">
              <CheckGrid
                options={["Excellent", "Good", "Average", "Poor"]}
                value={local.vitarka}
                onChange={(v) => setL({ vitarka: v as any })}
              />
            </div>
          </DrawerSection>
          <DrawerSection
            id="background"
            title="Background"
            open={openSection === "background"}
            onToggle={setOpenSection}
            count={local.experience.size + local.colleges.size + local.companies.size}
          >
            <SubLabel>Experience Level</SubLabel>
            <CheckGrid
              options={["Fresher", "1-3 Years", "3-5 Years", "5-8 Years", "8+"]}
              value={local.experience}
              onChange={(v) => setL({ experience: v })}
            />
            <SubLabel>College / University</SubLabel>
            <SearchableList
              options={colleges}
              value={local.colleges}
              onChange={(v) => setL({ colleges: v })}
              placeholder="Search colleges"
            />
            <SubLabel>Current Company</SubLabel>
            <SearchableList
              options={companies}
              value={local.companies}
              onChange={(v) => setL({ companies: v })}
              placeholder="Search companies"
            />
            <SubLabel>Skills</SubLabel>
            <CheckGrid
              options={[
                "Java",
                "Python",
                "SQL",
                "React",
                "Node",
                "AWS",
                "Docker",
                "Spring Boot",
                "TypeScript",
                "Go",
              ]}
              value={local.skills}
              onChange={(v) => setL({ skills: v })}
            />
            <SubLabel>Domain</SubLabel>
            <CheckGrid
              options={["Finance", "Insurance", "Retail", "Healthcare", "EdTech", "Supply Chain"]}
              value={local.domains}
              onChange={(v) => setL({ domains: v })}
            />
          </DrawerSection>
          <DrawerSection
            id="dates"
            title="Dates"
            open={openSection === "dates"}
            onToggle={setOpenSection}
            count={local.dateRange !== "any" ? 1 : 0}
          >
            <SubLabel>Submission Date</SubLabel>
            <CheckGrid
              single
              options={["any", "today", "yesterday", "7d", "30d"]}
              labels={{
                any: "Any time",
                today: "Today",
                yesterday: "Yesterday",
                "7d": "Last 7 days",
                "30d": "Last 30 days",
              }}
              value={new Set([local.dateRange])}
              onChange={(s) => setL({ dateRange: ([...s][0] as any) || "any" })}
            />
            <SubLabel>Completion Duration</SubLabel>
            <CheckGrid
              options={["Below 45 mins", "45-60 mins", "60-90 mins", "Above 90 mins"]}
              value={local.completion}
              onChange={(v) => setL({ completion: v })}
            />
          </DrawerSection>
          <DrawerSection
            id="tags"
            title="Tags"
            open={openSection === "tags"}
            onToggle={setOpenSection}
            count={local.tags.size}
          >
            <CheckGrid
              options={["Priority", "Referral", "Campus", "Fast Track", "Internal"]}
              value={local.tags}
              onChange={(v) => setL({ tags: v })}
            />
          </DrawerSection>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-neutral-100 bg-white px-6 py-4">
          <button
            onClick={reset}
            className="text-[13px] text-neutral-600 hover:text-neutral-900 hover:underline"
          >
            Reset filters
          </button>
          <button
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800"
          >
            Show {localMatchCount ? "matching" : ""} candidates
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] tabular-nums">
              {localMatchCount.toLocaleString()}
            </span>
          </button>
        </footer>
      </aside>
    </>
  );
}

// dryRunCandidates is only referenced to keep TS happy in the drawer button; the real count comes from parent.
const dryRunCandidates: Candidate[] = [];

function DrawerSection({
  id,
  title,
  open,
  onToggle,
  count,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (s: SectionId) => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-100">
      <button
        onClick={() => onToggle(open ? ("" as any) : id)}
        className="flex w-full items-center justify-between px-6 py-3.5 text-left transition hover:bg-neutral-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-neutral-900">{title}</span>
          {count ? (
            <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
              {count}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-6 pb-5 pt-1">{children}</div>}
    </div>
  );
}
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1.5 text-[10.5px] font-medium uppercase tracking-widest text-neutral-500 first:mt-0">
      {children}
    </div>
  );
}
function CheckGrid({
  options,
  value,
  onChange,
  single,
  labels,
}: {
  options: string[];
  value: Set<string>;
  onChange: (v: Set<string>) => void;
  single?: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.has(o);
        return (
          <button
            key={o}
            onClick={() => {
              if (single) return onChange(new Set([o]));
              const n = new Set(value);
              on ? n.delete(o) : n.add(o);
              onChange(n);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"}`}
          >
            {on && <Check className="h-3 w-3" />}
            {labels?.[o] || o}
          </button>
        );
      })}
    </div>
  );
}
function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const opts: (number | null)[] = [null, 60, 70, 80, 90];
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] text-neutral-800">{label}</span>
        <span className="text-[11px] text-neutral-500 tabular-nums">
          {value != null ? `≥ ${value}` : "Any"}
        </span>
      </div>
      <div className="flex gap-1">
        {opts.map((v, i) => (
          <button
            key={i}
            onClick={() => onChange(v)}
            className={`flex-1 rounded-md border px-2 py-1 text-[11px] transition ${value === v ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"}`}
          >
            {v == null ? "Any" : `${v}+`}
          </button>
        ))}
      </div>
    </div>
  );
}
function SearchableList({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: Set<string>;
  onChange: (v: Set<string>) => void;
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const list = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="rounded-lg border border-neutral-200">
      <div className="relative border-b border-neutral-100">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-t-lg bg-transparent py-2 pl-8 pr-2 text-[12.5px] text-neutral-900 placeholder-neutral-400 outline-none"
        />
      </div>
      <div className="max-h-40 overflow-auto py-1">
        {list.slice(0, 50).map((o) => {
          const on = value.has(o);
          return (
            <button
              key={o}
              onClick={() => {
                const n = new Set(value);
                on ? n.delete(o) : n.add(o);
                onChange(n);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-neutral-800 hover:bg-neutral-50"
            >
              <span
                className={`grid h-3.5 w-3.5 place-items-center rounded border ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}
              >
                {on && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className="truncate">{o}</span>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="px-3 py-4 text-center text-[11px] text-neutral-500">No matches</div>
        )}
      </div>
      {value.size > 0 && (
        <div className="border-t border-neutral-100 px-2.5 py-1.5 text-right">
          <button
            onClick={() => onChange(new Set())}
            className="text-[11px] text-neutral-600 hover:text-neutral-900"
          >
            Clear ({value.size})
          </button>
        </div>
      )}
    </div>
  );
}

// -------------- Active filter chips helper --------------
interface ActiveChip {
  key: string;
  group: string;
  value: string;
  remove: (f: CandidateFilters) => CandidateFilters;
}
function buildActiveChips(f: CandidateFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const addSet = (group: string, key: keyof CandidateFilters) => {
    const s = f[key] as Set<string>;
    s.forEach((v) =>
      chips.push({
        key: `${key}:${v}`,
        group,
        value: v,
        remove: (cur) => {
          const n = new Set(cur[key] as Set<string>);
          n.delete(v);
          return { ...cur, [key]: n } as CandidateFilters;
        },
      }),
    );
  };
  addSet("Status", "status");
  addSet("Hiring", "hiring");
  addSet("Recommendation", "recommendation");
  addSet("Vitarka", "vitarka");
  addSet("Experience", "experience");
  addSet("Completion", "completion");
  addSet("College", "colleges");
  addSet("Company", "companies");
  addSet("Skill", "skills");
  addSet("Tag", "tags");
  addSet("Domain", "domains");
  if (f.eciMin != null)
    chips.push({
      key: "eci",
      group: "Total",
      value: `≥ ${f.eciMin}`,
      remove: (c) => ({ ...c, eciMin: null }),
    });
  if (f.labsMin != null)
    chips.push({
      key: "labs",
      group: "Labs",
      value: `≥ ${f.labsMin}`,
      remove: (c) => ({ ...c, labsMin: null }),
    });
  if (f.assessMin != null)
    chips.push({
      key: "assess",
      group: "Assessment",
      value: `≥ ${f.assessMin}`,
      remove: (c) => ({ ...c, assessMin: null }),
    });
  if (f.dateRange !== "any") {
    const labels: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      "7d": "Last 7 days",
      "30d": "Last 30 days",
    };
    chips.push({
      key: "date",
      group: "Submitted",
      value: labels[f.dateRange] || f.dateRange,
      remove: (c) => ({ ...c, dateRange: "any" }),
    });
  }
  return chips;
}

// -------------- Sort --------------

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const opts: [SortKey, string][] = [
    ["newest", "Newest submission"],
    ["oldest", "Oldest submission"],
    ["eci_desc", "Highest Total"],
    ["eci_asc", "Lowest Total"],
    ["labs_desc", "Highest Labs"],
    ["assess_desc", "Highest Assessment"],
    ["vit_desc", "Highest Vitarka"],
    ["fastest", "Fastest completion"],
    ["slowest", "Slowest completion"],
    ["name_asc", "A → Z"],
    ["name_desc", "Z → A"],
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none">
          <ArrowUpDown className="h-3.5 w-3.5" /> {opts.find((o) => o[0] === value)?.[1]}
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
        {opts.map(([k, l]) => (
          <DropdownMenuItem
            key={k}
            onClick={() => onChange(k)}
            className={`block w-full cursor-pointer px-3 py-2 text-left text-[12.5px] rounded-none border-none outline-none ${value === k ? "bg-neutral-50 font-medium text-neutral-900" : "text-neutral-800 hover:bg-neutral-50 focus:bg-neutral-50"}`}
          >
            {l}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// -------------- Preview panel --------------

function PreviewPanel({
  c,
  onClose,
  onOpen,
}: {
  c: Candidate;
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-neutral-950 p-6">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">
            Candidate preview
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={c.name} hue={c.avatarHue} size="lg" />
          <div>
            <div className="text-[18px] font-medium text-white">{c.name}</div>
            <div className="text-[12px] text-neutral-500">
              {c.company} · {experienceBucket(c.experience)}
            </div>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-[12px]">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Email</dt>
            <dd className="text-neutral-200">{c.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Phone</dt>
            <dd className="text-neutral-200">{c.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">College</dt>
            <dd className="max-w-[60%] truncate text-neutral-200">{c.college}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Domain</dt>
            <dd className="text-neutral-200">{c.domain}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Submitted</dt>
            <dd className="text-neutral-200">{fmtDate(c.submittedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Completion</dt>
            <dd className="text-neutral-200">{c.completionMinutes} min</dd>
          </div>
        </dl>

        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">
            Total Score
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-[36px] font-medium text-white">{c.totalEarned != null ? c.totalEarned : c.eci}</div>
            <div className="text-[12px] text-neutral-500">/{c.totalPossible || 100}</div>
            <div className="ml-auto">
              <RecBadge r={c.recommendation} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {c.labsMaxScore ? <ScoreBlock label="Labs" v={c.labsScore} big /> : null}
          {c.assessmentMaxScore ? <ScoreBlock label="Assessment" v={c.assessmentScore} big /> : null}
          {c.discussionMaxScore ? <ScoreBlock label="Vitarka" v={c.vitarkaScore} big /> : null}
        </div>

        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Skills</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-neutral-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 rounded-lg bg-white text-black px-3 py-2 text-[13px] font-medium hover:bg-white/90"
          >
            View full profile
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-[13px] text-neutral-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

// -------------- Small building blocks --------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">{children}</h2>;
}
function HeaderBtn({
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-neutral-200 transition hover:bg-white/5 hover:border-white/20"
    >
      {icon}
      {children}
    </button>
  );
}
function MenuItem({
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
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] ${danger ? "text-red-400 hover:bg-red-500/10" : "text-neutral-200 hover:bg-white/5"}`}
    >
      {icon}
      {children}
    </button>
  );
}
function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "muted";
}) {
  return (
    <div className="bg-neutral-950 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div
        className={`mt-1 text-[22px] font-medium ${tone === "good" ? "text-emerald-300" : tone === "muted" ? "text-neutral-400" : "text-white"}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
function BigStat({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[30px] font-medium text-white">
        {value}
        <span className="text-[14px] text-neutral-500">{suffix}</span>
      </div>
    </div>
  );
}
function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      <span className="h-1 w-1 rounded-full bg-emerald-400" /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
      <span className="h-1 w-1 rounded-full bg-amber-400" /> Draft
    </span>
  );
}
function ViewChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] transition ${active ? "bg-white text-black" : "border border-white/10 text-neutral-300 hover:border-white/20 hover:text-white"}`}
    >
      {children}
    </button>
  );
}
function BulkBtn({
  children,
  onClick,
  danger,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  const cls = danger
    ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
    : accent
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
      : "border-white/10 text-neutral-200 hover:bg-white/5";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${cls}`}
    >
      {children}
    </button>
  );
}
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}
function Td({
  children,
  className = "",
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <td onClick={onClick} className={`px-3 py-2 align-middle ${className}`}>
      {children}
    </td>
  );
}
function ScorePill({ v, bold }: { v: number; bold?: boolean }) {
  return <span className={`text-neutral-900 ${bold ? "font-medium" : ""}`}>{v}</span>;
}
function ScoreBlock({
  label,
  v,
  highlight,
  big,
}: {
  label: string;
  v: number;
  highlight?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-white/5 ${highlight ? "bg-emerald-400/[0.05]" : "bg-black/20"} p-2`}
    >
      <div className="text-[9px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className={`mt-0.5 ${big ? "text-[20px]" : "text-[14px]"} font-medium text-white`}>
        <ScorePill v={v} />
      </div>
    </div>
  );
}
function NeutralBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-900">
      {children}
    </span>
  );
}
function RecBadge({ r }: { r: Recommendation }) {
  return <NeutralBadge>{r}</NeutralBadge>;
}
function StatusChip({ h }: { s?: CandStatus; h: HiringStatus; compact?: boolean }) {
  return <NeutralBadge>{h === "Interview Scheduled" ? "Pending Review" : h}</NeutralBadge>;
}
function eciLabel(v: number): string {
  if (v >= 85) return "Excellent";
  if (v >= 70) return "Good";
  if (v >= 55) return "Average";
  return "Weak";
}
function Avatar({ name, hue, size = "md" }: { name: string; hue: number; size?: "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const cls = size === "lg" ? "h-9 w-9 text-[13px]" : "h-7 w-7 text-[11px]";
  return (
    <span
      className={`grid ${cls} flex-shrink-0 place-items-center rounded-full font-medium text-white`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 60% 40%), hsl(${(hue + 60) % 360} 55% 30%))`,
      }}
    >
      {initials}
    </span>
  );
}
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-neutral-200 text-neutral-500">
        <Users className="h-5 w-5" />
      </div>
      <div className="mt-4 text-[15px] font-medium text-neutral-900">
        {hasFilters ? "No candidates match these filters" : "No candidates yet"}
      </div>
      <div className="mt-1 text-[12px] text-neutral-500">
        {hasFilters
          ? "Try loosening a filter or clearing your search."
          : "Invite candidates from the header to get started."}
      </div>
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-4 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-800 hover:bg-neutral-50"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
function SimplePane({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
      <div className="text-[11px] uppercase tracking-widest text-neutral-500">Coming next</div>
      <div className="mt-2 text-[22px] font-medium text-white">{title}</div>
      <p className="mx-auto mt-3 max-w-md text-[13px] text-neutral-500">{desc}</p>
    </div>
  );
}

// -------------- Helpers --------------

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
function fmtDate(t: number) {
  return new Date(t).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
const getImageUrl = (imgUrl: string | undefined) => {
    if (!imgUrl) return undefined;
    let processedUrl = imgUrl;
    if (processedUrl.includes('minio:9000') || processedUrl.includes('http://minio/')) {
        processedUrl = processedUrl.replace('minio:9000', 'localhost:9100').replace('http://minio/', 'http://localhost:9100/');
    }
    if (processedUrl.startsWith('http')) return processedUrl;
    let cleanPath = processedUrl?.replace(/\\/g, '/');
    if (cleanPath.startsWith('uploads/')) cleanPath = cleanPath.substring('uploads/'.length);
    else if (cleanPath.startsWith('/uploads/')) cleanPath = cleanPath.substring('/uploads/'.length);
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    const baseUrl = (import.meta.env.VITE_BACKEND_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002/api')?.replace(/\/$/, '');
    const rootUrl = baseUrl?.replace(/\/api\/?$/, '');
    return `${rootUrl}/media/${cleanPath}`;
};
function fmtRel(t: number) {
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(t);
}
function serializeFilters(f: CandidateFilters): SerializedFilters {
  return {
    search: f.search,
    status: [...f.status],
    hiring: [...f.hiring],
    recommendation: [...f.recommendation],
    eciMin: f.eciMin,
    labsMin: f.labsMin,
    assessMin: f.assessMin,
    vitarka: [...f.vitarka],
    dateRange: f.dateRange,
    completion: [...f.completion],
    experience: [...f.experience],
    colleges: [...f.colleges],
    companies: [...f.companies],
    skills: [...f.skills],
    tags: [...f.tags],
    domains: [...f.domains],
  };
}
function deserializeFilters(s: SerializedFilters): CandidateFilters {
  return {
    search: s.search,
    status: new Set(s.status as CandStatus[]),
    hiring: new Set(s.hiring as HiringStatus[]),
    recommendation: new Set(s.recommendation as Recommendation[]),
    eciMin: s.eciMin,
    labsMin: s.labsMin,
    assessMin: s.assessMin,
    vitarka: new Set(s.vitarka as VitarkaLabel[]),
    dateRange: s.dateRange as any,
    completion: new Set(s.completion),
    experience: new Set(s.experience),
    colleges: new Set(s.colleges),
    companies: new Set(s.companies),
    skills: new Set(s.skills),
    tags: new Set(s.tags),
    domains: new Set(s.domains),
  };
}
function buildActivity(candidates: Candidate[]) {
  const items: {
    id: string;
    text: string;
    time: string;
    tone: "good" | "warn" | "bad" | "neutral";
    when: number;
  }[] = [];
  const recent = [...candidates].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 40);
  for (const c of recent) {
    if (c.status === "Submitted")
      items.push({
        id: c.id + "s",
        text: `${c.name} submitted the evaluation`,
        time: fmtRel(c.submittedAt),
        tone: "neutral",
        when: c.submittedAt,
      });
    if (c.hiringStatus === "Shortlisted")
      items.push({
        id: c.id + "sh",
        text: `${c.name} was shortlisted`,
        time: fmtRel(c.submittedAt - 5 * 60000),
        tone: "good",
        when: c.submittedAt - 5 * 60000,
      });
    if (c.hiringStatus === "Interview Scheduled")
      items.push({
        id: c.id + "iv",
        text: `${c.name} moved to interview`,
        time: fmtRel(c.submittedAt - 15 * 60000),
        tone: "good",
        when: c.submittedAt - 15 * 60000,
      });
    if (c.status === "Expired")
      items.push({
        id: c.id + "e",
        text: `${c.name}'s invitation expired`,
        time: fmtRel(c.submittedAt),
        tone: "warn",
        when: c.submittedAt,
      });
    if (c.hiringStatus === "Selected")
      items.push({
        id: c.id + "sel",
        text: `${c.name} was selected`,
        time: fmtRel(c.submittedAt - 3600000),
        tone: "good",
        when: c.submittedAt - 3600000,
      });
  }
  return items.sort((a, b) => b.when - a.when);
}

// ============================ ATTENTION ============================

const TONE_MAP: Record<
  AttentionGroup["tone"],
  { ring: string; dot: string; btn: string; glow: string }
> = {
  red: {
    ring: "border-red-400/25 hover:border-red-400/50",
    dot: "bg-red-400",
    btn: "bg-red-400/10 text-red-300 hover:bg-red-400/20",
    glow: "from-red-500/10",
  },
  green: {
    ring: "border-emerald-400/25 hover:border-emerald-400/50",
    dot: "bg-emerald-400",
    btn: "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20",
    glow: "from-emerald-500/10",
  },
  amber: {
    ring: "border-amber-400/25 hover:border-amber-400/50",
    dot: "bg-amber-400",
    btn: "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
    glow: "from-amber-500/10",
  },
};

function AttentionSection({
  candidates,
  viewed,
  noted,
  onApply,
  onOpen,
}: {
  candidates: Candidate[];
  viewed: Set<string>;
  noted: Set<string>;
  onApply: (f: CandidateFilters) => void;
  onOpen: (c: Candidate) => void;
}) {
  const groups = useMemo(
    () => computeAttentionGroups(candidates, viewed, noted),
    [candidates, viewed, noted],
  );
  if (groups.length === 0) return null;

  const applyGroup = (g: AttentionGroup) => {
    const matches = candidates.filter(g.match);
    if (matches.length === 1) return onOpen(matches[0]);
    const f = emptyFilters();
    if (g.id === "awaiting") f.hiring = new Set(["Pending Review"]);
    else if (g.id === "strong") {
      f.recommendation = new Set(["Strong Hire"]);
      f.eciMin = 90;
    } else if (g.id === "gems") {
      f.eciMin = 66;
      f.labsMin = 82;
    } else if (g.id === "expiring") f.status = new Set(["Not Started"]);
    else if (g.id === "comm-code") {
      f.vitarka = new Set(["Excellent"]);
      f.labsMin = null;
    } else if (g.id === "debug") {
      f.labsMin = 90;
    } else if (g.id === "labs-perfect") {
      f.labsMin = 88;
      f.status = new Set(["Submitted", "Completed"]);
    } else if (g.id === "fastest") {
      f.completion = new Set(["Below 45 mins"]);
      f.status = new Set(["Submitted", "Completed"]);
    } else if (g.id === "abandoned") f.status = new Set(["In Progress"]);
    onApply(f);
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Needs your attention
          </div>
          <div className="mt-1 text-[12px] text-neutral-500">
            {groups.length} actionable signal{groups.length === 1 ? "" : "s"} across{" "}
            {candidates.length.toLocaleString()} candidates
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const t = TONE_MAP[g.tone];
          return (
            <div
              key={g.id}
              className={`group relative overflow-hidden rounded-2xl border ${t.ring} bg-white p-5 transition hover:shadow-sm`}
            >
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[24px] leading-none">{g.emoji}</div>
                  <span className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-[28px] font-medium leading-none text-white">{g.count}</div>
                  <div className="text-[12px] text-neutral-400">{g.title}</div>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">{g.description}</p>
                <button
                  onClick={() => applyGroup(g)}
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${t.btn}`}
                >
                  {g.cta} <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


// ============================ ANALYTICS ============================

function AnalyticsTab({ evId, candidates: mockCandidates }: { evId?: string, candidates: Candidate[] }) {
  const [realSubmissions, setRealSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!evId) return;
    setLoading(true);
    getEvaluationSubmissions(evId).then(data => {
      setRealSubmissions(data || []);
      setLoading(false);
    });
  }, [evId]);

  // Map real submissions to the Candidate type our UI expects
  const mappedCandidates = useMemo(() => {
    return realSubmissions.map((sub: any) => {
      const proctoringEvents = sub.proctoring_events || [];
      const generalEvents = sub.general_events || [];
      
      const totalViolations = proctoringEvents.length;
      const tabSwitches = proctoringEvents.filter((e: any) => e.activity_type === "tab_switched").length;
      const copyPastes = proctoringEvents.filter((e: any) => e.activity_type === "copy_detected" || e.activity_type === "paste_detected").length;
      const windowBlurs = proctoringEvents.filter((e: any) => e.activity_type === "window_blur").length;

      const timelineEvents = proctoringEvents.map((e: any) => ({
        time: new Date(e.timestamp).getTime(),
        type: e.activity_type,
        desc: JSON.stringify(e.meta_data) || e.activity_type,
        severity: (e.activity_type.includes("critical") || e.activity_type.includes("new_tab")) ? 3 : 2,
        image_path: getImageUrl(e.image_path),
        screen_path: getImageUrl(e.screen_path)
      }));
      
      const generalTimelineEvents = generalEvents.map((e: any) => ({
        time: new Date(e.timestamp).getTime(),
        type: e.activity_type,
        desc: JSON.stringify(e.meta_data) || e.activity_type,
        severity: 0,
        image_path: getImageUrl(e.image_path),
        screen_path: getImageUrl(e.screen_path)
      }));
      
      const allEvents = [...timelineEvents, ...generalTimelineEvents].sort((a, b) => a.time - b.time);

      const durationMins = sub.duration || (sub.updated_at ? Math.round((new Date(sub.updated_at).getTime() - new Date(sub.created_at).getTime()) / 60000) : 0);
      const subScore = sub.score || sub.total_score || 0;

      return {
        id: String(sub.id),
        name: sub.user ? `${sub.user.first_name} ${sub.user.last_name}` : "Unknown Candidate",
        email: sub.user ? sub.user.email : "",
        phone: "", college: "", company: "", experience: 0, domain: "", skills: [], tags: [],
        labsScore: subScore, assessmentScore: 0, vitarkaScore: 0, eci: subScore,
        recommendation: "Hold" as Recommendation,
        status: "Completed" as CandStatus,
        hiringStatus: "Pending Review" as HiringStatus,
        submittedAt: new Date(sub.completed_at || sub.created_at).getTime(),
        completionMinutes: durationMins,
        rawSubmission: sub,
        avatarHue: 0,
        proctoringData: {
          totalViolations,
          tabSwitches,
          copyPastes,
          windowBlurs,
          snapshots: [], // For now we rely on the timeline events
          timelineEvents: allEvents,
          sections: {
            labs: { score: subScore, timeSpent: durationMins, events: allEvents.filter(e => e.severity > 0) },
            assessment: { score: 0, timeSpent: 0, events: [] },
            vitarka: { score: 0, timeSpent: 0, events: [] },
            system_design: { score: 0, timeSpent: 0, events: [] }
          }
        }
      } as Candidate;
    });
  }, [realSubmissions]);

  // Fallback to mock candidates if real backend returns none (for demo purposes)
  const displayCandidates = loading ? [] : (mappedCandidates.length > 0 ? mappedCandidates : mockCandidates.filter(c => c.status === "Submitted" || c.status === "Completed"));

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  if (selectedCandidate) {
    return (
      <div className="flex flex-col gap-4 min-h-[700px] h-full">
        <button onClick={() => setSelectedCandidate(null)} className="self-start flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition group mb-2">
           <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to candidates
        </button>
        <div className="flex-1 min-w-0">
          <CandidateAnalyticsViewer candidate={selectedCandidate} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-[700px] h-full">
      <div className="mb-2">
        <h2 className="text-sm font-medium text-white flex items-center gap-2 uppercase tracking-wider">
          <Users className="h-4 w-4 text-emerald-400" /> Submitted Candidates
        </h2>
        <p className="text-xs text-neutral-500 mt-1">Select a candidate to view their detailed performance and proctoring analytics. {loading && "(Loading...)"}</p>
      </div>
      <div className="flex flex-col gap-3">
        {displayCandidates.map(c => {
           const v = c.proctoringData?.totalViolations || 0;
           return (
             <button 
               key={c.id} 
               onClick={() => setSelectedCandidate(c)}
               className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-emerald-500/30 transition flex items-center justify-between gap-4"
             >
               <div className="flex-1 min-w-0">
                 <div className="text-sm text-white font-medium truncate">{c.name}</div>
                 <div className="text-xs text-neutral-500 truncate">{c.email}</div>
               </div>
               <div className="flex items-center gap-6 shrink-0">
                  <div className="text-[11px] text-neutral-400 text-right">
                    <div>Score</div>
                    <div className="text-white font-medium text-sm">{c.eci}</div>
                  </div>
                  <div className={`text-xs font-medium px-3 py-1.5 rounded-md ${v > 4 ? 'bg-red-500/10 text-red-400' : v > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {v} Violations
                  </div>
               </div>
             </button>
           )
        })}
      </div>
    </div>
  )
}

