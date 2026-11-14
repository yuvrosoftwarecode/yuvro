import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import Research from "@/pages/Research";

export const Route = createFileRoute("/admin/research")({
  validateSearch: (search: Record<string, unknown>): { view: "latest" | "following" | "topics" } => ({
    view: search.view === "following" || search.view === "topics" ? search.view : "latest",
  }),
  head: () => ({
    meta: [{ title: "AI Research Papers | Operations Console" }],
  }),
  component: AdminResearchPage,
});

function AdminResearchPage() {
  return (
    <AdminShell
      title="AI Research Papers"
      breadcrumb={["Content", "AI Research Papers"]}
    >
      <Research embedded />
    </AdminShell>
  );
}
