import React from "react";
import { Card } from "@/components/profile-ui/Card";
import { MockInterviewPerformance } from "../types";

interface MockInterviewChartProps {
  data: MockInterviewPerformance;
}

export const MockInterviewChart: React.FC<MockInterviewChartProps> = ({
  data,
}) => {
  const points = data.trendPoints || [];
  const hasInterviews = points.length > 0;
  const dimensions = data.dimensions || [];

  const width = 360;
  const height = 90;
  const paddingX = 12;
  const paddingY = 16;

  const minVal = points.length > 0 ? Math.max(0, Math.min(...points) - 1) : 0;
  const maxVal = points.length > 0 ? Math.min(10, Math.max(...points) + 1) : 10;
  const range = maxVal - minVal || 1;

  const getX = (idx: number) =>
    points.length <= 1
      ? width / 2
      : paddingX + (idx * (width - 2 * paddingX)) / (points.length - 1);
  const getY = (val: number) =>
    height - paddingY - ((val - minVal) * (height - 2 * paddingY)) / range;

  const coordinates = points.map((p, idx) => ({ x: getX(idx), y: getY(p), val: p }));

  const pathD = coordinates.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const lastCoord = coordinates[coordinates.length - 1];

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-base font-semibold text-ink">Mock interview performance</h2>

      {hasInterviews ? (
        <>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-ink">
                {data.latestScore > 0 ? data.latestScore : points[points.length - 1]}
              </span>
              <span className="text-sm font-medium text-muted">/ 10</span>
            </div>
            <p className="text-xs text-muted">
              Latest of {points.length} {points.length === 1 ? "interview" : "interviews"}
            </p>
          </div>

          {/* SVG Trend Line */}
          <div className="w-full pt-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-[80px] overflow-visible"
              aria-label="Score trend chart"
            >
              {points.length > 1 ? (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#3558c8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {lastCoord && (
                <circle
                  cx={lastCoord.x}
                  cy={lastCoord.y}
                  r="4.5"
                  fill="#3558c8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>

          {/* Dimension Bars */}
          {dimensions.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-line/60">
              {dimensions.map((dim) => (
                <div key={dim.name} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-sub font-normal w-32 truncate">{dim.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#e4e7ec] dark:bg-[#242c38] overflow-hidden">
                    <div
                      className="h-full bg-[#3558c8] rounded-full"
                      style={{ width: `${dim.percentage}%` }}
                    />
                  </div>
                  <span className="text-ink font-semibold w-6 text-right">{dim.score}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="py-8 text-center space-y-2">
          <p className="text-sm text-sub font-medium">No mock interviews completed yet</p>
          <p className="text-xs text-muted max-w-xs mx-auto">
            Take practice technical interviews in Yuvro to assess your competencies and track your progress over time.
          </p>
        </div>
      )}
    </Card>
  );
};
