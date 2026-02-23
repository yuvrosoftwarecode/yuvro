import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Calendar, Clock, Building2, GraduationCap, Pencil, Trash2, Eye, FileText, Code, CheckCircle, Mic, Brain, Settings } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/common/StatusBadge';
import DashboardLayout from '@/components/common/DashboardLayout';
import SearchBar from '@/components/common/SearchBar';
import { useAuth } from "@/contexts/AuthContext";
import { mockInterviewService } from '@/services/mockInterviewService';
import { Question } from '@/services/questionService';
// Assuming Question type is needed for the preview, if not import it or define it. 
// Note: original code imported Question implicitly or it was missing in the view.
// Let's assume we can treat questions as any for the UI preview or minimal type.

// Redefine local interface to match the VIEW requirements, but aligned with new backend data
interface MockInterviewUI {
  id: string;
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  // AI Params
  ai_generation_mode: string;
  ai_verbal_question_count: number;
  ai_coding_question_count: number;

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
    ai_verbal_question_count: c.ai_verbal_question_count ?? 0,
    ai_coding_question_count: c.ai_coding_question_count ?? 0,

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
  const { token } = useAuth();
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
    navigate(`/instructor/mock-interview/${interview.id}/edit`);
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
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'view': return `Interview Details: ${selectedInterview?.title}`;
      default: return 'Mock Interview Management';
    }
  };

  const headerActions = currentView === 'list' ? (
    <button
      onClick={() => navigate('/instructor/mock-interview/add')}
      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
    >
      + Add Mock Interview
    </button>
  ) : (
    <button
      onClick={() => {
        setCurrentView('list');
        setSelectedInterview(null);
      }}
      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
    >
      ← Back to List
    </button>
  );

  return (
    <DashboardLayout
      title={getHeaderTitle()}
      subtitle="Manage AI-powered mock interviews"
      actions={headerActions}
    >
      <div className="px-6 py-6">

        {currentView === 'list' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-md font-medium text-gray-600">Total Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold">{mockInterviews.length}</div>
                    <Brain className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-md font-medium text-gray-600">Published</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold">{mockInterviews.filter(c => c.publish_status === 'active').length}</div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-md font-medium text-gray-600">Drafts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gray-600">{mockInterviews.filter(c => c.publish_status === 'draft').length}</div>
                    <Pencil className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-md font-medium text-gray-600">Archived</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold">{mockInterviews.filter(c => c.publish_status === 'archived').length}</div>
                    <Trash2 className="h-8 w-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex w-full items-center gap-4 h-12">
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex items-center">
                  <TabsList className="inline-flex w-auto gap-1">
                    <TabsTrigger value="all" className="px-6">All</TabsTrigger>
                    <TabsTrigger value="active" className="px-6">Active</TabsTrigger>
                    <TabsTrigger value="draft" className="px-6">Draft</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="group relative h-full flex items-center">
                  <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                </div>
              </div>
            </div>
          </>
        )}

        {currentView === 'view' && selectedInterview && (
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <div className="space-y-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-blue-500" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <div className="text-gray-900 font-medium">{selectedInterview.title}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <StatusBadge status={selectedInterview.publish_status} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <div className="text-gray-900">{selectedInterview.description || 'No description provided'}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">AI Mode</label>
                      <Badge className={`capitalize border-0 ${getModeColor(selectedInterview.ai_generation_mode)}`}>
                        {selectedInterview.ai_generation_mode.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900">{selectedInterview.voice_type} ({selectedInterview.voice_speed}x)</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <div className="text-gray-900">{selectedInterview.max_duration} mins</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-purple-500" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedInterview.required_skills.length > 0 ? (
                          selectedInterview.required_skills.map(s => (
                            <Badge key={s} variant="secondary">{s}</Badge>
                          ))
                        ) : <span className="text-gray-500 text-sm">None</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Optional Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedInterview.optional_skills.length > 0 ? (
                          selectedInterview.optional_skills.map(s => (
                            <Badge key={s} variant="secondary" className="bg-gray-100 text-gray-700 border-0">{s}</Badge>
                          ))
                        ) : <span className="text-gray-500 text-sm">None</span>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Verbal Questions</label>
                      <div className="text-2xl font-bold">{selectedInterview.ai_verbal_question_count}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coding Questions</label>
                      <div className="text-2xl font-bold">{selectedInterview.ai_coding_question_count}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => openEditForm(selectedInterview)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
        )}

        {currentView === 'list' && (
          <>
            <Card className="border border-gray-200 rounded-lg">
              <CardHeader className="pb-1">
                <CardTitle className="text-2xl font-semibold">Mock Interviews</CardTitle>
                <CardDescription className="text-gray-600">
                  {filteredMockInterviews.length} interview(s) found
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 px-0 pb-0 p-5">
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <Table className="border border-gray-200 rounded-lg">
                    <TableHeader>
                      <TableRow className="border border-gray-200">
                        <TableHead>Title</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Questions (V/C)</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMockInterviews.map((interview) => (
                        <TableRow key={interview.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openViewForm(interview)}>
                          <TableCell className="font-medium">{interview.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`capitalize border-0 ${getModeColor(interview.ai_generation_mode)}`}>
                              {interview.ai_generation_mode.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{interview.max_duration} mins</TableCell>
                          <TableCell>
                            <StatusBadge status={interview.publish_status} />
                          </TableCell>
                          <TableCell>
                            {interview.ai_verbal_question_count} / {interview.ai_coding_question_count}
                          </TableCell>
                          <TableCell>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                              <div className="text-sm text-gray-500 flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {interview.participants || 0} participants
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/instructor/mock-interview/${interview.id}/analytics`);
                                  }}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                  title="View Analytics"
                                >
                                  <Trophy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditForm(interview);
                                  }}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(interview.id);
                                  }}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>          </TableCell>
                        </TableRow>
                      ))}
                      {filteredMockInterviews.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No mock interviews found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {filteredMockInterviews.length === 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No MockInterviews found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? `No MockInterviews found matching "${searchQuery}"` : `No ${selectedTab} MockInterviews found.`}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}