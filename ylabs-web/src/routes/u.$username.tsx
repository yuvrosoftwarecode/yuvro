import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { usePerformanceStore } from "@/features/performance/store/performanceStore";
import { ProfileView, ProfileTab } from "@/features/profile/components/ProfileView";
import { ProfilePageSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { TopNav } from "@/components/TopNav";
import { ClientOnly } from "@/components/ClientOnly";

const profileSearchSchema = z.object({
  tab: z.string().optional(),
  section: z.string().optional(),
});

export type ProfileSearch = z.infer<typeof profileSearchSchema>;

export const Route = createFileRoute("/u/$username")({
  validateSearch: (search: Record<string, unknown>): ProfileSearch => {
    return profileSearchSchema.parse(search);
  },
  component: PublicUserProfileRoute,
});

function PublicUserProfileRoute() {
  const { username } = Route.useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const search = useSearch({ from: "/u/$username" });
  const navigate = useNavigate();

  // Determine ownership: logged-in user viewing their own profile
  const isOwner = Boolean(
    user?.username && user.username.toLowerCase() === username.toLowerCase()
  );

  const rawTab = search.tab || "overview";
  const rawSection = search.section;

  // Resolve active tab with legacy redirects
  let activeTab: ProfileTab = "overview";
  if (isOwner) {
    if (rawTab === "performance") {
      activeTab = "performance";
    } else if (rawTab === "connections" || (rawTab === "settings" && rawSection === "connections")) {
      activeTab = "connections";
    } else if (rawTab === "security" || (rawTab === "settings" && rawSection === "security")) {
      activeTab = "security";
    } else {
      activeTab = "overview";
    }
  }
  // Non-owners are locked to overview tab

  const {
    fetchProfile,
    fetchProfileByUsername,
    initFromAuthUser,
    profile,
    loading: isProfileLoading,
  } = useProfileStore();

  const { fetchPerformance, fetchPublicPerformance } = usePerformanceStore();

  useEffect(() => {
    if (isOwner && user) {
      // Owner — use authenticated profile fetch
      if (!profile) {
        initFromAuthUser(user);
      }
      fetchProfile(true);
      fetchPerformance(true);
    } else if (!isAuthLoading) {
      // Visitor — use public endpoints
      fetchProfileByUsername(username);
      fetchPublicPerformance(username);
    }
  }, [user?.id, username, isOwner, isAuthLoading]);

  const handleTabChange = (tab: string) => {
    navigate({
      to: "/u/$username",
      params: { username },
      search: { tab },
    });
  };

  const isLoading = isAuthLoading || (isProfileLoading && !profile);

  return (
    <ClientOnly>
      {isOwner && <TopNav />}
      {isLoading ? (
        <ProfilePageSkeleton activeTab={activeTab} />
      ) : (
        <ProfileView
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
        />
      )}
    </ClientOnly>
  );
}
