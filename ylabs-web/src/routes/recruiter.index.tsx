import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recruiter/")({
  beforeLoad: () => {
    throw redirect({ to: "/recruiter/dashboard" });
  },
});
