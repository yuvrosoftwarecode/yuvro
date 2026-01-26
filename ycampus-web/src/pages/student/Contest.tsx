import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navigation from '../../components/common/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { fetchContests, contestService } from "@/services/contestService";
import { useNavigate } from 'react-router-dom';
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
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => (prev + 1) % 1000);
    }, 30);
    return () => clearInterval(interval);
  }, []);

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
      case 'company': return <Building2 className="h-4 w-4" />;
      case 'college': return <GraduationCap className="h-4 w-4" />;
      case 'weekly': return <Zap className="h-4 w-4" />;
      case 'monthly': return <Trophy className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'college': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'weekly': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'monthly': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'upcoming': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'past': return 'bg-gray-200/10 text-gray-600 border border-gray-200';
      default: return 'bg-muted text-muted-foreground border-border';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#FFB300] via-[#FF8800] to-[#FF6B00] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4 animate-fade-in">
                <Trophy className="h-12 w-12 animate-pulse" />
                <h1 className="text-5xl font-bold">Yuvro Contests</h1>
              </div>
              <p className="text-xl text-white/90 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Compete. Learn. Get ranked globally.
              </p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-orange-600 hover:bg-white/90 shadow-lg hover:scale-105 transition-transform"
            >
              🏢 Sponsor a Contest
            </Button>
          </div>
        </div>
      </div>

      {/* Auto-Scrolling Showcase */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#FFB300]/20 via-[#FF8800]/20 to-[#FF6B00]/20 py-12 border-y border-orange-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFB300] via-[#FF8800] to-[#FF6B00] opacity-5 animate-pulse" />
        <div
          className="flex gap-6 transition-transform duration-1000 ease-linear"
          style={{ transform: `translateX(-${scrollPosition}px)` }}
        >
          {[...contests, ...contests].map((contest, idx) => (
            <Card
              key={`${contest.id}-${idx}`}
              className="min-w-[350px] bg-white backdrop-blur-sm border-2 border-gray-200 hover:border-orange-500/50 transition-all hover:scale-105 hover:shadow-xl"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge className={cn('border', getTypeColor(contest.type))}>
                    {getTypeIcon(contest.type)}
                    <span className="ml-1 capitalize">{contest.type}</span>
                  </Badge>
                  <Badge className={cn('border', getStatusColor(contest.status))}>
                    {contest.status === 'ongoing' && <span className="animate-pulse mr-1">●</span>}
                    {contest.status.toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="text-xl line-clamp-2">{contest.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  {getTypeIcon(contest.type)}
                  {contest.organizer}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{contest.startDate.toLocaleDateString()} at {contest.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span>{getCountdown(contest.startDate)}</span>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-[#FFB300] to-[#FF6B00] hover:from-[#FF8800] hover:to-[#FF5500] text-white shadow-lg"
                    disabled={contest.status === 'past' || (contest.isRegistered && contest.status === 'upcoming')}
                    onClick={(e) => {
                      if (contest.isRegistered) {
                        if (contest.status === 'ongoing') handleEnter(contest.id);
                      } else {
                        handleRegister(contest.id, e);
                      }
                    }}
                  >
                    {contest.status === 'past' ? 'Closed' :
                      contest.isRegistered ? (contest.status === 'ongoing' ? 'Enter Contest' : 'Registered') : 'Register Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Filter Bar */}
            <Card className="mb-6 border-3 border-gray-200">
              <CardContent className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="border border-gray-200">
                      <SelectValue placeholder="Contest Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="company">Company Contests</SelectItem>
                      <SelectItem value="college">College Contests</SelectItem>
                      <SelectItem value="weekly">Weekly Contests</SelectItem>
                      <SelectItem value="monthly">Monthly Contests</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="border border-gray-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border border-gray-200">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="popularity">Popularity</SelectItem>
                      <SelectItem value="prize">Prize</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 border border-gray-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <div className="my-4">
                <TabsList className="flex w-full h-10 max-w-md justify-between bg-gray-100 rounded-md border border-gray-200 py-0.5 gap-1">
                  <TabsTrigger
                    className={cn(
                      "flex-1 h-8 flex items-center px-4 rounded-md transition-colors font-medium cursor-pointer",
                      activeTab === "all"
                        ? "bg-white shadow text-primary border border-gray-300"
                        : "bg-gray-100 text-gray-600 border border-transparent hover:bg-white"
                    )}
                    value="all"
                  >
                    All Contests
                  </TabsTrigger>
                  <TabsTrigger
                    className={cn(
                      "flex-1 h-8 flex items-center px-4 rounded-md transition-colors font-medium cursor-pointer",
                      activeTab === "past"
                        ? "bg-white shadow text-primary border border-gray-300"
                        : "bg-gray-100 text-gray-600 border border-transparent hover:bg-white"
                    )}
                    value="past"
                  >
                    Past Contests
                  </TabsTrigger>
                  <TabsTrigger
                    className={cn(
                      "flex-1 h-8 flex items-center px-4 rounded-md transition-colors font-medium cursor-pointer",
                      activeTab === "my"
                        ? "bg-white shadow text-primary border border-gray-300"
                        : "bg-gray-100 text-gray-600 border border-transparent hover:bg-white"
                    )}
                    value="my"
                  >
                    My Contests
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>

            {/* Contest Display */}
            <div className="space-y-4">
              {filteredContests.length === 0 && (
                <div className="text-center text-muted-foreground py-8">No contests found.</div>
              )}
              {filteredContests.map((contest) => (
                <Card
                  key={contest.id}
                  className="group hover:shadow-lg hover:border-3 hover:border-gray-500/50 transition-all border-2 border-gray-200 cursor-pointer"
                  onClick={() => {
                    if (contest.isRegistered && contest.status === 'ongoing') {
                      handleEnter(contest.id);
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={cn('border', getTypeColor(contest.type))}>
                            {getTypeIcon(contest.type)}
                            <span className="ml-1 capitalize">{contest.type}</span>
                          </Badge>
                          <Badge className={cn('border', getStatusColor(contest.status))}>
                            {contest.status === 'ongoing' && <span className="animate-pulse mr-1">●</span>}
                            {contest.status.toUpperCase()}
                          </Badge>
                          <Badge className="border border-gray-200" variant="outline">{contest.difficulty}</Badge>
                        </div>
                        <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                          {contest.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                          {getTypeIcon(contest.type)}
                          {contest.organizer}
                        </p>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{contest.startDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-primary font-semibold">
                            <Clock className="h-4 w-4 animate-pulse" />
                            <span>{getCountdown(contest.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{contest.participants.toLocaleString()}</span>
                          </div>
                          {contest.prize && (
                            <div className="flex items-center gap-2 text-amber-600 font-semibold">
                              <Trophy className="h-4 w-4" />
                              <span>{contest.prize}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="lg"
                        className="group-hover:bg-gradient-to-r group-hover:from-[#FFB300] group-hover:to-[#FF6B00] transition-all"
                        disabled={contest.status === 'past' || (contest.isRegistered && contest.status === 'upcoming')}
                        onClick={(e) => {
                          if (contest.isRegistered) {
                            if (contest.status === 'ongoing') handleEnter(contest.id);
                          } else {
                            handleRegister(contest.id, e);
                          }
                        }}
                      >
                        {contest.status === 'past' ? 'Closed' :
                          contest.isRegistered ? (contest.status === 'ongoing' ? 'Enter Contest' : 'Registered') : 'Register Now'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            {/* Live Contest Alert */}
            {ongoingContest && (
              <Card className="border-2 border-green-500/50 bg-green-500/5 animate-pulse">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <CardTitle className="text-lg text-green-600">LIVE NOW</CardTitle>
                  </div>
                  <CardDescription className="text-base font-semibold text-foreground mt-2">
                    {ongoingContest.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      if (ongoingContest.isRegistered) {
                        handleEnter(ongoingContest.id);
                      } else {
                        // Scroll to the card? Or just show a toast?
                        toast("Please register for the contest first.");
                      }
                    }}
                  >
                    Join Now <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Global Ranking / Contest Leaderboard */}
            {ongoingContest && (
              <ContestLeaderboard
                contestId={ongoingContest.id}
                contestTitle={ongoingContest.title}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestPage;