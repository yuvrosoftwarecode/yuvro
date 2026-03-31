import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SearchBar from '@/components/common/SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap,
  ChevronRight, Target, Medal, TrendingUp, Play, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { fetchContests, contestService } from "@/services/contestService";
import { collegeService, College } from "@/services/collegeService";
import { toast } from 'sonner';
import ContestLeaderboard from '../../components/student/ContestLeaderboard';
import { Input } from '@/components/ui/input';

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
  registrationStartDate?: Date;
  registrationEndDate?: Date;
  allowLateEntry?: boolean;
}

const ContestPage = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [collegeSearch, setCollegeSearch] = useState<string>('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [sortBy, setSortBy] = useState<string>('date');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();

  const loadContests = async () => {
    setLoading(true);
    try {
      const data = await fetchContests();
      const now = new Date();

      const formatted = data.map((item: any) => {
        const startDate = new Date(item.start_datetime || item.start_date);
        const endDate = new Date(item.end_datetime || item.end_date);

        let status = item.status;
        if (status === 'upcoming' && now >= startDate && now < endDate) {
          status = 'ongoing';
        }

        return {
          id: item.id,
          title: item.title,
          organizer: item.organizer,
          type: item.type,
          status: status,
          startDate: startDate,
          endDate: endDate,
          participants: item.participants_count,
          prize: item.prize || null,
          difficulty: item.difficulty
            ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)
            : 'Medium',
          isRegistered: item.is_registered || false,
          registrationStartDate: item.registration_start_datetime ? new Date(item.registration_start_datetime) : undefined,
          registrationEndDate: item.registration_end_datetime ? new Date(item.registration_end_datetime) : undefined,
          allowLateEntry: item.allow_late_entry || false,
          allowedColleges: (item.allowed_colleges ?? []).map(String),
        };
      });
      setContests(formatted);
    } catch (err) {
      console.error("Error fetching contests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContests();
    collegeService.getColleges().then(data => {
      setColleges(data);
    }).catch(() => { });
  }, []);

  const handleRegister = async (contestId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await contestService.registerContest(String(contestId));
      if (response && (response as any).is_late_entry) {
        toast.success(`Registered! Late Entry: limited time remaining`, { duration: 6000 });
      } else {
        toast.success("Successfully registered!");
      }
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

  const getRegistrationInfo = (start?: Date, end?: Date, allowLateEntry?: boolean, contestEndDate?: Date) => {
    const now = new Date();
    if (start && now < start) {
      return { state: 'not_started', shortMessage: `Opens in ${getCountdown(start)}` };
    }
    if (end && now > end) {
      if (allowLateEntry && contestEndDate && now < contestEndDate) {
        return { state: 'late_entry', shortMessage: `Late Entry allowed` };
      }
      return { state: 'closed', shortMessage: 'Closed' };
    }
    return { state: 'open', shortMessage: end ? `Closes in ${getCountdown(end)}` : 'Open' };
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
      case 'company': return { bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'college': return { bg: 'bg-purple-50', text: 'text-purple-600' };
      case 'weekly': return { bg: 'bg-white', text: 'text-slate-600' };
      case 'monthly': return { bg: 'bg-slate-900', text: 'text-white' };
      default: return { bg: 'bg-white', text: 'text-slate-600' };
    }
  };

  const filteredContests = useMemo(() => contests.filter(contest => {
    const matchesType = selectedType === 'all' || contest.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || contest.status === selectedStatus;
    const matchesSearch = contest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'past' && contest.status === 'past') ||
      (activeTab === 'my' && contest.isRegistered);
    const matchesCollege = selectedCollege === 'all' ||
      ((contest as any).allowedColleges ?? []).includes(selectedCollege);
    return matchesType && matchesStatus && matchesSearch && matchesTab && matchesCollege;
  }), [contests, selectedType, selectedStatus, searchQuery, activeTab, selectedCollege]);

  const ongoingContest = contests.find(c => c.status === 'ongoing');

  const stats = {
    joined: contests.filter(c => c.isRegistered).length,
    upcoming: contests.filter(c => c.status === 'upcoming').length,
    live: contests.filter(c => c.status === 'ongoing').length,
    total: contests.length,
  };

  if (loading) {
    return (
      <StudentLayout noPadding>
        <div className="min-h-full bg-white w-full">
          <div className="p-8 animate-pulse space-y-8">
            <div className="grid grid-cols-4 gap-6"><div className="h-24 bg-gray-200 rounded-xl" /><div className="h-24 bg-gray-200 rounded-xl" /><div className="h-24 bg-gray-200 rounded-xl" /><div className="h-24 bg-gray-200 rounded-xl" /></div>
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="min-h-full bg-white">
        <div className="px-6 lg:px-8 py-6 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">Contests & Competitions</h1>
              <p className="text-sm text-slate-600">Compete, learn, and get ranked globally</p>
            </div>

            {/* Inline Stats */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Joined', value: stats.joined, icon: Trophy, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Upcoming', value: stats.upcoming, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Live', value: stats.live, icon: Zap, color: 'text-green-600', bg: 'bg-green-50', pulse: stats.live > 0 },
                { label: 'Total', value: stats.total, icon: Target, color: 'text-slate-600', bg: 'bg-white' },
              ].map((s, i) => (
                <div key={i} className={cn("flex items-center gap-2 px-4 py-2 rounded-full border border-gray-100 bg-white shadow-sm", s.pulse && "animate-pulse")}>
                  <div className={cn("flex items-center justify-center w-7 h-7 rounded-full", s.bg, s.color)}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm">
                    <span className={cn("font-bold mr-1", s.color)}>{s.value}</span>
                    <span className="text-gray-500 font-medium">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Scrolling Featured (Adapted ycode style) */}
          <div className="relative overflow-hidden bg-white py-10 px-8 rounded-[2rem] border border-gray-100 shadow-sm overflow-x-hidden">
            <div className="flex gap-6 animate-scroll hover:[animation-play-state:paused]" style={{ animation: 'scroll 40s linear infinite' }}>
              {[...contests.filter(c => c.status !== 'past'), ...contests.filter(c => c.status !== 'past')].map((contest, idx) => {
                const style = getTypeStyle(contest.type);
                return (
                  <Card key={`${contest.id}-${idx}`} className="min-w-[340px] border border-gray-100 hover:border-slate-300 transition-all hover:shadow-lg cursor-pointer bg-white">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl", style.bg, style.text)}>
                          {getTypeIcon(contest.type)}
                        </div>
                          <Badge className={cn(
                            "text-[10px] font-semibold uppercase px-2 py-1 rounded-lg",
                            contest.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                            contest.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          )}
                          >
                            {contest.status === 'ongoing' ? 'Live Now' : contest.status}
                          </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{contest.title}</h3>
                      <p className="text-sm text-slate-500 mb-4 truncate">{contest.organizer}</p>
                      <div className="flex items-center gap-4 text-xs font-medium mb-4">
                        <span className="flex items-center gap-1.5 text-slate-500"><Calendar className="h-3.5 w-3.5" />{contest.startDate.toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5 text-slate-900"><Clock className="h-3.5 w-3.5" />{getCountdown(contest.startDate)}</span>
                      </div>
                      <Button className="w-full bg-slate-900 text-white hover:bg-black rounded-xl" onClick={(e) => { e.stopPropagation(); navigate(`/student/contests/${contest.id}`); }}>
                        View Contest
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* List - 75% */}
            <div className="lg:col-span-3 space-y-6">
              {/* Filters Box */}
              <Card className="border border-gray-100 bg-white shadow-sm rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="bg-white p-1 rounded-xl">
                          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5">All</TabsTrigger>
                          <TabsTrigger value="past" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5">Past</TabsTrigger>
                          <TabsTrigger value="my" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5">My</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <Button variant="outline" onClick={() => navigate('/student/contest-analytics-list')} className="border-gray-200 hover:bg-white rounded-xl">
                        <TrendingUp className="h-4 w-4 mr-2 text-slate-600" />
                        Analytics
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[300px] lg:justify-end">
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-36 bg-white border-gray-100 rounded-xl">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-100">
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>

                      {selectedType === 'college' && (
                        <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                          <SelectTrigger className="w-48 bg-purple-50/50 border-purple-100 text-purple-700 rounded-xl">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Colleges" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-purple-100 max-h-64">
                            <div className="px-2 py-2 border-b border-gray-50 sticky top-0 bg-white z-10">
                              <Input placeholder="Search..." value={collegeSearch} onChange={(e) => setCollegeSearch(e.target.value)} className="h-8 text-xs" />
                            </div>
                            <SelectItem value="all">All Colleges</SelectItem>
                            {colleges.filter(c => c.name.toLowerCase().includes(collegeSearch.toLowerCase())).map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <div className="relative flex-1 max-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search contests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-gray-100 rounded-xl" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Table List View */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white border-b border-gray-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-6">Contest Details</div>
                  <div className="col-span-3 text-center">Timing</div>
                  <div className="col-span-3 text-right">Action</div>
                </div>

                <div className="divide-y divide-gray-50">
                  {filteredContests.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">No contests found for the selected criteria.</div>
                  ) : (
                    filteredContests.map((contest) => {
                      const style = getTypeStyle(contest.type);
                      const regInfo = getRegistrationInfo(contest.registrationStartDate, contest.registrationEndDate, contest.allowLateEntry, contest.endDate);
                      return (
                        <div key={contest.id} className={cn("grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/30 transition-colors group cursor-pointer", contest.status === 'ongoing' && "bg-green-50/20")}>
                          <div className="col-span-6 flex items-center gap-4">
                            <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl shrink-0 group-hover:scale-105 transition-transform", style.bg, style.text)}>
                              {getTypeIcon(contest.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 truncate group-hover:text-slate-700">{contest.title}</h3>
                                {contest.status === 'ongoing' && (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-2 py-0">LIVE</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>{contest.organizer}</span>
                                <span className="text-gray-300">•</span>
                                <span className="capitalize">{contest.type}</span>
                                <span className="text-gray-300">•</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200">{contest.difficulty}</Badge>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-3 text-center">
                            <div className="text-sm font-semibold text-slate-900">{contest.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            <div className={cn("text-[10px] font-bold mt-1",
                              regInfo.state === 'closed' ? "text-red-500" :
                                regInfo.state === 'open' ? "text-green-600" :
                                  regInfo.state === 'late_entry' ? "text-orange-500 animate-pulse" : "text-amber-600"
                            )}>
                              {regInfo.shortMessage}
                            </div>
                          </div>

                          <div className="col-span-3 flex justify-end">
                            <Button onClick={(e) => { e.stopPropagation(); navigate(`/student/contests/${contest.id}`); }} size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all group-hover:px-6">
                              View <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - 25% */}
            <div className="lg:col-span-1 space-y-6">
              {ongoingContest && (
                <Card className="border-0 bg-slate-900 text-white shadow-xl rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-3 opacity-20"><Trophy className="w-16 h-16" /></div>
                  <CardContent className="p-6 relative">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex h-2 w-2 rounded-full bg-green-500 animate-ping" />
                      <span className="text-xs font-bold tracking-widest text-green-400">LIVE NOW</span>
                    </div>
                    <h3 className="font-bold text-lg mb-6 line-clamp-2">{ongoingContest.title}</h3>
                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold" onClick={() => handleEnter(ongoingContest.id)}>
                      Enter Now
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border border-gray-100 bg-white shadow-sm rounded-2xl">
                <CardContent className="p-5">
                  <h4 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Medal className="h-5 w-5 text-amber-500" />
                    Quick Stats
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Joined', value: stats.joined, color: 'text-purple-600' },
                      { label: 'Live Now', value: stats.live, color: 'text-green-600' },
                      { label: 'Upcoming', value: stats.upcoming, color: 'text-blue-600' }
                    ].map((st, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">{st.label}</span>
                        <span className={cn("font-bold", st.color)}>{st.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <ContestLeaderboard contestId={ongoingContest?.id || 'global'} contestTitle={ongoingContest?.title || 'Global Ranking'} />
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          display: flex;
          width: max-content;
        }
      `}</style>
    </StudentLayout>
  );
};

export default ContestPage;