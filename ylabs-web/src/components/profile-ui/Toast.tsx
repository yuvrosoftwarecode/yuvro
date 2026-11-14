import React from "react";
import { useToastStore } from "@/lib/toastStore";
import { clsx } from "clsx";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            role={isError ? "alert" : "status"}
            className={clsx(
              "pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-input border shadow-lg text-sm transition-all duration-200 animate-fadeIn",
              isSuccess && "bg-card border-success/30 text-ink dark:bg-[#1a2332]",
              isError && "bg-card border-danger/30 text-ink dark:bg-[#251b22]",
              !isSuccess && !isError && "bg-card border-line text-ink"
            )}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && (
                <span className="font-semibold text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success-subtle text-success shrink-0">
                  Done
                </span>
              )}
              {isError && (
                <span className="font-semibold text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-danger-subtle text-danger shrink-0">
                  Error
                </span>
              )}
              {!isSuccess && !isError && (
                <span className="font-semibold text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-subtle text-primary shrink-0">
                  Notice
                </span>
              )}
              <span className="font-medium text-ink">{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              className="text-muted hover:text-ink px-1.5 py-0.5 rounded text-xs font-semibold leading-none transition-colors"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
