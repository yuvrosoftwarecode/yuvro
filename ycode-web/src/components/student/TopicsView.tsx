import React, { useState, useEffect } from 'react';
import { Course, TopicBasic, Subtopic, CodingProblem } from '../../services/courseService';
import courseService from '../../services/courseService';



interface TopicsViewProps {
  course: Course;
  onBackToCourses: () => void;
  onProblemSelect: (problem: any, courseName: string) => void;
}

const TopicsView: React.FC<TopicsViewProps> = ({ course, onBackToCourses, onProblemSelect }) => {
  const [topics, setTopics] = useState<TopicBasic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicBasic | null>(null);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemsLoading, setProblemsLoading] = useState(false);

  useEffect(() => {
    loadTopics();
  }, [course.id]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const topicsData = await courseService.getTopics(course.id.toString());
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = async (topic: TopicBasic) => {
    setSelectedTopic(topic);
    setProblemsLoading(true);

    try {
      // Get subtopics for this topic
      const subtopics = (await courseService.getSubtopics(topic.id)) as Subtopic[];

      // Get coding problems for all subtopics
      const allProblems: CodingProblem[] = [];
      for (const subtopic of subtopics) {
        try {
          const problems = await courseService.getCodingProblems(subtopic.id);
          allProblems.push(...problems);
        } catch (error) {
          console.error(`Failed to load problems for subtopic ${subtopic.id}:`, error);
        }
      }

      setCodingProblems(allProblems);
    } catch (error) {
      console.error('Failed to load coding problems:', error);
      setCodingProblems([]);
    } finally {
      setProblemsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToCourses}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-2xl font-bold text-gray-900">{course.name || course.title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Topics</h3>
            {topics.length > 0 ? (
              <div className="space-y-2">
                {topics.map((topic, index) => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    className={`
                      w-full text-left p-3 rounded-lg transition-colors
                      ${selectedTopic?.id === topic.id
                        ? 'bg-blue-50 border-blue-200 border text-blue-900'
                        : 'hover:bg-gray-50 border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-medium">
                          {topic.name}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No topics available for this course.</p>
            )}
          </div>
        </div>

        {/* Coding Problems */}
        <div className="lg:col-span-2">
          {selectedTopic ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedTopic.name} - Coding Problems
                </h3>
                <span className="text-sm text-gray-500">
                  {codingProblems.length} problem{codingProblems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {problemsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading problems...</p>
                </div>
              ) : codingProblems.length > 0 ? (
                <div className="space-y-4">
                  {codingProblems.map((problem, index) => (
                    <div
                      key={problem.id}
                      onClick={() => onProblemSelect(problem, course.name || course.title || 'Course')}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}.
                          </span>
                          <h4 className="text-lg font-medium text-gray-900">
                            {problem.title}
                          </h4>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor('medium')}`}>
                          Medium
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {problem.description}
                      </p>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>
                            {problem.test_cases?.length || 0} test cases
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>Click to solve</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Coding Problems</h4>
                  <p className="text-gray-600">
                    No coding problems are available for this topic yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Topic</h3>
              <p className="text-gray-600">
                Choose a topic from the sidebar to view available coding problems.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicsView;