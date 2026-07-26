import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CollabShell } from "@/components/collab/CollabShell";

export const Route = createFileRoute("/student/collaboration")({
  component: CollaborationLayout,
});

function CollaborationLayout() {
  return (
    <CollabShell>
      <Outlet />
    </CollabShell>
  );
}
