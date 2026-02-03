import React from "react";
import { FileText, History, Table } from "lucide-react";
import type { Stats } from "../Learn/types";
import { StatsCard } from "@/components/common/StatsCard";

const StatsGrid: React.FC<{ stats: Stats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatsCard
        label="Lessons Completed"
        value={stats.lessons_completed}
        icon={FileText}
        colorScheme="green"
      />

      <StatsCard
        label="Time Invested"
        value={stats.time_spent}
        icon={History}
        colorScheme="purple"
      />

      <StatsCard
        label="Avg. Progress"
        value={`${stats.avg_progress}%`}
        icon={Table}
        colorScheme="amber"
      />
    </div>
  );
};

export default StatsGrid;
