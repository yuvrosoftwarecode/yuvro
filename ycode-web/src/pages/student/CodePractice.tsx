import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CourseDashboard from '@/components/student/code-practice/CourseDashboard';
import TopicSelection from '@/components/student/code-practice/TopicSelection';
import { CodeEditorWithAI } from '@/components/code-editor';
import ScoreAnalytics from '@/components/student/code-practice/ScoreAnalytics';
import AIInsights from '@/components/student/code-practice/AIInsights';
import { fetchCourseById, fetchTopicsByCourse } from '@/services/courseService';
import { fetchQuestionById, fetchQuestions } from '@/services/questionService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/common/DashboardLayout';
import { showGamificationToasts } from '@/utils/gamificationToast';

export type ViewType = 'dashboard' | 'topics' | 'problem' | 'analytics' | 'insights';

export interface Course {
  id: string;
  name: string;
  icon: string;
  progress: number;
  totalProblems: number;
  solvedProblems: number;
  iconColor?: string;
  category: string;
  totalScore?: number;
  aiHelpUsed?: number;
}

export interface Topic {
  id: string;
  name: string;
  problemCount: number;
  order_index: number;
  progress: number;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  score: number;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  hints?: string[];
  solutions?: any[];
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  test_cases_basic: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
  test_cases_advanced: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
}

const CodePractice = () => {
  const navigate = useNavigate();
  const { courseId, topicId, problemId } = useParams<{ courseId: string; topicId: string; problemId: string }>();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  // Helper to get icon colors (duplicated from CourseDashboard for consistency)
  const getIconColor = (category: string) => {
    const colors = {
      databases: 'bg-blue-100 text-blue-600',
      programming_languages: 'bg-red-100 text-red-600',
      fundamentals: 'bg-purple-100 text-purple-600',
      ai_tools: 'bg-amber-100 text-amber-600',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  const hydrateStateFromUrl = useCallback(async () => {
    if (!courseId) return;

    setIsHydrating(true);
    try {
      // 1. Fetch Course
      if (!selectedCourse || selectedCourse.id !== courseId) {
        const course = await fetchCourseById(courseId);
        const transformedCourse: Course = {
          id: course.id.toString(),
          name: course.name || course.title || 'Untitled Course',
          icon: course.category,
          progress: Math.round(course.progress_percentage || 0),
          totalProblems: course.total_problems || 0,
          solvedProblems: course.solved_problems || 0,
          category: course.category,
          iconColor: getIconColor(course.category),
          totalScore: course.total_score || 0,
          aiHelpUsed: course.ai_help_used || 0,
        };
        setSelectedCourse(transformedCourse);
      }

      // 2. Fetch Topic
      if (topicId && (!selectedTopic || selectedTopic.id !== topicId)) {
        const topics = await fetchTopicsByCourse(courseId);
        const topic = topics.find((t: any) => t.id === topicId);
        if (topic) {
          setSelectedTopic({
            id: topic.id,
            name: topic.name,
            problemCount: topic.total_problems || 0,
            order_index: topic.order_index,
            progress: Math.round(topic.progress_percentage || 0),
          });
        }
      }

      // 3. Fetch Problem
      if (problemId && (!selectedProblem || selectedProblem.id !== problemId)) {
        const q = await fetchQuestionById(problemId);
        const transformedProblem: CodingProblem = {
          id: q.id,
          title: q.title,
          difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'medium' ? 'Medium' : 'Hard',
          score: q.marks,
          description: q.content,
          hints: q.hints || [],
          solutions: q.solutions || [],
          test_cases_basic: q.test_cases_basic?.map((tc: any) => ({
            input: tc.input || '',
            expected_output: tc.expected_output || '',
            weight: tc.weight || 1
          })) || [],
          test_cases_advanced: q.test_cases_advanced?.map((tc: any) => ({
            input: tc.input || '',
            expected_output: tc.expected_output || '',
            weight: tc.weight || 1
          })) || [],
        };
        setSelectedProblem(transformedProblem);
        setCurrentView('problem');
      } else if (topicId) {
        setCurrentView('topics');
      } else {
        setCurrentView('topics'); // If only courseId is present
      }
    } catch (error) {
      console.error('Failed to hydrate state:', error);
      toast.error('Failed to load practice session');
      setCurrentView('dashboard');
    } finally {
      setIsHydrating(false);
    }
  }, [courseId, topicId, problemId, selectedCourse, selectedTopic, selectedProblem]);

  // Sync view and state with URL parameters
  useEffect(() => {
    if (courseId || topicId || problemId) {
      // If we have IDs in URL but missing state, hydrate
      if ((courseId && !selectedCourse) || (topicId && !selectedTopic) || (problemId && !selectedProblem)) {
        hydrateStateFromUrl();
      } else if (problemId) {
        setCurrentView('problem');
      } else if (courseId) {
        setCurrentView('topics');
      }
    } else {
      setCurrentView('dashboard');
    }
  }, [courseId, topicId, problemId, hydrateStateFromUrl, selectedCourse, selectedTopic, selectedProblem]);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView('topics');
    navigate(`/student/code-practice/courses/${course.id}`);
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    const cId = selectedCourse?.id || courseId;
    if (cId) {
      navigate(`/student/code-practice/courses/${cId}/topics/${topic.id}`);
    }
  };

  const handleProblemSelect = (problem: CodingProblem) => {
    setSelectedProblem(problem);
    setCurrentView('problem');
    const cId = selectedCourse?.id || courseId;
    const tId = selectedTopic?.id || topicId;
    if (cId && tId) {
      navigate(`/student/code-practice/courses/${cId}/topics/${tId}/questions/${problem.id}`);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setSelectedTopic(null);
    setSelectedProblem(null);
    navigate('/student/code-practice');
  };

  const handleBackToTopics = () => {
    setCurrentView('topics');
    setSelectedProblem(null);
    const cId = selectedCourse?.id || courseId;
    const tId = selectedTopic?.id || topicId;
    if (cId && tId) {
      navigate(`/student/code-practice/courses/${cId}/topics/${tId}`);
    } else if (cId) {
      navigate(`/student/code-practice/courses/${cId}`);
    } else {
      navigate('/student/code-practice');
    }
  };

  const handleViewAnalytics = () => {
    setCurrentView('analytics');
  };

  const handleViewInsights = () => {
    setCurrentView('insights');
  };

  return (
    <DashboardLayout
      hideHeader={true}
      hideFooter={true}
      contentClassName="h-full flex flex-col overflow-hidden"
    >
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
        {isHydrating ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading your practice session...</p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <CourseDashboard
                onCourseSelect={handleCourseSelect}
                onViewAnalytics={handleViewAnalytics}
              />
            )}

            {currentView === 'topics' && selectedCourse && (
              <TopicSelection
                course={selectedCourse}
                selectedTopic={selectedTopic}
                onTopicSelect={handleTopicSelect}
                onProblemSelect={handleProblemSelect}
                onBack={handleBackToDashboard}
              />
            )}

            {currentView === 'problem' && selectedProblem && selectedCourse && selectedTopic && (
              <CodeEditorWithAI
                problem={selectedProblem}
                course={selectedCourse}
                topic={selectedTopic}
                onBack={handleBackToTopics}
                onViewAnalytics={handleViewAnalytics}
                codeSubmissionType="practice"
                initialEditorOpen={true}
                onSubmissionComplete={(problemId, success, result) => {
                  if (success && result?.gamification) {
                    showGamificationToasts(result.gamification);
                  }
                }}
              />
            )}

            {currentView === 'analytics' && (
              <ScoreAnalytics
                onBack={handleBackToDashboard}
                onViewInsights={handleViewInsights}
              />
            )}

            {currentView === 'insights' && (
              <AIInsights
                onBack={() => setCurrentView('analytics')}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CodePractice;