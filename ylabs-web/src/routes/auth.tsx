import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpFlow } from "@/components/auth/SignUpFlow";
import { ForgotFlow } from "@/components/auth/ForgotFlow";
import type { AuthTab } from "@/components/auth/types";

const searchSchema = z.object({
  tab: z.enum(["signin", "signup", "forgot", "reset"]).default("signin").catch("signin"),
  redirect: z.string().optional(),
  token: z.string().optional(),
  uidb64: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token) {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          let user: { roles?: Record<string, string>; role?: string } | null = null;
          try {
            user = JSON.parse(userStr);
          } catch {
            user = null;
          }
          if (user) {
            const role = user.roles?.ylabs || user.roles?.ycode || user.role;
            const r = role?.toLowerCase();
            if (r === "admin") throw redirect({ to: "/admin" });
            else if (r === "recruiter") throw redirect({ to: "/recruiter/dashboard" });
            else throw redirect({ to: "/student/dashboard" });
          }
        }
      }
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { tab, redirect: redirectUrl, token, uidb64 } = Route.useSearch();
  const nav = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token && isAuthenticated && user) {
        const role = user.roles?.ylabs || user.roles?.ycode || user.role;
        const r = role?.toLowerCase();
        nav({
          to:
            r === "admin"
              ? "/admin"
              : r === "recruiter"
                ? "/recruiter/dashboard"
                : "/student/dashboard",
        });
      }
    }
  }, [user, isAuthenticated, nav]);

  const setTab = (t: AuthTab) => {
    nav({
      to: "/auth",
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: t }),
    });
  };

  return (
    <AuthLayout>
      {tab === "signup" ? (
        <SignUpFlow redirectUrl={redirectUrl} onNavigateTab={setTab} />
      ) : tab === "forgot" ? (
        <ForgotFlow redirectUrl={redirectUrl} onNavigateTab={setTab} />
      ) : tab === "reset" ? (
        <ForgotFlow initialToken={token} initialUidb64={uidb64} redirectUrl={redirectUrl} onNavigateTab={setTab} />
      ) : (
        <SignInForm redirectUrl={redirectUrl} onNavigateTab={setTab} />
      )}
    </AuthLayout>
  );
}
