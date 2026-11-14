import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { DiffBadge } from "@/components/Badges";
import { ArrowLeft, Search, Zap, Award, Lock } from "lucide-react";
import { useEffect } from "react";
import { useLabSprint } from "./student.lab.$slug";

export const Route = createFileRoute("/student/lab/$slug/sprint/$sprintId")({
  component: SprintPage,
});

function SprintPage() {
  const { slug, sprintId } = useParams({ from: "/student/lab/$slug/sprint/$sprintId" });
  const context = useLabSprint();

  useEffect(() => {
    if (typeof window !== "undefined" && sprintId) {
      try {
        sessionStorage.setItem(`last_sprint_${slug}`, String(sprintId));
      } catch {}
    }
  }, [slug, sprintId]);

  if (!context) {
    return null;
  }

  const {
    lab,
    sprint,
    sprintTickets,
    cols,
    searchQuery,
    setSearchQuery,
    handleTicketClick,
    isLocked,
    meta,
    onUnlock,
  } = context;

  if (!sprint) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-xs">
        <h3 className="text-lg font-semibold">Sprint Not Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The sprint <span className="font-mono text-foreground font-semibold">{sprintId}</span> could not be found in this lab.
        </p>
        <div className="mt-4">
          <Link
            to="/student/lab/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Sprints
          </Link>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="rounded-xl border border-warning/30 bg-card p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">{sprint.name} is Locked</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          {sprint.goal || `Unlock the ${meta.short.toLowerCase()} track to access tickets in this sprint.`}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/student/lab/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Sprints
          </Link>
          <button
            onClick={onUnlock}
            className="inline-flex items-center gap-1.5 rounded-md bg-warning px-4 py-1.5 text-xs font-medium text-warning-foreground hover:opacity-90 cursor-pointer shadow-xs transition"
          >
            <Zap className="h-3.5 w-3.5" />
            Unlock Track ({meta.price})
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          to="/student/lab/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sprints
        </Link>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{sprint.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {sprint.range} · {sprint.goal}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-md border bg-input/40 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {cols.map((c) => {
          const items = sprintTickets.filter((t) => t.status === c.key);
          return (
            <div
              key={c.key}
              className="flex flex-col rounded-xl border bg-card/50 p-3 max-h-[calc(100vh-11rem)]"
            >
              <div className="mb-3 flex items-center justify-between px-1 shrink-0">
                <div className="text-sm font-medium">{c.label}</div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px]">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 overflow-y-auto min-h-0 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {items.length === 0 && (
                  <div className="px-1 py-4 text-[11px] text-muted-foreground">No tickets</div>
                )}
                {items.map((t) => (
                  <div key={t.id}>
                    <Link
                      onClick={handleTicketClick}
                      to="/student/lab/$slug/ticket/$ticketId"
                      params={{ slug: lab.slug || slug, ticketId: t.id }}
                      className="block rounded-lg border bg-card p-3 hover:border-primary/50 transition cursor-pointer shadow-2xs"
                    >
                      <div className="text-sm font-medium leading-snug">{t.title}</div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <DiffBadge value={t.difficulty} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          ⏱ {t.estMin}m · {t.tag}
                        </span>
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Zap className="h-3 w-3" />
                          {t.xp}
                        </span>
                      </div>
                      {t.status === "in_progress" && t.progress != null && (
                        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-info"
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      )}
                      {t.status === "done" && (
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="text-success">✓ Score {t.score}</span>
                          <Award className="h-3.5 w-3.5 text-warning" />
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
