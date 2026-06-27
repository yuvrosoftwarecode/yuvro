import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, Play, BarChart3, ArrowLeft, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TestInterface from '@/components/student/TestInterface';
import TestInstructions from '@/components/student/TestInstructions';
import TestResultsScreen from '@/components/student/TestResultsScreen';
import TestThankYou from '@/components/student/TestThankYou';
import { fetchUnitsBySubject, UnitWithSubUnits } from '@/services/subjectService';
import { fetchSkillTests, SkillTest, getUserSubmissions } from '@/services/skillTestService';
import { useAuth } from '@/contexts/AuthContext';

interface Topic {
  id: string;
  name: string;
  duration: number;
  questions: number;
  totalMarks?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  topics: Topic[];
}

// Subject problems data organized by unit
// Mock data removed.

const UnitSidebar = ({
  units,
  selectedUnit,
  onUnitSelect,
  subjectName,
  allTests,
  completedTests
}: {
  units: UnitWithSubUnits[];
  selectedUnit: string | null;
  onUnitSelect: (unitId: string) => void;
  subjectName: string;
  allTests: SkillTest[];
  completedTests: Set<string>;
}) => {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="sidebar-scrollbar">
        {open && (
          <div className="px-4 py-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))] flex items-center justify-center">
                <span className="text-white text-lg font-bold">📚</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">{subjectName}</h2>
                <p className="text-xs text-muted-foreground">{units.length} Units</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-muted-foreground   tracking-wider">
            {open ? 'TOPICS' : ''}
          </h3>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {units.map((unit) => {
                const unitTests = allTests.filter(t => String(t.unit) === String(unit.id));
                const total = unitTests.length;
                const completed = unitTests.filter(t => completedTests.has(t.id)).length;
                const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <SidebarMenuItem key={unit.id}>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => onUnitSelect(unit.id)}
                            isActive={selectedUnit === unit.id}
                            className="h-auto py-3"
                          >
                            <div className="flex flex-col gap-2 w-full">
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium text-base">
                                  {open ? unit.name : unit.shortName}
                                </span>
                                {open && selectedUnit === unit.id && (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                              {open && (
                                <div className="w-full space-y-1">
                                  <Progress value={progressPercent} className="h-2" />
                                  <span className="text-xs text-muted-foreground">
                                    {progressPercent}% Complete
                                  </span>
                                </div>
                              )}
                            </div>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold">{unit.name}</p>
                            {!open && (
                              <p className="text-xs text-muted-foreground">{progressPercent}% Complete</p>
                            )}
                            <ul className="text-xs space-y-1">
                              {unit.sub_units?.map((topic, idx) => (
                                <li key={idx}>• {topic.name}</li>
                              ))}
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const TestSubjectDetail = () => {
  const { user } = useAuth();
  const { subject, id, subjectId } = useParams<{ subject?: string; id?: string; subjectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const isSkillTest = location.pathname.includes('skill-test');
  const baseUrl = isSkillTest ? "/student/skill-test" : "/student/test";

  const [testsLoading, setTestsLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [units, setUnits] = useState<UnitWithSubUnits[]>([]);
  const [allTests, setAllTests] = useState<SkillTest[]>([]);

  const [showInstructions, setShowInstructions] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [selectedTestForResults, setSelectedTestForResults] = useState<SkillTest | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [testStats, setTestStats] = useState<{
    answeredCount: number;
    totalQuestions: number;
    timeSpent: number;
  } | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    const loadSubmissions = async () => {
      try {
        const subs = await getUserSubmissions(user.id);
        const completed = new Set<string>();
        subs.forEach(s => {
          if (s.status === 'completed' || s.status === 'submitted') {
            completed.add(String(s.skill_test));
          }
        });
        setCompletedTests(completed);
      } catch (err) {
        console.error("Error fetching user submissions:", err);
      }
    };
    loadSubmissions();
  }, [user?.id]);

  const subjectName = subject || id || subjectId || '';
  const [searchParams] = useSearchParams();
  // Human-readable subject name from URL query param (set by Test.tsx)
  const displaySubjectName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : subjectName;

  React.useEffect(() => {
    if (!subjectName) return;
    const fetchUnits = async () => {
      setUnitsLoading(true);
      try {
        const _units = await fetchUnitsBySubject(subjectName);
        setUnits(_units);
        if (_units.length > 0 && !selectedUnit) {
          setSelectedUnit(String(_units[0].id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchUnits();
  }, [subjectName]);

  React.useEffect(() => {
    if (!subjectName) return;
    const fetchTests = async () => {
      setTestsLoading(true);
      try {
        const tests = await fetchSkillTests({
          subject: subjectName,
          test_type: 'practice',
          publish_status: 'active'
        });
        setAllTests(tests);
      } catch (err) {
        console.error(err);
      } finally {
        setTestsLoading(false);
      }
    };
    fetchTests();
  }, [subjectName, isSkillTest]);

  // Filter problems by selected unit
  const problems = selectedUnit
    ? allTests.filter(p => String(p.unit) === selectedUnit)
    : [];

  const displayName = displaySubjectName; // Use the human-readable name if available



  const handleBackToTest = () => {
    navigate(baseUrl);
  };


  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setShowInstructions(true);
  };

  const handleStartTest = () => {
    setShowInstructions(false);
    setShowTest(true);
  };

  const handleTestComplete = (stats: { answeredCount: number; totalQuestions: number; timeSpent: number }) => {
    if (selectedTopic) {
      setCompletedTests(prev => new Set([...prev, selectedTopic.id]));
    }
    setTestStats(stats);
    setShowTest(false);
    setShowThankYou(true);
  };

  const handleThankYouComplete = () => {
    setShowThankYou(false);
    setSelectedTopic(null);
    setTestStats(null);
  };

  const handleViewResults = (problem: SkillTest) => {
    setSelectedTestForResults(problem as any); // Type cast temporarily
    setShowResults(true);
  };

  const handleBackToTests = () => {
    setShowResults(false);
    setSelectedTestForResults(null);
  };

  const handleTryAgain = () => {
    if (selectedTestForResults) {
      setCompletedTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTestForResults.id);
        return newSet;
      });
      setShowResults(false);
      setSelectedTestForResults(null);
    }
  };

  const handleBackToCourses = () => {
    setSelectedTopic(null);
    setShowInstructions(false);
    setShowTest(false);
  };

  if (showThankYou && selectedTopic && testStats) {
    return (
      <TestThankYou
        topic={selectedTopic}
        answeredCount={testStats.answeredCount}
        totalQuestions={testStats.totalQuestions}
        timeSpent={testStats.timeSpent}
        onBackToTests={handleThankYouComplete}
      />
    );
  }

  if (showResults && selectedTestForResults) {
    return (
      <TestResultsScreen
        testName={selectedTestForResults.title}
        subject={displaySubjectName}
        difficulty={selectedTestForResults.difficulty === 'easy' ? 'Easy' : selectedTestForResults.difficulty === 'medium' ? 'Medium' : 'Hard'}
        totalQuestions={selectedTestForResults.total_questions || 0}
        timeTaken={selectedTestForResults.duration * 60}
        skillTestId={selectedTestForResults.id}
        onTryAgain={handleTryAgain}
        onBackToTests={handleBackToTests}
      />
    );
  }

  if (showTest && selectedTopic) {
    return (
      <TestInterface
        topic={selectedTopic}
        course={{ id: subjectName, name: displaySubjectName } as Course}
        onComplete={handleTestComplete}
        onBack={handleBackToCourses}
      />
    );
  }

  if (showInstructions && selectedTopic) {
    return (
      <TestInstructions
        topic={selectedTopic}
        course={{ id: subjectName, name: displaySubjectName } as Course}
        onStart={handleStartTest}
        onBack={() => {
          setShowInstructions(false);
          setSelectedTopic(null);
        }}
      />
    );
  }

  const currentUnit = units.find(u => String(u.id) === selectedUnit);

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <UnitSidebar
          units={units}
          selectedUnit={selectedUnit}
          onUnitSelect={setSelectedUnit}
          subjectName={displayName}
          allTests={allTests}
          completedTests={completedTests}
        />

        <div className="flex-1 flex flex-col">
          <div className="border-b border-border bg-background sticky top-0 z-50">
            <div className="flex items-center h-16 px-6 gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToTest}
                className="shrink-0 rounded-full border border-border h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {displaySubjectName || displayName}
                </h1>
                {currentUnit?.name && (
                  <p className="text-xs text-muted-foreground">{currentUnit.name}</p>
                )}
              </div>
              {!testsLoading && problems.length > 0 && (
                <Badge variant="secondary" className="font-semibold shrink-0">
                  {problems.length} test{problems.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 p-6">
            {testsLoading ? (
              /* Skeleton loading */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                    <div className="h-2 bg-muted" />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="h-5 bg-muted rounded w-2/3" />
                        <div className="h-5 bg-muted rounded w-14" />
                      </div>
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="flex gap-4">
                        <div className="h-4 bg-muted rounded w-16" />
                        <div className="h-4 bg-muted rounded w-20" />
                      </div>
                      <div className="h-10 bg-muted rounded-lg w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : problems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {problems.map((problem, index) => {
                  const getTriColorGradient = () => {
                    if (index % 3 === 0) return 'from-[hsl(var(--saffron-dark))] to-[hsl(var(--saffron))]';
                    if (index % 3 === 1) return 'from-[hsl(var(--chakra-dark))] to-[hsl(var(--chakra))]';
                    return 'from-[hsl(var(--success-dark))] to-[hsl(var(--success))]';
                  };

                  return (
                    <Card
                      key={problem.id}
                      className="hover:shadow-lg transition-all duration-300 group overflow-hidden border-border bg-card"
                    >
                      <div className={`h-2 bg-gradient-to-r ${getTriColorGradient()}`} />
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="group-hover:text-primary transition-colors text-base leading-tight">
                            {problem.title}
                          </CardTitle>
                          <Badge variant={
                            problem.difficulty === 'easy' ? 'secondary' :
                              problem.difficulty === 'medium' ? 'default' : 'destructive'
                          } className="shrink-0 capitalize">
                            {problem.difficulty}
                          </Badge>
                        </div>
                        {(problem.description || problem.instructions) && (
                          <CardDescription className="line-clamp-2">{problem.description || problem.instructions}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{problem.duration} min</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{problem.total_questions || 0} questions</span>
                            </div>
                          </div>

                          <Button
                            className={`w-full bg-gradient-to-r ${getTriColorGradient()} hover:opacity-90 border-0 text-white font-semibold`}
                            onClick={() => {
                              const topicData: Topic = {
                                id: problem.id,
                                name: problem.title,
                                duration: problem.duration,
                                questions: problem.total_questions || 0,
                                totalMarks: problem.total_marks || 0,
                                difficulty: problem.difficulty === 'easy' ? 'Easy' : problem.difficulty === 'medium' ? 'Medium' : 'Hard'
                              };

                              if (completedTests.has(problem.id)) {
                                handleViewResults(problem);
                              } else {
                                handleTopicSelect(topicData);
                              }
                            }}
                          >
                            {completedTests.has(problem.id) ? (
                              <>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                View Results
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Start Test
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold mb-1">
                  {selectedUnit ? (isSkillTest ? 'No skill tests here' : 'No practice tests here') : 'Select a unit'}
                </p>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {selectedUnit
                    ? (isSkillTest ? 'No skill tests have been published for this unit yet.' : 'No practice tests have been published for this unit yet.')
                    : (isSkillTest ? 'Choose a unit from the sidebar to see available skill tests.' : 'Choose a unit from the sidebar to see available practice tests.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TestSubjectDetail;
