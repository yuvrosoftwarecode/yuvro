import React from "react";
import { useToastStore } from "@/lib/toastStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
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
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" aria-hidden="true" />
              )}
              {isError && (
                <AlertCircle className="h-5 w-5 text-danger shrink-0" aria-hidden="true" />
              )}
              {!isSuccess && !isError && (
                <Info className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              className="text-muted hover:text-ink p-1 rounded-md transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
