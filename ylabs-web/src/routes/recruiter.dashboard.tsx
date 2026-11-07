import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Users,
  CheckCircle2,
  Activity,
  ClipboardList,
  Sparkles,
  Zap,
  FolderGit2,
  ShieldCheck,
} from "lucide-react";
import {
  listEvaluations,
  createEvaluation,
  Evaluation,
  evaluationTotals,
  getRecruiterMyQuota,
  RecruiterQuota,
} from "@/lib/recruiter";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";

export const Route = createFileRoute("/recruiter/dashboard")({
  head: () => ({
    meta: [{ title: "Recruiter Dashboard — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [quota, setQuota] = useState<RecruiterQuota | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([listEvaluations(), getRecruiterMyQuota()])
      .then(([evalData, quotaData]) => {
        setEvals(evalData);
        setQuota(quotaData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard evaluations.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = evals.length;
  const active = evals.filter((e) => e.status === "published").length;
  const invited = evals.reduce((a, e) => a + e.candidatesInvited, 0);
  const completed = evals.reduce((a, e) => a + e.candidatesCompleted, 0);

  const onCreate = async () => {
    const e = await createEvaluation();
    nav({ to: "/recruiter/evaluations/$id", params: { id: e.id } });
  };

  const metrics = [
    {
      label: "Total Evaluations",
      value: total,
      icon: ClipboardList,
      tone: "from-emerald-400 to-cyan-400",
    },
    {
      label: "Active Evaluations",
      value: active,
      icon: Activity,
      tone: "from-cyan-400 to-blue-400",
    },
    {
      label: "Candidates Invited",
      value: invited,
      icon: Users,
      tone: "from-violet-400 to-fuchsia-400",
    },
    {
      label: "Candidates Completed",
      value: completed,
      icon: CheckCircle2,
      tone: "from-amber-400 to-orange-400",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="mt-2 md:mt-4 text-[24px] md:text-[34px] font-semibold tracking-tight">Good to see you back.</h1>
          <p className="mt-1 text-[13px] md:text-[14px] text-neutral-400">
            Design engineering evaluations that feel like real work.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/recruiter/billing"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50 shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-[#F7931E]" /> Manage Plan
          </Link>
          <button
            onClick={onCreate}
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-[13px] font-medium text-black transition hover:brightness-110 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Evaluation
          </button>
        </div>
      </div>

      {/* Recruiter Plan & Quota Tracker Banner */}
      {quota && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7931E]/10 text-[#F7931E]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-neutral-900 capitalize">
                    {quota.package?.name || `${quota.plan_tier} Plan`}
                  </h3>
                  {quota.package?.badge && (
                    <span className="rounded-full bg-[#F7931E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#F7931E]">
                      {quota.package.badge}
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-[12px] text-neutral-500">
                  {quota.billing_cycle === "trial"
                    ? "Free Trial Period"
                    : `${quota.billing_cycle} billing cycle`}
                  {quota.valid_until &&
                    ` · Valid until ${new Date(quota.valid_until).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <Link
              to="/recruiter/billing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7931E] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#e08215] shadow-sm"
            >
              Upgrade Plan
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Submissions Quota */}
            <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-neutral-600 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-neutral-500" /> Candidate Submissions
                </span>
                <span className="font-semibold text-neutral-900">
                  {quota.used_submissions} / {quota.total_submissions < 0 ? "Unlimited" : quota.total_submissions}
                </span>
              </div>
              {quota.total_submissions > 0 && (
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-[#F7931E] transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((quota.used_submissions / quota.total_submissions) * 100))}%`,
                    }}
                  />
                </div>
              )}
              <div className="mt-1.5 text-[11px] text-neutral-400">
                {quota.total_submissions < 0
                  ? "Unlimited submissions"
                  : `${quota.submissions_remaining} remaining`}
              </div>
            </div>

            {/* Codebase Repos Quota */}
            <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-neutral-600 flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5 text-neutral-500" /> Codebase Repositories
                </span>
                <span className="font-semibold text-neutral-900">
                  {quota.used_codebase_repos} / {quota.total_codebase_repos < 0 ? "Custom" : quota.total_codebase_repos}
                </span>
              </div>
              {quota.total_codebase_repos > 0 && (
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((quota.used_codebase_repos / quota.total_codebase_repos) * 100))}%`,
                    }}
                  />
                </div>
              )}
              <div className="mt-1.5 text-[11px] text-neutral-400">
                {quota.total_codebase_repos < 0
                  ? "Custom repository setups"
                  : `${quota.repos_remaining} setups available`}
              </div>
            </div>

            {/* Recruiter Logins Quota */}
            <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-neutral-600 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-neutral-500" /> Recruiter Logins
                </span>
                <span className="font-semibold text-neutral-900">
                  {quota.used_recruiter_logins} / {quota.total_recruiter_logins < 0 ? "Unlimited" : quota.total_recruiter_logins}
                </span>
              </div>
              {quota.total_recruiter_logins > 0 && (
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((quota.used_recruiter_logins / quota.total_recruiter_logins) * 100))}%`,
                    }}
                  />
                </div>
              )}
              <div className="mt-1.5 text-[11px] text-neutral-400">
                {quota.total_recruiter_logins < 0
                  ? "Unlimited seats"
                  : `${quota.logins_remaining} seats open`}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 md:mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="relative overflow-hidden rounded-2xl border border-white/5 bg-white p-5"
          >
            <div
              className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl"
              style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
            />
            <div
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${m.tone} text-black`}
            >
              <m.icon className="h-4 w-4" />
            </div>
            <div className="mt-6 text-[11px] uppercase tracking-widest text-neutral-500">
              {m.label}
            </div>
            <div className="mt-1 text-[32px] font-semibold tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 space-y-10">
          <LoadingSkeleton type="metrics" />
          <LoadingSkeleton type="table" count={5} />
        </div>
      ) : (
        <>

          <div className="mt-10 rounded-2xl border border-white/5 bg-white">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <div className="text-[13px] font-medium">Recent Evaluations</div>
                <div className="text-[11px] text-neutral-500">
                  Your latest work — pick up where you left off.
                </div>
              </div>
              <Link
                to="/recruiter/evaluations"
                className="inline-flex items-center gap-1 text-[12px] text-neutral-400 hover:text-white"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {evals.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={ClipboardList}
                  title="No evaluations yet"
                  description="Create your first evaluation to start testing candidates."
                  action={{ label: "Create Evaluation", onClick: onCreate, icon: Plus }}
                />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {evals.slice(0, 5).map((e) => {
                  const t = evaluationTotals(e);
                  return (
                    <Link
                      key={e.id}
                      to="/recruiter/evaluations/$id/workspace"
                      params={{ id: e.id }}
                      search={{ tab: "overview", view: "edit" } as any}
                      className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 px-5 py-4 transition hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14px] text-white">{e.title}</span>
                          <StatusPill status={e.status} />
                        </div>
                        <div className="mt-0.5 text-[11px] text-neutral-500">
                          {e.domain || "—"} · {t.sections} sections · {t.minutes} min · {t.marks} marks
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-neutral-500">
                        Invited<div className="text-[13px] text-white">{e.candidatesInvited}</div>
                      </div>
                      <div className="text-right text-[11px] text-neutral-500">
                        Completed<div className="text-[13px] text-white">{e.candidatesCompleted}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-neutral-500 transition group-hover:text-emerald-400" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
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
