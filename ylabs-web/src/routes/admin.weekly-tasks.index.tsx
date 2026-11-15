import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import {
  Plus,
  CalendarDays,
  Trash2,
  Pencil,
  CheckCircle2,
  Users,
  Clock,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  loadWeeklyTasks,
  deleteWeeklyTask,
  type WeeklyTask,
} from "@/lib/weeklyTasks";

export const Route = createFileRoute("/admin/weekly-tasks/")({
  component: WeeklyTasksPage,
});

function WeeklyTasksPage() {
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await loadWeeklyTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        (t.lab_details?.title || "").toLowerCase().includes(q.toLowerCase()) ||
        t.description.toLowerCase().includes(q.toLowerCase())
    );
  }, [tasks, q]);

  const activeCount = tasks.filter((t) => t.is_active).length;
  const totalEnrollments = tasks.reduce(
    (acc, t) => acc + (t.enrollments_count || 0),
    0
  );

  const remove = async (id: string) => {
    try {
      await deleteWeeklyTask(id);
      setConfirmId(null);
      refresh();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  return (
    <AdminShell
      title="Learn Recurring Tasks"
      breadcrumb={["Content", "Learn Recurring Tasks"]}
      right={
        <Link
          to="/admin/weekly-tasks/new"
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 hover:opacity-90 transition font-medium"
        >
          <Plus className="h-3.5 w-3.5" /> Create recurring task
        </Link>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="Total Tasks"
          value={tasks.length}
          color="primary"
          icon={CalendarDays}
        />
        <KpiCard
          label="Active Tasks"
          value={activeCount}
          color="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Total Enrollments"
          value={totalEnrollments}
          color="warning"
          icon={Users}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search weekly tasks or labs..."
          className="text-xs px-3 py-1.5 rounded-md border border-border bg-transparent w-64 text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>
                {["Task Name", "Type", "Lab", "Duration", "Days", "Enrolled", "Status", "Actions"].map(
                  (h) => (
                    <th key={h} className="text-left font-medium px-4 py-3">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                    Loading recurring tasks...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                    No recurring tasks found.{" "}
                    <Link
                      to="/admin/weekly-tasks/new"
                      className="text-primary hover:underline font-medium ml-1"
                    >
                      Create the first one →
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="text-sm font-semibold text-foreground">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Badge tone={t.type === "monthly" ? "warning" : "primary"}>
                        {t.type === "monthly" ? "Monthly (30d)" : "Weekly (7d)"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Layers className="h-3 w-3 text-primary" />
                        {t.lab_details?.title || "Lab"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {t.start_date} → {t.end_date}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono text-foreground font-medium">
                        {(t.days || []).length} / {t.type === "monthly" ? 30 : 7} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-foreground">
                        {t.enrollments_count || 0}
                      </span>{" "}
                      <span className="text-muted-foreground">learners</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Badge tone={t.is_active ? "success" : "muted"}>
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/weekly-tasks/$id/edit"
                          params={{ id: t.id }}
                          className="px-2 py-1 rounded border border-border hover:bg-accent text-foreground inline-flex items-center gap-1 transition"
                          title="Edit task"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Link>
                        <button
                          onClick={() => setConfirmId(t.id)}
                          className="px-2 py-1 rounded border border-border hover:bg-destructive/10 text-destructive inline-flex items-center gap-1 transition"
                          title="Delete task"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4"
          onClick={() => setConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
          >
            <h3 className="font-semibold text-sm">Delete weekly task?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This will permanently delete this weekly task and its enrollment associations.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => remove(confirmId)}
                className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
