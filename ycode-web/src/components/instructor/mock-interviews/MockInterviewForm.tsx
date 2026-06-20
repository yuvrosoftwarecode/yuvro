import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText, Plus, Minus } from 'lucide-react';
import QuestionBank from '@/components/common/QuestionBank';
import { toast } from 'sonner';
import DashboardLayout from '@/components/common/DashboardLayout';
import { mockInterviewService } from '@/services/mockInterviewService';
import { fetchQuestionById } from '@/services/questionService';
import ProctoringSettingsCard from '../shared/ProctoringSettingsCard';

export default function MockInterviewForm() {
  const navigate = useNavigate();
  const { mockInterviewId } = useParams<{ mockInterviewId: string }>();
  const isEditMode = !!mockInterviewId;

  const [currentFormTab, setCurrentFormTab] = useState('details');
  const [loading, setLoading] = useState(false);

  // Voice State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewText, setPreviewText] = useState('Hello! I am your interviewer for today. How are you doing?');

  // Questions State
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [randomQuestionsConfig, setRandomQuestionsConfig] = useState({
    mcq_single: 0,
    mcq_multiple: 0,
    coding: 0,
    descriptive: 0
  });

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter for useful voices (optional, but keeping all for now as user requested "all")
      // Sorting to put Google voices on top might be nice
      voices.sort((a, b) => {
        if (a.name.includes('Google') && !b.name.includes('Google')) return -1;
        if (!a.name.includes('Google') && b.name.includes('Google')) return 1;
        return a.name.localeCompare(b.name);
      });
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    }
  }, []);

  const categorizeQuestionsByType = async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      return {
        mcq_single: [],
        mcq_multiple: [],
        coding: [],
        descriptive: []
      };
    }

    try {
      const questionPromises = questionIds.map(id => fetchQuestionById(id));
      const questions = await Promise.all(questionPromises);

      const categorized: any = {
        mcq_single: [],
        mcq_multiple: [],
        coding: [],
        descriptive: []
      };

      questions.forEach(question => {
        if (question.type === 'mcq_single') {
          categorized.mcq_single.push(question.id);
        } else if (question.type === 'mcq_multiple') {
          categorized.mcq_multiple.push(question.id);
        } else if (question.type === 'coding') {
          categorized.coding.push(question.id);
        } else if (question.type === 'descriptive') {
          categorized.descriptive.push(question.id);
        }
      });

      return categorized;
    } catch (error) {
      console.error('Failed to categorize questions:', error);
      return {
        mcq_single: questionIds, // Fallback
        mcq_multiple: [],
        coding: [],
        descriptive: []
      };
    }
  };

  const handleQuestionsChange = async (questions: string[]) => {
    setSelectedQuestions(questions);
    // We don't update formData.questions_config immediately here because it's async
    // We will categorize on submit or we can keep a separate state for questions_config if needed
    // But for simplicity in this form structure, let's categorize and update formData here if we want immediate sync
    // However, handleSubmit uses formData. So let's update a ref or similar, or just categorize on submit?
    // Better: Update formData.questions_config here.

    const categorized = await categorizeQuestionsByType(questions);
    setFormData((prev: any) => ({ ...prev, questions_config: categorized }));
  };

  const playVoicePreview = (voiceName: string, text: string) => {
    window.speechSynthesis.cancel();
    if (!voiceName) {
      toast.error("Please select a voice actor first.");
      return;
    }
    const voice = availableVoices.find(v => v.name === voiceName);
    if (!voice) {
      toast.error("Selected voice not found on this system.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = formData.voice_speed;
    window.speechSynthesis.speak(utterance);
  };


  // Form State matching the new model
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    max_duration: 30, // Default 30 mins

    // AI Config
    ai_generation_mode: 'full_ai' as 'full_ai' | 'mixed' | 'predefined',
    ai_percentage: 100,
    ai_context: {
      intern: { context_str: '', coding_questions_count: 0 },
      beginner: { context_str: '', coding_questions_count: 1 },
      '1_3_years': { context_str: '', coding_questions_count: 1 },
      '3_plus_years': { context_str: '', coding_questions_count: 2 }
    },

    // Voice Config
    voice_type: 'junnu' as 'junnu' | 'munnu', // Deprecated but kept for type safety if needed temporarily
    interviewer_name: 'Junnu',
    interviewer_voice_id: '',
    voice_speed: 1.0,

    // Skills (comma separated for input)
    required_skills: '',
    optional_skills: '',

    // Publish
    publish_status: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',

    questions_config: {} as any,
    questions_random_config: {} as any
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

          ai_generation_mode: data.ai_generation_mode || 'full_ai',
          ai_percentage: data.ai_percentage || 100,
          ai_context: (() => {
            const defaultCodingCount = data.ai_coding_question_count ?? 1;
            
            if (Array.isArray(data.ai_context)) {
              // Backward compatibility for flat array
              const oldStr = data.ai_context.join(', ');
              return {
                intern: { context_str: oldStr, coding_questions_count: defaultCodingCount },
                beginner: { context_str: oldStr, coding_questions_count: defaultCodingCount },
                '1_3_years': { context_str: oldStr, coding_questions_count: defaultCodingCount },
                '3_plus_years': { context_str: oldStr, coding_questions_count: defaultCodingCount }
              };
            } else if (typeof data.ai_context === 'object' && data.ai_context !== null) {
              const safeParseLevel = (levelData: any) => {
                  if (!levelData) return { context_str: '', coding_questions_count: defaultCodingCount };
                  if (Array.isArray(levelData)) {
                       return { context_str: levelData.join(', '), coding_questions_count: defaultCodingCount };
                  }
                  if (typeof levelData === 'object' && !Array.isArray(levelData)) {
                       return {
                           context_str: Array.isArray(levelData.context) ? levelData.context.join(', ') : '',
                           coding_questions_count: typeof levelData.coding_questions_count === 'number' ? levelData.coding_questions_count : defaultCodingCount
                       };
                  }
                  return { context_str: '', coding_questions_count: defaultCodingCount };
              };

              return {
                intern: safeParseLevel(data.ai_context.intern),
                beginner: safeParseLevel(data.ai_context.beginner),
                '1_3_years': safeParseLevel(data.ai_context['1_3_years']),
                '3_plus_years': safeParseLevel(data.ai_context['3_plus_years'])
              };
            }
            return {
              intern: { context_str: '', coding_questions_count: defaultCodingCount },
              beginner: { context_str: '', coding_questions_count: defaultCodingCount },
              '1_3_years': { context_str: '', coding_questions_count: defaultCodingCount },
              '3_plus_years': { context_str: '', coding_questions_count: defaultCodingCount }
            };
          })(),

          voice_type: data.voice_type || 'junnu',
          interviewer_name: data.interviewer_name || 'Junnu',
          interviewer_voice_id: data.interviewer_voice_id || '',
          voice_speed: data.voice_speed || 1.0,

          required_skills: (data.required_skills || []).join(', '),
          optional_skills: (data.optional_skills || []).join(', '),

          publish_status: data.publish_status || 'draft',
          questions_config: data.questions_config || {},
          questions_random_config: data.questions_random_config || {}
        });

        // Initialize question states
        const allQuestions = [
          ...(data.questions_config?.mcq_single || []),
          ...(data.questions_config?.mcq_multiple || []),
          ...(data.questions_config?.coding || []),
          ...(data.questions_config?.descriptive || [])
        ];
        setSelectedQuestions(allQuestions);
        setRandomQuestionsConfig(data.questions_random_config || {
          mcq_single: 0,
          mcq_multiple: 0,
          coding: 0,
          descriptive: 0
        });
      } catch (error) {
        console.error('Failed to fetch mock interview:', error);
        toast.error('Failed to load mock interview');
        navigate('/instructor/mock-interview');
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

      const totalQuestionCount = selectedQuestions.length
        + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0);

      if (formData.ai_generation_mode !== 'full_ai' && totalQuestionCount === 0) {
        setCurrentFormTab('questions');
        toast.error('Please add at least one question (selected or random) before saving.');
        setLoading(false);
        return;
      }

      // Process questions before submitting
      const questionsConfig = await categorizeQuestionsByType(selectedQuestions);

      const payload: any = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        max_duration: Number(formData.max_duration),

        ai_generation_mode: formData.ai_generation_mode,
        ai_percentage: formData.ai_percentage,
        ai_context: {
          intern: {
             context: formData.ai_context.intern.context_str.split(',').map((s: string) => s.trim()).filter(Boolean),
             coding_questions_count: Number(formData.ai_context.intern.coding_questions_count)
          },
          beginner: {
             context: formData.ai_context.beginner.context_str.split(',').map((s: string) => s.trim()).filter(Boolean),
             coding_questions_count: Number(formData.ai_context.beginner.coding_questions_count)
          },
          '1_3_years': {
             context: formData.ai_context['1_3_years'].context_str.split(',').map((s: string) => s.trim()).filter(Boolean),
             coding_questions_count: Number(formData.ai_context['1_3_years'].coding_questions_count)
          },
          '3_plus_years': {
             context: formData.ai_context['3_plus_years'].context_str.split(',').map((s: string) => s.trim()).filter(Boolean),
             coding_questions_count: Number(formData.ai_context['3_plus_years'].coding_questions_count)
          },
        },

        voice_type: formData.voice_type,
        interviewer_name: formData.interviewer_name,
        interviewer_voice_id: formData.interviewer_voice_id,
        voice_speed: Number(formData.voice_speed),

        required_skills: formData.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean),
        optional_skills: formData.optional_skills.split(',').map((s: string) => s.trim()).filter(Boolean),

        publish_status: formData.publish_status,
        questions_config: questionsConfig,
        questions_random_config: randomQuestionsConfig
      };

      console.debug('Submitting mock interview payload:', payload);

      if (isEditMode && mockInterviewId) {
        await mockInterviewService.updateMockInterview(mockInterviewId, payload);
        toast.success('Mock interview updated');
      } else {
        await mockInterviewService.createMockInterview(payload);
        toast.success('Mock interview created');
      }

      navigate('/instructor/mock-interview', { state: { refreshedAt: Date.now() } });
    } catch (error) {
      console.error('Failed to save :', error);
      toast.error('Failed to save mock interview');
    } finally {
      setLoading(false);
    }
  };

  const tabOrder = ['details', 'questions', 'ai_config', 'voice_config'];

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
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title={getHeaderTitle()}
      subtitle={getHeaderSubtitle()}
      actions={
        <button
          type="button"
          onClick={() => navigate('/instructor/mock-interview')}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
        >
          ← Back to List
        </button>
      }
    >
      <div className="px-6 py-6">
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
            <TabsList className="inline-flex w-auto gap-1">
              <TabsTrigger value="details" className="px-5">Basic Info</TabsTrigger>
              <TabsTrigger value="questions" className="px-5">Questions</TabsTrigger>
              <TabsTrigger value="ai_config" className="px-5">AI Config</TabsTrigger>
              <TabsTrigger value="voice_config" className="px-5">Audio Settings</TabsTrigger>
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
                    <Select
                      value={formData.publish_status}
                      onValueChange={(value) => setFormData({ ...formData, publish_status: value as any })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ProctoringSettingsCard
                    enableProctoring={true}
                    onEnableProctoringChange={() => {}}
                    alwaysEnabled={true}
                    className="mt-4"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Config Tab */}
            <TabsContent value="ai_config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" /> AI Generation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Generation Mode</label>
                    <Select
                      value={formData.ai_generation_mode}
                      onValueChange={(value) => setFormData({ ...formData, ai_generation_mode: value as any })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select generation mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_ai">Full AI (AI decides everything based on skills)</SelectItem>
                        <SelectItem value="mixed">Mixed (AI + Predefined Questions)</SelectItem>
                        <SelectItem value="predefined">Predefined Questions Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Controls how questions are selected for the interview.</p>
                  </div>

                  {formData.ai_generation_mode === 'mixed' && (
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50">
                      <div>
                        <label className="block text-sm font-medium mb-1">AI Generated (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={formData.ai_percentage}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setFormData({ ...formData, ai_percentage: val });
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Questions to be generated by AI.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fixed Questions (%)</label>
                        <Input
                          disabled
                          value={100 - (formData.ai_percentage || 0)}
                          className="bg-gray-100 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Remaining % will be from fixed/random question bank.
                        </p>
                      </div>
                    </div>
                  )}



                  <div className="mt-4 border-t pt-4 border-gray-100">
                    <h3 className="text-sm font-medium mb-3">AI Context by Experience Level</h3>
                    <p className="text-xs text-gray-500 mb-4">Provide comma-separated specific focus areas or roles for the AI based on candidate's experience.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Intern */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700">Intern</label>                          <div className="flex items-center gap-0 bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm h-8">
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context.intern.coding_questions_count;
                                if (current > 0) {
                                  setFormData({
                                    ...formData,
                                    ai_context: {
                                      ...formData.ai_context,
                                      intern: { ...formData.ai_context.intern, coding_questions_count: current - 1 }
                                    }
                                  });
                                }
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-r"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="px-3 min-w-[32px] text-center text-sm font-bold text-gray-700">
                              {formData.ai_context.intern.coding_questions_count}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context.intern.coding_questions_count;
                                setFormData({
                                  ...formData,
                                  ai_context: {
                                    ...formData.ai_context,
                                    intern: { ...formData.ai_context.intern, coding_questions_count: current + 1 }
                                  }
                                });
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-l"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <Textarea 
                          value={formData.ai_context.intern.context_str} 
                          onChange={e => setFormData({ 
                            ...formData, 
                            ai_context: { 
                              ...formData.ai_context, 
                              intern: { ...formData.ai_context.intern, context_str: e.target.value } 
                            } 
                          })} 
                          placeholder="e.g. Fundamental DSA questions like arrays and strings" 
                          rows={4}
                        />
                      </div>

                      {/* Beginner */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700">Beginner (0-1 yrs)</label>
                          <div className="flex items-center gap-0 bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm h-8">
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context.beginner.coding_questions_count;
                                if (current > 0) {
                                  setFormData({
                                    ...formData,
                                    ai_context: {
                                      ...formData.ai_context,
                                      beginner: { ...formData.ai_context.beginner, coding_questions_count: current - 1 }
                                    }
                                  });
                                }
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-r"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="px-3 min-w-[32px] text-center text-sm font-bold text-gray-700">
                              {formData.ai_context.beginner.coding_questions_count}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context.beginner.coding_questions_count;
                                setFormData({
                                  ...formData,
                                  ai_context: {
                                    ...formData.ai_context,
                                    beginner: { ...formData.ai_context.beginner, coding_questions_count: current + 1 }
                                  }
                                });
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-l"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <Textarea 
                          value={formData.ai_context.beginner.context_str} 
                          onChange={e => setFormData({ 
                            ...formData, 
                            ai_context: { 
                              ...formData.ai_context, 
                              beginner: { ...formData.ai_context.beginner, context_str: e.target.value } 
                            } 
                          })} 
                          placeholder="e.g. Junior developer projects" 
                          rows={4}
                        />
                      </div>

                      {/* Intermediate */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700">Intermediate (1-3 yrs)</label>
                          <div className="flex items-center gap-0 bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm h-8">
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context['1_3_years'].coding_questions_count;
                                if (current > 0) {
                                  setFormData({
                                    ...formData,
                                    ai_context: {
                                      ...formData.ai_context,
                                      '1_3_years': { ...formData.ai_context['1_3_years'], coding_questions_count: current - 1 }
                                    }
                                  });
                                }
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-r"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="px-3 min-w-[32px] text-center text-sm font-bold text-gray-700">
                              {formData.ai_context['1_3_years'].coding_questions_count}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context['1_3_years'].coding_questions_count;
                                setFormData({
                                  ...formData,
                                  ai_context: {
                                    ...formData.ai_context,
                                    '1_3_years': { ...formData.ai_context['1_3_years'], coding_questions_count: current + 1 }
                                  }
                                });
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-l"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <Textarea 
                          value={formData.ai_context['1_3_years'].context_str} 
                          onChange={e => setFormData({ 
                            ...formData, 
                            ai_context: { 
                              ...formData.ai_context, 
                              '1_3_years': { ...formData.ai_context['1_3_years'], context_str: e.target.value } 
                            } 
                          })} 
                          placeholder="e.g. System design basics, architecture" 
                          rows={4}
                        />
                      </div>

                      {/* Experienced */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700">Experienced (3+ yrs)</label>
                          <div className="flex items-center gap-0 bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm h-8">
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context['3_plus_years'].coding_questions_count;
                                if (current > 0) {
                                  setFormData({
                                    ...formData,
                                    ai_context: {
                                      ...formData.ai_context,
                                      '3_plus_years': { ...formData.ai_context['3_plus_years'], coding_questions_count: current - 1 }
                                    }
                                  });
                                }
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-r"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="px-3 min-w-[32px] text-center text-sm font-bold text-gray-700">
                              {formData.ai_context['3_plus_years'].coding_questions_count}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.ai_context['3_plus_years'].coding_questions_count;
                                setFormData({
                                  ...formData,
                                  ai_context: {
                                    ...formData.ai_context,
                                    '3_plus_years': { ...formData.ai_context['3_plus_years'], coding_questions_count: current + 1 }
                                  }
                                });
                              }}
                              className="px-2 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 border-l"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <Textarea 
                          value={formData.ai_context['3_plus_years'].context_str} 
                          onChange={e => setFormData({ 
                            ...formData, 
                            ai_context: { 
                              ...formData.ai_context, 
                              '3_plus_years': { ...formData.ai_context['3_plus_years'], context_str: e.target.value } 
                            } 
                          })} 
                          placeholder="e.g. Scalability, advanced microservices" 
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Config Tab */}
            <TabsContent value="voice_config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-green-500" /> Voice & Audio Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Interviewer Name</label>
                      <Input
                        value={formData.interviewer_name}
                        onChange={e => setFormData({ ...formData, interviewer_name: e.target.value })}
                        placeholder="e.g. Junnu, Sarah, Mike"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Voice Speed (0.5x - 2.0x)</label>
                      <Input type="number" value={formData.voice_speed} onChange={e => setFormData({ ...formData, voice_speed: parseFloat(e.target.value) })} min={0.5} max={2.0} step={0.1} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Select Voice Actor</label>
                    <Select
                      value={formData.interviewer_voice_id}
                      onValueChange={(value) => setFormData({ ...formData, interviewer_voice_id: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- Select a Google Voice --" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.map((voice, idx) => (
                          <SelectItem key={`${voice.name}-${idx}`} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))}
                        {availableVoices.length === 0 && (
                          <SelectItem value="placeholder" disabled>No voices available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Note: Available voices depend on your browser and operating system. Google voices are recommended for best quality.
                    </p>
                  </div>

                  {/* Voice Preview Section */}
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                    <label className="block text-sm font-medium mb-2">Voice Preview</label>
                    <div className="flex gap-2">
                      <Input
                        value={previewText}
                        onChange={e => setPreviewText(e.target.value)}
                        placeholder="Type something to hear the voice..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => playVoicePreview(formData.interviewer_voice_id, previewText)}
                        variant="outline"
                      >
                        Play Preview
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-6">
              {/* Random Questions Configuration */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-orange-500" />
                    Random Questions Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Single Choice</label>
                      <Input
                        type="number"
                        min="0"
                        value={randomQuestionsConfig.mcq_single}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandomQuestionsConfig(prev => ({
                          ...prev,
                          mcq_single: parseInt(e.target.value) || 0
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple Choice</label>
                      <Input
                        type="number"
                        min="0"
                        value={randomQuestionsConfig.mcq_multiple}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandomQuestionsConfig(prev => ({
                          ...prev,
                          mcq_multiple: parseInt(e.target.value) || 0
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Coding Questions</label>
                      <Input
                        type="number"
                        min="0"
                        value={randomQuestionsConfig.coding}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandomQuestionsConfig(prev => ({
                          ...prev,
                          coding: parseInt(e.target.value) || 0
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Questions</label>
                      <Input
                        type="number"
                        min="0"
                        value={randomQuestionsConfig.descriptive}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRandomQuestionsConfig(prev => ({
                          ...prev,
                          descriptive: parseInt(e.target.value) || 0
                        }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Specify how many questions of each type should be randomly selected from the question bank.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500" /> Specific Question Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.ai_generation_mode === 'full_ai' && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4 text-sm text-yellow-800">
                      Note: In "Full AI" mode, specific questions selected here might be ignored or used only as context. Use "Mixed" mode to enforce specific questions.
                    </div>
                  )}

                  <QuestionBank
                    mode="selection"
                    selectedQuestions={selectedQuestions}
                    onQuestionsChange={handleQuestionsChange}
                    allowMultipleSelection={true}
                    showSplitView={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/instructor/mock-interview')}
              >
                Cancel
              </Button>
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

    </DashboardLayout >
  );
}
