import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Code2, File, FileCode2, GitCompareArrows, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tickets } from "@/lib/dummy";
import { invalidateStudentStats } from "@/lib/studentStats";
import { parseSolutionPatch } from "@/lib/solutionParser";
import { ShareMilestoneModal } from "@/components/shared/ShareMilestoneModal";

export const Route = createFileRoute("/student/lab/$slug/ticket/$ticketId/review")({
  component: Review,
});

type LocalSubmission = {
  title?: string;
  files?: Record<string, string>;
  starters?: Record<string, string>;
  elapsed?: number;
};

function readSubmission(slug: string, ticketId: string): LocalSubmission | null {
  try {
    const raw = sessionStorage.getItem(`ticket-submission:${slug}:${ticketId}`);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value) return null;
    return value;
  } catch {
    return null;
  }
}

function Source({ content, label }: { content: string; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <pre className="overflow-auto p-4 text-xs leading-6 font-mono max-h-[600px]" aria-label={label}>
        {content ? (
          content.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-4 w-7 shrink-0 select-none text-right text-muted-foreground/70">
                {i + 1}
              </span>
              <code>{line || " "}</code>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground italic">Empty</div>
        )}
      </pre>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
      <span aria-hidden className="h-4 w-1 rounded-full bg-brand-orange" />
      {children}
    </h2>
  );
}

function Review() {
  const { slug, ticketId } = useParams({ from: "/student/lab/$slug/ticket/$ticketId/review" });
  const { from } = Route.useSearch() as any;
  const [lab, setLab] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  const [activeFile, setActiveFile] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);

  const sessionSubmission = useMemo(() => readSubmission(slug, ticketId), [slug, ticketId]);

  useEffect(() => {
    let active = true;
    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      Promise.all([
        api.get<any>(`/lab/tickets/${ticketId}/`).catch(() => null as any),
        api.get<any>(`/lab/labs/${slug}/`).catch(() => null as any),
        api.get<any[]>(`/lab/submissions/?lab_sprint_ticket=${ticketId}`).catch(() => [] as any),
      ])
        .then(([ticketRes, labRes, subsRes]) => {
          if (!active) return;
          const dummyTicket = tickets.find((t) => t.id === ticketId);
          setTicket(ticketRes ?? dummyTicket ?? { id: ticketId, title: "Ticket" });
          setLab((labRes as any)?.data ?? (labRes as any) ?? { name: slug });

          const subsList = Array.isArray(subsRes) ? subsRes : ((subsRes as any)?.data ?? []);
          const sub =
            subsList.find((s: any) => String(s.lab_sprint_ticket) === String(ticketId)) ||
            subsList[0];
          setSubmission(sub);
          setLoading(false);

          try {
            const localKanbanStr = localStorage.getItem(`kanban_${slug}`);
            const kanban = localKanbanStr ? JSON.parse(localKanbanStr) : {};
            kanban[ticketId] = "done";
            localStorage.setItem(`kanban_${slug}`, JSON.stringify(kanban));
          } catch (e) {}

          // Invalidate student stats cache and dispatch update notifications
          invalidateStudentStats();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("yuvro-submission-updated"));
            window.dispatchEvent(
              new CustomEvent("yuvro:ticket_submission_updated", {
                detail: { ticketId, status: "done" },
              })
            );
          }
        })
        .catch((e) => {
          console.error(e);
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [ticketId, slug]);

  const { parsedFiles, fileDiffs } = useMemo(() => {
    if (submission?.solution) {
      const { submittedFiles, fileDiffs } = parseSolutionPatch(submission.solution);
      return { parsedFiles: submittedFiles, fileDiffs };
    }
    return { parsedFiles: {}, fileDiffs: {} };
  }, [submission?.solution]);

  const submittedFiles: Record<string, string> = useMemo(() => {
    if (sessionSubmission?.files && Object.keys(sessionSubmission.files).length > 0) {
      return sessionSubmission.files;
    }
    return parsedFiles;
  }, [sessionSubmission, parsedFiles]);

  const starterFiles: Record<string, string> = useMemo(() => {
    if (sessionSubmission?.starters && Object.keys(sessionSubmission.starters).length > 0) {
      return sessionSubmission.starters;
    }
    const reconstructed: Record<string, string> = {};
    for (const [path, diffs] of Object.entries(fileDiffs as Record<string, { type: "add" | "del" | "same"; text: string }[]>)) {
      if (diffs && diffs.length > 0) {
        reconstructed[path] = diffs
          .filter((d) => d.type === "del" || d.type === "same")
          .map((d) => d.text)
          .join("\n");
      } else {
        reconstructed[path] = submittedFiles[path] || "";
      }
    }
    return reconstructed;
  }, [sessionSubmission, fileDiffs, submittedFiles]);

  const paths = useMemo(() => Object.keys(submittedFiles).sort(), [submittedFiles]);
  const hasFiles = paths.length > 0;

  useEffect(() => {
    if (!activeFile && paths.length > 0) {
      setActiveFile(paths[0]);
    } else if (paths.length > 0 && !paths.includes(activeFile)) {
      setActiveFile(paths[0]);
    }
  }, [paths, activeFile]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-card text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Loading review...</span>
      </div>
    );
  }

  const maxXp = ticket?.yuvro_points ?? ticket?.xp ?? 0;

  let testPercentage = 0;
  if (submission?.solution_output) {
    try {
      const parsed =
        typeof submission.solution_output === "string"
          ? JSON.parse(submission.solution_output)
          : submission.solution_output;
      testPercentage = parsed?.percentage ?? parsed?.total_score ?? 0;
    } catch (e) {}
  }

  const earnedXp =
    submission?.yuvro_points && submission.yuvro_points > 0
      ? submission.yuvro_points
      : testPercentage > 0 && maxXp > 0
        ? Math.round(maxXp * (testPercentage / 100))
        : (submission?.yuvro_points ?? 0);

  const percentage =
    earnedXp > 0 && maxXp > 0
      ? Math.round((earnedXp / maxXp) * 100)
      : testPercentage;

  const isPassed = percentage >= 70;

  const grade =
    percentage >= 90
      ? "A"
      : percentage >= 80
        ? "B"
        : percentage >= 70
          ? "C"
          : percentage >= 60
            ? "D"
            : "F";

  let formattedTime = "N/A";
  if (submission?.minutes_solved) {
    const m = submission.minutes_solved;
    formattedTime = `${m}m`;
  } else if (submission?.seconds_solved) {
    const m = Math.round(submission.seconds_solved / 60);
    formattedTime = `${m}m`;
  } else if (sessionSubmission?.elapsed) {
    const m = Math.round(sessionSubmission.elapsed / 60);
    formattedTime = `${m}m`;
  }

  let parsedOutput: any = null;
  if (submission?.solution_output) {
    try {
      parsedOutput =
        typeof submission.solution_output === "string"
          ? JSON.parse(submission.solution_output)
          : submission.solution_output;
    } catch (e) {}
  }

  const displayTicketId = ticket?.ticket_id || ticket?.id || ticketId;
  const title = sessionSubmission?.title ?? ticket?.title ?? "Ticket review";

  return (
    <div className="min-h-screen bg-card text-card-foreground">
      <main className="w-full px-6 py-6 sm:px-10 sm:py-8">
        <Button asChild variant="ghost" className="-ml-3 text-muted-foreground">
          {from === "report" ? (
            <Link to="/student/lab/$slug/report" params={{ slug }}>
              <ArrowLeft />
              Back to Reports
            </Link>
          ) : (typeof window !== "undefined" && sessionStorage.getItem(`last_sprint_${slug}`)) ? (
            <Link
              to="/student/lab/$slug/sprint/$sprintId"
              params={{ slug, sprintId: sessionStorage.getItem(`last_sprint_${slug}`)! }}
            >
              <ArrowLeft />
              Back to Sprint
            </Link>
          ) : (
            <Link to="/student/lab/$slug" params={{ slug }}>
              <ArrowLeft />
              Back to Lab
            </Link>
          )}
        </Button>
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-2">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {displayTicketId}: {title}
          </h1>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-medium hover:bg-[#0A66C2]/90 shadow-sm transition-colors"
          >
            <Linkedin className="h-3.5 w-3.5 fill-current" />
            Share to LinkedIn
          </button>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)] lg:gap-10">
          <section aria-labelledby="performance-heading">
            <div className="mb-3 flex min-h-9 items-center">
              <SectionHeading id="performance-heading">Performance Summary</SectionHeading>
            </div>
            <dl className="grid grid-cols-2 gap-2.5">
              {[
                {
                  label: "Score",
                  value: `${percentage}%`,
                  tone: isPassed ? "text-emerald-500 dark:text-emerald-400" : "text-red-500",
                },
                {
                  label: "Grade",
                  value: grade,
                  tone: isPassed ? "text-emerald-500 dark:text-emerald-400" : "text-red-500",
                },
                {
                  label: "Time Spent",
                  value: formattedTime,
                  tone: "text-foreground",
                },
                {
                  label: "YP Earned",
                  value: `${earnedXp}/${maxXp}`,
                  tone: "text-foreground",
                },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 rounded-lg bg-primary/[0.06] px-3 py-2.5">
                  <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className={`mt-1 text-lg font-bold tabular-nums ${stat.tone}`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="solution-heading">
            <div className="mb-3 flex items-center justify-between gap-4">
              <SectionHeading id="solution-heading">Submitted Solution</SectionHeading>
              <Button
                variant="outline"
                onClick={() => setShowDiff((value) => !value)}
                aria-pressed={showDiff}
              >
                <GitCompareArrows />
                {showDiff ? "View Files" : "View Diff"}
              </Button>
            </div>
            <div className="grid min-h-[420px] grid-cols-[minmax(150px,220px)_minmax(0,1fr)] overflow-hidden rounded-lg border bg-muted/20">
              <aside className="min-w-0 border-r bg-muted/30" aria-label="Submitted files">
                <h3 className="border-b px-3 py-2.5 text-sm font-semibold">Files</h3>
                {hasFiles ? (
                  <nav className="space-y-1 p-2">
                    {paths.map((path) => (
                      <Button
                        key={path}
                        variant="ghost"
                        onClick={() => setActiveFile(path)}
                        aria-pressed={activeFile === path}
                        className={`h-auto w-full justify-start gap-2 whitespace-normal px-2 py-2 text-left text-xs ${
                          activeFile === path ? "bg-accent" : ""
                        }`}
                      >
                        <FileCode2 className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{path}</span>
                      </Button>
                    ))}
                  </nav>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-3 text-center">
                    <File className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                    <p className="max-w-44 text-sm leading-6 text-muted-foreground">
                      No files were submitted for this ticket.
                    </p>
                  </div>
                )}
              </aside>
              <div className="min-w-0">
                {hasFiles ? (
                  showDiff ? (
                    <div className="grid h-full grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                      <Source label="Original" content={starterFiles[activeFile] ?? ""} />
                      <Source label="Submitted" content={submittedFiles[activeFile] ?? ""} />
                    </div>
                  ) : (
                    <Source label={activeFile} content={submittedFiles[activeFile] ?? ""} />
                  )
                ) : (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-5 text-center">
                    <Code2 className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">
                      No files were submitted for this ticket.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Evaluation Output if available */}
        {submission?.solution_output ? (
          <section aria-labelledby="evaluation-heading" className="mt-8">
            <div className="mb-3 flex min-h-9 items-center">
              <SectionHeading id="evaluation-heading">Evaluation Output</SectionHeading>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4 font-mono text-xs overflow-auto max-h-72">
              <pre className="text-muted-foreground whitespace-pre-wrap">
                {typeof parsedOutput === "object" && parsedOutput !== null
                  ? JSON.stringify(parsedOutput, null, 2)
                  : submission.solution_output}
              </pre>
            </div>
          </section>
        ) : null}
        <ShareMilestoneModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          milestoneTitle={ticket?.title || "Ticket Cleared"}
          milestoneType="ticket"
          details={{
            labTitle: lab?.title || lab?.name || "Practical Labs",
            score: percentage,
            earnedXp: earnedXp,
            tags: lab?.tags || [],
          }}
        />
      </main>
    </div>
  );
}
