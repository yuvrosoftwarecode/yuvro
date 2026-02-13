import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Calendar, Clock, Building2, GraduationCap, Pencil, Trash2, Eye, FileText, Code, CheckCircle, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import SearchBar from '@/components/common/SearchBar';
import { useAuth } from "@/contexts/AuthContext";
import { contestService } from '@/services/contestService';
import { fetchQuestionById, Question } from '@/services/questionService';
import DetailHeader, { StatItem } from '@/components/common/DetailHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { DataTable, Column } from '@/components/common/DataTable';

interface Contest {
  id: string;
  title: string;
  organizer: string;
  type: 'company' | 'college' | 'weekly' | 'monthly';
  status: 'upcoming' | 'ongoing' | 'past';
  startDate: string;
  endDate: string;
  duration: string;
  participants: number;
  prize?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  allowLateEntry?: boolean;
  questions_config?: {
    mcq_single: string[];
    mcq_multiple: string[];
    coding: string[];
    descriptive: string[];
  };
  questions_random_config?: {
    mcq_single: number;
    mcq_multiple: number;
    coding: number;
    descriptive: number;
  };
}

function mapContestFromBackend(c: any): Contest {
  return {
    id: String(c.id),
    title: c.title,
    organizer: c.organizer,
    type: c.type,
    status: c.status,
    startDate: c.start_datetime || c.start_date || '',
    endDate: c.end_datetime || c.end_date || '',
    duration: c.duration ? `${Math.round((typeof c.duration === 'string' ? parseFloat(c.duration) : c.duration) / 60)} min` : '',
    participants: c.participants_count ?? 0,
    prize: c.prize ?? '',
    difficulty: c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1),
    description: c.description ?? '',
    registrationStartDate: c.registration_start_datetime || c.registration_start_date || '',
    registrationEndDate: c.registration_end_datetime || c.registration_end_date || '',
    allowLateEntry: c.allow_late_entry ?? false,
    questions_config: c.questions_config ?? {
      mcq_single: [],
      mcq_multiple: [],
      coding: [],
      descriptive: []
    },
    questions_random_config: c.questions_random_config ?? {
      mcq_single: 0,
      mcq_multiple: 0,
      coding: 0,
      descriptive: 0
    },
  };
}

export default function OwnerContest() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [currentView, setCurrentView] = useState<'list' | 'view'>('list');
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [contestQuestions, setContestQuestions] = useState<{
    mcq_single: Question[];
    mcq_multiple: Question[];
    coding: Question[];
    descriptive: Question[];
  }>({
    mcq_single: [],
    mcq_multiple: [],
    coding: [],
    descriptive: []
  });
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();



  const fetchContests = async () => {
    try {
      const data = await contestService.getAllContests();
      if (Array.isArray(data)) {
        setContests(data.map(mapContestFromBackend));
      }
    } catch (err) {
      console.error('Failed to fetch contests:', err);
      toast.error('Failed to fetch contests');
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);



  const handleDeleteContest = async (id: string) => {
    try {
      await contestService.deleteContest(id);
      toast.success('Contest deleted successfully');
      fetchContests();
    } catch (err) {
      toast.error('Failed to delete contest');
    }
  };



  const openEditForm = (contest: Contest) => {
    // Navigate to the dedicated edit route
    navigate(`/instructor/contests/${contest.id}/edit`);
  };

  const fetchContestQuestions = async (questionsConfig: Contest['questions_config']) => {
    if (!questionsConfig) return;

    setLoadingQuestions(true);
    try {
      const fetchedQuestions = {
        mcq_single: [] as Question[],
        mcq_multiple: [] as Question[],
        coding: [] as Question[],
        descriptive: [] as Question[]
      };

      // Ensure questionsConfig has the expected structure
      const normalizedQuestionsConfig = {
        ...questionsConfig
      };

      // Fetch questions for each type
      for (const [type, ids] of Object.entries(normalizedQuestionsConfig)) {
        // Handle different possible data structures
        let questionIdArray: string[] = [];

        if (Array.isArray(ids)) {
          questionIdArray = ids;
        } else if (typeof ids === 'string') {
          // Handle case where it might be a single string
          questionIdArray = [ids];
        } else if (ids && typeof ids === 'object') {
          // Handle case where it might be an object with array values
          questionIdArray = Object.values(ids).flat().filter(id => typeof id === 'string');
        }

        if (questionIdArray.length > 0) {
          try {
            const questions = await Promise.all(
              questionIdArray.map(id => fetchQuestionById(String(id)))
            );
            fetchedQuestions[type as keyof typeof fetchedQuestions] = questions;
          } catch (questionError) {
            console.error(`Failed to fetch questions for type ${type}:`, questionError);
            // Continue with other types even if one fails
          }
        }
      }

      setContestQuestions(fetchedQuestions);
    } catch (error) {
      console.error('Failed to fetch contest questions:', error);
      toast.error('Failed to load contest questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const openViewForm = (contest: Contest) => {
    setSelectedContest(contest);
    setCurrentView('view');
    // Fetch questions when viewing contest
    if (contest.questions_config) {
      fetchContestQuestions(contest.questions_config);
    }
  };

  const filteredContests = contests.filter(contest => {
    const matchesSearch = contest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = selectedTab === 'all' || contest.status === selectedTab;
    return matchesSearch && matchesTab;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'college': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'weekly': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'monthly': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };



  const getHeaderTitle = () => {
    switch (currentView) {
      case 'view': return `Contest Details: ${selectedContest?.title}`;
      default: return 'Contest Management';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'view': return 'View contest information and details';
      default: return 'Create and manage coding contests for students';
    }
  };

  const headerActions = currentView === 'list' ? (
    <button
      onClick={() => navigate('/instructor/contests/add')}
      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
    >
      + Add Contest
    </button>
  ) : (
    <button
      onClick={() => {
        setCurrentView('list');
        setSelectedContest(null);
      }}
      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
    >
      ← Back to List
    </button>
  );

  const columns: Column<Contest>[] = [
    {
      header: 'Contest',
      cell: (contest) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{contest.title}</div>
          <div className="text-sm text-gray-500">{contest.organizer}</div>
        </div>
      )
    },
    {
      header: 'Type',
      cell: (contest) => (
        <Badge className={getTypeColor(contest.type)} variant="outline">
          <span className="mr-1">{contest.type === 'company' ? <Building2 className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}</span>
          {contest.type}
        </Badge>
      )
    },
    {
      header: 'Status',
      cell: (contest) => <StatusBadge status={contest.status} />
    },
    {
      header: 'Registration Window',
      cell: (contest) => (
        <div className="text-sm text-gray-900">
          {contest.registrationStartDate ? new Date(contest.registrationStartDate).toLocaleDateString() : '—'}
          {' '}to{' '}
          {contest.registrationEndDate ? new Date(contest.registrationEndDate).toLocaleDateString() : '—'}
        </div>
      )
    },
    {
      header: 'Start Date',
      cell: (contest) => new Date(contest.startDate).toLocaleDateString()
    },
    {
      header: 'Duration',
      accessorKey: 'duration'
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (contest) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/instructor/contests/${contest.id}/analytics`)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Analytics"
          >
            <BarChart2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => openViewForm(contest)}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEditForm(contest)}
            className="p-1 text-gray-400 hover:text-green-600"
            title="Edit Contest"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteContest(contest.id)}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete Contest"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title={getHeaderTitle()}
            subtitle={getHeaderSubtitle()}
            actions={headerActions}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {currentView === 'list' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatsCard
                    label="Total Contests"
                    value={contests.length}
                    icon={Trophy}
                    colorScheme="blue"
                  />
                  <StatsCard
                    label="Upcoming"
                    value={contests.filter(c => c.status === 'upcoming').length}
                    icon={Calendar}
                    colorScheme="purple"
                  />
                  <StatsCard
                    label="Ongoing"
                    value={contests.filter(c => c.status === 'ongoing').length}
                    icon={Clock}
                    colorScheme="green"
                  />
                  <StatsCard
                    label="Completed"
                    value={contests.filter(c => c.status === 'past').length}
                    icon={Users}
                    colorScheme="amber"
                  />
                </div>



                {/* Tabs and Search */}
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex w-full items-center gap-4 h-12">
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex items-center">
                      <TabsList className="inline-flex w-auto gap-1">
                        <TabsTrigger value="all" className="px-6">All Contests</TabsTrigger>
                        <TabsTrigger value="upcoming" className="px-6">Upcoming</TabsTrigger>
                        <TabsTrigger value="ongoing" className="px-6">Ongoing</TabsTrigger>
                        <TabsTrigger value="past" className="px-6">Completed</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="group relative h-full flex items-center">
                      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </div>
                  </div>
                </div>
              </>
            )}



            {/* View Contest Details - PREMIUM REVAMP */}
            {currentView === 'view' && selectedContest && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Banner - Reusable Component */}
                <DetailHeader
                  title={selectedContest.title}
                  type={selectedContest.type}
                  status={selectedContest.status}
                  organizer={selectedContest.organizer}
                  createdAt={new Date().toLocaleDateString()}
                  onEdit={() => openEditForm(selectedContest)}
                  stats={[
                    {
                      label: 'Duration',
                      value: selectedContest.duration,
                      icon: Clock,
                      colorClass: 'text-slate-700',
                      iconColorClass: 'text-blue-500'
                    },
                    {
                      label: 'Participants',
                      value: selectedContest.participants,
                      icon: Users,
                      colorClass: 'text-slate-700',
                      iconColorClass: 'text-green-500'
                    },
                    {
                      label: 'Prize',
                      value: selectedContest.prize || 'None',
                      icon: Trophy,
                      colorClass: 'text-slate-700',
                      iconColorClass: 'text-amber-500'
                    },
                    {
                      label: 'Difficulty',
                      value: selectedContest.difficulty,
                      icon: BarChart2,
                      colorClass: selectedContest.difficulty === 'Hard' ? 'text-red-600' :
                        selectedContest.difficulty === 'Medium' ? 'text-amber-600' : 'text-green-600',
                      iconColorClass: 'text-slate-500'
                    }
                  ]}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* LEFT COLUMN - MAIN CONTENT */}
                  <div className="lg:col-span-2 space-y-8">

                    {/* Description */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-500" />
                        About this Contest
                      </h3>
                      <div className="prose prose-slate max-w-none text-slate-600">
                        {selectedContest.description || 'No description provided.'}
                      </div>
                    </div>

                    {/* Questions Visualizer */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                          <Code className="w-5 h-5 text-slate-500" />
                          Questions Analytics
                        </h3>
                        <Badge variant="outline" className="text-slate-500">
                          Total: {
                            (selectedContest.questions_config ? Object.values(selectedContest.questions_config).flat().length : 0) +
                            (selectedContest.questions_random_config ? Object.values(selectedContest.questions_random_config).reduce((a, b) => a + b, 0) : 0)
                          } Qs
                        </Badge>
                      </div>

                      <div className="p-6">
                        {/* Random Config Bars */}
                        {selectedContest.questions_random_config && (
                          <div className="mb-8">
                            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Random Pool Distribution</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {/* MCQ Single */}
                              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-purple-600 font-semibold text-sm">MCQ Single</span>
                                  <Badge className="bg-purple-200 text-purple-700 hover:bg-purple-300 border-none">{selectedContest.questions_random_config.mcq_single}</Badge>
                                </div>
                                <div className="w-full bg-purple-200 rounded-full h-1.5">
                                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(selectedContest.questions_random_config.mcq_single * 10, 100)}%` }}></div>
                                </div>
                              </div>
                              {/* MCQ Multiple */}
                              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-indigo-600 font-semibold text-sm">MCQ Multi</span>
                                  <Badge className="bg-indigo-200 text-indigo-700 hover:bg-indigo-300 border-none">{selectedContest.questions_random_config.mcq_multiple}</Badge>
                                </div>
                                <div className="w-full bg-indigo-200 rounded-full h-1.5">
                                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(selectedContest.questions_random_config.mcq_multiple * 10, 100)}%` }}></div>
                                </div>
                              </div>
                              {/* Coding */}
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-blue-600 font-semibold text-sm">Coding</span>
                                  <Badge className="bg-blue-200 text-blue-700 hover:bg-blue-300 border-none">{selectedContest.questions_random_config.coding}</Badge>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(selectedContest.questions_random_config.coding * 20, 100)}%` }}></div>
                                </div>
                              </div>
                              {/* Descriptive */}
                              <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-teal-600 font-semibold text-sm">Descriptive</span>
                                  <Badge className="bg-teal-200 text-teal-700 hover:bg-teal-300 border-none">{selectedContest.questions_random_config.descriptive}</Badge>
                                </div>
                                <div className="w-full bg-teal-200 rounded-full h-1.5">
                                  <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.min(selectedContest.questions_random_config.descriptive * 20, 100)}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Specific Questions Preview</h4>
                          {loadingQuestions ? (
                            <div className="flex items-center justify-center p-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                              {/* Render a few distinct questions here as list items */}
                              {Object.entries(contestQuestions).map(([type, questions]) => (
                                questions.length > 0 && (
                                  <div key={type} className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="capitalize">{type.replace('_', ' ')}</Badge>
                                      <span className="text-xs text-slate-500">{questions.length} questions</span>
                                    </div>
                                    <div className="space-y-2">
                                      {questions.slice(0, 3).map((q, idx) => (
                                        <div key={q.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-100">
                                          <span className="truncate max-w-[70%] font-medium text-slate-700">{q.title}</span>
                                          <div className="flex items-center gap-2">
                                            <Badge className={getDifficultyColor(q.difficulty)} variant="secondary">{q.difficulty}</Badge>
                                            <span className="text-xs font-mono text-slate-500">{q.marks}pts</span>
                                          </div>
                                        </div>
                                      ))}
                                      {questions.length > 3 && (
                                        <div className="text-center text-xs text-slate-400 italic pt-1">
                                          + {questions.length - 3} more questions
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              ))}

                              {Object.values(contestQuestions).every(arr => arr.length === 0) && (
                                <div className="p-8 text-center text-slate-500">
                                  No specific questions selected.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN - SIDEBAR */}
                  <div className="space-y-6">
                    {/* Schedule Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                        Timeline
                      </h3>
                      <div className="space-y-6 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[7px] top-6 bottom-4 w-[2px] bg-slate-100"></div>

                        <div className="relative pl-6">
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500 z-10"></div>
                          <div className="text-sm font-semibold text-slate-900">Registration Opens</div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {selectedContest.registrationStartDate ? new Date(selectedContest.registrationStartDate).toLocaleString() : 'Not Set'}
                          </div>
                        </div>

                        <div className="relative pl-6">
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-500 z-10"></div>
                          <div className="text-sm font-semibold text-slate-900">Registration Closes</div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {selectedContest.registrationEndDate ? new Date(selectedContest.registrationEndDate).toLocaleString() : 'Not Set'}
                          </div>
                        </div>

                        <div className="relative pl-6">
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 z-10"></div>
                          <div className="text-sm font-semibold text-slate-900">Contest Start</div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {new Date(selectedContest.startDate).toLocaleString()}
                          </div>
                        </div>

                        <div className="relative pl-6">
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 z-10"></div>
                          <div className="text-sm font-semibold text-slate-900">Contest End</div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {new Date(selectedContest.endDate).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Config Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                        Configuration
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-600">Late Entry</span>
                          <Badge variant={selectedContest.allowLateEntry ? 'default' : 'secondary'} className={selectedContest.allowLateEntry ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-none' : ''}>
                            {selectedContest.allowLateEntry ? 'Allowed' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-600">Proctoring</span>
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Enabled</Badge>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-600">Passing Marks</span>
                          <span className="text-sm font-medium text-slate-900">60%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-600">Max Attempts</span>
                          <span className="text-sm font-medium text-slate-900">1</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {currentView === 'list' && (
              <>
                <DataTable
                  title="Contests"
                  description={`${filteredContests.length} contest(s) found`}
                  data={filteredContests}
                  columns={columns}
                  keyExtractor={(item) => item.id}
                  emptyState={{
                    message: "No contests found",
                    subMessage: searchQuery ? `No contests found matching "${searchQuery}"` : `No ${selectedTab} contests found.`,
                    action: searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Clear search
                      </button>
                    ) : undefined
                  }}
                />


              </>
            )}

          </div>
        </div>
      </div>
    </div >
  );
}
