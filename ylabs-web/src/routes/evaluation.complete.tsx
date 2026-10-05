import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EvalShell, PrimaryButton, Spinner } from "@/components/evaluation/EvalShell";
import { clearGlobalProctoringData } from "@/utils/proctoringStore";
import { evaluationService } from "../services/evaluationService";
import authService from "../services/authService";
import { restApiAuthUtil, yhubApiAuthUtil, ycodeApiAuthUtil } from "../utils/RestApiAuthUtil";

export const Route = createFileRoute("/evaluation/complete")({
  head: () => ({
    meta: [{ title: "Evaluation submitted — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: CompletePage,
});

function CompletePage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"submitting" | "done">("submitting");
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const evaluationId = searchParams.get("e") || "";

  useEffect(() => {
    clearGlobalProctoringData();
    authService.getCurrentUser().then(user => {
      if (user.is_guest_user) {
        setIsGuest(true);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("yuvro-eval-candidate");
        restApiAuthUtil.clearAuthToken();
        yhubApiAuthUtil.clearAuthToken();
        ycodeApiAuthUtil.clearAuthToken();
      }
    }).catch(() => {});
    
    if (evaluationId) {
      evaluationService.getWorkspaceData(evaluationId).then((res) => {
        let tot = 0;
        (res.sections || []).forEach((sec: any) => {
          if (sec.type === "LAB") {
            (sec.questions || []).forEach((q: any) => {
              tot += Number(q.marks || (Array.isArray(q.tasks) ? q.tasks.length * 10 : 10));
            });
          } else if (sec.type === "KNOWLEDGE_ASSESSMENT") {
            (sec.questions || []).forEach((q: any) => {
              tot += Number(q.marks || 1);
            });
          } else if (sec.type === "VITARKA_AI_INTERVIEW") {
            let meta: any = {};
            try { meta = typeof sec.description === "string" ? JSON.parse(sec.description) : {}; } catch {}
            tot += Number(meta.marks ?? meta.max_score ?? sec.marks ?? 25);
          }
        });
        if (tot > 0) setMaxScore(tot);
      }).catch(() => {});
    }
    const t = setTimeout(() => setPhase("done"), 2400);
    return () => clearTimeout(t);
  }, [evaluationId]);

  if (phase === "submitting") {
    return (
      <EvalShell>
        <div className="mx-auto grid max-w-md place-items-center py-16 text-center">
          <Spinner className="text-neutral-500" />
          <div className="mt-6 font-serif text-[26px] tracking-tight text-neutral-900">
            Submitting your evaluation…
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
            Generating your report. This won't take long. Please don't close the tab.
          </p>
          <div className="mt-8 w-full space-y-2 text-left">
            {[
              "Consolidating labs",
              "Scoring assessment",
              "Analysing discussion",
              "Preparing your report",
            ].map((s, i) => (
              <div
                key={s}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-[12px]"
              >
                <span className="text-neutral-700">{s}</span>
                <span className="text-neutral-400">{i === 3 ? "…" : "done"}</span>
              </div>
            ))}
          </div>
        </div>
      </EvalShell>
    );
  }

  return (
    <EvalShell>
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="mt-8 font-serif text-[42px] leading-tight tracking-tight text-neutral-900">
          Thank You.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
          You've completed your Yuvro Labs engineering evaluation. The hiring team will review your
          work and be in touch shortly.
        </p>

        {maxScore !== null && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-[13px] font-medium text-neutral-800">
            <span>Evaluation Maximum Score:</span>
            <span className="font-mono text-emerald-600 font-semibold">{maxScore} pts</span>
          </div>
        )}

{!isGuest && (<>
        <div className="mt-12 text-left">
          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            Keep sharpening
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { t: "Practice Labs", d: "Real, timeboxed engineering scenarios.", to: "/dashboard" },
              {
                t: "Coding Challenges",
                d: "Short problems, curated by difficulty.",
                to: "/dashboard",
              },
              { t: "AI Discussions", d: "Rehearse how you explain your work.", to: "/dashboard" },
            ].map((c) => (
              <Link
                key={c.t}
                to={c.to}
                className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-900"
              >
                <div className="text-[14px] text-neutral-900">{c.t}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-neutral-500">{c.d}</div>
                <div className="mt-6 text-[12px] text-neutral-500 group-hover:text-neutral-900">
                  Open →
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-xs">
          <PrimaryButton type="button" onClick={() => nav({ to: "/dashboard" })}>
            Go to dashboard
          </PrimaryButton>
        </div>

</>)}
      </div>
    </EvalShell>
  );
}
