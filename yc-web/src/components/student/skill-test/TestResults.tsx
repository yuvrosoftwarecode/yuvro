import React, { useState, useEffect, useMemo } from 'react';
import MonacoCodeEditor from '@/components/code-editor/MonacoCodeEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Code,
  FileText,
  ListFilter,
  Trophy,
  Target,
  ArrowRight
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

const TestResults: React.FC<TestResultsProps> = ({
  test,
  submissionId: initialSubmissionId,
  onBackToList,
  onTryAgain
}) => {
  const [currentSubId, setCurrentSubId] = useState(initialSubmissionId);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incorrect' | 'correct' | 'flagged'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  // Fetch all submissions for the attempt switcher
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const subs = await getSkillTestSubmissions(test.id);
        const filtered = subs.filter(s => s.status === 'completed' || s.status === 'submitted');
        const sorted = filtered.sort((a, b) => new Date(b.submitted_at || b.completed_at || b.created_at).getTime() - new Date(a.submitted_at || a.completed_at || a.created_at).getTime());
        setAllSubmissions(sorted);

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

  const questions = useMemo(() => {
    return submissionData?.question_activities || [];
  }, [submissionData]);

  const filteredQuestions = useMemo(() => {
    if (activeTab === 'incorrect') {
      return questions.filter((q: any) => !q.is_correct);
    }
    if (activeTab === 'correct') {
      return questions.filter((q: any) => q.is_correct);
    }
    // Flagged logic would go here if we had flagged state persisted
    return questions;
  }, [questions, activeTab]);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const totalQuestionsAttempted = submissionData?.question_activities?.filter((q: any) => q.answer_data?.answer).length || 0;
  const correctAnswers = submissionData?.question_activities?.filter((q: any) => q.is_correct).length || 0;

  const totalScore = submissionData?.marks || 0;
  const maxScore = test.marks;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const timeTakenMinutes = useMemo(() => {
    if (!submissionData?.started_at || !submissionData?.completed_at) return 0;
    const start = new Date(submissionData.started_at).getTime();
    const end = new Date(submissionData.completed_at).getTime();
    return Math.round((end - start) / 60000); // Minutes
  }, [submissionData]);

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' };
    if (percentage >= 75) return { text: 'Good', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
    if (percentage >= 60) return { text: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' };
    return { text: 'Need Improvement', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
  };

  const performance = getPerformanceLevel(percentage);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-8 py-6 space-y-8">

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToList}
            className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors font-normal text-gray-500"
          >
            Skill Test
          </Button>
          <span>/</span>
          <span className="text-gray-700 font-medium">{test.course}</span>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{test.title}</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{test.title} Results</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-500 text-sm">Attempt {allSubmissions.findIndex(s => s.id === currentSubId) + 1} of {allSubmissions.length}</span>
              {allSubmissions.length > 1 && (
                <div className="flex gap-1">
                  {allSubmissions.map((sub, idx) => (
                    <button
                      key={sub.id}
                      onClick={() => setCurrentSubId(sub.id)}
                      className={`w-6 h-6 rounded text-xs font-medium transition-colors ${currentSubId === sub.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                      {allSubmissions.length - idx}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {onTryAgain && (
              <Button onClick={onTryAgain} className="gap-2 shadow-sm bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md transition-all">
                <RotateCcw className="h-4 w-4" />
                Retake Test
              </Button>
            )}
            <Button variant="outline" onClick={onBackToList} className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              Back to List
            </Button>
          </div>
        </div>

        {/* Scorecard Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Score Card */}
          <Card className={`group border-0 shadow-sm bg-gradient-to-br from-white to-${performance.color.split('-')[1]}-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative`}>
            <div className={`absolute inset-0 bg-${performance.color.split('-')[1]}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-${performance.color.split('-')[1]}-100 to-${performance.color.split('-')[1]}-50 ${performance.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-slate-900">{totalScore}</span>
                      <span className="text-sm font-medium text-slate-400">/ {maxScore}</span>
                    </div>
                    <p className={`text-sm font-medium text-slate-500 group-hover:text-${performance.color.split('-')[1]}-600 transition-colors`}>Total Score</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accuracy Card */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">{test.totalQuestions > 0 ? Math.round((correctAnswers / test.totalQuestions) * 100) : 0}%</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Card */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-amber-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">{timeTakenMinutes}m</span>
                    <span className="text-sm font-medium text-slate-400">/ {test.duration}m</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-amber-600 transition-colors">Time Taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className={`group border-0 shadow-sm bg-gradient-to-br from-white to-${performance.color.split('-')[1]}-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative`}>
            <div className={`absolute inset-0 bg-${performance.color.split('-')[1]}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-${performance.color.split('-')[1]}-100 to-${performance.color.split('-')[1]}-50 ${performance.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  {percentage >= 60 ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tracking-tight ${performance.color}`}>{performance.text}</span>
                  </div>
                  <p className={`text-sm font-medium text-slate-500 group-hover:text-${performance.color.split('-')[1]}-600 transition-colors`}>Result Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Main Review List (Left) */}
          <div className="lg:w-2/3">
            <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white h-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4 bg-white">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === 'all' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  All Questions <span className="opacity-70 text-xs ml-1">({questions.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('incorrect')}
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === 'incorrect' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
                >
                  Incorrect <span className="opacity-70 text-xs ml-1">({questions.length - correctAnswers})</span>
                </button>
                <button
                  onClick={() => setActiveTab('correct')}
                  className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === 'correct' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500 hover:bg-green-50 hover:text-green-600'}`}
                >
                  Correct <span className="opacity-70 text-xs ml-1">({correctAnswers})</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {filteredQuestions.map((q: any, idx: number) => {
                  const isCorrect = q.is_correct;
                  const isExpanded = expandedQuestions.has(idx);
                  const qType = q.question_type?.includes('mcq') ? 'MCQ' : q.question_type === 'coding' ? 'Coding' : 'Descriptive';

                  return (
                    <div key={idx} className={`border ${isCorrect ? 'border-gray-200' : 'border-red-200'} rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md bg-white`}>
                      <div
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-start gap-4 ${isExpanded ? 'bg-gray-50' : ''}`}
                        onClick={() => toggleQuestion(idx)}
                      >
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question {idx + 1}</span>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal border border-gray-200">{qType}</Badge>
                          </div>
                          <p className="font-medium text-gray-900 line-clamp-2">{q.question_content || q.question_title}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-400 uppercase font-bold">Score</p>
                            <p className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {q.marks_obtained || 0} / {q.marks}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 p-6 bg-white space-y-6 animate-fade-in">
                          {/* Answer Section */}
                          <div className="space-y-4">

                            {/* MCQ Options Display */}
                            {q.mcq_options && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {q.mcq_options.map((opt: any, optIdx: number) => {
                                  const isSelected = opt.text === q.answer_data?.answer;
                                  const isOptCorrect = opt.is_correct;

                                  let style = "border-gray-200 bg-white text-gray-600";
                                  if (isOptCorrect) style = "border-green-200 bg-green-50 text-green-800 font-medium";
                                  else if (isSelected && !isOptCorrect) style = "border-red-200 bg-red-50 text-red-800 font-medium";

                                  return (
                                    <div key={optIdx} className={`p-3 rounded-lg border text-sm flex items-center justify-between ${style}`}>
                                      <span>{opt.text}</span>
                                      {isOptCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                                      {isSelected && !isOptCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Coding / Descriptive Answer Display */}
                            {(q.question_type === 'coding' || q.question_type === 'descriptive') && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Your Answer</p>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
                                    {q.answer_data?.answer || "No answer provided"}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Reference Solution Display */}
                            {q.solution_code && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                                    <Code className="h-4 w-4" /> Reference Solution
                                  </p>
                                  {q.solution_language && (
                                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                      {q.solution_language === 'cpp' ? 'C++' : q.solution_language.charAt(0).toUpperCase() + q.solution_language.slice(1)}
                                    </span>
                                  )}
                                </div>
                                <MonacoCodeEditor
                                  value={q.solution_code}
                                  onChange={() => { }}
                                  language={q.solution_language || 'python'}
                                  readOnly={true}
                                  height="200px"
                                />
                              </div>
                            )}
                          </div>

                          {/* Explanations */}
                          <div className="space-y-4 pt-4 border-t border-gray-100">
                            {q.answer_data?.explanation && (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                                  <FileText className="h-4 w-4" /> Explanation
                                </h4>
                                <p className="text-sm text-blue-900/80">{q.answer_data.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar (Right) */}
          <div className="lg:w-1/3">
            <AIChatContainer
              className="w-full h-full border border-gray-200 shadow-sm rounded-xl flex flex-col bg-white"
              welcomeMessage={`I've analyzed your performance on "${test.title}". \n\nYou scored ${totalScore}/${maxScore}. Ask me about any specific question you missed!`}
              persistenceKey={`test-review-${currentSubId}`}
              chatTitle="AI Performance Tutor"
              contextGetter={() => {
                return JSON.stringify({
                  test_title: test.title,
                  score: totalScore,
                  total_questions: test.totalQuestions,
                  correct: correctAnswers,
                  question_data: questions.map((q: any) => ({
                    title: q.question_title,
                    is_correct: q.is_correct,
                    student_answer: q.answer_data?.answer
                  }))
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
