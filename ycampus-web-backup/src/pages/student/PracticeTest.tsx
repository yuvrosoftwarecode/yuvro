import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSidebar from "@/components/common/RoleSidebar";
import { Button } from "@/components/ui/button";

import SubjectSelection from "@/components/student/skill-test/SubjectSelection";
import UnitSidebar from "@/components/student/skill-test/UnitSidebar";
import TestCards from "@/components/student/skill-test/TestCards";
import TestInstructions from "@/components/student/skill-test/TestInstructions";
import TestResults from "@/components/student/skill-test/TestResults";
import AssessmentInterface from "@/components/student/AssessmentInterface";
import {
  BookOpen, Code, Database,
  Globe, Cpu, Layers, FlaskConical,
  BookMarked, PenLine, Sigma, Atom,
  Pencil, Binary, BrainCircuit, SquareFunction,
  LayoutGrid
} from 'lucide-react';

import {
  fetchSubjects,
  fetchUnitsBySubject,
} from "@/services/subjectService";
import { getSkillTestsByUnit, startSkillTest } from "@/services/skillTestService";
import { toast } from "sonner";

// Shared helper: fetch and map tests for a list of units in parallel
async function loadTestsForUnits(
  units: Unit[],
  subjectName: string,
  testType: string
): Promise<{ tests: Test[]; updatedUnits: Unit[] }> {
  const updatedUnits = units.map(u => ({ ...u }));

  const results = await Promise.all(
    updatedUnits.map(async (unit) => {
      try {
        const apiTests = await getSkillTestsByUnit(unit.id, testType);
        const activeTests = apiTests.filter(t => t.publish_status === 'active');

        const completedCount = activeTests.filter(t =>
          ((t as any).my_submissions || []).some((s: any) =>
            s.status === 'completed' || s.status === 'submitted' || s.status === 'evaluated'
          )
        ).length;

        if (activeTests.length > 0) {
          unit.progress = Math.round((completedCount / activeTests.length) * 100);
          unit.completed = unit.progress === 100;
        }

        const mapped: Test[] = activeTests.map(t => ({
          id: t.id,
          title: t.title,
          difficulty: (t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1)) as "Easy" | "Medium" | "Hard",
          // Flaw fix: questions_config is stripped from student responses — always use total_questions
          totalQuestions: t.total_questions || 0,
          totalMarks: t.total_marks,
          duration: t.duration,
          unitId: unit.id,
          subject: subjectName,
          maxAttempts: t.max_attempts || 3,
          enableProctoring: t.enable_proctoring ?? false,
          testType: t.test_type || 'practice',
          my_submissions: (t as any).my_submissions || [],
        }));

        return mapped;
      } catch {
        return [] as Test[];
      }
    })
  );

  return { tests: results.flat(), updatedUnits };
}

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
  icon: any; // Lucide icon component
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
  enableProctoring?: boolean;
  testType?: 'practice' | 'assessment';
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

const getSubjectIcon = (name: string, index: number): any => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('calculus') || lowerName.includes('matrices') || lowerName.includes('math')) return Sigma;
  if (lowerName.includes('python') || lowerName.includes('java') || lowerName.includes('programming') || lowerName.includes('code')) return Code;
  if (lowerName.includes('data') || lowerName.includes('sql') || lowerName.includes('database') || lowerName.includes('db')) return Database;
  if (lowerName.includes('physics')) return Atom;
  if (lowerName.includes('chemistry')) return FlaskConical;
  if (lowerName.includes('network') || lowerName.includes('web') || lowerName.includes('internet') || lowerName.includes('html') || lowerName.includes('react')) return Globe;
  if (lowerName.includes('os') || lowerName.includes('operating') || lowerName.includes('computer') || lowerName.includes('system') || lowerName.includes('architecture')) return Cpu;
  if (lowerName.includes('structure') || lowerName.includes('algorithm') || lowerName.includes('dsa')) return Layers;
  if (lowerName.includes('english') || lowerName.includes('communication') || lowerName.includes('aptitude') || lowerName.includes('reasoning')) return PenLine;
  if (lowerName.includes('drawing') || lowerName.includes('cad') || lowerName.includes('design') || lowerName.includes('ui')) return Pencil;
  if (lowerName.includes('digital') || lowerName.includes('logic') || lowerName.includes('circuit')) return Binary;
  if (lowerName.includes('ai') || lowerName.includes('machine') || lowerName.includes('deep') || lowerName.includes('ml')) return BrainCircuit;
  if (lowerName.includes('algebra') || lowerName.includes('linear') || lowerName.includes('discrete')) return SquareFunction;
  
  const defaultIcons = [BookOpen, LayoutGrid, BookMarked, Layers];
  return defaultIcons[index % defaultIcons.length];
};
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

interface SkillTestProps {
  testType?: 'practice' | 'assessment';
}

// Demo mock test — always visible in practice tests for presentation purposes.
// TestResults detects the "mock-" submission ID and injects realistic data without any API call.
const MOCK_DEMO_TEST: Test = {
  id: 'mock-python-fundamentals',
  title: '🎯 Python Fundamentals (Demo)',
  difficulty: 'Medium',
  totalQuestions: 10,
  duration: 30,
  totalMarks: 32,
  unitId: 'mock-unit-demo',
  subject: 'Python Programming',
  maxAttempts: 3,
  testType: 'practice',
  my_submissions: [
    { id: 'mock-sub-demo-001', status: 'completed', marks: 22 },
  ],
};

const SkillTest: React.FC<SkillTestProps> = ({ testType = 'practice' }) => {
  const { subjectId, testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const basePath = testType === 'practice' ? '/student/practice-tests' : '/student/assessments';
  const typeText = testType === 'practice' ? 'Practice Tests' : 'Assessments';

  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(true);

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
      // Path: /student/practice-tests/:subjectId/:testId/results
      //   or: /student/assessment/:subjectId/:testId/results
      const pathParts = location.pathname.split('/');
      const typePath = testType === 'practice' ? 'practice-tests' : 'assessments';
      const index = pathParts.indexOf(typePath);
      // typePath is at index N, subjectId at N+1, testId at N+2
      if (index !== -1 && pathParts[index + 2]) {
        return pathParts[index + 2];
      }
    }
    return null;
  };

  const actualTestId = testId || extractTestIdFromPath();

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingSubjects(true);
        const backendSubjects = await fetchSubjects();

        const mapped: Subject[] = backendSubjects.map(
          (c: any, index: number): Subject => {
            const subjectName = c.subject_name || c.name || "Unknown Subject";
            return {
              id: c.id,
              name: subjectName,
              description: `${typeText} for ${subjectName}`,
              icon: getSubjectIcon(subjectName, index),
              color: COLORS[index % COLORS.length],
              units: [],
              category: c.category || "General",
              unitCount: c.units ? c.units.length : 0,
            };
          }
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
    setDashboardSidebarOpen(false);
    navigate(`${basePath}/${subject.id}`);
  };

  const handleStartTest = (test: Test) => {
    if (subjectId) {
      navigate(`${basePath}/${subjectId}/${test.id}`);
    }
  };

  const handleBackToSubjects = () => {
    setDashboardSidebarOpen(true);
    setCurrentView("subjects");
    navigate(basePath);
  };

  const withMockTest = (realTests: Test[]) => realTests;

  const refreshTestsData = async () => {
    if (!selectedSubject) return;
    try {
      const { tests: realTests, updatedUnits } = await loadTestsForUnits(
        [...selectedSubject.units],
        selectedSubject.name,
        testType
      );
      setTests(withMockTest(realTests));
      setSelectedSubject(prev => prev ? { ...prev, units: updatedUnits } : null);
    } catch (err) {
      console.error("Failed to refresh tests data", err);
    }
  };

  const handleBackToTests = async () => {
    await refreshTestsData();

    if (subjectId) {
      navigate(`${basePath}/${subjectId}`);
    } else {
      navigate(basePath);
    }
  };

  useEffect(() => {
    if (loadingSubjects || subjects.length === 0) return;

    const syncSubject = async () => {
      setDashboardSidebarOpen(!subjectId); // Added this line
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
              setSelectedUnit(null);

              const { tests: realTests, updatedUnits: progressUnits } = await loadTestsForUnits(
                uiUnits,
                foundSubject.name,
                testType
              );
              setTests(withMockTest(realTests));
              setSelectedSubject(prev => prev ? { ...prev, units: progressUnits } : null);

            } catch (err) {
              console.error("Failed to load units", err);
            }
          } else {
            // Units already loaded — just set the subject and load tests
            setSelectedSubject(foundSubject);
            const { tests: realTests, updatedUnits: progressUnits } = await loadTestsForUnits(
              foundSubject.units,
              foundSubject.name,
              testType
            );
            setTests(withMockTest(realTests));
            setSelectedSubject(prev => prev ? { ...prev, units: progressUnits } : null);
          }

          // Always show the welcome screen when no specific test is selected
          if (!testId) {
            setSelectedUnit(null);
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
        const foundTest = tests.find(t => t.id === actualTestId)
          ?? (actualTestId.startsWith('mock-') ? MOCK_DEMO_TEST : undefined);
        if (foundTest) {
          setSelectedTest(foundTest);

          // Mock test — bypass unit lookup, go straight to results
          if (foundTest.id.startsWith('mock-')) {
            if (isResultsRoute) {
              const submissions = foundTest.my_submissions || [];
              const latestSubmission = submissions.find((s: any) => s.status === 'completed' || s.status === 'submitted');
              if (latestSubmission) setCurrentSubmissionId(latestSubmission.id);
              setSelectedUnit({ id: 'mock-unit-demo', name: 'Demo Unit' });
              setCurrentView("results");
            } else {
              setSelectedUnit({ id: 'mock-unit-demo', name: 'Demo Unit' });
              setCurrentView("instructions");
            }
            return;
          }

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
      navigate(`${basePath}/${selectedSubject?.id}`);
    } else {
      setCurrentView("tests");
    }
  };

  const handleBeginTest = async () => {
    if (!selectedTest) return;

    // Mock test — skip API, go straight to results for demo
    if (selectedTest.id.startsWith('mock-')) {
      if (subjectId) navigate(`${basePath}/${subjectId}/${selectedTest.id}/results`);
      return;
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
      } else {
        toast.error("Unable to start test. Please try again.");
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

    if (subjectId && selectedTest) {
      navigate(`${basePath}/${subjectId}/${selectedTest.id}/results`);
    }
  };

  const handleViewResult = (submissionId: string, test: Test) => {
    if (subjectId) {
      navigate(`${basePath}/${subjectId}/${test.id}/results`);
    }
  };

  const handleRetakeTest = async () => {
    await refreshTestsData();

    const testIdToUse = actualTestId || selectedTest?.id;

    if (subjectId && testIdToUse) {
      navigate(`${basePath}/${subjectId}/${testIdToUse}`);
    } else {
      console.error('Cannot navigate - missing subjectId or testId', { subjectId, testIdToUse });
    }
  };

  const handleBackToInstructions = () => {
    setCurrentView("instructions");
  };

  const handleViewAllResults = async (test: Test) => {
    if (subjectId) {
      navigate(`${basePath}/${subjectId}/${test.id}/results`);
    }
  };


  const filteredTests: Test[] = selectedUnit
    ? [
        ...tests.filter((t) => t.unitId === selectedUnit.id && !t.id.startsWith('mock-')),
        // Always append the single demo mock test in practice mode
        ...(testType === 'practice' ? [MOCK_DEMO_TEST] : []),
      ]
    : [];

  const hideNavigation =
    currentView === "instructions" ||
    currentView === "test" ||
    currentView === "results";

  const renderMainContent = () => {
    if (currentView === "instructions" && selectedTest && selectedUnit) {
      return (
        <div className="h-full overflow-y-auto">
          <TestInstructions
            test={{
              id: selectedTest.id,
              title: selectedTest.title,
              subjectName: selectedSubject?.name || "",
              duration: selectedTest.duration,
              totalQuestions: selectedTest.totalQuestions,
              difficulty: selectedTest.difficulty,
              description: `${selectedUnit.name} - ${selectedTest.difficulty} level test`,
              marks: selectedTest.totalMarks,
              testType: testType,
              maxAttempts: selectedTest.maxAttempts,
              attemptsUsed: (selectedTest.my_submissions || []).filter((s: any) => s.status === 'completed' || s.status === 'submitted').length,
            }}
            onStart={handleBeginTest}
            onBack={handleBackToTests}
          />
        </div>
      );
    }

    if (currentView === "test" && selectedTest && selectedUnit) {
      return (
        <div className="h-full overflow-y-auto">
          <AssessmentInterface
            assessment={{
              id: selectedTest.id,
              title: selectedTest.title,
              subjectName: selectedSubject?.name || "",
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

    if (currentView === "results") {
      if (selectedTest && selectedUnit) {
        return (
          <div className="h-full overflow-y-auto">
            <TestResults
              test={{
                id: selectedTest.id,
                title: selectedTest.title,
                subjectName: selectedSubject?.name || "",
                duration: selectedTest.duration,
                totalQuestions: selectedTest.totalQuestions,
                marks: selectedTest.totalMarks,
              }}
              submissionId={
                testSubmissions[selectedTest.id] ||
                currentSubmissionId ||
                (selectedTest.my_submissions?.[0]?.id ?? "")
              }
              onBackToList={handleBackToTests}
              onTryAgain={handleRetakeTest}
            />
          </div>
        );
      }

      return (
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
      );
    }

    return (
      <div className="flex h-full">
        {selectedSubject && (currentView === "tests" || (actualTestId && !isResultsRoute)) && (
          <UnitSidebar
            subject={selectedSubject}
            selectedUnit={selectedUnit}
            onUnitSelect={handleUnitSelect}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onBackToSubjects={handleBackToSubjects}
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
              title={typeText}
              subtitle={`Choose a subject to view your ${typeText.toLowerCase()}`}
            />
            ) : selectedUnit ? (
            <TestCards
                tests={filteredTests}
                subjectName={selectedSubject?.name || ""}
                topicName={selectedUnit?.name || ""}
                onBack={handleBackToSubjects}
                onStartTest={handleStartTest}
                onViewResult={handleViewResult}
                onViewAllResults={handleViewAllResults}
                completedTests={testCompleted}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="max-w-md">
                  <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
                    <BookOpen className="w-12 h-12 text-slate-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">
                    Welcome to {selectedSubject?.name}
                  </h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Pick where you left off or select a topic from the sidebar to view available {typeText.toLowerCase()}.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedSubject?.units.slice(0, 1).map(unit => (
                      <Button 
                        key={unit.id}
                        onClick={() => handleUnitSelect(unit)}
                        className="h-14 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold px-10 shadow-xl shadow-slate-200/50 text-lg"
                      >
                        Start First Unit: {unit.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {!hideNavigation && (
        <RoleSidebar collapsed={!!selectedSubject} />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <div className="flex-1 overflow-hidden relative">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default SkillTest;
