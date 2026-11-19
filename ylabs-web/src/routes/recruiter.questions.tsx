import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/recruiter/questions")({
  component: () => <Outlet />,
});
