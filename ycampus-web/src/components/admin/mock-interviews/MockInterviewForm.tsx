import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, FileText, ArrowLeft, Plus, Minus, Trash2, ChevronRight, ChevronDown, MessageSquare, GitBranch, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { mockInterviewService } from '@/services/mockInterviewService';

export default function MockInterviewForm() {
  const navigate = useNavigate();
  const { mockInterviewId } = useParams<{ mockInterviewId: string }>();
  const isEditMode = !!mockInterviewId;

  const [currentFormTab, setCurrentFormTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Form State matching the new model
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    max_duration: 30,
    required_skills: '',
    optional_skills: '',
    publish_status: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
    predefined_tree: [] as any[]
  });

  const getHeaderTitle = () => {
    return isEditMode ? `Edit Mock Interview` : 'Add New Mock Interview';
  };

  const getHeaderSubtitle = () => {
    return isEditMode ? 'Modify mock interview settings' : 'Configure a new AI-driven mock interview';
  };

  useEffect(() => {
    if (!isEditMode) return;

      const fetchMockInterview = async () => {
        if (!mockInterviewId) return;

        setLoading(true);
        try {
          const data = await mockInterviewService.getMockInterview(mockInterviewId);
          setFormData({
            title: data.title,
            description: data.description,
            instructions: data.instructions || '',
            max_duration: data.max_duration || 30,
            required_skills: (data.required_skills || []).join(', '),
            optional_skills: (data.optional_skills || []).join(', '),
            publish_status: data.publish_status || 'draft',
            predefined_tree: data.predefined_tree || []
          });
        } catch (error) {
        console.error('Failed to fetch mock interview:', error);
        toast.error('Failed to load mock interview');
        navigate('/admin/mock-interview');
      } finally {
        setLoading(false);
      }
    };

    fetchMockInterview();
  }, [mockInterviewId, isEditMode]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!formData.title || !formData.title.trim()) {
        toast.error('Title is required');
        setLoading(false);
        return;
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        max_duration: Number(formData.max_duration),
        required_skills: formData.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        optional_skills: formData.optional_skills.split(',').map(s => s.trim()).filter(Boolean),
        publish_status: formData.publish_status,
        predefined_tree: formData.predefined_tree
      };

      if (isEditMode && mockInterviewId) {
        await mockInterviewService.updateMockInterview(mockInterviewId, payload);
        toast.success('Mock interview updated');
      } else {
        await mockInterviewService.createMockInterview(payload);
        toast.success('Mock interview created');
      }

      navigate('/admin/mock-interview', { state: { refreshedAt: Date.now() } });
    } catch (error) {
      console.error('Failed to save :', error);
      toast.error('Failed to save mock interview');
    } finally {
      setLoading(false);
    }
  };

  const tabOrder = ['details', 'questions'];

  const handlePrimaryAction = () => {
    const currentIndex = tabOrder.indexOf(currentFormTab);
    if (currentIndex < tabOrder.length - 1) {
      setCurrentFormTab(tabOrder[currentIndex + 1]);
      return;
    }
    handleSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                <Button
                  onClick={() => navigate('/admin/mock-interview')}
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </Button>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white p-1 rounded-lg">
                  <TabsTrigger value="details">Basic Info</TabsTrigger>
                  <TabsTrigger value="questions">Questions Tree</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-500" /> Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Title *</label>
                          <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Frontend Developer Interview" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Max Duration (minutes) *</label>
                          <Input type="number" value={formData.max_duration} onChange={e => setFormData({ ...formData, max_duration: parseInt(e.target.value) })} min={5} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Description of the interview..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Instructions *</label>
                        <Textarea value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} placeholder="Instructions for the candidate..." />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Required Skills (Comma separated)</label>
                          <Input value={formData.required_skills} onChange={e => setFormData({ ...formData, required_skills: e.target.value })} placeholder="React, TypeScript, CSS" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Optional Skills (Comma separated)</label>
                          <Input value={formData.optional_skills} onChange={e => setFormData({ ...formData, optional_skills: e.target.value })} placeholder="Redux, Node.js" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Publish Status</label>
                        <select value={formData.publish_status} onChange={e => setFormData({ ...formData, publish_status: e.target.value as any })} className="w-full border rounded px-3 py-2">
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Questions Tab */}
                <TabsContent value="questions" className="mt-0">
                  <div className="flex h-[calc(100vh-280px)] bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
                    {/* Left Sidebar: Questions List */}
                    <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                           <FileText className="w-4 h-4 text-purple-500" /> Main Questions
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            const newTree = [...(formData.predefined_tree || [])];
                            newTree.push({ text: 'New Question', follow_ups: [] });
                            setFormData({ ...formData, predefined_tree: newTree });
                            setActiveQuestionIndex(newTree.length - 1);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {(formData.predefined_tree || []).map((q: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveQuestionIndex(idx)}
                            className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all duration-200 group flex items-start gap-3 ${
                              activeQuestionIndex === idx 
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' 
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${activeQuestionIndex === idx ? 'bg-blue-600' : 'bg-slate-300'}`} />
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate font-medium">{q.text || `Question ${idx + 1}`}</p>
                              <div className="flex items-center gap-2 mt-1 opacity-60 text-[10px] uppercase font-bold">
                                {q.follow_ups?.length || 0} Follow-ups
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newTree = [...(formData.predefined_tree || [])];
                                newTree.splice(idx, 1);
                                setFormData({ ...formData, predefined_tree: newTree });
                                if (activeQuestionIndex >= newTree.length) setActiveQuestionIndex(Math.max(0, newTree.length - 1));
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Tree Visualizer */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-white">
                       {formData.predefined_tree && formData.predefined_tree[activeQuestionIndex] ? (
                         <div className="flex-1 flex flex-col">
                           <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                 <GitBranch className="w-4 h-4 text-purple-600" />
                               </div>
                               <div>
                                 <h4 className="font-bold text-slate-800 text-sm">Dialogue Flow</h4>
                                 <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Question {activeQuestionIndex + 1} • Interactive Visualizer</p>
                               </div>
                             </div>
                           </div>
                           <div className="flex-1 overflow-y-auto min-h-0 p-8 bg-slate-50/10 custom-scrollbar">
                              <div className="flex flex-col gap-10 max-w-4xl">
                                <VisualTreeEditor 
                                  node={formData.predefined_tree[activeQuestionIndex]}
                                  onUpdate={(newNode) => {
                                    const newTree = [...(formData.predefined_tree || [])];
                                    newTree[activeQuestionIndex] = newNode;
                                    setFormData({ ...formData, predefined_tree: newTree });
                                  }}
                                />
                              </div>
                           </div>
                         </div>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                              <FileText className="w-8 h-8 opacity-20" />
                            </div>
                            <h3 className="font-bold text-slate-600 mb-1">No Question Selected</h3>
                            <p className="text-sm max-w-xs mx-auto">Select a question from the sidebar or click "+" to create a new conversational path.</p>
                         </div>
                       )}
                    </div>
                  </div>
                </TabsContent>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/mock-interview')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-white"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handlePrimaryAction}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {tabOrder.indexOf(currentFormTab) < tabOrder.length - 1
                      ? 'Next'
                      : 'Finish'}
                  </Button>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

/**
 * Visual Tree Visualizer Node
 */
function VisualTreeEditor({ node, onUpdate, level = 1 }: { node: any, onUpdate: (node: any) => void, level?: number }) {
  const updateText = (text: string) => onUpdate({ ...node, text });
  
  const addFollowUp = () => {
    const followUps = [...(node.follow_ups || [])];
    followUps.push({ text: 'Next follow-up...', follow_ups: [] });
    onUpdate({ ...node, follow_ups: followUps });
  };

  const removeFollowUp = (idx: number) => {
    const followUps = [...(node.follow_ups || [])];
    followUps.splice(idx, 1);
    onUpdate({ ...node, follow_ups: followUps });
  };

  const updateFollowUp = (idx: number, newNode: any) => {
    const followUps = [...(node.follow_ups || [])];
    if (newNode === null) {
      followUps.splice(idx, 1);
    } else {
      followUps[idx] = newNode;
    }
    onUpdate({ ...node, follow_ups: followUps });
  };

  const colors = [
    { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600' },
    { bg: 'bg-blue-50/50', text: 'text-blue-900', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'bg-indigo-50/50', text: 'text-indigo-900', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  ];
  const style = colors[level - 1] || colors[0];  return (
    <div className="flex flex-col gap-0 group/node animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Current Node */}
      <div className="relative">
        <div className={`
          relative w-full max-w-[500px] p-4 rounded-xl border-2 transition-all duration-300
          ${style.bg} ${style.border} group-hover/node:shadow-md group-hover/node:border-blue-300
        `}>
          <div className="flex items-center justify-between mb-3">
             <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${style.badge}`}>
               L{level} Node
             </span>
             <div className="flex items-center gap-1">
               {level < 3 && (
                 <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={addFollowUp}
                  className="h-7 w-7 text-blue-600 hover:bg-blue-100 rounded-full"
                 >
                   <Plus className="w-4 h-4" />
                 </Button>
               )}
               {level > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdate(null)} // Handled by parent.
                    className="h-7 w-7 text-slate-300 hover:text-red-500 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
               )}
             </div>
          </div>
          <Textarea 
            value={node.text}
            onChange={e => updateText(e.target.value)}
            className="text-sm bg-transparent border-none focus-visible:ring-0 p-0 min-h-[40px] resize-none font-medium leading-relaxed"
            placeholder="Type your question here..."
          />
        </div>

        {/* Vertical Connector Line (down to children) */}
        {node.follow_ups && node.follow_ups.length > 0 && (
          <div className="absolute left-6 top-[calc(100%+2px)] w-[2px] h-4 bg-slate-200" />
        )}
      </div>

      {/* Children Nodes Column */}
      {node.follow_ups && node.follow_ups.length > 0 && (
        <div className="flex flex-col gap-4 mt-4 relative border-l-2 border-slate-100 ml-6 pl-10">
           {node.follow_ups.map((child: any, idx: number) => child && (
             <div key={idx} className="relative">
               {/* Horizontal Elbow Connector */}
               <div className="absolute -left-10 top-8 w-10 h-[2px] bg-slate-100" />
               
               <VisualTreeEditor 
                 node={child} 
                 level={level + 1}
                 onUpdate={(updated) => updateFollowUp(idx, updated)}
               />
             </div>
           ))}
        </div>
      )}
    </div>
  );
}