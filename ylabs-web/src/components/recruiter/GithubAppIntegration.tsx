import { useState, useEffect, useRef, useMemo } from "react";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import {
  Github,
  Search,
  X,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

// Exact GitHub Desktop Lock Icon
function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} shrink-0 text-neutral-800 dark:text-neutral-200`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm4-2.5a2.5 2.5 0 0 0-2.5 2.5v2h5V4a2.5 2.5 0 0 0-2.5-2.5ZM3.5 7.75v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Z" />
    </svg>
  );
}

// Exact GitHub Desktop Repository (Book) Icon
function RepoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} shrink-0 text-neutral-800 dark:text-neutral-200`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}

export function GithubAppIntegration({ value, onChange, onBranchChange, settingsMode = false }: any) {
  const [installations, setInstallations] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  // GitHub Desktop Popover State
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
        state
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      toast.success("GitHub App connected successfully!");
      fetchInstallations();
    } catch (err: any) {
      console.error("Callback failed", err);
      toast.error(err?.response?.data?.error || "Failed to verify GitHub App installation.");
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

  // Fetch repositories across all authorized GitHub accounts in parallel
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
              owner_login: inst.account_login || r.full_name?.split("/")[0] || "Repositories"
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
      toast.error("Failed to start GitHub connection flow. Please check server settings.");
      setConnectLoading(false);
    }
  };

  const selectedRepo = useMemo(() => {
    if (!value?.github_repo_id) return null;
    return repos.find((r: any) => r.id?.toString() === value.github_repo_id?.toString()) || null;
  }, [repos, value?.github_repo_id]);

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

  // Group by owner / organization (like GitHub Desktop: CloudVexTechnologies, yuvrosoftwarecode, etc.)
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
      github_app_installation: r.installation_db_id
    });
    onBranchChange(r.default_branch || "main");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({
      github_repo_id: "",
      git_repo_starter_url: "",
      repo_source_type: "ADMIN_SYSTEM",
      github_app_installation: null
    });
  };

  return (
    <div className={settingsMode ? "" : "rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02] p-4 space-y-3.5"}>
      {!settingsMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-neutral-900 dark:text-white" />
            <span className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              GitHub Starter Repository
            </span>
          </div>
          {installations.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{repos.length} repositories authorized</span>
            </span>
          )}
        </div>
      )}

      {installations.length === 0 ? (
        <div className="py-2">
          {!settingsMode && (
            <p className="text-xs text-neutral-500 mb-3">
              Connect your GitHub account or organization to choose starter repositories for this question.
            </p>
          )}
          <button
            onClick={handleConnect}
            disabled={connectLoading}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm disabled:opacity-50"
          >
            <Github className="w-3.5 h-3.5" />
            <span>{connectLoading ? "Connecting to GitHub..." : "Connect GitHub Account"}</span>
          </button>
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          {/* GitHub Desktop Trigger Control Bar */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between text-left px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] hover:bg-neutral-50/80 dark:hover:bg-white/[0.03] transition cursor-pointer select-none shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              {selectedRepo ? (
                selectedRepo.private ? (
                  <LockIcon className="h-4 w-4" />
                ) : (
                  <RepoIcon className="h-4 w-4" />
                )
              ) : (
                <RepoIcon className="h-4 w-4" />
              )}
              <div className="min-w-0">
                <div className="text-[11px] text-neutral-500 font-normal leading-tight">
                  Current Repository
                </div>
                <div className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug truncate">
                  {selectedRepo ? selectedRepo.name : "Select a repository..."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-2 shrink-0">
              {selectedRepo && (
                <button
                  type="button"
                  title="Clear selected repository"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="rounded-md p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono">
                {isOpen ? "▲" : "▼"}
              </span>
            </div>
          </div>

          {/* GitHub Desktop Popover Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#151518] shadow-2xl overflow-hidden animate-in fade-in zoom-in-98 duration-100">
              {/* Filter Search Input (GitHub Desktop Style) */}
              <div className="p-2.5 border-b border-neutral-100 dark:border-white/5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Filter"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full rounded-md border border-neutral-300/80 dark:border-white/15 bg-white dark:bg-black/40 pl-8 pr-7 py-1 text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Repositories Scrollable Area */}
              <div className="max-h-80 overflow-y-auto py-1">
                {loading ? (
                  <div className="p-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading repositories...</span>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    {repos.length === 0
                      ? "No authorized repositories found."
                      : `No repositories match "${searchQuery}"`}
                  </div>
                ) : (
                  <>
                    {/* Recent Section (exact GitHub Desktop pattern) */}
                    {selectedRepo && !searchQuery && (
                      <div className="mb-2">
                        <div className="px-3 py-1 text-[12px] font-bold text-neutral-900 dark:text-white">
                          Recent
                        </div>
                        <div
                          onClick={() => {
                            handleSelect(selectedRepo);
                          }}
                          className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-white/10 cursor-pointer transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {selectedRepo.private ? (
                              <LockIcon className="h-4 w-4" />
                            ) : (
                              <RepoIcon className="h-4 w-4" />
                            )}
                            <span className="text-[13px] font-medium text-neutral-900 dark:text-white truncate">
                              {selectedRepo.name}
                            </span>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-[#0969da] shrink-0 ml-2" />
                        </div>
                      </div>
                    )}

                    {/* Grouped by Organization / Account */}
                    {Object.entries(groupedRepos).map(([owner, ownerRepos]) => (
                      <div key={owner} className="mb-2 last:mb-0">
                        <div className="px-3 py-1 text-[12px] font-bold text-neutral-900 dark:text-white">
                          {owner}
                        </div>
                        <div>
                          {ownerRepos.map((r: any) => {
                            const isSelected =
                              value?.github_repo_id?.toString() === r.id.toString();
                            return (
                              <div
                                key={r.id}
                                onClick={() => handleSelect(r)}
                                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition select-none ${
                                  isSelected
                                    ? "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                                    : "hover:bg-neutral-100/70 dark:hover:bg-white/5 text-neutral-800 dark:text-neutral-200"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {r.private ? (
                                    <LockIcon className="h-4 w-4" />
                                  ) : (
                                    <RepoIcon className="h-4 w-4" />
                                  )}
                                  <span className="text-[13px] truncate">
                                    {r.name}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="h-2 w-2 rounded-full bg-[#0969da] shrink-0 ml-2" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
