import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Github, Loader2, CheckCircle2, ArrowRight, X } from "lucide-react";

interface StartLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  labName: string;
  defaultRepoName: string;
  onConfirm: (repoName: string) => Promise<void>;
  isLoading?: boolean;
}

export function StartLabModal({
  isOpen,
  onClose,
  labName,
  defaultRepoName,
  onConfirm,
  isLoading = false,
}: StartLabModalProps) {
  const { user } = useAuth();
  const [repoName, setRepoName] = useState(defaultRepoName);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    setRepoName(defaultRepoName);
  }, [defaultRepoName, isOpen]);

  if (!isOpen) return null;

  const isConnected = Boolean(user && (user as any).github_connected);

  const handleConnectGithub = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("github_oauth_redirect", window.location.pathname + window.location.search);
      }
      const { yhubApiAuthUtil } = await import("@/utils/RestApiAuthUtil");
      const data = await yhubApiAuthUtil.get<{ authorization_url: string }>("/auth/github/connect/");
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL returned from server.");
      }
    } catch (e: any) {
      console.error("Failed to fetch github connect url", e);
      setConnectError(e?.message || "Failed to initiate GitHub connection. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !repoName.trim() || isLoading) return;
    await onConfirm(repoName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Github className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Start Lab Workspace</h2>
              <p className="text-xs text-muted-foreground">{labName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || isConnecting}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Flow Indicator */}
        <div className="mb-6 flex items-center justify-between rounded-xl border bg-accent/40 p-2.5 text-xs">
          <div className={`flex items-center gap-1.5 font-medium ${!isConnected ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${!isConnected ? "bg-primary text-primary-foreground" : "bg-success/20 text-success"}`}>
              {isConnected ? "✓" : "1"}
            </span>
            <span>1. Connect GitHub</span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />

          <div className={`flex items-center gap-1.5 font-medium ${isConnected ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${isConnected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              2
            </span>
            <span>2. Enter Repo Name</span>
          </div>
        </div>

        {/* Step 1: Connect GitHub */}
        {!isConnected ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs">
              <p className="font-semibold text-warning mb-1">GitHub Account Required</p>
              <p className="text-muted-foreground leading-relaxed">
                Before creating a repository for <strong>{labName}</strong>, you need to connect your GitHub account so YLabs can set up your starter workspace repository.
              </p>
            </div>

            {connectError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {connectError}
              </div>
            )}

            <button
              type="button"
              onClick={handleConnectGithub}
              disabled={isConnecting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#24292e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2c3137] transition-colors disabled:opacity-60"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to GitHub...
                </>
              ) : (
                <>
                  <Github className="h-4 w-4" /> Connect GitHub
                </>
              )}
            </button>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isConnecting}
                className="rounded-md px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Repository Name */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4" /> GitHub Connected
              </span>
              {(user as any)?.github_username && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  @{(user as any).github_username}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="repo-name" className="mb-1 block text-xs font-medium text-foreground">
                Repository Name
              </label>
              <input
                id="repo-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="e.g. yuvro_python_basics"
                disabled={isLoading}
                className="w-full rounded-lg border bg-input/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                A private GitHub repository with this name will be created for your lab code.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!repoName.trim() || isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating Repository...
                  </>
                ) : (
                  "Create Repository"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
