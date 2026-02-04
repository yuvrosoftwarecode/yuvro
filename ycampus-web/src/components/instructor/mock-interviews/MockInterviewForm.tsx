import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import QuestionBank from '@/components/common/QuestionBank';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { mockInterviewService } from '@/services/mockInterviewService';
import { fetchQuestionById } from '@/services/questionService';

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
    ai_verbal_question_count: 5,
    ai_coding_question_count: 1,

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
          ai_verbal_question_count: data.ai_verbal_question_count || 5,
          ai_coding_question_count: data.ai_coding_question_count || 1,

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

      // Process questions before submitting
      const questionsConfig = await categorizeQuestionsByType(selectedQuestions);

      const payload: any = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        max_duration: Number(formData.max_duration),

        ai_generation_mode: formData.ai_generation_mode,
        ai_percentage: formData.ai_percentage,
        ai_verbal_question_count: Number(formData.ai_verbal_question_count),
        ai_coding_question_count: Number(formData.ai_coding_question_count),

        voice_type: formData.voice_type,
        interviewer_name: formData.interviewer_name,
        interviewer_voice_id: formData.interviewer_voice_id,
        voice_speed: Number(formData.voice_speed),

        required_skills: formData.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        optional_skills: formData.optional_skills.split(',').map(s => s.trim()).filter(Boolean),

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
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
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="details">Basic Info</TabsTrigger>
                  <TabsTrigger value="ai_config">AI Config</TabsTrigger>
                  <TabsTrigger value="voice_config">Voice & Audio</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
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

                {/* AI Config Tab */}
                <TabsContent value="ai_config" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" /> AI Generation Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Generation Mode</label>
                        <select value={formData.ai_generation_mode} onChange={e => setFormData({ ...formData, ai_generation_mode: e.target.value as any })} className="w-full border rounded px-3 py-2">
                          <option value="full_ai">Full AI (AI decides everything based on skills)</option>
                          <option value="mixed">Mixed (AI + Predefined Questions)</option>
                          <option value="predefined">Predefined Questions Only</option>
                        </select>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Verbal Questions Count</label>
                          <Input type="number" value={formData.ai_verbal_question_count} onChange={e => setFormData({ ...formData, ai_verbal_question_count: parseInt(e.target.value) })} min={0} />
                          <p className="text-xs text-gray-500 mt-1">Number of verbal/theory questions AI should generate.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Coding Questions Count</label>
                          <Input type="number" value={formData.ai_coding_question_count} onChange={e => setFormData({ ...formData, ai_coding_question_count: parseInt(e.target.value) })} min={0} />
                          <p className="text-xs text-gray-500 mt-1">Number of coding challenges AI should generate.</p>
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
                        <select
                          value={formData.interviewer_voice_id}
                          onChange={e => setFormData({ ...formData, interviewer_voice_id: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">-- Select a Google Voice --</option>
                          {availableVoices.map((voice, idx) => (
                            <option key={idx} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
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
                  <button
                    type="button"
                    onClick={() => navigate('/instructor/mock-interview')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isEditMode ? 'Update Mock Interview' : 'Create Mock Interview'}
                  </Button>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}