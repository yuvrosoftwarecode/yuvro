import React from "react";

export interface SkeletonProps {
  type?: "cards" | "table" | "metrics" | "page";
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({
  type = "cards",
  count = 6,
  className = "",
}) => {
  if (type === "metrics") {
    return (
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="h-8 w-8 rounded-lg bg-white/10" />
            <div className="mt-6 h-3 w-24 rounded bg-white/10" />
            <div className="mt-2 h-8 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/10" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-white/10" />
                <div className="h-3 w-24 rounded bg-white/5" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "page") {
    return (
      <div className={`min-h-screen animate-pulse p-10 bg-[#0a0a0b] ${className}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-white/10" />
            <div className="h-4 w-64 rounded bg-white/5" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-white/10" />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="h-5 w-32 rounded bg-white/10" />
              <div className="mt-3 h-4 w-48 rounded bg-white/5" />
              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="h-12 rounded bg-white/5" />
                <div className="h-12 rounded bg-white/5" />
                <div className="h-12 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-5 w-16 rounded-full bg-white/10" />
          </div>
          <div className="mt-4 h-6 w-3/4 rounded bg-white/10" />
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="h-10 rounded bg-white/5" />
            <div className="h-10 rounded bg-white/5" />
            <div className="h-10 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
