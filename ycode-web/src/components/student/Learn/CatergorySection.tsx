import React from "react";
import LearnCourseCard from "./LearnCourseCard";
import type { Course } from "../Learn/types";

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,340px)] gap-6 transition-all duration-300 ease-in-out">
        {courses.map((c) => {
          const progress = Math.max(0, Math.min(100, progressMap[c.id] ?? 0));

          return (
            <LearnCourseCard
              key={c.id}
              id={c.id}
              name={c.name}
              category={c.category}
              topicCount={c.topic_count || c.topics?.length || 0}
              progress={progress}
              onStartLearning={onStartLearning}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CategorySection;