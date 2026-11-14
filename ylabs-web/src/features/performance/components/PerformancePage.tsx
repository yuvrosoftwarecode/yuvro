import React, { useEffect } from "react";
import { usePerformanceStore } from "../store/performanceStore";
import { StatTiles } from "./StatTiles";
import { HeatmapCard } from "./HeatmapCard";
import { MockInterviewChart } from "./MockInterviewChart";
import { AchievementsCard } from "./AchievementsCard";
import { SkillsRadarCard } from "./SkillsRadarCard";
import { RecentActivityList } from "./RecentActivityList";
import { PerformanceTabSkeleton } from "@/features/profile/components/ProfileSkeleton";

export const PerformancePage: React.FC = () => {
  const { data, loading, fetchPerformance } = usePerformanceStore();

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  if (loading || !data) {
    return <PerformanceTabSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* 4 Stat Tiles */}
      <StatTiles stats={data} />

      {/* 53x7 Contributions Heatmap Card */}
      <HeatmapCard contributions={data.contributions} stats={data.stats} />

      {/* 2-column row: Mock interview performance on left, Achievements on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <MockInterviewChart data={data.mockInterview} />
        <AchievementsCard achievements={data.achievements} />
      </div>

      {/* Skills in labs radar chart */}
      <SkillsRadarCard />

      {/* Recent Activity with Underline Tabs */}
      <RecentActivityList activities={data.recentActivity} />
    </div>
  );
};
