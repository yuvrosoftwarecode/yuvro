import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import AIChatContainer from './ai-buddy/AIChatContainer';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Code,
  Target,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Eye,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { getSkillTestSubmissions, fetchSkillTestById } from '@/services/skillTestService';

interface TestResultsScreenProps {
  testName: string;
  subject: string;
  difficulty: string;
  totalQuestions: number;
  timeTaken: number;
  skillTestId?: string; // ID of the skill test to fetch submission for
  submissionId?: string; // Optional: ID of a specific submission to view
  onTryAgain: () => void;
  onBackToTests: () => void;
}

// Shape of each question_activity from the backend
interface QuestionActivity {
  id: string;
  question: string;
  question_title: string;
  question_type: string;
  question_content: string;
  mcq_options: any[];
  marks: number;
  marks_obtained: number;
  is_correct: boolean;
  answer_data: any;
  total_question_time: number;
}

const TestResultsScreen: React.FC<TestResultsScreenProps> = ({
  testName,
  subject,
  difficulty,
  totalQuestions,
  timeTaken,
  skillTestId,
  submissionId,
  onBackToTests
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'incorrect' | 'correct' | 'ai_buddy'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'coding' | 'descriptive'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showAiChat, setShowAiChat] = useState(false);

  // Real submission data
  const [questionActivities, setQuestionActivities] = useState<QuestionActivity[]>([]);
  const [submissionMarks, setSubmissionMarks] = useState<number>(0);
  const [totalMarks, setTotalMarks] = useState<number>(0);
  const [completedAt, setCompletedAt] = useState<string>('');
  const [submissionTestTitle, setSubmissionTestTitle] = useState<string>('');
  const [submissionDifficulty, setSubmissionDifficulty] = useState<string>('');
  const [submissionDuration, setSubmissionDuration] = useState<number>(0);
  const [hasSubmission, setHasSubmission] = useState<boolean>(false);
  const [skillTestTotalMarks, setSkillTestTotalMarks] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!skillTestId) { setIsLoading(false); return; }

    const fetchSubmission = async () => {
      try {
        setIsLoading(true);
        // Fetch both submissions and test details in parallel
        const [submissions, testDetails] = await Promise.allSettled([
          getSkillTestSubmissions(skillTestId),
          fetchSkillTestById(skillTestId),
        ]);

        // Store test-level total_marks as primary fallback
        if (testDetails.status === 'fulfilled' && testDetails.value?.total_marks) {
          setSkillTestTotalMarks(testDetails.value.total_marks);
        }

        if (submissions.status === 'fulfilled' && submissions.value && submissions.value.length > 0) {
          const allSubs = submissions.value;
          // If a specific submissionId is provided (e.g. from Admin view), use it; otherwise use the most recent submission (newest first, so index 0)
          const targetSubmission = submissionId
            ? allSubs.find((s: any) => s.id === submissionId || String(s.id) === String(submissionId)) || allSubs[0]
            : allSubs[0];

          const activities: QuestionActivity[] = targetSubmission.question_activities || [];
          setQuestionActivities(activities);
          setSubmissionMarks(targetSubmission.marks ?? 0);
          setHasSubmission(true);
          // Total marks from question activities if available
          const activityTotal = activities.reduce((s: number, a: QuestionActivity) => s + (a.marks || 0), 0);
          setTotalMarks(activityTotal);
          setCompletedAt(targetSubmission.completed_at || targetSubmission.submitted_at || '');
          // Populate test metadata from submission
          if (targetSubmission.skill_test_title) setSubmissionTestTitle(targetSubmission.skill_test_title);
        }
      } catch (err) {
        console.error('Failed to load submission results:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmission();
  }, [skillTestId]);

  // Computed display values — prefer backend data where available
  const displayTestName = submissionTestTitle || testName;
  const displayDifficulty = submissionDifficulty || difficulty;

  // Derived stats from real question_activities
  const correctAnswers = questionActivities.filter(a => a.is_correct).length;
  const wrongAnswers = questionActivities.filter(a => !a.is_correct && a.answer_data).length;
  const notAttempted = questionActivities.filter(a => !a.answer_data).length;
  // maxScore priority: activity total → skill test level total_marks → 0
  const activityMaxScore = questionActivities.reduce((s, a) => s + (a.marks || 0), 0);
  const maxScore = totalMarks > 0 ? totalMarks : activityMaxScore > 0 ? activityMaxScore : skillTestTotalMarks;
  // Use submission-level marks as score (set by backend), fallback to summing activities
  const totalScore = submissionMarks > 0
    ? submissionMarks
    : questionActivities.reduce((s, a) => s + (a.marks_obtained || 0), 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const actualTotalQuestions = questionActivities.length > 0 ? questionActivities.length : totalQuestions;

  const performanceMetrics = {
    accuracy: actualTotalQuestions > 0 ? Math.round((correctAnswers / actualTotalQuestions) * 100) : 0,
    speed: timeTaken > 0 ? Math.round((actualTotalQuestions / (timeTaken / 60)) * 10) / 10 : 0,
    completionRate: actualTotalQuestions > 0 ? Math.round(((actualTotalQuestions - notAttempted) / actualTotalQuestions) * 100) : 0,
  };

  const getMcqOptions = (activity: QuestionActivity): string[] => {
    if (!activity.mcq_options || activity.mcq_options.length === 0) return [];
    if (typeof activity.mcq_options[0] === 'string') return activity.mcq_options as string[];
    if (typeof activity.mcq_options[0] === 'object' && activity.mcq_options[0].option_text) {
      return activity.mcq_options.map((o: any) => o.option_text);
    }
    return [];
  };

  const normalizeType = (type: string): 'mcq' | 'coding' | 'descriptive' => {
    if (type === 'mcq_single' || type === 'mcq_multiple' || type === 'mcq') return 'mcq';
    if (type === 'coding') return 'coding';
    return 'descriptive';
  };

  const filteredActivities = useMemo(() => {
    let result = questionActivities;
    if (typeFilter !== 'all') {
      result = result.filter(a => normalizeType(a.question_type) === typeFilter);
    }
    if (activeTab === 'incorrect') return result.filter(a => !a.is_correct);
    if (activeTab === 'correct') return result.filter(a => a.is_correct);
    return result;
  }, [questionActivities, activeTab, typeFilter]);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const getTestContext = () => {
    const incorrect = questionActivities.filter(a => !a.is_correct);
    const focus = incorrect[0] || questionActivities[0];
    return [
      `Test: ${testName}`, `Subject: ${subject}`, `Difficulty: ${difficulty}`,
      `Score: ${totalScore}/${maxScore} (${percentage}%)`,
      `Correct: ${correctAnswers}/${actualTotalQuestions}`,
      focus ? `Focus question: ${focus.question_content}` : '',
    ].filter(Boolean).join('\n');
  };

  const getScoreColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const getScoreIcon = (score: number) => score >= 80 ? <TrendingUp className="w-4 h-4 text-green-600" /> : score >= 60 ? <Target className="w-4 h-4 text-yellow-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedOn = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center">
          <div className="flex-1">
            <Button className="inline-flex items-center gap-2 bg-white text-black hover:bg-slate-100" onClick={onBackToTests}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Tests
            </Button>
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-semibold text-foreground">Test Report</h2>
          </div>
          <div className="flex-1" />
        </div>

        <Tabs defaultValue="overall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overall">Performance Analysis</TabsTrigger>
            <TabsTrigger value="questions">Question-wise Analysis</TabsTrigger>
          </TabsList>

          {/* Performance Analysis Tab */}
          <TabsContent value="overall">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Test Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Test Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <div className="font-semibold">{subject}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Test Name:</span>
                      <div className="font-semibold">{displayTestName}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Difficulty:</span>
                      <div className="font-semibold">
                        <Badge variant={displayDifficulty === 'Easy' ? 'secondary' : displayDifficulty === 'Medium' ? 'default' : 'destructive'}>{displayDifficulty || 'N/A'}</Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Taken:</span>
                      <div className="font-semibold">{formatTime(timeTaken)}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed On:</span>
                    <div className="font-semibold">{completedOn}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" />Overall Score</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {!hasSubmission && questionActivities.length === 0 ? (
                    <p className="text-muted-foreground py-4">No submission found for this test.</p>
                  ) : (
                    <>
                      <div className="text-4xl font-bold flex items-center justify-center gap-2 mb-2">
                        <span className={getScoreColor(percentage)}>{percentage}%</span>
                        {getScoreIcon(percentage)}
                      </div>
                      <p className="text-muted-foreground mb-4">
                        {totalScore}/{maxScore > 0 ? maxScore : '-'} Points
                      </p>
                      <div className="text-center">
                        <p className="font-medium text-lg">
                          {percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good Performance!' : percentage > 0 ? 'Needs Improvement' : 'Test Submitted'}
                        </p>
                        <p className="text-muted-foreground">
                          {percentage >= 80 ? 'Outstanding result' : percentage >= 60 ? 'Above average performance' : percentage > 0 ? 'Keep practicing' : 'Score being evaluated'}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Question Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />Question Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-medium">Correct</span></div>
                      <span className="font-bold text-green-600">{correctAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-medium">Wrong</span></div>
                      <span className="font-bold text-red-600">{wrongAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-600" /><span className="text-sm font-medium">Not Attempted</span></div>
                      <span className="font-bold text-orange-600">{notAttempted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Performance Metrics</CardTitle>
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

              {/* Strengths — dynamically computed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-600" />Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  {correctAnswers === 0 && performanceMetrics.completionRate <= 80 ? (
                    <p className="text-sm text-muted-foreground">Complete the test to see your strengths.</p>
                  ) : (
                    <ul className="space-y-3">
                      {correctAnswers > 0 && (
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{correctAnswers} question{correctAnswers > 1 ? 's' : ''} answered correctly</span>
                        </li>
                      )}
                      {questionActivities.some(a => normalizeType(a.question_type) === 'coding' && a.is_correct) && (
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">Good coding implementation skills</span>
                        </li>
                      )}
                      {performanceMetrics.completionRate > 80 && (
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">High completion rate — great time management</span>
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Areas for Improvement — dynamically computed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-orange-600" />Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  {wrongAnswers === 0 && notAttempted === 0 ? (
                    <p className="text-sm text-muted-foreground">No major areas to improve. Keep it up!</p>
                  ) : (
                    <ul className="space-y-3">
                      {wrongAnswers > 0 && (
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">Review {wrongAnswers} incorrect answer{wrongAnswers > 1 ? 's' : ''} and practice similar problems</span>
                        </li>
                      )}
                      {notAttempted > 0 && (
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">Improve time management — {notAttempted} question{notAttempted > 1 ? 's' : ''} not attempted</span>
                        </li>
                      )}
                      {questionActivities.some(a => !a.is_correct && normalizeType(a.question_type) === 'descriptive') && (
                        <li className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">Focus on theoretical explanations and completeness</span>
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Question-wise Analysis */}
          <TabsContent value="questions">
            <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'incorrect', 'correct'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setShowAiChat(false); }}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${
                        activeTab === tab
                          ? tab === 'incorrect' ? 'bg-red-500 text-white' : tab === 'correct' ? 'bg-green-500 text-white' : 'bg-gray-900 text-white'
                          : tab === 'incorrect' ? 'text-black hover:bg-red-50 hover:text-red-600' : tab === 'correct' ? 'text-black hover:bg-green-50 hover:text-green-600' : 'text-black hover:bg-gray-100'
                      }`}
                    >
                      {tab === 'all' ? `All (${questionActivities.length})` : tab === 'incorrect' ? `Incorrect (${questionActivities.length - correctAnswers})` : `Correct (${correctAnswers})`}
                    </button>
                  ))}

                  <div className="h-5 w-px bg-gray-200 mx-1" />

                  {(['all', 'mcq', 'coding', 'descriptive'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all capitalize ${
                        typeFilter === type ? 'bg-white text-black border border-gray-300' : 'text-black hover:text-black hover:bg-white'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { const next = !showAiChat; setShowAiChat(next); setActiveTab(next ? 'ai_buddy' : 'all'); }}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${showAiChat ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-white border border-slate-200'}`}
                >
                  <MessageCircle className="w-4 h-4" /> AI Mentor
                </button>
              </div>

              <div className={`flex ${showAiChat ? 'flex-col lg:flex-row' : 'flex-col'}`}>
                <div className={`${showAiChat ? 'lg:w-[65%] w-full border-r border-gray-100' : 'w-full'} p-5`}>
                  <div className="space-y-4">
                    {filteredActivities.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        {questionActivities.length === 0 ? 'No question data available for this submission yet.' : 'No questions found for this filter.'}
                      </div>
                    )}

                    {filteredActivities.map((activity, idx) => {
                      const listIndex = questionActivities.findIndex(a => a.id === activity.id);
                      const isExpanded = expandedQuestions.has(listIndex);
                      const isCorrect = activity.is_correct;
                      const qTypeNorm = normalizeType(activity.question_type);
                      const qType = qTypeNorm === 'mcq' ? 'MCQ' : qTypeNorm === 'coding' ? 'Coding' : 'Descriptive';
                      const options = getMcqOptions(activity);

                      // Student's answer(s)
                      const studentAnswer = activity.answer_data;
                      const studentAnswerStr = Array.isArray(studentAnswer) ? studentAnswer.join(', ') : (studentAnswer?.toString() || '');

                      return (
                        <div
                          key={activity.id}
                          className={`border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm bg-white ${isCorrect ? 'border-gray-200' : 'border-red-200'}`}
                        >
                          <div
                            className={`p-4 cursor-pointer flex items-start gap-3 hover:bg-white transition-colors ${isExpanded ? 'bg-white' : ''}`}
                            onClick={() => toggleQuestion(listIndex)}
                          >
                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                              {isCorrect ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Q{idx + 1}</span>
                                <Badge className="text-[10px] h-4 px-1.5 bg-white text-slate-600 border-0 hover:bg-slate-100 font-bold uppercase tracking-wider">{qType}</Badge>
                              </div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">{activity.question_content || activity.question_title}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Score</p>
                                <p className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {activity.marks_obtained || 0}/{activity.marks}
                                </p>
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
                              {/* MCQ Options */}
                              {qTypeNorm === 'mcq' && options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {options.map((option, optIndex) => {
                                    const isSelected = Array.isArray(studentAnswer)
                                      ? studentAnswer.includes(option)
                                      : studentAnswer === option;
                                    const isOptionCorrect = isCorrect && isSelected;
                                    const style = isOptionCorrect
                                      ? 'border-green-200 bg-green-50 text-green-800'
                                      : isSelected && !isCorrect
                                      ? 'border-red-200 bg-red-50 text-red-800'
                                      : 'border-gray-200 bg-white text-gray-600';
                                    return (
                                      <div key={optIndex} className={`p-3 rounded-lg border text-sm flex items-center justify-between ${style}`}>
                                        <span>{option}</span>
                                        {isOptionCorrect && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                                        {isSelected && !isOptionCorrect && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Coding answer */}
                              {qTypeNorm === 'coding' && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Code className="h-4 w-4" /> Your Code
                                  </p>
                                  {studentAnswerStr ? (
                                    <pre className="bg-white rounded-lg p-3 border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">{studentAnswerStr}</pre>
                                  ) : (
                                    <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-2 text-sm text-gray-400">
                                      <Eye className="w-4 h-4" /> No code submitted
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Descriptive answer */}
                              {qTypeNorm === 'descriptive' && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700">Your Answer</p>
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <pre className="text-sm whitespace-pre-wrap text-gray-800">{studentAnswerStr || 'No answer provided'}</pre>
                                  </div>
                                </div>
                              )}

                              {/* Marks obtained */}
                              <div className="flex items-center gap-2 text-sm">
                                <Lightbulb className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">Marks Obtained:</span>
                                <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {activity.marks_obtained || 0} / {activity.marks}
                                </span>
                              </div>
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
                          welcomeMessage="Hi! I am your AI Mentor. Ask me anything about your test answers, mistakes, or improvement plan."
                          persistenceKey={`test-results-${subject}-${testName}`}
                          chatTitle={`${testName} - AI Mentor`}
                          contextGetter={getTestContext}
                          onClose={() => { setShowAiChat(false); setActiveTab('all'); }}
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

export default TestResultsScreen;