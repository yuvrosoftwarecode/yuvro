import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navigation from "@/components/common/Navigation";
import { Button } from "@/components/ui/button";

import SubjectSelection from "@/components/student/skill-test/SubjectSelection";
import UnitSidebar from "@/components/student/skill-test/UnitSidebar";
import TestCards from "@/components/student/skill-test/TestCards";
import TestInstructions from "@/components/student/skill-test/TestInstructions";
import TestResults from "@/components/student/skill-test/TestResults";
import AssessmentInterface from "@/components/student/AssessmentInterface";

import {
  fetchSubjects,
  fetchUnitsBySubject,
} from "@/services/subjectService";
import { getSkillTestsByUnit, startSkillTest } from "@/services/skillTestService";
import { toast } from "sonner";

export interface Unit {
  id: string;
  name: string;
  progress?: number;
  completed?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  units: Unit[];
  category?: string;
  unitCount?: number;
}

export interface Test {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  totalQuestions: number;
  duration: number;
  totalMarks: number;
  unitId: string;
  subject: string;
  maxAttempts: number;
  my_submissions?: any[];
}

interface TestStats {
  answeredCount: number;
  totalQuestions: number;
  timeSpent: number;
}

type View =
  | "subjects"
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
  const { subjectId, testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State declarations first
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>("subjects");

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
      // For path like /student/subjects/subjectId/skill-tests/testId/results
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
    subjectId,
    testId,
    actualTestId,
    selectedTest: selectedTest?.id
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingSubjects(true);
        const backendSubjects = await fetchSubjects();

        const mapped: Subject[] = backendSubjects.map(
          (c: any, index: number): Subject => ({
            id: c.id,
            name: c.name,
            description: `Skill tests for ${c.name}`,
            icon: ICONS[index % ICONS.length],
            color: COLORS[index % COLORS.length],
            units: [],
            category: c.category || "General",
            unitCount: c.units ? c.units.length : 0,
          })
        );

        setSubjects(mapped);
      } catch (err) {
        console.error("Failed to load subjects", err);
        toast.error("Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };

    load();
  }, []);

  const handleSubjectSelect = (subject: Subject) => {
    setCurrentView("tests");
    navigate(`/student/subjects/${subject.id}/skill-tests`);
  };

  const handleStartTest = (test: Test) => {
    if (subjectId) {
      navigate(`/student/subjects/${subjectId}/skill-tests/${test.id}`);
    }
  };

  const handleBackToSubjects = () => {
    navigate("/student/skill-test");
  };

  const refreshTestsData = async () => {
    if (!selectedSubject) return;

    try {
      const realTests: Test[] = [];
      const updatedUnits = [...selectedSubject.units];

      for (const unit of updatedUnits) {
        try {
          const apiTests = await getSkillTestsByUnit(unit.id);
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
            unit.progress = Math.round((completedCount / totalTests) * 100);
            unit.completed = unit.progress === 100;
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
            unitId: unit.id,
            subject: selectedSubject.name,
            maxAttempts: t.max_attempts || 3,
            my_submissions: (t as any).my_submissions || []
          }));
          realTests.push(...mappedTests);
        } catch (e) {
          console.error("Error loading tests for unit:", e);
        }
      }

      setTests(realTests);
      // Update selectedSubject with new unit progress
      setSelectedSubject(prev => prev ? ({ ...prev, units: updatedUnits }) : null);
    } catch (err) {
      console.error("Failed to refresh tests data", err);
    }
  };

  const handleBackToTests = async () => {
    await refreshTestsData();

    if (subjectId) {
      navigate(`/student/subjects/${subjectId}/skill-tests`);
    } else {
      navigate("/student/skill-test");
    }
  };

  useEffect(() => {
    if (loadingSubjects || subjects.length === 0) return;

    const syncSubject = async () => {
      if (subjectId) {
        const foundSubject = subjects.find(c => c.id === subjectId);

        if (foundSubject) {
          if (foundSubject.units.length === 0) {
            try {
              const backendUnits = await fetchUnitsBySubject(foundSubject.id);
              const uiUnits: Unit[] = backendUnits.map((t: any) => ({
                id: t.id,
                name: t.name,
                progress: 0,
                completed: false,
              }));

              setSubjects(prev =>
                prev.map(c =>
                  c.id === foundSubject.id ? { ...c, units: uiUnits } : c
                )
              );

              const updatedSubject = { ...foundSubject, units: uiUnits };
              setSelectedSubject(updatedSubject);
              setSelectedUnit(uiUnits[0] || null);

              const realTests: Test[] = [];
              for (const unit of uiUnits) {
                try {
                  const apiTests = await getSkillTestsByUnit(unit.id);
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
                    unit.progress = Math.round((completedCount / totalTests) * 100);
                    unit.completed = unit.progress === 100;
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
                    unitId: unit.id,
                    subject: foundSubject.name,
                    maxAttempts: t.max_attempts || 3,
                    my_submissions: (t as any).my_submissions || []
                  }));
                  realTests.push(...mappedTests);
                } catch (e) {
                  console.error("Error loading tests for unit:", e);
                }
              }

              setTests(realTests);
              // Update subject state to reflect the calculated progress
              setSelectedSubject(prev => prev ? ({ ...prev, units: [...uiUnits] }) : null);

            } catch (err) {
              console.error("Failed to load units", err);
            }
          } else {
            if (!selectedSubject || selectedSubject.id !== subjectId) {
              setSelectedSubject(foundSubject);
              setSelectedUnit(foundSubject.units[0] || null);
            }
          }

          if (!testId) {
            setCurrentView("tests");
          }
          setSidebarOpen(true);
        }
      } else {
        setSelectedSubject(null);
        setSelectedUnit(null);
        setTests([]);
        setCurrentView("subjects");
      }
    };

    syncSubject();
  }, [subjectId, subjects, loadingSubjects]);

  useEffect(() => {
    if (selectedSubject && tests.length > 0) {
      if (actualTestId) {
        const foundTest = tests.find(t => t.id === actualTestId);
        if (foundTest) {
          setSelectedTest(foundTest);

          // Check if we're on the results route
          if (isResultsRoute) {
            // Set up for results view
            const matchingUnit = selectedSubject.units.find(t => t.id === foundTest.unitId);
            if (matchingUnit) {
              setSelectedUnit(matchingUnit);

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

          const matchingUnit = selectedSubject.units.find(t => t.id === foundTest.unitId);
          if (matchingUnit) setSelectedUnit(matchingUnit);
        }
      } else {
        setSelectedTest(null);
        setCurrentView("tests");
      }
    }
  }, [actualTestId, tests, selectedSubject, testCompleted, isResultsRoute]);

  const handleUnitSelect = async (unit: Unit) => {
    setSelectedUnit(unit);
    await refreshTestsData();

    if (testId) {
      navigate(`/student/subjects/${selectedSubject?.id}/skill-tests`);
    } else {
      setCurrentView("tests");
    }
  };

  const handleBeginTest = async () => {
    if (!selectedTest) return;

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
    if (subjectId && selectedTest) {
      navigate(`/student/subjects/${subjectId}/skill-tests/${selectedTest.id}/results`);
    }
  };

  const handleViewResult = (submissionId: string, test: Test) => {
    // Navigate to results URL with specific submission
    if (subjectId) {
      navigate(`/student/subjects/${subjectId}/skill-tests/${test.id}/results`);
    }
  };

  const handleRetakeTest = async () => {
    console.log('handleRetakeTest called with:', { subjectId, testId, actualTestId, selectedTest });

    await refreshTestsData();

    const testIdToUse = actualTestId || selectedTest?.id;

    if (subjectId && testIdToUse) {
      console.log('Navigating to:', `/student/subjects/${subjectId}/skill-tests/${testIdToUse}`);
      navigate(`/student/subjects/${subjectId}/skill-tests/${testIdToUse}`);
    } else {
      console.error('Cannot navigate - missing subjectId or testId', { subjectId, testIdToUse });
    }
  };

  const handleBackToInstructions = () => {
    setCurrentView("instructions");
  };

  const handleViewAllResults = async (test: Test) => {
    console.log('handleViewAllResults called with test:', test.id, test.title);

    // Navigate to the results URL instead of just changing view state
    if (subjectId) {
      navigate(`/student/subjects/${subjectId}/skill-tests/${test.id}/results`);
    }
  };


  const filteredTests: Test[] = selectedUnit
    ? tests.filter((t) => t.unitId === selectedUnit.id)
    : [];

  const hideNavigation =
    currentView === "instructions" ||
    currentView === "test" ||
    currentView === "results";

  if (currentView === "instructions" && selectedTest && selectedUnit) {
    return (
      <div className="min-h-screen bg-background">
        {!hideNavigation && <Navigation />}
        <TestInstructions
          test={{
            id: selectedTest.id,
            title: selectedTest.title,
            course: selectedSubject?.name || "",
            duration: selectedTest.duration,
            totalQuestions: selectedTest.totalQuestions,
            difficulty: selectedTest.difficulty,
            description: `${selectedUnit.name} - ${selectedTest.difficulty} level test`,
            marks: selectedTest.totalMarks,
          }}
          onStart={handleBeginTest}
          onBack={handleBackToTests}
        />
      </div>
    );
  }

  if (currentView === "test" && selectedTest && selectedUnit) {
    return (
      <div className="min-h-screen bg-background">
        {!hideNavigation && <Navigation />}
        <AssessmentInterface
          assessment={{
            id: selectedTest.id,
            title: selectedTest.title,
            course: selectedSubject?.name || "",
            duration: selectedTest.duration,
            totalQuestions: selectedTest.totalQuestions,
            topicId: selectedUnit.id,
          }}
          questions={questions}
          submissionId={currentSubmissionId || ""}
          onComplete={handleTestComplete}
          onBack={handleBackToInstructions}
        />
      </div>
    );
  }

  // Debug logging for results view
  if (currentView === "results") {
    console.log('Current view is results, checking conditions:');
    console.log('selectedTest:', selectedTest?.id, selectedTest?.title);
    console.log('selectedUnit:', selectedUnit?.id, selectedUnit?.name);
    console.log('currentSubmissionId:', currentSubmissionId);

    if (!selectedTest) {
      console.log('ERROR: selectedTest is null/undefined');
    }
    if (!selectedUnit) {
      console.log('ERROR: selectedUnit is null/undefined');
    }
  }

  if (currentView === "results" && selectedTest && selectedUnit) {
    console.log('Rendering TestResults component with:', {
      testId: selectedTest.id,
      submissionId: testSubmissions[selectedTest.id] || currentSubmissionId || "",
      course: selectedSubject?.name,
      testTitle: selectedTest.title,
      topicName: selectedUnit.name
    });

    return (
      <div className="min-h-screen bg-background">
        {!hideNavigation && <Navigation />}
        <TestResults
          test={{
            id: selectedTest.id,
            title: selectedTest.title,
            course: selectedSubject?.name || "",
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
        {!hideNavigation && <Navigation />}
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Unable to Load Results</h2>
            <p className="text-muted-foreground mb-4">
              Missing required data:
              {!selectedTest && " selectedTest"}
              {!selectedUnit && " selectedUnit"}
            </p>
            <Button onClick={handleBackToTests}>Back to Tests</Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      {!hideNavigation && <Navigation />}

      <div className="flex h-[calc(100vh-64px)]">
        {selectedSubject && (currentView === "tests" || (actualTestId && !isResultsRoute)) && (
          <UnitSidebar
            subject={selectedSubject}
            selectedUnit={selectedUnit}
            onUnitSelect={handleUnitSelect}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            overallProgress={
              selectedSubject.units.length > 0
                ? Math.round(
                  selectedSubject.units.reduce((acc, t) => acc + (t.progress || 0), 0) / selectedSubject.units.length
                )
                : 0
            }
          />
        )}

        <div className="flex-1 overflow-auto">
          {currentView === "subjects" ? (
            <SubjectSelection
              subjects={subjects}
              onSubjectSelect={handleSubjectSelect}
            />
          ) : (
            <TestCards
              tests={filteredTests}
              courseName={selectedSubject?.name || ""}
              topicName={selectedUnit?.name || ""}
              onBack={handleBackToSubjects}
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
