import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  RotateCcw,
  Bot,
  Send,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  ListFilter,
  Trophy
} from 'lucide-react';
import { getSkillTestSubmission, getSkillTestSubmissions } from '@/services/skillTestService';
import { toast } from 'sonner';
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';

interface Test {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  marks: number;
  score?: number;
  maxAttempts?: number;
  currentAttempts?: number;
}

interface TestResultsProps {
  test: Test;
  submissionId: string;
  onBackToList: () => void;
  onTryAgain?: () => void;
}

interface QuestionResult {
  id: number;
  question: string;
  type: 'mcq' | 'coding' | 'descriptive';
  options?: string[];
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
  explanation: string;
  points: number;
  maxPoints: number;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

const TestResults: React.FC<TestResultsProps> = ({
  test,
  submissionId: initialSubmissionId,
  onBackToList,
  onTryAgain
}) => {
  console.log('TestResults component rendered with:', {
    test: test?.id,
    testTitle: test?.title,
    submissionId: initialSubmissionId
  });
  const [currentSubId, setCurrentSubId] = useState(initialSubmissionId);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [activeTab, setActiveTab] = useState<'mcq' | 'coding' | 'descriptive'>('mcq');

  // Fetch all submissions for the attempt switcher
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const subs = await getSkillTestSubmissions(test.id);
        const filtered = subs.filter(s => s.status === 'completed' || s.status === 'submitted');
        // Sort by date descending (latest first)
        const sorted = filtered.sort((a, b) => new Date(b.submitted_at || b.completed_at || b.created_at).getTime() - new Date(a.submitted_at || a.completed_at || a.created_at).getTime());
        setAllSubmissions(sorted);

        // If no initial ID or it's not in the list, default to the latest one
        if (!initialSubmissionId && sorted.length > 0) {
          setCurrentSubId(sorted[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch all submissions", err);
      }
    };
    fetchAll();
  }, [test.id, initialSubmissionId]);

  useEffect(() => {
    if (!currentSubId) return;

    const fetchSubmission = async () => {
      setLoading(true);
      try {
        const data = await getSkillTestSubmission(currentSubId);
        setSubmissionData(data);
        // Set initial active tab based on available questions
        if (data.question_activities) {
          const mcq = data.question_activities.filter((q: any) => q.question_type?.includes('mcq'));
          const coding = data.question_activities.filter((q: any) => q.question_type === 'coding');
          const descriptive = data.question_activities.filter((q: any) => q.question_type === 'descriptive');

          if (mcq.length > 0) setActiveTab('mcq');
          else if (coding.length > 0) setActiveTab('coding');
          else if (descriptive.length > 0) setActiveTab('descriptive');
        }
      } catch (error) {
        console.error('Failed to fetch submission:', error);
        toast.error('Failed to load test results.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
    window.scrollTo(0, 0);
  }, [currentSubId]);

  const { mcqQuestions, codingQuestions, descriptiveQuestions } = useMemo(() => {
    const activities = submissionData?.question_activities || [];
    return {
      mcqQuestions: activities.filter((q: any) => q.question_type?.includes('mcq')),
      codingQuestions: activities.filter((q: any) => q.question_type === 'coding'),
      descriptiveQuestions: activities.filter((q: any) => q.question_type === 'descriptive'),
    };
  }, [submissionData]);

  const currentGroup = useMemo(() => {
    switch (activeTab) {
      case 'mcq':
        return mcqQuestions;
      case 'coding':
        return codingQuestions;
      case 'descriptive':
        return descriptiveQuestions;
      default:
        return [];
    }
  }, [activeTab, mcqQuestions, codingQuestions, descriptiveQuestions]);

  const currentQuestionData = useMemo(() => {
    return currentGroup[selectedQuestion];
  }, [currentGroup, selectedQuestion]);

  const totalQuestionsAttempted = submissionData?.question_activities?.filter((q: any) => q.answer_data?.answer).length || 0;
  const correctAnswers = submissionData?.question_activities?.filter((q: any) => q.is_correct).length || 0;
  const wrongAnswers = submissionData?.question_activities?.filter((q: any) => !q.is_correct && q.answer_data?.answer).length || 0;
  const skippedCount = (test.totalQuestions || 0) - totalQuestionsAttempted;

  const totalScore = submissionData?.marks || 0;
  const maxScore = test.marks;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const timeTakenMinutes = useMemo(() => {
    if (!submissionData?.started_at || !submissionData?.completed_at) return 0;
    const start = new Date(submissionData.started_at).getTime();
    const end = new Date(submissionData.completed_at).getTime();
    return Math.round((end - start) / 60000);
  }, [submissionData]);

  const performanceMetrics = {
    accuracy: test.totalQuestions > 0 ? Math.round((correctAnswers / test.totalQuestions) * 100) : 0,
    speed: timeTakenMinutes > 0 && test.duration ? Math.round((timeTakenMinutes / test.duration) * 100) : 0,
    completionRate: test.totalQuestions > 0 ? Math.round((totalQuestionsAttempted / test.totalQuestions) * 100) : 0
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 75) return { text: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 60) return { text: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Need Improvement', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const performance = getPerformanceLevel(percentage);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  useEffect(() => {
    setSelectedQuestion(0); // Reset selected question when activeTab changes
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  if (!submissionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-destructive">Could not load submission data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
        {/* Compact Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{test.title}</h1>
              {allSubmissions.length > 1 && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attempts</span>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full">
                    {allSubmissions.slice().reverse().map((sub, idx) => (
                      <button
                        key={sub.id}
                        onClick={() => setCurrentSubId(sub.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${currentSubId === sub.id
                          ? 'bg-slate-800 text-white shadow-md scale-110'
                          : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                        title={`Attempt ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{test.course}</p>
          </div>
          <div className="flex gap-2">
            {onTryAgain && (
              <Button
                variant="outline"
                onClick={onTryAgain}
                className="flex items-center gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold h-11 transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              onClick={onBackToList}
              className="flex items-center gap-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 shadow-lg px-6 h-11 transition-all active:scale-95"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Results Content (75%) */}
          <div className="flex-1 lg:w-3/4 space-y-6">


            {/* Performance Analysis Card */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-50 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-base font-black flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-amber-50 rounded-xl">
                      <Trophy className="h-5 w-5 text-amber-500" />
                    </div>
                    Question Analysis
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                    {mcqQuestions.length > 0 && (
                      <Button
                        size="sm"
                        variant={activeTab === 'mcq' ? 'secondary' : 'ghost'}
                        onClick={() => setActiveTab('mcq')}
                        className={`rounded-xl font-bold gap-2 px-4 ${activeTab === 'mcq' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >
                        <ListFilter className="h-4 w-4" />
                        MCQ ({mcqQuestions.length})
                      </Button>
                    )}
                    {codingQuestions.length > 0 && (
                      <Button
                        size="sm"
                        variant={activeTab === 'coding' ? 'secondary' : 'ghost'}
                        onClick={() => setActiveTab('coding')}
                        className={`rounded-xl font-bold gap-2 px-4 ${activeTab === 'coding' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >
                        <Code className="h-4 w-4" />
                        Coding ({codingQuestions.length})
                      </Button>
                    )}
                    {descriptiveQuestions.length > 0 && (
                      <Button
                        size="sm"
                        variant={activeTab === 'descriptive' ? 'secondary' : 'ghost'}
                        onClick={() => setActiveTab('descriptive')}
                        className={`rounded-xl font-bold gap-2 px-4 ${activeTab === 'descriptive' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >
                        <FileText className="h-4 w-4" />
                        Descriptive ({descriptiveQuestions.length})
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedQuestion(prev => Math.max(0, prev - 1))}
                      disabled={selectedQuestion === 0}
                      className="rounded-xl border-slate-200 h-10 w-10 p-0"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-black text-slate-600 tabular-nums px-2">
                      {selectedQuestion + 1} / {currentGroup.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedQuestion(prev => Math.min(currentGroup.length - 1, prev + 1))}
                      disabled={selectedQuestion === currentGroup.length - 1}
                      className="rounded-xl border-slate-200 h-10 w-10 p-0"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!currentQuestionData ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-50 m-6 rounded-3xl border border-dashed border-slate-200">
                    <AlertCircle className="h-10 w-10 text-slate-300 mb-4" />
                    <p className="font-bold text-slate-400">No questions found in this category</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-6 animate-in fade-in duration-500">
                    {/* Question Nav Pills */}
                    <div className="flex flex-wrap gap-2 pb-6 border-b border-slate-50">
                      {currentGroup.map((question: any, index: number) => (
                        <button
                          key={question.id}
                          onClick={() => setSelectedQuestion(index)}
                          className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center font-black text-sm transition-all duration-300 ${selectedQuestion === index
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-110'
                            : question.is_correct
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                              : question.answer_data?.answer
                                ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-200'
                            }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row items-start justify-between gap-6 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/5 transition-colors duration-500" />
                        <div className="space-y-4 relative z-10">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-slate-900 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-lg border-0">
                              Question {selectedQuestion + 1}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black border-slate-200 text-slate-400 bg-white px-3 py-1 rounded-lg">
                              {currentQuestionData.question_type?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-lg font-black text-slate-800 leading-tight">
                            {currentQuestionData.question_content || currentQuestionData.question_title}
                          </p>
                        </div>
                        <div className={`shrink-0 p-5 rounded-[2rem] flex flex-col items-center justify-center min-w-[120px] relative z-10 transition-all duration-500 ${currentQuestionData.is_correct ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>
                          <div className="text-2xl font-black leading-none">{currentQuestionData.marks_obtained || 0}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Marks /{currentQuestionData.marks}</div>
                        </div>
                      </div>

                      {activeTab === 'mcq' && currentQuestionData.mcq_options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {currentQuestionData.mcq_options.map((option: any, idx: number) => {
                            const isCorrect = option.is_correct;
                            const isSelected = option.text === currentQuestionData.answer_data?.answer;

                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group/opt ${isCorrect
                                  ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                  : isSelected
                                    ? 'bg-rose-50 border-rose-200'
                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-[10px] transition-transform duration-300 group-hover/opt:scale-110 ${isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : isSelected ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-500'}`}>
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <span className={`text-xs font-bold transition-colors ${isCorrect ? 'text-emerald-700' : isSelected ? 'text-rose-700' : 'text-slate-600'}`}>
                                    {option.text}
                                  </span>
                                </div>
                                {isCorrect && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                                {!isCorrect && isSelected && <XCircle className="h-4 w-4 text-rose-500" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(activeTab === 'coding' || activeTab === 'descriptive') && (
                        <div className="space-y-6">
                          {activeTab === 'coding' && currentQuestionData.test_cases_basic && (
                            <div className="space-y-4">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ListFilter className="h-3.5 w-3.5" />
                                Test Case Verification
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestionData.test_cases_basic.map((tc: any, idx: number) => (
                                  <div key={idx} className="p-5 bg-white border border-slate-100 rounded-3xl space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest text-slate-400 border-slate-100">
                                        Case #{idx + 1}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-black uppercase text-slate-400">Input</p>
                                      <pre className="text-[10px] bg-slate-50 p-2 rounded-xl font-mono text-slate-600 overflow-x-auto">{tc.input}</pre>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-black uppercase text-slate-400">Expected Output</p>
                                      <pre className="text-[10px] bg-emerald-50 text-emerald-700 p-2 rounded-xl font-mono overflow-x-auto">{tc.expected_output}</pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                            <div className="flex items-center justify-between mb-6 relative z-10">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{activeTab === 'coding' ? 'Source Code' : 'Submitted Response'}</p>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] font-black tracking-widest px-3">
                                  {activeTab === 'coding' ? 'STDOUT_RECORD' : 'SUBMITTED_TEXT'}
                                </Badge>
                              </div>
                              <Bot className="h-6 w-6 text-slate-700" />
                            </div>
                            <pre className="text-emerald-400 font-mono text-xs overflow-x-auto scrollbar-hide max-h-[400px] relative z-10 leading-relaxed">
                              <code>{currentQuestionData.answer_data?.answer || '// No solution provided by student'}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      {currentQuestionData.answer_data?.explanation && (
                        <div className="p-8 bg-blue-50/50 border border-blue-100/50 rounded-[2.5rem] shadow-sm relative overflow-hidden group mt-4">
                          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl -ml-16 -mt-16" />
                          <div className="flex items-center gap-3 mb-4 text-blue-900 relative z-10">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                              <MessageSquare className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Knowledge Base Explanation</p>
                          </div>
                          <p className="text-sm font-bold text-blue-900/80 leading-relaxed relative z-10 ml-1">
                            {currentQuestionData.answer_data.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & AI Assistant (25%) */}
          <div className="hidden lg:flex lg:flex-col lg:w-1/4 sticky top-8 h-[calc(100vh-120px)] gap-6">
            {/* Compact Vertical Score Card */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden shrink-0">
              <CardContent className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="relative w-20 h-20 rounded-full border-4 border-slate-100 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white shadow-inner">
                    <div className="text-center">
                      <div className="text-xl font-black text-slate-900 leading-none">{totalScore}</div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">/ {maxScore}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${performance.bg} ${performance.color} border-0 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider mb-1`}>
                      {performance.text}
                    </Badge>
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {percentage}% Accuracy
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                      {submissionData.submitted_at && new Date(submissionData.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50">
                  <div className="text-center">
                    <div className="text-base font-black text-slate-800 leading-none">{test.totalQuestions}</div>
                    <p className="text-[8px] uppercase tracking-widest font-black text-slate-400 mt-1">Questions</p>
                  </div>
                  <div className="text-center border-x border-slate-50">
                    <div className="text-base font-black text-emerald-700 leading-none">{correctAnswers}</div>
                    <p className="text-[8px] uppercase tracking-widest font-black text-emerald-500 mt-1">Correct</p>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-black text-rose-700 leading-none">{wrongAnswers}</div>
                    <p className="text-[8px] uppercase tracking-widest font-black text-rose-500 mt-1">Wrong</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span>Accuracy</span>
                      <span className="text-slate-900 font-black">{performanceMetrics.accuracy}%</span>
                    </div>
                    <Progress value={performanceMetrics.accuracy} className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span>Progression</span>
                      <span className="text-slate-900 font-black">{performanceMetrics.completionRate}%</span>
                    </div>
                    <Progress value={performanceMetrics.completionRate} className="h-1.5 bg-slate-100 [&>div]:bg-blue-500 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <AIChatContainer
              className="flex-1 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-none overflow-hidden"
              welcomeMessage={`Hi! I'm your AI Buddy. Ready to help you with "${test.title}". Ask me anything!`}
              persistenceKey={`test-review-${currentSubId}`}
              chatTitle={`${test.title} Review - AI Buddy`}
              contextGetter={() => {
                const wrongQ = submissionData?.question_activities?.filter((q: any) => !q.is_correct) || [];
                return JSON.stringify({
                  test_title: test.title,
                  score: totalScore,
                  max_score: maxScore,
                  percentage: percentage,
                  wrong_questions: wrongQ.map((q: any) => ({
                    title: q.question_title,
                    content: q.question_content,
                    student_answer: q.answer_data?.answer,
                    explanation: q.answer_data?.explanation
                  })),
                  current_reviewing: currentQuestionData ? {
                    title: currentQuestionData.question_title,
                    content: currentQuestionData.question_content,
                    student_answer: currentQuestionData.answer_data?.answer,
                    is_correct: currentQuestionData.is_correct,
                    explanation: currentQuestionData.answer_data?.explanation
                  } : null
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResults;