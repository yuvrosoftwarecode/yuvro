import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) {
        throw redirect({ to: "/auth", search: { tab: "signin" } as any });
      }
      const userStr = localStorage.getItem("user");
      let dest = "/student/dashboard";
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          const role = u.roles?.ylabs || u.role;
          if (role === "admin") dest = "/admin";
          else if (role === "recruiter") dest = "/recruiter/dashboard";
        } catch {}
      }
      throw redirect({ to: dest });
    }
    throw redirect({ to: "/student/dashboard" });
  },
  component: () => null,
});
