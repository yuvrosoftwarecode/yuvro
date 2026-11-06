import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";

interface Installation {
  id: string;
  installation_id: string;
  account_login: string;
  account_type: string;
  account_id?: string;
  avatar_url?: string;
  manage_url: string;
  connected_at?: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url?: string;
  description?: string;
  language?: string;
  updated_at?: string;
}

const GitHubMark = ({ size = 40 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-label="GitHub"
    className="text-foreground"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const linkCls = "gh-link font-medium underline";

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <div className="text-sm leading-5 text-muted-foreground">{label}</div>
    <div className="text-[28px] font-semibold leading-9">{value}</div>
  </div>
);

export function GithubSettingsTab() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [repos, setRepos] = useState<Repository[]>([]);

  const [loadingInst, setLoadingInst] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [lastDisconnected, setLastDisconnected] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"ALL" | "PRIVATE" | "PUBLIC">("ALL");
  const [disconnectTarget, setDisconnectTarget] = useState<Installation | null>(null);
  const callbackHandled = useRef(false);

  // Close disconnect modal on Escape
  useEffect(() => {
    if (!disconnectTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disconnectLoading) {
        setDisconnectTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disconnectTarget, disconnectLoading]);

  // Handle OAuth/Installation callback if redirected from GitHub
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installation_id = params.get("installation_id");
    const setup_action = params.get("setup_action");
    const state = params.get("state");

    if (installation_id && state) {
      if (!callbackHandled.current) {
        callbackHandled.current = true;
        window.history.replaceState({}, document.title, window.location.pathname);
        handleCallback(installation_id, setup_action, state);
      }
    } else {
      fetchInstallations();
    }
  }, []);

  const handleCallback = async (installation_id: string, setup_action: string | null, state: string) => {
    try {
      await restApiAuthUtil.post("/recruiter/github-app/callback/", {
        installation_id,
        setup_action,
        state
      });
      toast.success("GitHub App connected successfully!");
      fetchInstallations();
    } catch (err: any) {
      console.error("Callback failed", err);
      toast.error(err?.response?.data?.error || "Failed to verify GitHub App installation.");
      fetchInstallations();
    }
  };

  const fetchInstallations = async () => {
    setLoadingInst(true);
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/installations/");
      const list = Array.isArray(data) ? data : [];
      setInstallations(list);
      if (list.length > 0) {
        setSelectedInstId((prev) => {
          const exists = list.some((i: Installation) => i.installation_id === prev);
          return exists ? prev : list[0].installation_id;
        });
      } else {
        setSelectedInstId("");
        setRepos([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch installations", err);
      toast.error("Failed to load GitHub installations.");
      setInstallations([]);
      setSelectedInstId("");
      setRepos([]);
    } finally {
      setLoadingInst(false);
    }
  };

  // Fetch repos whenever selected installation changes
  useEffect(() => {
    if (selectedInstId) {
      fetchRepos(selectedInstId);
    } else {
      setRepos([]);
    }
  }, [selectedInstId]);

  const fetchRepos = async (instId: string) => {
    setLoadingRepos(true);
    try {
      const data: any = await restApiAuthUtil.get(`/recruiter/github-app/installations/${instId}/repositories/`);
      const list = Array.isArray(data) ? data : [];
      setRepos(list);
    } catch (err: any) {
      console.error("Failed to fetch repos", err);
      toast.error("Failed to load repositories from GitHub.");
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleConnect = async () => {
    setConnectLoading(true);
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/install/");
      if (data?.url) {
        window.location.href = data.url;
        return;
      } else {
        toast.error("Failed to generate GitHub authorization URL.");
        setConnectLoading(false);
      }
    } catch (err: any) {
      console.error("Failed to get install URL", err);
      toast.error(err?.response?.data?.error || "Failed to start GitHub connection flow. Please check server settings.");
      setConnectLoading(false);
    }
  };

  const handleConfirmDisconnect = async (instId: string) => {
    const target = installations.find((i) => i.installation_id === instId);
    const confirmName = target ? target.account_login : "this account";

    setDisconnectLoading(true);
    try {
      await restApiAuthUtil.delete(`/recruiter/github-app/installations/${instId}/`);
      toast.success(`Disconnected ${confirmName}`);
      setDisconnectTarget(null);
      setLastDisconnected(confirmName);
      await fetchInstallations();
    } catch (err: any) {
      console.error("Failed to disconnect", err);
      toast.error(err?.response?.data?.error || "Failed to disconnect GitHub App installation.");
    } finally {
      setDisconnectLoading(false);
    }
  };

  const currentInstallation = installations.find((i) => i.installation_id === selectedInstId) || installations[0] || null;

  // Filter repositories based on search and visibility
  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesVisibility =
        visibilityFilter === "ALL" ||
        (visibilityFilter === "PRIVATE" && repo.private) ||
        (visibilityFilter === "PUBLIC" && !repo.private);

      return matchesSearch && matchesVisibility;
    });
  }, [repos, searchQuery, visibilityFilter]);

  const privateCount = useMemo(() => repos.filter((r) => r.private).length, [repos]);
  const publicCount = useMemo(() => repos.filter((r) => !r.private).length, [repos]);

  if (loadingInst) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading GitHub connection settings…</p>;
  }

  return (
    <div>
      {lastDisconnected && (
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{lastDisconnected}</span> was disconnected. To evaluate
          candidates using private repositories, connect a GitHub account.{" "}
          <button type="button" onClick={() => setLastDisconnected(null)} className={linkCls}>
            Dismiss
          </button>
        </p>
      )}

      {/* Account header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <GitHubMark />
          <div>
            <div className="text-xl font-semibold leading-7">
              {currentInstallation ? currentInstallation.account_login : "No GitHub account connected"}
            </div>
            <div className="text-sm leading-5 text-muted-foreground">
              {currentInstallation
                ? `${currentInstallation.account_type || "User"} · Installation ID ${currentInstallation.installation_id} · Connected`
                : "Connect your GitHub organization or personal profile to authorize starter repositories"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-[15px]">
          {currentInstallation?.manage_url && (
            <a href={currentInstallation.manage_url} target="_blank" rel="noreferrer" className={linkCls}>
              Manage on GitHub
            </a>
          )}
          {currentInstallation && (
            <>
              <button
                onClick={() => selectedInstId && fetchRepos(selectedInstId)}
                disabled={loadingRepos}
                className={`${linkCls} disabled:opacity-50`}
              >
                {loadingRepos ? "Syncing…" : "Sync"}
              </button>
              <button
                onClick={() => setDisconnectTarget(currentInstallation)}
                disabled={disconnectLoading}
                className="text-muted-foreground underline hover:text-destructive disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          )}
          <button onClick={handleConnect} disabled={connectLoading} className="rec-btn disabled:opacity-50">
            {connectLoading ? "Redirecting to GitHub…" : currentInstallation ? "Add account" : "Connect GitHub"}
          </button>
        </div>
      </div>

      {/* Account switcher */}
      {installations.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-5 text-sm leading-5 text-muted-foreground">
          <span>Accounts</span>
          {installations.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedInstId(a.installation_id)}
              className={
                a.installation_id === selectedInstId ? "font-medium text-foreground" : "hover:text-foreground"
              }
            >
              {a.account_login}
            </button>
          ))}
          <span className="ml-auto">{installations.length} connected</span>
        </div>
      )}

      {/* Stats */}
      <div className="my-10 flex flex-wrap gap-16">
        <Stat label="Repositories" value={repos.length} />
        <Stat label="Private" value={privateCount} />
        <Stat label="Public" value={publicCount} />
        <Stat
          label="Evaluation status"
          value={installations.length > 0 ? "Ready for labs" : "Not connected"}
        />
      </div>

      {/* Authorized repositories */}
      <h2>Authorized repositories</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Select a repository when creating questions in the question bank to use it as starter code
      </p>

      {installations.length === 0 ? (
        <div className="border-t border-border py-12 text-center text-muted-foreground">
          No GitHub accounts connected yet. Click{" "}
          <button type="button" onClick={handleConnect} disabled={connectLoading} className={linkCls}>
            Connect GitHub
          </button>{" "}
          to authorize starter repositories.
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-8">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, language or description"
              className="h-10 min-w-[220px] flex-1 border-0 border-b border-border bg-transparent text-[15px] placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex gap-5 text-[15px] text-muted-foreground">
              {[
                { key: "ALL" as const, label: `All (${repos.length})` },
                { key: "PRIVATE" as const, label: `Private (${privateCount})` },
                { key: "PUBLIC" as const, label: `Public (${publicCount})` }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setVisibilityFilter(f.key)}
                  className={visibilityFilter === f.key ? "font-medium text-foreground" : "hover:text-foreground"}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Repository list */}
          {loadingRepos ? (
            <p className="border-t border-border py-12 text-center text-sm text-muted-foreground">
              Fetching repositories from GitHub…
            </p>
          ) : filteredRepos.length === 0 ? (
            <div className="border-t border-border">
              {repos.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No repositories authorized yet.{" "}
                  {currentInstallation?.manage_url && (
                    <a href={currentInstallation.manage_url} target="_blank" rel="noreferrer" className={linkCls}>
                      Select repositories on GitHub
                    </a>
                  )}
                </p>
              ) : (
                <p className="py-12 text-center text-muted-foreground">No repositories match your search</p>
              )}
            </div>
          ) : (
            <div className="border-t border-border">
              {filteredRepos.map((r) => {
                const repoUrl = r.html_url || `https://github.com/${r.full_name}`;
                return (
                  <div
                    key={r.id}
                    onClick={() => window.open(repoUrl, "_blank", "noreferrer")}
                    className="gh-repo-row grid cursor-pointer grid-cols-1 gap-2 border-b border-border py-[18px] sm:grid-cols-[1fr_150px_160px_90px] sm:items-center sm:gap-6"
                  >
                    <div>
                      <div className="text-base font-medium leading-6">{r.name}</div>
                      <div className="text-[15px] leading-[22px] text-secondary-foreground">
                        {r.description || "No description provided"}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{r.private ? "Private" : "Public"}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.default_branch || "main"}
                      {r.language ? ` · ${r.language}` : ""}
                    </div>
                    <div className="sm:text-right">
                      <Link
                        to="/recruiter/questions"
                        search={{ repo: r.name } as any}
                        onClick={(e) => e.stopPropagation()}
                        className={linkCls}
                      >
                        Use in lab
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {repos.length > 0 && currentInstallation?.manage_url && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
              <div>
                <span className="font-medium">Need to update authorized repositories?</span>{" "}
                <span className="text-secondary-foreground">
                  Add private repositories or revoke access directly on GitHub.
                </span>
              </div>
              <a href={currentInstallation.manage_url} target="_blank" rel="noreferrer" className={linkCls}>
                Configure on GitHub
              </a>
            </div>
          )}
        </>
      )}

      {/* Disconnect confirmation modal */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="fixed inset-0" onClick={() => !disconnectLoading && setDisconnectTarget(null)} />
          <div className="relative z-10 w-full max-w-md border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Disconnect GitHub account?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to disconnect{" "}
              <span className="font-medium text-foreground">{disconnectTarget.account_login}</span>?
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-secondary-foreground">
              <li>Access to all authorized starter repositories will be removed.</li>
              <li>Candidate evaluation labs linked to these repositories will no longer clone.</li>
              <li>You can reconnect this account at any time with one click.</li>
            </ul>
            <div className="mt-6 flex items-center justify-end gap-5">
              <button
                type="button"
                disabled={disconnectLoading}
                onClick={() => setDisconnectTarget(null)}
                className={`${linkCls} disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={disconnectLoading}
                onClick={() => handleConfirmDisconnect(disconnectTarget.installation_id)}
                className="rec-btn-danger disabled:opacity-50"
              >
                {disconnectLoading ? "Disconnecting…" : "Disconnect account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
