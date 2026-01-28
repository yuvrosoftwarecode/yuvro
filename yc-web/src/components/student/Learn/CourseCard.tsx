import React from "react";
import { Card } from "@/components/ui/card";
import ProgressBar from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  progress: number;
  topicsCount: number;
  onStartLearning: (id: string) => void;
  iconClassName?: string;
}

const CourseCard: React.FC<CourseCardProps> = ({
  id,
  icon,
  title,
  description = "No topics yet",
  progress,
  topicsCount,
  onStartLearning,
  iconClassName = "bg-blue-50 text-blue-600"
}) => {
  return (
    <Card
      onClick={() => onStartLearning(id)}
      className="group relative bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 w-[320px] h-[220px] p-5 flex flex-col justify-between cursor-pointer rounded-xl overflow-hidden"
    >
      {/* Top Row: Icon and Topic Count */}
      <div className="flex items-start justify-between">
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", iconClassName)}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
          {topicsCount} TOPICS
        </span>
      </div>

      {/* Middle: Title and Description */}
      <div className="mt-4 mb-auto">
        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          {title}
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
          {description}
        </p>
      </div>

      {/* Bottom: Progress */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-500">Progress</span>
          <span className="text-xs font-semibold text-blue-600">{Math.round(progress)}%</span>
        </div>
        <div className="relative h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;
