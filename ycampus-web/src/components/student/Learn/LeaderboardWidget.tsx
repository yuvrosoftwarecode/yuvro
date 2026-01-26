import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    if (loading) {
        return (
            <Card className="border shadow-sm h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Leaderboard
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-40 flex items-center justify-center text-gray-400">
                    Loading...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border shadow-sm h-full bg-white">
            <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Leaderboard
                    </CardTitle>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Top 10</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {data.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No activity yet. Be the first!</div>
                    ) : (
                        data.map((entry, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-3 p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors
                                ${entry.rank === 1 ? 'bg-yellow-50/30' : ''}`}
                            >
                                <div className="flex-shrink-0 w-6 flex justify-center font-bold text-sm text-gray-500">
                                    {entry.rank === 1 ? <Crown className="h-4 w-4 text-yellow-500" /> :
                                        entry.rank === 2 ? <Medal className="h-4 w-4 text-gray-400" /> :
                                            entry.rank === 3 ? <Medal className="h-4 w-4 text-amber-700" /> :
                                                <span className="text-xs text-gray-400">#{entry.rank}</span>}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {entry.user}
                                        </p>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                            {entry.xp} XP
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                                                style={{ width: `${Math.min(100, (entry.xp % 200) / 2)}%` }} // Visual progress bar for level
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">Lvl {entry.level}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default LeaderboardWidget;
