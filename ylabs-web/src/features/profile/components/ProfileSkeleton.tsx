import React from "react";

export const IdentityPanelSkeleton: React.FC = () => {
  return (
    <div className="w-full lg:w-[296px] space-y-4">
      {/* Avatar skeleton */}
      <div className="h-32 w-32 rounded-full bg-line/60 animate-pulse" />
      <div className="h-4 w-24 rounded bg-line/40 animate-pulse" />

      {/* Name and headline */}
      <div className="space-y-2 pt-2">
        <div className="h-6 w-44 rounded bg-line/70 animate-pulse" />
        <div className="h-4 w-28 rounded bg-line/40 animate-pulse" />
        <div className="h-4 w-56 rounded bg-line/40 animate-pulse" />
      </div>

      {/* Button skeleton */}
      <div className="h-9 w-full rounded-input bg-line/50 animate-pulse" />

      {/* Details list skeleton */}
      <div className="space-y-2 pt-3 border-t border-line">
        <div className="h-3.5 w-full rounded bg-line/30 animate-pulse" />
        <div className="h-3.5 w-4/5 rounded bg-line/30 animate-pulse" />
        <div className="h-3.5 w-3/4 rounded bg-line/30 animate-pulse" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <div className="h-16 rounded-card bg-line/30 animate-pulse" />
        <div className="h-16 rounded-card bg-line/30 animate-pulse" />
        <div className="h-16 rounded-card bg-line/30 animate-pulse" />
        <div className="h-16 rounded-card bg-line/30 animate-pulse" />
      </div>
    </div>
  );
};

export const PerformanceTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-card bg-card border border-line p-4 animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-card bg-card border border-line p-5 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-card bg-card border border-line p-5 animate-pulse" />
        <div className="h-64 rounded-card bg-card border border-line p-5 animate-pulse" />
      </div>
    </div>
  );
};

export const ProfilePageSkeleton: React.FC<{ activeTab?: string }> = ({
  activeTab = "overview",
}) => {
  return (
    <div className="yuvro-profile-theme min-h-screen bg-bg text-ink antialiased">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[296px_minmax(0,1fr)] gap-8 items-start">
          <IdentityPanelSkeleton />
          <div className="space-y-5 min-w-0">
            {/* Tabs skeleton */}
            <div className="flex items-center gap-6 border-b border-line pb-3">
              <div className="h-5 w-16 rounded bg-line/60 animate-pulse" />
              <div className="h-5 w-24 rounded bg-line/40 animate-pulse" />
              <div className="h-5 w-20 rounded bg-line/40 animate-pulse" />
              <div className="h-5 w-16 rounded bg-line/40 animate-pulse" />
            </div>

            {/* Cards skeleton */}
            <div className="space-y-4">
              <div className="h-32 rounded-card bg-card border border-line p-4 animate-pulse" />
              <div className="h-40 rounded-card bg-card border border-line p-4 animate-pulse" />
              <div className="h-48 rounded-card bg-card border border-line p-4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
