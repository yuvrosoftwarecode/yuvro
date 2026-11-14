import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "danger",
  loading = false,
}) => {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        {/* Overlay: rgba(16,24,40,.5) with NO backdrop-filter (dark mode rgba(0,0,0,.6)) */}
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-[rgba(16,24,40,0.5)] dark:bg-[rgba(0,0,0,0.6)] animate-in fade-in"
          style={{
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
        />

        {/* Panel: bg var(--card, #fff), border 1px var(--line), radius 10px, padding 20px */}
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-[10px] border border-line bg-card p-5 shadow-xl animate-in zoom-in-95 fade-in text-left"
          style={{
            backgroundColor: "var(--color-card, var(--card, #ffffff))",
            borderColor: "var(--color-line, var(--line, #e4e7ec))",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          {/* Title color var(--ink, #101828) */}
          <AlertDialogPrimitive.Title
            className="text-base font-semibold text-ink"
            style={{ color: "var(--color-ink, var(--ink, #101828))" }}
          >
            {title}
          </AlertDialogPrimitive.Title>

          {/* Description color var(--sub, #344054), 14px (not muted, not light gray) */}
          <AlertDialogPrimitive.Description
            className="mt-2 text-[14px] leading-relaxed text-sub"
            style={{
              color: "var(--color-sub, var(--sub, #344054))",
              fontSize: "14px",
              lineHeight: 1.55,
            }}
          >
            {description}
          </AlertDialogPrimitive.Description>

          {/* Footer: Cancel (secondary) and confirm (primary or danger by prop), both 36px high, min-width 88px */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <AlertDialogPrimitive.Cancel asChild>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                className="h-9 min-w-[88px] px-4 text-sm font-medium cursor-pointer"
                style={{ height: "36px", minWidth: "88px" }}
              >
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              type="button"
              variant={variant === "danger" ? "danger" : "primary"}
              disabled={loading}
              loading={loading}
              className="h-9 min-w-[88px] px-4 text-sm font-medium cursor-pointer"
              style={{ height: "36px", minWidth: "88px" }}
              onClick={async (e) => {
                e.preventDefault();
                await onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
};
