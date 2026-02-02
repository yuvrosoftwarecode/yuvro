import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Clock, Crown } from 'lucide-react';
import { contestService } from '@/services/contestService';

interface LeaderboardEntry {
    rank: number;
    user: string;
    avatar: string | null;
    score: number;
    time_taken: string | null;
}

interface ContestLeaderboardProps {
    contestId: string | number;
    contestTitle: string;
}

const ContestLeaderboard: React.FC<ContestLeaderboardProps> = ({ contestId, contestTitle }) => {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await contestService.getContestLeaderboard(String(contestId));
                setData(res);
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [contestId]);

    if (loading) {
        return (
            <Card className="border-2 border-orange-500/20 bg-orange-500/5">
                <CardContent className="h-40 flex items-center justify-center text-muted-foreground animate-pulse">
                    Loading rankings...
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="border-2 border-gray-200">
                <CardHeader className="pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-primary">
                        <Trophy className="h-5 w-5" />
                        <CardTitle className="text-base font-bold">Leaderboard</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="h-20 flex items-center justify-center text-xs text-muted-foreground">
                    No submissions yet. Be the first!
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-orange-500/20 bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-primary">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base font-bold text-gray-800">Top Rankers</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground truncate">{contestTitle}</p>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                    {data.map((entry) => (
                        <div
                            key={entry.rank}
                            className={`flex items-center gap-3 p-3 border-b border-gray-50 last:border-0 hover:bg-orange-50/50 transition-colors ${entry.rank === 1 ? 'bg-amber-50/50' : ''}`}
                        >
                            <div className="flex-shrink-0 w-8 flex justify-center font-bold text-sm text-gray-500">
                                {entry.rank === 1 ? <Crown className="h-5 w-5 text-amber-500 fill-amber-500" /> :
                                    entry.rank === 2 ? <Medal className="h-5 w-5 text-gray-400" /> :
                                        entry.rank === 3 ? <Medal className="h-5 w-5 text-amber-700" /> :
                                            `#${entry.rank}`}
                            </div>

                            <Avatar className="h-8 w-8 border border-gray-200">
                                <AvatarImage src={entry.avatar || ''} />
                                <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                    {entry.user.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {entry.user}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                                    <span className="font-mono text-green-600 font-medium">{entry.score} pts</span>
                                    {/* {entry.time_taken && (
                        <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {entry.time_taken.split('.')[0]}
                        </span>
                        </>
                    )} */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ContestLeaderboard;
