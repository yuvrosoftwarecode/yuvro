// src/features/Learn/components/CourseCard.tsx
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/ui/ProgressBar";


interface Props {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  progress: number;
  onStartLearning: (id: string) => void;
  actionLabel?: string;
  completedActionLabel?: string;
}

const CourseCard: React.FC<Props> = ({
  id,
  icon,
  title,
  description,
  progress,
  onStartLearning,
  actionLabel = "Start Learning",
  completedActionLabel = "Revisit and Learn"
}) => {
  const hasStarted = progress > 0;

  return (
    <Card className="group w-[400px] h-[250px] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-gray-200 py-4 flex flex-col">
      <CardHeader className="pt-2 pb-2 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-200 group-hover:from-blue-200 group-hover:to-blue-400">
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold line-clamp-1">{title}</CardTitle>
              <span className="text-xs text-muted-foreground block">{progress}% complete</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-2 pb-2 flex flex-col flex-1">
        <p className="text-base text-gray-700 font-medium mb-4 line-clamp-3">{description}</p>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-blue-600">{progress}%</span>
          </div>
          <ProgressBar
            value={progress}
            height={12}
            trackClassName="bg-gradient-to-r from-blue-100 to-cyan-100 shadow-inner"
            barClassName="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <Button
            size="sm"
            className={`w-full rounded-lg text-white hover:opacity-90 transition-opacity shadow-md mt-4 font-semibold tracking-wide ${progress >= 100
              ? "bg-gradient-to-r from-green-500 to-emerald-500"
              : "bg-gradient-to-r from-blue-500 to-cyan-500"
              }`}
            onClick={() => onStartLearning(id)}
          >
            {progress >= 100 ? completedActionLabel : hasStarted ? (actionLabel === "Start Learning" ? "Continue Learning" : actionLabel) : actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
