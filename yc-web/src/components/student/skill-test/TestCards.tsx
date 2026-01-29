import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Test } from '@/pages/student/SkillTest';
import { Clock, FileQuestion, ArrowLeft, Play, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestCardsProps {
  tests: Test[];
  courseName: string;
  topicName: string;
  onBack: () => void;
  onStartTest: (test: Test) => void;
  onViewResult: (submissionId: string, test: Test) => void;
  onViewAllResults: (test: Test) => void;
  completedTests: Set<string>;
}

const TestCards = ({ tests, courseName, topicName, onBack, onStartTest, onViewResult, onViewAllResults, completedTests }: TestCardsProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'Medium':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800';
      case 'Hard':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSectionBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-500 text-white border-0 hover:bg-emerald-600';
      case 'Medium':
        return 'bg-cyan-500 text-white border-0 hover:bg-cyan-600';
      case 'Hard':
        return 'bg-rose-500 text-white border-0 hover:bg-rose-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getButtonGradient = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600';
      case 'Medium':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600';
      case 'Hard':
        return 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600';
    }
  };

  const groupedTests = {
    Easy: tests.filter((t) => t.difficulty === 'Easy'),
    Medium: tests.filter((t) => t.difficulty === 'Medium'),
    Hard: tests.filter((t) => t.difficulty === 'Hard'),
  };

  return (
    <div className="px-8 py-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors font-normal text-gray-500"
        >
          Skill Test
        </Button>
        <span>/</span>
        <span className="text-gray-700 font-medium">{courseName}</span>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{topicName}</span>
      </div>

      {/* Header */}
      <div className="mb-10 text-left">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {topicName} Tests
        </h1>
        <p className="text-gray-600 text-sm">
          Choose a test based on your skill level
        </p>
      </div>

      {/* Tests by Difficulty */}
      <div className="space-y-10">
        {(Object.keys(groupedTests) as Array<keyof typeof groupedTests>).map((difficulty) => {
          const difficultyTests = groupedTests[difficulty];
          if (difficultyTests.length === 0) return null;

          return (
            <div key={difficulty}>
              {/* Section Header Badge */}
              <div className="mb-5">
                <Badge
                  className={cn('px-4 py-1.5 text-sm font-medium rounded-full', getSectionBadgeColor(difficulty))}
                >
                  {difficulty}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {difficultyTests.map((test) => {
                  const submissions = test.my_submissions || [];
                  const completedSubmissions = submissions.filter(s => s.status === 'completed' || s.status === 'submitted');
                  const attemptCount = completedSubmissions.length;
                  const canAttempt = attemptCount < test.maxAttempts;
                  const latestSubmission = completedSubmissions[0];

                  return (
                    <Card
                      key={test.id}
                      className="group relative bg-gradient-to-br from-white to-slate-50/50 border-0 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1 overflow-hidden rounded-xl"
                    >
                      {/* Hover Glow */}
                      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="p-6 space-y-5 relative z-10">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {test.title}
                          </h3>
                          <Badge variant="secondary" className="font-bold">
                            {attemptCount}/{test.maxAttempts} Attempts
                          </Badge>
                        </div>

                        <div className="flex items-center gap-5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FileQuestion className="h-4 w-4 opacity-70" />
                            <span>{test.totalQuestions} questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 opacity-70" />
                            <span>{test.duration} mins</span>
                          </div>
                        </div>

                        <div className="pt-2 space-y-2">
                          {canAttempt ? (
                            <Button
                              onClick={() => onStartTest(test)}
                              className={cn(
                                "w-full text-white transition-all duration-300 gap-2 h-11 shadow-md hover:shadow-lg",
                                getButtonGradient(test.difficulty)
                              )}
                            >
                              <Play className="h-4 w-4" />
                              {attemptCount === 0 ? 'Start Test' : 'Retake Test'}
                            </Button>
                          ) : (
                            <Button
                              disabled
                              variant="outline"
                              className="w-full h-11 bg-slate-50 opacity-60 cursor-not-allowed border-dashed"
                            >
                              Limit Reached ({test.maxAttempts}/{test.maxAttempts})
                            </Button>
                          )}

                          {completedSubmissions.length > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => onViewAllResults(test)}
                              className="w-full flex items-center justify-between px-4 h-11 rounded-xl border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all group/res"
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg group-hover/res:bg-blue-100 transition-colors">
                                  <Trophy className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Results</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-slate-100 text-[10px] font-black group-hover/res:bg-blue-100 group-hover/res:text-blue-700 transition-colors">
                                  {completedSubmissions.length} Attempts
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover/res:translate-x-1 transition-transform" />
                              </div>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {tests.length === 0 && (
          <Card className="p-12 text-center rounded-xl border-dashed">
            <div className="text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium mb-2">No tests available</p>
              <p className="text-sm">Tests for this topic will be available soon.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestCards;
