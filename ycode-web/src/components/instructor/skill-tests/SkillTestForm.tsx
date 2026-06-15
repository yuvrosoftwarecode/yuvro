import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/common/DashboardLayout';
import QuestionBank from '@/components/common/QuestionBank';
import skillTestService, { SkillTest } from '@/services/skillTestService';
import courseService, { Course, TopicBasic } from '@/services/courseService';
import { fetchQuestionById } from '@/services/questionService';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import ProctoringSettingsCard from '@/components/instructor/shared/ProctoringSettingsCard';


export default function SkillTestForm() {
  const navigate = useNavigate();
  const { skillTestId } = useParams<{ skillTestId: string }>();
  const isEditMode = !!skillTestId;

  // Get URL parameters for course and topic
  const urlParams = new URLSearchParams(window.location.search);
  const courseIdFromUrl = urlParams.get('courseId');
  const topicIdFromUrl = urlParams.get('topicId');

  console.log('SkillTestForm - URL params:', { courseIdFromUrl, topicIdFromUrl, currentUrl: window.location.href });

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
    mcq_single: { easy: 0, medium: 0, hard: 0 },
    mcq_multiple: { easy: 0, medium: 0, hard: 0 },
    coding: { easy: 0, medium: 0, hard: 0 },
    descriptive: { easy: 0, medium: 0, hard: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<TopicBasic[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 60,
    total_marks: 100,
    passing_marks: 60,
    enable_proctoring: false,
    tab_switch_threshold: 3,
    violation_threshold: 5,
    publish_status: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
    course: courseIdFromUrl || '',
    topic: topicIdFromUrl || ''
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

  const fetchCourses = async () => {
    try {
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchTopics = async (courseId: string) => {
    try {
      const data = await courseService.getTopics(courseId);
      setTopics(data);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      toast.error('Failed to load topics');
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
        tab_switch_threshold: data.tab_switch_threshold ?? 3,
        violation_threshold: data.violation_threshold ?? 5,
        publish_status: data.publish_status,
        course: data.course,
        topic: data.topic || ''
      });

      setSelectedCourse(data.course);
      if (data.course) {
        await fetchTopics(data.course);
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
      // Normalize questions_random_config to handle flat number format from backend
      const rawConfig = data.questions_random_config || {};
      const defaultDifficulty = { easy: 0, medium: 0, hard: 0 };
      const normalizeEntry = (entry: any) => {
        if (typeof entry === 'number') {
          return { easy: 0, medium: entry, hard: 0 };
        }
        if (entry && typeof entry === 'object') {
          return { easy: entry.easy || 0, medium: entry.medium || 0, hard: entry.hard || 0 };
        }
        return { ...defaultDifficulty };
      };
      setRandomQuestionsConfig({
        mcq_single: normalizeEntry(rawConfig.mcq_single),
        mcq_multiple: normalizeEntry(rawConfig.mcq_multiple),
        coding: normalizeEntry(rawConfig.coding),
        descriptive: normalizeEntry(rawConfig.descriptive),
      });
    } catch (error) {
      console.error('Failed to fetch skill test:', error);
      toast.error('Failed to load skill test');
      // Don't navigate away on error, let user try again
      // navigate('/instructor/skill-tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    if (isEditMode) {
      fetchSkillTest();
    } else {
      // For new skill tests, set course and topic from URL params
      if (courseIdFromUrl) {
        setSelectedCourse(courseIdFromUrl);
        fetchTopics(courseIdFromUrl);
      }
    }
  }, [skillTestId, courseIdFromUrl, topicIdFromUrl]);

  // Course and topic are auto-selected from URL parameters

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a skill test title');
      return;
    }

    const totalQuestionCount = Object.values(selectedQuestionsByType).flat().length
      + Object.values(randomQuestionsConfig).reduce((sum, cfg) => sum + cfg.easy + cfg.medium + cfg.hard, 0);

    if (totalQuestionCount === 0) {
      setCurrentFormTab('questions');
      toast.error('Please add at least one question (selected or random) before saving.');
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
      tab_switch_threshold: formData.tab_switch_threshold,
      violation_threshold: formData.violation_threshold,
      publish_status: formData.publish_status,
      course: formData.course,
      topic: formData.topic || undefined,
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

      // Navigate back to the course topics page and auto-select the topic for which skill test was created
      const skillTestTopicId = formData.topic; // Use the actual topic from the skill test
      const skillTestCourseId = formData.course; // Use the actual course from the skill test
      console.log('Skill test saved, navigating back. SkillTest CourseId:', skillTestCourseId, 'SkillTest TopicId:', skillTestTopicId);

      try {
        if (skillTestCourseId) {
          let targetUrl = `/instructor/skill-tests/courses/${skillTestCourseId}/manage`;
          if (skillTestTopicId) {
            targetUrl += `?topicId=${skillTestTopicId}`;
          }
          console.log('Navigating to course manage page with skill test topic:', targetUrl);
          navigate(targetUrl);
        } else {
          console.log('No courseId in skill test, navigating to main skill tests page');
          navigate('/instructor/skill-tests');
        }
      } catch (error) {
        console.error('Navigation failed, using window.location:', error);
        if (skillTestCourseId) {
          let targetUrl = `/instructor/skill-tests/courses/${skillTestCourseId}/manage`;
          if (skillTestTopicId) {
            targetUrl += `?topicId=${skillTestTopicId}`;
          }
          window.location.href = targetUrl;
        } else {
          window.location.href = '/instructor/skill-tests';
        }
      }
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update skill test' : 'Failed to create skill test');
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
    return isEditMode ? `Edit Skill Test: ${skillTest?.title || 'Loading...'}` : 'Add New Skill Test';
  };

  const getHeaderSubtitle = () => {
    if (isEditMode) {
      return 'Modify skill test details and settings';
    }

    const courseName = courses.find(c => c.id === courseIdFromUrl)?.name;
    const topicName = topics.find(t => t.id === topicIdFromUrl)?.name;

    if (courseName && topicName) {
      return `Create a new skill test for ${courseName} - ${topicName}`;
    } else if (courseName) {
      return `Create a new skill test for ${courseName}`;
    }

    return 'Create a new skill test';
  };

  const backButton = (
    <button
      onClick={() => {
        const skillTestTopicId = formData.topic || topicIdFromUrl;
        const skillTestCourseId = formData.course || courseIdFromUrl;
        console.log('Back button clicked. SkillTest CourseId:', skillTestCourseId, 'SkillTest TopicId:', skillTestTopicId);
        try {
          if (skillTestCourseId) {
            let targetUrl = `/instructor/skill-tests/courses/${skillTestCourseId}/manage`;
            if (skillTestTopicId) {
              targetUrl += `?topicId=${skillTestTopicId}`;
            }
            console.log('Navigating to course manage page with skill test topic:', targetUrl);
            navigate(targetUrl);
          } else {
            console.log('No courseId, navigating to main skill tests page');
            navigate('/instructor/skill-tests');
          }
        } catch (error) {
          console.error('Navigation failed, using window.location:', error);
          if (skillTestCourseId) {
            let targetUrl = `/instructor/skill-tests/courses/${skillTestCourseId}/manage`;
            if (skillTestTopicId) {
              targetUrl += `?topicId=${skillTestTopicId}`;
            }
            window.location.href = targetUrl;
          } else {
            window.location.href = '/instructor/skill-tests';
          }
        }
      }}
      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
    >
      ← Back to Courses
    </button>
  );

  if (loading && isEditMode) {
    return (
      <DashboardLayout
        title="Loading..."
        subtitle="Please wait while we load the skill test details"
      >
        <div className="px-6 py-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={getHeaderTitle()}
      subtitle={getHeaderSubtitle()}
      actions={backButton}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Test Title *</label>
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="e.g., JavaScript Fundamentals Test"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level *</label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) =>
                          setFormData({ ...formData, difficulty: value as any })
                        }
                      >
                        <SelectTrigger>
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
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Describe the skill test focus and topics..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                    <Textarea
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="Instructions for students taking the test..."
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
                      <Input
                        type="number"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration: Number(e.target.value) || 60,
                          })
                        }
                        placeholder="e.g., 60"
                        min={1}
                      />

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                      <Input
                        type="number"
                        value={formData.total_marks}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_marks: Number(e.target.value) || 100,
                          })
                        }
                        placeholder="e.g., 100"
                        min={1}
                      />

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks</label>
                      <Input
                        type="number"
                        value={formData.passing_marks}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            passing_marks: Number(e.target.value) || 60,
                          })
                        }
                        placeholder="e.g., 60"
                        min={1}
                        max={formData.total_marks}
                      />
                    </div>
                  </div>

                  <div className="mt-4 max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publish Status</label>
                    <Select
                      value={formData.publish_status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, publish_status: value as any })
                      }
                    >
                      <SelectTrigger>
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
                </CardContent>
              </Card>

              {/* Proctoring Settings */}
              <ProctoringSettingsCard
                enableProctoring={formData.enable_proctoring}
                onEnableProctoringChange={(val) => setFormData({ ...formData, enable_proctoring: val })}
                tabSwitchThreshold={formData.tab_switch_threshold}
                onTabSwitchThresholdChange={(val) => setFormData({ ...formData, tab_switch_threshold: val })}
                violationThreshold={formData.violation_threshold}
                onViolationThresholdChange={(val) => setFormData({ ...formData, violation_threshold: val })}
                className="border border-gray-200 shadow-sm"
              />
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MCQ Single Choice
                      </label>

                      <Input
                        type="number"
                        min={0}
                        value={randomQuestionsConfig.mcq_single.easy + randomQuestionsConfig.mcq_single.medium + randomQuestionsConfig.mcq_single.hard}
                        onChange={(e) =>
                          setRandomQuestionsConfig({
                            ...randomQuestionsConfig,
                            mcq_single: { easy: 0, medium: Number(e.target.value) || 0, hard: 0 },
                          })
                        }
                        placeholder="0"
                      />

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple Choice</label>
                      <Input
                        type="number"
                        min={0}
                        value={randomQuestionsConfig.mcq_multiple.easy + randomQuestionsConfig.mcq_multiple.medium + randomQuestionsConfig.mcq_multiple.hard}
                        onChange={(e) => setRandomQuestionsConfig({
                          ...randomQuestionsConfig,
                          mcq_multiple: { easy: 0, medium: Number(e.target.value) || 0, hard: 0 },
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Coding Questions</label>
                      <Input
                        type="number"
                        min={0}
                        value={randomQuestionsConfig.coding.easy + randomQuestionsConfig.coding.medium + randomQuestionsConfig.coding.hard}
                        onChange={(e) => setRandomQuestionsConfig({
                          ...randomQuestionsConfig,
                          coding: { easy: 0, medium: Number(e.target.value) || 0, hard: 0 },
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Questions</label>
                      <Input
                        type="number"
                        min={0}
                        value={randomQuestionsConfig.descriptive.easy + randomQuestionsConfig.descriptive.medium + randomQuestionsConfig.descriptive.hard}
                        onChange={(e) => setRandomQuestionsConfig({
                          ...randomQuestionsConfig,
                          descriptive: { easy: 0, medium: Number(e.target.value) || 0, hard: 0 },
                        })}
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
                    courseFilter={selectedCourse}
                    topicFilter={formData.topic}
                    categoryFilter="skill_test"
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
                    const skillTestTopicId = formData.topic || topicIdFromUrl;
                    const skillTestCourseId = formData.course || courseIdFromUrl;
                    console.log('Cancel button clicked. SkillTest CourseId:', skillTestCourseId, 'SkillTest TopicId:', skillTestTopicId);
                    try {
                      if (skillTestCourseId) {
                        let targetUrl = `/instructor/skill-tests/courses/${skillTestCourseId}/manage`;
                        if (skillTestTopicId) {
                          targetUrl += `?topicId=${skillTestTopicId}`;
                        }
                        console.log('Navigating to course manage page with skill test topic:', targetUrl);
                        navigate(targetUrl);
                      } else {
                        console.log('No courseId, navigating to main skill tests page');
                        navigate('/instructor/skill-tests');
                      }
                    } catch (error) {
                      console.error('Navigation failed, using window.location:', error);
                      if (skillTestCourseId) {
                        let targetUrl = `/instructor/skill-tests/courses/${skillTestCourseId}/manage`;
                        if (skillTestTopicId) {
                          targetUrl += `?topicId=${skillTestTopicId}`;
                        }
                        window.location.href = targetUrl;
                      } else {
                        window.location.href = '/instructor/skill-tests';
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
                    : (isEditMode ? 'Update Skill Test' : 'Create Skill Test')}
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
