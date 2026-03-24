import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Test } from '@/pages/student/PracticeTest';
import { Clock, CheckCircle, Play, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import RoleHeader from '@/components/common/RoleHeader';

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

const DIFFICULTY_GRADIENT: Record<string, string> = {
  Easy:   'from-emerald-400 to-teal-500',
  Medium: 'from-amber-400 to-orange-500',
  Hard:   'from-rose-500 to-pink-500',
};

const DIFFICULTY_TOP: Record<string, string> = {
  Easy:   'from-emerald-400 to-teal-400',
  Medium: 'from-amber-400 to-yellow-400',
  Hard:   'from-rose-500 to-pink-400',
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard:   'bg-rose-50 text-rose-700',
};

const TestCards = ({ tests, subjectName, topicName, onBack, onStartTest, onViewResult, onViewAllResults, completedTests }: TestCardsProps) => {
  const [activeTab, setActiveTab] = useState<DifficultyTab>('All');

  const tabs: DifficultyTab[] = ['All', 'Easy', 'Medium', 'Hard'];

  const getCount = (tab: DifficultyTab) =>
    tab === 'All' ? tests.length : tests.filter(t => t.difficulty === tab).length;

  const visibleTests = activeTab === 'All' ? tests : tests.filter(t => t.difficulty === activeTab);

  return (
    <div className="px-6 lg:px-8 py-6 animate-fade-in max-w-[1600px] mx-auto">
      <RoleHeader
        title={`${topicName} Tests`}
        subtitle="Choose a test based on your skill level"
        noPadding
        className="py-0 pb-8"
      />

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleTests.map((test) => {
          const submissions = test.my_submissions || [];
          const completedSubmissions = submissions.filter(s => s.status === 'completed' || s.status === 'submitted');
          const attemptCount = completedSubmissions.length;
          const canAttempt = attemptCount < test.maxAttempts;
          const topGradient = DIFFICULTY_TOP[test.difficulty] || 'from-blue-400 to-indigo-400';
          const btnGradient = DIFFICULTY_GRADIENT[test.difficulty] || 'from-blue-500 to-indigo-500';
          const badgeClass = DIFFICULTY_BADGE[test.difficulty] || 'bg-gray-100 text-gray-600';

          return (
            <div
              key={test.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col"
            >
              {/* Colored top bar */}
              <div className={cn('h-1.5 w-full bg-gradient-to-r', topGradient)} />

              <div className="p-5 flex flex-col flex-1 gap-3">
                {/* Title + difficulty badge */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{test.title}</h3>
                  <span className={cn('text-xs font-semibold px-3 py-1 rounded-full shrink-0', badgeClass)}>
                    {test.difficulty}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 leading-relaxed">
                  {test.subject} — {test.totalMarks} marks
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {test.duration} min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {test.totalQuestions} questions
                  </span>
                </div>

                {/* Attempts info */}
                {attemptCount > 0 && (
                  <p className="text-xs text-gray-400">
                    {attemptCount}/{test.maxAttempts} attempts used
                  </p>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action buttons */}
                {canAttempt ? (
                  <button
                    onClick={() => onStartTest(test)}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-r transition-opacity hover:opacity-90 active:scale-[0.98]',
                      btnGradient
                    )}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {attemptCount === 0 ? 'Start Test' : 'Retake Test'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-100 cursor-not-allowed"
                  >
                    Limit Reached ({test.maxAttempts}/{test.maxAttempts})
                  </button>
                )}

                {completedSubmissions.length > 0 && (
                  <button
                    onClick={() => onViewAllResults(test)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
                  >
                    <span className="flex items-center gap-2 text-gray-600 font-medium">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      View Results
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <span className="text-xs">{completedSubmissions.length} attempt{completedSubmissions.length > 1 ? 's' : ''}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty States */}
      {tests.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-base font-medium text-gray-500 mb-1">No tests available</p>
          <p className="text-sm text-gray-400">Tests for this topic will be available soon.</p>
        </div>
      )}

      {tests.length > 0 && visibleTests.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-base font-medium text-gray-500 mb-1">No {activeTab} tests</p>
          <p className="text-sm text-gray-400">There are no {activeTab.toLowerCase()} difficulty tests for this topic yet.</p>
        </div>
      )}
    </div>
  );
};

export default TestCards;
