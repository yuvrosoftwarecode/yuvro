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
      zeroHint: "Start your first lab",
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
      sub: "AI assessments",
    },
  ];

  const allZero = tiles.every((t) => t.value === 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((tile) => (
          <Card
            key={tile.id}
            className="p-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div className="text-2xl font-bold text-ink tracking-tight">
              {tile.value}
            </div>
            <div className="mt-1">
              <div className="text-xs font-semibold text-sub">{tile.label}</div>
              <div className="text-[11px] text-muted">{tile.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {allZero && (
        <p className="text-xs text-muted italic px-1">
          Complete labs, sprint tickets, and mock interviews to track your live engineering performance.
        </p>
      )}
    </div>
  );
};
