import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import {
  ContributionDay,
  ContributionStats,
} from "@/lib/heatmapHelpers";
import { HeatmapChart } from "../charts/HeatmapChart";

interface HeatmapCardProps {
  contributions: ContributionDay[];
  stats: ContributionStats;
}

export const HeatmapCard: React.FC<HeatmapCardProps> = ({
  contributions,
  stats,
}) => {
  const [selectedRange, setSelectedRange] = useState("Last 12 months");

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      {/* Header with Title and Range select */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Contributions</h2>
          <p className="text-xs text-muted mt-0.5">
            Engineering activity across simulation labs, sprint commits, and code evaluations
          </p>
        </div>

        {/* Native select */}
        <select
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value)}
          aria-label="Filter contribution range"
          className="rounded-input border border-line bg-card px-2.5 py-1 text-xs text-sub focus:border-primary focus:outline-none cursor-pointer self-start sm:self-auto"
        >
          <option value="Last 12 months">Last 12 months</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </div>

      {/* Summary Row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 text-xs">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-ink tracking-tight">
            {stats.total ?? 0}
          </span>
          <span className="text-xs text-muted">contributions in the past year</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted">
          <span>
            Active days: <strong className="text-ink font-semibold">{stats.activeDays ?? 0}</strong>
          </span>
          <span>
            Current streak:{" "}
            <strong className="text-ink font-semibold">
              {stats.currentStreak ?? 0} {stats.currentStreak === 1 ? "day" : "days"}
            </strong>
          </span>
          <span>
            Longest streak:{" "}
            <strong className="text-ink font-semibold">
              {stats.longestStreak ?? 0} {stats.longestStreak === 1 ? "day" : "days"}
            </strong>
          </span>
        </div>
      </div>

      {/* Heatmap Grid Component */}
      <HeatmapChart contributions={contributions} />

      {stats.total === 0 && (
        <div className="pt-2 border-t border-line text-xs text-muted flex items-center justify-between flex-wrap gap-2">
          <span>No contributions yet. Complete a lab or close a ticket to light up your first square.</span>
          <a
            href="/student/dashboard"
            className="hover:text-primary font-medium hover:underline transition-colors"
          >
            Browse labs &rarr;
          </a>
        </div>
      )}
    </Card>
  );
};
