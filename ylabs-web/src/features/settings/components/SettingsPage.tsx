import React, { useState } from "react";
import { Tabs } from "@/components/profile-ui/Tabs";
import { SettingsSection } from "../types";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { ConnectionsSettings } from "./ConnectionsSettings";
import { SecuritySettings } from "./SecuritySettings";

const SETTINGS_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "personal", label: "Personal info" },
  { id: "connections", label: "Connections" },
  { id: "security", label: "Security" },
];

interface SettingsPageProps {
  initialSection?: SettingsSection;
  onSectionChange?: (sec: SettingsSection) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  initialSection = "personal",
  onSectionChange,
}) => {
  const [internalSection, setInternalSection] = useState<SettingsSection>(initialSection);
  const currentSection = initialSection || internalSection;

  const handleSectionChange = (newSec: string) => {
    const sec = newSec as SettingsSection;
    setInternalSection(sec);
    if (onSectionChange) {
      onSectionChange(sec);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Navigation Tabs (Horizontal on mobile, vertical on desktop) */}
        <nav aria-label="Settings navigation" className="w-full">
          {/* Desktop Vertical Menu */}
          <div className="hidden md:block">
            <Tabs
              items={SETTINGS_SECTIONS}
              activeTab={currentSection}
              onChange={handleSectionChange}
              variant="vertical"
              aria-label="Settings sections"
            />
          </div>

          {/* Mobile Horizontal Tabs */}
          <div className="block md:hidden pb-2">
            <Tabs
              items={SETTINGS_SECTIONS}
              activeTab={currentSection}
              onChange={handleSectionChange}
              variant="underline"
              aria-label="Settings sections"
            />
          </div>
        </nav>

        {/* Content Panel */}
        <div className="min-w-0">
          {currentSection === "personal" && <PersonalInfoForm />}
          {currentSection === "connections" && <ConnectionsSettings />}
          {currentSection === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
};
