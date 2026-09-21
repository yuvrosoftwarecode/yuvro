import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Eye,
  Copy,
  Pencil,
  Trash2,
  Clock,
  Users,
  Link2,
} from "lucide-react";
import {
  listEvaluations,
  createEvaluation,
  duplicateEvaluation,
  deleteEvaluation,
  saveEvaluation,
  evaluationTotals,
  Evaluation,
} from "@/lib/recruiter";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";

export const Route = createFileRoute("/recruiter/evaluations/")({
  head: () => ({
    meta: [{ title: "Evaluations — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: EvaluationsList,
});

function EvaluationsList() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const nav = useNavigate();

  const refresh = () => {
    setLoading(true);
    setError(null);
    listEvaluations()
      .then((data) => {
        setEvals(data);
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
    nav({ to: "/recruiter/evaluations/$id", params: { id: e.id }, search: { view: "edit" } });
  };
  const onDuplicate = async (id: string) => {
    const newEval = await duplicateEvaluation(id);
    if (newEval) {
      setEvals((prev) => [newEval, ...prev]);
    }
    refresh();
  };
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const onDelete = async () => {
    if (deleteId) {
      await deleteEvaluation(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Evaluations</h1>
          <p className="mt-1 text-[13px] text-neutral-400">
            {evals.length} total · {evals.filter((e) => e.status === "published").length} live
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-[13px] font-medium text-black transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Create Evaluation
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={refresh} inline className="mt-6" />}

      {loading ? (
        <div className="mt-8">
          <LoadingSkeleton type="cards" count={6} />
        </div>
      ) : evals.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No evaluations yet"
            description="Design your first engineering evaluation in minutes."
            action={{ label: "Create Evaluation", onClick: onCreate, icon: Plus }}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {evals.map((e) => {
            const t = evaluationTotals(e);
            const created = new Date(e.createdAt);
            const rel = relTime(created);
            return (
              <div
                key={e.id}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] transition hover:border-white/15"
              >
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl opacity-0 transition group-hover:opacity-100" />
                <Link
                  to="/recruiter/evaluations/$id/workspace"
                  params={{ id: e.id }}
                  search={{ tab: "overview", view: "edit" } as any}
                  className="block p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                        {e.domain || "Uncategorized"}
                      </div>
                      <div className="mt-1 truncate text-[16px] font-medium text-white">
                        {e.title}
                      </div>
                    </div>
                    <StatusPill status={e.status} />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-[11px]">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="flex items-center gap-1 text-neutral-500">
                        <Clock className="h-3 w-3" /> Duration
                      </div>
                      <div className="mt-1 text-[13px] text-white">{t.minutes} min</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-neutral-500">Marks</div>
                      <div className="mt-1 text-[13px] text-white">{t.marks}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="flex items-center gap-1 text-neutral-500">
                        <Users className="h-3 w-3" /> Candidates
                      </div>
                      <div className="mt-1 text-[13px] text-white">{e.candidatesTotal}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-[11px] text-neutral-500">Created {rel}</div>
                </Link>
                <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <IconBtn
                      title="Preview"
                      onClick={() => {
                        window.open(`/evaluation/workspace?e=${e.id}&preview=true`, '_blank');
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title="Copy Public Link"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/evaluation?e=${e.id}`);
                        setToast("Public link copied to clipboard!");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => onDuplicate(e.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title="Edit"
                      onClick={() =>
                        nav({
                          to: "/recruiter/evaluations/$id",
                          params: { id: e.id },
                          search: { view: "edit" } as any,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                  <div className="flex items-center">
                    <IconBtn title="Delete" onClick={() => setDeleteId(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-[12px] text-white shadow-xl">
          {toast}
        </div>
      )}

      {deleteId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-6 shadow-2xl">
            <h3 className="text-[18px] font-semibold text-white">Delete Evaluation</h3>
            <p className="mt-2 text-[13px] text-neutral-500">
              Are you sure you want to delete this evaluation? This action cannot be undone and will permanently remove all associated candidate data.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-neutral-400 hover:bg-white/5 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="rounded-lg bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-500 hover:bg-red-500/20 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onClick?.();
      }}
      title={title}
      className="rounded-md p-1.5 text-neutral-400 transition hover:bg-white/5 hover:text-white"
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
      <span className="h-1 w-1 rounded-full bg-emerald-400" /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
      <span className="h-1 w-1 rounded-full bg-amber-400" /> Draft
    </span>
  );
}

function relTime(d: Date) {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
