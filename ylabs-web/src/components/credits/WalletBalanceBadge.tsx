import React from "react";
import { Coins, AlertTriangle, RefreshCw, PlusCircle } from "lucide-react";
import { useCreditWallet } from "@/context/CreditWalletContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

interface WalletBalanceBadgeProps {
  className?: string;
  showBreakdownOnHover?: boolean;
  variant?: "badge" | "minimal";
}

export const WalletBalanceBadge: React.FC<WalletBalanceBadgeProps> = ({
  className = "",
  variant = "badge",
}) => {
  const { wallet, isLoading, error, refreshWallet, openPurchaseModal } = useCreditWallet();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await refreshWallet(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  if (isLoading && !wallet) {
    if (variant === "minimal") {
      return (
        <div className={`flex items-baseline gap-1.5 ${className}`}>
          <span className="text-muted-foreground">AI Credits</span>
          <Skeleton className="h-3 w-12 rounded inline-block" />
        </div>
      );
    }
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/40 ${className}`}
        aria-label="Loading credit balance"
        role="status"
      >
        <Coins className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
        <Skeleton className="h-3.5 w-12 rounded" />
      </div>
    );
  }

  if (error && !wallet) {
    if (variant === "minimal") {
      return (
        <button
          type="button"
          onClick={handleRefresh}
          className={`flex items-baseline gap-1 text-red-500 hover:text-red-600 transition-colors ${className}`}
          title={`Error: ${error}. Click to retry.`}
          aria-label={`Error loading credits: ${error}. Click to retry.`}
        >
          <span className="text-muted-foreground">AI Credits</span>
          <span className="font-semibold">Retry</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleRefresh}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors ${className}`}
        title={`Error: ${error}. Click to retry.`}
        aria-label={`Error loading credits: ${error}. Click to retry.`}
      >
        <AlertTriangle className="w-3 h-3 text-red-500" />
        <span>Retry</span>
      </button>
    );
  }

  const hasDeficit = (wallet?.uncollected_deficit ?? 0) > 0;
  const isFlagged =
    wallet?.reconciliation_status === "deficit_pending_reconciliation" ||
    (Boolean(wallet?.reconciliation_status) &&
      wallet?.reconciliation_status !== "settled" &&
      wallet?.reconciliation_status !== "ok");
  const availableCredits = wallet?.total_available ?? 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {variant === "minimal" ? (
          <button
            type="button"
            className={`group flex items-baseline gap-1.5 cursor-pointer outline-none transition-colors ${className}`}
            aria-label={
              hasDeficit
                ? `Account has credit deficit: ${formatNumber(wallet?.uncollected_deficit || 0)} credits. Click for details.`
                : `AI Credits: ${formatNumber(availableCredits)} available. Click for breakdown and purchase.`
            }
          >
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
              AI Credits
            </span>
            <span
              className={`font-semibold tabular-nums ${
                hasDeficit
                  ? "text-amber-600 dark:text-amber-400"
                  : isFlagged
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              }`}
            >
              {hasDeficit ? "Deficit" : isFlagged ? "Alert" : formatNumber(availableCredits)}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              hasDeficit || isFlagged
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                : "bg-muted/70 hover:bg-muted border-border/50 text-foreground"
            } ${className}`}
            aria-label={
              hasDeficit
                ? `Account has credit deficit: ${formatNumber(wallet?.uncollected_deficit || 0)} credits. Click for details.`
                : `AI Credits: ${formatNumber(availableCredits)} available. Click for breakdown and purchase.`
            }
          >
            {hasDeficit || isFlagged ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
            )}

            <span className="font-semibold tabular-nums">
              {hasDeficit ? "Deficit" : isFlagged ? "Status Alert" : formatNumber(availableCredits)}
            </span>

            <span className="text-[10px] text-muted-foreground hidden sm:inline">credits</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 p-3 text-xs shadow-lg bg-popover text-popover-foreground border-border"
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>AI Credits</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh balance"
            aria-label="Refresh credit balance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {hasDeficit && (
          <div className="mb-2.5 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1 font-semibold mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Uncollected Deficit</span>
            </div>
            Your account has an uncollected deficit of{" "}
            <span className="font-semibold">{formatNumber(wallet?.uncollected_deficit || 0)}</span>{" "}
            credits pending administrative review. AI generation is suspended. Purchasing credits
            does not automatically clear past deficits. Please contact support to resolve.
          </div>
        )}

        {isFlagged && !hasDeficit && (
          <div className="mb-2.5 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1 font-semibold mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Reconciliation Alert</span>
            </div>
            Account status:{" "}
            <span className="font-semibold capitalize">{wallet?.reconciliation_status}</span>. AI
            requests require administrative review. Please contact support.
          </div>
        )}

        <div className="space-y-1.5 py-1">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span>Available Balance</span>
            <span
              className={`tabular-nums ${
                availableCredits <= 0 ? "text-amber-600 dark:text-amber-400" : "text-primary"
              }`}
            >
              {formatNumber(availableCredits)}
            </span>
          </div>

          <div className="pt-1.5 space-y-1 border-t border-border/40 text-[11px] text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Bonus Credits</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatNumber(wallet?.bonus_balance ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Purchased Credits</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatNumber(wallet?.purchased_balance ?? 0)}
              </span>
            </div>
            {(wallet?.total_reserved ?? 0) > 0 && (
              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                <span>Reserved (In-Flight)</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(wallet?.total_reserved ?? 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-border/60 space-y-1.5">
          {hasDeficit ? (
            <a
              href="mailto:support@yuvro.com?subject=Credit%20Deficit%20Reconciliation%20Request"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-amber-600 text-white font-medium text-xs hover:bg-amber-700 transition-colors shadow-xs"
            >
              <span>Contact Support to Review</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openPurchaseModal();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Top Up Credits</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WalletBalanceBadge;
