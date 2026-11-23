import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  referralService,
  type ReferralCodeResponse,
  type StudentReferralStats,
  type ReferralHistoryItem,
} from "@/services/referralService";
import { ReferralShareModal } from "@/components/referrals/ReferralShareModal";
import {
  Users,
  CheckCircle2,
  Clock,
  Share2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/student/referrals")({
  component: MyReferralsPage,
});

function MyReferralsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [referralCodeData, setReferralCodeData] = useState<ReferralCodeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, historyRes, codeRes] = await Promise.all([
          referralService.getMyStats(),
          referralService.getMyHistory(1, 50),
          referralService.getMyReferralCode(),
        ]);
        setStats(statsRes);
        setHistory(historyRes.results || []);
        setReferralCodeData(codeRes);
      } catch (err: any) {
        console.error("Failed to load referral details:", err);
        setError("Failed to load referral information. Please check your connection and refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getFullShareUrl = () => {
    if (!referralCodeData?.code) return "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return `${origin}/register?ref=${encodeURIComponent(referralCodeData.code)}`;
    }
    return referralCodeData.link || "";
  };

  const handleCopy = async () => {
    const url = getFullShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        {/* Header with Title and Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Share2 className="h-6 w-6 text-primary" />
              My Referrals
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invite your friends to learn on YLabs. Track who joined and monitor your referral stats.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Referral Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share Referral Link</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Referrals */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Referrals</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                stats?.total_referrals ?? 0
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Friends successfully registered through your link
            </p>
          </div>

          {/* Accepted Referrals */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Accepted Referrals</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {loading ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                stats?.accepted_referrals ?? 0
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active student accounts created
            </p>
          </div>

          {/* Pending Referrals */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pending Referrals</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {loading ? (
                <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
              ) : (
                stats?.pending_referrals ?? 0
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Invitations awaiting account creation
            </p>
          </div>
        </div>

        {/* Referral History Table Section */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Referral History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                List of friends who joined YLabs through your invitation
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {history.length} {history.length === 1 ? "friend" : "friends"}
            </span>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading referral history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-accent/60 flex items-center justify-center text-muted-foreground mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No referrals yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                You haven't referred anyone yet. Share your referral link with your peers, classmates, and colleagues!
              </p>
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Invite Your First Friend</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Referred Student Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Registration Date</th>
                    <th className="px-5 py-3 text-left font-semibold">Referral Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {item.referred_name}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono">
                        {item.registration_date}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.status.toLowerCase() === "accepted" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Referral Sharing Modal */}
        <ReferralShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          referralData={referralCodeData}
        />
      </main>
    </div>
  );
}
