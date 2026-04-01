import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, Brain, CheckCircle, Clock, Eye, FileText, Mic, Pencil, Settings, Trash2, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import StatusBadge from '@/components/common/StatusBadge';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

import { mockInterviewService } from '@/services/mockInterviewService';
import { StatsCard } from '@/components/common/StatsCard';
import { DataTable, Column } from '@/components/common/DataTable';
import DetailHeader from '@/components/common/DetailHeader';

// Redefine local interface to match the VIEW requirements, but aligned with new backend data
interface MockInterviewUI {
  id: string;
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  // AI Params
  ai_generation_mode: string;
  ai_coding_range: string;
  ai_context?: any;

  // Voice
  voice_type: string;
  voice_speed: number;

  // Skills
  required_skills: string[];
  optional_skills: string[];

  // Config
  questions_config: Record<string, string[]>;
  questions_random_config: Record<string, number>;

  publish_status: string;
  participants: number;
  created_by?: string;
  created_at?: string;
}

function mapMockInterviewFromBackend(c: any): MockInterviewUI {
  return {
    id: String(c.id),
    title: c.title,
    description: c.description ?? '',
    instructions: c.instructions ?? '',
    max_duration: c.max_duration ?? 60,

    ai_generation_mode: c.ai_generation_mode ?? 'full_ai',
    ai_coding_range: (() => {
      const ctx = c.ai_context;
      if (typeof ctx === 'object' && ctx !== null && !Array.isArray(ctx)) {
        const counts = Object.values(ctx)
          .map((v: any) => v?.coding_questions_count)
          .filter(v => typeof v === 'number');
        if (counts.length === 0) return '0';
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        return min === max ? `${min}` : `${min}-${max}`;
      }
      return String(c.ai_coding_question_count ?? 1);
    })(),
    voice_type: c.voice_type ?? 'junnu',
    voice_speed: c.voice_speed ?? 1.0,

    required_skills: c.required_skills ?? [],
    optional_skills: c.optional_skills ?? [],

    questions_config: c.questions_config ?? {},
    questions_random_config: c.questions_random_config ?? {},

    publish_status: c.publish_status ?? 'draft',
    participants: c.participants_count ?? 0,
    created_at: c.created_at
  };
}

export default function MockInterviewPage() {
  const [mockInterviews, setMockInterviews] = useState<MockInterviewUI[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [currentView, setCurrentView] = useState<'list' | 'view'>('list');
  const [selectedInterview, setSelectedInterview] = useState<MockInterviewUI | null>(null);
  const navigate = useNavigate();

  const fetchMockInterviews = async () => {
    try {
      const data = await mockInterviewService.getAllMockInterviews();
      if (Array.isArray(data)) {
        const mapped = data.map(mapMockInterviewFromBackend);
        setMockInterviews(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch mock interviews:', err);
      toast.error('Failed to fetch mock interviews');
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchMockInterviews();
  }, [location.state]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this mock interview?")) return;
    try {
      await mockInterviewService.deleteMockInterview(id);
      toast.success('Mock Interview deleted successfully');
      fetchMockInterviews();
    } catch (err) {
      toast.error('Failed to delete mock interview');
    }
  };

  const openEditForm = (interview?: MockInterviewUI | null) => {
    if (!interview) {
      toast.error('No interview selected for editing');
      return;
    }
    navigate(`/admin/mock-interview/${interview.id}/edit`);
  };

  const openViewForm = (interview: MockInterviewUI) => {
    setSelectedInterview(interview);
    setCurrentView('view');
  };

  const filteredMockInterviews = mockInterviews.filter(interview => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    const matchesSearch = !q || [
      interview.title,
      interview.description,
      interview.ai_generation_mode,
      interview.voice_type
    ].some(field => (field || '').toString().toLowerCase().includes(q));

    const status = (interview.publish_status || '').toLowerCase();
    const matchesTab = selectedTab === 'all' || status === selectedTab;

    return matchesSearch && matchesTab;
  });

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'full_ai': return 'bg-blue-100 text-blue-700';
      case 'mixed': return 'bg-purple-100 text-purple-700';
      case 'predefined': return 'bg-orange-100 text-orange-700';
      default: return 'bg-white text-gray-700';
    }
  };

  const formatMode = (mode: string) => mode.replace('_', ' ');

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'view': return 'Mock Interview Details';
      default: return 'Mock Interview Management';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'view': return 'Review interview configuration, skills, and AI setup';
      default: return 'Create and manage AI-powered mock interviews';
    }
  };

  const headerActions = currentView === 'list' ? (
    <button
      onClick={() => navigate('/admin/mock-interview/add')}
      className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
    >
      + Add Mock Interview
    </button>
  ) : (
    <button
      onClick={() => {
        setCurrentView('list');
        setSelectedInterview(null);
      }}
      className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
    >
      Back to Interviews
    </button>
  );

  const columns: Column<MockInterviewUI>[] = [
    {
      header: 'Interview',
      cell: (interview) => (
        <button
          onClick={() => openViewForm(interview)}
          className="text-left hover:text-blue-700 transition-colors"
        >
          <div className="font-medium text-gray-900">{interview.title}</div>
          <div className="text-xs text-gray-500 truncate max-w-[280px]">
            {interview.description || 'No description'}
          </div>
        </button>
      )
    },
    {
      header: 'Mode',
      cell: (interview) => (
        <Badge variant="secondary" className={`capitalize border-0 ${getModeColor(interview.ai_generation_mode)}`}>
          {formatMode(interview.ai_generation_mode)}
        </Badge>
      )
    },
    {
      header: 'Duration',
      cell: (interview) => `${interview.max_duration} mins`
    },
    {
      header: 'Status',
      cell: (interview) => <StatusBadge status={interview.publish_status} />
    },
    {
      header: 'Coding Questions',
      cell: (interview) => interview.ai_coding_range
    },
    {
      header: 'Participants',
      cell: (interview) => (
        <div className="text-sm text-gray-600 flex items-center">
          <Users className="h-4 w-4 mr-1.5 text-gray-400" />
          {interview.participants || 0}
        </div>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (interview) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openViewForm(interview)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(`/admin/mock-interview/${interview.id}/analytics`)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="View Analytics"
          >
            <BarChart2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEditForm(interview)}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(interview.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{getHeaderTitle()}</h1>
                <p className="text-muted-foreground">{getHeaderSubtitle()}</p>
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
              </div>
            </div>

            <div className="mt-6">
                {currentView === 'list' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        label="Total Interviews"
                        value={mockInterviews.length}
                        icon={Brain}
                        colorScheme="blue"
                    />
                    <StatsCard
                        label="Published"
                        value={mockInterviews.filter((c) => c.publish_status === 'active').length}
                        icon={CheckCircle}
                        colorScheme="green"
                    />
                    <StatsCard
                        label="Drafts"
                        value={mockInterviews.filter((c) => c.publish_status === 'draft').length}
                        icon={Pencil}
                        colorScheme="purple"
                    />
                    <StatsCard
                        label="Archived"
                        value={mockInterviews.filter((c) => c.publish_status === 'archived').length}
                        icon={Trash2}
                        colorScheme="amber"
                    />
                    </div>

                    <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="flex w-full items-center gap-4 h-12">
                        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex items-center border border-gray-200 rounded-lg">
                        <TabsList className="flex rounded-lg overflow-hidden border border-gray-200 bg-white px-4 gap-4 h-full items-center">
                            <TabsTrigger value="all" className="px-6">All</TabsTrigger>
                            <TabsTrigger value="active" className="px-6">Active</TabsTrigger>
                            <TabsTrigger value="draft" className="px-6">Draft</TabsTrigger>
                        </TabsList>
                        </Tabs>

                        <div className="relative flex-1 w-full h-full min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title or description..."
                                className="pl-9 h-full bg-white border-gray-200 w-full"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    </div>

                    <DataTable
                        title="Mock Interviews"
                        description={`${filteredMockInterviews.length} interview(s) found`}
                        data={filteredMockInterviews}
                        columns={columns}
                        keyExtractor={(interview) => interview.id}
                        emptyState={{
                            message: 'No mock interviews found',
                            subMessage: searchQuery
                                ? `No mock interviews found matching "${searchQuery}"`
                                : `No ${selectedTab} mock interviews found.`,
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

                {currentView === 'view' && selectedInterview && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <DetailHeader
                        title={selectedInterview.title}
                        type={formatMode(selectedInterview.ai_generation_mode)}
                        status={selectedInterview.publish_status}
                        organizer="AI Interview Suite"
                        createdAt={selectedInterview.created_at}
                        onEdit={() => openEditForm(selectedInterview)}
                        stats={[
                            { label: 'Duration', value: `${selectedInterview.max_duration} mins`, icon: Clock, iconColorClass: 'text-blue-500' },
                            { label: 'Participants', value: selectedInterview.participants || 0, icon: Users, iconColorClass: 'text-green-500' },
                            { label: 'Coding Qs', value: selectedInterview.ai_coding_range, icon: BarChart2, iconColorClass: 'text-orange-500' }
                    ]}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-500" />
                            Description
                        </h3>
                        <p className="text-slate-700 whitespace-pre-wrap">
                            {selectedInterview.description || 'No description provided.'}
                        </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-slate-500" />
                            Interview Setup
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Required Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedInterview.required_skills.length > 0
                                ? selectedInterview.required_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)
                                : <span className="text-sm text-slate-500">None</span>}
                            </div>
                            </div>
                            <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Optional Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedInterview.optional_skills.length > 0
                                ? selectedInterview.optional_skills.map((s) => <Badge key={s} variant="secondary" className="bg-white text-gray-700 border-0">{s}</Badge>)
                                : <span className="text-sm text-slate-500">None</span>}
                            </div>
                            </div>
                            <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">AI Mode</p>
                            <Badge className={`capitalize border-0 ${getModeColor(selectedInterview.ai_generation_mode)}`}>
                                {formatMode(selectedInterview.ai_generation_mode)}
                            </Badge>
                            </div>
                            <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Voice</p>
                            <div className="flex items-center gap-2 text-slate-800">
                                <Mic className="w-4 h-4 text-slate-500" />
                                <span>{selectedInterview.voice_type} ({selectedInterview.voice_speed}x)</span>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Instructions</h3>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {selectedInterview.instructions || 'No instructions provided.'}
                        </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex gap-3">
                            <button
                            onClick={() => openEditForm(selectedInterview)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                            >
                            Edit Interview
                            </button>
                            <button
                            onClick={() => handleDelete(selectedInterview.id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                            Delete
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}