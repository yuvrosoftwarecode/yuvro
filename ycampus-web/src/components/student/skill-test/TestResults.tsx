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
    if (currentSubId.startsWith('mock-') || currentSubId.startsWith('sub-')) return;

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
    <div className="min-h-screen bg-gray-50">
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
            <Button variant="outline" onClick={onBackToList} className="border-gray-200 text-gray-600 hover:bg-gray-50">
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
                <Clock className="w-5 h-5 text-amber-600" />
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
                    typeFilter === t ? 'bg-gray-100 text-gray-900 border border-gray-300' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
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
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
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
                        className={`p-4 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
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
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 border border-gray-200">{qType}</Badge>
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
                                <pre className="bg-gray-900 text-green-400 text-xs font-mono p-4 rounded-lg overflow-x-auto max-h-48">
                                  {q.answer_data.answer}
                                </pre>
                              ) : (
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center gap-2 text-sm text-gray-400">
                                  <Eye className="w-4 h-4" /> No code submitted
                                </div>
                              )}
                            </div>
                          )}

                          {/* Descriptive answer */}
                          {q.question_type === 'descriptive' && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">Your Answer</p>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
              <div className="lg:w-[35%] w-full flex flex-col bg-gray-50/50" style={{ height: 'calc(100vh - 200px)', maxHeight: '800px' }}>
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
