import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import SearchBar from '@/components/common/SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap,
  ChevronRight, Target, Medal, TrendingUp, Play, Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { fetchContests, contestService } from "@/services/contestService";
import { toast } from 'sonner';
import ContestLeaderboard from '../../components/student/ContestLeaderboard';

interface Contest {
  id: number | string;
  title: string;
  organizer: string;
  type: 'company' | 'college' | 'weekly' | 'monthly';
  status: 'upcoming' | 'ongoing' | 'past';
  startDate: Date;
  endDate: Date;
  participants: number;
  prize?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  isRegistered: boolean;
}

const ContestPage = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();

  const loadContests = async () => {
    setLoading(true);
    try {
      const data = await fetchContests();
      const formatted = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        organizer: item.organizer,
        type: item.type,
        status: item.status,
        startDate: new Date(item.start_datetime || item.start_date),
        endDate: new Date(item.end_datetime || item.end_date),
        participants: item.participants_count,
        prize: item.prize || null,
        difficulty: item.difficulty
          ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)
          : 'Medium',
        isRegistered: item.is_registered || false,
      }));
      setContests(formatted);
    } catch (err) {
      console.error("Error fetching contests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContests();
  }, []);

  const handleRegister = async (contestId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await contestService.registerContest(String(contestId));
      toast.success("Successfully registered!");
      loadContests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to register");
    }
  };

  const handleEnter = (contestId: string | number) => {
    navigate(`/student/contests/${contestId}/attempt`);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return <Building2 className="h-5 w-5" />;
      case 'college': return <GraduationCap className="h-5 w-5" />;
      case 'weekly': return <Zap className="h-5 w-5" />;
      case 'monthly': return <Trophy className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'company': return { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' };
      case 'college': return { bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500 to-violet-600' };
      case 'weekly': return { bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' };
      case 'monthly': return { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' };
      default: return { bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500 to-blue-600' };
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredContests = contests.filter(contest => {
    const matchesType = selectedType === 'all' || contest.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || contest.status === selectedStatus;
    const matchesSearch = contest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'past' && contest.status === 'past') ||
      (activeTab === 'my' && contest.isRegistered);
    return matchesType && matchesStatus && matchesSearch && matchesTab;
  });

  const ongoingContest = contests.find(c => c.status === 'ongoing');

  // Stats calculations
  const stats = {
    contestsJoined: contests.filter(c => c.isRegistered).length,
    upcomingContests: contests.filter(c => c.status === 'upcoming').length,
    ongoingContests: contests.filter(c => c.status === 'ongoing').length,
    totalContests: contests.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-[1600px] mx-auto px-8 py-6 space-y-8">
        {/* Header with Inline Stats */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contests</h1>
            <p className="text-gray-600 text-sm mt-1">
              Compete with peers, test your skills, and win exciting prizes
            </p>
          </div>

          {/* Inline Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-100">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-600">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <span className="font-bold text-purple-700">{stats.contestsJoined}</span>
                <span className="text-purple-600 ml-1">Joined</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <span className="font-bold text-blue-700">{stats.upcomingContests}</span>
                <span className="text-blue-600 ml-1">Upcoming</span>
              </div>
            </div>

            {stats.ongoingContests > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-100 animate-pulse">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <span className="font-bold text-green-700">{stats.ongoingContests}</span>
                  <span className="text-green-600 ml-1">Live</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600">
                <Target className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <span className="font-bold text-amber-700">{stats.totalContests}</span>
                <span className="text-amber-600 ml-1">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Scrolling Featured Contests */}
        {contests.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/50 py-8 -mx-6 px-6 rounded-xl border border-indigo-100/50">
            <div
              className="flex gap-6 animate-scroll"
              style={{
                animation: 'scroll 30s linear infinite',
              }}
            >
              {[...contests.filter(c => c.status !== 'past'), ...contests.filter(c => c.status !== 'past')].map((contest, idx) => {
                const style = getTypeStyle(contest.type);
                return (
                  <Card
                    key={`${contest.id}-${idx}`}
                    className="min-w-[340px] bg-white border border-gray-100 hover:border-indigo-200 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                    onClick={() => {
                      if (contest.isRegistered && contest.status === 'ongoing') {
                        handleEnter(contest.id);
                      }
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${style.bg} ${style.text}`}>
                          {getTypeIcon(contest.type)}
                        </div>
                        <StatusBadge status={contest.status} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{contest.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                        {contest.organizer}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {contest.startDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-indigo-600">
                          <Clock className="h-3.5 w-3.5" />
                          {getCountdown(contest.startDate)}
                        </span>
                      </div>
                      <Button
                        className={`w-full bg-gradient-to-r ${style.gradient} text-white hover:opacity-90 border-0`}
                        disabled={contest.status === 'past'}
                        onClick={(e) => {
                          e.stopPropagation();
                          // For ongoing registered contests, enter directly
                          if (contest.isRegistered && contest.status === 'ongoing') {
                            handleEnter(contest.id);
                          } else {
                            // otherwise view details
                            navigate(`/student/contests/${contest.id}`);
                          }
                        }}
                      >
                        {contest.status === 'past' ? 'View Results' :
                          contest.isRegistered ? (contest.status === 'ongoing' ? 'Enter Contest' : 'Registered ✓') : 'View Contest'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <style>{`
              @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
          </div>
        )}

        {/* Filters & Tabs Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100/50 p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">All Contests</TabsTrigger>
              <TabsTrigger value="past" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Past Contests</TabsTrigger>
              <TabsTrigger value="my" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">My Contests</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-36 border border-gray-200 bg-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32 border border-gray-200 bg-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-64">
              <SearchBar
                placeholder="Search contests..."
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>
          </div>
        </div>

        {/* Main Content - 75/25 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Contest List - 75% (3 columns) */}
          <div className="lg:col-span-3">
            {filteredContests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No contests found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* List Header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <div className="col-span-6">Contest</div>
                  <div className="col-span-2 text-center">Date</div>
                  <div className="col-span-2 text-center">Participants</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>

                {/* Contest Rows */}
                <div className="divide-y divide-gray-50">
                  {filteredContests.map((contest) => {
                    const style = getTypeStyle(contest.type);

                    return (
                      <div
                        key={contest.id}
                        onClick={() => navigate(`/student/contests/${contest.id}`)}
                        className={cn(
                          "grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/50 transition-colors group cursor-pointer",
                          contest.status === 'ongoing' && "bg-green-50/30"
                        )}
                      >
                        {/* Contest Info */}
                        <div className="col-span-6 flex items-center gap-4">
                          {/* Icon */}
                          <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${style.bg} ${style.text} group-hover:scale-105 transition-transform shrink-0`}>
                            {getTypeIcon(contest.type)}
                          </div>

                          {/* Title & Meta */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                {contest.title}
                              </h3>
                              {contest.status === 'ongoing' && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                  </span>
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="truncate">{contest.organizer}</span>
                              <span className="text-gray-300">•</span>
                              <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                                {contest.type}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getDifficultyBadge(contest.difficulty))}>
                                {contest.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Date & Countdown */}
                        <div className="col-span-2 text-center">
                          <div className="text-sm text-gray-900">
                            {contest.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          {contest.status === 'upcoming' && (
                            <div className="text-xs text-indigo-600 font-medium flex items-center justify-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {getCountdown(contest.startDate)}
                            </div>
                          )}
                        </div>

                        {/* Participants */}
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{contest.participants}</span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="col-span-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/contests/${contest.id}`);
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - 25% (1 column) */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Live Contest Alert */}
            {ongoingContest && (
              <Card className="border border-green-200 shadow-sm bg-gradient-to-br from-white to-green-50/50 hover:shadow-lg transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-bold text-green-600 uppercase tracking-wide">Live Now</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">{ongoingContest.title}</h3>
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 border-0"
                    onClick={() => {
                      if (ongoingContest.isRegistered) {
                        handleEnter(ongoingContest.id);
                      } else {
                        toast("Please register for the contest first.");
                      }
                    }}
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Join Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard - show for ongoing or first upcoming contest */}
            {(() => {
              const leaderboardContest = ongoingContest || contests.find(c => c.status === 'upcoming') || contests[0];
              if (!leaderboardContest) return null;
              return (
                <ContestLeaderboard
                  contestId={leaderboardContest.id}
                  contestTitle={leaderboardContest.title}
                />
              );
            })()}

            {/* Quick Stats Card */}
            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="p-5">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Medal className="h-5 w-5 text-amber-500" />
                  Your Stats
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Contests Joined</span>
                    <span className="font-semibold">{stats.contestsJoined}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Upcoming</span>
                    <span className="font-semibold text-blue-600">{stats.upcomingContests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Available</span>
                    <span className="font-semibold">{stats.totalContests}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestPage;