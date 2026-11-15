import type { WeeklyTask, DayTicketItem } from "./types";
import { formatWeekRange } from "./api";
import { DayRow } from "./DayRow";

interface TaskCardProps {
  task: WeeklyTask | null;
  loading?: boolean;
  fadeKey?: string;
  onSolve: (dayIndex: number, ticket?: DayTicketItem) => void;
  onReview: (dayIndex: number, ticket?: DayTicketItem) => void;
  onEnroll?: () => void;
}

export function TaskCard({
  task,
  loading = false,
  fadeKey,
  onSolve,
  onReview,
  onEnroll,
}: TaskCardProps) {
  if (loading || !task) {
    return (
      <section className="card">
        <div className="top">
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ width: "120px", height: "12px", marginBottom: "8px" }} />
            <div className="skel" style={{ width: "240px", height: "32px", marginBottom: "8px" }} />
            <div className="skel" style={{ width: "80%", height: "16px" }} />
          </div>
          <div className="enr">
            <div className="skel" style={{ width: "60px", height: "32px", marginBottom: "4px" }} />
            <div className="skel" style={{ width: "40px", height: "12px" }} />
          </div>
        </div>
        <div className="prog" style={{ marginTop: "24px" }}>
          <div className="skel" style={{ width: "100%", height: "6px" }} />
        </div>
        <div className="days" style={{ marginTop: "20px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel" style={{ width: "100%", height: "64px", margin: "12px 0" }} />
          ))}
        </div>
      </section>
    );
  }

  const totalDays = task.days?.length || (task.type === "monthly" ? 30 : 7);
  const startDate = task.weekStart ? new Date(task.weekStart) : undefined;
  const weekRange = formatWeekRange(startDate, totalDays).toUpperCase();
  const labelPrefix = task.type === "monthly" ? "MONTHLY TASK" : "WEEKLY TASK";
  const enrolledFormatted = Number(task.enrolledCount).toLocaleString("en-IN");
  const completedCount = task.days.filter((d) => d.status === "completed").length;
  const percent = Math.round((completedCount / totalDays) * 100);

  return (
    <section key={fadeKey} className="card fade" id="main">
      <div className="top">
        <div>
          <div className="eye">{labelPrefix} · {weekRange}</div>
          <h1>{task.name}</h1>
          <p>{task.description}</p>
        </div>
        {task.isEnrolled === false ? (
          <div className="enr" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <div>
              <b>{enrolledFormatted}</b>
              <span>enrolled</span>
            </div>
            <button
              type="button"
              className="btn"
              onClick={onEnroll}
              style={{ fontSize: "13.5px", padding: "7px 16px" }}
            >
              Enroll in task
            </button>
          </div>
        ) : (
          <div className="enr">
            <b>{enrolledFormatted}</b>
            <span>enrolled</span>
          </div>
        )}
      </div>

      <div className="prog">
        <div
          className="seg"
          aria-hidden="true"
          style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}
        >
          {task.days.map((_, i) => (
            <i
              key={i}
              className={task.days[i]?.status === "completed" ? "on" : ""}
            />
          ))}
        </div>
        <div className="pt">
          <span>
            <b>{completedCount}</b> of {totalDays} days completed
          </span>
          <span>{percent}%</span>
        </div>
      </div>

      <div className="days">
        {task.days.map((day) => (
          <DayRow
            key={day.index}
            day={day}
            isEnrolled={task.isEnrolled !== false}
            onSolve={onSolve}
            onReview={onReview}
            onEnroll={() => onSolve(day.index)}
          />
        ))}
      </div>
    </section>
  );
}
