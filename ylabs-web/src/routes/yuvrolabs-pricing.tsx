import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/yuvrolabs-pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/pricing" });
  },
  component: () => null,
});
