import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import authService from "@/services/authService";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/linkedin/callback")({
  component: LinkedInCallbackComponent,
});

function LinkedInCallbackComponent() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("code");
  const [error, setError] = useState<string | null>(null);
  const { updateUser } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    async function completeLinkedInFlow() {
      if (!code) {
        setError("No authorization code provided by LinkedIn.");
        return;
      }
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        await yhubApiAuthUtil.post("/auth/linkedin/connect/", { code });
        const userData = await authService.getCurrentUser();
        updateUser(userData);
        const savedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("linkedin_oauth_redirect") : null;
        if (savedRedirect) {
          sessionStorage.removeItem("linkedin_oauth_redirect");
          window.location.href = savedRedirect;
        } else {
          navigate({ to: "/student/profile" });
        }
      } catch (err: any) {
        hasRun.current = false;
        setError(err?.response?.data?.error || err?.message || "An error occurred while connecting LinkedIn.");
      }
    }
    completeLinkedInFlow();
  }, [code, navigate, updateUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full p-8 bg-card rounded-xl border shadow-lg text-center">
        {error ? (
          <div>
            <div className="text-destructive mb-3 font-semibold text-lg">Connection Failed</div>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => navigate({ to: "/student/profile" })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
            >
              Back to Profile
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0A66C2] mb-4" />
            <div className="text-base font-medium">Connecting LinkedIn Account...</div>
            <p className="text-xs text-muted-foreground mt-2">
              Please wait while we finalize your account integration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
