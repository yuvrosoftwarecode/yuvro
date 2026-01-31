import React, { useEffect, useState } from 'react';

import { Trophy, Medal, Crown } from 'lucide-react';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

interface LeaderboardEntry {
    rank: number;
    user: string;
    xp: number;
    level: number;
    avatar: string | null;
}

const LeaderboardWidget: React.FC = () => {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await restApiAuthUtil.get<LeaderboardEntry[]>("/course/student-course-progress/leaderboard/");
                setData(res);
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getInitials = (name: string) => {
        return name.slice(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-xs">Loading ranks...</span>
            </div>
        );
    }

    return (
        <div className="w-full pt-0">
            {/* Simple Stats Summary (Optional, purely aesthetic for now) */}
            <div className="flex justify-between items-end mb-0.5 px-1">
                <div>
                    <h3 className="text-sm font-bold text-gray-900">Top Learners</h3>
                    <p className="text-xs text-gray-500">Compete for the top spot!</p>
                </div>
                <span className="text-[10px] font-medium bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full border border-yellow-100">
                    Weekly
                </span>
            </div>

            <div className="space-y-2 h-[170px] overflow-y-auto pr-1 custom-scrollbar">
                {data.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        No activity yet. Be the first to earn XP!
                    </div>
                ) : (
                    data.map((entry, index) => (
                        <div
                            key={index}
                            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-100"
                        >
                            {/* Rank */}
                            <div className={`
                                w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold
                                ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50/50' :
                                    entry.rank === 2 ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-50/50' :
                                        entry.rank === 3 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-50/50' :
                                            'text-gray-400 bg-transparent'}
                            `}>
                                {entry.rank <= 3 ? (
                                    entry.rank === 1 ? '1' : entry.rank === 2 ? '2' : '3'
                                ) : (
                                    <span className="font-medium">#{entry.rank}</span>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 border border-white shadow-sm overflow-hidden">
                                    {entry.avatar ? (
                                        <img src={entry.avatar} alt={entry.user} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(entry.user)
                                    )}
                                </div>
                                {entry.rank === 1 && (
                                    <div className="absolute -top-1 -right-1 text-yellow-500 bg-white rounded-full p-0.5 shadow-sm">
                                        <Crown className="w-3 h-3 fill-current" />
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                    {entry.user}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-gray-500 font-medium">Lvl {entry.level}</span>
                                    {/* Mini Progress Bar */}
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.min(100, (entry.xp % 200) / 2)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* XP Badge */}
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-indigo-600">
                                    {entry.xp}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase font-medium">XP</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeaderboardWidget;
