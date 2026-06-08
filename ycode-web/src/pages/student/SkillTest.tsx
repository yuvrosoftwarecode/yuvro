import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

import SkillTestDashboard from "@/components/student/skill-test/SkillTestDashboard";
import TopicSidebar from "@/components/common/CourseSidebar";
import TestCards from "@/components/student/skill-test/TestCards";
import TestInstructions from "@/components/student/skill-test/TestInstructions";
import TestResults from "@/components/student/skill-test/TestResults";
import AssessmentInterface from "@/components/student/AssessmentInterface";
import DashboardLayout from "@/components/common/DashboardLayout";
import ProctoringGate from "@/components/student/ProctoringGate";

import {
  fetchCourses,
  fetchTopicsByCourse,
} from "@/services/courseService";
import { getSkillTestsByTopic, startSkillTest } from "@/services/skillTestService";
import { toast } from "sonner";
import { getCourseIconConfig } from "@/utils/CourseIcons";

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
  icon?: React.ReactNode;
  iconBg?: string;
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
  description?: string;
  course?: string;
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

// Removed manual ICONS and COLORS. Using CourseIcons utility instead.

// Map SkillTest API response to local Test shape
const mapSkillTests = (data: any[]): Test[] =>
  data.map((t) => ({
    id: t.id,
    title: t.title,
    difficulty: (t.difficulty
      ? t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1).toLowerCase()
      : "Medium") as "Easy" | "Medium" | "Hard",
    totalQuestions: t.total_questions ?? 0,
    duration: t.duration ?? 0,
    totalMarks: t.total_marks ?? 0,
    topicId: t.topic ?? "",
    maxAttempts: t.max_attempts ?? 1,
    my_submissions: t.my_submissions,
    enable_proctoring: t.enable_proctoring,
    description: t.description,
    course: t.course,
  }));

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
    return testId;
  };

  const actualTestId = extractTestIdFromPath();

  const [loadingView, setLoadingView] = useState(true);
  const [hideNavigation, setHideNavigation] = useState(false);
  const [activeScreenStream, setActiveScreenStream] = useState<MediaStream | null>(null);
  const [tabSwitchThreshold, setTabSwitchThreshold] = useState(3);
  const [violationThreshold, setViolationThreshold] = useState(5);
  const [gateActive, setGateActive] = useState(false);
  const [gatePassed, setGatePassed] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [initialViolations, setInitialViolations] = useState(0);
  const [initialTabSwitches, setInitialTabSwitches] = useState(0);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingCourses(true);
        const data = await fetchCourses();
        const coursesWithConfig = data.map((course: any) => {
          const config = getCourseIconConfig(course.name, course.category);
          return {
            ...course,
            icon: config.Icon,
            iconBg: config.bg,
            topicCount: course.topic_count || 0,
          };
        });
        setCourses(coursesWithConfig);

        // If we have courseId in URL, initialize that course
        if (courseId) {
          const course = coursesWithConfig.find((c: Course) => c.id.toString() === courseId);
          if (course) {
            const topics = await fetchTopicsByCourse(courseId);
            const courseWithTopics = { ...course, topics };
            setSelectedCourse(courseWithTopics);

            // Handle specific test or results view
            if (actualTestId) {
              if (isResultsRoute) {
                setCurrentView("results");
              } else {
                setCurrentView("instructions");
              }
            } else {
              setCurrentView("tests");
              // default to first topic if none selected
              if (topics.length > 0) {
                setSelectedTopic(topics[0]);
                const testsData = await getSkillTestsByTopic(topics[0].id);
                setTests(mapSkillTests(testsData));
              }
            }
          }
        } else {
          setCurrentView("courses");
        }
      } catch (error) {
        console.error("Error loading skill tests:", error);
        toast.error("Failed to load content. Please try again.");
      } finally {
        setLoadingCourses(false);
        setLoadingView(false);
      }
    };

    loadInitialData();
  }, [courseId, actualTestId, isResultsRoute]);

  const handleCourseSelect = async (course: Course) => {
    setLoadingView(true);
    try {
      const topics = await fetchTopicsByCourse(course.id.toString());
      const courseWithTopics = { ...course, topics };
      setSelectedCourse(courseWithTopics);
      setCurrentView("tests");

      if (topics.length > 0) {
        setSelectedTopic(topics[0]);
        const testsData = await getSkillTestsByTopic(topics[0].id);
        setTests(mapSkillTests(testsData));
      }
      navigate(`/student/courses/${course.id}/skill-tests`);
    } catch (error) {
      console.error("Error selecting course:", error);
      toast.error("Failed to load topics.");
    } finally {
      setLoadingView(false);
    }
  };

  const handleTopicSelect = async (topic: Topic) => {
    setLoadingView(true);
    setSelectedTopic(topic);
    try {
      const testsData = await getSkillTestsByTopic(topic.id);
      setTests(mapSkillTests(testsData));
      setCurrentView("tests");
      navigate(`/student/courses/${courseId}/skill-tests`);
    } catch (error) {
      console.error("Error selecting topic:", error);
      toast.error("Failed to load tests.");
    } finally {
      setLoadingView(false);
    }
  };

  const handleStartTest = (test: Test) => {
    setSelectedTest(test);
    setCurrentView("instructions");
    navigate(`/student/courses/${courseId}/skill-tests/${test.id}`);
  };

  const handleBeginTest = async (testId: string) => {
    try {
      setLoadingView(true);
      const response = await startSkillTest(testId);
      setQuestions(response.questions);
      setCurrentSubmissionId(response.submission_id);
      // Read proctoring thresholds from API response
      setTabSwitchThreshold(response.tab_switch_threshold ?? 3);
      setViolationThreshold(response.violation_threshold ?? 5);
      setInitialViolations(response.violation_count ?? 0);
      setInitialTabSwitches(response.tab_switch_count ?? 0);
      setCurrentView("test");
      setHideNavigation(true);
    } catch (error: any) {
      console.error("Error starting test:", error);
      toast.error(error.message || "Failed to start test.");
    } finally {
      setLoadingView(false);
    }
  };

  const handleTestComplete = (_stats?: { answeredCount: number; totalQuestions: number; timeSpent: number }) => {
    const submissionId = currentSubmissionId || "";
    setTestSubmissions(prev => ({
      ...prev,
      [selectedTest?.id || ""]: submissionId
    }));
    setCurrentSubmissionId(submissionId);
    setTestCompleted(prev => new Set(prev).add(selectedTest?.id || ""));
    setCurrentView("results");
    setHideNavigation(false);
    navigate(`/student/courses/${courseId}/skill-tests/${selectedTest?.id}/results`);
  };

  const handleBackToInstructions = () => {
    setCurrentView("instructions");
    setHideNavigation(false);
  };

  const handleBackToTests = () => {
    setCurrentView("tests");
    setHideNavigation(false);
    setGatePassed(false);
    setGateActive(false);
    setCameraStream(null);
    navigate(`/student/courses/${courseId}/skill-tests`);
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedTopic(null);
    setCurrentView("courses");
    navigate("/student/skill-test");
  };

  const handleViewResult = (test: Test) => {
    setSelectedTest(test);
    setCurrentView("results");
    navigate(`/student/courses/${courseId}/skill-tests/${test.id}/results`);
  };

  const handleViewAllResults = () => {
    navigate("/student/skill-test/results");
  };

  const handleRetakeTest = () => {
    if (selectedTest) {
      handleBeginTest(selectedTest.id);
    }
  };

  const filteredTests = tests.filter(test => test.topicId === selectedTopic?.id);

  if (loadingView && !courses.length) {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (gateActive && !gatePassed && selectedTest) {
    return (
      <ProctoringGate
        onReady={(stream) => {
          setCameraStream(stream);
          setGatePassed(true);
          setGateActive(false);
          handleBeginTest(selectedTest.id);
        }}
        onCancel={() => {
          setGateActive(false);
          setCurrentView("instructions");
        }}
      />
    );
  }

  if (currentView === "instructions" && selectedTest && selectedTopic) {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true}>
        <TestInstructions
          test={{
            id: selectedTest.id,
            title: selectedTest.title,
            course: selectedCourse?.name || "",
            duration: selectedTest.duration,
            totalQuestions: selectedTest.totalQuestions,
            difficulty: selectedTest.difficulty,
            description: selectedTest.description || "",
            marks: selectedTest.totalMarks,
            enable_proctoring: selectedTest.enable_proctoring,
          }}
          onStart={() => {
            if (selectedTest.enable_proctoring) {
              setGateActive(true);
            } else {
              handleBeginTest(selectedTest.id);
            }
          }}
          onBack={handleBackToTests}
        />
      </DashboardLayout>
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
          tab_switch_threshold: tabSwitchThreshold,
          violation_threshold: violationThreshold,
          initial_violations: initialViolations,
          initial_tab_switches: initialTabSwitches,
        }}
        questions={questions}
        submissionId={currentSubmissionId || ""}
        onComplete={handleTestComplete}
        onBack={handleBackToInstructions}
        screenStream={activeScreenStream}
        assessmentType="skill-tests"
        preExamCameraStream={cameraStream}
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
      <DashboardLayout hideHeader={true} hideFooter={true}>
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
      </DashboardLayout>
    );
  }

  // Fallback case for results view when conditions aren't met
  if (currentView === "results") {
    console.log('Results view requested but conditions not met. Showing fallback.');
    return (
      <DashboardLayout hideHeader={true} hideFooter={true}>
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
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout
      hideHeader={true}
      hideFooter={true}
      contentClassName="h-full p-0 overflow-hidden"
    >
      <div className="h-full flex min-h-0 bg-background">
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
    </DashboardLayout>
  );
};

export default SkillTest;