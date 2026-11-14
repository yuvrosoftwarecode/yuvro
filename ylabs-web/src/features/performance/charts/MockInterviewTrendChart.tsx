import React from "react";

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

        {coordinates.map((coord, idx) => (
          <circle
            key={idx}
            cx={coord.x}
            cy={coord.y}
            r={idx === coordinates.length - 1 ? 5 : 3.5}
            className="cursor-pointer transition-transform hover:scale-125"
            fill="var(--color-primary, #ea580c)"
          >
            <title>{`Interview #${idx + 1}: ${coord.val} / 10`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
};
