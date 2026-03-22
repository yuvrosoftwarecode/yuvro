import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { contestService } from '@/services/contestService';

interface LeaderboardEntry {
    rank: number;
    user: string;
    avatar: string | null;
    score: number;
    time_taken: string | null;
}

interface PaginatedResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: LeaderboardEntry[];
}

interface ContestLeaderboardProps {
    contestId: string | number;
    contestTitle: string;
}

const ContestLeaderboard: React.FC<ContestLeaderboardProps> = ({ contestId, contestTitle }) => {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrevious, setHasPrevious] = useState(false);
    const pageSize = 20;

    const fetchLeaderboard = async (page: number = 1) => {
        setLoading(true);
        try {
            const res = await contestService.getContestLeaderboard(String(contestId), page);

            // Handle both paginated and non-paginated responses for backwards compatibility
            if (res && typeof res === 'object' && 'results' in res) {
                // Paginated response
                const paginatedRes = res as PaginatedResponse;
                setData(paginatedRes.results || []);
                setTotalCount(paginatedRes.count || 0);
                setHasNext(!!paginatedRes.next);
                setHasPrevious(!!paginatedRes.previous);
            } else if (Array.isArray(res)) {
                // Legacy non-paginated response
                setData(res);
                setTotalCount(res.length);
                setHasNext(false);
                setHasPrevious(false);
            } else {
                setData([]);
                setTotalCount(0);
            }
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard(currentPage);
    }, [contestId, currentPage]);

    const handleNextPage = () => {
        if (hasNext) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (hasPrevious) {
            setCurrentPage(prev => prev - 1);
        }
    };

    if (loading) {
        return (
            <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="h-40 flex items-center justify-center text-muted-foreground animate-pulse">
                    Loading rankings...
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-base font-bold text-gray-800">Leaderboard</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="h-20 flex items-center justify-center text-sm text-muted-foreground">
                    No submissions yet. Be the first!
                </CardContent>
            </Card>
        );
    }

    // Separate top 3 and rest (only on first page)
    const topThree = currentPage === 1 ? data.slice(0, 3) : [];
    const rest = currentPage === 1 ? data.slice(3) : data;

    // Reorder for podium: [2nd, 1st, 3rd]
    const podiumOrder = topThree.length >= 3
        ? [topThree[1], topThree[0], topThree[2]]
        : topThree;

    const getPodiumStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return {
                    bg: 'bg-gradient-to-b from-amber-400 to-amber-500',
                    ring: 'ring-2 ring-amber-300',
                    height: 'h-20',
                    icon: <Crown className="h-5 w-5 text-amber-100 fill-amber-100" />,
                    label: 'bg-amber-500 text-white'
                };
            case 2:
                return {
                    bg: 'bg-gradient-to-b from-gray-300 to-gray-400',
                    ring: 'ring-2 ring-gray-200',
                    height: 'h-16',
                    icon: <Medal className="h-4 w-4 text-gray-100" />,
                    label: 'bg-gray-400 text-white'
                };
            case 3:
                return {
                    bg: 'bg-gradient-to-b from-amber-600 to-amber-700',
                    ring: 'ring-2 ring-amber-500',
                    height: 'h-14',
                    icon: <Medal className="h-4 w-4 text-amber-200" />,
                    label: 'bg-amber-700 text-white'
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    ring: '',
                    height: 'h-12',
                    icon: null,
                    label: 'bg-gray-200 text-gray-600'
                };
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-base font-bold text-gray-800">Top Rankers</CardTitle>
                    </div>
                    {totalCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {totalCount} participants
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">{contestTitle}</p>
            </CardHeader>
            <CardContent className="p-0">
                {/* Podium Section - Top 3 (only on first page) */}
                {currentPage === 1 && topThree.length > 0 && (
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-4 pb-6">
                        <div className="flex items-end justify-center gap-3">
                            {podiumOrder.map((entry, index) => {
                                if (!entry) return null;
                                const style = getPodiumStyle(entry.rank);
                                const avatarSize = entry.rank === 1 ? 'h-14 w-14' : 'h-11 w-11';

                                return (
                                    <div
                                        key={entry.rank}
                                        className="flex flex-col items-center"
                                        style={{ order: index }}
                                    >
                                        {/* Avatar with crown/medal */}
                                        <div className="relative mb-2">
                                            <Avatar className={`${avatarSize} ${style.ring} border-2 border-white shadow-lg`}>
                                                <AvatarImage src={entry.avatar || ''} />
                                                <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700 font-semibold">
                                                    {entry.user.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {entry.rank <= 3 && (
                                                <div className={`absolute -top-1 -right-1 ${style.label} rounded-full p-1`}>
                                                    {style.icon}
                                                </div>
                                            )}
                                        </div>

                                        {/* Username */}
                                        <p className="text-white text-xs font-medium mb-1 max-w-[70px] truncate text-center">
                                            {entry.user}
                                        </p>

                                        {/* Score */}
                                        <span className="text-[10px] text-emerald-400 font-semibold mb-2">
                                            {entry.score} pts
                                        </span>

                                        {/* Podium stand */}
                                        <div className={`w-16 ${style.height} ${style.bg} rounded-t-lg flex items-start justify-center pt-2`}>
                                            <span className="text-white font-bold text-lg">{entry.rank}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Rest of rankings */}
                {rest.length > 0 && (
                    <div className="max-h-[200px] overflow-y-auto">
                        {rest.map((entry) => (
                            <div
                                key={entry.rank}
                                className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex-shrink-0 w-7 text-center font-semibold text-sm text-gray-400">
                                    {entry.rank}
                                </div>

                                <Avatar className="h-8 w-8 border border-gray-200">
                                    <AvatarImage src={entry.avatar || ''} />
                                    <AvatarFallback className="text-xs bg-indigo-50 text-indigo-600">
                                        {entry.user.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {entry.user}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <span className="text-sm font-semibold text-emerald-600">{entry.score}</span>
                                    <span className="text-xs text-gray-400 ml-1">pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={!hasPrevious}
                            className="text-xs"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={!hasNext}
                            className="text-xs"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ContestLeaderboard;
