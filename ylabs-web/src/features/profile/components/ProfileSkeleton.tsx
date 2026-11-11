import React from "react";

export const HeaderSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Standalone White Header Card */}
      <div className="rounded-[12px] border border-line bg-card overflow-hidden shadow-sm">
        {/* Banner Skeleton */}
        <div className="h-44 sm:h-52 w-full bg-line/30 animate-pulse" />

        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-12 sm:-mt-14 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar circle skeleton */}
              <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full border-4 border-card bg-line/60 animate-pulse" />

              {/* Profile Info skeleton */}
              <div className="space-y-2.5 min-w-0 pb-1">
                <div className="h-6 w-48 rounded-md bg-line/70 animate-pulse" />
                <div className="h-4 w-64 sm:w-80 rounded bg-line/40 animate-pulse" />
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="h-3.5 w-28 rounded bg-line/40 animate-pulse" />
                  <div className="h-3.5 w-24 rounded bg-line/40 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Action Links skeleton */}
            <div className="flex items-center gap-5 self-start sm:self-end shrink-0 pb-2">
              <div className="h-4 w-16 rounded bg-line/40 animate-pulse" />
              <div className="h-4 w-16 rounded bg-line/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Underline Tabs skeleton */}
      <div className="flex items-center gap-8 border-b border-line text-sm px-1 pt-2">
        <div className="h-8 w-14 border-b-2 border-primary/40 animate-pulse" />
        <div className="h-8 w-24 animate-pulse opacity-40" />
        <div className="h-8 w-16 animate-pulse opacity-40" />
      </div>
    </div>
  );
};

export const ProfileTabSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-6 min-[860px]:grid-cols-[minmax(0,1fr)_300px] items-start">
      {/* Main Column */}
      <div className="space-y-6 min-w-0">
        {/* About Card */}
        <div className="rounded-[12px] border border-line bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded bg-line/60 animate-pulse" />
            <div className="h-4 w-10 rounded bg-line/40 animate-pulse" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full rounded bg-line/40 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-line/40 animate-pulse" />
            <div className="h-3.5 w-2/3 rounded bg-line/40 animate-pulse" />
          </div>
        </div>

        {/* Work Card */}
        <div className="rounded-[12px] border border-line bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded bg-line/60 animate-pulse" />
            <div className="h-4 w-12 rounded bg-line/40 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-line/50 shrink-0 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-40 rounded bg-line/60 animate-pulse" />
                  <div className="h-3 w-52 rounded bg-line/40 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-line/30 animate-pulse" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 w-16 rounded-md bg-line/30 animate-pulse" />
                    <div className="h-5 w-20 rounded-md bg-line/30 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Card */}
        <div className="rounded-[12px] border border-line bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-20 rounded bg-line/60 animate-pulse" />
            <div className="h-4 w-12 rounded bg-line/40 animate-pulse" />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-line/50 shrink-0 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 rounded bg-line/60 animate-pulse" />
              <div className="h-3 w-36 rounded bg-line/40 animate-pulse" />
              <div className="h-3 w-24 rounded bg-line/30 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Education Card */}
        <div className="rounded-[12px] border border-line bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-20 rounded bg-line/60 animate-pulse" />
            <div className="h-4 w-12 rounded bg-line/40 animate-pulse" />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-line/50 shrink-0 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-44 rounded bg-line/60 animate-pulse" />
              <div className="h-3 w-40 rounded bg-line/40 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skills Card */}
        <div className="rounded-[12px] border border-line bg-card p-6 shadow-sm space-y-5">
          <div className="h-5 w-16 rounded bg-line/60 animate-pulse" />
          <div className="h-3 w-32 rounded bg-line/40 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-line p-3.5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 rounded bg-line/60 animate-pulse" />
                  <div className="h-4 w-16 rounded-full bg-line/40 animate-pulse" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-line/40 animate-pulse" />
                <div className="h-3 w-24 rounded bg-line/30 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Resume Card */}
        <div className="rounded-[12px] border border-line bg-card p-6 shadow-sm space-y-4">
          <div className="h-5 w-16 rounded bg-line/60 animate-pulse" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-line/50 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-line/60 animate-pulse" />
                <div className="h-3 w-16 rounded bg-line/40 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-3.5 w-14 rounded bg-line/40 animate-pulse" />
              <div className="h-3.5 w-14 rounded bg-line/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Rail (300px) */}
      <aside className="w-full min-[860px]:w-[300px] shrink-0 space-y-6">
        {/* Card 1: Public profile */}
        <div className="rounded-[12px] border border-line bg-card p-5 shadow-sm space-y-4">
          <div className="h-4 w-24 rounded bg-line/60 animate-pulse" />
          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center">
              <div className="h-3 w-32 rounded bg-line/40 animate-pulse" />
              <div className="h-3 w-8 rounded bg-line/40 animate-pulse" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3 w-12 rounded bg-line/30 animate-pulse" />
              <div className="h-3 w-32 rounded bg-line/50 animate-pulse" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3 w-12 rounded bg-line/30 animate-pulse" />
              <div className="h-3 w-20 rounded bg-line/50 animate-pulse" />
            </div>
          </div>
          <div className="pt-2 border-t border-line/60 flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-line/50 animate-pulse" />
            <div className="h-3 w-20 rounded bg-line/40 animate-pulse" />
          </div>
        </div>

        {/* Card 2: Activity Snapshot */}
        <div className="rounded-[12px] border border-line bg-card p-5 shadow-sm space-y-4">
          <div className="h-4 w-16 rounded bg-line/60 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-6 w-10 rounded bg-line/60 animate-pulse" />
                <div className="h-3 w-16 rounded bg-line/40 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="pt-1">
            <div className="h-8 w-full rounded-lg bg-line/30 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Profile Strength */}
        <div className="rounded-[12px] border border-line bg-card p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 rounded bg-line/60 animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-line/40 animate-pulse" />
          <div className="space-y-2.5 pt-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="h-3 w-32 rounded bg-line/40 animate-pulse" />
                <div className="h-3 w-8 rounded bg-line/30 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export const PerformanceTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 4 Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[12px] border border-line bg-card p-5 space-y-2 shadow-sm">
            <div className="h-8 w-12 rounded bg-line/60 animate-pulse" />
            <div className="h-4 w-28 rounded bg-line/50 animate-pulse" />
            <div className="h-3 w-20 rounded bg-line/30 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Contributions Heatmap Card */}
      <div className="rounded-[12px] border border-line bg-card p-6 space-y-4 shadow-sm">
        <div className="h-5 w-28 rounded bg-line/60 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-4 w-48 rounded bg-line/40 animate-pulse" />
          <div className="flex gap-4">
            <div className="h-3 w-20 rounded bg-line/40 animate-pulse" />
            <div className="h-3 w-20 rounded bg-line/40 animate-pulse" />
          </div>
        </div>
        <div className="h-28 w-full rounded-lg bg-line/20 animate-pulse" />
      </div>

      {/* 2-column row: Mock interview + Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Mock Interview */}
        <div className="rounded-[12px] border border-line bg-card p-6 space-y-4 shadow-sm">
          <div className="h-5 w-48 rounded bg-line/60 animate-pulse" />
          <div className="h-8 w-16 rounded bg-line/60 animate-pulse" />
          <div className="h-20 w-full rounded-lg bg-line/20 animate-pulse" />
          <div className="space-y-2 pt-2 border-t border-line/60">
            <div className="h-3.5 w-full rounded bg-line/30 animate-pulse" />
            <div className="h-3.5 w-full rounded bg-line/30 animate-pulse" />
            <div className="h-3.5 w-full rounded bg-line/30 animate-pulse" />
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-[12px] border border-line bg-card p-6 space-y-4 shadow-sm">
          <div className="h-5 w-28 rounded bg-line/60 animate-pulse" />
          <div className="space-y-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-7 w-8 rounded-md bg-line/50 shrink-0 animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-28 rounded bg-line/60 animate-pulse" />
                  <div className="h-3 w-48 rounded bg-line/30 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-[12px] border border-line bg-card p-6 space-y-4 shadow-sm">
        <div className="h-5 w-32 rounded bg-line/60 animate-pulse" />
        <div className="flex gap-6 border-b border-line pb-2">
          <div className="h-4 w-12 rounded bg-line/50 animate-pulse" />
          <div className="h-4 w-14 rounded bg-line/30 animate-pulse" />
          <div className="h-4 w-12 rounded bg-line/30 animate-pulse" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="space-y-1">
                <div className="h-4 w-44 rounded bg-line/50 animate-pulse" />
                <div className="h-3 w-24 rounded bg-line/30 animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-line/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SettingsTabSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start">
      {/* Left nav list */}
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-full rounded-md bg-line/40 animate-pulse" />
        ))}
      </div>

      {/* Right form card */}
      <div className="rounded-[12px] border border-line bg-card p-6 space-y-5 shadow-sm">
        <div className="h-5 w-40 rounded bg-line/60 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-14 rounded-lg bg-line/20 animate-pulse" />
          <div className="h-14 rounded-lg bg-line/20 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-14 rounded-lg bg-line/20 animate-pulse" />
          <div className="h-14 rounded-lg bg-line/20 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-14 rounded-lg bg-line/20 animate-pulse" />
          <div className="h-14 rounded-lg bg-line/20 animate-pulse" />
        </div>
        <div className="h-24 rounded-lg bg-line/20 animate-pulse" />
      </div>
    </div>
  );
};

export const ProfilePageSkeleton: React.FC<{ activeTab?: "profile" | "performance" | "settings" }> = ({
  activeTab = "profile",
}) => {
  return (
    <div className="yuvro-profile-theme min-h-screen bg-bg text-ink antialiased">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-8 space-y-6">
        <HeaderSkeleton />
        {activeTab === "profile" && <ProfileTabSkeleton />}
        {activeTab === "performance" && <PerformanceTabSkeleton />}
        {activeTab === "settings" && <SettingsTabSkeleton />}
      </div>
    </div>
  );
};
