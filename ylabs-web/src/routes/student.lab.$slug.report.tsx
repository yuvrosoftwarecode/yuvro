import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getLab, type AdminLab } from "@/lib/adminLabs";
import { loadSprints, type LabSprint } from "@/lib/labSprints";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import { LabReportView } from "@/components/shared/LabReportView";

export const Route = createFileRoute("/student/lab/$slug/report")({
  component: LabReportWrapper,
});

function LabReportWrapper() {
  const { slug } = Route.useParams();
  const [realLab, setRealLab] = useState<AdminLab | null>(null);
  const [realSprints, setRealSprints] = useState<LabSprint[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, { status: string, earnedXp: number, percentage: number, minutes: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getLab(slug),
      restApiAuthUtil.get<any[]>("/lab/submissions/").catch(() => [])
    ]).then(([lab, subs]) => {
      if (!active) return;
      if (lab) {
        setRealLab(lab);
        const overrides: Record<string, { status: string, earnedXp: number, percentage: number, minutes: number }> = {};
        subs.forEach((s) => {
          if (["backlog", "in_progress", "in_review", "done"].includes(s.ticket_status)) {
            let testPct = 0;
            if (s.solution_output) {
              try {
                const parsed = typeof s.solution_output === "string" ? JSON.parse(s.solution_output) : s.solution_output;
                testPct = parsed?.percentage ?? parsed?.total_score ?? 0;
              } catch (e) {}
            }
            const isEvaluated = s.ticket_status === "done" || s.ticket_status === "in_review";
            overrides[s.lab_sprint_ticket] = {
              status: s.ticket_status,
              percentage: testPct,
              earnedXp: isEvaluated ? (s.yuvro_points ?? 0) : 0,
              minutes: s.minutes_solved ?? 0
            };
          }
        });
        setStatusOverrides(overrides);
        
        loadSprints(lab.id).then((s) => {
          if (active) {
            setRealSprints(s);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [slug]);

  return (
    <LabReportView
      realLab={realLab}
      realSprints={realSprints}
      statusOverrides={statusOverrides}
      slug={slug}
      backLinkTo="/student/lab/$slug"
      backLinkParams={{ slug }}
      loading={loading}
    />
  );
}
