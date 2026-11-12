import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { Button } from "@/components/profile-ui/Button";
import { ActivityItem, ActivityType } from "../types";
import { formatRelativeTime } from "@/lib/dateHelpers";

interface RecentActivityListProps {
  activities: ActivityItem[];
}

const TABS: { type: ActivityType; label: string }[] = [
  { type: "Labs", label: "Labs" },
  { type: "Sprints", label: "Sprints" },
  { type: "Tickets", label: "Tickets" },
  { type: "Interviews", label: "Interviews" },
];

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
}) => {
  const [activeTab, setActiveTab] = useState<ActivityType>("Labs");

  const filtered = activities.filter((a) => a.type === activeTab);

  const getResultBadgeClass = (result: string, variant?: string) => {
    const lower = result.toLowerCase();
    if (variant === "danger" || lower.includes("failed")) {
      return "bg-danger-subtle text-danger";
    }
    if (variant === "success" || lower.includes("passed") || lower.includes("shipped")) {
      return "bg-success-subtle text-success";
    }
    if (lower.includes("closed") || variant === "primary") {
      return "bg-primary-subtle text-primary";
    }
    return "bg-card text-muted border border-line";
  };

  const getCount = (type: ActivityType) => {
    return activities.filter((a) => a.type === type).length;
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <h2 className="text-base font-semibold text-ink">Recent activity</h2>
        <span className="text-xs text-muted">Latest completed actions</span>
      </div>

      {/* Underline Tabs with counts */}
      <div className="border-b border-line flex items-center gap-6 text-xs sm:text-sm font-medium">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.type;
          const count = getCount(tab.type);
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveTab(tab.type)}
              className={`pb-2.5 transition-colors cursor-pointer relative ${
                isActive
                  ? "text-ink font-semibold border-b-2 border-primary -mb-px"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="ml-1.5 text-xs text-muted font-normal">
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Activity rows */}
      {filtered.length > 0 ? (
        <div className="divide-y divide-line">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[var(--hover)] transition-colors rounded-[6px]"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {item.title}
                </p>
                <p className="text-xs text-muted">
                  {item.detail} &bull; {formatRelativeTime(item.timestamp)}
                </p>
              </div>

              {item.result && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${getResultBadgeClass(
                    item.result,
                    item.variant
                  )}`}
                >
                  {item.result}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} activity recorded`}
          description="Complete engineering simulation tasks to see your recent activity timeline."
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                window.location.href = "/student/dashboard";
              }}
            >
              Browse labs
            </Button>
          }
        />
      )}
    </Card>
  );
};
