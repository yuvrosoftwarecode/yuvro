import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WeeklyTaskPage } from "@/features/weeklyTask/WeeklyTaskPage";

interface WeeklyTaskSearch {
  task?: string;
  id?: string;
}

export const Route = createFileRoute("/student/weekly-task")({
  validateSearch: (search: Record<string, unknown>): WeeklyTaskSearch => ({
    task: typeof search.task === "string" ? search.task : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({ meta: [{ title: "Weekly Task — Yuvro Labs" }] }),
  component: StudentWeeklyTaskRoute,
});

function StudentWeeklyTaskRoute() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const currentTaskId = search.task || search.id;

  const handleTaskChange = (taskId: string) => {
    nav({ search: { task: taskId } as any });
  };

  return (
    <WeeklyTaskPage
      initialTaskId={currentTaskId}
      onTaskChange={handleTaskChange}
    />
  );
}
