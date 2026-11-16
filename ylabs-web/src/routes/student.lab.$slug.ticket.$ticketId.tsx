import {
  createFileRoute,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { getSystemDesignLab } from "@/lib/systemDesign";
import { SystemDesignStudio } from "@/routes/system-design-studio";
import { getLab } from "@/lib/adminLabs";
import React, { useState, useEffect } from "react";
import { tickets } from "@/lib/dummy";
import {
  TicketIDE,
  getCandidatePort,
  adaptStartupCommandPort,
  findTaskExecutionResult,
  formatTaskMessage,
  formatTaskTitle,
  getSolutionsFromTicket,
  normalizeSolutions,
  SolutionPanel,
  type StudentPreviewOverride,
} from "@/components/vitarka-ide";

export {
  TicketIDE,
  getCandidatePort,
  adaptStartupCommandPort,
  findTaskExecutionResult,
  formatTaskMessage,
  formatTaskTitle,
  getSolutionsFromTicket,
  normalizeSolutions,
  SolutionPanel,
  type StudentPreviewOverride,
};

type TicketSearch = {
  preview?: string;
  from?: string;
};

export const Route = createFileRoute("/student/lab/$slug/ticket/$ticketId")({
  validateSearch: (search: Record<string, unknown>): TicketSearch => ({
    preview: typeof search.preview === "string" ? search.preview : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  component: TicketEditorRoute,
});

function TicketEditorRoute() {
  const location = useLocation();
  const isReview = location.pathname.endsWith("/review");

  if (isReview) {
    return null;
  }

  return <TicketEditorContent />;
}

function TicketEditorContent() {
  const { slug, ticketId } = useParams({ from: "/student/lab/$slug/ticket/$ticketId" });
  const [previewOverride, setPreviewOverride] = useState<StudentPreviewOverride | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "1") return;
    try {
      const raw = sessionStorage.getItem("__adminPreviewTicket");
      if (raw) setPreviewOverride(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [ticketId]);

  return <StudentTicketView slug={slug} ticketId={ticketId} previewOverride={previewOverride} />;
}

export function StudentTicketView(props: {
  slug: string;
  ticketId: string;
  previewOverride?: StudentPreviewOverride | null;
}) {
  const [labType, setLabType] = useState<string | null>(null);

  useEffect(() => {
    if (getSystemDesignLab(props.slug)) {
      setLabType("SYSTEM_DESIGN");
      return;
    }
    let active = true;
    getLab(props.slug)
      .then((lab) => {
        if (active && lab?.type) {
          setLabType(lab.type);
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [props.slug]);

  if (
    getSystemDesignLab(props.slug) ||
    labType === "SYSTEM_DESIGN" ||
    props.slug.toLowerCase().includes("system-design") ||
    props.slug.toLowerCase().includes("systemdesign")
  ) {
    return (
      <SystemDesignStudio
        key={`${props.slug}:${props.ticketId}`}
        slug={props.slug}
        ticketId={props.ticketId}
        taskOverride={props.previewOverride ?? undefined}
      />
    );
  }

  return <CodeTicketView {...props} />;
}

function CodeTicketView({
  slug,
  ticketId,
  previewOverride,
}: {
  slug: string;
  ticketId: string;
  previewOverride?: StudentPreviewOverride | null;
}) {
  const [resolvedTicket, setResolvedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setResolvedTicket(null);

    const dummyTicket = tickets.find((t) => t.id === ticketId);
    if (dummyTicket) {
      setResolvedTicket(dummyTicket);
      setLoading(false);
      return;
    }

    let active = true;
    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      api
        .get<any>(`/lab/tickets/${ticketId}/`)
        .then((t) => {
          if (!active) return;
          setResolvedTicket({
            ...t,
            id: t.id,
            ticket_slug: t.ticket_slug,
            title: t.title,
            description: t.description ?? "",
            difficulty:
              t.difficulty === "HARD"
                ? "Advanced"
                : t.difficulty === "MEDIUM"
                  ? "Intermediate"
                  : "Beginner",
            xp: t.yuvro_points ?? 100,
            estMin: t.minutes_max ?? 30,
            tag: t.accepted_programming_languages?.[0] ?? t.tag ?? "",
            status: "in_progress",
            startup_command: t.startup_command || t.scoring_rules?.startup_command || "",
            test_command: t.test_command || t.scoring_rules?.test_command || "",
            starter_path: t.starter_path || t.starterPath || t.scoring_rules?.starter_path || t.scoring_rules?.starterPath || "",
            starterPath: t.starter_path || t.starterPath || t.scoring_rules?.starter_path || t.scoring_rules?.starterPath || "",
            connection_url: t.connection_url || t.uri || "",
            uri: t.connection_url || t.uri || "",
            databases: t.databases || [],
            ticket_type: t.ticket_type || t.type,
            type: t.type || t.ticket_type,
            domain: t.domain,
            backend_frameworks: t.backend_frameworks || [],
            programming_languages: t.programming_languages || t.accepted_programming_languages || [],
            sprint_id: t.sprint ?? null,
            sprintOrder: t.sprint_order !== undefined && t.sprint_order !== null ? (t.sprint_order === 0 ? 1 : t.sprint_order) : 1,
            ticketOrder: t.order_index !== undefined && t.order_index !== null ? (t.order_index === 0 ? 1 : t.order_index) : 1,
            tasks: Array.isArray(t.tasks) ? t.tasks.map((task: any) => {
              if (typeof task === "object" && task.title && !task.task_slug) {
                const slugMatch = task.title.match(/Task (\d+\.\d+\.\d+)/i);
                if (slugMatch) task.task_slug = `task-${slugMatch[1].replace(/\./g, "-")}`;
              }
              return task;
            }) : [],
            learning_objectives: Array.isArray(t.learning_objectives) ? t.learning_objectives : [],
            common_mistakes: Array.isArray(t.common_mistakes) ? t.common_mistakes : [],
            hints: Array.isArray(t.hints) ? t.hints : [],
            scoring_rules: t.scoring_rules || {},
            solution: t.solution || {},
          });
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            setResolvedTicket(tickets[0]);
            setLoading(false);
          }
        });
    });
    return () => {
      active = false;
    };
  }, [ticketId]);

  if (loading || !resolvedTicket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        <span className="text-sm">Loading ticket…</span>
      </div>
    );
  }

  if (
    resolvedTicket &&
    (resolvedTicket.type === "SYSTEM_DESIGN" ||
      resolvedTicket.ticket_type === "SYSTEM_DESIGN" ||
      resolvedTicket.tag === "System Design")
  ) {
    return (
      <SystemDesignStudio
        key={`${slug}:${ticketId}`}
        slug={slug}
        ticketId={ticketId}
        taskOverride={{
          title: previewOverride?.title ?? resolvedTicket.title,
          description: previewOverride?.description ?? resolvedTicket.description,
        }}
      />
    );
  }

  const ticket = previewOverride
    ? {
      ...resolvedTicket,
      title: previewOverride.title ?? resolvedTicket.title,
      description: previewOverride.description ?? resolvedTicket.description,
      difficulty: (previewOverride.difficulty as any) ?? resolvedTicket.difficulty,
      xp: previewOverride.xp ?? resolvedTicket.xp,
      estMin: previewOverride.estMin ?? resolvedTicket.estMin,
      tag: previewOverride.tag ?? resolvedTicket.tag,
    }
    : resolvedTicket;

  return <TicketIDE slug={slug} ticket={ticket} previewOverride={previewOverride ?? null} />;
}
