import React from 'react';
import { Target, Clock, Zap } from 'lucide-react';

interface DailyGoalWidgetProps {
    solvedToday: number;
    solveGoal?: number;
    timeSpentToday: string;
    timeGoal?: string;
}

const DailyGoalWidget: React.FC<DailyGoalWidgetProps> = ({
    solvedToday,
    solveGoal = 2,
    timeSpentToday,
    timeGoal = "20m",
}) => {

    return (
        <div className="pt-5 px-5 pb-1 space-y-2 relative group">
            {/* Background Accent Shimmer */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors duration-700" />

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-start to-saffron-end flex items-center justify-center shadow-md shadow-saffron/20">
                        <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">Today's Goal</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Target Focus</p>
                    </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                </span>
            </div>

            {/* Goal Progress Grid */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-gradient-to-br from-saffron/5 to-saffron/10 p-4 rounded-xl border border-saffron/15 hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-md bg-saffron/15 flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-saffron" />
                        </div>
                        <span className="text-[11px] font-bold text-saffron uppercase tracking-widest">Solved</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-gray-900 leading-none tabular-nums">{solvedToday}</span>
                        <span className="text-sm font-normal text-gray-400">/ {solveGoal}</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-emerald-100/40 p-4 rounded-xl border border-teal-200/30 hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-md bg-teal-500/15 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-teal-500" />
                        </div>
                        <span className="text-[11px] font-bold text-teal-500 uppercase tracking-widest">Time</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-gray-900 leading-none tabular-nums">{timeSpentToday}</span>
                        <span className="text-sm font-normal text-gray-400">/ {timeGoal}</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DailyGoalWidget;
