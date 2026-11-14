import React, { useEffect } from "react";
import { Card } from "@/components/profile-ui/Card";
import { HeatmapChart } from "@/features/performance/charts/HeatmapChart";
import { usePerformanceStore } from "@/features/performance/store/performanceStore";
import { ContributionStats } from "@/lib/heatmapHelpers";

interface OverviewContributionCardProps {
  onSeePerformance?: () => void;
}

export const OverviewContributionCard: React.FC<OverviewContributionCardProps> = ({
  onSeePerformance,
}) => {
  const { data, fetchPerformance } = usePerformanceStore();

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const contributions = data?.contributions || [];
  const stats: ContributionStats = data?.stats || {
    total: 0,
    activeDays: 0,
    currentStreak: 0,
    longestStreak: 0,
  };

  return (
    <Card className="p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-ink">Contribution activity</h2>
          <span className="text-xs text-muted">
            &bull; {stats.total} contributions in the last year
          </span>
        </div>

        {onSeePerformance && (
          <button
            type="button"
            onClick={onSeePerformance}
            className="text-xs hover:text-primary font-medium hover:underline cursor-pointer transition-colors"
          >
            See performance &rarr;
          </button>
        )}
      </div>

      <HeatmapChart contributions={contributions} compact={true} />

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
