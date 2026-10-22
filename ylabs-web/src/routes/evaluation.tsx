import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DevToolsShield } from "@/components/evaluation/DevToolsShield";
import { evaluationService } from "@/services/evaluationService";

export const Route = createFileRoute("/evaluation")({
  component: EvaluationLayout,
});

function EvaluationLayout() {
  const search: any = useRouterState({ select: (s) => s.location.search });
  const evaluationId = search?.e || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("e") : "") || "";
  const isPreviewMode = search?.preview === "true" || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true");

  const [isProctoringEnabled, setIsProctoringEnabled] = useState(false);

  useEffect(() => {
    if (isPreviewMode) {
      setIsProctoringEnabled(false);
      return;
    }

    if (evaluationId) {
      evaluationService
        .getWorkspaceData(evaluationId)
        .then((res) => {
          let hasProctoring = false;
          (res.sections || []).forEach((sec: any) => {
            let pc: any = {};
            try {
              pc = typeof sec.proctoring_config === "string" ? JSON.parse(sec.proctoring_config) : sec.proctoring_config || {};
            } catch {}
            if (pc.enableProctoring) hasProctoring = true;
          });
          setIsProctoringEnabled(hasProctoring);
        })
        .catch(() => {
          setIsProctoringEnabled(false);
        });
    } else {
      setIsProctoringEnabled(false);
    }
  }, [evaluationId, isPreviewMode]);

  return (
    <DevToolsShield enabled={isProctoringEnabled}>
      <Outlet />
    </DevToolsShield>
  );
}
