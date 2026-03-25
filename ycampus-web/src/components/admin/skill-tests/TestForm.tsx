import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import QuestionBank from '@/components/common/QuestionBank';
import skillTestService, { SkillTest } from '@/services/skillTestService';
import subjectService, { Subject, UnitBasic } from '@/services/subjectService';
import { fetchQuestionById } from '@/services/questionService';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function SkillTestForm() {
  const { user } = useAuth();
  const userRole = user?.role || 'admin';
  const autoAssignedTestType = ['faculty', 'hod'].includes(userRole) ? 'assessment' : 'practice';
  const formBasePath = ['faculty', 'hod'].includes(userRole) ? '/faculty/assessment' : '/admin/skill-tests';
  const entityLabel = ['faculty', 'hod'].includes(userRole) ? 'Assessment' : 'Test';
  const navigate = useNavigate();
  const { skillTestId } = useParams<{ skillTestId: string }>();
  const isEditMode = !!skillTestId;

  // Get URL parameters for subject and unit
  const urlParams = new URLSearchParams(window.location.search);
  const subjectIdFromUrl = urlParams.get('subjectId') || urlParams.get('courseId');
  const unitIdFromUrl = urlParams.get('unitId') || urlParams.get('topicId');

  const [skillTest, setSkillTest] = useState<SkillTest | null>(null);
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<UnitBasic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 60,
    total_marks: 100,
    passing_marks: 60,
    enable_proctoring: false,
    publish_status: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
    subject: subjectIdFromUrl || '',
    unit: unitIdFromUrl || '',
    test_type: autoAssignedTestType as 'practice' | 'assessment',
    max_attempts: autoAssignedTestType === 'assessment' ? 1 : 3,
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

  const fetchSubjects = async () => {
    try {
      const data = await subjectService.getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchUnits = async (subjectId: string) => {
    try {
      const data = await subjectService.getUnits(subjectId);
      setUnits(data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
      toast.error('Failed to load units');
    }
  };

  const fetchSkillTest = async () => {
    if (!skillTestId) return;

    setLoading(true);
    try {
      const data = await skillTestService.getSkillTest(skillTestId);
      setSkillTest(data);

      setFormData({
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        difficulty: data.difficulty,
        duration: data.duration,
        total_marks: data.total_marks,
        passing_marks: data.passing_marks,
        max_attempts: data.max_attempts ?? (data.test_type === 'assessment' ? 1 : 3),
        enable_proctoring: data.enable_proctoring,
        publish_status: data.publish_status,
        subject: data.subject,
        unit: data.unit || '',
        test_type: data.test_type || 'practice'
      });

      setSelectedSubject(data.subject);
      if (data.subject) {
        await fetchUnits(data.subject);
      }

      const allQuestions = [
        ...(data.questions_config?.mcq_single || []),
        ...(data.questions_config?.mcq_multiple || []),
        ...(data.questions_config?.coding || []),
        ...(data.questions_config?.descriptive || [])
      ];
      setSelectedQuestions(allQuestions);
      setSelectedQuestionsByType(data.questions_config || {
        mcq_single: [],
        mcq_multiple: [],
        coding: [],
        descriptive: []
      });
      setRandomQuestionsConfig(data.questions_random_config || {
        mcq_single: 0,
        mcq_multiple: 0,
        coding: 0,
        descriptive: 0
      });
    } catch (error) {
      console.error('Failed to fetch skill test:', error);
      toast.error(`Failed to load ${entityLabel.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    if (isEditMode) {
      fetchSkillTest();
    } else {
      if (subjectIdFromUrl) {
        setSelectedSubject(subjectIdFromUrl);
        fetchUnits(subjectIdFromUrl);
      }
    }
  }, [skillTestId, subjectIdFromUrl, unitIdFromUrl]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error(`Please enter a ${entityLabel.toLowerCase()} title`);
      return;
    }

    const totalQuestionCount = Object.values(selectedQuestionsByType).flat().length
      + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0);

    if (totalQuestionCount === 0) {
      setCurrentFormTab('questions');
      toast.error('Please add at least one question (selected or random) before saving.');
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      instructions: formData.instructions,
      difficulty: formData.difficulty,
      duration: formData.duration,
      total_marks: formData.total_marks,
      passing_marks: formData.passing_marks,
      max_attempts: formData.max_attempts,
      enable_proctoring: formData.enable_proctoring,
      publish_status: formData.publish_status,
      subject: formData.subject,
      unit: formData.unit || undefined,
      test_type: formData.test_type,
      questions_config: selectedQuestionsByType,
      questions_random_config: randomQuestionsConfig,
    };

    try {
      if (isEditMode && skillTestId) {
        await skillTestService.updateSkillTest(skillTestId, payload);
        toast.success(`${entityLabel} updated successfully`);
      } else {
        await skillTestService.createSkillTest(payload);
        toast.success(`${entityLabel} created successfully`);
      }

      const skillTestUnitId = formData.unit;
      const skillTestSubjectId = formData.subject;

      try {
        if (skillTestSubjectId) {
          let targetUrl = `${formBasePath}/subjects/${skillTestSubjectId}/manage`;
          if (skillTestUnitId) {
            targetUrl += `?topicId=${skillTestUnitId}`;
          }
          navigate(targetUrl);
        } else {
          navigate(formBasePath);
        }
      } catch (error) {
        if (skillTestSubjectId) {
          let targetUrl = `${formBasePath}/subjects/${skillTestSubjectId}/manage`;
          if (skillTestUnitId) {
            targetUrl += `?topicId=${skillTestUnitId}`;
          }
          window.location.href = targetUrl;
        } else {
          window.location.href = formBasePath;
        }
      }
    } catch (error) {
      toast.error(isEditMode ? `Failed to update ${entityLabel.toLowerCase()}` : `Failed to create ${entityLabel.toLowerCase()}`);
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
    return isEditMode ? `Edit ${entityLabel}: ${skillTest?.title || 'Loading...'}` : `Add New ${entityLabel}`;
  };

  const getHeaderSubtitle = () => {
    if (isEditMode) {
      return `Modify ${entityLabel.toLowerCase()} details and settings`;
    }

    const subjectName = subjects.find(c => c.id === subjectIdFromUrl)?.name || subjects.find(c => c.id === subjectIdFromUrl)?.subject_name;
    const unitName = units.find(t => t.id === unitIdFromUrl)?.name;

    if (subjectName && unitName) {
      return `Create a new ${entityLabel.toLowerCase()} for ${subjectName} - ${unitName}`;
    } else if (subjectName) {
      return `Create a new ${entityLabel.toLowerCase()} for ${subjectName}`;
    }

    return `Create a new ${entityLabel.toLowerCase()}`;
  };

  const backButton = (
    <button
      onClick={() => {
        const skillTestUnitId = formData.unit || unitIdFromUrl;
        const skillTestSubjectId = formData.subject || subjectIdFromUrl;
        try {
          if (skillTestSubjectId) {
            let targetUrl = `${formBasePath}/subjects/${skillTestSubjectId}/manage`;
            if (skillTestUnitId) {
              targetUrl += `?topicId=${skillTestUnitId}`;
            }
            navigate(targetUrl);
          } else {
            navigate(formBasePath);
          }
        } catch (error) {
          if (skillTestSubjectId) {
            let targetUrl = `${formBasePath}/subjects/${skillTestSubjectId}/manage`;
            if (skillTestUnitId) {
              targetUrl += `?topicId=${skillTestUnitId}`;
            }
            window.location.href = targetUrl;
          } else {
            window.location.href = formBasePath;
          }
        }
      }}
      className="bg-white0 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
    >
      ← Back to Subjects
    </button>
  );

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Loading..."
              subtitle="Please wait while we load the details"
              actions={null}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    <div className="flex h-screen overflow-hidden bg-white relative">
      <RoleSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RoleHeader
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          actions={backButton}
        />
        <main className="flex-1 overflow-y-auto pb-12">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                </TabsList>
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Test Title *</label>
                          <Input
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., JavaScript Fundamentals Test"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level *</label>
                          <Select
                            value={formData.difficulty}
                            onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
                          >
                            <SelectTrigger className="bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <Textarea
                          className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe the assessment focus and topics..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <Textarea
                          className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="Instructions for students taking the test..."
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Test Configuration Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-green-500" />
                        Test Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                          <Input
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) || 60 })}
                            placeholder="e.g., 60"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                          <Input
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                            type="number"
                            value={formData.total_marks}
                            onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) || 100 })}
                            placeholder="e.g., 100"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks</label>
                          <Input
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                            type="number"
                            value={formData.passing_marks}
                            onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) || 60 })}
                            placeholder="e.g., 60"
                            min={1}
                            max={formData.total_marks}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Publish Status</label>
                          <Select
                            value={formData.publish_status}
                            onValueChange={(value) => setFormData({ ...formData, publish_status: value as any })}
                          >
                            <SelectTrigger className="bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm">
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                          <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-gray-200 bg-white">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              formData.test_type === 'practice'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {formData.test_type === 'practice' ? 'Practice' : 'Assessment'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formData.test_type === 'practice'
                                ? 'Auto-assigned — admin curated'
                                : 'Auto-assigned — faculty graded'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Flaw fix: max_attempts + proctoring row — defaults differ by test type */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
                          <Input
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
                            type="number"
                            min={1}
                            value={formData.max_attempts}
                            onChange={(e) => setFormData({ ...formData, max_attempts: Number(e.target.value) || 1 })}
                            placeholder={formData.test_type === 'assessment' ? '1' : '3'}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            {formData.test_type === 'assessment' ? 'Assessments default to 1 attempt' : 'Practice tests default to 3 attempts'}
                          </p>
                        </div>
                        <div className="flex h-full items-center gap-2 pt-6">
                          <Checkbox
                            id="enable_proctoring"
                            checked={formData.enable_proctoring}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, enable_proctoring: Boolean(checked) })
                            }
                          />
                          <label
                            htmlFor="enable_proctoring"
                            className="text-sm font-medium text-gray-900 select-none"
                          >
                            Enable Proctoring
                          </label>
                        </div>
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
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
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
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
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
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
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
                            className="bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm"
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
                        Specify how many questions of each type should be randomly selected from the question bank for this {entityLabel.toLowerCase()}.
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
                        subjectFilter={formData.subject}
                        unitFilter={formData.unit}
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
                      onClick={() => {
                        const skillTestUnitId = formData.unit || unitIdFromUrl;
                        const skillTestSubjectId = formData.subject || subjectIdFromUrl;
                        try {
                          if (skillTestSubjectId) {
                            let targetUrl = `${formBasePath}/subjects/${skillTestSubjectId}/manage`;
                            if (skillTestUnitId) {
                              targetUrl += `?topicId=${skillTestUnitId}`;
                            }
                            navigate(targetUrl);
                          } else {
                            navigate(formBasePath);
                          }
                        } catch (error) {
                          if (skillTestSubjectId) {
                            let targetUrl = `${formBasePath}/subjects/${skillTestSubjectId}/manage`;
                            if (skillTestUnitId) {
                              targetUrl += `?topicId=${skillTestUnitId}`;
                            }
                            window.location.href = targetUrl;
                          } else {
                            window.location.href = formBasePath;
                          }
                        }
                      }}
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
                        : (isEditMode ? `Update ${entityLabel}` : `Create ${entityLabel}`)}
                    </Button>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}