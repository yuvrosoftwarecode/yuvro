import React from "react";
import ModernCard from "@/components/common/ModernCard";
import { getSubjectStyle } from "@/utils/subjectIcon";
import type { Subject } from "../Learn/types";

interface Props {
  title: string;
  icon: React.ReactNode;
  subjects: Subject[];
  progressMap: { [k: string]: number };
  onStartLearning: (id: string) => void;
}



const CategorySection: React.FC<Props> = ({ title, icon, subjects, progressMap, onStartLearning }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          {icon}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subjects.map((s, index) => {
          const progress = Math.max(0, Math.min(100, progressMap[s.id] ?? 0));
          const displayName = s.name || (s as any).subject_name || '';
          const style = getSubjectStyle(displayName, index);
          const subjectIcon = <style.icon className="w-6 h-6" />;

          return (
            <ModernCard
              key={s.id}
              title={displayName}
              description={
                s.units?.length
                  ? s.units.slice(0, 3).map(u => u.name).join(", ")
                  : "No units yet"
              }
              icon={subjectIcon}
              iconClassName={`${style.bg} ${style.text}`}
              gradientColor={style.gradient}
              progress={progress}
              tags={[
                { text: `${s.units?.length || 0} Units`, variant: "secondary" }
              ]}
              actionLabel={progress > 0 ? "Continue Learning" : "Start Learning"}
              onAction={() => onStartLearning(String(s.id))}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CategorySection;