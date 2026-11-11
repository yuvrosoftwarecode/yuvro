import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { useProfileStore } from "../store/profileStore";
import { SkillLevel } from "../types";

export const SkillsSection: React.FC = () => {
  const { profile, addSkill, removeSkill } = useProfileStore();
  const [newSkill, setNewSkill] = useState("");
  const [skillError, setSkillError] = useState("");

  const verifiedSkills = profile?.verifiedSkills || [];
  const userSkills = profile?.userSkills || [];

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (!trimmed) return;

    // Duplicate check (case-insensitive)
    const exists = userSkills.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setSkillError("This skill is already in your profile");
      return;
    }

    setSkillError("");
    const ok = await addSkill(trimmed);
    if (ok) {
      setNewSkill("");
    }
  };

  const renderLevelBar = (level: SkillLevel) => {
    const activeSegments =
      level === "Advanced" ? 3 : level === "Intermediate" ? 2 : 1;

    return (
      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full my-2">
        {[1, 2, 3].map((seg) => (
          <div
            key={seg}
            className={`h-full rounded-full transition-colors ${
              seg <= activeSegments
                ? "bg-[#3558c8]"
                : "bg-[#e4e7ec] dark:bg-[#242c38]"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="p-6 space-y-5">
      <h2 className="text-base font-semibold text-ink">Skills</h2>

      {/* Verified in Yuvro Labs */}
      <div className="space-y-3">
        <p className="text-xs text-muted">Verified in Yuvro labs</p>

        {verifiedSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {verifiedSkills.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-line bg-card p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-ink">{v.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#eef4ff] text-[#3558c8] font-medium">
                    {v.level}
                  </span>
                </div>

                {renderLevelBar(v.level)}

                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="text-[#12b76a] font-bold">✓</span>
                  <span>{v.tasksCount} verified tasks</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">
            No verified lab skills yet. Complete tasks in simulation labs to earn verified badges.
          </p>
        )}
      </div>

      {/* Other skills */}
      <div className="space-y-3 pt-2">
        <p className="text-xs text-muted">Other skills</p>

        {userSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2 items-center">
            {userSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-line bg-card text-sub text-xs"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-muted hover:text-ink cursor-pointer ml-0.5"
                  aria-label={`Remove ${skill}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">
            No skills added yet. Add technologies or tools below.
          </p>
        )}

        {/* Add skill form */}
        <form onSubmit={handleAddSkill} className="flex items-center gap-2 max-w-sm pt-1">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => {
              setNewSkill(e.target.value);
              if (skillError) setSkillError("");
            }}
            placeholder="Add a skill, e.g. Docker"
            className="flex-1 rounded-[8px] border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-[8px] border border-line bg-card px-4 py-1.5 text-sm font-medium text-sub hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Add
          </button>
        </form>

        {skillError && (
          <p className="text-xs text-danger" role="alert">
            {skillError}
          </p>
        )}
      </div>
    </Card>
  );
};
