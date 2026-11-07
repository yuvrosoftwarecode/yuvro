import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Users,
  ClipboardList,
  Sparkles,
  Zap,
  FolderGit2,
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
        setEvals(Array.isArray(evalData) ? evalData : []);
        setQuota(quotaData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setEvals([]);
        setError("Failed to load dashboard evaluations.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const safeEvals = Array.isArray(evals) ? evals : [];
  const total = safeEvals.length;
  const active = safeEvals.filter((e) => e.status === "published").length;
  const invited = safeEvals.reduce((a, e) => a + (e.candidatesInvited || 0), 0);
  const completed = safeEvals.reduce((a, e) => a + (e.candidatesCompleted || 0), 0);

  const onCreate = async () => {
    const e = await createEvaluation();
    nav({ to: "/recruiter/evaluations/$id", params: { id: e.id } });
  };

  const metrics = [
    { label: "Total evaluations", value: total },
    { label: "Active evaluations", value: active },
    { label: "Candidates invited", value: invited },
    { label: "Candidates completed", value: completed },
  ];
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[1120px] p-4 sm:p-6 md:p-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="rec-fg">Good to see you back</h1>
          <p className="rec-soft mt-1 text-[15px] leading-[22px]">Your evaluations and candidates</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/recruiter/billing"
            className="rec-btn-secondary inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50 shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-[#F7931E]" /> Manage Plan
          </Link>
          <button onClick={onCreate} className="rec-btn w-full sm:w-auto">Create evaluation</button>
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

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rec-card p-5">
            <div className="rec-muted text-[14px] leading-[20px]">{m.label}</div>
            <div className="rec-fg mt-2 text-[28px] font-semibold leading-[36px]">{m.value}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-10"><ErrorState message={error} onRetry={loadData} /></div>
      ) : loading ? (
        <div className="mt-10"><LoadingSkeleton type="table" count={5} /></div>
      ) : (
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rec-fg">Recent evaluations</h2>
            <Link to="/recruiter/evaluations" className="rec-link">View all</Link>
          </div>
          <div className="rec-card overflow-hidden">
            {safeEvals.length === 0 ? (
              <div className="p-8 text-center">
                <div className="rec-fg text-[16px] font-medium">No evaluations yet</div>
                <p className="rec-muted mt-1 text-[14px]">Create your first evaluation to start testing candidates.</p>
                <button onClick={onCreate} className="rec-btn mt-4">Create evaluation</button>
              </div>
            ) : (
              safeEvals.slice(0, 5).map((e, i) => {
                const t = evaluationTotals(e);
                return (
                  <Link
                    key={e.id}
                    to="/recruiter/evaluations/$id/workspace"
                    params={{ id: e.id }}
                    search={{ tab: "overview", view: "edit" } as any}
                    className={`rec-row rec-border flex items-center gap-6 px-5 py-4 transition-colors ${i ? "border-t" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="rec-fg truncate text-[16px] font-medium leading-[24px]">{e.title}</span>
                        <span className="rec-muted shrink-0 text-[14px]">{e.status === "published" ? "Published" : "Draft"}</span>
                      </div>
                      <div className="rec-muted mt-0.5 text-[14px] leading-[20px]">
                        {e.domain || "—"} · {plural(t.sections, "section")} · {t.minutes} min · {plural(t.marks, "mark")}
                      </div>
                    </div>
                    <div className="hidden shrink-0 gap-6 text-[14px] sm:flex">
                      <div className="w-[80px] text-left"><div className="rec-muted">Invited</div><div className="rec-fg text-[15px]">{e.candidatesInvited}</div></div>
                      <div className="w-[104px] text-left"><div className="rec-muted">Completed</div><div className="rec-fg text-[15px]">{e.candidatesCompleted}</div></div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
