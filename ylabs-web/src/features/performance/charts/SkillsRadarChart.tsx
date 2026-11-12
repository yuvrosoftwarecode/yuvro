import React from "react";

export interface RadarCategory {
  name: string;
  score: number; // 0 to 100
}

interface SkillsRadarChartProps {
  categories: RadarCategory[];
  size?: number;
}

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({
  categories,
  size = 230,
}) => {
  if (!categories || categories.length < 3) {
    return null;
  }

  const center = size / 2;
  const radius = size * 0.38;
  const numAxes = categories.length;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const getPoint = (fraction: number, index: number) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    return {
      x: center + radius * fraction * Math.cos(angle),
      y: center + radius * fraction * Math.sin(angle),
    };
  };

  const polygonPoints = categories
    .map((cat, idx) => {
      const fraction = Math.max(0.05, Math.min(1, cat.score / 100));
      const pt = getPoint(fraction, idx);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  return (
    <div className="relative flex items-center justify-center py-2">
      <svg
        width={size}
        height={size}
        className="overflow-visible"
        aria-label="Competency radar chart"
      >
        {/* Concentric grid polygons */}
        {levels.map((lvl) => (
          <polygon
            key={lvl}
            points={Array.from({ length: numAxes })
              .map((_, idx) => {
                const pt = getPoint(lvl, idx);
                return `${pt.x},${pt.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-line"
          />
        ))}

        {/* Axes lines */}
        {Array.from({ length: numAxes }).map((_, idx) => {
          const pt = getPoint(1, idx);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-line"
            />
          );
        })}

        {/* Value polygon in orange */}
        <polygon
          points={polygonPoints}
          className="fill-primary/20 stroke-primary"
          strokeWidth="2"
        />

        {/* Category labels around perimeter */}
        {categories.map((cat, idx) => {
          const labelPt = getPoint(1.22, idx);
          const angle = (Math.PI * 2 / numAxes) * idx - Math.PI / 2;
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (Math.cos(angle) > 0.3) textAnchor = "start";
          else if (Math.cos(angle) < -0.3) textAnchor = "end";

          return (
            <text
              key={cat.name}
              x={labelPt.x}
              y={labelPt.y}
              textAnchor={textAnchor}
              dominantBaseline="central"
              className="text-[11px] font-medium fill-current text-sub select-none"
            >
              {cat.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
