import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/evaluation/WorkspaceApp";

export const Route = createFileRoute("/evaluation/workspace")({
  head: () => ({
    meta: [{ title: "Evaluation workspace — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: Workspace,
});
