import React, { useState } from 'react';
import StreakCalendarWidget from './StreakCalendarWidget';
import LeaderboardWidget from './LeaderboardWidget';
import { Flame, Trophy } from 'lucide-react';
import type { Stats } from './types';

interface Props {
    stats: Stats;
}

const GamificationWidget: React.FC<Props> = ({ stats }) => {
    const [view, setView] = useState<'streak' | 'leaderboard'>('streak');

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
            {/* Professional Header with Segmented Control */}
            <div className="flex items-center justify-end px-4 py-2 border-b border-gray-50 bg-gray-50/30">
                <div className="bg-gray-100/80 p-1 rounded-lg inline-flex items-center gap-1">
                    <button
                        onClick={() => setView('streak')}
                        className={`
                            px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-200 flex items-center gap-1.5
                            ${view === 'streak'
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                        `}
                    >
                        <Flame className={`w-3.5 h-3.5 ${view === 'streak' ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
                        Streak
                    </button>
                    <button
                        onClick={() => setView('leaderboard')}
                        className={`
                             px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all duration-200 flex items-center gap-1.5
                             ${view === 'leaderboard'
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                         `}
                    >
                        <Trophy className={`w-3.5 h-3.5 ${view === 'leaderboard' ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                        Leaderboard
                    </button>
                </div>
            </div>

            <div className="px-4 pb-2 pt-1 flex justify-center flex-1">
                <div className="w-full">
                    {view === 'streak' ? (
                        <StreakCalendarWidget
                            currentStreak={stats.streak || 0}
                            maxStreak={stats.max_streak || stats.streak || 0}
                        />
                    ) : (
                        <LeaderboardWidget />
                    )}
                </div>
            </div>



        </div>
    );
};

export default GamificationWidget;
