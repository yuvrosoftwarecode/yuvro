import React from "react";
import { Card } from "@/components/profile-ui/Card";
import { PerformanceStats } from "../types";

interface StatTilesProps {
  stats: PerformanceStats;
}

export const StatTiles: React.FC<StatTilesProps> = ({ stats }) => {
  const tiles = [
    {
      id: "labs",
      label: "Labs completed",
      value: stats.labsCompleted ?? 0,
      sub: "Simulation labs",
    },
    {
      id: "sprints",
      label: "Sprints shipped",
      value: stats.sprintsShipped ?? 0,
      sub: "Production sprints",
    },
    {
      id: "tickets",
      label: "Tickets closed",
      value: stats.ticketsClosed ?? 0,
      sub: "Tasks & bug fixes",
    },
    {
      id: "interviews",
      label: "Mock interviews",
      value: stats.mockInterviews ?? 0,
      sub: "AI & peer assessments",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((tile) => (
        <Card key={tile.id} className="p-5 space-y-1">
          <div className="text-3xl font-semibold text-ink tracking-tight">
            {tile.value}
          </div>
          <div className="text-sm font-medium text-sub">{tile.label}</div>
          <div className="text-xs text-muted pt-0.5">{tile.sub}</div>
        </Card>
      ))}
    </div>
  );
};
