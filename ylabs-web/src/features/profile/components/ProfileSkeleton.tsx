import React from "react";

export const IdentityPanelSkeleton: React.FC = () => {
  return (
    <aside className="w-full lg:w-[296px] max-w-full min-w-0 box-border text-left flex flex-col items-stretch space-y-5 pt-1">
      {/* Avatar skeleton (128px circle) */}
      <div className="flex flex-col items-start w-full min-w-0 box-border">
        <div className="h-32 w-32 rounded-full bg-line/60 animate-pulse border-2 border-line/40 shrink-0" />
        <div className="mt-2.5 flex items-center gap-3 text-xs w-full min-w-0">
          <div className="h-3.5 w-20 rounded bg-line/40 animate-pulse" />
          <div className="h-3.5 w-20 rounded bg-line/30 animate-pulse" />
        </div>
      </div>

      {/* Identity details (Name, handle, headline) */}
      <div className="text-left space-y-2 w-full min-w-0 box-border">
        <div className="h-7 w-48 rounded bg-line/70 animate-pulse" />
        <div className="h-4 w-28 rounded bg-line/40 animate-pulse" />
        <div className="h-4 w-56 rounded bg-line/30 animate-pulse" />
      </div>

      {/* Edit profile button */}
      <div className="h-9 w-full rounded-input bg-line/40 animate-pulse" />

      {/* Details list skeleton */}
      <div className="space-y-2.5 text-xs pt-2 border-t border-line w-full min-w-0 box-border">
        {["Location", "Website", "Email", "GitHub", "LinkedIn", "Joined"].map((label, idx) => (
          <div
            key={label}
            className="grid gap-x-3 text-left w-full min-w-0"
            style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
          >
            <span className="text-muted text-xs">{label}</span>
            <div
              className={`h-4 rounded bg-line/40 animate-pulse ${
                idx % 2 === 0 ? "w-36" : "w-44"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Public Profile Link row skeleton */}
      <div className="p-3 rounded-card bg-card border border-line space-y-2 w-full min-w-0 box-border">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3.5 w-40 rounded bg-line/40 animate-pulse" />
          <div className="h-3.5 w-10 rounded bg-line/50 animate-pulse" />
        </div>
        <div className="h-3 w-28 rounded bg-line/30 animate-pulse" />
      </div>

      {/* Hairline Divider */}
      <div className="border-t border-line my-1 w-full" />

      {/* Stats grid skeleton (2x2) */}
      <div className="space-y-2 w-full min-w-0 box-border">
        <div className="grid grid-cols-2 gap-2 text-left w-full min-w-0 box-border">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-card bg-card border border-line flex flex-col justify-between min-h-[68px] min-w-0 space-y-2"
            >
              <div className="h-6 w-8 rounded bg-line/60 animate-pulse" />
              <div className="h-3 w-20 rounded bg-line/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Profile strength card skeleton */}
      <div className="p-3.5 rounded-card bg-card border border-line space-y-3 w-full min-w-0 box-border">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-line/50 animate-pulse" />
          <div className="h-3.5 w-8 rounded bg-line/40 animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-line/40 animate-pulse" />
        <div className="space-y-2 pt-1 border-t border-line/60">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-line/30 animate-pulse" />
              <div className="h-3 w-8 rounded bg-line/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export const OverviewTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 min-w-0 animate-fade-in">
      {/* 1. Contribution Activity Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 rounded bg-line/60 animate-pulse" />
          <div className="h-4 w-28 rounded bg-line/40 animate-pulse" />
        </div>
        {/* Heatmap grid mockup */}
        <div className="h-28 rounded bg-line/20 animate-pulse flex items-center justify-center p-3">
          <div className="grid grid-flow-col grid-rows-7 gap-1 w-full h-full opacity-60">
            {Array.from({ length: 52 * 7 }).map((_, i) => (
              <div key={i} className="rounded-[2px] bg-line/40 w-full h-full" />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <div className="h-3 w-8 rounded bg-line/30 animate-pulse" />
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className="h-2.5 w-2.5 rounded-[2px] bg-line/40" />
          ))}
          <div className="h-3 w-8 rounded bg-line/30 animate-pulse" />
        </div>
      </div>

      {/* 2. About Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-3">
        <div className="h-5 w-20 rounded bg-line/60 animate-pulse" />
        <div className="space-y-2 py-2">
          <div className="h-4 w-full rounded bg-line/40 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-line/40 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-line/30 animate-pulse" />
        </div>
      </div>

      {/* 3. Skills Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-4">
        <div className="h-3.5 w-24 rounded bg-line/40 animate-pulse" />
        <div className="h-5 w-16 rounded bg-line/60 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <div className="h-3.5 w-40 rounded bg-line/40 animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-28 rounded-input bg-line/40 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-3 lg:border-l lg:border-line lg:pl-6">
            <div className="h-3.5 w-32 rounded bg-line/40 animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-16 rounded bg-line/30 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Projects Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3.5 w-20 rounded bg-line/40 animate-pulse" />
            <div className="h-5 w-24 rounded bg-line/60 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-input bg-line/40 animate-pulse" />
        </div>
        <div className="p-4 rounded-card border border-line space-y-2.5">
          <div className="h-4 w-48 rounded bg-line/60 animate-pulse" />
          <div className="h-3.5 w-32 rounded bg-line/40 animate-pulse" />
          <div className="h-3.5 w-full rounded bg-line/30 animate-pulse" />
        </div>
      </div>

      {/* 5. Work Experience Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3.5 w-16 rounded bg-line/40 animate-pulse" />
            <div className="h-5 w-36 rounded bg-line/60 animate-pulse" />
          </div>
          <div className="h-4 w-10 rounded bg-line/40 animate-pulse" />
        </div>
        <div className="p-4 rounded-card border border-line space-y-2.5">
          <div className="h-4 w-40 rounded bg-line/60 animate-pulse" />
          <div className="h-3.5 w-28 rounded bg-line/40 animate-pulse" />
        </div>
      </div>

      {/* 6. Education Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3.5 w-20 rounded bg-line/40 animate-pulse" />
            <div className="h-5 w-24 rounded bg-line/60 animate-pulse" />
          </div>
          <div className="h-4 w-10 rounded bg-line/40 animate-pulse" />
        </div>
        <div className="p-4 rounded-card border border-line space-y-2.5">
          <div className="h-4 w-44 rounded bg-line/60 animate-pulse" />
          <div className="h-3.5 w-36 rounded bg-line/40 animate-pulse" />
        </div>
      </div>

      {/* 7. Resume Card */}
      <div className="p-4 sm:p-5 rounded-card bg-card border border-line space-y-4">
        <div className="space-y-1">
          <div className="h-3.5 w-20 rounded bg-line/40 animate-pulse" />
          <div className="h-5 w-24 rounded bg-line/60 animate-pulse" />
        </div>
        <div className="p-4 rounded-card border border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-input bg-line/50 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 rounded bg-line/60 animate-pulse" />
              <div className="h-3 w-24 rounded bg-line/30 animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-20 rounded-input bg-line/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export const PerformanceTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-fade-in min-w-0">
      {/* 4 Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-card bg-card border border-line p-4 space-y-2">
            <div className="h-6 w-12 rounded bg-line/60 animate-pulse" />
            <div className="h-3.5 w-24 rounded bg-line/40 animate-pulse" />
          </div>
        ))}
      </div>
      {/* Heatmap Card */}
      <div className="h-48 rounded-card bg-card border border-line p-5 space-y-3">
        <div className="h-5 w-40 rounded bg-line/60 animate-pulse" />
        <div className="h-28 rounded bg-line/20 animate-pulse" />
      </div>
      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 rounded-card bg-card border border-line p-5 space-y-3">
          <div className="h-5 w-48 rounded bg-line/60 animate-pulse" />
          <div className="h-48 rounded bg-line/20 animate-pulse" />
        </div>
        <div className="h-64 rounded-card bg-card border border-line p-5 space-y-3">
          <div className="h-5 w-40 rounded bg-line/60 animate-pulse" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 rounded bg-line/30 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConnectionsTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-fade-in min-w-0">
      <div className="space-y-1">
        <div className="h-5 w-44 rounded bg-line/60 animate-pulse" />
        <div className="h-3.5 w-80 rounded bg-line/40 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 rounded-card bg-card border border-line space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 rounded bg-line/60 animate-pulse" />
              <div className="h-4 w-16 rounded bg-line/40 animate-pulse" />
            </div>
            <div className="h-3.5 w-4/5 rounded bg-line/30 animate-pulse" />
            <div className="pt-2 border-t border-line">
              <div className="h-9 w-full rounded-input bg-line/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SecurityTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-fade-in min-w-0">
      <div className="p-5 rounded-card bg-card border border-line space-y-4">
        <div className="h-5 w-36 rounded bg-line/60 animate-pulse" />
        <div className="space-y-3 max-w-md pt-2">
          <div className="h-9 w-full rounded-input bg-line/40 animate-pulse" />
          <div className="h-9 w-full rounded-input bg-line/40 animate-pulse" />
          <div className="h-9 w-32 rounded-input bg-line/50 animate-pulse" />
        </div>
      </div>
      <div className="p-5 rounded-card bg-card border border-line space-y-3">
        <div className="h-5 w-48 rounded bg-line/60 animate-pulse" />
        <div className="h-16 rounded bg-line/30 animate-pulse" />
      </div>
    </div>
  );
};

export const ProfilePageSkeleton: React.FC<{ activeTab?: string }> = ({
  activeTab = "overview",
}) => {
  const tabName = activeTab.toLowerCase();

  return (
    <div className="yuvro-profile-theme min-h-screen bg-bg text-ink antialiased selection:bg-primary-subtle selection:text-primary">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 py-6">
        {/* Desktop 2-column layout (296px left, 1fr right) / Mobile stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-[296px_minmax(0,1fr)] gap-8 items-start w-full min-w-0">
          {/* Left Sticky Identity Panel Skeleton */}
          <div
            className="w-full lg:w-[calc(296px+16px)] max-w-full min-w-0 box-border lg:sticky overflow-hidden lg:overflow-y-auto lg:overflow-x-hidden no-scrollbar"
            style={{
              top: "calc(var(--nav-h, 56px) + 16px)",
              maxHeight: "calc(100vh - var(--nav-h, 56px) - 32px)",
              padding: "8px",
              margin: "-8px",
              scrollPadding: "8px",
              scrollbarWidth: "none",
              boxSizing: "border-box",
            }}
          >
            <IdentityPanelSkeleton />
          </div>

          {/* Right Main Column Skeleton */}
          <div className="w-full min-w-0 space-y-5">
            {/* Sticky Underline Tabs Bar Skeleton */}
            <div
              className="sticky bg-bg z-30 border-b border-line pt-3 pb-0"
              style={{ top: "var(--nav-h, 56px)" }}
            >
              <div className="flex items-center gap-6 text-sm font-medium">
                {["Overview", "Performance", "Connections", "Security"].map((t) => {
                  const isActive =
                    (tabName === "overview" && t === "Overview") ||
                    (tabName === "performance" && t === "Performance") ||
                    (tabName === "connections" && t === "Connections") ||
                    (tabName === "security" && t === "Security");
                  return (
                    <div
                      key={t}
                      className={`relative pb-3 whitespace-nowrap ${
                        isActive
                          ? "border-b-2 border-primary -mb-px"
                          : ""
                      }`}
                    >
                      <div
                        className={`h-4 rounded animate-pulse ${
                          isActive ? "w-16 bg-line/80" : "w-16 bg-line/40"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab-specific Content Skeleton */}
            <main>
              {tabName === "performance" ? (
                <PerformanceTabSkeleton />
              ) : tabName === "connections" ? (
                <ConnectionsTabSkeleton />
              ) : tabName === "security" ? (
                <SecurityTabSkeleton />
              ) : (
                <OverviewTabSkeleton />
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
