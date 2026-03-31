import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  BarChart3,
  RotateCcw,
  Home,
  XCircle,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewConfig } from './MockInterviewSetupDialog';

interface MockInterviewSessionProps {
  config: InterviewConfig;
  onExit: () => void;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  domain: string;
  difficulty: string;
}

// Dummy questions organized by domain
const questionBank: Record<string, Question[]> = {
  dsa: [
    { id: 1, text: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correct: 1, domain: 'DSA', difficulty: 'Easy' },
    { id: 2, text: 'Which data structure uses LIFO?', options: ['Queue', 'Stack', 'Linked List', 'Tree'], correct: 1, domain: 'DSA', difficulty: 'Easy' },
    { id: 3, text: 'What is the worst-case time complexity of QuickSort?', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correct: 2, domain: 'DSA', difficulty: 'Medium' },
    { id: 4, text: 'Which traversal visits the root last?', options: ['Preorder', 'Inorder', 'Postorder', 'Level order'], correct: 2, domain: 'DSA', difficulty: 'Medium' },
    { id: 5, text: 'What is the space complexity of merge sort?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], correct: 2, domain: 'DSA', difficulty: 'Medium' },
    { id: 6, text: 'Which algorithm finds shortest path in unweighted graph?', options: ['DFS', 'BFS', 'Dijkstra', 'Floyd-Warshall'], correct: 1, domain: 'DSA', difficulty: 'Medium' },
    { id: 7, text: 'What is a balanced BST?', options: ['All leaves at same level', 'Height difference ≤ 1', 'Complete binary tree', 'Full binary tree'], correct: 1, domain: 'DSA', difficulty: 'Hard' },
    { id: 8, text: 'Which pattern solves the 0/1 Knapsack problem?', options: ['Greedy', 'Divide & Conquer', 'Dynamic Programming', 'Backtracking'], correct: 2, domain: 'DSA', difficulty: 'Hard' },
  ],
  python: [
    { id: 11, text: 'What is a Python decorator?', options: ['A class method', 'A function wrapper', 'A variable type', 'A loop'], correct: 1, domain: 'Python', difficulty: 'Medium' },
    { id: 12, text: 'Which keyword creates a generator?', options: ['return', 'yield', 'async', 'lambda'], correct: 1, domain: 'Python', difficulty: 'Easy' },
    { id: 13, text: 'What does `len()` return for a dictionary?', options: ['Values count', 'Keys count', 'Total items', 'Memory size'], correct: 1, domain: 'Python', difficulty: 'Easy' },
    { id: 14, text: 'What is list comprehension?', options: ['A sorting method', 'Concise list creation', 'Memory optimization', 'Error handling'], correct: 1, domain: 'Python', difficulty: 'Easy' },
    { id: 15, text: 'What is GIL in Python?', options: ['Global Import Lock', 'Global Interpreter Lock', 'General Input Loop', 'Generic Interface Layer'], correct: 1, domain: 'Python', difficulty: 'Hard' },
    { id: 16, text: 'How are arguments passed in Python?', options: ['By value', 'By reference', 'By object reference', 'By pointer'], correct: 2, domain: 'Python', difficulty: 'Medium' },
  ],
  aptitude: [
    { id: 21, text: 'If a train travels 360 km in 4 hours, what is its speed?', options: ['80 km/h', '90 km/h', '100 km/h', '70 km/h'], correct: 1, domain: 'Aptitude', difficulty: 'Easy' },
    { id: 22, text: 'A can do a job in 10 days. B can do it in 15 days. Together?', options: ['5 days', '6 days', '7 days', '8 days'], correct: 1, domain: 'Aptitude', difficulty: 'Medium' },
    { id: 23, text: 'What is 15% of 240?', options: ['32', '36', '40', '24'], correct: 1, domain: 'Aptitude', difficulty: 'Easy' },
    { id: 24, text: 'Ratio of 2:3 means what percentage is the first?', options: ['40%', '60%', '33%', '50%'], correct: 0, domain: 'Aptitude', difficulty: 'Easy' },
    { id: 25, text: 'Simple interest on 5000 at 8% for 3 years?', options: ['1000', '1200', '1500', '800'], correct: 1, domain: 'Aptitude', difficulty: 'Medium' },
  ],
  logical: [
    { id: 31, text: 'Find the next: 2, 6, 12, 20, ?', options: ['28', '30', '32', '26'], correct: 1, domain: 'Logical Reasoning', difficulty: 'Easy' },
    { id: 32, text: 'All roses are flowers. Some flowers are red. Therefore?', options: ['All roses are red', 'Some roses may be red', 'No roses are red', 'Cannot determine'], correct: 1, domain: 'Logical Reasoning', difficulty: 'Medium' },
    { id: 33, text: 'If APPLE = 50, BANANA = ?', options: ['60', '55', '42', '48'], correct: 0, domain: 'Logical Reasoning', difficulty: 'Medium' },
    { id: 34, text: 'Mirror image of HELP?', options: ['PLEH', 'HELP', 'qLƎH', 'None'], correct: 0, domain: 'Logical Reasoning', difficulty: 'Easy' },
    { id: 35, text: 'Odd one out: 3, 5, 11, 14, 17', options: ['3', '14', '11', '17'], correct: 1, domain: 'Logical Reasoning', difficulty: 'Easy' },
  ],
  communication: [
    { id: 41, text: 'Which is correct? "He don\'t" or "He doesn\'t"?', options: ['He don\'t', 'He doesn\'t', 'Both correct', 'Neither'], correct: 1, domain: 'Communication', difficulty: 'Easy' },
    { id: 42, text: 'Active voice of "The cake was eaten by him"?', options: ['He ate the cake', 'He eats the cake', 'Him ate the cake', 'Cake ate he'], correct: 0, domain: 'Communication', difficulty: 'Easy' },
    { id: 43, text: 'Synonym of "Eloquent"?', options: ['Silent', 'Articulate', 'Confused', 'Loud'], correct: 1, domain: 'Communication', difficulty: 'Medium' },
    { id: 44, text: 'What does STAR method stand for in interviews?', options: ['Situation, Task, Action, Result', 'Start, Try, Achieve, Review', 'Strategy, Target, Aim, Reach', 'None'], correct: 0, domain: 'Communication', difficulty: 'Medium' },
    { id: 45, text: 'Best opening for a formal email?', options: ['Hey there', 'Dear Sir/Madam', 'Yo', 'What\'s up'], correct: 1, domain: 'Communication', difficulty: 'Easy' },
  ],
};

const MockInterviewSession: React.FC<MockInterviewSessionProps> = ({ config, onExit }) => {
  const questions = questionBank[config.domain] || questionBank.dsa;
  const totalTime = config.duration * 60; // seconds

  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const timerColor = () => {
    if (timeLeft <= 60) return 'text-red-500';
    if (timeLeft <= 300) return 'text-amber-500';
    return 'text-foreground';
  };

  const timerBg = () => {
    if (timeLeft <= 60) return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40';
    if (timeLeft <= 300) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40';
    return 'bg-muted/50 border-border';
  };

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
  }, []);

  const score = (() => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    return { correct, total: questions.length, pct: Math.round((correct / questions.length) * 100) };
  })();

  const domainLabel = {
    dsa: 'DSA',
    python: 'Python',
    aptitude: 'Aptitude',
    logical: 'Logical Reasoning',
    communication: 'Communication',
  }[config.domain] || config.domain;

  // ====== RESULTS SCREEN ======
  if (submitted) {
    return (
      <div className="space-y-6">
        {/* Auto-submit banner */}
        {timeLeft === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Time's up. Interview submitted automatically.
          </div>
        )}

        <Card>
          <CardHeader className="text-center pb-2">
            <Trophy className="h-12 w-12 mx-auto text-amber-500 mb-2" />
            <CardTitle className="text-xl">Interview Complete!</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{domainLabel} • {config.duration} min session</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{score.pct}%</p>
                <p className="text-sm text-muted-foreground">Overall Score</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{score.correct}/{score.total}</p>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{formatTime(totalTime - timeLeft)}</p>
                <p className="text-sm text-muted-foreground">Time Taken</p>
              </div>
            </div>

            {/* Performance badge */}
            <div className="flex justify-center">
              <Badge
                className={cn(
                  'text-sm px-4 py-1 border-0',
                  score.pct >= 80
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : score.pct >= 50
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                )}
              >
                {score.pct >= 80 ? 'Excellent' : score.pct >= 50 ? 'Good Effort' : 'Needs Practice'}
              </Badge>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{score.correct}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-center">
                <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{score.total - score.correct}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
                <Target className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{Math.round((score.correct / score.total) * 100)}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>

            {/* Question Review */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Question Review</h3>
              {questions.map((q, i) => {
                const userAns = answers[i];
                const isCorrect = userAns === q.correct;
                const unanswered = userAns === undefined;
                return (
                  <div
                    key={q.id}
                    className={cn(
                      'p-3 rounded-lg border text-sm',
                      isCorrect
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30'
                        : 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-foreground">{q.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {unanswered
                            ? `Not answered • Correct: ${q.options[q.correct]}`
                            : isCorrect
                            ? `Your answer: ${q.options[userAns]}`
                            : `Your answer: ${q.options[userAns]} • Correct: ${q.options[q.correct]}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onExit} className="flex-1">
                <Home className="h-4 w-4 mr-1" />
                Back to Preparation
              </Button>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                  setCurrentQ(0);
                  setTimeLeft(totalTime);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ====== INTERVIEW SCREEN ======
  const q = questions[currentQ];

  return (
    <div className="space-y-4">
      {/* Timer Bar */}
      <div className={cn('flex items-center justify-between p-3 rounded-lg border', timerBg())}>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">{domainLabel}</Badge>
          <span className="text-xs text-muted-foreground">
            Q {currentQ + 1} of {questions.length}
          </span>
        </div>
        <div className={cn('flex items-center gap-1.5 font-mono text-lg font-bold', timerColor())}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5" />

      {/* Question */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-semibold text-foreground pr-4">{q.text}</h3>
            <Badge variant="outline" className="shrink-0 text-[10px]">{q.difficulty}</Badge>
          </div>

          <RadioGroup
            value={answers[currentQ]?.toString()}
            onValueChange={(v) => setAnswers({ ...answers, [currentQ]: parseInt(v) })}
            className="space-y-2"
          >
            {q.options.map((opt, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  answers[currentQ] === i
                    ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                <Label htmlFor={`opt-${i}`} className="text-sm cursor-pointer flex-1">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentQ === 0}
          onClick={() => setCurrentQ(currentQ - 1)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        <div className="flex gap-2">
          {currentQ < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentQ(currentQ + 1)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Submit
            </Button>
          )}
        </div>
      </div>

      {/* Question indicators */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={cn(
              'h-7 w-7 rounded text-xs font-medium transition-colors',
              i === currentQ
                ? 'bg-amber-500 text-white'
                : answers[i] !== undefined
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MockInterviewSession;
