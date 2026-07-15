import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton } from "@/components/evaluation/EvalShell";

export const Route = createFileRoute("/evaluation/instructions")({
  head: () => ({ meta: [{ title: "Instructions — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: InstructionsPage,
});

function InstructionsPage() {
  const nav = useNavigate();
  const [agree, setAgree] = useState(false);

  const start = async () => {
    try { await document.documentElement.requestFullscreen?.(); } catch {}
    nav({ to: "/evaluation/workspace" });
  };

  return (
    <EvalShell step={5} totalSteps={5} stepLabel="Instructions">
      <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
        <section>
          <EvalStepHeader
            eyebrow="You're ready"
            title={<>Before you begin,<br />a few things to know.</>}
            body="Read through this once. When you click start, the workspace opens in fullscreen and the timer begins."
          />
          <div className="mt-12 space-y-6 text-[14px] leading-relaxed text-neutral-700">
            <p>Your evaluation has four sections — Engineering Labs, Knowledge Assessment, an optional Coding Challenge, and a closing Engineering Discussion.</p>
            <p><span className="text-neutral-900">The last 15 minutes are reserved for the Engineering Discussion.</span> When the timer reaches 15:00 remaining, the other sections lock automatically and the discussion begins. You cannot skip it.</p>
            <p>Work as you normally would. Move between tasks, use the terminal, run tests. Autosave is continuous.</p>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total duration" value="60 min" />
            <Stat label="Discussion" value="15 min" muted />
            <Stat label="Sections" value="4" />
            <Stat label="Autosave" value="Continuous" muted />
          </div>

          <div className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {[
              ["Engineering Labs", "Two labs · ~15 min each", "Section 1"],
              ["Knowledge Assessment", "Java, SQL, JavaScript, System Design", "Section 2"],
              ["Coding Challenge", "Optional · one problem", "Section 3"],
              ["Engineering Discussion", "AI-led · reflects on your work", "Section 4"],
            ].map(([title, body, badge]) => (
              <div key={title} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <div className="text-[14px] text-neutral-900">{title}</div>
                  <div className="mt-0.5 text-[12px] text-neutral-500">{body}</div>
                </div>
                <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{badge}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 text-[12px] text-neutral-600">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">House rules</div>
            <ul className="mt-3 space-y-2">
              {["Camera stays on for the full evaluation.", "Fullscreen mode is required.", "No tab switching — you'll be warned once.", "Stay on a stable connection where possible."].map(r => (
                <li key={r} className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-400" />{r}</li>
              ))}
            </ul>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] text-neutral-700">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
            <span>I've read the rules and I'm ready to begin the evaluation.</span>
          </label>

          <PrimaryButton className="mt-6" type="button" disabled={!agree} onClick={start}>Start evaluation</PrimaryButton>
        </section>
      </div>
    </EvalShell>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-xl border border-neutral-200 p-4 ${muted ? "bg-neutral-50/60" : "bg-white"}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className="mt-2 font-serif text-[22px] tracking-tight text-neutral-900">{value}</div>
    </div>
  );
}
