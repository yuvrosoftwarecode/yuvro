import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { creditService, CreditWallet } from "@/services/creditService";
import { toast } from "sonner";
import {
  Coins,
  Loader2,
  Sparkles,
  User,
  Plus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export interface StudentCreditTarget {
  id: string;
  name?: string;
  email: string;
  username?: string;
  role?: string;
}

interface AddAiCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StudentCreditTarget | null;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 5000, 10000, 50000];

export const AddAiCreditsModal: React.FC<AddAiCreditsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(1000);
  const [bucket, setBucket] = useState<"bonus" | "purchased">("bonus");
  const [description, setDescription] = useState<string>("Admin credit top-up");
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch current student wallet whenever modal opens for a user
  useEffect(() => {
    if (isOpen && user?.email) {
      setAmount(1000);
      setBucket("bonus");
      setDescription("Admin credit top-up");
      setErrorMsg(null);
      setLoadingWallet(true);

      creditService
        .getUserWallet(user.email)
        .then((w) => {
          setWallet(w);
        })
        .catch((err) => {
          console.warn("Could not load user wallet preview:", err);
          setWallet(null);
        })
        .finally(() => {
          setLoadingWallet(false);
        });
    } else {
      setWallet(null);
      setErrorMsg(null);
    }
  }, [isOpen, user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMsg("Amount must be a positive integer greater than 0.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await creditService.addAdminCredits({
        email: user.email,
        amount: Math.floor(amount),
        bucket,
        description: description.trim() || "Admin credit top-up",
      });

      toast.success(
        `Added ${amount.toLocaleString()} ${bucket} credits to ${user.name || user.email}`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to add credits. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePresetClick = (presetVal: number) => {
    setAmount(presetVal);
  };

  const currentAvailable = wallet?.total_available ?? 0;
  const projectedBalance = currentAvailable + (amount > 0 ? amount : 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full bg-card border-border/80 shadow-2xl p-0 overflow-hidden rounded-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent p-5 border-b border-border/60">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Coins className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Add AI Credits
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Directly credit a student&apos;s account with auditable ledger tracking.
            </DialogDescription>
          </DialogHeader>

          {/* Student Profile Pill */}
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-background/60 border border-border/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {user.name ? user.name[0].toUpperCase() : <User className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {user.name || user.username || "Student"}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              Student
            </span>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Balance Preview Card */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Current Available</span>
              <span className="text-sm font-semibold font-mono text-foreground">
                {loadingWallet ? (
                  <Loader2 className="h-3 w-3 animate-spin inline text-muted-foreground" />
                ) : (
                  `${currentAvailable.toLocaleString()} credits`
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Projected Balance</span>
              <div className="flex items-center gap-1 font-mono text-sm font-semibold text-amber-500">
                <span>{projectedBalance.toLocaleString()}</span>
                <span className="text-[10px] font-normal text-muted-foreground">credits</span>
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Credit Amount</span>
              <span className="text-[10px] text-muted-foreground">Positive integer</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount || ""}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="e.g. 5000"
                className="w-full h-9 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Coins className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePresetClick(val)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                    amount === val
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-medium"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Bucket selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Credit Bucket</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBucket("bonus")}
                className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                  bucket === "bonus"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Bonus Bucket</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Standard promotional/trial
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBucket("purchased")}
                className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                  bucket === "purchased"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Purchased Bucket</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Permanent paid tier credits
                </span>
              </button>
            </div>
          </div>

          {/* Audit Note / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Audit Note / Reason</span>
              <span className="text-[10px] text-muted-foreground">Ledger description</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Approved course top-up grant"
              className="w-full h-8 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-xs px-3.5 py-1.5 rounded-md border border-border hover:bg-accent text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="text-xs px-4 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Add {amount ? amount.toLocaleString() : 0} Credits
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAiCreditsModal;
