import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Test } from '@/pages/student/PracticeTest';
import { Clock, FileQuestion, Play, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestCardsProps {
  tests: Test[];
  subjectName: string;
  topicName: string;
  onBack: () => void;
  onStartTest: (test: Test) => void;
  onViewResult: (submissionId: string, test: Test) => void;
  onViewAllResults: (test: Test) => void;
  completedTests: Set<string>;
}

type DifficultyTab = 'All' | 'Easy' | 'Medium' | 'Hard';

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

const TestCards = ({ tests, subjectName, topicName, onBack, onStartTest, onViewResult, onViewAllResults, completedTests }: TestCardsProps) => {
  const [activeTab, setActiveTab] = useState<DifficultyTab>('All');

  const tabs: DifficultyTab[] = ['All', 'Easy', 'Medium', 'Hard'];

  const getCount = (tab: DifficultyTab) =>
    tab === 'All' ? tests.length : tests.filter(t => t.difficulty === tab).length;

  const visibleTests = activeTab === 'All' ? tests : tests.filter(t => t.difficulty === activeTab);

  return (
    <div className="px-6 py-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          {topicName} Tests
        </h1>
        <p className="text-sm text-slate-500">
          Choose a test based on your skill level
        </p>
      </div>

      {/* Difficulty Tabs */}
      {tests.length > 0 && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DifficultyTab)} className="mb-8">
          <TabsList>
            {tabs.map(tab => {
              const count = getCount(tab);
              if (tab !== 'All' && count === 0) return null;
              return (
                <TabsTrigger key={tab} value={tab} className="gap-2">
                  {tab}
                  <span className="text-xs font-bold bg-muted-foreground/10 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleTests.map((test) => {
          const submissions = test.my_submissions || [];
          const completedSubmissions = submissions.filter(s => s.status === 'completed' || s.status === 'submitted');
          const attemptCount = completedSubmissions.length;
          const canAttempt = attemptCount < test.maxAttempts;

          return (
            <Card
              key={test.id}
              className="group relative bg-gradient-to-br from-white to-slate-50/50 border-0 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1 overflow-hidden rounded-xl"
            >
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

      {/* Empty States */}
      {tests.length === 0 && (
        <Card className="p-12 text-center rounded-xl border-dashed">
          <div className="text-muted-foreground">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">No tests available</p>
            <p className="text-sm">Tests for this topic will be available soon.</p>
          </div>
        </Card>
      )}

      {tests.length > 0 && visibleTests.length === 0 && (
        <Card className="p-12 text-center rounded-xl border-dashed">
          <div className="text-muted-foreground">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">No {activeTab} tests</p>
            <p className="text-sm">There are no {activeTab.toLowerCase()} difficulty tests for this topic yet.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TestCards;
