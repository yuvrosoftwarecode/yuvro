import React, { useState } from 'react';
import ProgressCircleWidget from './ProgressCircleWidget';
import ActivityCalendarWidget from './ActivityCalendarWidget';
import DailyGoalWidget from './DailyGoalWidget';
import LeaderboardWidget from './LeaderboardWidget';
import BadgesWidget from './BadgesWidget';
import { CalendarDays, Trophy, Flame } from 'lucide-react';

import type { Course, Stats, CourseProgressMap } from '../types';

interface StatsSidebarProps {
  stats: Stats;
  courses: Course[];
  progressMap: CourseProgressMap;
  leaderboardData: any[];
  badges?: any[];
  activeDates?: string[];
  solvedToday?: number;
  timeSpentToday?: string;
}

const StatsSidebar: React.FC<StatsSidebarProps> = ({
  stats,
  courses = [],
  progressMap = {},
  leaderboardData = [],
  badges = [],
  activeDates = [],
  solvedToday = 0,
  timeSpentToday = "0m"
}) => {
  const [currentCourseIndex, setCurrentCourseIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'calendar' | 'leaderboard'>('calendar');

  // Filter for enrolled/started courses
  const enrolledCourses = courses.filter(c => progressMap[c.id] !== undefined || c.id === 'dsa');

  // Fallback to all courses if none specifically enrolled
  const carouselCourses = enrolledCourses.length > 0 ? enrolledCourses : courses;

  // Safe access
  const currentCourse = carouselCourses.length > 0
    ? carouselCourses[currentCourseIndex % carouselCourses.length]
    : { id: 'none', name: 'No Courses Started', topics: [] } as any;

  const totalTopics = currentCourse.topics?.length || 0;
  const progressPercent = progressMap[currentCourse.id] || 0;
  const completedTopics = Math.round((progressPercent / 100) * totalTopics);

  const handleNext = () => {
    setCurrentCourseIndex((prev) => (prev + 1) % carouselCourses.length);
  };

  const handlePrev = () => {
    setCurrentCourseIndex((prev) => (prev - 1 + carouselCourses.length) % carouselCourses.length);
  };

  // Convert activeDates array ["2026-03-31", ...] to activityMap { "2026-03-31": true }
  const realActivityMap: Record<string, boolean> = {};
  activeDates.forEach(dateStr => {
    realActivityMap[dateStr] = true;
  });

  const currentStreak = stats.streak || 0;
  const maxStreak = stats.max_streak || 0;
  const xpProgressPct = stats.xp_progress_pct || 0;
  const xpForNextLevel = stats.xp_for_next_level;
  const currentXp = stats.xp || 0;

  const getStreakLabel = (streak: number) => {
    if (streak === 0) return 'Start today!';
    if (streak === 1) return 'Good start!';
    if (streak <= 3) return 'Building up!';
    if (streak <= 7) return 'On fire!';
    if (streak <= 14) return 'Unstoppable!';
    if (streak <= 30) return 'Legendary!';
    return 'Godlike!';
  };

  return (
    <aside className="w-full flex-shrink-0 flex flex-col h-full z-30 overflow-hidden">

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-3">

          {/* Primary Focus Card: Goal + Progress (Grouped to reduce clutter) */}
          <div className="relative bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-xl rounded-2xl border border-gray-100 ring-4 ring-white/20 shadow-lg shadow-gray-200/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-white/60 pointer-events-none" />

            {/* Daily Goal Section */}
            <DailyGoalWidget />

            {/* Subtle Separator (Improved for visibility) */}
            <div className="px-5 my-1 h-[1px]">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
            </div>

            {/* Topic Carousel Section */}
            <ProgressCircleWidget
              title={currentCourse.name}
              totalSolved={completedTopics}
              totalQuestions={totalTopics}
              progressPercent={progressPercent}
              onNext={handleNext}
              onPrev={handlePrev}
              canNext={carouselCourses.length > 1}
              canPrev={carouselCourses.length > 1}
            />
          </div>

          {/* ── Consistency / Competition Card ── */}
          <div className="rounded-2xl border border-border/40 bg-card p-5">
            {/* Tabs */}
            <div className="flex rounded-xl bg-muted/30 p-1 mb-4">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-saffron text-white shadow-md shadow-saffron/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Consistency
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-saffron text-white shadow-md shadow-saffron/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Competition
              </button>
            </div>

            {/* Tab Content Area */}
            <div>
              {activeTab === 'calendar' ? (
                <div key="calendar" className="animate-in fade-in slide-in-from-right-2 duration-300 ease-out fill-mode-forwards">
                  {/* Streak Section */}
                  <div className="rounded-2xl bg-gradient-to-r from-saffron/5 via-saffron/8 to-saffron/3 dark:from-saffron/10 dark:via-saffron/5 dark:to-saffron/3 border border-saffron/15 dark:border-saffron/20 p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Flame icon */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-start to-saffron-end flex items-center justify-center shadow-lg shadow-saffron/25">
                          <Flame className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{currentStreak} Day Streak</p>
                          <p className="text-[10px] text-saffron dark:text-saffron font-semibold">Current Streak</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Highest Streak</p>
                         <p className="text-sm font-extrabold text-foreground">{maxStreak}🏆</p>
                      </div>
                    </div>
                    {/* Evolution */}
                    <div className="flex items-center justify-between bg-white/50 dark:bg-white/5 rounded-xl px-3 py-2 mb-3">
                      {[
                        { emoji: '😢', day: 0 },
                        { emoji: '🙂', day: 1 },
                        { emoji: '😊', day: 3 },
                        { emoji: '😄', day: 7 },
                        { emoji: '🤩', day: 14 },
                        { emoji: '🔥', day: 30 },
                      ].map((l, i) => {
                        const thresholds = [0, 1, 3, 7, 14, 30];
                        const isActive = (l.day === 0 && currentStreak === 0) ||
                          (l.day > 0 && currentStreak >= l.day && (i === 5 || currentStreak < thresholds[i + 1]));
                        const isPast = l.day < currentStreak && !isActive;
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className={`text-base transition-all ${isActive ? 'scale-125' : isPast ? 'opacity-50' : 'grayscale opacity-25'}`}>{l.emoji}</span>
                            <span className="text-[7px] text-muted-foreground font-medium">{l.day}d</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* XP Mini Progress Bar */}
                    {xpForNextLevel !== undefined && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-saffron/70 uppercase tracking-wider">YP to next level</span>
                          <span className="text-[9px] font-bold text-foreground/60">{xpForNextLevel} YP remaining</span>
                        </div>
                        <div className="h-1.5 w-full bg-saffron/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-saffron-start to-saffron-end rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(xpProgressPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <ActivityCalendarWidget activityMap={realActivityMap} />
                </div>
              ) : (
                <div key="leaderboard" className="animate-in fade-in slide-in-from-left-2 duration-300 ease-out fill-mode-forwards">
                  <LeaderboardWidget
                    topUsers={leaderboardData.slice(0, 5).map((e: any) => ({
                      rank: e.rank,
                      name: e.user,
                      points: e.xp,
                      avatar: e.avatar,
                      isCurrentUser: e.is_current_user,
                    }))}
                    currentUserRank={leaderboardData.find((e: any) => e.is_current_user)?.rank || 0}
                    currentUserXp={stats.xp || 0}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Badges Card ── */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <BadgesWidget badges={badges} />
          </div>

        </div>
    </aside>
  );
};

export default StatsSidebar;
