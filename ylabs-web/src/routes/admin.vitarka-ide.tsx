import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { VitarkaIDE } from "@/components/vitarka-ide";

export const Route = createFileRoute("/admin/vitarka-ide")({
  component: AdminVitarkaIDEPage,
});

function AdminVitarkaIDEPage() {
  return (
    <AdminShell title="Vitarka IDE" fullBleed hideHeader>
      <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
        <VitarkaIDE />
      </div>
    </AdminShell>
  );
}
