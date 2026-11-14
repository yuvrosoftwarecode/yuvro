import React, { useState } from "react";
import { Section } from "@/components/profile-ui/Section";
import { useProfileStore } from "../store/profileStore";
import { SkillLevel } from "../types";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { Button } from "@/components/profile-ui/Button";

const SUGGESTED_SKILLS = ["React", "TypeScript", "Node.js", "Python", "SQL", "Docker", "Git"];

export const SkillsSection: React.FC = () => {
  const { profile, addSkill, removeSkill } = useProfileStore();
  const [newSkill, setNewSkill] = useState("");
  const [skillError, setSkillError] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);

  const verifiedSkills = profile?.verifiedSkills || [];
  const userSkills = profile?.userSkills || [];

  const handleAddSkill = async (skillToAdd?: string) => {
    const raw = skillToAdd !== undefined ? skillToAdd : newSkill;
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Case-insensitive duplicate check
    const exists = userSkills.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setSkillError("This skill is already in your profile");
      return;
    }

    setSkillError("");
    const ok = await addSkill(trimmed);
    if (ok && skillToAdd === undefined) {
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
                ? "bg-primary"
                : "bg-line"
            }`}
          />
        ))}
      </div>
    );
  };

  const displayedSkills = showAllSkills ? userSkills : userSkills.slice(0, 16);
  const remainingCount = userSkills.length - 16;

  return (
    <Section title="Skills" eyebrow="Competencies">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Verified in Yuvro Labs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
              Verified in Yuvro labs
            </span>
            <span className="text-[11px] text-muted">Earned in simulation</span>
          </div>

          {verifiedSkills.length > 0 ? (
            <div
              className={`grid gap-3 ${
                verifiedSkills.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {verifiedSkills.map((v) => (
                <div
                  key={v.id}
                  className="rounded-card border border-line bg-card p-3.5 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-ink truncate">
                      {v.name}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-subtle text-primary font-medium shrink-0">
                      {v.level}
                    </span>
                  </div>

                  {renderLevelBar(v.level)}

                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-medium text-ink">
                      {v.tasksCount} {v.tasksCount === 1 ? "verified task" : "verified tasks"}
                    </span>
                    <span className="text-[11px] text-success font-semibold">Verified</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No verified skills yet"
              description="Complete simulation labs and challenges in Yuvro Labs to prove your skills with verifiable evidence."
              action={
                <a
                  href="/student/dashboard"
                  className="inline-flex items-center px-3 py-1.5 rounded-input bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors"
                >
                  Browse simulation labs &rarr;
                </a>
              }
            />
          )}
        </div>

        {/* Right Column: Other Skills */}
        <div className="space-y-3 lg:border-l lg:border-line lg:pl-6">
          <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
            Other skills
          </div>

          {userSkills.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5 items-center">
                {displayedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="group inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-line bg-card text-sub text-xs font-medium transition-colors hover:border-primary/40"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-muted hover:text-danger text-xs font-bold leading-none cursor-pointer -mr-1 px-1"
                      aria-label={`Remove ${skill}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}

                {!showAllSkills && remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSkills(true)}
                    className="h-7 px-2.5 text-xs hover:text-primary font-medium hover:underline cursor-pointer transition-colors"
                  >
                    +{remainingCount} more
                  </button>
                )}

                {showAllSkills && userSkills.length > 16 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSkills(false)}
                    className="h-7 px-2.5 text-xs hover:text-primary font-medium hover:underline cursor-pointer transition-colors"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted">Add technologies, frameworks, and tools you use:</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {SUGGESTED_SKILLS.map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => handleAddSkill(suggested)}
                    className="h-7 px-3 rounded-full border border-dashed border-line bg-card hover:bg-primary-subtle hover:text-primary hover:border-primary text-muted text-xs font-medium transition-colors cursor-pointer"
                  >
                    + {suggested}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add skill input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddSkill();
            }}
            className="flex items-center gap-2 max-w-sm pt-2"
          >
            <input
              type="text"
              value={newSkill}
              onChange={(e) => {
                setNewSkill(e.target.value);
                if (skillError) setSkillError("");
              }}
              placeholder="Add a skill, e.g. Docker"
              className="flex-1 h-9 rounded-input border border-line bg-card px-3 text-xs sm:text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/22"
            />
            <Button type="submit" size="sm" variant="primary">
              Add
            </Button>
          </form>

          {skillError && (
            <p className="text-xs text-danger" role="alert">
              {skillError}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
};
