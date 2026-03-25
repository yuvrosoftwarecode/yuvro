import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Code,
  FileText,
  Trophy,
  Target,
  MessageCircle,
  Eye,
  Lightbulb,
} from 'lucide-react';
import { getSkillTestSubmission, getSkillTestSubmissions } from '@/services/skillTestService';
import { toast } from 'sonner';
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';
import MonacoCodeEditor from '@/components/code-editor/MonacoCodeEditor';

interface Test {
  id: string;
  title: string;
  subjectName: string;
  duration: number;
  totalQuestions: number;
  marks: number;
  score?: number;
  maxAttempts?: number;
  currentAttempts?: number;
  testType?: 'practice' | 'assessment';
}

interface TestResultsProps {
  test: Test;
  submissionId: string;
  onBackToList: () => void;
  onTryAgain?: () => void;
}

const TestResults: React.FC<TestResultsProps> = ({
  test,
  submissionId: initialSubmissionId,
  onBackToList,
  onTryAgain,
}) => {
  const [currentSubId, setCurrentSubId] = useState(initialSubmissionId);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incorrect' | 'correct' | 'ai_buddy'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'coding' | 'descriptive'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      // Skip API call for mock test IDs
      if (test.id.startsWith('mock-')) {
        setLoading(false);
        return;
      }
      try {
        const subs = await getSkillTestSubmissions(test.id);
        const filtered = subs.filter((s: any) => s.status === 'completed' || s.status === 'submitted');
        const sorted = filtered.sort((a: any, b: any) =>
          new Date(b.submitted_at || b.completed_at || b.created_at).getTime() -
          new Date(a.submitted_at || a.completed_at || a.created_at).getTime()
        );
        setAllSubmissions(sorted);
        // If the passed submissionId isn't a real one, use the latest from API
        const passedIsReal = sorted.some((s: any) => s.id === initialSubmissionId);
        if (!passedIsReal && sorted.length > 0) {
          setCurrentSubId(sorted[0].id);
        } else if (!passedIsReal && sorted.length === 0) {
          // No submissions at all — stop loading
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch all submissions', err);
        setLoading(false);
      }
    };
    fetchAll();
  }, [test.id, initialSubmissionId]);

  useEffect(() => {
    if (!currentSubId) return;

    // Mock submission — inject realistic mock data for presentation
    if (currentSubId.startsWith('mock-') || currentSubId.startsWith('sub-')) {
        const mockScore = test.marks > 0
          ? Math.round(test.marks * (0.55 + Math.random() * 0.35))
          : 0;
        const totalQ = test.totalQuestions || 10;
        const now = new Date();
        const started = new Date(now.getTime() - test.duration * 60 * 1000 * 0.8);

        const MOCK_QUESTIONS = [
          // MCQ questions
          { question_type: 'mcq_single', question_content: 'Which data structure uses LIFO order?', is_correct: true, marks: 2, marks_obtained: 2, answer_data: { answer: 'Stack', explanation: 'A stack follows Last In First Out (LIFO) principle — the last element pushed is the first to be popped.' }, mcq_options: [{ text: 'Queue', is_correct: false }, { text: 'Stack', is_correct: true }, { text: 'Array', is_correct: false }, { text: 'Tree', is_correct: false }] },
          { question_type: 'mcq_single', question_content: 'What is the time complexity of binary search?', is_correct: true, marks: 2, marks_obtained: 2, answer_data: { answer: 'O(log n)', explanation: 'Binary search halves the search space each iteration, giving O(log n) time complexity.' }, mcq_options: [{ text: 'O(n)', is_correct: false }, { text: 'O(n²)', is_correct: false }, { text: 'O(log n)', is_correct: true }, { text: 'O(1)', is_correct: false }] },
          { question_type: 'mcq_single', question_content: 'Which sorting algorithm has the best average-case complexity?', is_correct: false, marks: 2, marks_obtained: 0, answer_data: { answer: 'Bubble Sort', explanation: 'Merge Sort and Quick Sort both achieve O(n log n) average complexity, far better than Bubble Sort\'s O(n²).' }, mcq_options: [{ text: 'Bubble Sort', is_correct: false }, { text: 'Merge Sort', is_correct: true }, { text: 'Selection Sort', is_correct: false }, { text: 'Insertion Sort', is_correct: false }] },
          { question_type: 'mcq_single', question_content: 'What does OOP stand for?', is_correct: true, marks: 2, marks_obtained: 2, answer_data: { answer: 'Object-Oriented Programming', explanation: 'OOP is a programming paradigm based on objects that bundle data and behavior together.' }, mcq_options: [{ text: 'Object-Oriented Programming', is_correct: true }, { text: 'Open Operational Process', is_correct: false }, { text: 'Ordered Object Protocol', is_correct: false }, { text: 'None of the above', is_correct: false }] },
          { question_type: 'mcq_single', question_content: 'What is the output of 2 ** 10 in Python?', is_correct: false, marks: 2, marks_obtained: 0, answer_data: { answer: '20', explanation: '2 ** 10 is the exponentiation operator in Python — it means 2 to the power of 10, which equals 1024, not 20.' }, mcq_options: [{ text: '20', is_correct: false }, { text: '1024', is_correct: true }, { text: '512', is_correct: false }, { text: '2048', is_correct: false }] },
          { question_type: 'mcq_single', question_content: 'Which keyword is used to inherit a class in Python?', is_correct: true, marks: 2, marks_obtained: 2, answer_data: { answer: 'Passing the parent class in parentheses', explanation: 'In Python, inheritance is done by passing the parent class in parentheses: class Child(Parent).' }, mcq_options: [{ text: 'extends', is_correct: false }, { text: 'Passing the parent class in parentheses', is_correct: true }, { text: 'inherits', is_correct: false }, { text: 'super', is_correct: false }] },
          // Coding questions
          {
            question_type: 'coding',
            question_content: 'Write a Python function `reverse_string(s)` that returns the reversed version of the input string.',
            question_title: 'Reverse a String',
            is_correct: true,
            marks: 5,
            marks_obtained: 5,
            answer_data: {
              answer: `def reverse_string(s):\n    return s[::-1]\n\n# Test\nprint(reverse_string("hello"))  # Output: "olleh"`,
              language: 'python',
              explanation: 'Python slice notation s[::-1] steps through the string backwards, producing the reversed string in O(n) time.',
              reference_solution: `def reverse_string(s):\n    return s[::-1]\n\n# Alternative: using reversed()\ndef reverse_string_v2(s):\n    return ''.join(reversed(s))`,
            },
          },
          {
            question_type: 'coding',
            question_content: 'Write a Python function `is_palindrome(s)` that returns True if the string is a palindrome, False otherwise. Ignore case.',
            question_title: 'Check Palindrome',
            is_correct: true,
            marks: 5,
            marks_obtained: 5,
            answer_data: {
              answer: `def is_palindrome(s):\n    s = s.lower()\n    return s == s[::-1]\n\n# Test\nprint(is_palindrome("Racecar"))  # True\nprint(is_palindrome("hello"))    # False`,
              language: 'python',
              explanation: 'Convert to lowercase first to handle case-insensitivity, then compare the string with its reverse.',
              reference_solution: `def is_palindrome(s):\n    s = s.lower().replace(' ', '')\n    return s == s[::-1]`,
            },
          },
          {
            question_type: 'coding',
            question_content: 'Write a Python function `fibonacci(n)` that returns the nth Fibonacci number (0-indexed). Use an iterative approach.',
            question_title: 'Fibonacci Number',
            is_correct: false,
            marks: 5,
            marks_obtained: 0,
            answer_data: {
              answer: `def fibonacci(n):\n    if n == 0: return 0\n    a, b = 0, 1\n    for _ in range(n - 1):\n        a, b = b, a + b\n    return a  # Bug: should return b`,
              language: 'python',
              explanation: 'The iterative approach is correct but the return value has an off-by-one error. After the loop, `b` holds the nth Fibonacci number, not `a`. The fix is `return b`.',
              reference_solution: `def fibonacci(n):\n    if n == 0: return 0\n    if n == 1: return 1\n    a, b = 0, 1\n    for _ in range(n - 1):\n        a, b = b, a + b\n    return b`,
            },
          },
          {
            question_type: 'coding',
            question_content: 'Write a Python function `count_vowels(s)` that returns the count of vowels (a, e, i, o, u) in the given string. Case-insensitive.',
            question_title: 'Count Vowels',
            is_correct: true,
            marks: 5,
            marks_obtained: 5,
            answer_data: {
              answer: `def count_vowels(s):\n    return sum(1 for c in s.lower() if c in 'aeiou')\n\n# Test\nprint(count_vowels("Hello World"))  # 3`,
              language: 'python',
              explanation: 'Using a generator expression with sum() is clean and Pythonic. Converting to lowercase first handles case-insensitivity.',
              reference_solution: `def count_vowels(s):\n    vowels = set('aeiou')\n    return sum(1 for c in s.lower() if c in vowels)`,
            },
          },
        ];

        setSubmissionData({
          marks: mockScore,
          started_at: started.toISOString(),
          completed_at: now.toISOString(),
          question_activities: MOCK_QUESTIONS,
        });
      setAllSubmissions([{ id: currentSubId, status: 'completed', marks: mockScore }]);
        setLoading(false);
        return;
      }

    const fetchSubmission = async () => {
      setLoading(true);
      try {
        const data = await getSkillTestSubmission(currentSubId);
        setSubmissionData(data);
      } catch {
        toast.error('Failed to load test results.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
    window.scrollTo(0, 0);
  }, [currentSubId]);

  const questions = useMemo(() => submissionData?.question_activities || [], [submissionData]);

  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (typeFilter !== 'all') {
      result = result.filter((q: any) => {
        if (typeFilter === 'mcq') return q.question_type?.includes('mcq');
        return q.question_type === typeFilter;
      });
    }
    if (activeTab === 'incorrect') return result.filter((q: any) => !q.is_correct);
    if (activeTab === 'correct') return result.filter((q: any) => q.is_correct);
    return result;
  }, [questions, activeTab, typeFilter]);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const correctAnswers = questions.filter((q: any) => q.is_correct).length;
  const totalScore = submissionData?.marks || 0;
  const maxScore = test.marks;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const timeTakenMinutes = useMemo(() => {
    if (!submissionData?.started_at || !submissionData?.completed_at) return 0;
    return Math.round(
      (new Date(submissionData.completed_at).getTime() - new Date(submissionData.started_at).getTime()) / 60000
    );
  }, [submissionData]);

  const getPerformance = (pct: number) => {
    if (pct >= 90) return { text: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', icon: 'green' };
    if (pct >= 75) return { text: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'blue' };
    if (pct >= 60) return { text: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'yellow' };
    return { text: 'Needs Work', color: 'text-red-600', bg: 'bg-red-50', icon: 'red' };
  };

  const perf = getPerformance(percentage);
  const showAiChat = activeTab === 'ai_buddy';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  if (!submissionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">No submission data found for this assessment.</p>
        <Button variant="outline" onClick={onBackToList}>Back to List</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{test.title} — Results</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">
                Attempt {allSubmissions.findIndex(s => s.id === currentSubId) + 1} of {allSubmissions.length}
              </span>
              {allSubmissions.length > 1 && (
                <div className="flex gap-1">
                  {allSubmissions.map((sub, idx) => (
                    <button
                      key={sub.id}
                      onClick={() => setCurrentSubId(sub.id)}
                      className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                        currentSubId === sub.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {allSubmissions.length - idx}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onTryAgain && (
              <Button onClick={onTryAgain} className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
                <RotateCcw className="h-4 w-4" /> Retake
              </Button>
            )}
            <Button variant="outline" onClick={onBackToList} className="border-gray-200 text-gray-600 hover:bg-white">
              Back to List
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${perf.bg}`}>
                <Trophy className={`w-5 h-5 ${perf.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalScore}<span className="text-sm font-normal text-gray-400"> / {maxScore}</span></p>
                <p className="text-xs text-gray-500">Total Score</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{test.totalQuestions > 0 ? Math.round((correctAnswers / test.totalQuestions) * 100) : 0}%</p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{timeTakenMinutes}m<span className="text-sm font-normal text-gray-400"> / {test.duration}m</span></p>
                <p className="text-xs text-gray-500">Time Taken</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${perf.bg}`}>
                {percentage >= 60
                  ? <CheckCircle className={`w-5 h-5 ${perf.color}`} />
                  : <XCircle className={`w-5 h-5 ${perf.color}`} />}
              </div>
              <div>
                <p className={`text-base font-bold ${perf.color}`}>{perf.text}</p>
                <p className="text-xs text-gray-500">Result Status</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Review */}
        <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
          {/* Tab bar */}
          <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'incorrect', 'correct'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${
                    activeTab === tab
                      ? tab === 'incorrect' ? 'bg-red-500 text-white' : tab === 'correct' ? 'bg-green-500 text-white' : 'bg-gray-900 text-white'
                      : tab === 'incorrect' ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' : tab === 'correct' ? 'text-gray-500 hover:bg-green-50 hover:text-green-600' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'all' ? `All (${questions.length})` : tab === 'incorrect' ? `Incorrect (${questions.length - correctAnswers})` : `Correct (${correctAnswers})`}
                </button>
              ))}

              <div className="h-5 w-px bg-gray-200 mx-1" />

              {/* Type filter */}
              {(['all', 'mcq', 'coding', 'descriptive'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all capitalize ${
                    typeFilter === t ? 'bg-white text-gray-900 border border-gray-300' : 'text-gray-400 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  {t === 'all' ? 'All Types' : t.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveTab(activeTab === 'ai_buddy' ? 'all' : 'ai_buddy')}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'ai_buddy'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" /> AI Buddy
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row items-start">
            <div
              className={`${showAiChat ? 'lg:w-[65%] border-r border-gray-200' : 'w-full'} transition-all duration-300 overflow-y-auto`}
              style={showAiChat ? { height: 'calc(100vh - 200px)', maxHeight: '800px' } : {}}
            >
              <div className="p-5 space-y-3">
                {filteredQuestions.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No questions in this filter</p>
                  </div>
                )}
                {filteredQuestions.map((q: any, idx: number) => {
                  const isCorrect = q.is_correct;
                  const isExpanded = expandedQuestions.has(idx);
                  const qType = q.question_type?.includes('mcq') ? 'MCQ' : q.question_type === 'coding' ? 'Coding' : 'Descriptive';

                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm bg-white ${isCorrect ? 'border-gray-200' : 'border-red-200'}`}
                    >
                      <div
                        className={`p-4 cursor-pointer flex items-start gap-3 hover:bg-white transition-colors ${isExpanded ? 'bg-white' : ''}`}
                        onClick={() => toggleQuestion(idx)}
                      >
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                          {isCorrect
                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                            : <XCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Q{idx + 1}</span>
                            <Badge className="text-[10px] h-4 px-1.5 bg-white text-slate-600 border-0 hover:bg-slate-100 font-bold uppercase tracking-wider">{qType}</Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{q.question_content || q.question_title}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Score</p>
                            <p className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {q.marks_obtained || 0}/{q.marks}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
                          {/* MCQ options */}
                          {q.mcq_options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.mcq_options.map((opt: any, oi: number) => {
                                const isSelected = opt.text === q.answer_data?.answer;
                                const isOptCorrect = opt.is_correct;
                                const style = isOptCorrect
                                  ? 'border-green-200 bg-green-50 text-green-800'
                                  : isSelected ? 'border-red-200 bg-red-50 text-red-800'
                                  : 'border-gray-200 bg-white text-gray-600';
                                return (
                                  <div key={oi} className={`p-3 rounded-lg border text-sm flex items-center justify-between ${style}`}>
                                    <span>{opt.text}</span>
                                    {isOptCorrect && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                                    {isSelected && !isOptCorrect && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Coding answer */}
                          {q.question_type === 'coding' && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Code className="h-4 w-4" /> Your Code
                              </p>
                              {q.answer_data?.answer ? (
                                <div className="rounded-lg overflow-hidden border border-gray-200">
                                  <MonacoCodeEditor
                                    value={q.answer_data.answer}
                                    onChange={() => {}}
                                    language={q.answer_data?.language || 'python'}
                                    readOnly={true}
                                    height="200px"
                                  />
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-2 text-sm text-gray-400">
                                  <Eye className="w-4 h-4" /> No code submitted
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reference solution for coding questions */}
                          {q.question_type === 'coding' && q.answer_data?.reference_solution && (
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" /> Reference Solution
                              </p>
                              <div className="rounded-lg overflow-hidden border border-green-200">
                                <MonacoCodeEditor
                                  value={q.answer_data.reference_solution}
                                  onChange={() => {}}
                                  language={q.answer_data?.language || 'python'}
                                  readOnly={true}
                                  height="200px"
                                />
                              </div>
                            </div>
                          )}

                          {/* Descriptive answer */}
                          {q.question_type === 'descriptive' && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">Your Answer</p>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <pre className="text-sm whitespace-pre-wrap text-gray-800">{q.answer_data?.answer || 'No answer provided'}</pre>
                              </div>
                            </div>
                          )}

                          {/* Explanation */}
                          {q.answer_data?.explanation && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                              <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" /> Explanation
                              </h4>
                              <p className="text-sm text-blue-900/80">{q.answer_data.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Chat panel */}
            {showAiChat && (
              <div className="lg:w-[35%] w-full flex flex-col bg-white" style={{ height: 'calc(100vh - 200px)', maxHeight: '800px' }}>
                <div className="flex-1 p-4 h-full relative">
                  <div className="absolute inset-4">
                    <AIChatContainer
                      className="w-full h-full border border-gray-200 shadow-sm rounded-xl flex flex-col bg-white overflow-hidden"
                      welcomeMessage={`I've analyzed your performance on "${test.title}". You scored ${totalScore}/${maxScore}. Ask me anything!`}
                      persistenceKey={`test-review-${currentSubId}`}
                      chatTitle={`${test.title} Review`}
                      contextGetter={() => JSON.stringify({
                        test_title: test.title,
                        score: totalScore,
                        total_questions: test.totalQuestions,
                        correct: correctAnswers,
                        question_data: questions.map((q: any) => ({
                          title: q.question_title,
                          is_correct: q.is_correct,
                          student_answer: q.answer_data?.answer,
                        })),
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TestResults;
