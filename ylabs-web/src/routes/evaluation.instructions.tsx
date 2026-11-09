import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton } from "@/components/evaluation/EvalShell";
import { evaluationService } from "../services/evaluationService";
import { getLabCalculatedStats, countDistinctSelectedTasks } from "@/lib/recruiter";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/evaluation/instructions")({
  head: () => ({
    meta: [{ title: "Instructions — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: InstructionsPage,
});

export interface ParsedSectionInfo {
  id: string;
  title: string;
  type: string;
  marks: number;
  durationMinutes: number;
  subtitle: string;
  badge: string;
}

function InstructionsPage() {
  const nav = useNavigate();
  const [agree, setAgree] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const evaluationId = searchParams.get("e") || "";

  useEffect(() => {
    if (!evaluationId) {
      setLoading(false);
      return;
    }
    evaluationService.getWorkspaceData(evaluationId)
      .then((res) => {
        setEvalData(res);
      })
      .catch((err) => {
        console.error("Failed to load evaluation data", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [evaluationId]);

  const rawSections: any[] = evalData?.sections || [];

  const { parsedSections, totalCalculatedMarks, totalCalculatedDuration, hasDiscussion, discussionDuration, discussionTitle } = useMemo(() => {
    let discDuration = 15;
    let discTitle = "Engineering Discussion";
    let foundDiscussion = false;

    const list: ParsedSectionInfo[] = rawSections.map((sec: any, idx: number) => {
      let marks = 0;
      let durationMinutes = 0;
      let subtitle = "";

      let meta: any = {};
      if (sec.description) {
        try {
          meta = typeof sec.description === "string" && sec.description.trim().startsWith("{") 
            ? JSON.parse(sec.description) 
            : {};
        } catch {}
      }

      if (sec.type === "LAB") {
        const qList = sec.questions || [];
        const labCount = qList.length;

        qList.forEach((q: any) => {
          const stats = getLabCalculatedStats(q);
          marks += stats.marks;
          durationMinutes += stats.minutes;
        });

        if (marks === 0) marks = sec.marks || (labCount * 6) || 6;
        if (durationMinutes === 0) durationMinutes = sec.duration_minutes || (labCount * 30) || 30;

        const techTags = Array.from(new Set(qList.flatMap((q: any) => [
          ...(q.programming_languages || []),
          ...(q.backend_frameworks || []),
          ...(q.databases || [])
        ]))).filter(Boolean).slice(0, 3);

        const techSummary = techTags.length > 0 ? ` · ${techTags.join(", ")}` : "";
        subtitle = `${labCount} ${labCount === 1 ? "lab" : "labs"} · ${marks} marks · ~${durationMinutes} min${techSummary}`;

      } else if (sec.type === "KNOWLEDGE_ASSESSMENT") {
        const qList = sec.questions || [];
        const qCount = qList.length;

        qList.forEach((q: any) => {
          marks += Number(q.marks || 1);
          durationMinutes += Number(q.duration_minutes || 2);
        });

        if (marks === 0) marks = sec.marks || qCount || 10;
        if (durationMinutes === 0) durationMinutes = sec.duration_minutes || Math.max(10, qCount * 2);

        const formats = Array.from(new Set(qList.map((q: any) => q.format || (q.mcq_options?.length ? "MCQ" : "Questions")))).filter(Boolean);
        const formatStr = formats.length > 0 ? ` · ${formats.join(", ")}` : "";
        subtitle = `${qCount} ${qCount === 1 ? "question" : "questions"} · ${marks} marks · ~${durationMinutes} min${formatStr}`;

      } else if (sec.type === "VITARKA_AI_INTERVIEW") {
        foundDiscussion = true;
        marks = meta.marks ?? meta.max_score ?? sec.marks ?? 25;
        durationMinutes = meta.duration ?? meta.duration_minutes ?? sec.duration_minutes ?? sec.duration ?? 15;
        discDuration = durationMinutes;
        discTitle = sec.title || "Engineering Discussion";
        subtitle = `AI-led technical discussion · ${marks} marks · ~${durationMinutes} min`;
      } else if (sec.type === "SYSTEM_DESIGN") {
        const qList = sec.questions || [];
        const firstQ = qList.length > 0 ? (typeof qList[0] === 'object' ? qList[0] : null) : null;
        marks = firstQ?.marks || sec.marks || 100;
        durationMinutes = firstQ?.duration_minutes || sec.duration_minutes || 45;
        const qTitle = firstQ?.title || sec.title || "System Design Challenge";
        subtitle = `HLD, Sequence, DBML & REST APIs · ${marks} marks · ~${durationMinutes} min`;
      } else {
        marks = sec.marks || 0;
        durationMinutes = sec.duration_minutes || 0;
        subtitle = sec.description || `~${durationMinutes} min · ${marks} marks`;
      }

      return {
        id: sec.id || `sec-${idx}`,
        title: sec.title || (sec.type === "LAB" ? "Engineering Labs" : sec.type === "KNOWLEDGE_ASSESSMENT" ? "Knowledge Assessment" : sec.type === "SYSTEM_DESIGN" ? "System Design" : "Engineering Discussion"),
        type: sec.type,
        marks,
        durationMinutes,
        subtitle,
        badge: `Section ${idx + 1}`
      };
    });

    const totMarks = list.reduce((acc, s) => acc + s.marks, 0);
    const totDur = list.reduce((acc, s) => acc + s.durationMinutes, 0);

    return {
      parsedSections: list,
      totalCalculatedMarks: totMarks,
      totalCalculatedDuration: totDur,
      hasDiscussion: foundDiscussion,
      discussionDuration: discDuration,
      discussionTitle: discTitle,
    };
  }, [rawSections]);

  const totalDurationMinutes = totalCalculatedDuration > 0 ? totalCalculatedDuration : (evalData?.duration_minutes || evalData?.duration || evalData?.settings?.duration || 60);

  const sectionTitles = parsedSections.map((s) => s.title);

  // Proctoring house rules detection
  const anyProctoringEnabled = rawSections.some((s: any) => {
    let pc: any = {};
    try { pc = typeof s.proctoring_config === 'string' ? JSON.parse(s.proctoring_config) : (s.proctoring_config || {}); } catch {}
    return Boolean(pc.enableProctoring);
  });
  const tabSwitchDisallowed = rawSections.some((s: any) => {
    let pc: any = {};
    try { pc = typeof s.proctoring_config === 'string' ? JSON.parse(s.proctoring_config) : (s.proctoring_config || {}); } catch {}
    return pc.tabSwitchAllowed === false;
  });
  const copyPasteDisallowed = rawSections.some((s: any) => {
    let pc: any = {};
    try { pc = typeof s.proctoring_config === 'string' ? JSON.parse(s.proctoring_config) : (s.proctoring_config || {}); } catch {}
    return pc.enableCopyPaste === false;
  });

  const houseRules = [
    ...(anyProctoringEnabled ? ["Camera stays on for the full evaluation."] : []),
    "Fullscreen mode is required.",
    ...(tabSwitchDisallowed ? ["No tab switching — tab switches are monitored and limited."] : ["Stay within the workspace window during the evaluation."]),
    ...(copyPasteDisallowed ? ["External copy-pasting is restricted."] : []),
    "Stay on a stable connection where possible.",
    "Autosave is continuous — your code and answers are saved automatically.",
  ];

  const start = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
    
    setIsStarting(true);
    try {
      await evaluationService.provisionLabs(evaluationId);
    } catch (e) {
      console.error("Failed to provision labs", e);
    } finally {
      setIsStarting(false);
      nav({ to: "/evaluation/workspace", search: { e: evaluationId } });
    }
    // Log timeline event
    try {
      const { restApiAuthUtil } = await import("@/utils/RestApiAuthUtil");
      await restApiAuthUtil.post(`/skill_evaluation/timeline-events/`, {
        evaluation: evaluationId,
        title: "Candidate started evaluation",
        status: "SUCCESS",
        occurred_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to log timeline event", e);
    }
    
    nav({ to: "/evaluation/workspace", search: { e: evaluationId } });
  };

  return (
    <EvalShell step={5} totalSteps={5} stepLabel="Instructions">
      <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
        <section>
          <EvalStepHeader
            eyebrow="You're ready"
            title={
              <>
                Before you begin,
                <br />a few things to know.
              </>
            }
            body="Read through this once. When you click start, the workspace opens in fullscreen and the timer begins."
          />
          <div className="mt-12 space-y-6 text-[14px] leading-relaxed text-neutral-700">
            {loading ? (
              <div className="flex items-center gap-2 text-neutral-400 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading evaluation structure...
              </div>
            ) : (
              <>
                <p>
                  Your evaluation has {parsedSections.length === 1 ? "one section" : `${parsedSections.length} sections`} —{" "}
                  <span className="font-medium text-neutral-900">{sectionTitles.length > 0 ? sectionTitles.join(", ") : "evaluation tasks"}</span>.
                  {totalCalculatedMarks > 0 && ` Total marks: ${totalCalculatedMarks}.`} Total duration: <span className="font-medium text-neutral-900">{totalDurationMinutes} minutes</span>.
                </p>
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-[13px]">
                  <div className="font-medium text-neutral-900">Timing & Section Navigation Rules:</div>
                  <ul className="space-y-2 text-neutral-600 list-disc pl-4">
                    <li><strong className="text-neutral-900">Section-Level Timer:</strong> The timer is allocated per section, not per individual question.</li>
                    <li><strong className="text-neutral-900">Flexible Navigation:</strong> You can move freely between questions within an active section.</li>
                    <li><strong className="text-neutral-900">One-Way Section Progress:</strong> Once a section is submitted, it cannot be revisited.</li>
                    <li><strong className="text-neutral-900">Auto-Submission:</strong> If a section's time limit expires, all answered questions are automatically submitted.</li>
                    {hasDiscussion && (
                      <li><strong className="text-neutral-900">Vitarka AI Discussion:</strong> Starts automatically after completing preceding sections (~{discussionDuration} min).</li>
                    )}
                  </ul>
                </div>
                <p className="text-[13px] text-neutral-500">
                  Autosave is continuous. Your code and answers save automatically as you work.
                </p>
              </>
            )}
          </div>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total duration" value={`${totalDurationMinutes} min`} />
            {hasDiscussion ? (
              <Stat label="Discussion" value={`${discussionDuration} min`} muted />
            ) : (
              <Stat label="Total Marks" value={`${totalCalculatedMarks} pts`} muted />
            )}
            <Stat label="Sections" value={String(parsedSections.length || 1)} />
            <Stat label="Autosave" value="Continuous" muted />
          </div>

          <div className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-neutral-400 text-[13px] gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading sections...
              </div>
            ) : parsedSections.length > 0 ? (
              parsedSections.map((sec) => (
                <div key={sec.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <div className="text-[14px] font-medium text-neutral-900">{sec.title}</div>
                    <div className="mt-0.5 text-[12px] text-neutral-500">{sec.subtitle}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-neutral-200 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600 bg-neutral-50">
                    {sec.badge}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-4 text-[13px] text-neutral-500">No sections configured.</div>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 text-[12px] text-neutral-600">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              House rules
            </div>
            <ul className="mt-3 space-y-2">
              {houseRules.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-400 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span>I've read the rules and I'm ready to begin the evaluation.</span>
          </label>

          <PrimaryButton className="mt-6" type="button" disabled={!agree || isStarting || loading} onClick={start}>
            {isStarting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing your workspace...
              </span>
            ) : (
              "Start evaluation"
            )}
          </PrimaryButton>
        </section>
      </div>
    </EvalShell>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 p-4 ${muted ? "bg-neutral-50/60" : "bg-white"}`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className="mt-2 font-serif text-[22px] tracking-tight text-neutral-900">{value}</div>
    </div>
  );
}
