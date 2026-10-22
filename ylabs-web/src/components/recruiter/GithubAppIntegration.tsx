import { useState, useEffect, useRef } from "react";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import { Github } from "lucide-react";

export function GithubAppIntegration({ value, onChange, onBranchChange, settingsMode = false }: any) {
  const [installations, setInstallations] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedInst, setSelectedInst] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const callbackHandled = useRef(false);

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
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      setSuccessMsg("GitHub App connected successfully!");
      fetchInstallations();
    } catch (err: any) {
      console.error("Callback failed", err);
      setErrorMsg(err?.response?.data?.error || "Failed to verify GitHub App installation.");
      fetchInstallations();
    }
  };

  const fetchInstallations = async () => {
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/installations/");
      setInstallations(data || []);
      if (data && data.length > 0 && !selectedInst) {
        setSelectedInst(data[0].installation_id);
      }
    } catch (err) {
      console.error("Failed to fetch installations", err);
      setErrorMsg("Failed to load GitHub installations.");
    }
  };

  useEffect(() => {
    if (selectedInst && !settingsMode) {
      fetchRepos(selectedInst);
    }
  }, [selectedInst, settingsMode]);

  const fetchRepos = async (instId: string) => {
    setLoading(true);
    try {
      const data: any = await restApiAuthUtil.get(`/recruiter/github-app/installations/${instId}/repositories/`);
      setRepos(data || []);
    } catch (err) {
      console.error("Failed to fetch repos", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnectLoading(true);
    setErrorMsg("");
    try {
      const data: any = await restApiAuthUtil.get("/recruiter/github-app/install/");
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to get install URL", err);
      setErrorMsg("Failed to start GitHub connection flow. Please try again.");
      setConnectLoading(false);
    }
  };

  return (
    <div className={settingsMode ? "" : "rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/60 dark:bg-black/20 p-3.5 space-y-3"}>
      {!settingsMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-neutral-900 dark:text-white" />
            <span className="text-[12px] font-medium text-neutral-900 dark:text-white">Select from Connected GitHub App</span>
          </div>
          {installations.length > 0 && (
            <span className="text-[11px] text-emerald-500 font-medium">
              {repos.length} repositories authorized
            </span>
          )}
        </div>
      )}
      
      {errorMsg && <p className="text-[12px] text-red-500">{errorMsg}</p>}
      {successMsg && <p className="text-[12px] text-emerald-500">{successMsg}</p>}

      {installations.length === 0 ? (
        <div>
          {!settingsMode && <p className="text-xs text-neutral-500 mb-2">Connect a GitHub App to select private repositories.</p>}
          <button 
            onClick={handleConnect} 
            disabled={connectLoading}
            type="button" 
            className={`inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200 ${settingsMode ? '' : 'px-3 py-1.5 text-xs'}`}
          >
            <Github className="w-4 h-4" />
            {connectLoading ? "Connecting..." : "Connect GitHub"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {settingsMode ? (
            <div className="text-[13px] text-emerald-500 font-medium">
              GitHub connected ({installations.map((i: any) => i.account_login).join(", ")})
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {installations.length > 1 && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500">Account / Organization</label>
                  <select
                    value={selectedInst}
                    onChange={(e) => setSelectedInst(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                  >
                    {installations.map((inst: any) => (
                      <option key={inst.id} value={inst.installation_id} className="bg-white dark:bg-[#121214] text-neutral-900 dark:text-white">
                        {inst.account_login} ({inst.account_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={installations.length > 1 ? "" : "sm:col-span-2"}>
                <label className="text-[10px] uppercase tracking-wider text-neutral-500">Select Starter Repository</label>
                {loading ? (
                  <p className="text-xs text-neutral-500 py-2">Loading authorized repositories...</p>
                ) : (
                  <select
                    value={value?.github_repo_id || ""}
                    onChange={(e) => {
                      const r = repos.find((repo: any) => repo.id.toString() === e.target.value);
                      if (r) {
                        onChange({
                          github_repo_id: r.id.toString(),
                          git_repo_starter_url: (r as any).html_url || `https://github.com/${(r as any).full_name}.git`,
                          repo_source_type: "RECRUITER_GITHUB_APP",
                          github_app_installation: installations.find((i: any) => i.installation_id === selectedInst)?.id
                        });
                        onBranchChange((r as any).default_branch || "main");
                      } else {
                        onChange({
                          github_repo_id: "",
                          git_repo_starter_url: "",
                          repo_source_type: "ADMIN_SYSTEM",
                          github_app_installation: null
                        });
                      }
                    }}
                    className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                  >
                    <option value="" className="bg-white dark:bg-[#121214] text-neutral-900 dark:text-white">-- Select from {repos.length} Authorized Repositories --</option>
                    {repos.map((r: any) => (
                      <option key={r.id} value={r.id.toString()} className="bg-white dark:bg-[#121214] text-neutral-900 dark:text-white">
                        {r.full_name} {r.private ? "🔒 (Private)" : "🌐 (Public)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
