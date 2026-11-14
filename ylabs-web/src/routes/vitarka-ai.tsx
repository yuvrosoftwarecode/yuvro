import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/vitarka-ai")({
  component: VitarkaRedirect,
});

function VitarkaRedirect() {
  return <Navigate to="/recruiter/vitarka-ai" replace />;
}
