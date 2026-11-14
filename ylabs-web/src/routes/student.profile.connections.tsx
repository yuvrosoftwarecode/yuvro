import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/student/profile/connections")({
  beforeLoad: () => {
    throw redirect({
      to: "/student/profile",
      search: { tab: "settings", section: "connections" },
    });
  },
  component: () => null,
});
