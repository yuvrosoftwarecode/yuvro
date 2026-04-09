import React from "react";
import { getCourseIconConfig, getPastelStyle } from "@/utils/CourseIcons";

interface LearnCourseCardProps {
  id: string;
  name: string;
  category?: string;
  topicCount: number;
  progress: number;
  onStartLearning: (id: string) => void;
}



// Map the Tailwind `bg-*` class from CourseIcons into inline-friendly hex pairs
const BG_TO_GRADIENT: Record<string, { from: string; to: string }> = {
  // Blues
  "bg-blue-500":    { from: "#3B82F6", to: "#6366F1" },
  "bg-blue-600":    { from: "#2563EB", to: "#4F46E5" },
  "bg-blue-700":    { from: "#1D4ED8", to: "#3730A3" },
  // Reds / Oranges
  "bg-red-600":     { from: "#DC2626", to: "#EA580C" },
  "bg-orange-400":  { from: "#FB923C", to: "#F97316" },
  "bg-orange-500":  { from: "#F97316", to: "#EF4444" },
  // Greens
  "bg-green-500":   { from: "#22C55E", to: "#10B981" },
  "bg-green-800":   { from: "#166534", to: "#14532D" },
  "bg-emerald-600": { from: "#10B981", to: "#059669" }, // More vibrant Emerald to Green
  // Purples / Pinks
  "bg-purple-500":  { from: "#A855F7", to: "#D946EF" }, // High-vibrancy Purple/Fuchsia
  "bg-purple-600":  { from: "#8B5CF6", to: "#C026D3" }, // Deep Violet/Magenta
  "bg-rose-500":    { from: "#F43F5E", to: "#FB7185" }, // Energetic Rose/Red-Pink
  // Cyans / Indigos
  "bg-cyan-500":    { from: "#06B6D4", to: "#3B82F6" },
  "bg-indigo-500":  { from: "#6366F1", to: "#A855F7" },
  "bg-indigo-600":  { from: "#4F46E5", to: "#06B6D4" }, // Pro Technical Indigo to Cyan
  "bg-sky-500":     { from: "#0EA5E9", to: "#3B82F6" },
  // Yellows
  "bg-yellow-400":  { from: "#FACC15", to: "#F59E0B" },
  // Dark / Neutral
  "bg-slate-800":   { from: "#1E293B", to: "#334155" },
  "bg-gray-500":    { from: "#6B7280", to: "#4B5563" },
};

function getGradientColors(bgClass: string): { from: string; to: string } {
  return (
    BG_TO_GRADIENT[bgClass] || { from: "#6B7280", to: "#4B5563" }
  );
}

const LearnCourseCard: React.FC<LearnCourseCardProps> = ({
  id,
  name,
  category,
  topicCount,
  progress,
  onStartLearning,
}) => {
  const config = getCourseIconConfig(name, category);
  const IconComponent = config.Icon;
  const gradientColors = getGradientColors(config.bg);

  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  // Progress bar color — green when in progress, gray when 0
  const barColor = pct > 0 ? "#22C55E" : "#D1D5DB";

  return (
    <div
      onClick={() => onStartLearning(id)}
      className="group relative cursor-pointer rounded-lg border border-gray-100 bg-white shadow hover:shadow-md pl-4 pr-3 py-4 overflow-hidden h-full w-[340px] transition-all duration-200 ease-in-out"
      style={{ minHeight: "110px" }}
    >
      {/* Card content */}
      <div className="relative z-10 flex flex-col gap-3">
        {/* Top row: Icon + Name */}
        <div className="flex items-center gap-2">
          {(() => {
            const pastel = getPastelStyle(config.bg);
            return (
              <div
                className={`${pastel.bg} w-10 h-10 flex items-center justify-center rounded-lg shrink-0`}
              >
                <IconComponent className={`w-5 h-5 ${pastel.text}`} />
              </div>
            );
          })()}

          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-medium text-gray-900 truncate leading-tight">
              {name}
            </h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {topicCount} {topicCount === 1 ? "topic" : "topics"}
            </p>
          </div>
        </div>

        {/* Bottom row: Status + Progress bar + percentage */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
              {pct === 100 ? 'Completed' : pct > 0 ? 'In progress' : 'Not started'}
            </span>
            <span className="text-[11px] font-semibold text-gray-600 tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="w-full h-[5px] bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnCourseCard;
