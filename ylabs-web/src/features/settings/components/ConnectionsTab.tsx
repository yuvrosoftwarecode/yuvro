import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { Button } from "@/components/profile-ui/Button";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { toast } from "@/lib/toastStore";

export const ConnectionsTab: React.FC = () => {
  const { profile, setConnection } = useProfileStore();

  const [connecting, setConnecting] = useState<"github" | "linkedin" | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<"github" | "linkedin" | null>(null);

  const githubConn = profile?.connections.find((c) => c.platform === "github");
  const linkedinConn = profile?.connections.find((c) => c.platform === "linkedin");

  const isGithubConnected = Boolean(githubConn?.connected && githubConn?.handle);
  const isLinkedinConnected = Boolean(linkedinConn?.connected);

  const handleConnect = async (platform: "github" | "linkedin") => {
    setConnecting(platform);
    try {
      const data = await yhubApiAuthUtil.get<{ authorization_url: string }>(
        `/auth/${platform}/connect/`
      );
      if (data?.authorization_url) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `${platform}_oauth_redirect`,
            window.location.pathname + window.location.search
          );
          window.location.href = data.authorization_url;
        }
      } else {
        toast.error(`Could not initiate ${platform === "github" ? "GitHub" : "LinkedIn"} connection.`);
        setConnecting(null);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          `Failed to initiate ${platform === "github" ? "GitHub" : "LinkedIn"} connection.`
      );
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    const target = disconnectTarget;
    try {
      await setConnection(target, "", false);
      toast.success(
        `${target === "github" ? "GitHub" : "LinkedIn"} account disconnected.`
      );
    } catch (err: any) {
      toast.error(err?.message || `Failed to disconnect ${target}.`);
    } finally {
      setDisconnectTarget(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="border-b border-line pb-3">
        <h2 className="text-base font-semibold text-ink">Connected accounts</h2>
        <p className="text-xs text-muted mt-0.5">
          Link external developer profiles to showcase your repositories, verify commits, and strengthen your profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GitHub Card */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink">GitHub</h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isGithubConnected
                    ? "bg-success-subtle text-success"
                    : "bg-gray-100 text-muted dark:bg-gray-800"
                }`}
              >
                {isGithubConnected ? "Connected" : "Not connected"}
              </span>
            </div>

            <p className="text-xs text-muted">
              Used for verified commit activity, lab repositories, and code contributions.
            </p>

            {isGithubConnected ? (
              <div className="space-y-1.5 pt-2 border-t border-line text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Linked account</span>
                  <a
                    href={`https://github.com/${githubConn?.handle}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-primary font-mono font-medium hover:underline transition-colors"
                  >
                    github.com/{githubConn?.handle}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </div>
                {githubConn?.connectedAt && (
                  <p className="text-[11px] text-muted">
                    Connected on {new Date(githubConn.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t border-line text-xs text-sub">
                Connect your GitHub account in one click with secure OAuth.
              </div>
            )}
          </div>

          <div className="pt-2">
            {isGithubConnected ? (
              <Button
                type="button"
                variant="danger-outline"
                size="sm"
                className="w-full"
                onClick={() => setDisconnectTarget("github")}
              >
                Disconnect GitHub
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full"
                loading={connecting === "github"}
                onClick={() => handleConnect("github")}
              >
                Connect GitHub
              </Button>
            )}
          </div>
        </Card>

        {/* LinkedIn Card */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink">LinkedIn</h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isLinkedinConnected
                    ? "bg-success-subtle text-success"
                    : "bg-gray-100 text-muted dark:bg-gray-800"
                }`}
              >
                {isLinkedinConnected ? "Connected" : "Not connected"}
              </span>
            </div>

            <p className="text-xs text-muted">
              Displayed on your profile so recruiters and peers can connect with you.
            </p>

            {isLinkedinConnected ? (
              <div className="space-y-1.5 pt-2 border-t border-line text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Linked account</span>
                  {linkedinConn?.handle ? (
                    <a
                      href={`https://linkedin.com/in/${linkedinConn.handle}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-primary font-mono font-medium hover:underline transition-colors"
                    >
                      linkedin.com/in/{linkedinConn.handle}
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : (
                    <span className="text-muted">Connected</span>
                  )}
                </div>
                {linkedinConn?.connectedAt && (
                  <p className="text-[11px] text-muted">
                    Connected on {new Date(linkedinConn.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t border-line text-xs text-sub">
                Connect your LinkedIn profile in one click with secure OAuth.
              </div>
            )}
          </div>

          <div className="pt-2">
            {isLinkedinConnected ? (
              <Button
                type="button"
                variant="danger-outline"
                size="sm"
                className="w-full"
                onClick={() => setDisconnectTarget("linkedin")}
              >
                Disconnect LinkedIn
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full"
                loading={connecting === "linkedin"}
                onClick={() => handleConnect("linkedin")}
              >
                Connect LinkedIn
              </Button>
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(disconnectTarget)}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
        title={`Disconnect ${disconnectTarget === "github" ? "GitHub" : "LinkedIn"} account?`}
        description={`Disconnecting will remove ${
          disconnectTarget === "github" ? "GitHub" : "LinkedIn"
        } from your public profile.`}
        confirmLabel="Disconnect"
        variant="danger"
        onConfirm={handleDisconnect}
      />
    </div>
  );
};
