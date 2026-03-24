import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import PageHeader from '@/components/common/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuestionBank from '@/components/common/QuestionBank';
import skillTestService, { SkillTest } from '@/services/skillTestService';
import subjectService, { Subject, UnitBasic } from '@/services/subjectService';
import { fetchQuestionById } from '@/services/questionService';

export default function SkillTestForm() {
  const navigate = useNavigate();
  const { skillTestId } = useParams<{ skillTestId: string }>();
  const isEditMode = !!skillTestId;

  // Get URL parameters for subject and unit
  const urlParams = new URLSearchParams(window.location.search);
  const subjectIdFromUrl = urlParams.get('subjectId') || urlParams.get('courseId');
  const unitIdFromUrl = urlParams.get('unitId') || urlParams.get('topicId');

  console.log('SkillTestForm - URL params:', { subjectIdFromUrl, unitIdFromUrl, currentUrl: window.location.href });

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
    unit: unitIdFromUrl || ''
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

      // Populate form with skill test data
      setFormData({
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        difficulty: data.difficulty,
        duration: data.duration,
        total_marks: data.total_marks,
        passing_marks: data.passing_marks,
        enable_proctoring: data.enable_proctoring,
        publish_status: data.publish_status,
        subject: data.subject,
        unit: data.unit || ''
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
      toast.error('Failed to load skill test');
      // Don't navigate away on error, let user try again
      // navigate('/admin/skill-tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    if (isEditMode) {
      fetchSkillTest();
    } else {
      // For new skill tests, set subject and unit from URL params
      if (subjectIdFromUrl) {
        setSelectedSubject(subjectIdFromUrl);
        fetchUnits(subjectIdFromUrl);
      }
    }
  }, [skillTestId, subjectIdFromUrl, unitIdFromUrl]);

  // Course and topic are auto-selected from URL parameters

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a skill test title');
      return;
    }

    // Course and topic are auto-selected from navigation context

    const payload = {
      title: formData.title,
      description: formData.description,
      instructions: formData.instructions,
      difficulty: formData.difficulty,
      duration: formData.duration,
      total_marks: formData.total_marks,
      passing_marks: formData.passing_marks,
      enable_proctoring: formData.enable_proctoring,
      publish_status: formData.publish_status,
      subject: formData.subject,
      unit: formData.unit || undefined,
      questions_config: selectedQuestionsByType,
      questions_random_config: randomQuestionsConfig,
    };

    try {
      if (isEditMode && skillTestId) {
        await skillTestService.updateSkillTest(skillTestId, payload);
        toast.success('Skill test updated successfully');
      } else {
        await skillTestService.createSkillTest(payload);
        toast.success('Skill test created successfully');
      }

      // Navigate back to the subject units page and auto-select the unit for which skill test was created
      const skillTestUnitId = formData.unit; // Use the actual unit from the skill test
      const skillTestSubjectId = formData.subject; // Use the actual subject from the skill test
      console.log('Skill test saved, navigating back. SkillTest SubjectId:', skillTestSubjectId, 'SkillTest UnitId:', skillTestUnitId);

      try {
        if (skillTestSubjectId) {
          let targetUrl = `/admin/skill-tests/courses/${skillTestSubjectId}/manage`;
          if (skillTestUnitId) {
            targetUrl += `?topicId=${skillTestUnitId}`;
          }
          console.log('Navigating to subject manage page with skill test unit:', targetUrl);
          navigate(targetUrl);
        } else {
          console.log('No courseId in skill test, navigating to main skill tests page');
          navigate('/admin/skill-tests');
        }
      } catch (error) {
        console.error('Navigation failed, using window.location:', error);
        if (skillTestSubjectId) {
          let targetUrl = `/admin/skill-tests/courses/${skillTestSubjectId}/manage`;
          if (skillTestUnitId) {
            targetUrl += `?topicId=${skillTestUnitId}`;
          }
          window.location.href = targetUrl;
        } else {
          window.location.href = '/admin/skill-tests';
        }
      }
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update skill test' : 'Failed to create skill test');
    }
  };

  const getHeaderTitle = () => {
    return isEditMode ? `Edit Skill Test: ${skillTest?.title || 'Loading...'}` : 'Add New Skill Test';
  };

  const getHeaderSubtitle = () => {
    if (isEditMode) {
      return 'Modify skill test details and settings';
    }

    const subjectName = subjects.find(c => c.id === subjectIdFromUrl)?.name;
    const unitName = units.find(t => t.id === unitIdFromUrl)?.name;

    if (subjectName && unitName) {
      return `Create a new skill test for ${subjectName} - ${unitName}`;
    } else if (subjectName) {
      return `Create a new skill test for ${subjectName}`;
    }

    return 'Create a new skill test';
  };

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader
              title="Loading..."
              subtitle="Please wait while we load the skill test details"
              actions={null}
            />
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader
              title={getHeaderTitle()}
              subtitle={getHeaderSubtitle()}
              actions={
                <Button
                  onClick={() => {
                    const skillTestUnitId = formData.unit || unitIdFromUrl;
                    const skillTestSubjectId = formData.subject || subjectIdFromUrl;
                    console.log('Back button clicked. SkillTest SubjectId:', skillTestSubjectId, 'SkillTest UnitId:', skillTestUnitId);
                    try {
                      if (skillTestSubjectId) {
                        let targetUrl = `/admin/skill-tests/courses/${skillTestSubjectId}/manage`;
                        if (skillTestUnitId) {
                          targetUrl += `?topicId=${skillTestUnitId}`;
                        }
                        console.log('Navigating to subject manage page with skill test unit:', targetUrl);
                        navigate(targetUrl);
                      } else {
                        console.log('No subjectId, navigating to main skill tests page');
                        navigate('/admin/skill-tests');
                      }
                    } catch (error) {
                      console.error('Navigation failed, using window.location:', error);
                      if (skillTestSubjectId) {
                        let targetUrl = `/admin/skill-tests/courses/${skillTestSubjectId}/manage`;
                        if (skillTestUnitId) {
                          targetUrl += `?topicId=${skillTestUnitId}`;
                        }
                        window.location.href = targetUrl;
                      } else {
                        window.location.href = '/admin/skill-tests';
                      }
                    }
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Subjects
                </Button>
              }
            />
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger
                    value="details"
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 px-4 transition-all"
                  >
                    <Settings className="h-4 w-4" />
                    Test Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="questions"
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md py-2 px-4 transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    Questions ({Object.values(selectedQuestionsByType).flat().length + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0)})
                  </TabsTrigger>
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
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., JavaScript Fundamentals Test"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level *</label>
                          <select
                            value={formData.difficulty}
                            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe the skill test focus and topics..."
                          rows={3}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <textarea
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="Instructions for students taking the test..."
                          rows={3}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>

                      {/* Course and Topic are auto-selected from navigation context */}
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
                          <input
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                            placeholder="e.g., 60"
                            min="1"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                          <input
                            type="number"
                            value={formData.total_marks}
                            onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 100 })}
                            placeholder="e.g., 100"
                            min="1"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks</label>
                          <input
                            type="number"
                            value={formData.passing_marks}
                            onChange={(e) => setFormData({ ...formData, passing_marks: parseInt(e.target.value) || 60 })}
                            placeholder="e.g., 60"
                            min="1"
                            max={formData.total_marks}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Publish Status</label>
                          <select
                            value={formData.publish_status}
                            onChange={(e) => setFormData({ ...formData, publish_status: e.target.value as any })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="enable_proctoring"
                            checked={formData.enable_proctoring}
                            onChange={(e) => setFormData({ ...formData, enable_proctoring: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="enable_proctoring" className="ml-2 block text-sm text-gray-900">
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
                          <input
                            type="number"
                            min="0"
                            value={randomQuestionsConfig.mcq_single}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              mcq_single: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple Choice</label>
                          <input
                            type="number"
                            min="0"
                            value={randomQuestionsConfig.mcq_multiple}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              mcq_multiple: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Coding Questions</label>
                          <input
                            type="number"
                            min="0"
                            value={randomQuestionsConfig.coding}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              coding: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Questions</label>
                          <input
                            type="number"
                            min="0"
                            value={randomQuestionsConfig.descriptive}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              descriptive: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Specify how many questions of each type should be randomly selected from the question bank for this skill test.
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
                        courseFilter={selectedSubject}
                        topicFilter={formData.unit}
                        categoryFilter="skill_test"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const skillTestUnitId = formData.unit || unitIdFromUrl;
                      const skillTestSubjectId = formData.subject || subjectIdFromUrl;
                      console.log('Cancel button clicked. SkillTest SubjectId:', skillTestSubjectId, 'SkillTest UnitId:', skillTestUnitId);
                      try {
                        if (skillTestSubjectId) {
                          let targetUrl = `/admin/skill-tests/courses/${skillTestSubjectId}/manage`;
                          if (skillTestUnitId) {
                            targetUrl += `?topicId=${skillTestUnitId}`;
                          }
                          console.log('Navigating to subject manage page with skill test unit:', targetUrl);
                          navigate(targetUrl);
                        } else {
                          console.log('No subjectId, navigating to main skill tests page');
                          navigate('/admin/skill-tests');
                        }
                      } catch (error) {
                        console.error('Navigation failed, using window.location:', error);
                        if (skillTestSubjectId) {
                          let targetUrl = `/admin/skill-tests/courses/${skillTestSubjectId}/manage`;
                          if (skillTestUnitId) {
                            targetUrl += `?topicId=${skillTestUnitId}`;
                          }
                          window.location.href = targetUrl;
                        } else {
                          window.location.href = '/admin/skill-tests';
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {isEditMode ? 'Update Skill Test' : 'Create Skill Test'}
                  </button>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}