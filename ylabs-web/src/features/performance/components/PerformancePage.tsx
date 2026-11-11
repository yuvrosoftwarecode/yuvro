import React, { useEffect, useState } from "react";
import { performanceApi } from "../api/performanceApi";
import { PerformanceStats } from "../types";
import { StatTiles } from "./StatTiles";
import { HeatmapCard } from "./HeatmapCard";
import { MockInterviewChart } from "./MockInterviewChart";
import { AchievementsCard } from "./AchievementsCard";
import { RecentActivityList } from "./RecentActivityList";
import { PerformanceTabSkeleton } from "@/features/profile/components/ProfileSkeleton";

export const PerformancePage: React.FC = () => {
  const [data, setData] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    performanceApi.getPerformance().then((res) => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !data) {
    return <PerformanceTabSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 Stat Tiles */}
      <StatTiles stats={data} />

      {/* 53x7 Contributions Heatmap Card */}
      <HeatmapCard contributions={data.contributions} stats={data.stats} />

      {/* 2-column row: Mock interview performance on left, Achievements on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <MockInterviewChart data={data.mockInterview} />
        <AchievementsCard achievements={data.achievements} />
      </div>

      {/* Recent Activity with Underline Tabs */}
      <RecentActivityList activities={data.recentActivity} />
    </div>
  );
};
