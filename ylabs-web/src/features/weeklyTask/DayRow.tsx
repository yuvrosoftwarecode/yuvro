import type { Day, DayTicketItem } from "./types";
import { DAY_NAMES, formatDayDate } from "./api";

interface DayRowProps {
  day: Day;
  isEnrolled?: boolean;
  onSolve: (dayIndex: number, ticket?: DayTicketItem) => void;
  onReview: (dayIndex: number, ticket?: DayTicketItem) => void;
  onEnroll?: () => void;
}

const TICK_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke="#fff"
      fill="none"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function DayRow({
  day,
  isEnrolled = true,
  onSolve,
  onReview,
  onEnroll,
}: DayRowProps) {
  const isCompleted = day.status === "completed";
  const isToday = day.status === "today";
  const isMissed = day.status === "missed";
  const isLocked = day.status === "locked";

  const dayName = day.dayName || DAY_NAMES[day.index] || `Day ${day.index + 1}`;
  const formattedDate = day.dateDisplay || formatDayDate(day.index);

  let markerClass = "mk";
  if (isCompleted) {
    markerClass = "mk done";
  } else if (isToday) {
    markerClass = "mk now";
  } else if (isMissed) {
    markerClass = "mk past";
  }

  const primaryTicket = day.tickets?.[0];

  return (
    <div className={`day${isToday ? " now" : ""}`}>
      {isCompleted ? (
        <div className={markerClass} aria-label="Completed">
          {TICK_ICON}
        </div>
      ) : (
        <div className={markerClass}>{day.index + 1}</div>
      )}

      <div>
        <div className="dm">
          Day {day.index + 1} · {dayName}, {formattedDate}
          {isToday && (
            <>
              {" · "}
              <span className="t">Today</span>
            </>
          )}
        </div>
        <h3>{day.title}</h3>
        <p>{day.description}</p>
        {day.tickets && day.tickets.length > 1 && (
          <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {day.tickets.map((tk, idx) => {
              const tkDone = tk.is_completed || isCompleted;
              return (
                <button
                  key={tk.ticket_id || idx}
                  type="button"
                  onClick={() =>
                    tkDone ? onReview(day.index, tk) : onSolve(day.index, tk)
                  }
                  style={{
                    fontSize: "12px",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: tkDone ? "var(--rowhi)" : "var(--fill)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title={tkDone ? "Click to review submission" : "Click to solve ticket"}
                >
                  <span
                    style={{
                      color: tkDone ? "var(--green)" : "var(--muted)",
                      fontWeight: 600,
                    }}
                  >
                    {tkDone ? "✓" : "•"}
                  </span>
                  <span style={{ fontWeight: 500 }}>{tk.title}</span>
                  <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                    · {tk.yuvro_points || 10} YP
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="x">
          {day.minutes} min · {day.points} YP
          {day.tickets && day.tickets.length > 1 && ` · ${day.tickets.length} tickets`}
          {isMissed && " · Not completed"}
        </div>
      </div>

      <div className={`act${isLocked ? " lock" : ""}`}>
        {!isEnrolled ? (
          <button
            type="button"
            className="btn s"
            onClick={onEnroll}
          >
            Enroll to solve
          </button>
        ) : isCompleted ? (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span className="ok">Completed</span>
            <button
              type="button"
              className="lk"
              onClick={() => onReview(day.index, primaryTicket)}
            >
              Review
            </button>
          </div>
        ) : isLocked ? (
          <>Opens {dayName}</>
        ) : isToday ? (
          <button
            type="button"
            className="btn"
            onClick={() => onSolve(day.index, primaryTicket)}
          >
            Solve ticket
          </button>
        ) : isMissed ? (
          <button
            type="button"
            className="btn s"
            onClick={() => onSolve(day.index, primaryTicket)}
          >
            Solve ticket
          </button>
        ) : null}
      </div>
    </div>
  );
}
