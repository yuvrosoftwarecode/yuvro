import React from "react";
import { Card } from "@/components/profile-ui/Card";
import { Achievement } from "../types";
import { ProgressBar } from "@/components/profile-ui/ProgressBar";

interface AchievementsCardProps {
  achievements: Achievement[];
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  achievements,
}) => {
  const getMonogram = (ach: Achievement) => {
    if (ach.id.includes("first-lab") || ach.title.toLowerCase().includes("first")) return "1st";
    if (ach.id.includes("7-day") || ach.title.toLowerCase().includes("7-day")) return "7d";
    if (ach.id.includes("sprint") || ach.title.toLowerCase().includes("sprint")) return "5x";
    if (ach.id.includes("bug") || ach.id.includes("ticket") || ach.title.toLowerCase().includes("100")) return "100";
    if (ach.id.includes("interview") || ach.title.toLowerCase().includes("interview")) return "8+";
    if (ach.id.includes("30-day") || ach.title.toLowerCase().includes("30-day")) return "30d";
    return ach.title.slice(0, 3);
  };

  const unlockedCount = achievements.filter((a) => a.earned).length;

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-line pb-2.5">
          <h2 className="text-base font-semibold text-ink">Achievements</h2>
          <span className="text-xs text-muted">
            {unlockedCount} of {achievements.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.slice(0, 6).map((ach) => {
            const isUnlocked = Boolean(ach.earned);
            const inProgress = Boolean(ach.progress && !ach.earned);
            const percent = inProgress && ach.progress
              ? Math.min(100, Math.round((ach.progress.current / ach.progress.max) * 100))
              : 0;

            const monogram = getMonogram(ach);

            return (
              <div
                key={ach.id}
                className={`p-3 rounded-card border transition-all flex items-start gap-3 ${
                  isUnlocked
                    ? "bg-card border-line hover:border-primary/40"
                    : inProgress
                    ? "bg-card/70 border-line"
                    : "bg-bg/60 border-line/60 opacity-60"
                }`}
              >
                {/* Typographic Monogram */}
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                    isUnlocked
                      ? "bg-primary-subtle text-primary ring-1 ring-primary/30"
                      : inProgress
                      ? "bg-gray-100 dark:bg-gray-800 text-sub"
                      : "bg-line/40 text-muted"
                  }`}
                >
                  {monogram}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-semibold text-xs text-ink truncate" title={ach.title}>
                      {ach.title}
                    </h3>
                    {isUnlocked && (
                      <span className="text-[10px] font-semibold text-success uppercase">
                        Done
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted leading-tight" title={ach.description}>
                    {ach.description}
                  </p>

                  {inProgress && ach.progress && (
                    <div className="pt-1 space-y-1">
                      <div className="flex justify-between text-[10px] text-muted">
                        <span>{ach.progress.current} / {ach.progress.max}</span>
                        <span>{percent}%</span>
                      </div>
                      <ProgressBar value={percent} height={4} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
