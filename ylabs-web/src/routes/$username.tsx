import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { ProfileView, ProfileTab } from "@/features/profile/components/ProfileView";
import { ProfilePageSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { TopNav } from "@/components/TopNav";
import { ClientOnly } from "@/components/ClientOnly";

const profileSearchSchema = z.object({
  tab: z.string().optional(),
  section: z.string().optional(),
});

export type ProfileSearch = z.infer<typeof profileSearchSchema>;

export const Route = createFileRoute("/$username")({
  validateSearch: (search: Record<string, unknown>): ProfileSearch => {
    return profileSearchSchema.parse(search);
  },
  component: UserProfileRoute,
});

function UserProfileRoute() {
  const { username } = Route.useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const search = useSearch({ from: "/$username" });
  const navigate = useNavigate();

  const rawTab = search.tab || "overview";
  const rawSection = search.section;

  // Resolve active tab with legacy redirects
  let activeTab: ProfileTab = "overview";
  if (rawTab === "performance") {
    activeTab = "performance";
  } else if (rawTab === "connections" || (rawTab === "settings" && rawSection === "connections")) {
    activeTab = "connections";
  } else if (rawTab === "security" || (rawTab === "settings" && rawSection === "security")) {
    activeTab = "security";
  } else {
    activeTab = "overview";
  }

  const { fetchProfile, initFromAuthUser, profile, loading: isProfileLoading } = useProfileStore();

  useEffect(() => {
    if (user && !profile) {
      initFromAuthUser(user);
    }
    fetchProfile(true);
  }, [user?.id, username]);

  const handleTabChange = (tab: string) => {
    navigate({
      to: "/$username",
      params: { username },
      search: { tab },
    });
  };

  const isLoading = isAuthLoading || (isProfileLoading && !profile);

  return (
    <ClientOnly>
      <TopNav />
      {isLoading ? (
        <ProfilePageSkeleton activeTab={activeTab} />
      ) : (
        <ProfileView activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </ClientOnly>
  );
}
