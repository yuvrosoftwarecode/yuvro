import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Eye, Copy, Pencil, Archive, Trash2, Clock, Users } from "lucide-react";
import { listEvaluations, createEvaluation, duplicateEvaluation, deleteEvaluation, saveEvaluation, evaluationTotals, Evaluation } from "@/lib/recruiter";

export const Route = createFileRoute("/recruiter/evaluations/")({
  head: () => ({ meta: [{ title: "Evaluations — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: EvaluationsList,
});

function EvaluationsList() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const nav = useNavigate();
  const refresh = () => setEvals(listEvaluations());
  useEffect(refresh, []);

  const onCreate = () => {
    const e = createEvaluation();
    nav({ to: "/recruiter/evaluations/$id", params: { id: e.id } });
  };
  const onDuplicate = (id: string) => { duplicateEvaluation(id); refresh(); setMenuFor(null); };
  const onDelete = (id: string) => { if (confirm("Delete this evaluation?")) { deleteEvaluation(id); refresh(); } setMenuFor(null); };
  const onArchive = (id: string) => {
    const e = listEvaluations().find(x => x.id === id); if (!e) return;
    e.status = "draft"; saveEvaluation(e); refresh(); setMenuFor(null);
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Evaluations</h1>
          <p className="mt-1 text-[13px] text-neutral-400">{evals.length} total · {evals.filter(e => e.status === "published").length} live</p>
        </div>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-[13px] font-medium text-black transition hover:brightness-110">
          <Plus className="h-4 w-4" /> Create Evaluation
        </button>
      </div>

      {evals.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-white/10 p-16 text-center">
          <div className="text-[15px] text-white">No evaluations yet</div>
          <div className="mt-1 text-[12px] text-neutral-500">Design your first engineering evaluation in minutes.</div>
          <button onClick={onCreate} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-[12px] text-white hover:bg-white/15"><Plus className="h-3.5 w-3.5" /> Create Evaluation</button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {evals.map(e => {
            const t = evaluationTotals(e);
            const created = new Date(e.createdAt);
            const rel = relTime(created);
            return (
              <div key={e.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] transition hover:border-white/15">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl opacity-0 transition group-hover:opacity-100" />
                <Link to="/recruiter/evaluations/$id/workspace" params={{ id: e.id }} search={{ tab: "overview" }} className="block p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{e.domain || "Uncategorized"}</div>
                      <div className="mt-1 truncate text-[16px] font-medium text-white">{e.title}</div>
                    </div>
                    <StatusPill status={e.status} />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-[11px]">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="flex items-center gap-1 text-neutral-500"><Clock className="h-3 w-3" /> Duration</div>
                      <div className="mt-1 text-[13px] text-white">{t.minutes} min</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-neutral-500">Marks</div>
                      <div className="mt-1 text-[13px] text-white">{t.marks}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="flex items-center gap-1 text-neutral-500"><Users className="h-3 w-3" /> Candidates</div>
                      <div className="mt-1 text-[13px] text-white">{e.candidatesInvited}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-[11px] text-neutral-500">Created {rel}</div>
                </Link>
                <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <IconBtn title="Open workspace" onClick={() => nav({ to: "/recruiter/evaluations/$id/workspace", params: { id: e.id }, search: { tab: "overview" } })}><Eye className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Duplicate" onClick={() => onDuplicate(e.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Edit builder" onClick={() => nav({ to: "/recruiter/evaluations/$id", params: { id: e.id }, search: { view: "edit" } as any })}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                  <div className="relative">
                    <IconBtn title="More" onClick={() => setMenuFor(menuFor === e.id ? null : e.id)}><MoreHorizontal className="h-3.5 w-3.5" /></IconBtn>
                    {menuFor === e.id && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-xl">
                        <button onClick={() => onArchive(e.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-neutral-300 hover:bg-white/5"><Archive className="h-3.5 w-3.5" /> Archive</button>
                        <button onClick={() => onDelete(e.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onClick?.(); }} title={title} className="rounded-md p-1.5 text-neutral-400 transition hover:bg-white/5 hover:text-white">{children}</button>;
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
