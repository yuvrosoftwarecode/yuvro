import type { Difficulty, Status } from "@/lib/dummy";

export function DiffBadge({ value }: { value: Difficulty }) {
  const map: Record<Difficulty, string> = {
    Beginner: "bg-success/15 text-success border-success/30",
    Intermediate: "bg-warning/15 text-warning border-warning/30",
    Advanced: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${map[value]}`}>{value}</span>;
}

export function StatusBadge({ value }: { value: Status }) {
  const map: Record<Status, string> = {
    "Not Started": "bg-muted text-muted-foreground border-border",
    "In Progress": "bg-info/15 text-info border-info/30",
    "Completed": "bg-success/15 text-success border-success/30",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${map[value]}`}>{value}</span>;
}
