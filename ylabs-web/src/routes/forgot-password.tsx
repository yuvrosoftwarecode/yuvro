import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import authService from "@/services/authService";
import { ArrowRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setMessage("If this email exists, a reset link will be sent.");
    } catch (err: any) {
      setMessage("If this email exists, a reset link will be sent.");
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
          <div className="grid mx-auto h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xl shadow-lg shadow-primary/30 mb-4">Y</div>
          <h1 className="text-2xl font-semibold tracking-tight">Yuvro Labs</h1>
          <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
        </div>

        {message && (
          <div className="mb-6 text-sm text-success bg-success/10 border border-success/20 rounded-lg py-3 px-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Email or Username</span>
            <div className="mt-1.5">
              <input
                type="text"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter your email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-ui px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition disabled:opacity-50 mt-2"
          >
            {isLoading ? "Sending..." : "Send reset link"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link to="/auth" search={{ tab: "signin" }} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
