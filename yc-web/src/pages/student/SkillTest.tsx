import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navigation from "@/components/common/Navigation";
import { Button } from "@/components/ui/button";

import SkillTestDashboard from "@/components/student/skill-test/SkillTestDashboard";
import TopicSidebar from "@/components/common/CourseSidebar";
import TestCards from "@/components/student/skill-test/TestCards";
import TestInstructions from "@/components/student/skill-test/TestInstructions";
import TestResults from "@/components/student/skill-test/TestResults";
import AssessmentInterface from "@/components/student/AssessmentInterface";

import {
  fetchCourses,
  fetchTopicsByCourse,
} from "@/services/courseService";
import { getSkillTestsByTopic, startSkillTest } from "@/services/skillTestService";
import { toast } from "sonner";

export interface Topic {
  id: string;
  name: string;
  progress?: number;
  completed?: boolean;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  topics: Topic[];
  category?: string;
  topicCount?: number;
}

export interface Test {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  totalQuestions: number;
  duration: number;
  totalMarks: number;
  topicId: string;
  maxAttempts: number;
  my_submissions?: any[];
  enable_proctoring?: boolean;
}

interface TestStats {
  answeredCount: number;
  totalQuestions: number;
  timeSpent: number;
}

type View =
  | "courses"
  | "tests"
  | "instructions"
  | "test"
  | "results";

const ICONS = ["🧠", "🗂️", "⚙️", "🐍", "⚡", "⚛️", "📘", "💻"];
const COLORS = [
  "blue",
  "green",
  "orange",
  "yellow",
  "purple",
  "cyan",
  "pink",
  "indigo",
];

const SkillTest: React.FC = () => {
  const { courseId, testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State declarations first
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>("courses");

  const [tests, setTests] = useState<Test[]>([]);
  const [testCompleted, setTestCompleted] = useState<Set<string>>(new Set());
  const [testSubmissions, setTestSubmissions] = useState<Record<string, string>>({});

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);

  // Check if we're on the results route
  const isResultsRoute = window.location.pathname.endsWith('/results');

  // Extract testId from URL if not available from useParams (for results route)
  const extractTestIdFromPath = () => {
    if (isResultsRoute) {
      // For path like /student/courses/courseId/skill-tests/testId/results
      const pathParts = location.pathname.split('/');
      const skillTestsIndex = pathParts.indexOf('skill-tests');
      if (skillTestsIndex !== -1 && pathParts[skillTestsIndex + 1]) {
        return pathParts[skillTestsIndex + 1];
      }
    }
    return null;
  };

  const actualTestId = testId || extractTestIdFromPath();

  console.log('SkillTest component - URL info:', {
    pathname: window.location.pathname,
    isResultsRoute,
    courseId,
    testId,
    actualTestId,
    selectedTest: selectedTest?.id
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCourses(true);
        const backendCourses = await fetchCourses();

        const mapped: Course[] = backendCourses.map(
          (c: any, index: number): Course => ({
            id: c.id,
            name: c.name,
            description: `Skill tests for ${c.name}`,
            icon: ICONS[index % ICONS.length],
            color: COLORS[index % COLORS.length],
            topics: [],
            category: c.category || "General",
            topicCount: c.topics ? c.topics.length : 0,
          })
        );

        setCourses(mapped);
      } catch (err) {
        console.error("Failed to load courses", err);
        toast.error("Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    };

    load();
  }, []);

  const handleCourseSelect = (course: Course) => {
    setCurrentView("tests");
    navigate(`/student/courses/${course.id}/skill-tests`);
  };

  const handleStartTest = (test: Test) => {
    if (courseId) {
      navigate(`/student/courses/${courseId}/skill-tests/${test.id}`);
    }
  };

  const handleBackToCourses = () => {
    navigate("/student/skill-test");
  };

  const refreshTestsData = async () => {
    if (!selectedCourse) return;

    try {
      const realTests: Test[] = [];
      const updatedTopics = [...selectedCourse.topics];

      for (const topic of updatedTopics) {
        try {
          const apiTests = await getSkillTestsByTopic(topic.id);
          const activeTests = apiTests.filter(t => t.publish_status === 'active');

          // Calculate Progress
          const totalTests = activeTests.length;
          let completedCount = 0;

          activeTests.forEach(t => {
            const subs = (t as any).my_submissions || [];
            const isDone = subs.some((s: any) =>
              s.status === 'completed' || s.status === 'submitted' || s.status === 'evaluated'
            );
            if (isDone) completedCount++;
          });

          if (totalTests > 0) {
            topic.progress = Math.round((completedCount / totalTests) * 100);
            topic.completed = topic.progress === 100;
          }

          const mappedTests: Test[] = activeTests.map(t => ({
            id: t.id,
            title: t.title,
            difficulty: t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1) as "Easy" | "Medium" | "Hard",
            totalQuestions: t.total_questions || (t.questions_config.mcq_single.length +
              t.questions_config.mcq_multiple.length +
              t.questions_config.coding.length +
              t.questions_config.descriptive.length),
            totalMarks: t.total_marks,
            duration: t.duration,
            topicId: topic.id,
            course: selectedCourse.name,
            maxAttempts: t.max_attempts || 3,
            my_submissions: (t as any).my_submissions || [],
            enable_proctoring: t.enable_proctoring,
          }));
          realTests.push(...mappedTests);
        } catch (e) {
          console.error("Error loading tests for topic:", e);
        }
      }

      setTests(realTests);
      // Update selectedCourse with new topic progress
      setSelectedCourse(prev => prev ? ({ ...prev, topics: updatedTopics }) : null);
    } catch (err) {
      console.error("Failed to refresh tests data", err);
    }
  };

  const handleBackToTests = async () => {
    await refreshTestsData();

    if (courseId) {
      navigate(`/student/courses/${courseId}/skill-tests`);
    } else {
      navigate("/student/skill-test");
    }
  };

  useEffect(() => {
    if (loadingCourses || courses.length === 0) return;

    const syncCourse = async () => {
      if (courseId) {
        const foundCourse = courses.find(c => c.id === courseId);

        if (foundCourse) {
          if (foundCourse.topics.length === 0) {
            try {
              const backendTopics = await fetchTopicsByCourse(foundCourse.id);
              const uiTopics: Topic[] = backendTopics.map((t: any) => ({
                id: t.id,
                name: t.name,
                progress: 0,
                completed: false,
              }));

              setCourses(prev =>
                prev.map(c =>
                  c.id === foundCourse.id ? { ...c, topics: uiTopics } : c
                )
              );

              const updatedCourse = { ...foundCourse, topics: uiTopics };
              setSelectedCourse(updatedCourse);
              setSelectedTopic(uiTopics[0] || null);

              const realTests: Test[] = [];
              for (const topic of uiTopics) {
                try {
                  const apiTests = await getSkillTestsByTopic(topic.id);
                  const activeTests = apiTests.filter(t => t.publish_status === 'active');

                  // Calculate Progress
                  const totalTests = activeTests.length;
                  let completedCount = 0;

                  activeTests.forEach(t => {
                    const subs = (t as any).my_submissions || [];
                    // Check if user has ANY successful/completed attempt
                    const isDone = subs.some((s: any) =>
                      s.status === 'completed' || s.status === 'submitted' || s.status === 'evaluated'
                    );
                    if (isDone) completedCount++;
                  });

                  if (totalTests > 0) {
                    topic.progress = Math.round((completedCount / totalTests) * 100);
                    topic.completed = topic.progress === 100;
                  }

                  const mappedTests: Test[] = activeTests.map(t => ({
                    id: t.id,
                    title: t.title,
                    difficulty: t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1) as "Easy" | "Medium" | "Hard",
                    totalQuestions: t.total_questions || (t.questions_config.mcq_single.length +
                      t.questions_config.mcq_multiple.length +
                      t.questions_config.coding.length +
                      t.questions_config.descriptive.length),
                    totalMarks: t.total_marks,
                    duration: t.duration,
                    topicId: topic.id,
                    course: foundCourse.name,
                    maxAttempts: t.max_attempts || 3,
                    my_submissions: (t as any).my_submissions || [],
                    enable_proctoring: t.enable_proctoring,
                  }));
                  realTests.push(...mappedTests);
                } catch (e) {
                  console.error("Error loading tests for topic:", e);
                }
              }

              setTests(realTests);
              // Update course state to reflect the calculated progress
              setSelectedCourse(prev => prev ? ({ ...prev, topics: [...uiTopics] }) : null);

            } catch (err) {
              console.error("Failed to load topics", err);
            }
          } else {
            if (!selectedCourse || selectedCourse.id !== courseId) {
              setSelectedCourse(foundCourse);
              setSelectedTopic(foundCourse.topics[0] || null);
            }
          }

          if (!testId) {
            setCurrentView("tests");
          }
          setSidebarOpen(true);
        }
      } else {
        setSelectedCourse(null);
        setSelectedTopic(null);
        setTests([]);
        setCurrentView("courses");
      }
    };

    syncCourse();
  }, [courseId, courses, loadingCourses]);

  useEffect(() => {
    if (selectedCourse && tests.length > 0) {
      if (actualTestId) {
        const foundTest = tests.find(t => t.id === actualTestId);
        if (foundTest) {
          setSelectedTest(foundTest);

          // Check if we're on the results route
          if (isResultsRoute) {
            // Set up for results view
            const matchingTopic = selectedCourse.topics.find(t => t.id === foundTest.topicId);
            if (matchingTopic) {
              setSelectedTopic(matchingTopic);

              // Get the latest submission ID from the test's submissions
              const submissions = foundTest.my_submissions || [];
              const completedSubmissions = submissions.filter(s => s.status === 'completed' || s.status === 'submitted');
              const latestSubmission = completedSubmissions[0]; // Should be the most recent

              if (latestSubmission) {
                setCurrentSubmissionId(latestSubmission.id);
              }

              setCurrentView("results");
            }
          } else if (currentView !== 'test' && currentView !== 'results') {
            setCurrentView("instructions");
          }

          const matchingTopic = selectedCourse.topics.find(t => t.id === foundTest.topicId);
          if (matchingTopic) setSelectedTopic(matchingTopic);
        }
      } else {
        setSelectedTest(null);
        setCurrentView("tests");
      }
    }
  }, [actualTestId, tests, selectedCourse, testCompleted, isResultsRoute]);

  const handleTopicSelect = async (topic: Topic) => {
    setSelectedTopic(topic);
    await refreshTestsData();

    if (testId) {
      navigate(`/student/courses/${selectedCourse?.id}/skill-tests`);
    } else {
      setCurrentView("tests");
    }
  };

  const [activeScreenStream, setActiveScreenStream] = useState<MediaStream | null>(null);

  const handleBeginTest = async (screenStream?: MediaStream) => {
    if (!selectedTest) return;

    if (screenStream) {
      setActiveScreenStream(screenStream);
    }

    // Request fullscreen synchronously before any async operations
    if (selectedTest.enable_proctoring && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => {
        console.warn("Fullscreen request declined or failed", e);
      });
    }

    try {

      const loadingToast = toast.loading("Starting test...");
      const res = await startSkillTest(selectedTest.id);
      toast.dismiss(loadingToast);

      if (res.status === 'started' || res.status === 'in_progress') {
        setQuestions(res.questions);
        setCurrentSubmissionId(res.submission_id);
        setCurrentView("test");
        toast.success("Test started successfully");
      } else if (res.status === 'completed' || res.status === 'submitted') {
        toast.info("You have already completed this test.");
      }
    } catch (err: any) {
      console.error("Failed to start test", err);

      let errorMessage = "Failed to start test";

      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage, {
        duration: 10000,
        action: {
          label: "×",
          onClick: () => toast.dismiss(),
        },
      });
    }
  };

  const handleTestComplete = async (stats?: TestStats) => {
    if (stats) {
      console.log('Test completed with stats:', stats);
    }

    if (selectedTest) {
      setTestCompleted((prev) => {
        const updated = new Set(prev);
        updated.add(selectedTest.id);
        return updated;
      });

      if (currentSubmissionId) {
        setTestSubmissions(prev => ({
          ...prev,
          [selectedTest.id]: currentSubmissionId
        }));
      }
    }

    await refreshTestsData();

    // Navigate to results URL instead of just changing view
    if (courseId && selectedTest) {
      navigate(`/student/courses/${courseId}/skill-tests/${selectedTest.id}/results`);
    }
  };

  const handleViewResult = (submissionId: string, test: Test) => {
    // Navigate to results URL with specific submission
    if (courseId) {
      navigate(`/student/courses/${courseId}/skill-tests/${test.id}/results`);
    }
  };

  const handleRetakeTest = async () => {
    console.log('handleRetakeTest called with:', { courseId, testId, actualTestId, selectedTest });

    await refreshTestsData();

    const testIdToUse = actualTestId || selectedTest?.id;

    if (courseId && testIdToUse) {
      console.log('Navigating to:', `/student/courses/${courseId}/skill-tests/${testIdToUse}`);
      navigate(`/student/courses/${courseId}/skill-tests/${testIdToUse}`);
    } else {
      console.error('Cannot navigate - missing courseId or testId', { courseId, testIdToUse });
    }
  };

  const handleBackToInstructions = () => {
    setCurrentView("instructions");
  };

  const handleViewAllResults = async (test: Test) => {
    console.log('handleViewAllResults called with test:', test.id, test.title);

    // Navigate to the results URL instead of just changing view state
    if (courseId) {
      navigate(`/student/courses/${courseId}/skill-tests/${test.id}/results`);
    }
  };


  const filteredTests: Test[] = selectedTopic
    ? tests.filter((t) => t.topicId === selectedTopic.id)
    : [];

  const hideNavigation = currentView !== "courses";

  if (currentView === "instructions" && selectedTest && selectedTopic) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation autoHide={hideNavigation} />
        <TestInstructions
          test={{
            id: selectedTest.id,
            title: selectedTest.title,
            course: selectedCourse?.name || "",
            duration: selectedTest.duration,
            totalQuestions: selectedTest.totalQuestions,
            difficulty: selectedTest.difficulty,
            description: `${selectedTopic.name} - ${selectedTest.difficulty} level test`,
            marks: selectedTest.totalMarks,
          }}
          onStart={handleBeginTest}
          onBack={handleBackToTests}
        />
      </div>
    );
  }

  if (currentView === "test" && selectedTest && selectedTopic) {
    return (
      <AssessmentInterface
        assessment={{
          id: selectedTest.id,
          title: selectedTest.title,
          course: selectedCourse?.name || "",
          duration: selectedTest.duration,
          totalQuestions: selectedTest.totalQuestions,
          topicId: selectedTopic.id,
          proctoring_enabled: selectedTest.enable_proctoring,
        }}
        questions={questions}
        submissionId={currentSubmissionId || ""}
        onComplete={handleTestComplete}
        onBack={handleBackToInstructions}
        screenStream={activeScreenStream}
      />
    );
  }

  // Debug logging for results view
  if (currentView === "results") {
    console.log('Current view is results, checking conditions:');
    console.log('selectedTest:', selectedTest?.id, selectedTest?.title);
    console.log('selectedTopic:', selectedTopic?.id, selectedTopic?.name);
    console.log('currentSubmissionId:', currentSubmissionId);

    if (!selectedTest) {
      console.log('ERROR: selectedTest is null/undefined');
    }
    if (!selectedTopic) {
      console.log('ERROR: selectedTopic is null/undefined');
    }
  }

  if (currentView === "results" && selectedTest && selectedTopic) {
    console.log('Rendering TestResults component with:', {
      testId: selectedTest.id,
      submissionId: testSubmissions[selectedTest.id] || currentSubmissionId || "",
      course: selectedCourse?.name,
      testTitle: selectedTest.title,
      topicName: selectedTopic.name
    });

    return (
      <div className="min-h-screen bg-background">
        <Navigation autoHide={hideNavigation} />
        <TestResults
          test={{
            id: selectedTest.id,
            title: selectedTest.title,
            course: selectedCourse?.name || "",
            duration: selectedTest.duration,
            totalQuestions: selectedTest.totalQuestions,
            marks: selectedTest.totalMarks,
          }}
          submissionId={testSubmissions[selectedTest.id] || currentSubmissionId || ""}
          onBackToList={handleBackToTests}
          onTryAgain={handleRetakeTest}
        />
      </div>
    );
  }

  // Fallback case for results view when conditions aren't met
  if (currentView === "results") {
    console.log('Results view requested but conditions not met. Showing fallback.');
    return (
      <div className="min-h-screen bg-background">
        <Navigation autoHide={hideNavigation} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Unable to Load Results</h2>
            <p className="text-muted-foreground mb-4">
              Missing required data:
              {!selectedTest && " selectedTest"}
              {!selectedTopic && " selectedTopic"}
            </p>
            <Button onClick={handleBackToTests}>Back to Tests</Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navigation autoHide={hideNavigation} />

      <div className="flex-1 flex min-h-0">
        {selectedCourse && (currentView === "tests" || (actualTestId && !isResultsRoute)) && (
          <TopicSidebar
            course={selectedCourse}
            selectedTopic={selectedTopic}
            onTopicSelect={handleTopicSelect}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            overallProgress={
              selectedCourse.topics.length > 0
                ? Math.round(
                  selectedCourse.topics.reduce((acc, t) => acc + (t.progress || 0), 0) / selectedCourse.topics.length
                )
                : 0
            }
          />
        )}

        <div className="flex-1 overflow-auto bg-background">
          {currentView === "courses" ? (
            <SkillTestDashboard
              courses={courses}
              onCourseSelect={handleCourseSelect}
            />
          ) : (
            <TestCards
              tests={filteredTests}
              courseName={selectedCourse?.name || ""}
              topicName={selectedTopic?.name || ""}
              onBack={handleBackToCourses}
              onStartTest={handleStartTest}
              onViewResult={handleViewResult}
              onViewAllResults={handleViewAllResults}
              completedTests={testCompleted}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillTest;