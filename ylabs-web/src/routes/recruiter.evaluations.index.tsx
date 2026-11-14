import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  listEvaluations,
  createEvaluation,
  duplicateEvaluation,
  deleteEvaluation,
  evaluationTotals,
  Evaluation,
} from "@/lib/recruiter";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/recruiter/evaluations/")({
  head: () => ({
    meta: [{ title: "Evaluations — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: EvaluationsList,
});

const sentence = (s: string) => {
  if (!s) return "";
  const cleaned = s.replace(/_/g, " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function relTime(d: Date) {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
        status === "published"
          ? "border-emerald-600/30 text-emerald-600 bg-emerald-50/50"
          : "border-border text-muted-foreground bg-accent/40"
      }`}
    >
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

function EvaluationsList() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const nav = useNavigate();

  const refresh = () => {
    setLoading(true);
    setError(null);
    listEvaluations()
      .then((data) => {
        setEvals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load evaluations list.");
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const onCreate = async () => {
    const e = await createEvaluation();
    nav({ to: "/recruiter/evaluations/$id", params: { id: e.id }, search: { view: "edit" } as any });
  };

  const onDuplicate = async (id: string) => {
    const newEval = await duplicateEvaluation(id);
    if (newEval) {
      setEvals((prev) => [newEval, ...prev]);
      setToast("Evaluation duplicated");
    }
    refresh();
  };

  const onDelete = async () => {
    if (deleteId) {
      setIsDeleting(true);
      try {
        await deleteEvaluation(deleteId);
        setDeleteId(null);
        setToast("Evaluation deleted");
        refresh();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const totalCount = evals.length;
  const publishedCount = evals.filter((e) => e.status === "published").length;
  const draftCount = evals.filter((e) => e.status === "draft").length;

  const filteredEvals = useMemo(() => {
    return evals.filter((e) => {
      if (activeTab === "PUBLISHED" && e.status !== "published") return false;
      if (activeTab === "DRAFT" && e.status !== "draft") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (e.title || "").toLowerCase().includes(q);
        const matchesDomain = (e.domain || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDomain) return false;
      }

      return true;
    });
  }, [evals, activeTab, searchQuery]);

  return (
    <div className="qb-theme min-w-0 px-5 py-8 lg:px-10 bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-8 text-foreground">Evaluations</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {plural(totalCount, "evaluation")} · {publishedCount} live
          </p>
        </div>
        <Button onClick={onCreate} className="rec-btn shrink-0">
          Create evaluation
        </Button>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Evaluation status"
        className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-border"
      >
        {([
          { key: "ALL", label: "All evaluations", count: totalCount },
          { key: "PUBLISHED", label: "Published", count: publishedCount },
          { key: "DRAFT", label: "Drafts", count: draftCount },
        ] as const).map((tab) => (
          <Button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            variant="ghost"
            onClick={() => setActiveTab(tab.key)}
            className={`qb-tab -mb-px h-auto rounded-none border-b-2 px-0 pb-3 pt-0 text-[15px] leading-5 ${
              activeTab === tab.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent font-normal text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      {/* Search Filter */}
      <div className="qb-filters mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search evaluations"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search evaluations by title or domain…"
          className="qb-filter h-10 w-full sm:w-80 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {error && <ErrorState message={error} onRetry={refresh} inline className="mt-6" />}

      {loading ? (
        <LoadingSkeleton type="cards" count={6} />
      ) : filteredEvals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="text-base font-medium text-foreground">
            {evals.length === 0 ? "No evaluations yet" : "No evaluations match your search"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {evals.length === 0
              ? "Design your first engineering evaluation in minutes to assess candidates."
              : "Try adjusting your search query or switching tabs."}
          </p>
          {evals.length === 0 && (
            <Button onClick={onCreate} className="rec-btn mt-4">
              Create evaluation
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredEvals.map((e) => {
            const t = evaluationTotals(e);
            const created = new Date(e.createdAt);
            const rel = relTime(created);

            return (
              <article
                key={e.id}
                className="qb-question-card flex min-w-0 cursor-pointer flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent"
                onClick={() =>
                  nav({
                    to: "/recruiter/evaluations/$id/workspace",
                    params: { id: e.id },
                    search: { tab: "overview", view: "edit" } as any,
                  })
                }
                tabIndex={0}
                aria-label={`Open evaluation: ${e.title}`}
              >
                <div className="flex items-center justify-between text-sm leading-5 text-muted-foreground">
                  <span>{e.domain ? sentence(e.domain) : "Engineering evaluation"}</span>
                  <StatusBadge status={e.status} />
                </div>

                <h3 className="mt-2 break-words text-base font-medium leading-6 text-foreground">{e.title}</h3>

                <div className="mt-2 text-sm leading-5 text-muted-foreground">
                  {t.minutes} min · {plural(t.marks, "mark")} · {plural(e.candidatesTotal || 0, "candidate")}
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border pt-4 text-sm leading-5 text-muted-foreground">
                    <span>Created {rel}</span>

                    <div className="flex gap-4" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="link"
                        className="qb-action"
                        onClick={() => window.open(`/evaluation/workspace?e=${e.id}&preview=true`, "_blank")}
                      >
                        Preview
                      </Button>

                      <Button
                        variant="link"
                        className="qb-action"
                        onClick={() => {
                          const origin = typeof window !== "undefined" ? window.location.origin : "";
                          navigator.clipboard?.writeText(`${origin}/evaluation?e=${e.id}`);
                          setToast("Public link copied to clipboard");
                        }}
                      >
                        Copy link
                      </Button>

                      <Button
                        variant="link"
                        className="qb-action"
                        onClick={() => onDuplicate(e.id)}
                      >
                        Duplicate
                      </Button>

                      <Button
                        variant="link"
                        className="qb-action"
                        onClick={() =>
                          nav({
                            to: "/recruiter/evaluations/$id",
                            params: { id: e.id },
                            search: { view: "edit" } as any,
                          })
                        }
                      >
                        Edit
                      </Button>

                      <Button
                        variant="link"
                        className="qb-action hover:text-destructive"
                        onClick={() => setDeleteId(e.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-foreground px-4 py-2 text-sm text-background shadow-md">
          {toast}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && !isDeleting && setDeleteId(null)}>
        <DialogContent className="recruiter-theme qb-theme qb-dialog sm:max-w-[480px] w-full bg-background border-border text-foreground p-6 rounded-xl">
          <DialogHeader className="p-0 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">Delete evaluation</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Are you sure you want to delete this evaluation? This action cannot be undone and will permanently remove all associated candidate data.
          </p>
          <DialogFooter className="mt-6 flex items-center justify-end gap-3 p-0">
            <Button
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setDeleteId(null)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={onDelete}
              className="rec-btn-danger"
            >
              {isDeleting ? "Deleting…" : "Delete evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
