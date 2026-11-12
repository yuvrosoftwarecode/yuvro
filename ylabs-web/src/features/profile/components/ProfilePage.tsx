import React from "react";
import { OverviewContributionCard } from "./OverviewContributionCard";
import { AboutSection } from "./AboutSection";
import { SkillsSection } from "./SkillsSection";
import { ProjectsSection } from "./ProjectsSection";
import { WorkSection } from "./WorkSection";
import { EducationSection } from "./EducationSection";
import { ResumeSection } from "./ResumeSection";

interface ProfilePageProps {
  onNavigateTab?: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-5 min-w-0">
      {/* 1. Contribution Activity Card */}
      <div id="contributions-section">
        <OverviewContributionCard
          onSeePerformance={() => onNavigateTab?.("performance")}
        />
      </div>

      {/* 2. About Card */}
      <div id="about-section">
        <AboutSection />
      </div>

      {/* 3. Skills Card */}
      <div id="skills-section">
        <SkillsSection />
      </div>

      {/* 4. Projects Card */}
      <div id="projects-section">
        <ProjectsSection />
      </div>

      {/* 5. Work Experience Card */}
      <div id="work-section">
        <WorkSection />
      </div>

      {/* 6. Education Card */}
      <div id="education-section">
        <EducationSection />
      </div>

      {/* 7. Resume Card */}
      <div id="resume-section">
        <ResumeSection />
      </div>
    </div>
  );
};
