import type { TaskStats } from "./types";

interface StatsCardProps {
  taskName: string;
  stats: TaskStats | null;
  totalDays?: number;
  periodLabel?: string;
  loading?: boolean;
}

export function StatsCard({
  taskName,
  stats,
  totalDays = 7,
  periodLabel = "this week",
  loading = false,
}: StatsCardProps) {
  if (loading || !stats) {
    return (
      <section className="card" id="stats">
        <div className="sh">
          <h2>Your progress</h2>
        </div>
        <div className="skel" style={{ width: "120px", height: "12px", marginBottom: "16px" }} />
        <div className="st">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="skel" style={{ width: "70px", height: "24px", marginBottom: "6px" }} />
              <div className="skel" style={{ width: "90px", height: "12px" }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const rankDisplay = stats.rank
    ? `#${Number(stats.rank).toLocaleString("en-IN")}`
    : "–";
  const enrolledDisplay = Number(stats.totalEnrolled).toLocaleString("en-IN");
  const streakUnit = stats.streak === 1 ? "day" : "days";

  return (
    <section className="card" id="stats">
      <div className="sh">
        <h2>Your progress</h2>
      </div>
      <p className="sub">{taskName} · {periodLabel}</p>

      <div className="st">
        <div>
          <b>
            {rankDisplay} <small>of {enrolledDisplay}</small>
          </b>
          <span>Rank</span>
        </div>

        <div>
          <b>
            {stats.points} <small>YP</small>
          </b>
          <span>Points earned</span>
        </div>

        <div>
          <b>
            {stats.daysCompleted} <small>of {totalDays}</small>
          </b>
          <span>Days completed</span>
        </div>

        <div>
          <b>
            {stats.streak} <small>{streakUnit}</small>
          </b>
          <span>Current streak</span>
        </div>

        <div>
          <b>
            {stats.daysCompleted > 0 && stats.avgMinutes != null ? (
              <>
                {stats.avgMinutes} <small>min</small>
              </>
            ) : (
              "–"
            )}
          </b>
          <span>Avg. time per ticket</span>
        </div>

        <div>
          <b>
            {stats.daysCompleted > 0 && stats.avgScorePct != null ? (
              <>
                {stats.avgScorePct}
                <small>%</small>
              </>
            ) : (
              "–"
            )}
          </b>
          <span>Avg. score</span>
        </div>
      </div>
    </section>
  );
}
