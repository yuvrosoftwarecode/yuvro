import React, { useState } from "react";

interface MockInterviewTrendChartProps {
  scores: number[];
  width?: number;
  height?: number;
}

export const MockInterviewTrendChart: React.FC<MockInterviewTrendChartProps> = ({
  scores,
  width = 300,
  height = 90,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!scores || scores.length === 0) {
    return null;
  }

  const paddingX = 14;
  const paddingY = 16;
  const minScore = 0;
  const maxScore = 10;

  const getY = (val: number) => {
    const fraction = (val - minScore) / (maxScore - minScore);
    return height - paddingY - fraction * (height - paddingY * 2);
  };

  const getX = (index: number) => {
    if (scores.length <= 1) return width / 2;
    return paddingX + (index / (scores.length - 1)) * (width - paddingX * 2);
  };

  const coordinates = scores.map((val, idx) => ({
    x: getX(idx),
    y: getY(val),
    val,
  }));

  const pathD = coordinates.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    return `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  return (
    <div className="relative w-full pt-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[85px] overflow-visible"
        aria-label="Score trend chart"
      >
        {/* Horizontal guide lines */}
        <line
          x1={paddingX}
          y1={getY(8)}
          x2={width - paddingX}
          y2={getY(8)}
          stroke="currentColor"
          strokeDasharray="3 3"
          className="text-line"
        />

        {scores.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-primary, #ea580c)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coordinates.map((coord, idx) => {
          const isLatest = idx === coordinates.length - 1;
          const isHovered = hoveredIdx === idx;
          const coreRadius = isHovered ? (isLatest ? 6.5 : 5) : (isLatest ? 5 : 3.5);

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible larger hit target (32px diameter) to prevent any mouse boundary jitter */}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={16}
                fill="transparent"
                style={{ pointerEvents: "all" }}
              />

              {/* Smooth halo on hover */}
              {isHovered && (
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={coreRadius + 3.5}
                  fill="var(--color-primary, #ea580c)"
                  opacity={0.2}
                />
              )}

              {/* Core dot - radius transition without any scale transform shifts */}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={coreRadius}
                fill="var(--color-primary, #ea580c)"
                style={{ transition: "r 150ms ease" }}
              />
              <title>{`Interview #${idx + 1}: ${coord.val} / 10`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
