import React from "react";
import { AlertTriangle, RefreshCw, XCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  inline?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "An error occurred while loading this section. Please try again.",
  onRetry,
  inline = false,
  className = "",
}) => {
  if (inline) {
    return (
      <div className={`flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-[13px]">{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1 text-[12px] font-medium text-red-300 hover:bg-red-500/30 transition"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-12 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 mb-4">
        <XCircle className="h-6 w-6" />
      </div>
      <h3 className="text-[15px] font-medium text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-neutral-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-[12px] font-medium text-red-300 transition hover:bg-red-500/30"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
