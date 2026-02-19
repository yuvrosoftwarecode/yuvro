import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import QuestionBank from '@/components/common/QuestionBank';
import { contestService } from '@/services/contestService';
import { fetchQuestionById, Question } from '@/services/questionService';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

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

export default function ContestForm() {
  const navigate = useNavigate();
  const { contestId } = useParams<{ contestId: string }>();
  const isEditMode = !!contestId;

  const [contest, setContest] = useState<Contest | null>(null);
  const [currentFormTab, setCurrentFormTab] = useState('details');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedQuestionsByType, setSelectedQuestionsByType] = useState({
    mcq_single: [] as string[],
    mcq_multiple: [] as string[],
    coding: [] as string[],
    descriptive: [] as string[]
  });
  const [randomQuestionsConfig, setRandomQuestionsConfig] = useState({
    mcq_single: 0,
    mcq_multiple: 0,
    coding: 0,
    descriptive: 0
  });
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    description: '',
    type: 'company' as 'company' | 'college' | 'weekly' | 'monthly',
    startDate: '',
    endDate: '',
    duration: '',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    instructions: '',
    totalMarks: '100',
    passingMarks: '60',
    enableProctoring: true,
    publishStatus: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
    prize: '',
    registrationStartDate: '',
    registrationEndDate: '',
    allowLateEntry: false,
  });

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

      const categorized = {
        mcq_single: [] as string[],
        mcq_multiple: [] as string[],
        coding: [] as string[],
        descriptive: [] as string[]
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
        mcq_single: questionIds,
        mcq_multiple: [],
        coding: [],
        descriptive: []
      };
    }
  };

  const handleQuestionsChange = async (questions: string[]) => {
    setSelectedQuestions(questions);
    const categorizedQuestions = await categorizeQuestionsByType(questions);
    setSelectedQuestionsByType(categorizedQuestions);
  };

  // Helper function to format datetime for HTML datetime-local input
  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return '';

    // If it's already in the correct format (YYYY-MM-DDTHH:mm), return it
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
      return dateString.slice(0, 16);
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; // Invalid date

      // Create a date string in local time: YYYY-MM-DDTHH:MM
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const fetchContest = async () => {
    if (!contestId) return;

    setLoading(true);
    try {
      const data = await contestService.getContest(contestId);
      const mappedContest = mapContestFromBackend(data);
      setContest(mappedContest);

      // Populate form with contest data
      setFormData({
        title: mappedContest.title,
        organizer: mappedContest.organizer,
        type: mappedContest.type,
        startDate: formatDateTimeForInput(mappedContest.startDate),
        endDate: formatDateTimeForInput(mappedContest.endDate),
        duration: mappedContest.duration.replace(' min', ''),
        prize: mappedContest.prize || '',
        difficulty: mappedContest.difficulty,
        description: mappedContest.description,
        registrationStartDate: formatDateTimeForInput(mappedContest.registrationStartDate || ''),
        registrationEndDate: formatDateTimeForInput(mappedContest.registrationEndDate || ''),
        allowLateEntry: mappedContest.allowLateEntry ?? false,
        instructions: '',
        totalMarks: '100',
        passingMarks: '60',
        enableProctoring: false,
        publishStatus: 'draft'
      });

      const allQuestions = [
        ...(mappedContest.questions_config?.mcq_single || []),
        ...(mappedContest.questions_config?.mcq_multiple || []),
        ...(mappedContest.questions_config?.coding || []),
        ...(mappedContest.questions_config?.descriptive || [])
      ];
      setSelectedQuestions(allQuestions);
      setSelectedQuestionsByType(mappedContest.questions_config || {
        mcq_single: [],
        mcq_multiple: [],
        coding: [],
        descriptive: []
      });
      setRandomQuestionsConfig(mappedContest.questions_random_config || {
        mcq_single: 0,
        mcq_multiple: 0,
        coding: 0,
        descriptive: 0
      });
    } catch (error) {
      console.error('Failed to fetch contest:', error);
      toast.error('Failed to load contest');
      navigate('/instructor/contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      fetchContest();
    }
  }, [contestId]);

  const handleSubmit = async () => {
    const totalQuestionCount = Object.values(selectedQuestionsByType).flat().length
      + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0);

    if (totalQuestionCount === 0) {
      setCurrentFormTab('questions');
      toast.error('Please add at least one question (selected or random) before saving.');
      return;
    }

    const payload = {
      title: formData.title,
      organizer: formData.organizer,
      type: formData.type,
      status: 'upcoming',
      start_datetime: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      end_datetime: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      duration: formData.duration ? parseInt(formData.duration) * 60 : undefined,
      prize: formData.prize,
      difficulty: formData.difficulty.toLowerCase(),
      description: formData.description,
      registration_start_datetime: formData.registrationStartDate ? new Date(formData.registrationStartDate).toISOString() : undefined,
      registration_end_datetime: formData.registrationEndDate ? new Date(formData.registrationEndDate).toISOString() : undefined,
      allow_late_entry: formData.allowLateEntry,
      questions_config: selectedQuestionsByType,
      questions_random_config: randomQuestionsConfig,
    };

    try {
      if (isEditMode && contestId) {
        await contestService.updateContest(contestId, payload);
        toast.success('Contest updated successfully');
      } else {
        await contestService.createContest(payload);
        toast.success('Contest created successfully');
      }
      navigate('/instructor/contests');
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update contest' : 'Failed to create contest');
    }
  };

  const handlePrimaryAction = () => {
    if (currentFormTab === 'details') {
      setCurrentFormTab('questions');
      return;
    }
    handleSubmit();
  };

  const getHeaderTitle = () => {
    return isEditMode ? `Edit Contest: ${contest?.title || 'Loading...'}` : 'Add New Contest';
  };

  const getHeaderSubtitle = () => {
    return isEditMode ? 'Modify contest details and settings' : 'Create a new coding contest for students';
  };

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Loading..."
              subtitle="Please wait while we load the contest details"
              actions={null}
            />
            <div className="px-6 py-6">
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
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
                onClick={() => navigate('/instructor/contests')}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                ← Back to List
              </button>
            }
          />
          <div className="px-6 py-6">
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                <TabsContent value="details" className="space-y-6">
                  {/* Basic Information Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-blue-500" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contest Title *</label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Weekly Coding Challenge"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Organizer *</label>
                          <Input
                            value={formData.organizer}
                            onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                            placeholder="e.g., Yuvro Platform"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe the contest focus and topics..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contest Type *</label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">Company Contest</SelectItem>
                              <SelectItem value="college">College Contest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level *</label>
                          <Select
                            value={formData.difficulty}
                            onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Schedule & Duration Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-green-500" />
                        Schedule & Duration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                          <Input
                            type="datetime-local"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                          <Input
                            type="datetime-local"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                          <Input
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            placeholder="e.g., 120"
                            min={1}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Registration Start Date</label>
                          <Input
                            type="datetime-local"
                            value={formData.registrationStartDate}
                            onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Registration End Date</label>
                          <Input
                            type="datetime-local"
                            value={formData.registrationEndDate}
                            onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Allow Late Entry</p>
                          <p className="text-xs text-gray-500">Permit registrations after the registration end date.</p>
                        </div>
                        <Switch
                          checked={formData.allowLateEntry}
                          onCheckedChange={(checked) => setFormData({ ...formData, allowLateEntry: checked })}
                          className="data-[state=unchecked]:bg-gray-200 data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Prize Information Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900">Prize Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prize (Optional)</label>
                        <Input
                          value={formData.prize}
                          onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                          placeholder="e.g., $500 Cash Prize"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

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
                            min={0}
                            value={randomQuestionsConfig.mcq_single}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              mcq_single: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple Choice</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.mcq_multiple}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              mcq_multiple: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Coding Questions</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.coding}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              coding: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Questions</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.descriptive}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              descriptive: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Specify how many questions of each type should be randomly selected from the question bank for this contest.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Specific Question Selection */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-purple-500" />
                        Specific Question Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
                  {currentFormTab === 'questions' ? (
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentFormTab('details')}
                      className="bg-orange-500 hover:bg-orange-300 text-white"
                    >
                      ← Back to Details
                    </Button>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/instructor/contests')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={handlePrimaryAction}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {currentFormTab === 'details'
                        ? 'Next: Add Questions'
                        : (isEditMode ? 'Update Contest' : 'Create Contest')}
                    </Button>
                  </div>
                </div>

              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
