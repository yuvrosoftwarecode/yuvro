import React from 'react';
import { Flame, BookOpen, Clock, TrendingUp, Trophy } from 'lucide-react';

interface DashboardHeroProps {
  firstName: string;
  streak: number;
  lessonsDone: number;
  hoursSpent: string;
  avgProgress: number;
  certificates: number;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({
  firstName,
  streak,
  lessonsDone,
  hoursSpent,
  avgProgress,
  certificates
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-start to-saffron-end p-6 text-white mb-10 shadow-lg shadow-saffron/10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-5 h-5 text-orange-200" />
          <span className="text-sm font-medium opacity-90">{streak} Day Streak 🔥</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName || 'Student'}</h1>
        <p className="text-sm opacity-80">Continue your learning journey. You're making great progress!</p>
      </div>
      {/* Stats overlay */}
      <div className="relative z-10 flex flex-wrap gap-4 mt-5">
        {[
          { icon: BookOpen, label: 'Lessons Done', value: lessonsDone },
          { icon: Clock, label: 'Hours Spent', value: hoursSpent },
          { icon: TrendingUp, label: 'Avg Progress', value: `${Math.round(avgProgress)}%` },
          { icon: Trophy, label: 'Certificates', value: certificates },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 flex-1 min-w-[140px]">
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
