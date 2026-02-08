import React from "react";
import ModernCard from "@/components/common/ModernCard";
import type { Subject } from "../Learn/types";

interface Props {
  title: string;
  icon: React.ReactNode;
  subjects: Subject[];
  progressMap: { [k: string]: number };
  onStartLearning: (id: string) => void;
}

const getSubjectStyle = (id: string | number) => {
  const styles = [
    { bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-indigo-600" },
    { bg: "bg-purple-50", text: "text-purple-600", gradient: "from-purple-500 to-violet-600" },
    { bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-teal-600" },
    { bg: "bg-amber-50", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
    { bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-pink-600" },
    { bg: "bg-indigo-50", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-600" },
    { bg: "bg-cyan-50", text: "text-cyan-600", gradient: "from-cyan-500 to-sky-600" },
  ];

  // Simple hash to ensuring consistent color for the same subject ID
  const index = String(id).charCodeAt(0) % styles.length;
  return styles[index];
};

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
        {subjects.map((s) => {
          const progress = Math.max(0, Math.min(100, progressMap[s.id] ?? 0));
          const style = getSubjectStyle(s.id);

          return (
            <ModernCard
              key={s.id}
              title={s.name}
              description={
                s.units?.length
                  ? s.units.slice(0, 3).map(u => u.name).join(", ")
                  : "No units yet"
              }
              icon={icon}
              iconClassName={`${style.bg} ${style.text}`}
              gradientColor={style.gradient}
              progress={progress}
              tags={[
                { text: `${s.units?.length || 0} Units`, variant: "secondary" }
              ]}
              actionLabel={progress > 0 ? "Continue Learning" : "Start Learning"}
              onAction={() => onStartLearning(s.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CategorySection;