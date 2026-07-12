import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Plus, Users, CheckCircle2, Activity, ClipboardList, Sparkles } from "lucide-react";
import { listEvaluations, createEvaluation, Evaluation, evaluationTotals } from "@/lib/recruiter";

export const Route = createFileRoute("/recruiter/")({
  head: () => ({ meta: [{ title: "Recruiter Dashboard — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const nav = useNavigate();
  useEffect(() => { setEvals(listEvaluations()); }, []);

  const total = evals.length;
  const active = evals.filter(e => e.status === "published").length;
  const invited = evals.reduce((a, e) => a + e.candidatesInvited, 0);
  const completed = evals.reduce((a, e) => a + e.candidatesCompleted, 0);

  const onCreate = () => {
    const e = createEvaluation();
    nav({ to: "/recruiter/evaluations/$id", params: { id: e.id } });
  };

  const metrics = [
    { label: "Total Evaluations", value: total, icon: ClipboardList, tone: "from-emerald-400 to-cyan-400" },
    { label: "Active Evaluations", value: active, icon: Activity, tone: "from-cyan-400 to-blue-400" },
    { label: "Candidates Invited", value: invited, icon: Users, tone: "from-violet-400 to-fuchsia-400" },
    { label: "Candidates Completed", value: completed, icon: CheckCircle2, tone: "from-amber-400 to-orange-400" },
  ];

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-neutral-400">
            <Sparkles className="h-3 w-3 text-emerald-400" /> AI-assisted recruiting workspace
          </div>
          <h1 className="mt-4 text-[34px] font-semibold tracking-tight">Good to see you back.</h1>
          <p className="mt-1 text-[14px] text-neutral-400">Design engineering evaluations that feel like real work.</p>
        </div>
        <button onClick={onCreate} className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-[13px] font-medium text-black transition hover:brightness-110">
          <Plus className="h-4 w-4" /> Create Evaluation
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(m => (
          <div key={m.label} className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${m.tone} text-black`}><m.icon className="h-4 w-4" /></div>
            <div className="mt-6 text-[11px] uppercase tracking-widest text-neutral-500">{m.label}</div>
            <div className="mt-1 text-[32px] font-semibold tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <div className="text-[13px] font-medium">Recent Evaluations</div>
            <div className="text-[11px] text-neutral-500">Your latest work — pick up where you left off.</div>
          </div>
          <Link to="/recruiter/evaluations" className="inline-flex items-center gap-1 text-[12px] text-neutral-400 hover:text-white">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        {evals.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-neutral-500">No evaluations yet. Create your first one.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {evals.slice(0, 5).map(e => {
              const t = evaluationTotals(e);
              return (
                <Link key={e.id} to="/recruiter/evaluations/$id" params={{ id: e.id }} className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 px-5 py-4 transition hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] text-white">{e.title}</span>
                      <StatusPill status={e.status} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">{e.domain || "—"} · {t.sections} sections · {t.minutes} min · {t.marks} marks</div>
                  </div>
                  <div className="text-right text-[11px] text-neutral-500">Invited<div className="text-[13px] text-white">{e.candidatesInvited}</div></div>
                  <div className="text-right text-[11px] text-neutral-500">Completed<div className="text-[13px] text-white">{e.candidatesCompleted}</div></div>
                  <ArrowUpRight className="h-4 w-4 text-neutral-500 transition group-hover:text-emerald-400" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
