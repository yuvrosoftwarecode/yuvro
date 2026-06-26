import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import PublicLayout from '../../components/common/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, Clock, Users, Calendar, Building2, GraduationCap, Zap,
  ChevronRight, Target, Medal, TrendingUp, Play, Crown, Search, Filter, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { fetchContests, contestService } from "@/services/contestService";
import { collegeService, College } from "@/services/collegeService";
import { toast } from 'sonner';
import ContestLeaderboard from '../../components/student/ContestLeaderboard';

const BuildingOfficeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 18 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Main Building Fill */}
    <rect x="3" y="2" width="8" height="11" fill="currentColor" fillOpacity="0.2" stroke="none" />
    
    {/* Side Building */}
    <path d="M11 7 h4 v7" />
    
    {/* Main Building Outline */}
    <path d="M3 14 V2 h8 v12" />
    
    {/* Roof Line */}
    <line x1="2" y1="2" x2="12" y2="2" />
    
    {/* Base Line */}
    <line x1="2" y1="14" x2="16" y2="14" />
    
    {/* Windows Row 1 */}
    <line x1="5" y1="5.5" x2="6" y2="5.5" />
    <line x1="8" y1="5.5" x2="9" y2="5.5" />
    
    {/* Windows Row 2 */}
    <line x1="5" y1="8.5" x2="6" y2="8.5" />
    <line x1="8" y1="8.5" x2="9" y2="8.5" />
    
    {/* Door */}
    <path d="M5.5 14 V11 h3 v3" />
  </svg>
);

const CalendarBlankIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" {...props}>
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM48,48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48ZM208,208H48V96H208V208Z"></path>
  </svg>
);

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
  openForAllColleges?: boolean;
  allowedColleges?: string[];
}

const ContestPage = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [collegeSearch, setCollegeSearch] = useState<string>('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = location.pathname.startsWith('/public/');
  const basePath = isPublic ? '/public/contests' : '/student/contests';
  const Layout = isPublic ? PublicLayout : DashboardLayout;

  const loadContests = async () => {
    setLoading(true);
    try {
      const data = await fetchContests();
      const now = new Date();

      const formatted = data.map((item: any) => {
        const startDate = new Date(item.start_datetime || item.start_date);
        const endDate = new Date(item.end_datetime || item.end_date);

        // Override status if time window indicates it's live but backend says upcoming
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
          registrationStartDate: item.registration_start_datetime
            ? new Date(item.registration_start_datetime)
            : item.registration_start_date
              ? new Date(item.registration_start_date)
              : undefined,
          registrationEndDate: item.registration_end_datetime
            ? new Date(item.registration_end_datetime)
            : item.registration_end_date
              ? new Date(item.registration_end_date)
              : undefined,
          allowLateEntry: item.allow_late_entry || false,
          openForAllColleges: item.open_for_all_colleges ?? true,
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
      setColleges(data.filter(c => c.verification_status === 'approved'));
    }).catch(() => { });
  }, []);

  const handleRegister = async (contestId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await contestService.registerContest(String(contestId));

      if (response.is_late_entry && response.remaining_time_minutes) {
        toast.success(
          `Registered! ⚠️ Late Entry: You have ${response.remaining_time_minutes} minutes remaining`,
          { duration: 6000 }
        );
      } else {
        toast.success("Successfully registered!");
      }
      loadContests();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to register";
      toast.error(errorMsg);
    }
  };

  const handleEnter = (contestId: string | number) => {
    navigate(`${basePath}/${contestId}/attempt`);
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

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRegistrationInfo = (start?: Date, end?: Date, allowLateEntry?: boolean, contestEndDate?: Date) => {
    const now = new Date();
    if (start && now < start) {
      return {
        state: 'not_started' as const,
        message: `Registration opens on ${formatDateTime(start)}`,
        shortMessage: `Opens in ${getCountdown(start)}`
      };
    }
    if (end && now > end) {
      // Check for late entry
      if (allowLateEntry && contestEndDate && now < contestEndDate) {
        return {
          state: 'late_entry' as const,
          message: 'Late Entry Open',
          shortMessage: `Late Entry ends in ${getCountdown(contestEndDate)}`
        };
      }
      return {
        state: 'closed' as const,
        message: 'Registration Closed',
        shortMessage: 'Registration closed'
      };
    }
    return {
      state: 'open' as const,
      message: 'Registration Open',
      shortMessage: end ? `Closes in ${getCountdown(end)}` : 'Registration open'
    };
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
      case 'easy': return { bg: '#D1FAE5', color: '#047857' };
      case 'medium': return { bg: '#FEF3C6', color: '#BB4D00' };
      case 'hard': return { bg: '#FEE2E2', color: '#B91C1C' };
      default: return { bg: '#F3F4F6', color: '#374151' };
    }
  };

  const filteredContests = useMemo(() => {
    return contests.filter(contest => {
      const matchesType = selectedType === 'all' || contest.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || contest.status === selectedStatus;
      const matchesSearch = contest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contest.organizer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' ||
        (activeTab === 'past' && contest.status === 'past') ||
        (activeTab === 'my' && contest.isRegistered);
      const matchesCollege = selectedCollege === 'all' ||
        (contest.allowedColleges ?? []).includes(selectedCollege);
      return matchesType && matchesStatus && matchesSearch && matchesTab && matchesCollege;
    });
  }, [contests, selectedType, selectedStatus, searchQuery, activeTab, selectedCollege]);

  const ongoingContest = contests.find(c => c.status === 'ongoing');
  const ongoingRegistrationInfo = ongoingContest
    ? getRegistrationInfo(ongoingContest.registrationStartDate, ongoingContest.registrationEndDate, ongoingContest.allowLateEntry, ongoingContest.endDate)
    : null;

  const featuredContests = useMemo(() => {
    const items = [...contests].filter(c => c.status !== 'past').slice(0, 2);
    if (items.length === 1) {
      return [items[0], items[0]];
    }
    return items;
  }, [contests]);

  const leaderboardContest = ongoingContest || contests.find(c => c.status === 'upcoming') || contests[0];

  const stats = {
    contestsJoined: contests.filter(c => c.isRegistered).length,
    upcomingContests: contests.filter(c => c.status === 'upcoming').length,
    ongoingContests: contests.filter(c => c.status === 'ongoing').length,
    totalContests: contests.length,
  };

  if (loading) {
    return (
      <Layout {...(!isPublic ? { hideHeader: true, hideFooter: true } : {})}>
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
      </Layout>
    );
  }

  return (
    <Layout
      {...(!isPublic ? { hideHeader: true, hideFooter: true, contentClassName: 'bg-white' } : {})}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 py-8 font-inter">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[28px] leading-[36px] font-manrope font-bold text-[#101828]">Contests</h1>
              <p className="mt-1 max-w-xl text-[14px] leading-[16.8px] text-[#4A5565]">Compete with peers, test your skills, and win exciting prizes</p>
            </div>

            <div className="flex flex-wrap gap-[12px]">
              <div className="flex items-center gap-[8px] rounded-full border border-[#F3E8FF] bg-[#FAF5FF] h-[45.6px] px-[15.8px]">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3E8FF] text-[var(--color-contest-purple)]">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm font-medium">
                  <span className="font-bold text-[var(--color-contest-purple)]">{stats.contestsJoined}</span>
                  <span className="ml-1 text-[var(--color-contest-purple)]">Joined</span>
                </div>
              </div>
              <div className="flex items-center gap-[8px] rounded-full border border-[#E0E7FF] bg-[#EFF6FF] h-[45.6px] px-[15.8px]">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0E7FF] text-[var(--color-contest-blue)]">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm font-medium">
                  <span className="font-bold text-[var(--color-contest-blue)]">{stats.upcomingContests}</span>
                  <span className="ml-1 text-[var(--color-contest-blue)]">Upcoming</span>
                </div>
              </div>
              <div className="flex items-center gap-[8px] rounded-full border border-[#FEF3C7] bg-[#FFFBEB] h-[45.6px] px-[15.8px]">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF3C7] text-[var(--color-contest-amber)]">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm font-medium">
                  <span className="font-bold text-[var(--color-contest-amber)]">{stats.totalContests}</span>
                  <span className="ml-1 text-[var(--color-contest-amber)]">Total</span>
                </div>
              </div>
            </div>
          </div>

          {featuredContests.length > 0 && (
            <div className="relative overflow-hidden rounded-[12px] -ml-4 -mr-3 lg:-ml-6 lg:-mr-4 pl-[48px] pr-[40px] lg:pl-[64px] lg:pr-[48px] py-[40px]" style={{ background: 'linear-gradient(90deg, rgba(238,242,255,0.5), rgba(250,245,255,0.3), rgba(239,246,255,0.5))', border: '1px solid rgba(224,231,255,0.5)' }}>
              <div className="flex gap-[23.6px] overflow-x-auto pb-4 thin-scrollbar snap-x">
                {featuredContests.map((contest, index) => {
                  const registrationInfo = getRegistrationInfo(contest.registrationStartDate, contest.registrationEndDate, contest.allowLateEntry, contest.endDate);

                  return (
                    <Card
                      key={`${contest.id}-${index}`}
                      className="w-[338.4px] flex-none snap-start border-0 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md rounded-[8px]"
                      onClick={() => navigate(`${basePath}/${contest.id}`)}
                    >
                      <CardContent className="flex flex-col gap-[12px] p-[20px]">
                        <div className="flex items-start justify-between">
                          <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#8B5CFF]/10 text-[#8B5CFF]">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div className="flex h-[23px] items-center justify-center rounded-full border border-[#1A74A8]/20 bg-[#26B0FF]/[0.05] px-[8px] text-center font-inter text-[12px] font-medium leading-[14.4px] text-[#1A74A8]">
                            Upcoming
                          </div>
                        </div>

                        <div className="flex flex-col gap-[4px]">
                          <h3 className="line-clamp-2 text-[16px] leading-[19px] font-semibold font-inter text-[#101828]">{contest.title}</h3>
                          <p className="flex items-center gap-[6px] font-inter font-normal text-[14px] leading-[16.8px] text-[#6B7280]">
                            <BuildingOfficeIcon className="h-4 w-4 text-[#5A5A5A]" />
                            {contest.organizer}
                          </p>
                        </div>

                        <div className="flex items-center gap-[8px]">
                          <span className="flex items-center gap-[6px] font-inter font-normal text-[12px] leading-[14.4px] text-[#6B7280]">
                            <CalendarBlankIcon className="h-4 w-4 text-[#5A5A5A]" />
                            {contest.startDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="font-inter font-normal text-[12px] leading-[14.4px] text-[#6B7280]">|</span>
                          <span className="flex items-center gap-[6px] font-inter font-semibold text-[12px] leading-[14.4px] text-[#7B5BF0]">
                            <Clock className="h-4 w-4" />
                            {getCountdown(contest.startDate)}
                          </span>
                        </div>

                        <div className="font-inter font-semibold text-[12px] leading-[14.4px] text-[#00884D]">
                          {registrationInfo.state === 'open' ? 'Registration open' : registrationInfo.shortMessage}
                        </div>

                        <div>
                          <Button
                            className="flex h-[36px] w-full items-center justify-center gap-[8px] rounded-[8px] border-0 px-[12px] pb-[9.5px] pt-[8.5px] font-inter text-[14px] font-semibold leading-[21px] tracking-[-0.015em] text-white shadow-sm transition-opacity hover:opacity-95"
                            style={{ background: 'linear-gradient(90deg, #1A73E8, #6C24B5)' }}
                            disabled={contest.status === 'past'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (contest.isRegistered && contest.status === 'ongoing') {
                                handleEnter(contest.id);
                              } else {
                                navigate(`${basePath}/${contest.id}`);
                              }
                            }}
                          >
                            {contest.status === 'past' ? (
                              'View Results'
                            ) : contest.isRegistered ? (
                              contest.status === 'ongoing' ? (
                                'Enter Contest'
                              ) : (
                                <>
                                  Registered <Check className="h-[9.5px] w-[13px]" strokeWidth={3} />
                                </>
                              )
                            ) : (
                              <>
                                Registered <Check className="h-[9.5px] w-[13px]" strokeWidth={3} />
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="flex h-[40px] w-full sm:w-[556px] items-center rounded-[8px] border border-slate-200 bg-[#FAFAFA] p-1">
                <TabsTrigger 
                  value="all" 
                  className="flex h-[32px] flex-1 items-center justify-center rounded-[6px] border border-transparent text-center font-inter text-[14px] font-medium leading-[16.8px] text-[#303030] transition-all data-[state=active]:border-[#757575] data-[state=active]:bg-[#FFFDFB] data-[state=active]:font-semibold data-[state=active]:text-[#111827] data-[state=active]:shadow-sm"
                >All Contests</TabsTrigger>
                <TabsTrigger 
                  value="past" 
                  className="flex h-[32px] flex-1 items-center justify-center rounded-[6px] border border-transparent text-center font-inter text-[14px] font-medium leading-[16.8px] text-[#303030] transition-all data-[state=active]:border-[#757575] data-[state=active]:bg-[#FFFDFB] data-[state=active]:font-semibold data-[state=active]:text-[#111827] data-[state=active]:shadow-sm"
                >Past Contests</TabsTrigger>
                <TabsTrigger 
                  value="my" 
                  className="flex h-[32px] flex-1 items-center justify-center rounded-[6px] border border-transparent text-center font-inter text-[14px] font-medium leading-[16.8px] text-[#303030] transition-all data-[state=active]:border-[#757575] data-[state=active]:bg-[#FFFDFB] data-[state=active]:font-semibold data-[state=active]:text-[#111827] data-[state=active]:shadow-sm"
                >My Contests</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={() => navigate('/student/contest-analytics-list')}
                className="flex items-center justify-center font-inter font-semibold transition-opacity hover:opacity-95"
                style={{
                  width: '198px',
                  height: '44.4px',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  gap: '8px',
                  backgroundColor: '#F97316',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  lineHeight: '16.8px',
                  boxShadow: '0px 1px 2px -1px rgba(0, 0, 0, 0.1), 0px 3px 3px 0px rgba(0, 0, 0, 0.1)',
                  border: 'none'
                }}
              >
                <TrendingUp style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                Analytics / Feedback
              </Button>

              <div className="relative flex-shrink-0" style={{ width: '323px', height: '44.4px' }}>
                <Search 
                  className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2"
                  style={{ width: '18px', height: '18px', color: '#9AA0A6' }}
                />
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-search-input::placeholder {
                    color: #9AA0A6 !important;
                    font-family: 'Segoe UI' !important;
                    font-weight: 400 !important;
                    font-size: 16px !important;
                    opacity: 1 !important;
                  }
                `}} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contests..."
                  className="custom-search-input w-full h-full pl-[40px] pr-4 focus-visible:ring-1 outline-none shadow-none"
                  style={{
                    borderRadius: '24px',
                    border: '1px solid #DFE1E5',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'Segoe UI',
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '100%',
                    color: '#111827',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[12px]">
            <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#6B7280' }}>Filters</span>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger 
                className="bg-white shadow-none focus:ring-1 outline-none"
                style={{ width: '133.89px', height: '36px', borderRadius: '6px', border: '1px solid #B2B2B2', padding: '0 11.81px', backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#101828' }}
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v);
                if (v !== 'college') setSelectedCollege('all');
              }}
            >
              <SelectTrigger 
                className="bg-white shadow-none focus:ring-1 outline-none"
                style={{ width: '149.51px', height: '36px', borderRadius: '6px', border: '1px solid #B2B2B2', padding: '0 11.8px', backgroundColor: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#101828' }}
              >
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            {selectedType === 'college' && (
              <Select
                value={selectedCollege}
                onValueChange={(v) => {
                  setSelectedCollege(v);
                  setCollegeSearch('');
                }}
              >
                <SelectTrigger className="h-10 w-[220px] rounded-lg border-violet-200 bg-violet-50 text-violet-700 shadow-sm font-medium">
                  <GraduationCap className="mr-1.5 h-4 w-4 text-violet-500" />
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent className="max-h-72 bg-white">
                  <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-2 py-1.5">
                    <input
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-violet-300"
                      placeholder="Search colleges..."
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges
                    .filter(c => c.name.toLowerCase().includes(collegeSearch.toLowerCase()))
                    .map(c => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  {colleges.filter(c => c.name.toLowerCase().includes(collegeSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-center text-sm text-slate-400">No colleges found</div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-[minmax(0,1fr)_264.25px]">
            <div className="space-y-4">
              {filteredContests.length === 0 ? (
                <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Trophy className="mb-4 h-14 w-14 text-slate-300" />
                    <h3 className="text-lg font-semibold text-[var(--color-contest-text-primary)]">No contests found</h3>
                    <p className="mt-1 text-sm text-[var(--color-contest-text-secondary)]">Try adjusting your filters or search term.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-6">
                  {filteredContests.map((contest) => {
                    const style = getTypeStyle(contest.type);
                    const registrationInfo = getRegistrationInfo(contest.registrationStartDate, contest.registrationEndDate, contest.allowLateEntry, contest.endDate);

                    return (
                      <div 
                        key={contest.id}
                        style={{ borderRadius: '12px', border: '1px solid #D9D9D9', overflow: 'hidden', backgroundColor: '#FFFFFF' }}
                      >
                        <div 
                          className="px-6 py-[12px]"
                          style={{ 
                            backgroundColor: '#F5F5F5', 
                            borderBottom: '0.8px solid #F3F4F6',
                            fontFamily: 'Inter',
                            fontWeight: 600,
                            fontSize: '12px',
                            lineHeight: '14.4px',
                            color: '#6A7282'
                          }}
                        >
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">Contest</div>
                            <div className="col-span-2 text-center">Date</div>
                            <div className="col-span-2 text-center">Participants</div>
                            <div className="col-span-2 text-right">Action</div>
                          </div>
                        </div>

                        <div
                          onClick={() => navigate(`${basePath}/${contest.id}`)}
                          className={cn(
                            "grid w-full grid-cols-12 items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50 cursor-pointer",
                            contest.status === 'ongoing' && 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          )}
                        >
                          <div className="col-span-6 flex min-w-0 items-center" style={{ gap: '16px' }}>
                            <div 
                              className="shrink-0 flex items-center justify-center" 
                              style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'rgba(139, 108, 255, 0.1)' }}
                            >
                              <GraduationCap style={{ width: '20px', height: '20px', color: '#9810FA' }} strokeWidth={1.67} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: '4px' }}>
                                <h3 className="truncate" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '19.2px', color: '#101828' }}>
                                  {contest.title}
                                </h3>
                                {contest.status === 'ongoing' && (
                                  <span className="inline-flex items-center gap-1.5 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span 
                                  className="truncate"
                                  style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#6B7280', paddingRight: '1.36px' }}
                                >
                                  {contest.organizer}
                                </span>
                                <div className="flex items-center" style={{ gap: '0' }}>
                                  <div style={{ width: '6px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI', fontWeight: 400, fontSize: '14px', lineHeight: '16px', color: '#D1D5DC', position: 'relative', top: '-1px' }}>
                                    •
                                  </div>
                                  <span 
                                    className="capitalize flex items-center justify-center"
                                    style={{ height: '18px', backgroundColor: 'transparent', color: '#6B7280', fontFamily: 'Inter', fontWeight: 400, fontSize: '10px', lineHeight: '12.2px' }}
                                  >
                                    {contest.type}
                                  </span>
                                </div>
                                <span 
                                  className="capitalize flex items-center justify-center"
                                  style={{ 
                                    height: '13px', 
                                    padding: '0 5.8px', 
                                    borderRadius: '6px', 
                                    backgroundColor: getDifficultyBadge(contest.difficulty).bg,
                                    color: getDifficultyBadge(contest.difficulty).color,
                                    fontFamily: 'Inter',
                                    fontWeight: 400,
                                    fontSize: '10px',
                                    lineHeight: '12.2px'
                                  }}
                                >
                                  {contest.difficulty}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2 flex flex-col items-center justify-center" style={{ gap: '2px' }}>
                            <div style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#101828' }}>
                              {contest.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            {contest.status === 'upcoming' && (
                              <div className="flex items-center justify-center" style={{ gap: '4px', height: '15px' }}>
                                <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Clock style={{ width: '11.38px', height: '11.38px', color: '#4F39F6' }} />
                                </div>
                                <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '12px', lineHeight: '14.4px', color: '#4F39F6' }}>
                                  {getCountdown(contest.startDate)}
                                </span>
                              </div>
                            )}
                            {contest.status !== 'past' && (
                              <div style={{ 
                                fontFamily: 'Inter', 
                                fontWeight: 600, 
                                fontSize: '10px', 
                                lineHeight: '12.1px', 
                                color: registrationInfo.state === 'closed' ? '#DC2626' : '#009966' 
                              }}>
                                {registrationInfo.state === 'open' ? 'Registration open' : registrationInfo.shortMessage}
                              </div>
                            )}
                          </div>

                          <div className="col-span-2 flex items-center justify-center">
                            <div className="flex items-center justify-center" style={{ height: '20px', gap: '4px' }}>
                              <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users color="#343330" strokeWidth={1.5} style={{ width: '13.76px', height: '8.76px' }} />
                              </div>
                              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '14px', lineHeight: '16.8px', color: '#4A5565' }}>
                                {contest.participants}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2 flex justify-end">
                            <Button
                              variant="outline"
                              style={{
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid rgba(139, 108, 255, 0.2)',
                                backgroundColor: '#FFFFFF',
                                gap: '4px',
                                paddingLeft: '14px',
                                paddingRight: '11.8px',
                                boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.1)'
                              }}
                              className="hover:bg-[#F3E8FF]"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`${basePath}/${contest.id}`);
                              }}
                            >
                              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '12px', lineHeight: '14.4px', color: '#8B6CFF' }}>
                                View
                              </span>
                              <ChevronRight color="#8B6CFF" strokeWidth={1.33} style={{ width: '16px', height: '16px' }} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6 lg:pt-0">
              <Card 
                className="bg-white"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #D9D9D9',
                  boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A',
                  overflow: 'hidden'
                }}
              >
                <CardContent className="p-0">
                  <div style={{ padding: '24px 24px 12px 24px', borderBottom: '0.8px solid #F3F4F6' }}>
                    <h4 className="flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '19px', color: '#1E2939' }}>
                      <Trophy style={{ width: '20px', height: '20px' }} color="#FD9A00" strokeWidth={1.67} />
                      Leaderboard
                    </h4>
                  </div>
                  <div style={{ padding: '0px 24px 24px 24px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#6B7280', textAlign: 'center' }}>
                      No submissions yet. Be the first!
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-white"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #D9D9D9',
                  boxShadow: '0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A'
                }}
              >
                <CardContent className="p-6">
                  <h4 className="flex items-center gap-[8px] mb-6" style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '19px', color: '#101828' }}>
                    <Medal style={{ width: '20px', height: '20px' }} color="#FD9A00" strokeWidth={1.67} />
                    Your Stats
                  </h4>
                  <div className="flex flex-col gap-[12px]">
                    <div className="flex items-center justify-between" style={{ height: '20px' }}>
                      <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#6B7280' }}>Contests Joined</span>
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '19.2px', color: '#111827' }}>{stats.contestsJoined}</span>
                    </div>
                    <div className="flex items-center justify-between" style={{ height: '20px' }}>
                      <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#6B7280' }}>Upcoming</span>
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '19.2px', color: '#155DFC' }}>{stats.upcomingContests}</span>
                    </div>
                    <div className="flex items-center justify-between" style={{ height: '20px' }}>
                      <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '16.8px', color: '#6B7280' }}>Total Available</span>
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '19.2px', color: '#111827' }}>{stats.totalContests}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContestPage;
