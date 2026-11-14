import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/student/lab/$slug/sprints/$sprintId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/student/lab/$slug/sprint/$sprintId",
      params: { slug: params.slug, sprintId: params.sprintId },
    });
  },
  component: () => null,
});
