import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import "./weeklyTask.css";
import type { WeeklyTask, LeaderboardEntry, TaskStats, Day, DayTicketItem } from "./types";
import {
  getTasks,
  getTask,
  getLeaderboard,
  getStats,
  completeDay,
} from "./api";
import { incrementLocalYP, invalidateStudentStats } from "@/lib/studentStats";
import { TaskTabs } from "./TaskTabs";
import { TaskCard } from "./TaskCard";
import { Leaderboard } from "./Leaderboard";
import { StatsCard } from "./StatsCard";
import { StartLabModal } from "@/components/student/StartLabModal";

interface WeeklyTaskPageProps {
  initialTaskId?: string;
  onTaskChange?: (taskId: string) => void;
}

export function WeeklyTaskPage({
  initialTaskId,
  onTaskChange,
}: WeeklyTaskPageProps) {
  const nav = useNavigate();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialTaskId || "");
  const [currentTask, setCurrentTask] = useState<WeeklyTask | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    top: LeaderboardEntry[];
    userEntry: LeaderboardEntry | null;
    rank: number | null;
  }>({ top: [], userEntry: null, rank: null });
  const [stats, setStats] = useState<TaskStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals for working left card interactions
  const [solveModal, setSolveModal] = useState<{
    day: Day;
    ticket?: DayTicketItem;
  } | null>(null);

  const [reviewModal, setReviewModal] = useState<{
    day: Day;
    ticket?: DayTicketItem;
  } | null>(null);

  const [isSolving, setIsSolving] = useState(false);

  // State for creating repository dialog when starting a lab workspace
  const [repoModalState, setRepoModalState] = useState<{
    isOpen: boolean;
    labId: string;
    labSlug: string;
    labName: string;
    ticketId: string;
    defaultRepoName: string;
  } | null>(null);
  const [isRepoCreating, setIsRepoCreating] = useState(false);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 2400);
  }, []);

  const loadData = useCallback(
    async (taskIdToSelect?: string) => {
      try {
        setError(null);
        setLoading(true);

        const allTasks = await getTasks();
        setTasks(allTasks);

        const targetId =
          taskIdToSelect ||
          initialTaskId ||
          (selectedId && allTasks.some((t) => t.id === selectedId) ? selectedId : "") ||
          (allTasks.length > 0 ? allTasks[0].id : "");

        setSelectedId(targetId);

        const taskData =
          allTasks.find((t) => t.id === targetId) ||
          (targetId ? await getTask(targetId) : null) ||
          allTasks[0] ||
          null;
        setCurrentTask(taskData);

        if (taskData) {
          const [lbData, statsData] = await Promise.all([
            getLeaderboard(taskData.id),
            getStats(taskData.id),
          ]);
          setLeaderboard(lbData);
          setStats(statsData);
        }
      } catch (err: any) {
        console.error("Failed to load weekly task data:", err);
        setError("Failed to load weekly tasks. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [selectedId, initialTaskId]
  );

  useEffect(() => {
    loadData(initialTaskId);
  }, [initialTaskId]);

  const handleSelectTab = async (taskId: string) => {
    if (taskId === selectedId) return;
    setSelectedId(taskId);
    if (onTaskChange) {
      onTaskChange(taskId);
    } else if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("task", taskId);
      window.history.pushState({}, "", url.toString());
    }

    try {
      const taskData = await getTask(taskId);
      setCurrentTask(taskData);
      if (taskData) {
        const [lbData, statsData] = await Promise.all([
          getLeaderboard(taskData.id),
          getStats(taskData.id),
        ]);
        setLeaderboard(lbData);
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error switching task tab:", err);
    }
  };

  const getLabSlugForDay = (day: Day): string => {
    return (
      day.labId ||
      currentTask?.labId ||
      day.labSlug ||
      currentTask?.labSlug ||
      (currentTask?.id === "dj"
        ? "pydjango"
        : currentTask?.id === "ds"
        ? "datastructures"
        : currentTask?.id === "sd"
        ? "system-design"
        : "git")
    );
  };

  const handleGoToIDE = async (day: Day, ticket?: DayTicketItem) => {
    const labId = String(day.labId || currentTask?.labId || "");
    const labSlug = String(day.labSlug || currentTask?.labSlug || "");
    const labTitle = currentTask?.name || "Lab Workspace";
    const ticketId =
      ticket?.ticket_id ||
      ticket?.ticket_slug ||
      day.ticketId ||
      day.tickets?.[0]?.ticket_id ||
      day.tickets?.[0]?.ticket_slug ||
      "GIT-101";

    const routeSlug = labId || labSlug || getLabSlugForDay(day);

    try {
      const { default: api } = await import("@/utils/RestApiAuthUtil");
      const enrollments = await api.get<any[]>("/lab/enrollments/").catch(() => []);
      const list = Array.isArray(enrollments) ? enrollments : (enrollments as any)?.results || [];

      const matched = list.find((e: any) => {
        if (!e) return false;
        const eid = String(typeof e.lab === "object" ? e.lab?.id : e.lab);
        const eidAlt = String(e.lab_id ?? e.lab_details?.id ?? "");
        const eslug = String(e.lab_slug ?? e.lab_details?.slug ?? "");
        return (
          (labId && (eid === labId || eidAlt === labId)) ||
          (labSlug && (eslug === labSlug || eslug === routeSlug))
        );
      });

      const hasRepo = Boolean(
        matched &&
        (matched.github_repo_name || matched.github_repo_url || matched.repo_url || matched.is_ready)
      );

      const taskId = currentTask?.id || selectedId || "";
      const returnUrl = `/student/weekly-task?id=${taskId}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("weekly_task_return_url", returnUrl);
        sessionStorage.setItem("weekly_task_id", taskId);
        sessionStorage.setItem("from_weekly_task", "true");
      }

      if (hasRepo) {
        // Repo already connected -> navigate straight to IDE
        nav({
          to: "/student/lab/$slug/ticket/$ticketId",
          params: { slug: routeSlug, ticketId } as any,
          search: { from: "weekly-task" } as any,
        });
      } else {
        // Repo not connected -> show dialog to create repo
        const cleanName = (labTitle || "lab")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        setRepoModalState({
          isOpen: true,
          labId,
          labSlug: routeSlug,
          labName: labTitle,
          ticketId,
          defaultRepoName: `yuvro_${cleanName || "lab"}`,
        });
      }
    } catch (err) {
      console.error("Error checking lab repo enrollment:", err);
      const taskId = currentTask?.id || selectedId || "";
      const returnUrl = `/student/weekly-task?id=${taskId}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("weekly_task_return_url", returnUrl);
        sessionStorage.setItem("weekly_task_id", taskId);
        sessionStorage.setItem("from_weekly_task", "true");
      }
      nav({
        to: "/student/lab/$slug/ticket/$ticketId",
        params: { slug: routeSlug, ticketId } as any,
        search: { from: "weekly-task" } as any,
      });
    }
  };

  const handleConfirmCreateRepo = async (repoName: string) => {
    if (!repoModalState) return;
    setIsRepoCreating(true);
    try {
      const { default: api } = await import("@/utils/RestApiAuthUtil");
      const payloadLabId =
        !isNaN(Number(repoModalState.labId)) && !repoModalState.labId.includes("-")
          ? Number(repoModalState.labId)
          : repoModalState.labId;

      await api.post("/lab/enrollments/", {
        lab: payloadLabId,
        lab_id: payloadLabId,
        github_repo_name: repoName,
      });

      const { labId, labSlug, ticketId } = repoModalState;
      setRepoModalState(null);
      showToast("Repository created! Opening IDE workspace...");
      const taskId = currentTask?.id || selectedId || "";
      const returnUrl = `/student/weekly-task?id=${taskId}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("weekly_task_return_url", returnUrl);
        sessionStorage.setItem("weekly_task_id", taskId);
        sessionStorage.setItem("from_weekly_task", "true");
      }
      nav({
        to: "/student/lab/$slug/ticket/$ticketId",
        params: {
          slug: labId || labSlug,
          ticketId,
        } as any,
        search: { from: "weekly-task" } as any,
      });
    } catch (err: any) {
      console.error("Failed to create repository:", err);
      let errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to create repository. Please try again.";
      try {
        if (errMsg.startsWith('["') && errMsg.endsWith('"]')) {
          const parsed = JSON.parse(errMsg);
          if (Array.isArray(parsed) && parsed.length > 0) errMsg = parsed[0];
        } else if (errMsg.startsWith("{")) {
          const parsed = JSON.parse(errMsg);
          if (parsed.errors?.[0]?.message) errMsg = parsed.errors[0].message;
          else if (parsed.message) errMsg = parsed.message;
        }
      } catch {}
      showToast(errMsg);
    } finally {
      setIsRepoCreating(false);
    }
  };

  const handleSolve = async (dayIndex: number, ticket?: DayTicketItem) => {
    if (!currentTask) return;
    const targetDay = currentTask.days[dayIndex];
    if (!targetDay) return;

    if (!currentTask.isEnrolled) {
      await handleEnroll();
    }

    await handleGoToIDE(targetDay, ticket);
  };

  const handleReview = (dayIndex: number, ticket?: DayTicketItem) => {
    if (!currentTask) return;
    const targetDay = currentTask.days[dayIndex];
    if (!targetDay) return;
    setReviewModal({ day: targetDay, ticket });
  };

  const handleConfirmSolve = async (dayIndex: number) => {
    if (!currentTask) return;
    setIsSolving(true);
    try {
      const { task: updatedTask, stats: updatedStats } = await completeDay(
        currentTask.id,
        dayIndex
      );
      setCurrentTask(updatedTask);
      setStats(updatedStats);

      // Refresh leaderboard
      const updatedLb = await getLeaderboard(currentTask.id);
      setLeaderboard(updatedLb);

      // Update task in tasks list
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );

      // Instantly update TopNav points and invalidate stats cache
      incrementLocalYP(10);
      invalidateStudentStats();

      setSolveModal(null);

      // Check if all days in challenge are now completed
      const allDone = updatedTask.days.every((d) => d.status === "completed");
      if (allDone) {
        incrementLocalYP(20); // 20 bonus YP
        showToast(`🎉 Weekly task completed! +30 YP (including 20 YP bonus)!`);
      } else {
        showToast(`Day ${dayIndex + 1} completed · +10 YP`);
      }
    } catch (err) {
      console.error("Failed to solve day ticket:", err);
      showToast("Failed to complete ticket. Please try again.");
    } finally {
      setIsSolving(false);
    }
  };

  const handleOpenWorkspace = (day: Day, ticket?: DayTicketItem) => {
    setSolveModal(null);
    handleGoToIDE(day, ticket);
  };

  const handleOpenReviewWorkspace = (day: Day, ticket?: DayTicketItem) => {
    const slug = getLabSlugForDay(day);
    const ticketId = ticket?.ticket_id || ticket?.ticket_slug || day.ticketId || "GIT-101";
    setReviewModal(null);
    const returnUrl = `/student/weekly-task?id=${currentTask?.id || selectedId}`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("weekly_task_return_url", returnUrl);
      sessionStorage.setItem("from_weekly_task", "true");
    }
    try {
      nav({
        to: "/student/lab/$slug/ticket/$ticketId/review",
        params: { slug, ticketId } as any,
        search: { from: "weekly-task" } as any,
      });
    } catch (e) {
      console.warn("Could not route to ticket review:", e);
      showToast(`Opening review for ${ticket?.title || day.title}...`);
    }
  };

  const handleEnroll = async (dayIndexToSolve?: number) => {
    if (!currentTask) return;
    try {
      const backendMod = await import("../../lib/weeklyTasks.ts").catch(() => null);
      if (backendMod?.enrollInWeeklyTask) {
        await backendMod.enrollInWeeklyTask(currentTask.id).catch(() => {});
      }
      const updated: WeeklyTask = {
        ...currentTask,
        isEnrolled: true,
        enrolledCount: (currentTask.enrolledCount || 0) + 1,
      };
      setCurrentTask(updated);
      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      showToast(`Successfully enrolled in ${currentTask.name}!`);
      if (typeof dayIndexToSolve === "number") {
        const day = updated.days[dayIndexToSolve];
        if (day) {
          await handleGoToIDE(day);
        }
      }
    } catch {
      showToast(`Enrolled in ${currentTask.name}`);
      if (typeof dayIndexToSolve === "number") {
        const day = currentTask.days[dayIndexToSolve];
        if (day) {
          await handleGoToIDE(day);
        }
      }
    }
  };

  const handleViewAll = () => {
    showToast("Opens the full leaderboard");
  };

  return (
    <div className="wt-container">
      <main className="pg">
        <Link to="/student/dashboard" className="back">
          ← Back to dashboard
        </Link>

        {error ? (
          <div style={{ padding: "24px 0", color: "var(--muted)" }}>
            <span>{error}</span>{" "}
            <button
              type="button"
              className="lk"
              onClick={() => loadData(selectedId)}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <TaskTabs
              tasks={tasks}
              selectedId={selectedId}
              onSelect={handleSelectTab}
            />

            <div className="grid">
              <TaskCard
                task={currentTask}
                loading={loading}
                fadeKey={selectedId}
                onSolve={handleSolve}
                onReview={handleReview}
                onEnroll={handleEnroll}
              />

              <aside className="side">
                <Leaderboard
                  taskName={currentTask?.name ?? ""}
                  top={leaderboard.top}
                  userEntry={leaderboard.userEntry}
                  loading={loading}
                  totalDays={currentTask?.days?.length || 7}
                  periodLabel={currentTask?.type === "monthly" ? "this month" : "this week"}
                  onViewAll={handleViewAll}
                />

                <StatsCard
                  taskName={currentTask?.name ?? ""}
                  stats={stats}
                  totalDays={currentTask?.days?.length || 7}
                  periodLabel={currentTask?.type === "monthly" ? "this month" : "this week"}
                  loading={loading}
                />
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Create Repo Dialog if repo is not connected */}
      {repoModalState && (
        <StartLabModal
          isOpen={repoModalState.isOpen}
          onClose={() => setRepoModalState(null)}
          labName={repoModalState.labName}
          defaultRepoName={repoModalState.defaultRepoName}
          onConfirm={handleConfirmCreateRepo}
          isLoading={isRepoCreating}
        />
      )}

      {/* Interactive Review Modal */}
      {reviewModal && (
        <div
          className="modal-overlay"
          onClick={() => setReviewModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div className="eye">
                  DAY {reviewModal.day.index + 1} · {reviewModal.day.dayName?.toUpperCase()},{" "}
                  {reviewModal.day.dateDisplay?.toUpperCase()}
                </div>
                <h2>Review Submission</h2>
              </div>
              <button
                type="button"
                className="lk"
                onClick={() => setReviewModal(null)}
                style={{ fontSize: "18px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "var(--rowhi)",
                  border: "1px solid var(--line)",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "14.5px" }}>
                    {reviewModal.ticket?.title || reviewModal.day.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    {reviewModal.day.description}
                  </div>
                </div>
                <span className="ok" style={{ fontWeight: 600, fontSize: "13px" }}>
                  ✓ 100% Passed
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  margin: "14px 0",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--fill)",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                    Status
                  </span>
                  <b style={{ color: "var(--green)" }}>Completed</b>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                    Score
                  </span>
                  <b style={{ color: "var(--ink)" }}>100%</b>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                    Points Earned
                  </span>
                  <b style={{ color: "var(--blue)" }}>
                    +{reviewModal.ticket?.yuvro_points || reviewModal.day.points || 10} YP
                  </b>
                </div>
              </div>

              <div style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.5 }}>
                ✓ Automated tests ran and passed without errors.<br />
                ✓ Code changes verified and committed to repository.<br />
                ✓ Daily streak and leaderboard points recorded.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn s"
                onClick={() => handleOpenReviewWorkspace(reviewModal.day, reviewModal.ticket)}
              >
                Open in Full Review →
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setReviewModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={toastMessage ? "on" : ""}
      >
        {toastMessage}
      </div>
    </div>
  );
}
export default WeeklyTaskPage;
