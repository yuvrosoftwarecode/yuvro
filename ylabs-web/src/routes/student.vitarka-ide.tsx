import { createFileRoute } from "@tanstack/react-router";
import { VitarkaIDE } from "@/components/vitarka-ide";

export const Route = createFileRoute("/student/vitarka-ide")({
  head: () => ({ meta: [{ title: "Vitarka IDE — Yuvro Labs" }] }),
  component: StudentVitarkaIDEPage,
});

function StudentVitarkaIDEPage() {
  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden bg-background">
      <VitarkaIDE />
    </div>
  );
}
