import { createFileRoute } from "@tanstack/react-router";
import { WeeklyTaskForm } from "@/components/admin/WeeklyTaskForm";

export const Route = createFileRoute("/admin/weekly-tasks/new")({
  component: NewWeeklyTaskPage,
});

function NewWeeklyTaskPage() {
  return <WeeklyTaskForm isEdit={false} />;
}
