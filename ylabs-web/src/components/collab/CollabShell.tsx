import { useState, createContext, useContext, ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { Bell } from "lucide-react";
import { CollabProvider, useCollab } from "@/lib/collab/store";
import { NotificationsPanel } from "@/components/collab/NotificationsPanel";
import { UserProfileDrawer } from "@/components/collab/UserProfileDrawer";

interface UIState {
  openNotifications: () => void;
  openProfile: (userId: string) => void;
}
const UICtx = createContext<UIState | null>(null);
export function useCollabUI() { return useContext(UICtx)!; }

function HeaderBell() {
  const { unreadCount } = useCollab();
  const { openNotifications } = useCollabUI();
  const count = unreadCount();
  return (
    <button onClick={openNotifications} className="relative grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground" title="Notifications">
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">{count}</span>
      )}
    </button>
  );
}

export function CollabShell({ children }: { children: ReactNode }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const path = useRouterState({ select: s => s.location.pathname });

  return (
    <CollabProvider>
      <UICtx.Provider value={{ openNotifications: () => setNotifOpen(true), openProfile: setProfileId }}>
        <div className="min-h-screen flex flex-col">
          <TopNav rightSlot={<HeaderBell />} activeOverride={path.startsWith("/collaboration") ? "/collaboration" : undefined} />
          <div className="flex-1">{children}</div>
          <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          <UserProfileDrawer userId={profileId} onClose={() => setProfileId(null)} />
        </div>
      </UICtx.Provider>
    </CollabProvider>
  );
}
