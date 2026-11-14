import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { requireStudentAuth } from "@/utils/authGuards";
import { ClientOnly } from "@/components/ClientOnly";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { TopNav } from "@/components/TopNav";

export const Route = createFileRoute("/student")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/student/dashboard") return;
    requireStudentAuth(location.href);
  },
  component: StudentLayout,
});

function StudentLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isWorkspace =
    (pathname.includes("/ticket/") && !pathname.includes("/review")) ||
    (pathname.includes("/collaboration/") && pathname.includes("/workspace"));

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/student/dashboard") return;
      const token = localStorage.getItem("access");
      if (!token) {
        nav({ to: "/auth", search: { tab: "signin", redirect: window.location.pathname } });
        return;
      }
      if (user) {
        const role = user.roles?.ylabs || user.role;
        if (role?.toLowerCase() === "admin") {
          nav({ to: "/admin" });
        }
      }
    }
  }, [user, nav]);

  return (
    <ClientOnly>
      {!isWorkspace && <TopNav />}
      <Outlet />
    </ClientOnly>
  );
}
