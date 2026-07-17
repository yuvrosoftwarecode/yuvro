import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/evaluation")({
  component: EvaluationLayout,
});

function EvaluationLayout() {
  return <Outlet />;
}