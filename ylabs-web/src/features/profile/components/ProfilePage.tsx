import React from "react";
import { AboutSection } from "./AboutSection";
import { WorkSection } from "./WorkSection";
import { ProjectsSection } from "./ProjectsSection";
import { EducationSection } from "./EducationSection";
import { SkillsSection } from "./SkillsSection";
import { ResumeSection } from "./ResumeSection";
import { ProfileRail } from "./ProfileRail";

interface ProfilePageProps {
  onNavigateTab?: (tab: "profile" | "performance" | "settings", section?: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateTab }) => {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 gap-6 min-[860px]:grid-cols-[minmax(0,1fr)_300px] items-start">
        {/* Main Column */}
        <div className="space-y-6 min-w-0">
          <div id="about-section">
            <AboutSection />
          </div>
          <div id="work-section">
            <WorkSection />
          </div>
          <div id="projects-section">
            <ProjectsSection />
          </div>
          <div id="education-section">
            <EducationSection />
          </div>
          <div id="skills-section">
            <SkillsSection />
          </div>
          <div id="resume-section">
            <ResumeSection />
          </div>
        </div>

        {/* Right Rail (300px) */}
        <ProfileRail onNavigateTab={onNavigateTab} />
      </div>
    </div>
  );
};
