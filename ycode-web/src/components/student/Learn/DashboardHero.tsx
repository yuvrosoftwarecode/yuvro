import React from 'react';
import { Flame, BookOpen, Clock, TrendingUp, Trophy } from 'lucide-react';

interface DashboardHeroProps {
  firstName: string;
  streak: number;
  lessonsDone: number;
  hoursSpent: string;
  avgProgress: number;
  certificates: number;
  tierName?: string;
  level?: number;
  xp?: number;
  xpProgressPct?: number;
  xpForNextLevel?: number;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({
  firstName,
  streak,
  lessonsDone,
  hoursSpent,
  avgProgress,
  certificates,
  tierName,
  level,
  xp = 0,
  xpProgressPct = 0,
  xpForNextLevel,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-start to-saffron-end p-6 text-white mb-10 shadow-lg shadow-saffron/10">
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

      <div className="relative z-10">
        {/* Top row: streak + tier badge */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-white" />
            <span className="text-sm font-medium opacity-90">{streak} Day Streak</span>
          </div>

          {/* Tier badge */}
          {tierName && level && (
            <div className="flex items-center gap-2 bg-white/20 border border-white/30 backdrop-blur-sm rounded-full px-3 py-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-200" />
              <span className="text-[11px] font-bold text-white/90 uppercase tracking-wide">{tierName}</span>
              <span className="text-[10px] text-white/60 font-medium">Lv.{level}</span>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-0.5">Welcome back, {firstName || 'Student'}</h1>
        <p className="text-sm opacity-80 mb-3">Continue your learning journey. You're making great progress!</p>

        {/* XP Progress bar */}
        {xpForNextLevel !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">YP Progress</span>
              <span className="text-[10px] font-bold text-white/80">{xp} YP · {xpForNextLevel} more to next level</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(xpProgressPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats overlay */}
      <div className="relative z-10 flex flex-wrap gap-4">
        {[
          { icon: BookOpen, label: 'Lessons Done', value: lessonsDone },
          { icon: Clock, label: 'Hours Spent', value: hoursSpent },
          { icon: TrendingUp, label: 'Avg Progress', value: `${Math.round(avgProgress)}%` },
          { icon: Trophy, label: 'Certificates', value: certificates },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5 bg-white/25 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5 flex-1 min-w-[140px]">
            <stat.icon className="w-4 h-4 opacity-90" />
            <div>
              <p className="text-lg font-bold leading-tight">{stat.value}</p>
              <p className="text-[10px] opacity-75">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHero;
