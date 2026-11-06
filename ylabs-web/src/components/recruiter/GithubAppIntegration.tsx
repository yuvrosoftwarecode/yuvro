import { useState, useEffect, useRef, useMemo } from "react";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function RepoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm4-2.5a2.5 2.5 0 0 0-2.5 2.5v2h5V4a2.5 2.5 0 0 0-2.5-2.5ZM3.5 7.75v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Z" />
    </svg>
  );
}

export function GithubAppIntegration({ value, onChange, onBranchChange }: any) {
  const [installations, setInstallations] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  // Popover State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const callbackHandled = useRef(false);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
        state,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      toast.success("GitHub account connected");
      fetchInstallations();
    } catch (err: any) {
      console.error("Callback failed", err);
      toast.error(err?.response?.data?.error || "Failed to verify GitHub installation.");
      fetchInstallations();
    }
  };

  const fetchInstallations = async () => {
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/installations/");
      const list = Array.isArray(data) ? data : [];
      setInstallations(list);
      if (list.length > 0) {
        fetchAllRepos(list);
      } else {
        setRepos([]);
      }
    } catch (err) {
      console.error("Failed to fetch installations", err);
      toast.error("Failed to load GitHub installations.");
    }
  };

  const fetchAllRepos = async (instList: any[]) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        instList.map(async (inst: any) => {
          try {
            const data: any = await restApiAuthUtil.get(
              `/recruiter/github-app/installations/${inst.installation_id}/repositories/`
            );
            if (!Array.isArray(data)) return [];
            return data.map((r: any) => ({
              ...r,
              installation_id: inst.installation_id,
              installation_db_id: inst.id,
              owner_login: inst.account_login || r.full_name?.split("/")[0] || "Repositories",
            }));
          } catch (e) {
            console.error(`Failed to fetch repos for ${inst.account_login}`, e);
            return [];
          }
        })
      );
      setRepos(results.flat());
    } catch (err) {
      console.error("Failed to fetch repositories", err);
      toast.error("Failed to load repositories from GitHub.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnectLoading(true);
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/install/");
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to generate GitHub authorization URL.");
        setConnectLoading(false);
      }
    } catch (err) {
      console.error("Failed to get install URL", err);
      toast.error("Failed to start GitHub connection flow.");
      setConnectLoading(false);
    }
  };

  // Find selected repository by ID, URL, or fallback parser
  const selectedRepo = useMemo(() => {
    if (value?.github_repo_id) {
      const match = repos.find((r: any) => r.id?.toString() === value.github_repo_id?.toString());
      if (match) return match;
    }

    if (value?.git_repo_starter_url) {
      const cleanUrl = value.git_repo_starter_url
        .toLowerCase()
        .replace(/\.git$/, "")
        .replace(/\/$/, "");

      const match = repos.find((r: any) => {
        const rHtml = (r.html_url || "").toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
        const rClone = (r.clone_url || "").toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
        const rFull = (r.full_name || "").toLowerCase();
        return (
          rHtml === cleanUrl ||
          rClone === cleanUrl ||
          (rFull && cleanUrl.endsWith("/" + rFull)) ||
          cleanUrl === rFull
        );
      });
      if (match) return match;

      // URL parser fallback (e.g. https://github.com/MKGandhi05/PromptProbe)
      const urlMatch = value.git_repo_starter_url.match(
        /(?:github\.com\/|git@github\.com:)([^/]+)\/([^/.]+)/i
      );
      if (urlMatch) {
        const owner = urlMatch[1];
        const name = urlMatch[2];
        return {
          id: value.github_repo_id || `${owner}/${name}`,
          name: name,
          full_name: `${owner}/${name}`,
          private: false,
          owner_login: owner,
          default_branch: "main",
        };
      }
    }

    return null;
  }, [repos, value?.github_repo_id, value?.git_repo_starter_url]);

  const filteredRepos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return repos;
    return repos.filter((r: any) => {
      return (
        r.name?.toLowerCase().includes(q) ||
        r.full_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    });
  }, [repos, searchQuery]);

  const groupedRepos = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredRepos.forEach((repo: any) => {
      const owner = repo.owner_login || repo.full_name?.split("/")[0] || "Repositories";
      if (!groups[owner]) {
        groups[owner] = [];
      }
      groups[owner].push(repo);
    });
    return groups;
  }, [filteredRepos]);

  const handleSelect = (r: any) => {
    onChange({
      github_repo_id: r.id.toString(),
      git_repo_starter_url: r.html_url || `https://github.com/${r.full_name}.git`,
      repo_source_type: "RECRUITER_GITHUB_APP",
      github_app_installation: r.installation_db_id,
      github_installation_id: r.installation_id,
    });
    onBranchChange(r.default_branch || "main");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({
      github_repo_id: "",
      git_repo_starter_url: "",
      repo_source_type: "ADMIN_SYSTEM",
      github_app_installation: null,
      github_installation_id: null,
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Authorized GitHub repository
        </label>
        {installations.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {repos.length} {repos.length === 1 ? "repository" : "repositories"} available
          </span>
        )}
      </div>

      {installations.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
          <span className="text-muted-foreground">
            No GitHub account connected. Connect GitHub to choose from private starter repositories.
          </span>
          <Button
            type="button"
            onClick={handleConnect}
            disabled={connectLoading}
            className="rec-btn text-xs py-1.5 px-3 shrink-0"
          >
            {connectLoading ? "Connecting…" : "Connect GitHub"}
          </Button>
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="h-10 w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:border-foreground/40 transition cursor-pointer select-none"
          >
            {selectedRepo ? (
              <div className="flex items-center gap-2 min-w-0">
                {selectedRepo.private ? (
                  <LockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <RepoIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground truncate">
                  {selectedRepo.full_name || selectedRepo.name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select an authorized repository…</span>
            )}

            <div className="flex items-center gap-2 pl-2 shrink-0">
              {selectedRepo && (
                <button
                  type="button"
                  title="Clear selected repository"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="qb-action text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Clear
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {isOpen ? "▲" : "▼"}
              </span>
            </div>
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  placeholder="Filter repositories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {loading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Loading repositories…
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {repos.length === 0
                      ? "No authorized repositories found."
                      : `No repositories match "${searchQuery}"`}
                  </div>
                ) : (
                  Object.entries(groupedRepos).map(([owner, ownerRepos]) => (
                    <div key={owner} className="py-1">
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-accent/40">
                        {owner}
                      </div>
                      <div>
                        {ownerRepos.map((r: any) => {
                          const isSelected =
                            value?.github_repo_id?.toString() === r.id.toString() ||
                            selectedRepo?.full_name?.toLowerCase() === r.full_name?.toLowerCase();
                          return (
                            <div
                              key={r.id}
                              onClick={() => handleSelect(r)}
                              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-accent font-medium text-foreground"
                                  : "text-foreground hover:bg-accent/60"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-3">
                                {r.private ? (
                                  <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <RepoIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <div className="min-w-0">
                                  <div className="truncate">{r.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {r.private ? "Private" : "Public"} · {r.default_branch || "main"}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-xs font-medium text-primary shrink-0">Selected</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GithubAppIntegration;
