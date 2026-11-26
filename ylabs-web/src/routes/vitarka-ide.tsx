import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { VitarkaIDE } from "@/components/vitarka-ide";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/vitarka-ide")({
  head: () => ({ meta: [{ title: "Vitarka IDE — Yuvro Labs" }] }),
  component: VitarkaIDEPage,
});

function VitarkaIDEPage() {
  const { user } = useAuth();
  const isAdmin = user && (user.roles?.ylabs === "admin" || user.role === "admin");

  if (isAdmin) {
    return (
      <AdminShell title="Vitarka IDE" fullBleed hideHeader>
        <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
          <VitarkaIDE />
        </div>
      </AdminShell>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full h-screen flex flex-col overflow-hidden bg-background">
      <VitarkaIDE />
    </div>
  );
}
