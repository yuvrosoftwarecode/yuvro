import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Play, BarChart3, ArrowLeft } from 'lucide-react';
import TestInterface from '@/components/student/TestInterface';
import TestInstructions from '@/components/student/TestInstructions';
import TestResultsScreen from '@/components/student/TestResultsScreen';
import TestThankYou from '@/components/student/TestThankYou';
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

const StudentAssessmentDetail = () => {
  const { user } = useAuth();
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const [testsLoading, setTestsLoading] = useState(false);
  const [allTests, setAllTests] = useState<SkillTest[]>([]);

  const [showInstructions, setShowInstructions] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [selectedTestForResults, setSelectedTestForResults] = useState<SkillTest | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [testStats, setTestStats] = useState<{
    answeredCount: number;
    totalQuestions: number;
    timeSpent: number;
  } | null>(null);

  // Load user submissions to find completed tests
  useEffect(() => {
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

  const [searchParams] = useSearchParams();
  const displaySubjectName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : "Subject Assessment";

  // Fetch only subject-level assessments (with unit = null)
  useEffect(() => {
    if (!subjectId) return;
    const fetchTests = async () => {
      setTestsLoading(true);
      try {
        const tests = await fetchSkillTests({
          subject: subjectId,
          unit: 'null',
          test_type: 'assessment',
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
  }, [subjectId]);

  const handleBackToSubjectList = () => {
    navigate("/student/assessments");
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
    setSelectedTestForResults(problem);
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
        course={{ id: subjectId, name: displaySubjectName } as Course}
        onComplete={handleTestComplete}
        onBack={handleBackToCourses}
      />
    );
  }

  if (showInstructions && selectedTopic) {
    return (
      <TestInstructions
        topic={selectedTopic}
        course={{ id: subjectId, name: displaySubjectName } as Course}
        onStart={handleStartTest}
        onBack={() => {
          setShowInstructions(false);
          setSelectedTopic(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Subject Header */}
      <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center h-16 px-6 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToSubjectList}
            className="shrink-0 rounded-full border border-border h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {displaySubjectName}
            </h1>
            <p className="text-xs text-muted-foreground">Subject-Level Assessments</p>
          </div>
          {!testsLoading && allTests.length > 0 && (
            <Badge variant="secondary" className="font-semibold shrink-0">
              {allTests.length} assessment{allTests.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        {testsLoading ? (
          /* Skeleton Loader */
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
        ) : allTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTests.map((assessment, index) => {
              // Minimal, color-neutral top accents
              const getAccentClass = () => {
                if (index % 3 === 0) return 'bg-slate-300 dark:bg-slate-700';
                if (index % 3 === 1) return 'bg-slate-400 dark:bg-slate-600';
                return 'bg-slate-500 dark:bg-slate-500';
              };

              return (
                <Card
                  key={assessment.id}
                  className="hover:shadow-lg transition-all duration-300 group overflow-hidden border-border bg-card flex flex-col justify-between"
                >
                  <div>
                    <div className={`h-1.5 ${getAccentClass()}`} />
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="group-hover:text-primary transition-colors text-base leading-tight">
                          {assessment.title}
                        </CardTitle>
                        <Badge variant={
                          assessment.difficulty === 'easy' ? 'secondary' :
                          assessment.difficulty === 'medium' ? 'default' : 'destructive'
                        } className="shrink-0 capitalize">
                          {assessment.difficulty}
                        </Badge>
                      </div>
                      {(assessment.description || assessment.instructions) && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {assessment.description || assessment.instructions}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </div>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{assessment.duration} min</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{assessment.total_questions || 0} questions</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-slate-50 dark:text-slate-950 font-semibold border-0"
                        onClick={() => {
                          const topicData: Topic = {
                            id: assessment.id,
                            name: assessment.title,
                            duration: assessment.duration,
                            questions: assessment.total_questions || 0,
                            totalMarks: assessment.total_marks || 0,
                            difficulty: assessment.difficulty === 'easy' ? 'Easy' : assessment.difficulty === 'medium' ? 'Medium' : 'Hard'
                          };

                          if (completedTests.has(assessment.id)) {
                            handleViewResults(assessment);
                          } else {
                            handleTopicSelect(topicData);
                          }
                        }}
                      >
                        {completedTests.has(assessment.id) ? (
                          <>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Results
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start Assessment
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
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed rounded-2xl bg-card border-border">
            <div className="p-4 bg-muted rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">
              No assessments available
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              No subject assessments have been published for this subject yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssessmentDetail;
