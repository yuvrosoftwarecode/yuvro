import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WeeklyTaskForm } from "@/components/admin/WeeklyTaskForm";
import { getWeeklyTask, type WeeklyTask } from "@/lib/weeklyTasks";
import { AdminShell } from "@/components/admin/AdminShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/weekly-tasks/$id/edit")({
  component: EditWeeklyTaskPage,
});

function EditWeeklyTaskPage() {
  const { id } = Route.useParams();
  const [task, setTask] = useState<WeeklyTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklyTask(id)
      .then((t) => setTask(t))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminShell title="Edit Weekly Task" breadcrumb={["Content", "Weekly Tasks", "Edit"]}>
        <div className="flex items-center justify-center py-20 text-muted-foreground text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading weekly task...
        </div>
      </AdminShell>
    );
  }

  if (!task) {
    return (
      <AdminShell title="Edit Weekly Task" breadcrumb={["Content", "Weekly Tasks", "Edit"]}>
        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
          Weekly task not found.
        </div>
      </AdminShell>
    );
  }

  return <WeeklyTaskForm initialTask={task} isEdit={true} />;
}
