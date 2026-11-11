import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { ContributionDay, ContributionStats } from "../types";
import { groupIntoWeeks } from "@/lib/heatmapHelpers";

interface HeatmapCardProps {
  contributions: ContributionDay[];
  stats: ContributionStats;
}

export const HeatmapCard: React.FC<HeatmapCardProps> = ({
  contributions,
  stats,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    day: ContributionDay;
    x: number;
    y: number;
  } | null>(null);

  const columns = groupIntoWeeks(contributions);

  const getCellClass = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 1:
        return "bg-[#9be9a8] dark:bg-[#0e4429]";
      case 2:
        return "bg-[#40c463] dark:bg-[#006d32]";
      case 3:
        return "bg-[#30a14e] dark:bg-[#26a641]";
      case 4:
        return "bg-[#216e39] dark:bg-[#39d353]";
      case 0:
      default:
        return "bg-[#ebedf0] dark:bg-[#1f2937]";
    }
  };

  const monthLabels = [
    "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"
  ];

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-base font-semibold text-ink">Contributions</h2>

      {/* Subheader: counts and streaks */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-ink text-sm">
          {stats.total ?? 0} contributions in the past year
        </span>

        <div className="flex items-center gap-6 text-xs text-muted">
          <span>
            Active days{" "}
            <span className="font-semibold text-ink">{stats.activeDays ?? 0}</span>
          </span>
          <span>
            Current streak{" "}
            <span className="font-semibold text-ink">{stats.currentStreak ?? 0}</span>
          </span>
          <span>
            Longest streak{" "}
            <span className="font-semibold text-ink">{stats.longestStreak ?? 0}</span>
          </span>
        </div>
      </div>

      {/* 53x7 Grid Container */}
      <div className="overflow-x-auto pb-1 pt-2">
        <div className="min-w-[680px]">
          {/* Month labels */}
          <div className="flex justify-between text-xs text-muted mb-2 px-1 select-none">
            {monthLabels.map((m, idx) => (
              <span key={idx} className="w-12 text-left">
                {m}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {columns.map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-[3px]">
                {col.days.map((day) => (
                  <div
                    key={day.date}
                    className={`h-[11px] w-[11px] rounded-[2px] transition-colors cursor-pointer ${getCellClass(
                      day.level
                    )}`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredDay({
                        day,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend at bottom right */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted pt-2 select-none">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[#ebedf0] dark:bg-[#1f2937]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[#40c463] dark:bg-[#006d32]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]" />
          <span className="h-[10px] w-[10px] rounded-[2px] bg-[#216e39] dark:bg-[#39d353]" />
        </div>
        <span>More</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-none rounded bg-[#101828] text-white px-2 py-1 text-xs shadow-md"
          style={{
            left: hoveredDay.x,
            top: hoveredDay.y - 6,
          }}
        >
          <span className="font-semibold">{hoveredDay.day.count} contributions</span> on{" "}
          {new Date(hoveredDay.day.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}
    </Card>
  );
};
