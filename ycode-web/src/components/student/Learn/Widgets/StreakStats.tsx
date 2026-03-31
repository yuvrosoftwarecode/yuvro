import React from 'react';
import { Flame, Code } from 'lucide-react';

interface StreakStatsProps {
  currentStreak: number;
  maxStreak: number;
}

const StreakStats: React.FC<StreakStatsProps> = ({ currentStreak, maxStreak }) => {
  return (
    <div className="p-4 flex items-center justify-between">
      {/* Current Segment */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-orange-600 uppercase tracking-widest leading-none">Current</span>
        <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
        <span className="text-base font-bold text-gray-900 leading-none tabular-nums">{currentStreak}</span>
      </div>

      {/* Vertical Divider */}
      <div className="h-4 w-[1px] bg-gray-200 mx-2"></div>

      {/* Max Segment */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest leading-none">Max</span>
        <Code className="w-4 h-4 text-orange-500" />
        <span className="text-base font-bold text-gray-900 leading-none tabular-nums">{maxStreak}</span>
      </div>
    </div>
  );
};

export default StreakStats;
