import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import {
  Users,
  FlaskConical,
  Database,
  CalendarDays,
  Sparkles,
  Code2,
  ArrowUpRight,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { restApiAuthUtil, yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import { loadWeeklyTasks } from "@/lib/weeklyTasks";
import { questionBankService } from "@/services/questionBankService";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  const [stats, setStats] = useState<{
    usersCount: number | null;
    labsCount: number | null;
    recurringTasksCount: number | null;
    questionsCount: number | null;
    sessionsCount: number | null;
  }>({
    usersCount: null,
    labsCount: null,
    recurringTasksCount: null,
    questionsCount: null,
    sessionsCount: null,
  });

  const [recentLabs, setRecentLabs] = useState<AdminLab[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [usersRes, labsRes, tasksRes, questionsRes, sessionsRes] = await Promise.allSettled([
          restApiAuthUtil.get<any>("/auth/users/?page=1&page_size=5"),
          loadLabs(),
          loadWeeklyTasks(),
          questionBankService.getLabQuestions(),
          yhubApiAuthUtil.get<any[]>("/sessions/"),
        ]);

        if (!mounted) return;

        let usersCount = 0;
        let usersList: any[] = [];
        if (usersRes.status === "fulfilled" && usersRes.value) {
          usersCount = usersRes.value.count ?? (usersRes.value.results?.length || 0);
          usersList = usersRes.value.results?.slice(0, 5) || [];
        }

        let labsCount = 0;
        let labsList: AdminLab[] = [];
        if (labsRes.status === "fulfilled" && Array.isArray(labsRes.value)) {
          labsCount = labsRes.value.length;
          labsList = labsRes.value.slice(0, 5);
        }

        let recurringTasksCount = 0;
        if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
          recurringTasksCount = tasksRes.value.length;
        }

        let questionsCount = 0;
        if (questionsRes.status === "fulfilled" && Array.isArray(questionsRes.value)) {
          questionsCount = questionsRes.value.length;
        }

        let sessionsCount = 0;
        if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value)) {
          sessionsCount = sessionsRes.value.length;
        }

        setStats({
          usersCount,
          labsCount,
          recurringTasksCount,
          questionsCount,
          sessionsCount,
        });
        setRecentLabs(labsList);
        setRecentUsers(usersList);
      } catch (e) {
        console.error("Failed to load admin dashboard data:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AdminShell
      title="Dashboard"
      breadcrumb={["Dashboard"]}
      right={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/vitarka-ide"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f7931e] text-white hover:bg-[#e5820f] transition-colors shadow-xs"
          >
            <Code2 className="h-3.5 w-3.5" /> Launch Vitarka IDE
          </Link>
        </div>
      }
    >
      {/* Real Statistics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard
          label="Total Users"
          value={loading || stats.usersCount === null ? "..." : stats.usersCount.toLocaleString()}
          icon={Users}
        />
        <KpiCard
          label="Total Labs"
          value={loading || stats.labsCount === null ? "..." : stats.labsCount.toLocaleString()}
          icon={FlaskConical}
        />
        <KpiCard
          label="Question Bank"
          value={loading || stats.questionsCount === null ? "..." : stats.questionsCount.toLocaleString()}
          icon={Database}
        />
        <KpiCard
          label="Recurring Tasks"
          value={loading || stats.recurringTasksCount === null ? "..." : stats.recurringTasksCount.toLocaleString()}
          icon={CalendarDays}
        />
        <KpiCard
          label="AI Sessions"
          value={loading || stats.sessionsCount === null ? "..." : stats.sessionsCount.toLocaleString()}
          icon={Sparkles}
        />
      </div>

      {/* Main Content Panels */}
      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Recent Labs */}
        <div className="lg:col-span-2">
          <Panel
            title="Labs"
            action={
              <Link
                to="/admin/labs"
                className="text-xs text-[#f7931e] hover:underline inline-flex items-center gap-1 font-medium"
              >
                View all labs <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            {loading ? (
              <div className="py-8 flex justify-center text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : recentLabs.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                No labs configured yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recentLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-neutral-50/70 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 truncate">
                          {lab.title}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                          {lab.type}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                        {lab.description || "No description provided"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-neutral-500 capitalize">
                        {lab.status || "active"}
                      </span>
                      <Link
                        to={`/admin/labs/${lab.id}/edit` as any}
                        className="text-neutral-400 hover:text-neutral-800 p-1"
                        title="Edit lab"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Recent Users / Quick Operations */}
        <div className="space-y-6">
          <Panel
            title="Recent Users"
            action={
              <Link
                to="/admin/users"
                className="text-xs text-[#f7931e] hover:underline inline-flex items-center gap-1 font-medium"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            {loading ? (
              <div className="py-8 flex justify-center text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                No users found.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recentUsers.map((u: any, idx) => (
                  <div
                    key={u.id || idx}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-neutral-900 truncate">
                        {u.first_name || u.last_name
                          ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                          : u.username || u.email}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">{u.email}</div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 capitalize shrink-0">
                      {u.role || "student"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
