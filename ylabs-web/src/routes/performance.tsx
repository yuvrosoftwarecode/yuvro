import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/performance")({
  beforeLoad: () => {
    throw redirect({
      to: "/student/profile",
      search: { tab: "performance" },
    });
  },
  component: () => null,
});
