import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import authService from "@/services/authService";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password/$uidb64/$token")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { uidb64, token } = Route.useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(uidb64, token, password);
      setMessage("Password reset successful. Redirecting...");
      setTimeout(() => {
        navigate({ to: "/auth", search: { tab: "signin" } });
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Reset link is invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-ui/10 blur-3xl" />
      </div>
      <div className="w-full max-w-md border border-border bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="grid mx-auto h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xl shadow-lg shadow-primary/30 mb-4">
            Y
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Yuvro Labs</h1>
          <p className="text-sm text-muted-foreground mt-1">Set a new password</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">New Password</span>
            <div className="mt-1.5 relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Confirm Password</span>
            <div className="mt-1.5 relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading || !!message}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-ui px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition disabled:opacity-50 mt-2"
          >
            {isLoading ? "Resetting..." : "Reset Password"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
