import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotFlow } from "@/components/auth/ForgotFlow";
import type { AuthTab } from "@/components/auth/types";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/reset-password/$uidb64/$token")({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { uidb64, token } = Route.useParams();
  const { redirect: redirectUrl } = Route.useSearch();
  const nav = useNavigate();

  const handleNavigateTab = (t: AuthTab) => {
    nav({
      to: "/auth",
      search: { tab: t },
    });
  };

  return (
    <AuthLayout>
      <ForgotFlow
        initialUidb64={uidb64}
        initialToken={token}
        redirectUrl={redirectUrl}
        onNavigateTab={handleNavigateTab}
      />
    </AuthLayout>
  );
}
