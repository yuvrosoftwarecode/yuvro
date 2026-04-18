import React, { useMemo, useState, useEffect } from 'react';
import { getSkillTestSubmissions } from '@/services/skillTestService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import AIChatContainer from './ai-buddy/AIChatContainer';
import {
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Target,
  Star,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Code,
  Eye,
  Lightbulb,
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  marks: number;
  score?: number;
}

interface AssessmentResultsProps {
  assessment: Assessment;
  onBackToList: () => void;
  onTryAgain: () => void;
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

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  assessment,
  onBackToList,
  onTryAgain,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'incorrect' | 'correct' | 'ai_buddy'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'coding' | 'descriptive'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showAiChat, setShowAiChat] = useState(false);

  const [realStats, setRealStats] = useState({
    correctAnswers: 0,
    wrongAnswers: 0,
    notAttempted: 0,
    timeTakenSeconds: 0,
    completedAt: null as string | null
  });

  const [realQuestions, setRealQuestions] = useState<QuestionResult[]>([]);


  useEffect(() => {
    getSkillTestSubmissions(assessment.id).then(subs => {
      if (subs && subs.length > 0) {
        const sub = subs[0];
        const acts = sub.question_activities || [];
        const calculateTimeTaken = () => {
          if (sub.submitted_at && sub.started_at) {
            const diff = (new Date(sub.submitted_at).getTime() - new Date(sub.started_at).getTime()) / 1000;
            if (diff > 0) return Math.floor(diff);
          }
          return Math.floor(acts.reduce((sum: number, a: any) => sum + (a.total_question_time || 0), 0) || Math.max(60, assessment.duration * 0.82 * 60));
        };

        setRealStats({
          correctAnswers: acts.filter((a: any) => a.is_correct).length,
          wrongAnswers: acts.filter((a: any) => !a.is_correct && a.answer_data?.answer).length,
          notAttempted: acts.filter((a: any) => !a.answer_data?.answer).length,
          timeTakenSeconds: calculateTimeTaken(),
          completedAt: sub.completed_at || sub.submitted_at || null
        });

        const mappedQuestions: QuestionResult[] = acts.map((act: any, idx: number) => {
          const qTypeRaw = act.question_type || '';
          const isMcq = qTypeRaw.startsWith('mcq');
          
          let studentAns = '';
          if (act.answer_data?.answer) {
            if (Array.isArray(act.answer_data.answer)) {
              studentAns = act.answer_data.answer.join(', ');
            } else {
              studentAns = String(act.answer_data.answer);
            }
          }

          let correctAns = '';
          const options = act.mcq_options || [];
          if (isMcq) {
            const correctOnes = options.filter((o: any) => o.is_correct).map((o: any) => o.text || o.option_text);
            correctAns = correctOnes.join(', ');
          } else if (qTypeRaw === 'coding') {
            // Reference solution if available? Backend Serializer doesn't seem to have reference solution for coding yet
            correctAns = ''; 
          }

          return {
            id: act.id,
            question: act.question_title || act.question_content || '',
            type: qTypeRaw === 'coding' ? 'coding' : qTypeRaw === 'descriptive' ? 'descriptive' : 'mcq',
            options: isMcq ? options.map((o: any) => o.text || o.option_text) : undefined,
            correctAnswer: correctAns,
            studentAnswer: studentAns,
            isCorrect: act.is_correct,
            explanation: act.answer_data?.explanation || '',
            points: act.marks_obtained || 0,
            maxPoints: act.marks || 0
          };
        });
        setRealQuestions(mappedQuestions);

      }
    }).catch(console.error);
  }, [assessment.id]);

  const completedOn = useMemo(() => {
    const dateToUse = realStats.completedAt ? new Date(realStats.completedAt) : new Date();
    return dateToUse.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [realStats.completedAt]);

  const questionResults = realQuestions;

  const correctAnswers = realStats.correctAnswers;
  const wrongAnswers = realStats.wrongAnswers;
  const notAttempted = realStats.notAttempted;
  const totalScore = questionResults.reduce((sum, q) => sum + q.points, 0);
  const maxScore = assessment.marks || questionResults.reduce((sum, q) => sum + q.maxPoints, 0);
  const percentage = Math.round((totalScore / Math.max(maxScore, 1)) * 100);
  const timeTakenSeconds = realStats.timeTakenSeconds || Math.max(60, Math.round(assessment.duration * 0.82 * 60));
  const totalQuestions = assessment.totalQuestions || questionResults.length;


  const performanceMetrics = {
    accuracy: Math.round((correctAnswers / Math.max(totalQuestions, 1)) * 100),
    speed: Math.round((totalQuestions / Math.max(timeTakenSeconds / 60, 1)) * 10) / 10,
    completionRate: Math.round(((totalQuestions - notAttempted) / Math.max(totalQuestions, 1)) * 100),
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score >= 60) return <Target className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredQuestions = useMemo(() => {
    let result = questionResults;

    if (typeFilter !== 'all') {
      result = result.filter((q) => q.type === typeFilter);
    }

    if (activeTab === 'incorrect') {
      return result.filter((q) => !q.isCorrect);
    }

    if (activeTab === 'correct') {
      return result.filter((q) => q.isCorrect);
    }

    return result;
  }, [questionResults, activeTab, typeFilter]);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getAssessmentContext = () => {
    const incorrect = questionResults.filter((q) => !q.isCorrect);
    const focusQuestion = incorrect[0] || questionResults[0];
    return [
      `Assessment: ${assessment.title}`,
      `Course: ${assessment.course}`,
      `Score: ${totalScore}/${maxScore} (${percentage}%)`,
      `Correct: ${correctAnswers}/${totalQuestions}`,
      `Incorrect: ${wrongAnswers}`,
      `Not attempted: ${notAttempted}`,
      focusQuestion ? `Focus question: ${focusQuestion.question}` : '',
    ].filter(Boolean).join('\n');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center">
            <div className="flex-1">
                <Button className="inline-flex items-center gap-2 bg-white text-black hover:bg-slate-100" onClick={onBackToList}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Assessments  
                </Button>
            </div>
            <div className="flex-1 text-center">  
                <h2 className="text-xl font-semibold text-foreground">Test Report</h2>
            </div>
            <div className="flex-1"></div>
        </div>


        <Tabs defaultValue="overall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overall">Performance Analysis</TabsTrigger>
            <TabsTrigger value="questions">Question-wise Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overall">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Assessment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <div className="font-semibold">{assessment.course}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Assessment:</span>
                      <div className="font-semibold">{assessment.title}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Questions:</span>
                      <div className="font-semibold">{totalQuestions}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Taken:</span>
                      <div className="font-semibold">{formatTime(timeTakenSeconds)}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed On:</span>
                    <div className="font-semibold">{completedOn}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Overall Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold flex items-center justify-center gap-2 mb-2">
                    <span className={getScoreColor(percentage)}>{percentage}%</span>
                    {getScoreIcon(percentage)}
                  </div>
                  <p className="text-muted-foreground mb-4">{totalScore}/{maxScore} Points</p>
                  <div className="text-center">
                    <p className="font-medium text-lg">
                      {percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good Performance!' : 'Needs Improvement'}
                    </p>
                    <p className="text-muted-foreground">
                      {percentage >= 80 ? 'Outstanding result' : percentage >= 60 ? 'Above average performance' : 'Keep practicing'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Question Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Correct</span>
                      </div>
                      <span className="font-bold text-green-600">{correctAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium">Wrong</span>
                      </div>
                      <span className="font-bold text-red-600">{wrongAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium">Not Attempted</span>
                      </div>
                      <span className="font-bold text-orange-600">{notAttempted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Accuracy</span>
                        <span className="text-muted-foreground text-sm">{performanceMetrics.accuracy}%</span>
                      </div>
                      <Progress value={performanceMetrics.accuracy} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Completion Rate</span>
                        <span className="text-muted-foreground text-sm">{performanceMetrics.completionRate}%</span>
                      </div>
                      <Progress value={performanceMetrics.completionRate} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Speed</span>
                        <span className="text-muted-foreground text-sm">{performanceMetrics.speed} q/min</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {correctAnswers > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Strong performance in objective concepts</span>
                      </li>
                    )}
                    {questionResults.some(q => q.type === 'coding' && q.isCorrect) && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Good coding implementation skills</span>
                      </li>
                    )}
                    {performanceMetrics.completionRate > 80 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">High completion rate indicates solid time management</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {wrongAnswers > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Review incorrect concepts and practice similar problems</span>
                      </li>
                    )}
                    {notAttempted > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Improve time management to attempt all questions</span>
                      </li>
                    )}
                    {questionResults.some(q => !q.isCorrect && q.type === 'descriptive') && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Focus on conceptual depth in descriptive responses</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'incorrect', 'correct'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setShowAiChat(false);
                      }}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${
                        activeTab === tab
                          ? tab === 'incorrect'
                            ? 'bg-red-500 text-white'
                            : tab === 'correct'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-900 text-white'
                          : tab === 'incorrect'
                            ? 'text-black hover:bg-red-50 hover:text-red-600'
                            : tab === 'correct'
                              ? 'text-black hover:bg-green-50 hover:text-green-600'
                              : 'text-black hover:bg-gray-100'
                      }`}
                    >
                      {tab === 'all'
                        ? `All (${questionResults.length})`
                        : tab === 'incorrect'
                          ? `Incorrect (${questionResults.length - correctAnswers})`
                          : `Correct (${correctAnswers})`}
                    </button>
                  ))}

                  <div className="h-5 w-px bg-gray-200 mx-1" />

                  {(['all', 'mcq', 'coding', 'descriptive'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all capitalize ${
                        typeFilter === type
                          ? 'bg-white text-black border border-gray-300'
                          : 'text-black hover:text-black hover:bg-white'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const nextIsOpen = !showAiChat;
                    setShowAiChat(nextIsOpen);
                    setActiveTab(nextIsOpen ? 'ai_buddy' : 'all');
                  }}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                    showAiChat
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-700 hover:bg-white border border-slate-200'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" /> AI Mentor
                </button>
              </div>

              <div className={`flex ${showAiChat ? 'flex-col lg:flex-row' : 'flex-col'}`}>
                <div className={`${showAiChat ? 'lg:w-[65%] w-full border-r border-gray-100' : 'w-full'} p-5`}>
                  <div className="space-y-4">
                    {filteredQuestions.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        No questions found for this filter.
                      </div>
                    )}

                    {filteredQuestions.map((question, idx) => {
                      const listIndex = questionResults.findIndex((q) => q.id === question.id);
                      const isExpanded = expandedQuestions.has(listIndex);
                      const isCorrect = question.isCorrect;
                      const qType =
                        question.type === 'mcq'
                          ? 'MCQ'
                          : question.type === 'coding'
                            ? 'Coding'
                            : 'Descriptive';

                      const correctSet = new Set(
                        question.correctAnswer
                          .split(',')
                          .map((entry) => entry.trim())
                          .filter(Boolean)
                      );
                      const answerSet = new Set(
                        question.studentAnswer
                          .split(',')
                          .map((entry) => entry.trim())
                          .filter(Boolean)
                      );

                      return (
                        <div
                          key={question.id}
                          className={`border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm bg-white ${isCorrect ? 'border-gray-200' : 'border-red-200'}`}
                        >
                          <div
                            className={`p-4 cursor-pointer flex items-start gap-3 hover:bg-white transition-colors ${isExpanded ? 'bg-white' : ''}`}
                            onClick={() => toggleQuestion(listIndex)}
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
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">{question.question}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Score</p>
                                <p className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {question.points}/{question.maxPoints}
                                </p>
                              </div>
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
                              {question.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {question.options.map((option, optionIndex) => {
                                    const isSelected = answerSet.has(option);
                                    const isOptionCorrect = correctSet.has(option);
                                    const style = isOptionCorrect
                                      ? 'border-green-200 bg-green-50 text-green-800'
                                      : isSelected
                                        ? 'border-red-200 bg-red-50 text-red-800'
                                        : 'border-gray-200 bg-white text-gray-600';

                                    return (
                                      <div key={optionIndex} className={`p-3 rounded-lg border text-sm flex items-center justify-between ${style}`}>
                                        <span>{option}</span>
                                        {isOptionCorrect && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                                        {isSelected && !isOptionCorrect && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {question.type === 'coding' && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Code className="h-4 w-4" /> Your Code
                                  </p>
                                  {question.studentAnswer ? (
                                    <pre className="bg-white rounded-lg p-3 border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">{question.studentAnswer}</pre>
                                  ) : (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-2 text-sm text-gray-400">
                                      <Eye className="w-4 h-4" /> No code submitted
                                    </div>
                                  )}
                                </div>
                              )}

                              {question.type === 'coding' && question.correctAnswer && (
                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                  <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" /> Reference Solution
                                  </p>
                                  <pre className="bg-green-50 rounded-lg p-3 border border-green-200 text-sm text-green-900 whitespace-pre-wrap">{question.correctAnswer}</pre>
                                </div>
                              )}

                              {question.type === 'descriptive' && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700">Your Answer</p>
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <pre className="text-sm whitespace-pre-wrap text-gray-800">{question.studentAnswer || 'No answer provided'}</pre>
                                  </div>
                                </div>
                              )}

                              {question.explanation && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                  <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" /> Explanation
                                  </h4>
                                  <p className="text-sm text-blue-900/80">{question.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {showAiChat && (
                  <div className="lg:w-[35%] w-full flex flex-col bg-white h-screen">
                    <div className="flex-1 p-4 h-full relative">
                      <div className="absolute inset-4">
                        <AIChatContainer
                          className="w-full h-full border border-gray-200 shadow-sm rounded-xl flex flex-col bg-white overflow-hidden"
                          welcomeMessage="Hi! I am your AI Mentor. Ask me anything about your assessment answers, mistakes, or improvement plan."
                          persistenceKey={`assessment-results-${assessment.id}`}
                          chatTitle={`${assessment.title} - AI Mentor`}
                          contextGetter={getAssessmentContext}
                          onClose={() => {
                            setShowAiChat(false);
                            setActiveTab('all');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssessmentResults;
