import React, { useRef, useState, useEffect } from "react";
import {
  ContributionDay,
  groupIntoWeeks,
  computeMonthLabelPositions,
  formatCellTooltip,
} from "@/lib/heatmapHelpers";

interface HeatmapChartProps {
  contributions: ContributionDay[];
  compact?: boolean;
}

export const getHeatmapCellColor = (level: 0 | 1 | 2 | 3 | 4): string => {
  switch (level) {
    case 1:
      return "bg-[var(--heat-1)]";
    case 2:
      return "bg-[var(--heat-2)]";
    case 3:
      return "bg-[var(--heat-3)]";
    case 4:
      return "bg-[var(--heat-4)]";
    default:
      return "bg-[var(--heat-0)]";
  }
};

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  contributions,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(compact ? 10 : 11);
  const columns = groupIntoWeeks(contributions);
  const monthLabelPositions = computeMonthLabelPositions(columns, 53);
  const weekdays = ["", "Mon", "", "Wed", "", "Fri", ""];

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const availableWidth = entry.contentRect.width - (compact ? 24 : 36);
        const computed = Math.floor((availableWidth - 52 * 3) / 53);
        const clamped = Math.max(compact ? 8 : 10, Math.min(14, computed));
        setCellSize(clamped);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [compact]);

  return (
    <div ref={containerRef} className="relative overflow-x-auto pb-2 pt-1 select-none">
      <div className="min-w-[640px] space-y-1.5">
        {/* Month labels aligned to columns */}
        <div className={`relative h-4 text-[11px] text-muted ${compact ? "ml-6" : "ml-8"}`}>
          {monthLabelPositions.map(({ month, columnIndex }) => (
            <span
              key={`${month}-${columnIndex}`}
              className="absolute transform -translate-x-1"
              style={{
                left: `${columnIndex * (cellSize + 3)}px`,
              }}
            >
              {month}
            </span>
          ))}
        </div>

        {/* Grid with Weekdays */}
        <div className="flex items-start gap-2">
          {!compact && (
            <div className="flex flex-col gap-[3px] text-[10px] text-muted w-6 shrink-0 text-right pr-1">
              {weekdays.map((wd, idx) => (
                <div
                  key={idx}
                  style={{ height: `${cellSize}px` }}
                  className="leading-none flex items-center justify-end"
                >
                  {wd}
                </div>
              ))}
            </div>
          )}

          {/* 53 columns */}
          <div className="flex gap-[3px]">
            {columns.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[3px]">
                {col.days.map((day, dIdx) => {
                  if (!day) {
                    return (
                      <div
                        key={dIdx}
                        style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                        className="bg-transparent rounded-[2px]"
                      />
                    );
                  }
                  const cellColor = getHeatmapCellColor(day.level);
                  const tooltip = formatCellTooltip(day.date, day.count);
                  return (
                    <div
                      key={day.date}
                      title={tooltip}
                      aria-label={tooltip}
                      tabIndex={0}
                      style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                      className={`${cellColor} rounded-[2px] transition-transform hover:scale-125 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 pt-2 text-[11px] text-muted pr-1">
          <span>Less</span>
          <span
            className="w-[10px] h-[10px] rounded-[2px] bg-[var(--heat-0)]"
            title="Level 0: No activity"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] bg-[var(--heat-1)]"
            title="Level 1"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] bg-[var(--heat-2)]"
            title="Level 2"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] bg-[var(--heat-3)]"
            title="Level 3"
          />
          <span
            className="w-[10px] h-[10px] rounded-[2px] bg-[var(--heat-4)]"
            title="Level 4"
          />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
