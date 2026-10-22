import { useState, useEffect, useRef, useMemo } from "react";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import {
  Github,
  GitBranch,
  Lock,
  Globe,
  ExternalLink,
  RefreshCw,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  User,
  Plus
} from "lucide-react";

interface Installation {
  id: string;
  installation_id: string;
  account_login: string;
  account_type: string;
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

export function GithubSettingsTab() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const [repos, setRepos] = useState<Repository[]>([]);
  
  const [loadingInst, setLoadingInst] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"ALL" | "PRIVATE" | "PUBLIC">("ALL");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const callbackHandled = useRef(false);

  // Handle OAuth/Installation callback if redirected from GitHub
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installation_id = params.get("installation_id");
    const setup_action = params.get("setup_action");
    const state = params.get("state");

    if (installation_id && state) {
      if (!callbackHandled.current) {
        callbackHandled.current = true;
        window.history.replaceState({}, document.title, window.location.pathname + "?tab=github");
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
      setSuccessMsg("GitHub App connected successfully!");
      fetchInstallations();
    } catch (err: any) {
      console.error("Callback failed", err);
      setErrorMsg(err?.response?.data?.error || "Failed to verify GitHub App installation.");
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
        // If current selection is still valid, keep it; otherwise default to first
        setSelectedInstId((prev) => {
          const exists = list.some((i: Installation) => i.installation_id === prev);
          return exists ? prev : list[0].installation_id;
        });
      } else {
        setSelectedInstId("");
        setRepos([]);
      }
    } catch (err) {
      console.error("Failed to fetch installations", err);
      setErrorMsg("Failed to load GitHub installations.");
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
    setErrorMsg("");
    try {
      const data: any = await restApiAuthUtil.get(`/recruiter/github-app/installations/${instId}/repositories/`);
      setRepos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch repos", err);
      setErrorMsg("Failed to load repositories from GitHub.");
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleConnect = async () => {
    setConnectLoading(true);
    setErrorMsg("");
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/install/");
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg("Failed to generate GitHub authorization URL.");
        setConnectLoading(false);
      }
    } catch (err) {
      console.error("Failed to get install URL", err);
      setErrorMsg("Failed to start GitHub connection flow. Please check server settings.");
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async (instId: string) => {
    const target = installations.find((i) => i.installation_id === instId);
    const confirmName = target ? target.account_login : "this account";
    if (!window.confirm(`Are you sure you want to disconnect ${confirmName}? Evaluation questions using its repositories may no longer clone.`)) {
      return;
    }

    setDisconnectLoading(true);
    try {
      await restApiAuthUtil.delete(`/recruiter/github-app/installations/${instId}/`);
      setSuccessMsg(`Disconnected ${confirmName}.`);
      await fetchInstallations();
    } catch (err) {
      console.error("Failed to disconnect", err);
      setErrorMsg("Failed to disconnect GitHub App installation.");
    } finally {
      setDisconnectLoading(false);
    }
  };

  const currentInstallation = installations.find((i) => i.installation_id === selectedInstId);

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
    return (
      <div className="flex flex-col items-center justify-center p-16 text-neutral-400">
        <RefreshCw className="h-6 w-6 animate-spin text-neutral-500 mb-3" />
        <p className="text-sm">Loading GitHub connection settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-[13px] text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[13px] text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Case 1: No Installations Connected */}
      {installations.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-8 text-center max-w-2xl mx-auto shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white">
            <Github className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-neutral-900 dark:text-white">
            Connect Your GitHub Account
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
            Link your GitHub organization or personal profile to select authorized repositories as starter code for candidate technical evaluations.
          </p>

          <div className="mt-6 grid gap-3 text-left max-w-md mx-auto bg-neutral-50 dark:bg-black/30 p-4 rounded-xl border border-neutral-200 dark:border-white/5 text-[13px] text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Read-only access to contents & metadata only</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>No personal access tokens (PAT) or secrets needed</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Granular repo permissions (choose all or specific repos)</span>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleConnect}
              disabled={connectLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-6 py-3 text-sm font-medium text-white dark:text-black transition hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-md disabled:opacity-50"
            >
              <Github className="h-4 w-4" />
              {connectLoading ? "Redirecting to GitHub..." : "Connect GitHub"}
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: One or more Installations Connected */
        <div className="space-y-6">
          {/* Top Account Card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm shrink-0">
                  <Github className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {currentInstallation?.account_login}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-white/5 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/5">
                      {currentInstallation?.account_type === "Organization" ? (
                        <Building2 className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      {currentInstallation?.account_type}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-500">
                    Installation ID: <span className="font-mono text-neutral-700 dark:text-neutral-300">{currentInstallation?.installation_id}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentInstallation?.manage_url && (
                  <a
                    href={currentInstallation.manage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-[13px] font-medium text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/20 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add / Remove Repositories</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
                )}

                <button
                  onClick={() => selectedInstId && fetchRepos(selectedInstId)}
                  disabled={loadingRepos}
                  title="Reload repository list from GitHub"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 px-3.5 py-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-100 dark:hover:bg-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Sync</span>
                </button>

                <button
                  onClick={() => selectedInstId && handleDisconnect(selectedInstId)}
                  disabled={disconnectLoading}
                  title="Disconnect this GitHub connection"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2 text-[13px] font-medium text-red-600 dark:text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>

                <button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  title="Connect another GitHub account or organization"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 px-3 py-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-100 dark:hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">Connect Another Account</span>
                </button>
              </div>
            </div>

            {/* If user has multiple installations connected, allow switching */}
            {installations.length > 1 && (
              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-white/5 flex items-center gap-2">
                <span className="text-[12px] text-neutral-500">Switch Account:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {installations.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => setSelectedInstId(inst.installation_id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        inst.installation_id === selectedInstId
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold"
                          : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {inst.account_login}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Repositories Section */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-6 shadow-sm">
            {/* Header and Search/Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                    Authorized Repositories
                  </h3>
                  <span className="rounded-full bg-neutral-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {filteredRepos.length}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-neutral-500">
                  Repositories accessible for coding evaluation questions. To grant or remove access, click &quot;Add / Remove Repositories&quot;.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-100 dark:bg-black/30 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
                <button
                  onClick={() => setVisibilityFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    visibilityFilter === "ALL"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  All ({repos.length})
                </button>
                <button
                  onClick={() => setVisibilityFilter("PRIVATE")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    visibilityFilter === "PRIVATE"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  Private ({privateCount})
                </button>
                <button
                  onClick={() => setVisibilityFilter("PUBLIC")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    visibilityFilter === "PUBLIC"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  Public ({publicCount})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="pt-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter repositories by name or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/20 pl-10 pr-4 py-2.5 text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* Repositories List */}
            <div className="mt-5">
              {loadingRepos ? (
                <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
                  <RefreshCw className="h-5 w-5 animate-spin text-neutral-500 mb-2" />
                  <p className="text-xs">Fetching repositories from GitHub API...</p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 dark:border-white/10 p-12 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-400">
                    <Search className="h-5 w-5" />
                  </div>
                  {repos.length === 0 ? (
                    <>
                      <h4 className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                        No repositories authorized yet
                      </h4>
                      <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                        Your GitHub App is connected to {currentInstallation?.account_login}, but no repositories were granted yet.
                      </p>
                      {currentInstallation?.manage_url && (
                        <div className="mt-4">
                          <a
                            href={currentInstallation.manage_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/20"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Select Repositories on GitHub</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                        No repositories match your filter
                      </h4>
                      <p className="mt-1 text-xs text-neutral-500">
                        Try searching for a different keyword or resetting your visibility filter.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setVisibilityFilter("ALL");
                        }}
                        className="mt-3 text-xs text-emerald-500 hover:underline"
                      >
                        Reset filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="group flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] p-4 transition hover:border-neutral-300 dark:hover:border-white/15 hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {repo.private ? (
                              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            ) : (
                              <Globe className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            )}
                            <h4
                              title={repo.name}
                              className="font-medium text-[13px] text-neutral-900 dark:text-white truncate"
                            >
                              {repo.name}
                            </h4>
                          </div>

                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                              repo.private
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            }`}
                          >
                            {repo.private ? "Private" : "Public"}
                          </span>
                        </div>

                        {repo.description ? (
                          <p className="mt-2 text-[12px] text-neutral-500 line-clamp-2 leading-relaxed">
                            {repo.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-[12px] text-neutral-400 italic">
                            No description provided
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {repo.default_branch || "main"}
                          </span>
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {repo.language}
                            </span>
                          )}
                        </div>

                        {repo.html_url && (
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Info Help */}
            {repos.length > 0 && currentInstallation?.manage_url && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-neutral-100/70 dark:bg-white/[0.03] p-4 text-[12px] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Need to grant access to another private repository or revoke an existing one?
                  </span>
                </div>
                <a
                  href={currentInstallation.manage_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                >
                  <span>Configure permissions on GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
