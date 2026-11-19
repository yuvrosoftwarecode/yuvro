import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/mock-interviews")({ component: () => <Outlet /> });
