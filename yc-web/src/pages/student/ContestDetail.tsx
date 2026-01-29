import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap,
    ArrowLeft, Play, CheckCircle2, AlertCircle, Timer,
    Target, FileText, Star, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchContests, contestService } from "@/services/contestService";
import { toast } from 'sonner';
import ContestLeaderboard from '../../components/student/ContestLeaderboard';

interface Contest {
    id: number | string;
    title: string;
    organizer: string;
    type: string;
    difficulty: string;
    startDate: Date;
    endDate?: Date;
    duration: number;
    participants: number;
    prize?: string;
    status: string;
    isRegistered: boolean;
    description?: string;
    rules?: string[];
    prizes?: { rank: string; prize: string }[];
}

const ContestDetail: React.FC = () => {
    const { contestId } = useParams<{ contestId: string }>();
    const navigate = useNavigate();
    const [contest, setContest] = useState<Contest | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);

    // Mock additional data since API might not have all fields
    const mockDetails = {
        description: "Join this exciting coding challenge and test your problem-solving skills against participants from around the world. This contest features a mix of algorithmic problems designed to challenge both beginners and experienced programmers.",
        rules: [
            "Each participant can submit multiple solutions",
            "The final score is based on the best submission",
            "Plagiarism will result in disqualification",
            "Use of external libraries is restricted to standard libraries",
            "Time penalty applies for wrong submissions"
        ],
        prizes: [
            { rank: "🥇 1st Place", prize: "₹10,000 + Certificate" },
            { rank: "🥈 2nd Place", prize: "₹5,000 + Certificate" },
            { rank: "🥉 3rd Place", prize: "₹2,500 + Certificate" },
            { rank: "Top 10", prize: "Exclusive Swag Kit" },
            { rank: "All Participants", prize: "Participation Certificate" }
        ]
    };

    useEffect(() => {
        const loadContest = async () => {
            try {
                const contests = await fetchContests();
                const found = contests.find((c: any) => String(c.id) === contestId);
                if (found) {
                    setContest({
                        id: found.id,
                        title: found.title,
                        organizer: found.organizer,
                        type: found.type,
                        difficulty: found.difficulty,
                        startDate: new Date(found.start_datetime),
                        endDate: found.end_datetime ? new Date(found.end_datetime) : undefined,
                        duration: found.duration || 60,
                        participants: found.participants_count || 0,
                        prize: found.prize,
                        status: found.status,
                        isRegistered: found.is_registered || false,
                        ...mockDetails
                    });
                }
            } catch (err) {
                console.error("Failed to fetch contest", err);
                toast.error("Failed to load contest details");
            } finally {
                setLoading(false);
            }
        };
        loadContest();
    }, [contestId]);

    const handleRegister = async () => {
        if (!contest) return;
        setRegistering(true);
        try {
            await contestService.registerContest(String(contest.id));
            setContest({ ...contest, isRegistered: true });
            toast.success("Successfully registered for the contest!");
        } catch (err) {
            toast.error("Failed to register for contest");
        } finally {
            setRegistering(false);
        }
    };

    const handleEnter = () => {
        if (contest) {
            navigate(`/student/contests/${contest.id}/attempt`);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'company': return <Building2 className="h-6 w-6" />;
            case 'college': return <GraduationCap className="h-6 w-6" />;
            case 'weekly': return <Zap className="h-6 w-6" />;
            default: return <Trophy className="h-6 w-6" />;
        }
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'company': return { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' };
            case 'college': return { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' };
            case 'weekly': return { bg: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' };
            default: return { bg: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' };
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-700 border-green-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'hard': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getCountdown = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        if (diff <= 0) return 'Started';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-64 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Contest Not Found</h2>
                    <p className="text-muted-foreground mb-6">The contest you're looking for doesn't exist.</p>
                    <Button onClick={() => navigate('/student/contests')} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Contests
                    </Button>
                </div>
            </div>
        );
    }

    const style = getTypeStyle(contest.type);
    const isLive = contest.status === 'ongoing';
    const isPast = contest.status === 'past';
    const isUpcoming = contest.status === 'upcoming';

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/student/contests')}
                    className="mb-6 text-muted-foreground hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Contests
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Hero Card */}
                        <Card className={cn(
                            "overflow-hidden border-0 shadow-lg",
                            isLive && "ring-2 ring-green-500"
                        )}>
                            {/* Header with gradient */}
                            <div className={`bg-gradient-to-r ${style.gradient} p-6 text-white relative overflow-hidden`}>
                                {/* Background pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/20" />
                                    <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white/20" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            {getTypeIcon(contest.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-white/20 text-white border-0 capitalize">
                                                    {contest.type}
                                                </Badge>
                                                <Badge className={cn("border", getDifficultyColor(contest.difficulty))}>
                                                    {contest.difficulty}
                                                </Badge>
                                                {isLive && (
                                                    <Badge className="bg-green-500 text-white border-0 animate-pulse">
                                                        🔴 LIVE
                                                    </Badge>
                                                )}
                                            </div>
                                            <h1 className="text-2xl font-bold mb-1">{contest.title}</h1>
                                            <p className="text-white/80">by {contest.organizer}</p>
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <Calendar className="h-4 w-4" />
                                            {contest.startDate.toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <Timer className="h-4 w-4" />
                                            {contest.duration} mins
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <Users className="h-4 w-4" />
                                            {contest.participants} participants
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Section */}
                            <CardContent className="p-6 bg-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        {isUpcoming && (
                                            <div className="flex items-center gap-2 text-indigo-600">
                                                <Clock className="h-5 w-5" />
                                                <span className="font-semibold">Starts in {getCountdown(contest.startDate)}</span>
                                            </div>
                                        )}
                                        {isLive && (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <Play className="h-5 w-5 fill-current" />
                                                <span className="font-semibold">Contest is Live!</span>
                                            </div>
                                        )}
                                        {isPast && (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-semibold">Contest Ended</span>
                                            </div>
                                        )}
                                    </div>

                                    {!isPast && (
                                        <Button
                                            size="lg"
                                            className={cn(
                                                "min-w-[150px] text-white border-0",
                                                contest.isRegistered
                                                    ? isLive
                                                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                                        : "bg-gray-400"
                                                    : `bg-gradient-to-r ${style.gradient}`
                                            )}
                                            disabled={contest.isRegistered && !isLive}
                                            onClick={contest.isRegistered ? handleEnter : handleRegister}
                                        >
                                            {registering ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Registering...
                                                </span>
                                            ) : contest.isRegistered ? (
                                                isLive ? (
                                                    <>
                                                        <Play className="h-5 w-5 mr-2 fill-current" />
                                                        Enter Contest
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                                        Registered ✓
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    <Target className="h-5 w-5 mr-2" />
                                                    Register Now
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Description */}
                        <Card className="border border-gray-100 shadow-sm">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-indigo-500" />
                                    About This Contest
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-gray-600 leading-relaxed">
                                    {contest.description || mockDetails.description}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Rules */}
                        <Card className="border border-gray-100 shadow-sm">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                    Rules & Guidelines
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <ul className="space-y-3">
                                    {(contest.rules || mockDetails.rules).map((rule, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm font-semibold shrink-0">
                                                {index + 1}
                                            </span>
                                            <span className="text-gray-600">{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Prizes Card */}
                        <Card className="border border-gray-100 shadow-sm overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                                <CardTitle className="flex items-center gap-2 text-lg text-amber-700">
                                    <Gift className="h-5 w-5" />
                                    Prizes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50">
                                    {(contest.prizes || mockDetails.prizes).map((prize, index) => (
                                        <div key={index} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                                            <span className="font-medium text-gray-900">{prize.rank}</span>
                                            <span className="text-sm text-amber-600 font-semibold">{prize.prize}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Leaderboard */}
                        <ContestLeaderboard
                            contestId={contest.id}
                            contestTitle={contest.title}
                        />

                        {/* Quick Info */}
                        <Card className="border border-gray-100 shadow-sm">
                            <CardHeader className="border-b border-gray-100 pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Star className="h-4 w-4 text-indigo-500" />
                                    Quick Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span className="font-medium">{contest.duration} minutes</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type</span>
                                    <Badge variant="secondary" className="capitalize">{contest.type}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Difficulty</span>
                                    <Badge variant="outline" className={getDifficultyColor(contest.difficulty)}>
                                        {contest.difficulty}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "bg-green-500" : ""}>
                                        {contest.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContestDetail;
