import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/weekly-task")({
  beforeLoad: () => {
    throw redirect({ to: "/student/weekly-task" });
  },
  component: () => null,
});
