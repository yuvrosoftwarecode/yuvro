import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Eye, Trash2, Plus, BarChart2, Brain, CheckCircle, Clock, FileText, Mic, Settings, Users, FilterX, Power } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";

import { mockInterviewService } from '@/services/mockInterviewService';
import DetailHeader from '@/components/common/DetailHeader';
import PageHeader from '@/components/common/PageHeader';

// Redefine local interface to match the VIEW requirements, but aligned with new backend data
interface MockInterviewUI {
  id: string;
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  required_skills: string[];
  optional_skills: string[];

  publish_status: string;
  participants: number;
  created_at?: string;
}

function mapMockInterviewFromBackend(c: any): MockInterviewUI {
  return {
    id: String(c.id),
    title: c.title,
    description: c.description ?? '',
    instructions: c.instructions ?? '',
    max_duration: c.max_duration ?? 60,
    required_skills: c.required_skills ?? [],
    optional_skills: c.optional_skills ?? [],
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
      interview.description
    ].some(field => (field || '').toString().toLowerCase().includes(q));

    const status = (interview.publish_status || '').toLowerCase();
    const matchesTab = selectedTab === 'all' || status === selectedTab;

    return matchesSearch && matchesTab;
  });

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'view': return 'Mock Interview Details';
      default: return 'Mock Interview Management';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'view': return 'Review interview configuration and skills';
      default: return 'Create and manage predefined question-tree interviews';
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
      header: 'Duration',
      cell: (interview) => `${interview.max_duration} mins`
    },
    {
      header: 'Status',
      cell: (interview) => <Badge status={interview.publish_status} />
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
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-6 bg-background overflow-y-auto">
            <div className="flex flex-col space-y-6 max-w-7xl mx-auto">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{getHeaderTitle()}</h1>
                  <p className="text-muted-foreground">{getHeaderSubtitle()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {currentView === 'list' ? (
                    <Button
                      onClick={() => navigate('/admin/mock-interview/add')}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Mock Interview
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setCurrentView('list');
                        setSelectedInterview(null);
                      }}
                      className="variant-outline"
                    >
                      Back to List
                    </Button>
                  )}
                </div>
              </div>

              {currentView === 'list' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="w-full md:max-w-72 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search interviews..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary h-10 w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <select
                          value={selectedTab}
                          onChange={(e) => setSelectedTab(e.target.value)}
                          className="h-10 border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active Only</option>
                          <option value="draft">Draft Only</option>
                          <option value="archived">Archived Only</option>
                        </select>

                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchQuery('')}
                            className="text-primary hover:bg-primary/10 h-10 px-3"
                          >
                            <FilterX className="w-4 h-4 mr-2" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-6 w-full max-w-full overflow-x-auto pb-2 scrollbar-none">
                      <TabsList className="bg-muted inline-flex w-auto min-w-full sm:min-w-0">
                        <TabsTrigger value="all" className="px-3 sm:px-4">All Interviews</TabsTrigger>
                        <TabsTrigger value="active" className="px-3 sm:px-4">Active</TabsTrigger>
                        <TabsTrigger value="draft" className="px-3 sm:px-4">Drafts</TabsTrigger>
                        <TabsTrigger value="archived" className="px-3 sm:px-4">Archived</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="overflow-x-auto border rounded-md">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-[450px]">Interview</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell text-center">Participants</TableHead>
                            <TableHead className="text-right pr-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMockInterviews.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                No mock interviews found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredMockInterviews.map((interview) => (
                              <TableRow key={interview.id} className="group hover:bg-muted/20">
                                <TableCell>
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => openViewForm(interview)}
                                      className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                                    >
                                      {interview.title}
                                    </button>
                                    <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {interview.max_duration} mins
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className={cn("h-2 w-2 rounded-full", 
                                      interview.publish_status === 'active' ? "bg-emerald-500" : 
                                      interview.publish_status === 'draft' ? "bg-orange-400" : "bg-destructive")} 
                                    />
                                    <span className="text-sm font-medium capitalize">{interview.publish_status}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="flex items-center justify-center gap-1.5 text-sm">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    {interview.participants || 0}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                      onClick={() => openViewForm(interview)}
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                                      onClick={() => openEditForm(interview)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-indigo-600 hover:text-indigo-600 hover:bg-indigo-50"
                                      onClick={() => navigate(`/admin/mock-interview/${interview.id}/analytics`)}
                                      title="Analytics"
                                    >
                                      <BarChart2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDelete(interview.id)}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentView === 'view' && selectedInterview && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <DetailHeader
                    title={selectedInterview.title}
                    type="Interview Program"
                    status={selectedInterview.publish_status}
                    organizer="Interview Academy"
                    createdAt={selectedInterview.created_at}
                    onEdit={() => openEditForm(selectedInterview)}
                    stats={[
                      { label: 'Duration', value: `${selectedInterview.max_duration} mins`, icon: Clock, iconColorClass: 'text-blue-500' },
                      { label: 'Participants', value: selectedInterview.participants || 0, icon: Users, iconColorClass: 'text-green-500' }
                    ]}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <Card className="border shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-slate-500" />
                          Description
                        </h3>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {selectedInterview.description || 'No description provided.'}
                        </p>
                      </Card>

                      <Card className="border shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Settings className="w-5 h-5 text-slate-500" />
                          Interview Setup
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Required Skills</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedInterview.required_skills.length > 0
                                ? selectedInterview.required_skills.map((s) => <Badge key={s} variant="secondary" className="px-2.5 py-1">{s}</Badge>)
                                : <span className="text-sm text-slate-500 italic">None specified</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Optional Skills</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedInterview.optional_skills.length > 0
                                ? selectedInterview.optional_skills.map((s) => <Badge key={s} variant="outline" className="px-2.5 py-1">{s}</Badge>)
                                : <span className="text-sm text-slate-500 italic">None specified</span>}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      <Card className="border shadow-sm p-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Instructions</h3>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {selectedInterview.instructions || 'No special instructions for participants.'}
                        </p>
                      </Card>

                      <Card className="border shadow-sm p-4 bg-muted/20">
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => openEditForm(selectedInterview)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Configuration
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(selectedInterview.id)}
                            className="w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Interview
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
  );
}