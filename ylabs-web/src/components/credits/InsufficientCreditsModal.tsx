import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreditWallet } from "@/context/CreditWalletContext";
import { Coins, AlertCircle, ShoppingCart } from "lucide-react";

export const InsufficientCreditsModal: React.FC = () => {
  const { isInsufficientModalOpen, closeInsufficientModal, insufficientInfo, openPurchaseModal } =
    useCreditWallet();

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const handleOpenPurchase = () => {
    closeInsufficientModal();
    openPurchaseModal();
  };

  const hasAvailable =
    typeof insufficientInfo?.available === "number" && !isNaN(insufficientInfo.available);
  const hasRequired =
    typeof insufficientInfo?.required === "number" && !isNaN(insufficientInfo.required);
  const isDeficit =
    Boolean(insufficientInfo?.message?.toLowerCase().includes("deficit")) ||
    Boolean(insufficientInfo?.message?.toLowerCase().includes("reconciliation"));

  return (
    <Dialog
      open={isInsufficientModalOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeInsufficientModal();
        }
      }}
    >
      <DialogContent className="max-w-md p-6 bg-background border-border shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              {isDeficit ? (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              ) : (
                <Coins className="w-5 h-5" />
              )}
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight">
              {isDeficit ? "Deficit Pending Review" : "Insufficient AI Credits"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {insufficientInfo?.message ||
              "You do not have enough credits to generate or continue this AI Mentor session. Top up your wallet to resume."}
          </DialogDescription>
          {isDeficit && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 mt-2">
              Note: Purchasing new credit packs will not automatically unblock AI generation while
              an outstanding deficit requires administrative review. Please contact support.
            </p>
          )}
        </DialogHeader>

        {/* Available vs Required Breakdown (only if provided and valid) */}
        {(hasAvailable || hasRequired) && (
          <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Credit Breakdown</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              {hasAvailable && (
                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                  <p className="text-muted-foreground">Available Credits</p>
                  <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                    {formatNumber(insufficientInfo?.available || 0)}
                  </p>
                </div>
              )}
              {hasRequired && (
                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                  <p className="text-muted-foreground">Estimated Required</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                    {formatNumber(insufficientInfo?.required || 0)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeInsufficientModal}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          {isDeficit ? (
            <a
              href="mailto:support@yuvro.com?subject=AI%20Credits%20Deficit%20Reconciliation"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              <span>Contact Support</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleOpenPurchase}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Top Up Credits</span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsufficientCreditsModal;
