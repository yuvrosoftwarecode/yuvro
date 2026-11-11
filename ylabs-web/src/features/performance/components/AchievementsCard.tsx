import React from "react";
import { Card } from "@/components/profile-ui/Card";
import { Achievement } from "../types";

interface AchievementsCardProps {
  achievements: Achievement[];
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  achievements,
}) => {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-base font-semibold text-ink">Achievements</h2>

      <div className="space-y-4">
        {achievements.map((ach) => {
          const badgeText = ach.icon || "★";
          return (
            <div key={ach.id} className="space-y-2">
              <div className="flex items-start gap-3">
                {/* Soft blue pill badge */}
                <div className="h-7 w-8 rounded-md bg-[#eef4ff] text-[#3558c8] font-bold text-xs flex items-center justify-center shrink-0">
                  {badgeText}
                </div>

                <div className="space-y-0.5">
                  <h3 className="font-semibold text-xs text-ink">{ach.title}</h3>
                  <p className="text-xs text-muted leading-tight">
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* Progress bar if not yet unlocked */}
              {ach.progress && !ach.earned && (
                <div className="ml-11 h-1.5 rounded-full bg-[#e4e7ec] dark:bg-[#242c38] overflow-hidden">
                  <div
                    className="h-full bg-[#3558c8] rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (ach.progress.current / ach.progress.max) * 100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
