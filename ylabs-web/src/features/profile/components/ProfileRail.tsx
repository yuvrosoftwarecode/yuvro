import React, { useEffect, useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { useProfileStore } from "../store/profileStore";
import { performanceApi } from "@/features/performance/api/performanceApi";
import { toast } from "@/lib/toastStore";

interface ProfileRailProps {
  onNavigateTab?: (tab: "profile" | "performance" | "settings", section?: string) => void;
}

export const ProfileRail: React.FC<ProfileRailProps> = ({ onNavigateTab }) => {
  const { profile } = useProfileStore();
  const [copied, setCopied] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    labsCompleted: number;
    dayStreak: number;
    ticketsClosed: number;
    interviews: number;
  }>({
    labsCompleted: 0,
    dayStreak: 0,
    ticketsClosed: 0,
    interviews: 0,
  });

  useEffect(() => {
    performanceApi
      .getPerformance()
      .then((perf) => {
        setSnapshot({
          labsCompleted: perf.labsCompleted ?? 0,
          dayStreak: perf.stats?.currentStreak ?? 0,
          ticketsClosed: perf.ticketsClosed ?? 0,
          interviews: perf.mockInterviews ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  if (!profile) return null;

  const username = profile.username || profile.email?.split("@")[0] || "";
  const publicUrl = username ? `yuvro.com/u/${username}` : "yuvro.com";
  const githubConn = profile.connections.find((c) => c.platform === "github");
  const linkedinConn = profile.connections.find((c) => c.platform === "linkedin");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`);
      setCopied(true);
      toast.success("Profile link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Checklist items
  const hasPhoto = !!profile.avatarUrl;
  const hasResume = !!profile.resume;
  const hasEducation = profile.education.length > 0;
  const hasProject = profile.projects.length > 0;
  const hasGithub = !!(githubConn && githubConn.connected);
  const hasLinkedin = !!(linkedinConn && linkedinConn.connected);

  const checklistItems = [
    {
      id: "photo",
      label: "Add a profile photo",
      done: hasPhoto,
      action: () => (onNavigateTab ? onNavigateTab("settings", "personal") : undefined),
    },
    {
      id: "resume",
      label: "Upload your resume",
      done: hasResume,
      action: () => {
        document.getElementById("resume-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      id: "education",
      label: "Add education",
      done: hasEducation,
      action: () => {
        document.getElementById("education-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      id: "project",
      label: "Add a project",
      done: hasProject,
      action: () => {
        document.getElementById("projects-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      id: "github",
      label: "Connect GitHub",
      done: hasGithub,
      action: () => (onNavigateTab ? onNavigateTab("settings", "connections") : undefined),
    },
    {
      id: "linkedin",
      label: "Connect LinkedIn",
      done: hasLinkedin,
      action: () => (onNavigateTab ? onNavigateTab("settings", "connections") : undefined),
    },
  ];

  const completedCount = checklistItems.filter((i) => i.done).length;
  const strengthPercentage = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <aside className="w-full min-[860px]:w-[300px] shrink-0 space-y-6">
      {/* Card 1: Public profile */}
      <Card className="p-5 space-y-3.5">
        <h3 className="font-semibold text-sm text-ink">Public profile</h3>

        <div className="flex items-center justify-between text-sm">
          <span className="text-sub font-mono text-xs">{publicUrl}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-primary hover:underline text-xs font-medium cursor-pointer bg-transparent border-0 p-0"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm pt-1">
          <span className="text-muted text-xs">Email</span>
          <span className="text-ink text-xs font-medium truncate max-w-[170px]">
            {profile.email || "—"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted text-xs">GitHub</span>
          <span className="text-ink text-xs font-medium">
            {githubConn?.connected && githubConn.handle ? githubConn.handle : "—"}
          </span>
        </div>
      </Card>

      {/* Card 2: Activity */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm text-ink">Activity</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xl font-bold text-ink">{snapshot.labsCompleted}</div>
            <div className="text-xs text-muted">Labs</div>
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{snapshot.dayStreak}</div>
            <div className="text-xs text-muted">Day streak</div>
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{snapshot.ticketsClosed}</div>
            <div className="text-xs text-muted">Tickets</div>
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{snapshot.interviews}</div>
            <div className="text-xs text-muted">Interviews</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => (onNavigateTab ? onNavigateTab("performance") : undefined)}
          className="w-full py-2 px-3 rounded-[8px] border border-line bg-card hover:bg-gray-50 text-sub text-xs font-medium transition-colors cursor-pointer text-center"
        >
          View performance
        </button>
      </Card>

      {/* Card 3: Profile strength */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-sm text-ink">
          Profile strength: {strengthPercentage}%
        </h3>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-[#e4e7ec] dark:bg-[#242c38] overflow-hidden">
          <div
            className="h-full bg-[#3558c8] rounded-full transition-all duration-300"
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="space-y-2.5 pt-2">
          {checklistItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs"
            >
              <span className={item.done ? "text-sub" : "text-sub font-normal"}>
                {item.label}
              </span>
              {item.done ? (
                <span className="text-[#12b76a] font-bold">✓</span>
              ) : (
                <button
                  type="button"
                  onClick={item.action}
                  className="text-primary hover:underline font-medium cursor-pointer bg-transparent border-0 p-0"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
};
