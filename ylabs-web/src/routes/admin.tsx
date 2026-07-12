import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { requireAdminAuth } from "@/utils/authGuards";
import { ClientOnly } from "@/components/ClientOnly";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({ 
  beforeLoad: ({ location }) => requireAdminAuth(location.href),
  component: AdminLayout 
});

function AdminLayout() {
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) {
        nav({ to: "/auth", search: { tab: "signin", redirect: window.location.pathname } });
        return;
      }
      if (user) {
        const role = user.roles?.ylabs || user.role;
        if (role?.toLowerCase() !== "admin") {
          nav({ to: "/student/dashboard" });
        }
      }
    }
  }, [user, nav]);

  return (
    <ClientOnly>
      <Outlet />
    </ClientOnly>
  );
}
