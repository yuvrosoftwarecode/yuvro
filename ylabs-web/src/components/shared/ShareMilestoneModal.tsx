import React, { useState, useEffect } from "react";
import {
  Linkedin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Share2,
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

export interface MilestoneDetails {
  labTitle: string;
  sprintTitle?: string;
  sprintsCount?: number;
  completedTickets?: number;
  totalTickets?: number;
  score?: number;
  earnedXp?: number;
  language?: string;
  tags?: string[];
}

export interface ShareMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneTitle: string;
  milestoneType?: "sprint" | "lab" | "ticket" | "certificate";
  shareUrl?: string;
  details?: MilestoneDetails;
  defaultCommentary?: string;
}

export function ShareMilestoneModal({
  isOpen,
  onClose,
  milestoneTitle,
  milestoneType = "lab",
  shareUrl = typeof window !== "undefined" ? window.location.href : "https://yuvrolabs.com",
  details,
  defaultCommentary,
}: ShareMilestoneModalProps) {
  const { user } = useAuth();
  const linkedinConnected = user?.linkedin_connected ?? false;

  // Student display name
  const studentName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Student";

  // Build high-impact LinkedIn post caption
  const generateRichCopy = () => {
    if (defaultCommentary) return defaultCommentary;

    const tagsStr = details?.tags && details.tags.length > 0
      ? details.tags.map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ")
      : "#SoftwareEngineering #Coding";

    if (milestoneType === "ticket") {
      const scoreLine = typeof details?.score === "number" ? `• Score: ${details.score}%\n` : "";
      const xpLine = typeof details?.earnedXp === "number" ? `• XP Earned: +${details.earnedXp} YP\n` : "";

      return (
        `⚡ Ticket Cleared: Just solved "${milestoneTitle}" in ${details?.labTitle || "Practical Labs"} on Yuvro Labs!\n\n` +
        `🛠️ Solved and verified against production test suites and automated execution.\n` +
        scoreLine +
        xpLine +
        `\n#Yuvro #EngineeringSkills #DevJourney #Coding #100DaysOfCode ${tagsStr}`
      );
    }

    if (milestoneType === "sprint") {
      const ticketsText =
        typeof details?.completedTickets === "number"
          ? `${details.completedTickets} production tasks`
          : "tasks";
      const scoreLine = typeof details?.score === "number" ? `• Sprint Evaluation Score: ${details.score}%\n` : "";
      const xpLine = typeof details?.earnedXp === "number" ? `• XP Earned: +${details.earnedXp} Yuvro Points\n` : "";

      return (
        `🚀 Milestone Unlocked: Completed ${details?.sprintTitle || milestoneTitle} in ${details?.labTitle || "Production Engineering"} on Yuvro Labs!\n\n` +
        `📈 Progress Breakdown:\n` +
        `• Tickets Cleared: ${ticketsText}\n` +
        scoreLine +
        xpLine +
        `\nTested against realistic enterprise edge cases and constraints.\n\n` +
        `#Yuvro #DevJourney #CareerGrowth #LearningInPublic ${tagsStr}`
      );
    }

    if (milestoneType === "certificate") {
      return (
        `🎓 Excited to earn the ${milestoneTitle} certificate on Yuvro Labs!\n\n` +
        `Hands-on validation of production-grade engineering practices.\n\n` +
        `#Certification #Achievement #SoftwareDevelopment #Yuvro`
      );
    }

    // Default: Lab Completion
    const totalT = details?.totalTickets ?? 0;
    const completedT = details?.completedTickets ?? 0;
    const ticketsSummary = totalT > 0 ? `${completedT} / ${totalT}` : `${completedT}`;
    const labScoreLine = typeof details?.score === "number" ? `• Evaluation Score: ${details.score}%\n` : "";
    const labXpLine = typeof details?.earnedXp === "number" ? `• Total Points: ${details.earnedXp} Yuvro Points (YP)\n` : "";

    return (
      `🎯 Huge Milestone: I just completed the ${details?.labTitle || milestoneTitle} on Yuvro Labs!\n\n` +
      `📊 Milestone Telemetry:\n` +
      (details?.sprintsCount ? `• Sprints Cleared: ${details.sprintsCount}\n` : "") +
      `• Production Tickets Solved: ${ticketsSummary}\n` +
      labScoreLine +
      labXpLine +
      `\nEngineered and verified against automated constraints and real-world architectures.\n\n` +
      `#Yuvro #EngineeringSkills #HandsOnCoding #100DaysOfCode ${tagsStr}`
    );
  };

  const [commentary, setCommentary] = useState(generateRichCopy());
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null);
  const [generatingBanner, setGeneratingBanner] = useState(false);

  // Generate celebration GIF on open
  useEffect(() => {
    if (isOpen) {
      setCommentary(generateRichCopy());
      setSuccess(false);
      setError(null);
      setGeneratingBanner(true);

      const taskName = details?.sprintTitle || milestoneTitle || "Engineering Milestone";
      const labName = details?.labTitle || "Practical Labs";

      // Badge logic:
      // - ticket level: "TICKET CLEARED"
      // - sprint level: "SPRINT COMPLETED"
      // - lab level: "LAB COMPLETED"
      let badge = "TICKET CLEARED";
      if (milestoneType === "lab") {
        badge = "LAB COMPLETED";
      } else if (milestoneType === "sprint") {
        badge = "SPRINT COMPLETED";
      }

      yhubApiAuthUtil
        .post<{ data_uri: string }>("/auth/linkedin/generate-gif/", {
          name: studentName,
          task: taskName,
          company: labName,
          badge,
        })
        .then((res) => {
          if (res?.data_uri) {
            setBannerDataUrl(res.data_uri);
          }
        })
        .catch((err) => {
          console.error("Backend celebration GIF generation failed:", err);
        })
        .finally(() => {
          setGeneratingBanner(false);
        });
    }
  }, [isOpen, milestoneTitle, details, studentName, milestoneType]);

  if (!isOpen) return null;

  const handleConnectLinkedIn = async () => {
    try {
      sessionStorage.setItem("linkedin_oauth_redirect", window.location.pathname + window.location.search);
      const data = await yhubApiAuthUtil.get<{ authorization_url: string }>("/auth/linkedin/connect/");
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (e) {
      console.error(e);
      setError("Failed to initialize LinkedIn connection. Please try again.");
    }
  };

  const handleDirectShare = async () => {
    setLoading(true);
    setError(null);
    try {
      await yhubApiAuthUtil.post("/auth/linkedin/share/", {
        commentary,
        url: shareUrl,
        title: `${studentName}'s Milestone: ${milestoneTitle}`,
        description: `Verified engineering achievement on Yuvro Labs. ${details?.completedTickets ? `${details.completedTickets} tickets completed.` : ""}`,
        image: bannerDataUrl, // attach base64 banner
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error("LinkedIn Share failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to post to LinkedIn.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleIntentShare = () => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const intentUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    window.open(intentUrl, "_blank", "width=600,height=600");
    onClose();
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadBanner = () => {
    if (!bannerDataUrl) return;
    const a = document.createElement("a");
    a.href = bannerDataUrl;
    const isGif = bannerDataUrl.startsWith("data:image/gif");
    const ext = isGif ? "gif" : "png";
    a.download = `yuvro-milestone-${milestoneTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 text-[#0A66C2]">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0A66C2]/10">
            <Linkedin className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-1.5">
              Share Milestone with Banner
              <Sparkles className="h-4 w-4 text-warning" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Posts an official verified milestone card directly to your LinkedIn feed
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Published to LinkedIn!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Your milestone banner and verified metrics are now live on your LinkedIn profile.
            </p>
          </div>
        ) : (
          <div>
            {/* Visual Banner Preview Card */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Milestone Celebration GIF
                </span>
                {bannerDataUrl && (
                  <button
                    type="button"
                    onClick={downloadBanner}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    Download GIF
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-border/80 bg-black/40 overflow-hidden relative aspect-[800/418] flex items-center justify-center shadow-md">
                {generatingBanner ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Generating animated celebration GIF...
                  </div>
                ) : bannerDataUrl ? (
                  <img
                    src={bannerDataUrl}
                    alt="Milestone Celebration GIF"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">Failed to render GIF</div>
                )}
              </div>
            </div>

            {/* Editable Caption */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Post Caption
                </label>
                <span className="text-[11px] text-muted-foreground">Editable before sharing</span>
              </div>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2] focus:outline-none resize-none font-mono"
                placeholder="What did you build or learn?"
              />
            </div>

            {/* Attached Verification Link */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3 mb-4 text-xs flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">{shareUrl}</span>
              </div>
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:text-primary transition-colors shrink-0"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? "Copied" : "Copy"}
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={handleIntentShare}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Open in LinkedIn web dialog
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs rounded-lg border border-border hover:bg-accent font-medium flex-1 sm:flex-none"
                  disabled={loading}
                >
                  Cancel
                </button>

                {linkedinConnected ? (
                  <button
                    type="button"
                    onClick={handleDirectShare}
                    disabled={loading || !commentary.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A66C2]/90 disabled:opacity-50 flex-1 sm:flex-none shadow-sm transition-all"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Linkedin className="h-3.5 w-3.5 fill-current" />
                    )}
                    {loading ? "Publishing with Banner..." : "Post to LinkedIn"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectLinkedIn}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A66C2]/90 flex-1 sm:flex-none shadow-sm transition-all"
                  >
                    <Linkedin className="h-3.5 w-3.5 fill-current" />
                    Connect & Share
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
