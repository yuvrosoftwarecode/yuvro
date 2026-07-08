import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) {
        throw redirect({ to: "/auth", search: { tab: "signin" } as any });
      }
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const role = user.roles?.ylabs || user.role;
          if (role?.toLowerCase() === "admin") {
            throw redirect({ to: "/admin" });
          } else {
            throw redirect({ to: "/student/dashboard" });
          }
        } catch (e) {
          throw redirect({ to: "/auth", search: { tab: "signin" } as any });
        }
      } else {
        throw redirect({ to: "/auth", search: { tab: "signin" } as any });
      }
    }
  },
  component: () => null,
});
