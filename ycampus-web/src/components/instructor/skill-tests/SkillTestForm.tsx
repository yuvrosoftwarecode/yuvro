import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import QuestionBank from '@/components/common/QuestionBank';
import skillTestService, { SkillTest } from '@/services/skillTestService';
import courseService, { Course, TopicBasic } from '@/services/courseService';
import { fetchQuestionById } from '@/services/questionService';

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
    mcq_single: 0,
    mcq_multiple: 0,
    coding: 0,
    descriptive: 0
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

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Loading..."
              subtitle="Please wait while we load the skill test details"
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title={getHeaderTitle()}
            subtitle={getHeaderSubtitle()}
            actions={
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
            }
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                        courseFilter={selectedCourse}
                        topicFilter={formData.topic}
                        categoryFilter="skill_test"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
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