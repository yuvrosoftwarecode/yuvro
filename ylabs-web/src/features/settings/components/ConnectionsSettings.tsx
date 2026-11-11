import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { Input } from "@/components/profile-ui/Input";
import { Button } from "@/components/profile-ui/Button";
import { TextLink } from "@/components/profile-ui/TextLink";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { Github, Linkedin, ExternalLink, CheckCircle2 } from "lucide-react";

export const ConnectionsSettings: React.FC = () => {
  const { profile, setConnection } = useProfileStore();

  const [githubInput, setGithubInput] = useState("");
  const [linkedinInput, setLinkedinInput] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  const githubConn = profile?.connections.find((c) => c.platform === "github");
  const linkedinConn = profile?.connections.find((c) => c.platform === "linkedin");

  const isGithubConnected = !!(githubConn && githubConn.connected);
  const isLinkedinConnected = !!(linkedinConn && linkedinConn.connected);

  const handleConnect = async (platform: "github" | "linkedin") => {
    const handle = platform === "github" ? githubInput.trim() : linkedinInput.trim();
    if (!handle) return;

    setConnecting(platform);
    await setConnection(platform, handle, true);
    setConnecting(null);
    if (platform === "github") setGithubInput("");
    if (platform === "linkedin") setLinkedinInput("");
  };

  const handleDisconnect = async (platform: "github" | "linkedin") => {
    const existing = profile?.connections.find((c) => c.platform === platform);
    await setConnection(platform, existing?.handle || "", false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-1 border-b border-line pb-4">
        <h2 className="text-lg font-semibold text-ink">Connected Accounts</h2>
        <p className="text-sm text-muted">
          Link your GitHub and LinkedIn to enrich your developer credentials and profile strength.
        </p>
      </div>

      <div className="space-y-6">
        {/* GitHub Connection */}
        <div className="rounded-input border border-line bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#24292e] text-white">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                  GitHub
                  {isGithubConnected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-subtle px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted">
                  Used for verified commit streaks, lab repositories, and code showcases.
                </p>
              </div>
            </div>

            {isGithubConnected && (
              <TextLink
                variant="danger"
                size="sm"
                onClick={() => handleDisconnect("github")}
              >
                Disconnect
              </TextLink>
            )}
          </div>

          {isGithubConnected ? (
            <div className="flex items-center gap-2 pt-2 border-t border-line/60 text-xs">
              <span className="text-muted">Linked handle:</span>
              <a
                href={`https://github.com/${githubConn?.handle}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                @{githubConn?.handle}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="pt-2 border-t border-line/60 flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="flex-1">
                <label htmlFor="github-handle-input" className="sr-only">
                  GitHub username
                </label>
                <Input
                  id="github-handle-input"
                  placeholder="GitHub username (e.g. torvalds)"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                />
              </div>
              <Button
                size="md"
                disabled={!githubInput.trim() || connecting === "github"}
                loading={connecting === "github"}
                onClick={() => handleConnect("github")}
              >
                Link account
              </Button>
            </div>
          )}
        </div>

        {/* LinkedIn Connection */}
        <div className="rounded-input border border-line bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#0a66c2] text-white">
                <Linkedin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                  LinkedIn
                  {isLinkedinConnected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-subtle px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted">
                  Share your verified labs, certifications, and mock interview endorsements.
                </p>
              </div>
            </div>

            {isLinkedinConnected && (
              <TextLink
                variant="danger"
                size="sm"
                onClick={() => handleDisconnect("linkedin")}
              >
                Disconnect
              </TextLink>
            )}
          </div>

          {isLinkedinConnected ? (
            <div className="flex items-center gap-2 pt-2 border-t border-line/60 text-xs">
              <span className="text-muted">Linked profile:</span>
              <a
                href={`https://linkedin.com/in/${linkedinConn?.handle}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                in/{linkedinConn?.handle}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="pt-2 border-t border-line/60 flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="flex-1">
                <label htmlFor="linkedin-handle-input" className="sr-only">
                  LinkedIn username
                </label>
                <Input
                  id="linkedin-handle-input"
                  placeholder="LinkedIn username or profile slug"
                  value={linkedinInput}
                  onChange={(e) => setLinkedinInput(e.target.value)}
                />
              </div>
              <Button
                size="md"
                disabled={!linkedinInput.trim() || connecting === "linkedin"}
                loading={connecting === "linkedin"}
                onClick={() => handleConnect("linkedin")}
              >
                Link account
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
