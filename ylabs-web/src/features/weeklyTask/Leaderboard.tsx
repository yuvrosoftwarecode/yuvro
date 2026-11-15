import type { LeaderboardEntry } from "./types";

interface LeaderboardProps {
  taskName: string;
  top: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  loading?: boolean;
  totalDays?: number;
  periodLabel?: string;
  onViewAll: () => void;
}

export function Leaderboard({
  taskName,
  top,
  userEntry,
  loading = false,
  totalDays = 7,
  periodLabel = "this week",
  onViewAll,
}: LeaderboardProps) {
  if (loading) {
    return (
      <section className="card" id="lb">
        <div className="sh">
          <h2>Leaderboard</h2>
          <div className="skel" style={{ width: "50px", height: "14px" }} />
        </div>
        <div className="skel" style={{ width: "120px", height: "12px", marginBottom: "16px" }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skel" style={{ width: "100%", height: "24px", margin: "8px 0" }} />
        ))}
      </section>
    );
  }

  return (
    <section className="card" id="lb">
      <div className="sh">
        <h2>Leaderboard</h2>
        <button type="button" className="lk" onClick={onViewAll}>
          View all
        </button>
      </div>
      <p className="sub">{taskName} · {periodLabel}</p>

      {top.length === 0 ? (
        <p className="sub" style={{ marginTop: "12px" }}>
          No submissions yet.
        </p>
      ) : (
        <>
          {top.map((e, i) => (
            <div key={i} className={`lb${e.isYou ? " you" : ""}`}>
              <span className="r">{e.rank}</span>
              <b style={{ fontWeight: e.isYou ? 600 : 500 }}>{e.name}</b>
              <span className="d">{e.daysDone}/{totalDays}</span>
              <span className="p">{e.points} YP</span>
            </div>
          ))}

          {userEntry && (
            <>
              <div className="gap">···</div>
              <div className="lb you">
                <span className="r">
                  {Number(userEntry.rank).toLocaleString("en-IN")}
                </span>
                <b>You</b>
                <span className="d">{userEntry.daysDone}/{totalDays}</span>
                <span className="p">{userEntry.points} YP</span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
