import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { referralService, type ReferralCodeResponse } from "@/services/referralService";
import {
  Copy,
  Check,
  Share2,
  Mail,
  Loader2,
  ExternalLink,
  MessageCircle,
  Linkedin,
  Facebook,
  Send,
  Instagram,
} from "lucide-react";

interface ReferralShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralData?: ReferralCodeResponse | null;
}

export function ReferralShareModal({
  open,
  onOpenChange,
  referralData: initialData,
}: ReferralShareModalProps) {
  const [data, setData] = useState<ReferralCodeResponse | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }
    if (open && !data) {
      setLoading(true);
      setError(null);
      referralService
        .getMyReferralCode()
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          console.error("Failed to load referral code:", err);
          setError("Failed to load your referral code. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, initialData, data]);

  const defaultMsg =
    data?.message ||
    "Hey! Join YLabs using my referral link and create your account. Looking forward to learning together!";

  const getFullShareUrl = () => {
    if (!data?.code) return "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return `${origin}/register?ref=${encodeURIComponent(data.code)}`;
    }
    return data.link || "";
  };

  const shareUrl = getFullShareUrl();

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopiedType("link");
      setTimeout(() => {
        setCopied(false);
        setCopiedType(null);
      }, 2500);
    } catch {
      setError("Failed to copy link. Please manually copy the URL.");
    }
  };

  const handleCopyMessage = async () => {
    if (!shareUrl) return;
    const fullText = `${defaultMsg}\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setCopiedType("message");
      setTimeout(() => {
        setCopied(false);
        setCopiedType(null);
      }, 2500);
    } catch {
      setError("Failed to copy message.");
    }
  };

  // Social Share Handlers
  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${defaultMsg}\n\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleLinkedIn = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "noopener,noreferrer");
  };

  const handleFacebook = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(defaultMsg);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Join me on YLabs!");
    const body = encodeURIComponent(`${defaultMsg}\n\nSign up here: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleInstagram = () => {
    handleCopyLink();
    alert("Referral link copied! Paste it in your Instagram bio, story link, or DM.");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join YLabs",
          text: defaultMsg,
          url: shareUrl,
        });
      } catch {
        // User dismissed native share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-semibold">Refer a Friend</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite your friends to learn together on YLabs. Share your unique referral link below!
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Generating your referral link...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Referral Code Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-accent/30">
              <div>
                <span className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
                  Your Referral Code
                </span>
                <div className="text-base font-bold font-mono text-primary mt-0.5">
                  {data?.code || "..."}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-foreground transition font-medium"
              >
                {copied && copiedType === "message" ? "Copied Message!" : "Copy Message"}
              </button>
            </div>

            {/* Link Copy Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Referral Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-xs px-3 py-2 rounded-md border border-border bg-background text-foreground outline-none font-mono selection:bg-primary/20"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition shadow-sm"
                >
                  {copied && copiedType === "link" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Share Options */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-medium text-muted-foreground">Share via Social Media</span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  title="Share on WhatsApp"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">WhatsApp</span>
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  onClick={handleInstagram}
                  title="Share on Instagram (Copy link)"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-[#E4405F]/10 text-[#E4405F] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Instagram className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">Instagram</span>
                </button>

                {/* LinkedIn */}
                <button
                  type="button"
                  onClick={handleLinkedIn}
                  title="Share on LinkedIn"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Linkedin className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">LinkedIn</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={handleTelegram}
                  title="Share on Telegram"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Send className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">Telegram</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={handleFacebook}
                  title="Share on Facebook"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Facebook className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">Facebook</span>
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={handleEmail}
                  title="Share via Email"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">Email</span>
                </button>

                {/* More / Web Share */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  title="More sharing options"
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition group"
                >
                  <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground font-medium">More</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
