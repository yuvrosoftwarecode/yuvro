import React from "react";
import { IdentityPanel } from "./IdentityPanel";
import { ProfilePage } from "./ProfilePage";
import { PerformancePage } from "@/features/performance/components/PerformancePage";
import { ConnectionsTab } from "@/features/settings/components/ConnectionsTab";
import { SecurityTab } from "@/features/settings/components/SecurityTab";
import { ToastContainer } from "@/components/profile-ui/Toast";
import { ProfilePageSkeleton } from "./ProfileSkeleton";
import { useProfileStore } from "../store/profileStore";

export type ProfileTab = "overview" | "performance" | "connections" | "security";

export interface ProfileViewProps {
  activeTab: ProfileTab;
  onTabChange: (tab: string) => void;
  isOwner?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  activeTab,
  onTabChange,
  isOwner = true,
}) => {
  const { profile, loading } = useProfileStore();

  if (loading && !profile) {
    return <ProfilePageSkeleton activeTab={activeTab === "overview" ? "profile" : activeTab} />;
  }

  const TABS: { id: ProfileTab; label: string }[] = isOwner
    ? [
        { id: "overview", label: "Overview" },
        { id: "performance", label: "Performance" },
        { id: "connections", label: "Connections" },
        { id: "security", label: "Security" },
      ]
    : [
        { id: "overview", label: "Overview" },
      ];

  return (
    <div className="yuvro-profile-theme min-h-screen bg-bg text-ink antialiased selection:bg-primary-subtle selection:text-primary">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 py-6">
        {/* Desktop 2-column layout (296px left, 1fr right) / Mobile stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-[296px_minmax(0,1fr)] gap-8 items-start w-full min-w-0">
          {/* Left Sticky Identity Panel (Persistent across all tabs) */}
          <div
            className="w-full lg:w-[calc(296px+16px)] max-w-full min-w-0 box-border lg:sticky overflow-hidden lg:overflow-y-auto lg:overflow-x-hidden no-scrollbar"
            style={{
              top: "calc(var(--nav-h, 56px) + 16px)",
              maxHeight: "calc(100vh - var(--nav-h, 56px) - 32px)",
              padding: "8px",
              margin: "-8px",
              scrollPadding: "8px",
              scrollbarWidth: "none",
              boxSizing: "border-box",
            }}
          >
            <IdentityPanel onNavigateTab={onTabChange} isOwner={isOwner} />
          </div>

          {/* Right Main Column: Sticky Tab Bar + Content */}
          <div className="w-full min-w-0 space-y-5">
            {/* Sticky Underline Tabs Bar with opaque bg-bg - flush with TopNav (56px) so content never scrolls above tabs */}
            <div
              className="sticky bg-bg z-30 border-b border-line pt-3 pb-0"
              style={{ top: "var(--nav-h, 56px)" }}
            >
              <nav aria-label="Profile navigation tabs" className="flex items-center gap-6 text-sm font-medium">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange(tab.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative pb-3 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none ${
                        isActive
                          ? "text-ink font-semibold border-b-2 border-primary -mb-px"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content with 150ms Fade-in */}
            <main>
              <div key={activeTab} className="animate-fade-in">
                {activeTab === "overview" && (
                  <ProfilePage onNavigateTab={onTabChange} isOwner={isOwner} />
                )}

                {activeTab === "performance" && isOwner && <PerformancePage />}

                {activeTab === "connections" && isOwner && <ConnectionsTab />}

                {activeTab === "security" && isOwner && <SecurityTab />}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Toast notifications container */}
      <ToastContainer />
    </div>
  );
};
