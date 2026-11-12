import React from "react";
import { Card } from "@/components/profile-ui/Card";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { ProgressBar } from "@/components/profile-ui/ProgressBar";
import { SkillsRadarChart, RadarCategory } from "../charts/SkillsRadarChart";

export const SkillsRadarCard: React.FC = () => {
  const { profile } = useProfileStore();
  const verified = profile?.verifiedSkills || [];

  // Group verified skills into real categories
  // For each verified skill: Beginner = 50, Intermediate = 75, Advanced = 95
  const categoryMap: Record<string, { totalScore: number; count: number }> = {};

  verified.forEach((skill) => {
    const score =
      skill.level === "Advanced" ? 95 : skill.level === "Intermediate" ? 75 : 50;
    const catName = skill.name;
    if (!categoryMap[catName]) {
      categoryMap[catName] = { totalScore: 0, count: 0 };
    }
    categoryMap[catName].totalScore += score;
    categoryMap[catName].count += 1;
  });

  const categories: RadarCategory[] = Object.entries(categoryMap).map(
    ([name, data]) => ({
      name,
      score: Math.round(data.totalScore / data.count),
    })
  );

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <div>
          <h2 className="text-base font-semibold text-ink">Skills in labs</h2>
          <p className="text-xs text-muted mt-0.5">
            Demonstrated competency from completed simulation tasks
          </p>
        </div>
        <span className="text-xs text-muted">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </span>
      </div>

      {categories.length === 0 ? (
        /* 0 categories: single-line empty state */
        <div className="py-6 text-center">
          <p className="text-xs text-muted italic">
            Complete simulation labs to generate your verified competency profile.
          </p>
        </div>
      ) : categories.length < 3 ? (
        /* 1-2 categories: horizontal progress bars */
        <div className="space-y-3 py-2 max-w-md">
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-sub">
                <span className="font-medium text-ink">{cat.name}</span>
                <span className="font-semibold text-primary">{cat.score}%</span>
              </div>
              <ProgressBar value={cat.score} height={6} />
            </div>
          ))}
          <p className="text-[11px] text-muted pt-1">
            Complete tasks in at least 3 skill areas to unlock the full competency radar chart.
          </p>
        </div>
      ) : (
        /* >=3 categories: Radar chart from charts/ */
        <div className="py-2">
          <SkillsRadarChart categories={categories} />
        </div>
      )}
    </Card>
  );
};
