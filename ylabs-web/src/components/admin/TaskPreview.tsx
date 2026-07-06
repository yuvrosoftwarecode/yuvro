import { useMemo } from "react";
import { X } from "lucide-react";
import type { LabTask } from "@/lib/labSprints";
import { labs as dummyLabs } from "@/lib/dummy";
import { StudentTicketView, type StudentPreviewOverride } from "@/routes/lab.$slug.ticket.$ticketId";

function deriveSlug(labName: string): string {
  const lower = labName.toLowerCase();
  const byName = dummyLabs.find(l => l.name.toLowerCase() === lower);
  if (byName) return byName.slug;
  const partial = dummyLabs.find(l => lower.includes(l.slug) || l.name.toLowerCase().includes(lower.replace(/\s*lab\s*$/, "").trim()));
  if (partial) return partial.slug;
  return lower.replace(/\s*lab\s*$/, "").trim().replace(/[^a-z0-9]+/g, "-") || "java";
}

export function TaskPreview({
  task, sprintName, labName, labSlug, onClose,
}: {
  task: LabTask;
  sprintName: string;
  labName: string;
  labSlug?: string;
  onClose?: () => void;
}) {
  const slug = labSlug || deriveSlug(labName);

  const override: StudentPreviewOverride = useMemo(() => ({
    title: task.title,
    description: task.description,
    difficulty: task.difficulty,
    xp: task.xp,
    estMin: task.estMin,
    tag: sprintName,
    starterCode: task.starterCode,
    hints: task.hints,
    solution: task.solution,
  }), [task, sprintName]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/60">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-primary font-semibold">Admin preview</span>
          <span className="text-muted-foreground">/</span>
          <span>{labName}</span>
          <span className="text-muted-foreground">/</span>
          <span>{sprintName}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{task.title}</span>
        </div>
        <button onClick={onClose} className="text-[11px] px-2 py-1 rounded border border-border hover:bg-accent inline-flex items-center gap-1">
          <X className="h-3 w-3" /> Close preview
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <StudentTicketView slug={slug} ticketId={task.id} previewOverride={override} />
      </div>
    </div>
  );
}
