import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/yuvrolabs")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
