import React, { useState } from 'react';
import ProgressCircleWidget from './ProgressCircleWidget';
import ActivityCalendarWidget from './ActivityCalendarWidget';
import DailyGoalWidget from './DailyGoalWidget';
import LeaderboardWidget from './LeaderboardWidget';
import { CalendarDays, ChevronUp, Trophy, Flame } from 'lucide-react';

import type { Course, Stats, CourseProgressMap } from '../types';

interface StatsSidebarProps {
  stats: Stats;
  courses: Course[];
  progressMap: CourseProgressMap;
  leaderboardData: any[];
  activeDates?: string[];
  solvedToday?: number;
  timeSpentToday?: string;
}

const StatsSidebar: React.FC<StatsSidebarProps> = ({
  stats,
  courses = [],
  progressMap = {},
  leaderboardData = [],
  activeDates = [],
  solvedToday = 0,
  timeSpentToday = "0m"
}) => {
  // Carousel State for Progress Widget
  const [currentCourseIndex, setCurrentCourseIndex] = useState<number>(0);

  // Tab State for Engagement Hub
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

  return (
    <aside className="w-full flex-shrink-0 flex flex-col h-full bg-white z-30">

      {/* Unified Stats Container - Reverted to clean frame */}
      <div className="bg-white rounded-lg border border-gray-100 shadow flex flex-col h-full overflow-hidden">

        {/* Internal Scroller - Only Widgets Scroll, Not the Card border */}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-3">

          {/* Primary Focus Card: Goal + Progress (Grouped to reduce clutter) */}
          <div className="relative bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-xl rounded-2xl border border-gray-100 ring-4 ring-white/20 shadow-lg shadow-gray-200/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-white/60 pointer-events-none" />

            {/* Daily Goal Section */}
            <DailyGoalWidget
              solvedToday={solvedToday}
              timeSpentToday={timeSpentToday}
              streak={stats.streak || 0}
              maxStreak={stats.max_streak || 0}
            />

            {/* Subtle Separator (Improved for visibility) */}
            <div className="px-5 my-1 h-[1px]">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
            </div>

            {/* Topic Carousel Section */}
            <ProgressCircleWidget
              title={currentCourse.name}
              totalSolved={completedTopics}
              totalQuestions={totalTopics}
              onNext={handleNext}
              onPrev={handlePrev}
              canNext={carouselCourses.length > 1}
              canPrev={carouselCourses.length > 1}
            />
          </div>

          {/* Engagement Hub: Tabbed Calendar & Leaderboard (Grouped to save space) */}
          <div className="relative bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-xl rounded-2xl border border-gray-100 ring-4 ring-white/20 shadow-lg shadow-gray-200/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-white/60 pointer-events-none" />

            {/* Tab Switcher Bar */}
            <div className="p-2 border-b border-gray-100/50 bg-white/30 backdrop-blur-md relative z-10">
              <div className="flex bg-gray-100/50 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 focus:outline-none focus-visible:ring-0 border ${activeTab === 'calendar'
                      ? 'bg-white text-orange-600 shadow-sm border-orange-100/50'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/50'
                    }`}
                >
                  <CalendarDays className={`w-3.5 h-3.5 ${activeTab === 'calendar' ? 'text-orange-600' : 'text-gray-400'}`} />
                  Consistency
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 focus:outline-none focus-visible:ring-0 border ${activeTab === 'leaderboard'
                      ? 'bg-white text-orange-600 shadow-sm border-orange-100/50'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/50'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Trophy className={`w-3.5 h-3.5 ${activeTab === 'leaderboard' ? 'text-orange-600' : 'text-gray-400'}`} />
                    Competition
                  </span>
                </button>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="relative z-10 flex flex-col overflow-hidden transform-gpu">
              {activeTab === 'calendar' ? (
                <div key="calendar" className="animate-in fade-in slide-in-from-right-2 duration-300 ease-out fill-mode-forwards">
                  <div className="px-3 pt-3">
                    <div className="flex items-center justify-center gap-3 bg-white/50 backdrop-blur-sm px-3 py-2 rounded-xl border border-orange-100 shadow-sm relative hover:shadow-md hover:scale-[1.01] transition-all duration-300 mb-2">
                        <div className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-gray-800">Current - {stats.streak || 0}</span>
                        </div>
                        <div className="text-gray-300 text-xs font-light">|</div>
                        <span className="text-xs font-bold text-gray-500">Max - {stats.max_streak || 0}</span>
                    </div>
                  </div>
                  <ActivityCalendarWidget
                    activityMap={realActivityMap}
                  />
                </div>
              ) : (
                <div key="leaderboard" className="animate-in fade-in slide-in-from-left-2 duration-300 ease-out fill-mode-forwards">
                  <LeaderboardWidget
                    topUsers={leaderboardData.slice(0, 5).map(e => ({
                      rank: e.rank,
                      name: e.user,
                      points: e.xp,
                      avatar: e.avatar
                    }))}
                    currentUserRank={leaderboardData.find(e => e.is_current_user)?.rank || 0}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default StatsSidebar;
