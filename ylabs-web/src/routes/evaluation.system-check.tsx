import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton, Check, Spinner } from "@/components/evaluation/EvalShell";

export const Route = createFileRoute("/evaluation/system-check")({
  head: () => ({ meta: [{ title: "System check — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: SystemCheckPage,
});

const CHECKS = [
  { key: "internet", label: "Internet speed", detail: "42 Mbps · stable" },
  { key: "mic", label: "Microphone", detail: "Default input · levels detected" },
  { key: "camera", label: "Camera", detail: "1080p · front-facing" },
  { key: "resolution", label: "Screen resolution", detail: "1920 × 1080" },
  { key: "browser", label: "Browser compatibility", detail: "Chromium 128" },
  { key: "fullscreen", label: "Fullscreen support", detail: "Available" },
  { key: "permissions", label: "Permission checks", detail: "All granted" },
];

function SystemCheckPage() {
  const nav = useNavigate();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const c of CHECKS) {
        await new Promise(r => setTimeout(r, 550 + Math.random() * 400));
        if (cancelled) return;
        setDone(d => new Set(d).add(c.key));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allDone = done.size === CHECKS.length;

  return (
    <EvalShell step={3} totalSteps={5} stepLabel="System check">
      <div className="mx-auto max-w-2xl">
        <EvalStepHeader eyebrow="Step 03" title={<>Getting your workspace ready.</>} body="A quick check of your environment. Nothing to do — this runs automatically." />
        <div className="mt-12 divide-y divide-neutral-200 border-y border-neutral-200">
          {CHECKS.map((c) => {
            const isDone = done.has(c.key);
            return (
              <div key={c.key} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="text-[14px] text-neutral-900">{c.label}</div>
                  <div className={`mt-0.5 text-[12px] transition-colors ${isDone ? "text-neutral-500" : "text-neutral-400"}`}>
                    {isDone ? c.detail : "Checking…"}
                  </div>
                </div>
                <div className="shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Passed
                    </span>
                  ) : (
                    <Spinner className="text-neutral-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-10">
          <PrimaryButton disabled={!allDone} type="button" onClick={() => nav({ to: "/evaluation/proctoring" })}>
            {allDone ? "Continue to proctoring" : "Running checks…"}
          </PrimaryButton>
        </div>
      </div>
    </EvalShell>
  );
}
