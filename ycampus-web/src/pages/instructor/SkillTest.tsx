import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Calendar, Clock, Building2, GraduationCap, Pencil, Trash2, Eye, FileText, Code, CheckCircle, BookOpen, Plus, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import SearchBar from '@/components/common/SearchBar';
import { useAuth } from "@/contexts/AuthContext";
import skillTestService, { SkillTest } from '@/services/skillTestService';
import { fetchQuestionById, Question } from '@/services/questionService';
import courseService, { Course, TopicBasic } from '@/services/courseService';

export default function InstructorSkillTest() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<TopicBasic[]>([]);
  const [skillTests, setSkillTests] = useState<SkillTest[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicBasic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('fundamentals');
  const [currentView, setCurrentView] = useState<'courses' | 'topics' | 'skillTests'>('courses');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async (courseId: string) => {
    try {
      setLoading(true);
      const data = await courseService.getTopics(courseId);
      setTopics(data);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      toast.error('Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkillTestsForTopic = async (topicId: string) => {
    try {
      setLoading(true);
      const data = await skillTestService.getSkillTests();
      // Filter skill tests for the selected topic
      const filteredTests = data.filter((test: SkillTest) => test.topic === topicId);
      setSkillTests(filteredTests);
    } catch (err) {
      console.error('Failed to fetch skill tests:', err);
      toast.error('Failed to fetch skill tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('SkillTest useEffect - courseId from params:', courseId);
    if (courseId) {
      // If we have a courseId in the URL, load that course directly
      loadCourseAndTopics(courseId);
    } else {
      fetchCourses();
    }
  }, [courseId]);

  // Handle topicId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicIdFromUrl = urlParams.get('topicId');
    console.log('SkillTest - checking for topicId in URL:', topicIdFromUrl, 'Topics loaded:', topics.length, 'Current view:', currentView, 'Selected topic:', selectedTopic?.id);

    if (topicIdFromUrl && topics.length > 0 && currentView === 'topics') {
      const topic = topics.find(t => t.id === topicIdFromUrl);
      if (topic && (!selectedTopic || selectedTopic.id !== topicIdFromUrl)) {
        console.log('Auto-selecting topic from URL:', topic.name, 'Topic ID:', topic.id);
        handleTopicSelect(topic);
      }
    }
  }, [topics, currentView]);

  const loadCourseAndTopics = async (courseId: string) => {
    try {
      setLoading(true);
      const [coursesData, topicsData] = await Promise.all([
        courseService.getCourses(),
        courseService.getTopics(courseId)
      ]);

      setCourses(coursesData);
      const course = coursesData.find(c => c.id === courseId);
      if (course) {
        setSelectedCourse(course);
        setTopics(topicsData);
        setCurrentView('topics');
      }
    } catch (err) {
      console.error('Failed to load course and topics:', err);
      toast.error('Failed to load course and topics');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    navigate(`/instructor/skill-tests/courses/${course.id}/manage`);
  };

  const handleTopicSelect = (topic: TopicBasic) => {
    setSelectedTopic(topic);
    setCurrentView('skillTests');
    fetchSkillTestsForTopic(topic.id);
  };

  const handleBackToCourses = () => {
    console.log('Navigating back to courses');
    try {
      navigate('/instructor/skill-tests');
    } catch (error) {
      console.error('Navigation failed, using window.location:', error);
      window.location.href = '/instructor/skill-tests';
    }
  };

  const handleBackToTopics = () => {
    setCurrentView('topics');
    setSelectedTopic(null);
    setSkillTests([]);
  };

  const handleAddSkillTest = () => {
    if (selectedTopic) {
      navigate(`/instructor/skill-tests/add?courseId=${selectedCourse?.id}&topicId=${selectedTopic.id}`);
    }
  };

  const handleDeleteSkillTest = async (id: string) => {
    try {
      await skillTestService.deleteSkillTest(id);
      toast.success('Skill test deleted successfully');
      if (selectedTopic) {
        fetchSkillTestsForTopic(selectedTopic.id);
      }
    } catch (err) {
      toast.error('Failed to delete skill test');
    }
  };

  const openEditForm = (skillTest: SkillTest) => {
    console.log('Opening edit form for skill test:', skillTest.id, 'Course:', selectedCourse?.id);
    const editUrl = `/instructor/skill-tests/${skillTest.id}/edit?courseId=${selectedCourse?.id}&topicId=${selectedTopic?.id}`;
    console.log('Edit URL:', editUrl);
    navigate(editUrl);
  };

  const filteredCourses = courses.filter(course => course.category === selectedTab);

  const filteredSkillTests = skillTests.filter(skillTest => {
    return skillTest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skillTest.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'draft': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'archived': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const CATEGORY_LABELS: Record<string, string> = {
    fundamentals: "Fundamentals",
    programming_languages: "Programming Languages",
    databases: "Databases",
    ai_tools: "AI Tools",
  };

  const CATEGORY_GRADIENTS: Record<string, string> = {
    fundamentals: "from-blue-900 to-blue-700",
    programming_languages: "from-purple-900 to-purple-700",
    databases: "from-green-900 to-green-700",
    ai_tools: "from-orange-900 to-orange-700",
  };

  const courseCounts = courses.reduce((acc: any, course) => {
    acc[course.category] = (acc[course.category] || 0) + 1;
    return acc;
  }, {});

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'courses': return 'Skill Test Management';
      case 'topics': return `${selectedCourse?.name} - Topics`;
      case 'skillTests': return `${selectedTopic?.name} - Skill Tests`;
      default: return 'Skill Test Management';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'courses': return 'Select a course to manage skill tests for its topics';
      case 'topics': return 'Select a topic to view and manage its skill tests';
      case 'skillTests': return 'Manage skill tests for this topic';
      default: return 'Create and manage skill tests for course topics';
    }
  };

  const getHeaderActions = () => {
    switch (currentView) {
      case 'courses':
        return null;
      case 'topics':
        return (
          <button
            onClick={handleBackToCourses}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            ← Back to Courses
          </button>
        );
      case 'skillTests':
        return (
          <button
            onClick={handleBackToCourses}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            ← Back to Courses
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title={getHeaderTitle()}
            subtitle={getHeaderSubtitle()}
            actions={getHeaderActions()}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            )}

            {/* Courses View */}
            {currentView === 'courses' && !loading && (
              <>
                {/* Tabs */}
                <div className="mb-6">
                  <nav className="flex space-x-8">
                    {[
                      { key: 'fundamentals', label: 'Fundamentals', count: courseCounts.fundamentals || 0 },
                      { key: 'programming_languages', label: 'Programming Languages', count: courseCounts.programming_languages || 0 },
                      { key: 'databases', label: 'Databases', count: courseCounts.databases || 0 },
                      { key: 'ai_tools', label: 'AI Tools', count: courseCounts.ai_tools || 0 }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedTab(tab.key)}
                        className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${selectedTab === tab.key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`rounded-full px-2 py-1 text-xs ${selectedTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Courses Grid */}
                {filteredCourses.length === 0 ? (
                  <div className="bg-white shadow rounded-lg">
                    <div className="text-center py-12">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No {CATEGORY_LABELS[selectedTab]} courses found.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCourses.map((course) => (
                      <Card
                        key={course.id}
                        className="group relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-gray-300 bg-white rounded-xl cursor-pointer"
                        onClick={() => handleCourseSelect(course)}
                      >
                        <CardContent className="p-0">
                          {/* Course Header with gradient */}
                          <div className={`bg-gradient-to-r ${CATEGORY_GRADIENTS[course.category]} p-4 text-white relative overflow-hidden`}>
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute inset-0" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                              }} />
                            </div>

                            <div className="flex items-start justify-between relative z-10">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <BookOpen className="h-4 w-4 text-white/70" />
                                  <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                                    {CATEGORY_LABELS[course.category]}
                                  </span>
                                </div>
                                <h3 className="font-bold text-lg leading-tight mb-2 text-white">
                                  {course.name}
                                </h3>
                              </div>

                              {course.short_code && (
                                <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">
                                  <span className="text-xs font-bold text-white">
                                    {course.short_code}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Course Content */}
                          <div className="p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                <Trophy className="h-3.5 w-3.5" />
                                <span>Skill Tests</span>
                              </div>
                              <div className="text-blue-600 font-semibold text-sm">
                                Select →
                              </div>
                            </div>
                          </div>

                          {/* Hover Effect Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Topics View */}
            {currentView === 'topics' && !loading && (
              <div className="flex gap-6">
                {/* Topics Sidebar */}
                <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Topics
                  </h3>
                  <div className="space-y-2">
                    {topics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic)}
                        className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-700">
                              {topic.name}
                            </h4>
                          </div>
                          <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="text-center">
                      <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">Select a Topic</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Choose a topic from the left sidebar to view and manage its skill tests.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Skill Tests View */}
            {currentView === 'skillTests' && !loading && (
              <div className="flex gap-6">
                {/* Topics Sidebar */}
                <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Topics
                  </h3>
                  <div className="space-y-2">
                    {topics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedTopic?.id === topic.id
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        <h4 className="font-medium">
                          {topic.name}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Click to view skill tests
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill Tests Content */}
                <div className="flex-1">
                  <div className="mb-4 flex justify-between items-center">
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    <button
                      onClick={handleAddSkillTest}
                      className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                    >
                      + Add Skill Test
                    </button>
                  </div>

                  {filteredSkillTests.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      <div className="text-center">
                        <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No Skill Tests</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          No skill tests found for this topic. Create your first skill test to get started.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-gray-200">
                              <TableHead className="text-left font-semibold text-gray-900">Title</TableHead>
                              <TableHead className="text-left font-semibold text-gray-900">Difficulty</TableHead>
                              <TableHead className="text-left font-semibold text-gray-900">Duration</TableHead>
                              <TableHead className="text-left font-semibold text-gray-900">Status</TableHead>
                              <TableHead className="text-left font-semibold text-gray-900">Participants</TableHead>
                              <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSkillTests.map((skillTest) => (
                              <TableRow key={skillTest.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <TableCell className="font-medium">{skillTest.title}</TableCell>
                                <TableCell>
                                  <Badge className={getDifficultyColor(skillTest.difficulty)} variant="outline">
                                    {skillTest.difficulty}
                                  </Badge>
                                </TableCell>
                                <TableCell>{skillTest.duration} min</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(skillTest.publish_status)} variant="outline">
                                    {skillTest.publish_status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{skillTest.participants_count}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => navigate(`/instructor/skill-tests/${skillTest.id}/analytics`)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                      title="Analytics"
                                    >
                                      <BarChart2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => openEditForm(skillTest)}
                                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSkillTest(skillTest.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}