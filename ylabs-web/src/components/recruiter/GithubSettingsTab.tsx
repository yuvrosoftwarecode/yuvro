import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
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
  ShieldCheck,
  Building2,
  User,
  Plus,
  ArrowRight,
  FolderGit2,
  Terminal,
  Check,
  HelpCircle,
  ChevronDown,
  X
} from "lucide-react";

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
  const [avatarFailed, setAvatarFailed] = useState<Record<string, boolean>>({});
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
      toast.error("Failed to load GitHub installations.");
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
      setRepos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch repos", err);
      toast.error("Failed to load repositories from GitHub.");
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

  const handleConfirmDisconnect = async (instId: string) => {
    const target = installations.find((i) => i.installation_id === instId);
    const confirmName = target ? target.account_login : "this account";

    setDisconnectLoading(true);
    try {
      await restApiAuthUtil.delete(`/recruiter/github-app/installations/${instId}/`);
      toast.success(`Disconnected ${confirmName}`);
      setDisconnectTarget(null);
      await fetchInstallations();
    } catch (err: any) {
      console.error("Failed to disconnect", err);
      toast.error(err?.response?.data?.error || "Failed to disconnect GitHub App installation.");
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

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Who can install the GitHub App for an organization?",
      a: "Any GitHub user can install the app on their personal account. For GitHub organizations, an organization owner or member with app installation permissions can approve the install. If you don't have admin rights, GitHub allows you to submit an installation request directly to your org owner for 1-click approval."
    },
    {
      q: "Can I grant access to only specific starter repositories?",
      a: "Yes. During installation on GitHub, choose 'Only select repositories' and select the exact starter code projects you want to use for assessments. You can add or remove repositories at any time by clicking 'Add / Remove Repositories'."
    },
    {
      q: "Do candidates get direct access to our GitHub repository?",
      a: "No. Candidates never see your GitHub tokens, credentials, or private repository URLs. Yuvro provisions an isolated, sandboxed clone inside an ephemeral browser workspace container."
    },
    {
      q: "What happens when a candidate commits or submits their solution?",
      a: "Candidate code changes and test runs are evaluated independently in their sandbox environment and packaged directly into Yuvro's evaluation scorecard. They are never committed or pushed back to your GitHub repository."
    },
    {
      q: "Can I connect multiple GitHub accounts or organizations?",
      a: "Yes. You can connect multiple GitHub organizations or personal accounts and switch between them when assigning starter templates to questions in Question Bank."
    }
  ];

  const getLanguageColor = (lang?: string) => {
    if (!lang) return "bg-neutral-400";
    const l = lang.toLowerCase();
    if (l.includes("type")) return "bg-blue-500";
    if (l.includes("java") && !l.includes("script")) return "bg-orange-500";
    if (l.includes("script")) return "bg-amber-400";
    if (l.includes("py")) return "bg-emerald-500";
    if (l.includes("html") || l.includes("css")) return "bg-rose-500";
    if (l.includes("go")) return "bg-cyan-500";
    if (l.includes("rust")) return "bg-amber-600";
    if (l.includes("c#") || l.includes("c++") || l.includes("c")) return "bg-violet-500";
    if (l.includes("ruby")) return "bg-red-500";
    if (l.includes("php")) return "bg-indigo-500";
    return "bg-emerald-500";
  };

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
      {/* Case 1: No Installations Connected */}
      {installations.length === 0 ? (
        <div className="space-y-8">
          {/* Main Hero Card */}
          <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-gradient-to-b from-neutral-50/70 via-white to-white dark:from-[#151518] dark:via-[#111113] dark:to-[#0d0d0e] p-7 sm:p-10 shadow-sm">
            {/* Ambient background accents */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/5" />

            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Left 7 cols: Value Proposition & CTA */}
              <div className="lg:col-span-7">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  Evaluate engineering candidates using your real-world repositories
                </h2>

                <p className="mt-3 text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
                  Connect your GitHub organization or personal profile to authorize starter repositories. When creating evaluation challenges, link your private codebases with 1-click—candidates receive an ephemeral, browser-based coding workspace without compromising your code or credentials.
                </p>

                {/* Primary Action Button */}
                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    onClick={handleConnect}
                    disabled={connectLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm hover:shadow disabled:opacity-50"
                  >
                    {connectLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Redirecting to GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Github className="h-3.5 w-3.5" />
                        <span>Connect GitHub Account</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-neutral-500">
                    Takes ~30 seconds • Select all or specific repositories
                  </span>
                </div>

                {/* Trust Highlights */}
                <div className="mt-7 pt-6 border-t border-neutral-200/70 dark:border-white/5 flex flex-wrap items-center gap-y-2 gap-x-6 text-[12px] text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Strictly Read-Only Access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Revoke Anytime</span>
                  </div>
                </div>
              </div>

              {/* Right 5 cols: Live Product Preview Mockup */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-lg">
                  {/* Mock Window Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">yuvro-labs-github-app</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                      <ShieldCheck className="h-3 w-3" /> Ready
                    </span>
                  </div>

                  {/* Mock Authorized Repo Card */}
                  <div className="mt-4 p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                        <span className="text-[13px] font-semibold text-neutral-900 dark:text-white font-mono">
                          your-org/payments-starter
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-200/80 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                        <Lock className="h-2.5 w-2.5" /> Private
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500 leading-snug">
                      Full-stack Spring Boot & React evaluation starter template for Senior Backend Engineers.
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3 text-neutral-400" /> main
                      </span>
                      <span>TypeScript / Java</span>
                    </div>
                  </div>

                  {/* Mock Candidate Sandbox Box */}
                  <div className="mt-3 rounded-xl bg-neutral-950 p-3.5 text-left font-mono text-[11px] text-neutral-300 shadow-inner">
                    <div className="flex items-center justify-between text-[10px] pb-2 border-b border-white/10 text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="h-3 w-3 text-emerald-400" />
                        <span>Candidate Evaluation Sandbox Boot</span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <p className="text-neutral-400">
                        $ yuvro-sandbox init --repo <span className="text-emerald-400">payments-starter</span>
                      </p>
                      <p className="text-neutral-500">Cloning template via ephemeral token...</p>
                      <p className="text-emerald-400">✓ Isolated workspace active (1.2s)</p>
                      <p className="text-neutral-500">Candidate IDE connected (0 secrets exposed)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works - 3 Step Process */}
          <div>
            <div className="mb-5">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
                How GitHub App Integration Works
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                From installation to candidate evaluation in three seamless steps.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Step 1 */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <Github className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-neutral-400">STEP 01</span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Connect Organization or Account
                </h4>
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Authorize the Yuvro Labs GitHub App with one click. Organization owners can install it across the entire company or personal profile.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <FolderGit2 className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-neutral-400">STEP 02</span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Select Authorized Repositories
                </h4>
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Choose &quot;Only select repositories&quot; to pick specific starter code templates, or grant access to all repositories. Update allowed repos anytime.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-neutral-400">STEP 03</span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Attach to Lab Evaluations
                </h4>
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  In Question Bank, select your repo with 1 click. Candidates get an isolated browser IDE with real git branches ready without seeing your repo URL.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive FAQ Section */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121214] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-neutral-400" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-white/5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-3.5 first:pt-1 last:pb-1">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 text-left font-medium text-[13px] text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-neutral-900 dark:text-white" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed pr-6">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Quick Connect Banner */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.02] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Ready to connect your engineering repositories?
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Takes under a minute. You will be redirected to GitHub to select your authorized repositories.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connectLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm disabled:opacity-50 shrink-0"
            >
              <Github className="h-4 w-4" />
              <span>Connect GitHub</span>
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: One or more Installations Connected */
        <div className="space-y-4">
          {/* Top Account Header Card */}
          <div className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121214] p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Account Identity */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {currentInstallation?.account_login && !avatarFailed[currentInstallation.account_login] ? (
                    <img
                      src={
                        currentInstallation.avatar_url ||
                        `https://github.com/${currentInstallation.account_login}.png?size=96`
                      }
                      alt={currentInstallation.account_login}
                      onError={() => {
                        setAvatarFailed((prev) => ({
                          ...prev,
                          [currentInstallation.account_login]: true,
                        }));
                      }}
                      className="h-10 w-10 rounded-xl object-cover border border-neutral-200/80 dark:border-white/10 shadow-xs bg-neutral-100 dark:bg-white/5"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm">
                      <Github className="h-5 w-5" />
                    </div>
                  )}
                  {/* Subtle GitHub badge in corner */}
                  <div className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white border border-white dark:border-[#121214] shadow-2xs">
                    <Github className="h-2.5 w-2.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://github.com/${currentInstallation?.account_login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-1 text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      <span>{currentInstallation?.account_login}</span>
                      <ExternalLink className="h-3 w-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5">
                      {currentInstallation?.account_type === "Organization" ? (
                        <Building2 className="h-2.5 w-2.5" />
                      ) : (
                        <User className="h-2.5 w-2.5" />
                      )}
                      {currentInstallation?.account_type || "User"}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[11px] text-neutral-500 flex items-center gap-1.5">
                    <span>Installation ID:</span>
                    <span className="font-mono text-neutral-600 dark:text-neutral-400">
                      {currentInstallation?.installation_id}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentInstallation?.manage_url && (
                  <a
                    href={currentInstallation.manage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-xs"
                  >
                    <span>Manage on GitHub</span>
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                )}

                <button
                  onClick={() => selectedInstId && fetchRepos(selectedInstId)}
                  disabled={loadingRepos}
                  title="Reload repositories from GitHub API"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span>Sync</span>
                </button>

                <button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  title="Connect another GitHub account or organization"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-white/10"
                >
                  <Plus className="h-3 w-3" />
                  <span className="hidden sm:inline">Add Account</span>
                </button>

                <button
                  onClick={() => currentInstallation && setDisconnectTarget(currentInstallation)}
                  disabled={disconnectLoading}
                  title="Disconnect this GitHub installation"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </div>
            </div>

            {/* If user has multiple installations connected */}
            {installations.length > 1 && (
              <div className="mt-3.5 pt-3 border-t border-neutral-100 dark:border-white/5 flex items-center gap-2">
                <span className="text-[11px] text-neutral-500 font-medium">Switch:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {installations.map((inst) => {
                    const isSelected = inst.installation_id === selectedInstId;
                    const instAvatar =
                      inst.avatar_url || `https://github.com/${inst.account_login}.png?size=48`;
                    return (
                      <button
                        key={inst.id}
                        onClick={() => setSelectedInstId(inst.installation_id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                          isSelected
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                            : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                        }`}
                      >
                        <img
                          src={instAvatar}
                          alt=""
                          className="h-3.5 w-3.5 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span>{inst.account_login}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121214] p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                <FolderGit2 className="h-3.5 w-3.5" />
                <span>Total Repositories</span>
              </div>
              <div className="mt-1.5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                {repos.length}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121214] p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px]">
                <Lock className="h-3.5 w-3.5" />
                <span>Private Repositories</span>
              </div>
              <div className="mt-1.5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                {privateCount}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121214] p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-[11px]">
                <Globe className="h-3.5 w-3.5" />
                <span>Public Repositories</span>
              </div>
              <div className="mt-1.5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                {publicCount}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121214] p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Evaluation Status</span>
              </div>
              <div className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ready for Labs
              </div>
            </div>
          </div>

          {/* Main Repositories Section */}
          <div className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-sm">
            {/* Header + Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                    Authorized Repositories
                  </h3>
                  <span className="rounded-full bg-neutral-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    {filteredRepos.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Select any repository below when creating questions in Question Bank to use as starter code.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 self-start sm:self-auto bg-neutral-100/80 dark:bg-black/40 p-0.5 rounded-lg border border-neutral-200/60 dark:border-white/5 text-[11px]">
                <button
                  onClick={() => setVisibilityFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    visibilityFilter === "ALL"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-xs font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  All ({repos.length})
                </button>
                <button
                  onClick={() => setVisibilityFilter("PRIVATE")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    visibilityFilter === "PRIVATE"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-xs font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <Lock className="h-2.5 w-2.5" />
                  <span>Private ({privateCount})</span>
                </button>
                <button
                  onClick={() => setVisibilityFilter("PUBLIC")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    visibilityFilter === "PUBLIC"
                      ? "bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-xs font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <Globe className="h-2.5 w-2.5" />
                  <span>Public ({publicCount})</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search repositories by name, language, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-black/20 pl-9 pr-8 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition focus:border-neutral-400 dark:focus:border-white/20 focus:bg-white dark:focus:bg-black/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Repositories Grid */}
            <div className="mt-5">
              {loadingRepos ? (
                <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
                  <RefreshCw className="h-5 w-5 animate-spin text-neutral-500 mb-2" />
                  <p className="text-xs">Fetching repositories from GitHub API...</p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 dark:border-white/10 p-10 text-center">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-neutral-100 dark:bg-white/5 text-neutral-400">
                    <Search className="h-4 w-4" />
                  </div>
                  {repos.length === 0 ? (
                    <>
                      <h4 className="mt-2.5 text-xs font-semibold text-neutral-900 dark:text-white">
                        No repositories authorized yet
                      </h4>
                      <p className="mt-1 text-[11px] text-neutral-500 max-w-sm mx-auto">
                        Your GitHub App is connected, but you haven&apos;t granted access to any repositories yet.
                      </p>
                      {currentInstallation?.manage_url && (
                        <div className="mt-4">
                          <a
                            href={currentInstallation.manage_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs font-medium transition hover:opacity-90 shadow-xs"
                          >
                            <span>Select Repositories on GitHub</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="mt-2.5 text-xs font-semibold text-neutral-900 dark:text-white">
                        No repositories match &quot;{searchQuery}&quot;
                      </h4>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        Try searching for a different keyword or resetting your visibility filter.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setVisibilityFilter("ALL");
                        }}
                        className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
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
                      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-neutral-200/80 dark:border-white/5 bg-white dark:bg-gradient-to-b dark:from-white/[0.03] dark:to-white/[0.01] p-4 transition hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-sm"
                    >
                      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div>
                        {/* Card Top: Icon, Title, Visibility Badge */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/5 text-neutral-700 dark:text-neutral-300 shrink-0">
                              <FolderGit2 className="h-3.5 w-3.5" />
                            </div>
                            <h4
                              title={repo.name}
                              className="font-medium text-[13px] text-neutral-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition"
                            >
                              {repo.name}
                            </h4>
                          </div>

                          <span
                            className={`shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                              repo.private
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10"
                            }`}
                          >
                            {repo.private ? (
                              <>
                                <Lock className="h-2 w-2" />
                                <span>Private</span>
                              </>
                            ) : (
                              <>
                                <Globe className="h-2 w-2" />
                                <span>Public</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Description */}
                        {repo.description ? (
                          <p className="mt-2 text-[11px] text-neutral-500 line-clamp-2 leading-relaxed min-h-[32px]">
                            {repo.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500 min-h-[32px]">
                            No description provided
                          </p>
                        )}

                        {/* Badges / Tech Row */}
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5">
                            <GitBranch className="h-2.5 w-2.5 text-neutral-400" />
                            <span>{repo.default_branch || "main"}</span>
                          </span>

                          {repo.language && (
                            <span className="inline-flex items-center gap-1 rounded bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5">
                              <span className={`h-1.5 w-1.5 rounded-full ${getLanguageColor(repo.language)}`} />
                              <span>{repo.language}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: View on GitHub + Use in Question Bank */}
                      <div className="mt-3.5 pt-2.5 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                        {repo.html_url ? (
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                          >
                            <span>GitHub</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-neutral-400">GitHub</span>
                        )}

                        <Link
                          to="/recruiter/questions"
                          search={{ repo: repo.name } as any}
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition"
                        >
                          <span>Use in Lab</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Config Banner */}
            {repos.length > 0 && currentInstallation?.manage_url && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.02] p-3.5 sm:p-4 border border-neutral-200/70 dark:border-white/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      Need to update authorized repositories?
                    </span>
                    <span className="text-neutral-500 ml-1 hidden md:inline">
                      Add private repositories or revoke access directly on GitHub.
                    </span>
                  </div>
                </div>

                <a
                  href={currentInstallation.manage_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-white/10 shadow-2xs shrink-0"
                >
                  <span>Configure on GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for Disconnecting GitHub Account */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          {/* Backdrop click to dismiss */}
          <div
            className="fixed inset-0"
            onClick={() => !disconnectLoading && setDisconnectTarget(null)}
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#151518] p-6 shadow-2xl space-y-4 z-10 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                  Disconnect GitHub Account?
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Are you sure you want to disconnect{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                    {disconnectTarget.account_login}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-neutral-50 dark:bg-white/[0.03] p-3.5 border border-neutral-200/70 dark:border-white/5 text-[12px] text-neutral-600 dark:text-neutral-400 space-y-1.5">
              <p className="font-medium text-neutral-800 dark:text-neutral-200">
                What will happen:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px] leading-relaxed">
                <li>Access to all authorized starter repositories will be removed.</li>
                <li>Candidate evaluation labs linked to these repositories will no longer clone.</li>
                <li>You can reconnect this account at any time with one click.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={disconnectLoading}
                onClick={() => setDisconnectTarget(null)}
                className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={disconnectLoading}
                onClick={() => handleConfirmDisconnect(disconnectTarget.installation_id)}
                style={{ color: "#ffffff" }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs font-semibold !text-white transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {disconnectLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-white" style={{ color: "#ffffff" }} />
                    <span className="!text-white" style={{ color: "#ffffff" }}>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 text-white" style={{ color: "#ffffff" }} />
                    <span className="!text-white" style={{ color: "#ffffff" }}>Disconnect Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
