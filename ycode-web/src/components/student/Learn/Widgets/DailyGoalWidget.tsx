import React from 'react';
import { Target, Clock, Flame, ArrowRight, Zap } from 'lucide-react';

interface DailyGoalWidgetProps {
    solvedToday: number;
    solveGoal?: number;
    timeSpentToday: string; // e.g. "20m" or "0m"
    timeGoal?: string;      // e.g. "20m"
    streak: number;
    maxStreak: number;
}

const DailyGoalWidget: React.FC<DailyGoalWidgetProps> = ({
    solvedToday,
    solveGoal = 2,
    timeSpentToday,
    timeGoal = "20m",
    streak,
    maxStreak
}) => {
    // Calculate progress percentage for the bar
    const progressPercent = Math.min(Math.round((solvedToday / solveGoal) * 100), 100);

    return (
        <div className="pt-5 px-5 pb-1 space-y-2 relative group">
            {/* Background Accent Shimmer */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors duration-700" />

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Target className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">Today's Goal</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Target Focus</p>
                    </div>
                </div>
                <div className="px-2 py-1 bg-gray-50 rounded-md border border-gray-100 shadow-sm flex items-center gap-1.5 animate-pulse-slow">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Live</span>
                </div>
            </div>

            {/* Goal Progress Grid */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/40 backdrop-blur-sm p-3 rounded-xl border border-white/60 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Solved</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-gray-900 leading-none tabular-nums">{solvedToday}</span>
                        <span className="text-xs font-bold text-gray-400">/ {solveGoal}</span>
                    </div>
                </div>

                <div className="bg-white/40 backdrop-blur-sm p-3 rounded-xl border border-white/60 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Time</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-gray-900 leading-none tabular-nums">{timeSpentToday}</span>
                        <span className="text-xs font-bold text-gray-400">/ {timeGoal}</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DailyGoalWidget;
