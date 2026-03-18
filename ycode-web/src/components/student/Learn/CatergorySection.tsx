import React from "react";
import ModernCard from "@/components/common/ModernCard";
import type { Course } from "../Learn/types";
import { getCourseIconConfig } from "@/utils/CourseIcons";

interface Props {
  title: string;
  icon: React.ReactNode;
  courses: Course[];
  progressMap: { [k: string]: number };
  onStartLearning: (id: string) => void;
}

const CategorySection: React.FC<Props> = ({ title, icon, courses, progressMap, onStartLearning }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          {icon}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((c) => {
          const progress = Math.max(0, Math.min(100, progressMap[c.id] ?? 0));
          // Use new config
          const config = getCourseIconConfig(c.name, c.category);
          const IconComponent = config.Icon;

          return (
            <ModernCard
              key={c.id}
              title={c.name}
              description={
                c.topics?.length
                  ? c.topics.slice(0, 3).map(t => t.name).join(", ")
                  : "No topics yet"
              }
              icon={<IconComponent className="w-6 h-6 text-white" />}
              iconClassName={`${config.bg} p-2 rounded-lg`}
              // stats grid style: bg-color p-3 rounded-lg with white icon

              gradientColor={config.gradient || "from-blue-500"} // mapping gradient if available
              progress={progress}
              tags={[
                { text: `${c.topics?.length || 0} Topics`, variant: "secondary" }
              ]}
              actionLabel={progress > 0 ? "Continue Learning" : "Start Learning"}
              onAction={() => onStartLearning(c.id)}
              className="!h-[280px] !min-h-[280px] !max-h-[280px] w-full"
            />
          );
        })}
      </div>
    </div>
  );
};

export default CategorySection;