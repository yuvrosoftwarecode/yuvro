import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { ActivityItem, ActivityType } from "../types";
import { formatRelativeTime } from "@/lib/dateHelpers";

interface RecentActivityListProps {
  activities: ActivityItem[];
}

const TABS: ActivityType[] = ["Labs", "Sprints", "Tickets", "Interviews"];

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
}) => {
  const [activeTab, setActiveTab] = useState<ActivityType>("Labs");

  const filtered = activities.filter((a) => a.type === activeTab);

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-base font-semibold text-ink">Recent activity</h2>

      {/* Underline Tabs */}
      <div className="flex items-center gap-6 border-b border-line text-xs font-medium">
        {TABS.map((t) => {
          const isActive = activeTab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none ${
                isActive
                  ? "text-ink font-semibold border-b-2 border-primary -mb-px"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Activity Rows */}
      <div className="divide-y divide-line/60">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-semibold text-xs text-ink truncate">{item.title}</h3>
              <p className="text-xs text-muted">{item.subtitle}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="inline-flex items-center rounded-full bg-[#ecfdf3] dark:bg-[#052e16] text-[#027a48] dark:text-[#4ade80] px-2.5 py-0.5 text-xs font-medium">
                {item.result}
              </span>
              <span className="text-xs text-muted min-w-[70px] text-right">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-6 text-center text-xs text-muted italic">
            No recent {activeTab.toLowerCase()} activity recorded.
          </div>
        )}
      </div>
    </Card>
  );
};
