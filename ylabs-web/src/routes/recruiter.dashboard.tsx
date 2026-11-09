import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listEvaluations, createEvaluation, Evaluation, evaluationTotals } from "@/lib/recruiter";
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const loadData = () => {
    setLoading(true);
    setError(null);
    listEvaluations()
      .then((data) => {
        setEvals(Array.isArray(data) ? data : []);
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
        <button onClick={onCreate} className="rec-btn w-full sm:w-auto">Create evaluation</button>
      </div>

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
