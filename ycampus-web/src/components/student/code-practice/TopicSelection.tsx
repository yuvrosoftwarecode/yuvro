// src/components/student/code-practice/TopicSelection.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchTopicsByCourse,
} from '@/services/courseService';
import { fetchQuestions } from '@/services/questionService';
import type { Course, Topic, CodingProblem } from '@/pages/student/CodePractice';
import { toast } from 'sonner';
import TopicSidebar, { SidebarCourse, SidebarTopic } from '@/components/student/skill-test/TopicSidebar';

interface TopicSelectionProps {
  course: Course;
  selectedTopic: Topic | null;
  onTopicSelect: (topic: Topic) => void;
  onProblemSelect: (problem: CodingProblem) => void;
  onBack: () => void;
}

interface BackendTopic {
  id: string;
  name: string;
  order_index: number;
  total_problems?: number;
  progress_percentage?: number;
}

const TopicSelection = ({
  course,
  selectedTopic,
  onTopicSelect,
  onProblemSelect,
  onBack,
}: TopicSelectionProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load topics
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const fetchedTopics = await fetchTopicsByCourse(course.id);


        const topicsWithCounts = fetchedTopics.map((topic: BackendTopic) => ({
          id: topic.id,
          name: topic.name,
          problemCount: topic.total_problems || 0,
          order_index: topic.order_index,
          progress: Math.round(topic.progress_percentage || 0)
        }));

        setTopics(
          topicsWithCounts.sort((a: any, b: any) => a.order_index - b.order_index)
        );
      } catch (error) {
        toast.error('Failed to load topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [course.id]);

  // Load problems when topic or difficulty changes
  useEffect(() => {
    if (selectedTopic) loadProblems(selectedTopic.id);
  }, [selectedTopic, difficulty]);

  const loadProblems = async (topicId: string) => {
    setProblemsLoading(true);
    try {
      // Prepare filters for question service
      const filters: any = {
        topic: topicId,
        categories: 'practice',
        type: 'coding'
      };

      // Add difficulty filter if not 'All'
      if (difficulty !== 'All') {
        filters.difficulty = difficulty.toLowerCase();
      }

      // Load questions from question service with category 'practice' and type 'coding'
      const questions = await fetchQuestions(filters);

      const transformedProblems: CodingProblem[] = questions.map((q) => ({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty === 'easy' ? 'Easy' :
          q.difficulty === 'medium' ? 'Medium' : 'Hard',
        score: q.marks,
        description: q.content,
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
      }));

      setProblems(transformedProblems);
    } catch (error) {
      console.error('Failed to load problems:', error);
      toast.error('Failed to load problems');
    } finally {
      setProblemsLoading(false);
    }
  };

  // Problems are already filtered by the server based on difficulty
  const filteredProblems = problems;

  // Difficulty badge colors (pure Tailwind)
  const difficultyColors = {
    Easy: 'bg-green-100 text-green-700 border border-green-300',
    Medium: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    Hard: 'bg-red-100 text-red-700 border border-red-300',
  };

  // Construct SidebarCourse object for TopicSidebar
  const sidebarCourse: SidebarCourse = {
    id: course.id,
    name: course.name,
    icon: '💻',
    topics: topics.map(t => ({
      id: t.id,
      name: t.name,
      problemCount: t.problemCount,
      progress: t.progress
    }))
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* Reusable Sidebar */}
      <TopicSidebar
        course={sidebarCourse}
        selectedTopic={selectedTopic as SidebarTopic}
        onTopicSelect={(t) => {
          const original = topics.find(orig => orig.id === t.id);
          if (original) onTopicSelect(original);
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        showProgress={true}
        overallProgress={course.progress}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto min-h-full">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors">
              Code Practice
            </Button>
            <span>/</span>
            <span className="text-gray-700 font-medium">{course.name}</span>
            {selectedTopic && (
              <>
                <span>/</span>
                <span className="text-gray-900 font-semibold">{selectedTopic.name}</span>
              </>
            )}
          </div>

          {!selectedTopic ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <Code2 className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Select a Topic
              </h3>
              <p className="text-gray-500 max-w-md">
                Choose a topic from the sidebar to view practice problems and start coding.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTopic.name}</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {filteredProblems.length} problems available
                  </p>
                </div>

                {/* Difficulty Filter */}
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                  {(['All', 'Easy', 'Medium', 'Hard'] as const).map((level) => (
                    <button
                      key={level}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${difficulty === level
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      onClick={() => setDifficulty(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problems Grid */}
              {problemsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 bg-gray-200 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredProblems.map((problem) => (
                    <Card
                      key={problem.id}
                      className="group border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                            {problem.title}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 ${difficultyColors[problem.difficulty]}`}
                          >
                            {problem.difficulty}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 line-clamp-2 h-10">
                          {problem.description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-500">
                            Score: <span className="text-gray-900">{problem.score}</span>
                          </span>

                          <Button
                            size="sm"
                            className="bg-gray-900 text-white hover:bg-black transition-colors shadow-sm text-xs h-8"
                            onClick={() => onProblemSelect(problem)}
                          >
                            Solve Challenge
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredProblems.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white rounded-xl border border-gray-200 border-dashed">
                      <Code2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        No Problems Found
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Try selecting a different difficulty level.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicSelection;