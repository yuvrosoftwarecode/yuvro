import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Bot,
} from "lucide-react";
import {
  type CandidateMockInterviewQuota,
  type MockInterviewPack,
  DEFAULT_MOCK_INTERVIEW_PACKS,
  fetchMockInterviewPacks,
  createMockInterviewOrder,
  verifyMockInterviewPayment,
} from "@/services/mockInterviewService";
import { loadRazorpayScript } from "@/lib/razorpay";
import { useAuth } from "@/lib/auth";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (res: { error?: { description?: string } }) => void) => void;
}

interface WindowWithRazorpay extends Window {
  Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
}

export interface BuyMockInterviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quota?: CandidateMockInterviewQuota | null;
  onSuccess?: (updatedQuota: CandidateMockInterviewQuota) => void;
  initialNote?: string | null;
}

export const BuyMockInterviewsModal: React.FC<BuyMockInterviewsModalProps> = ({
  open,
  onOpenChange,
  quota,
  onSuccess,
  initialNote,
}) => {
  const { user } = useAuth();
  const [packs, setPacks] = useState<MockInterviewPack[]>(DEFAULT_MOCK_INTERVIEW_PACKS);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingPacks(true);
      fetchMockInterviewPacks()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPacks(data);
          }
        })
        .finally(() => setLoadingPacks(false));
    }
  }, [open]);

  const handlePurchase = async (pack: MockInterviewPack) => {
    if (processingPackId) return;
    setProcessingPackId(pack.id);

    try {
      const order = await createMockInterviewOrder(pack.id);
      if (!order || !order.order_id) {
        throw new Error("Failed to create mock interview order from server.");
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Payment gateway failed to load. Please check your internet connection.");
        setProcessingPackId(null);
        return;
      }

      const rzpKey = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!rzpKey) {
        toast.error("Payment configuration is missing. Please contact support.");
        setProcessingPackId(null);
        return;
      }

      const options = {
        key: rzpKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Yuvro Mock Interviews",
        description: `${pack.name} Pack`,
        order_id: order.order_id,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await verifyMockInterviewPayment({
              gateway_order_id: response.razorpay_order_id,
              gateway_payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyRes.status === "SUCCESS") {
              toast.success(`Successfully added ${pack.interviews_count} mock interview(s)!`);
              if (verifyRes.quota && onSuccess) {
                onSuccess(verifyRes.quota);
              }
              onOpenChange(false);
            } else {
              toast.error(verifyRes.message || "Payment verification failed.");
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            toast.error(err?.message || "Failed to verify mock interview payment.");
          } finally {
            setProcessingPackId(null);
          }
        },
        prefill: {
          name: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "",
          email: user?.email || "",
        },
        theme: {
          color: "#0A0A0A",
        },
        modal: {
          ondismiss: () => {
            setProcessingPackId(null);
          },
        },
      };

      const RazorpayConstructor = (window as unknown as WindowWithRazorpay).Razorpay;
      if (!RazorpayConstructor) {
        throw new Error("Razorpay SDK is not initialized.");
      }

      const rzp = new RazorpayConstructor(options as unknown as Record<string, unknown>);
      rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
        const errorDesc = response?.error?.description || "Payment was declined.";
        toast.error(errorDesc);
        setProcessingPackId(null);
      });

      rzp.open();
    } catch (err: any) {
      console.error("Mock interview purchase error:", err);
      toast.error(err?.message || "Failed to initialize purchase. Please try again.");
      setProcessingPackId(null);
    }
  };

  const getPackIcon = (count: number) => {
    if (count <= 1) return <Sparkles className="w-5 h-5 text-blue-500" />;
    if (count <= 5) return <Zap className="w-5 h-5 text-amber-500" />;
    return <Flame className="w-5 h-5 text-rose-500" />;
  };

  const getPerInterviewPrice = (pack: MockInterviewPack) => {
    const perPrice = Math.round((Number(pack.price_inr) / pack.interviews_count) * 10) / 10;
    return `₹${perPrice}/interview`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold">Buy Mock Interviews</DialogTitle>
            </div>
            {quota && (
              <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold">
                Available: {quota.available_interviews}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Practice AI-led tech interviews with Vitarka. Adaptive questions, dynamic evaluation, and comprehensive reports.
          </DialogDescription>
        </DialogHeader>

        {initialNote && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{initialNote}</span>
          </div>
        )}

        <div className="grid gap-4 py-2 sm:grid-cols-3">
          {packs.map((pack) => {
            const isProcessing = processingPackId === pack.id;
            const isPopular = pack.badge?.toLowerCase().includes("popular");
            const isBestValue = pack.badge?.toLowerCase().includes("value") || pack.badge?.toLowerCase().includes("best");

            return (
              <div
                key={pack.id}
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                  isPopular
                    ? "border-primary/60 bg-primary/[0.03] shadow-sm hover:border-primary"
                    : isBestValue
                    ? "border-amber-500/60 bg-amber-500/[0.03] shadow-sm hover:border-amber-500"
                    : "border-border hover:border-border/80"
                }`}
              >
                {pack.badge && (
                  <span
                    className={`absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isPopular
                        ? "bg-primary text-primary-foreground"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {pack.badge}
                  </span>
                )}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-card border">
                      {getPackIcon(pack.interviews_count)}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold">{pack.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">₹{pack.price_inr}</span>
                    <span className="text-xs text-muted-foreground">/-</span>
                  </div>

                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {getPerInterviewPrice(pack)}
                  </p>

                  <div className="my-4 border-t border-border/60" />

                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{pack.interviews_count} AI technical interview{pack.interviews_count > 1 ? "s" : ""}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>Adaptive questioning</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>Detailed analytics report</span>
                    </li>
                  </ul>
                </div>

                <Button
                  className="mt-5 w-full"
                  size="sm"
                  variant={isPopular ? "default" : "outline"}
                  disabled={Boolean(processingPackId)}
                  onClick={() => handlePurchase(pack)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Buy ${pack.interviews_count} ${pack.interviews_count === 1 ? "Interview" : "Interviews"}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Secure checkout via Razorpay · Instant credit to your candidate account</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
