import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreditWallet } from "@/context/CreditWalletContext";
import { creditService, CreditPack, VerifyPaymentPayload } from "@/services/creditService";
import { loadRazorpayScript } from "@/lib/razorpay";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (res: { error?: { description?: string } }) => void) => void;
}

interface WindowWithRazorpay extends Window {
  Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
}

const getPackIcon = (packId: string) => {
  switch (packId.toLowerCase()) {
    case "starter":
      return <Sparkles className="w-5 h-5 text-blue-500" />;
    case "pro":
      return <Zap className="w-5 h-5 text-amber-500" />;
    case "power":
      return <Flame className="w-5 h-5 text-rose-500" />;
    default:
      return <Coins className="w-5 h-5 text-primary" />;
  }
};

const uuidv4 = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const CreditPurchaseModal: React.FC = () => {
  const {
    isPurchaseModalOpen,
    closePurchaseModal,
    packs,
    isPacksLoading,
    packsError,
    fetchPacks,
    refreshWallet,
    wallet,
  } = useCreditWallet();

  const { user } = useAuth();

  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [verificationPendingPayload, setVerificationPendingPayload] =
    useState<VerifyPaymentPayload | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const handlePurchase = async (pack: CreditPack) => {
    if (processingPackId || isVerifying) return;

    setProcessingPackId(pack.id);
    setVerificationError(null);
    setVerificationPendingPayload(null);

    try {
      const clientRequestId = uuidv4();
      const orderRes = await creditService.createOrder(pack.id, clientRequestId);

      if (!orderRes || !orderRes.order_id) {
        throw new Error("Invalid order response from server");
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Payment gateway failed to load. Please check your internet connection.");
        setProcessingPackId(null);
        return;
      }

      const rzpKey = orderRes.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!rzpKey) {
        toast.error("Payment configuration is missing. Please contact support.");
        setProcessingPackId(null);
        return;
      }

      const options = {
        key: rzpKey,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: orderRes.name || "Yuvro AI Credits",
        description:
          orderRes.description || `${pack.name} Pack (${formatNumber(pack.credits)} credits)`,
        order_id: orderRes.order_id,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const payload: VerifyPaymentPayload = {
            gateway_order_id: response.razorpay_order_id,
            gateway_payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          };

          await executeVerification(payload, pack);
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
            // User closed the Razorpay popup.
            // If verification is not already in flight, safely clear processing state.
            setProcessingPackId((current) => {
              if (current) {
                toast.info("Checkout dismissed.");
              }
              return null;
            });
          },
        },
      };

      const RazorpayConstructor = (window as unknown as WindowWithRazorpay).Razorpay;
      if (!RazorpayConstructor) {
        throw new Error("Razorpay SDK is not available.");
      }

      const rzp = new RazorpayConstructor(options as unknown as Record<string, unknown>);

      rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
        const errorDesc = response?.error?.description || "Payment was declined by your bank.";
        toast.error(errorDesc);
        setProcessingPackId(null);
      });

      rzp.open();
    } catch (err: unknown) {
      console.error("Order creation failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to initialize purchase. Please try again.";
      toast.error(message);
      setProcessingPackId(null);
    }
  };

  const executeVerification = async (payload: VerifyPaymentPayload, pack?: CreditPack) => {
    setIsVerifying(true);
    setVerificationPendingPayload(payload);
    setVerificationError(null);

    try {
      const verifyRes = await creditService.verifyPayment(payload);

      if (verifyRes && verifyRes.status === "SUCCESS") {
        toast.success(
          `Payment verified! ${formatNumber(verifyRes.credits_credited || pack?.credits || 0)} credits added to your wallet.`,
        );
        await refreshWallet(false);
        setProcessingPackId(null);
        setVerificationPendingPayload(null);
        closePurchaseModal();
      } else {
        const failureMessage = "Payment verification was rejected by server.";
        setVerificationError(failureMessage);
        toast.error(failureMessage);
        setProcessingPackId(null);
      }
    } catch (verifyErr: unknown) {
      console.error("Verification failed or timed out:", verifyErr);
      const isRejection =
        typeof verifyErr === "object" &&
        verifyErr !== null &&
        "status" in verifyErr &&
        (verifyErr as { status: number }).status === 400;

      if (isRejection) {
        const rejMsg =
          typeof verifyErr === "object" &&
          verifyErr !== null &&
          "message" in verifyErr &&
          typeof (verifyErr as { message: unknown }).message === "string"
            ? (verifyErr as { message: string }).message
            : "Payment signature verification failed.";
        setVerificationError(rejMsg);
        toast.error(rejMsg);
        setProcessingPackId(null);
      } else {
        // Network timeout or ambiguous error
        const ambigMsg =
          "Payment was processed, but verification verification timed out. Don't worry, your payment is secure. Click 'Retry Verification' below.";
        setVerificationError(ambigMsg);
        toast.warning(ambigMsg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetryVerification = async () => {
    if (!verificationPendingPayload || isVerifying) return;
    await executeVerification(verificationPendingPayload);
  };

  const isAnyProcessing = !!processingPackId || isVerifying;

  return (
    <Dialog
      open={isPurchaseModalOpen}
      onOpenChange={(open) => {
        if (!open && !isVerifying) {
          closePurchaseModal();
          setVerificationError(null);
          setVerificationPendingPayload(null);
          setProcessingPackId(null);
        }
      }}
    >
      <DialogContent className="max-w-xl p-6 bg-background border-border shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Coins className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Top Up AI Credits
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Purchase credits to continue using AI Mentor guidance, dynamic suggestions, and code
            review. Credits are tied to your account and never expire.
          </DialogDescription>
        </DialogHeader>

        {/* Ambiguous Verification / Error State */}
        {verificationError && (
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Verification Notice</p>
                <p className="mt-0.5 text-muted-foreground dark:text-amber-300">
                  {verificationError}
                </p>
              </div>
            </div>
            {verificationPendingPayload && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryVerification}
                  disabled={isVerifying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 text-white font-medium text-xs hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {isVerifying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Retry Verification</span>
                </button>
                <button
                  type="button"
                  onClick={() => refreshWallet(false)}
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-muted transition-colors"
                >
                  Refresh Balance
                </button>
              </div>
            )}
          </div>
        )}

        {/* Verification in Progress Banner */}
        {isVerifying && !verificationError && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <span>
              Verifying payment with bank and crediting your wallet... Please keep this window open.
            </span>
          </div>
        )}

        {/* Signup bonus badge info */}
        {wallet && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60 border border-border/50 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {wallet.signup_bonus_granted
                  ? "50,000 Free Signup Bonus already granted to your account"
                  : "Signup bonus available on first registration"}
              </span>
            </div>
            <div className="font-semibold text-foreground">
              Current: {formatNumber(wallet.total_available)} credits
            </div>
          </div>
        )}

        {/* Packs Grid */}
        <div className="py-2">
          {isPacksLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading available credit packs...</p>
            </div>
          ) : packsError ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-xs text-muted-foreground max-w-sm">
                Unable to load credit packages: {packsError}
              </p>
              <button
                type="button"
                onClick={fetchPacks}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : packs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No credit packs are currently available for purchase.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {packs.map((pack) => {
                const isSelected = processingPackId === pack.id;
                const isPro = pack.id.toLowerCase() === "pro";

                return (
                  <div
                    key={pack.id}
                    className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                      isPro
                        ? "border-primary/60 bg-primary/[0.03] shadow-md ring-1 ring-primary/30"
                        : "border-border/70 bg-card hover:border-border hover:shadow-xs"
                    }`}
                  >
                    {isPro && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tracking-wide uppercase shadow-xs">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-1.5 rounded-lg bg-muted border border-border/40">
                          {getPackIcon(pack.id)}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {pack.name}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                          ₹{pack.price_inr}
                        </div>
                        <div className="text-xs font-semibold text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatNumber(pack.credits)} Credits</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-normal mb-4 min-h-[2.5rem]">
                        {pack.description ||
                          "Essential credits for continuous AI assistance and coding practice."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePurchase(pack)}
                      disabled={isAnyProcessing}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPro
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50"
                      }`}
                      aria-label={`Buy ${pack.name} pack for ₹${pack.price_inr}`}
                    >
                      {isSelected ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Buy Pack</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Secure 256-bit encrypted checkout via Razorpay</span>
          </div>
          <button
            type="button"
            onClick={closePurchaseModal}
            disabled={isVerifying}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditPurchaseModal;
