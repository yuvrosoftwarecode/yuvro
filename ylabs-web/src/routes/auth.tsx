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
        let dest = "/student/dashboard";
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const role = user?.roles?.ylabs || user?.roles?.ycode || user?.role;
            const r = role?.toLowerCase();
            if (r === "admin") dest = "/admin";
            else if (r === "recruiter") dest = "/recruiter/dashboard";
          } catch {
            // ignore
          }
        }
        throw redirect({ to: dest });
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
      if (token || (isAuthenticated && user)) {
        let dest = "/student/dashboard";
        const role = user?.roles?.ylabs || user?.roles?.ycode || user?.role;
        const r = role?.toLowerCase();
        if (r === "admin") dest = "/admin";
        else if (r === "recruiter") dest = "/recruiter/dashboard";
        else {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            try {
              const u = JSON.parse(userStr);
              const r2 = (u?.roles?.ylabs || u?.roles?.ycode || u?.role)?.toLowerCase();
              if (r2 === "admin") dest = "/admin";
              else if (r2 === "recruiter") dest = "/recruiter/dashboard";
            } catch {
              // ignore
            }
          }
        }
        nav({ to: dest });
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
