import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/weekly-tasks")({
  component: () => <Outlet />,
});
