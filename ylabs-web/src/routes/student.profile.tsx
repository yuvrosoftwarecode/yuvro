import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfilePage } from "@/features/profile/components/ProfilePage";
import { PerformancePage } from "@/features/performance/components/PerformancePage";
import { SettingsPage } from "@/features/settings/components/SettingsPage";
import { SettingsSection } from "@/features/settings/types";
import { ToastContainer } from "@/components/profile-ui/Toast";
import { ProfilePageSkeleton } from "@/features/profile/components/ProfileSkeleton";

const profileSearchSchema = z.object({
  tab: z.enum(["profile", "performance", "settings"]).catch("profile").default("profile"),
  section: z.enum(["personal", "connections", "security"]).catch("personal").default("personal"),
});

export type ProfileSearch = z.infer<typeof profileSearchSchema>;

export const Route = createFileRoute("/student/profile")({
  validateSearch: (search: Record<string, unknown>): ProfileSearch => {
    return profileSearchSchema.parse(search);
  },
  component: StudentProfileRoute,
});

function StudentProfileRoute() {
  const { user } = useAuth();
  const search = useSearch({ from: "/student/profile" });
  const navigate = useNavigate();

  const activeTab = search.tab || "profile";
  const activeSection = search.section || "personal";

  const { fetchProfile, initFromAuthUser, profile, loading } = useProfileStore();

  useEffect(() => {
    if (user && !profile) {
      initFromAuthUser(user);
    }
    fetchProfile(true);
  }, [user?.id]);

  const handleTabChange = (tab: "profile" | "performance" | "settings") => {
    navigate({
      to: "/student/profile",
      search: {
        tab,
        section: tab === "settings" ? activeSection : "personal",
      },
    });
  };

  const handleSectionChange = (section: SettingsSection) => {
    navigate({
      to: "/student/profile",
      search: {
        tab: "settings",
        section,
      },
    });
  };

  const handleNavigateTab = (tab: "profile" | "performance" | "settings", section?: string) => {
    navigate({
      to: "/student/profile",
      search: {
        tab,
        section: (section as SettingsSection) || "personal",
      },
    });
  };

  if (loading && !profile) {
    return <ProfilePageSkeleton activeTab={activeTab} />;
  }

  return (
    <div className="yuvro-profile-theme min-h-screen bg-bg text-ink antialiased selection:bg-primary-subtle selection:text-primary">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-8 space-y-6">
        {/* Shared Header card + Underline Tabs */}
        <ProfileHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onEditProfile={() => handleNavigateTab("settings", "personal")}
        />

        {/* Main Tab Content with 200ms Fade-in */}
        <main>
          <div key={activeTab} className="animate-fade-in">
            {activeTab === "profile" && (
              <ProfilePage onNavigateTab={handleNavigateTab} />
            )}

            {activeTab === "performance" && <PerformancePage />}

            {activeTab === "settings" && (
              <SettingsPage
                initialSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            )}
          </div>
        </main>
      </div>

      {/* Toast notifications container */}
      <ToastContainer />
    </div>
  );
}
