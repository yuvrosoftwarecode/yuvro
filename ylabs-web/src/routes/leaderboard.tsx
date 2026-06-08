import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { leaderboard } from "@/lib/dummy";
import { Trophy, Flame } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({ component: Leaderboard });

function Leaderboard() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Trophy className="h-6 w-6 text-warning" />Global leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top learners across all labs · resets monthly.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {leaderboard.slice(0,3).map((u, i) => (
            <div key={u.rank} className={`rounded-xl border bg-card p-5 text-center relative overflow-hidden ${i === 0 ? "ring-glow" : ""}`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: ["var(--warning)","var(--muted-foreground)","var(--java)"][i] }} />
              <div className="text-3xl">{["🥇","🥈","🥉"][i]}</div>
              <div className="mt-2 grid h-14 w-14 mx-auto place-items-center rounded-full bg-accent font-semibold">{u.avatar}</div>
              <div className="mt-2 font-medium">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.xp.toLocaleString()} XP · {u.streak}d streak</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-xs text-muted-foreground">
              <tr><th className="p-3 text-left">Rank</th><th className="text-left">User</th><th>XP</th><th>Streak</th><th>Labs</th></tr>
            </thead>
            <tbody>
              {leaderboard.map((u) => (
                <tr key={u.rank} className={`border-t ${u.isYou ? "bg-primary/10" : "hover:bg-accent/30"}`}>
                  <td className="p-3 font-mono">#{u.rank}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs">{u.avatar}</span>
                      <span>{u.name}{u.isYou && <span className="ml-2 text-xs text-primary">(you)</span>}</span>
                    </div>
                  </td>
                  <td className="text-center text-primary">{u.xp.toLocaleString()}</td>
                  <td className="text-center"><span className="inline-flex items-center gap-1 text-warning"><Flame className="h-3 w-3" />{u.streak}</span></td>
                  <td className="text-center text-muted-foreground">4</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
