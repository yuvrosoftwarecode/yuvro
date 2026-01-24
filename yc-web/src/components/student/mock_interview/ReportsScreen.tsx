import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  FileText,
  Calendar,
  Loader2,
  Share2,
  RotateCcw,
  Bot,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { mockInterviewService } from '@/services/mockInterviewService';

interface ReportsScreenProps {
  role: {
    title: string;
    level: string;
  };
  difficulty: string;
  duration: string;
  sessionId?: string | null;
  onTryAgain: () => void;
  onBackToLibrary: () => void;
}

interface ReportData {
  overall_score: number;
  feedback_summary: string;
  performance_metrics: Record<string, number>;
  skill_analysis: Record<string, { score: number; feedback: string }>;
  question_analysis: any[];
  key_takeaways: {
    strengths: string[];
    improvements: string[];
  };
  meta_stats: any;
  interview_session: any;
  created_at: string;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({
  role,
  difficulty,
  duration,
  sessionId,
  onTryAgain,
  onBackToLibrary
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) {
        setError("No session ID provided.");
        setLoading(false);
        return;
      }

      try {
        let attempts = 0;
        const maxAttempts = 10;

        // Poll for report completion
        const poll = async () => {
          try {
            const sessionData = await mockInterviewService.getInterviewSession(sessionId);

            if (sessionData.report) {
              setReport({
                ...sessionData.report,
                interview_session: {
                  ...sessionData,
                  report: undefined // avoid circular ref or duplication
                }
              });
              setLoading(false);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(poll, 2000); // Poll every 2 seconds
            } else {
              setError("Report generation timed out. Please check back later.");
              setLoading(false);
            }
          } catch (err) {
            console.error(err);
            setError("Failed to fetch report data.");
            setLoading(false);
          }
        };

        poll();
      } catch (err) {
        console.error(err);
        setError("Failed to initialize report fetching.");
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Generating Your AI Analysis...</h2>
          <p className="text-slate-500 max-w-sm mx-auto">
            Our AI is analyzing your responses, body language, and technical accuracy.
            This usually takes about 10-20 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
            <p className="text-slate-500">{error || "Report data unavailable"}</p>
            <Button onClick={onBackToLibrary} variant="outline">
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare Radar Data
  const radarData = Object.entries(report.performance_metrics || {}).map(([key, value]) => ({
    subject: key,
    A: value,
    fullMark: 100
  }));

  // Prepare Question Analysis
  const currentQuestion = report.question_analysis?.[selectedQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {role.level}
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-600">
                {duration} mins
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{role.title} Interview Report</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Completed on {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={onTryAgain}>
              <RotateCcw className="w-4 h-4" />
              Retry
            </Button>
            <Button className="gap-2 bg-slate-900 hover:bg-slate-800">
              <Share2 className="w-4 h-4" />
              Share Report
            </Button>
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Overall Score Circle */}
          <Card className="md:col-span-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Target className="w-24 h-24" />
            </div>
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="relative flex items-center justify-center w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-slate-100"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                  />
                  <circle
                    className={`${getScoreColor(report.overall_score)} transition-all duration-1000 ease-out`}
                    strokeWidth="12"
                    strokeDasharray={351.86}
                    strokeDashoffset={351.86 - (351.86 * report.overall_score) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`text-3xl font-bold ${getScoreColor(report.overall_score)}`}>
                    {Math.round(report.overall_score)}%
                  </span>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Score</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Summary */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed">
                {report.feedback_summary || "No summary available."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-1 text-sm">
                    <CheckCircle className="w-4 h-4" /> Top Strength
                  </div>
                  <p className="text-xs text-green-800 font-medium">
                    {report.key_takeaways?.strengths?.[0] || "Analysis pending"}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-700 font-medium mb-1 text-sm">
                    <Target className="w-4 h-4" /> Focus Area
                  </div>
                  <p className="text-xs text-orange-800 font-medium">
                    {report.key_takeaways?.improvements?.[0] || "Analysis pending"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm text-slate-500 font-medium text-center">Skill Balance</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] w-full p-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Skills"
                    dataKey="A"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <TabsTrigger value="questions" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
              Question Analysis
            </TabsTrigger>
            <TabsTrigger value="skills" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
              Skill Breakdown
            </TabsTrigger>
            <TabsTrigger value="transcript" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
              Transcript
            </TabsTrigger>
          </TabsList>

          {/* Question Analysis Tab */}
          <TabsContent value="questions" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Question Navigation */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="shadow-sm border-slate-200 h-[calc(100vh-300px)] flex flex-col">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Questions</CardTitle>
                  </CardHeader>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {report.question_analysis?.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedQuestionIndex(idx)}
                          className={`
                               w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start gap-3
                               border
                               ${selectedQuestionIndex === idx
                              ? 'bg-blue-50 border-blue-200 shadow-sm'
                              : 'bg-white border-transparent hover:bg-slate-50'
                            }
                             `}
                        >
                          <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${selectedQuestionIndex === idx
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedQuestionIndex === idx ? 'text-blue-900' : 'text-slate-700'}`}>
                              {q.question}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getScoreBgColor(q.ai_score)}`}>
                                {q.ai_score}%
                              </span>
                              <span className="text-xs text-slate-400 capitalize">{q.type}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </div>

              {/* Question Details */}
              <div className="lg:col-span-9">
                {currentQuestion ? (
                  <div className="space-y-6">
                    {/* Question Card */}
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">
                          Q{selectedQuestionIndex + 1}: {currentQuestion.question}
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Answer</div>
                            <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-sm leading-relaxed border border-slate-100">
                              {currentQuestion.user_answer || "No answer recorded."}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Strengths */}
                            <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-3">
                                <TrendingUp className="w-4 h-4" /> What Went Well
                              </h4>
                              <ul className="space-y-2">
                                {currentQuestion.what_went_well?.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-green-900/80">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                )) || <li className="text-sm text-slate-400">No data available</li>}
                              </ul>
                            </div>

                            {/* Improvements */}
                            <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100">
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-3">
                                <Target className="w-4 h-4" /> Areas to Improve
                              </h4>
                              <ul className="space-y-2">
                                {currentQuestion.what_could_be_better?.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-orange-900/80">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                )) || <li className="text-sm text-slate-400">No data available</li>}
                              </ul>
                            </div>
                          </div>

                          {/* Ideal Answer */}
                          <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2">
                              <Bot className="w-4 h-4" /> Recommended Answer Structure
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {currentQuestion.recommended_response || "No recommendation available."}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    Select a question to view detailed analysis.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Skill Breakdown */}
          <TabsContent value="skills">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(report.skill_analysis || {}).map(([skill, data]: [string, any], idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-semibold text-slate-700 truncate">{skill}</CardTitle>
                      <Badge className={`${getScoreBgColor(data.score * 10)}`}>{data.score}/10</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 bg-white/50">
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {data.feedback}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Transcript - Placeholder for now as it needs ChatSession mapping which is complex */}
          <TabsContent value="transcript">
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                <p>Full interview transcript is available in the 'Chat' view.</p>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-center pt-8 pb-12">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100" onClick={onBackToLibrary}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>

      </div>
    </div>
  );
};

// Helper components (e.g. RotateCcw) reused from lucide-react import
import { RotateCcw as RotateCcwIcon } from 'lucide-react';

export default ReportsScreen;